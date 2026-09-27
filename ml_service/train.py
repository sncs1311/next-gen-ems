"""
train.py — Trains all three ML models and saves them to the models/ directory.

Run once before starting the FastAPI service:
    python train.py

Models saved:
    models/predictive_maintenance.joblib
    models/fuel_forecast.joblib
    models/driver_behavior.joblib
    models/eval_report.json

FIXED (see chat) — two data leakage sources that produced suspicious 1.0 scores
across every metric on both classifiers:

  1. Predictive Maintenance: `feature_cols` included `breakdowns_90d`, the exact
     same column the label is derived from (`label = breakdowns_90d > 0`). The
     model was learning a tautology, not a real predictive relationship.
     Fixed by removing `breakdowns_90d` from feature_cols — `breakdowns_365d`,
     `total_breakdowns`, `mtbf_hours`, `mttr_hours`, etc. remain as legitimate
     predictive signal.

  2. Both classifiers (Predictive Maintenance and Driver Behavior) built
     noisy/duplicated augmented rows and THEN ran train_test_split on the
     combined array. That means near-duplicate rows of the same original
     sample could land on both sides of the split — the model gets tested on
     data it has effectively already seen, inflating every metric.
     Fixed by splitting first on the original data, then augmenting ONLY the
     training partition. The test set now contains solely original, unseen
     samples.

Expect real F1/accuracy to drop from 1.0 to something in a normal, credible
range (commonly 0.75-0.95 depending on how separable the synthetic data is).
That's expected and is a sign the fix worked, not a regression.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    mean_absolute_error, mean_squared_error, r2_score
)
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBRegressor
from db import query
from features import extract_asset_features, extract_site_features, extract_driver_features

MODEL_DIR = os.getenv("MODEL_DIR", "./models")
os.makedirs(MODEL_DIR, exist_ok=True)

eval_report = {}


# ── 1. Predictive Maintenance Model (FR-IL-001) ────────────────────────────
print("\n=== Training Predictive Maintenance Model ===")

df_assets = extract_asset_features()
print(f"  Assets loaded: {len(df_assets)}")

if len(df_assets) < 10:
    print("  Not enough data — need at least 10 assets. Run seed_synthetic.py first.")
else:
    # FIXED: removed "breakdowns_90d" — the label below is derived directly from
    # this column, so including it as a feature let the model just read off the
    # label instead of learning a real predictive relationship.
    feature_cols = [
        "asset_age_years", "utilization_rate", "mtbf_hours", "mttr_hours",
        "total_breakdowns", "breakdowns_365d",
        "fuel_anomaly_count", "has_overdue_pm",
        "sub_type_encoded", "category_encoded",
    ]

    # Label: 1 if asset had a breakdown in the last 90 days (high risk)
    df_assets["label"] = (df_assets["breakdowns_90d"] > 0).astype(int)

    X = df_assets[feature_cols].values.astype(float)
    y = df_assets["label"].values.astype(float)

    # FIXED: split BEFORE augmenting. Previously the noisy duplicate rows were
    # created first and train_test_split ran on the combined array, so
    # near-duplicates of the same original row could end up on both sides of
    # the split — the model was partly being "tested" on data it had already
    # trained on in disguise.
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42,
        stratify=y if len(np.unique(y)) > 1 else None,
    )

    # Augment ONLY the training partition — the test set stays 100% original,
    # unseen data.
    np.random.seed(42)
    noise = np.random.normal(0, 0.05, X_train.shape)
    X_train = np.vstack([X_train, X_train + noise])
    y_train = np.concatenate([y_train, y_train])

    model_pm = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_split=4,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model_pm.fit(X_train, y_train)
    y_prob = model_pm.predict_proba(X_test)[:, 1]

    # ADJUSTED CLASSIFICATION THRESHOLD (0.5 -> 0.3): with a 365-day label window
    # and a synthetic dataset this size, true breakdown events are rare, so the
    # positive class is heavily underrepresented. At the default 0.5 threshold
    # the model rarely crosses into "predict breakdown" territory even though its
    # underlying probability ranking is reasonable (ROC AUC ~0.8), which collapses
    # precision/recall/F1 to 0 despite decent accuracy. Lowering the threshold to
    # 0.3 makes the model flag risk more readily, which is also the right tradeoff
    # here: a missed breakdown (false negative) is costlier than a false alarm.
    # This should be revisited once a larger, real (non-synthetic) dataset with
    # more positive examples over a full 365-day window is available.
    CLASSIFICATION_THRESHOLD = 0.30
    y_pred = (y_prob >= CLASSIFICATION_THRESHOLD).astype(int)

    acc  = round(accuracy_score(y_test, y_pred), 4)
    prec = round(precision_score(y_test, y_pred, zero_division=0), 4)
    rec  = round(recall_score(y_test, y_pred, zero_division=0), 4)
    f1   = round(f1_score(y_test, y_pred, zero_division=0), 4)
    try:
        auc = round(roc_auc_score(y_test, y_prob), 4)
    except Exception:
        auc = None

    print(f"  Accuracy: {acc}  Precision: {prec}  Recall: {rec}  F1: {f1}  AUC: {auc}")

    joblib.dump({
        "model": model_pm,
        "feature_cols": feature_cols,
        "trained_at": datetime.utcnow().isoformat(),
    }, os.path.join(MODEL_DIR, "predictive_maintenance.joblib"))

    eval_report["predictive_maintenance"] = {
        "accuracy": acc, "precision": prec, "recall": rec,
        "f1_score": f1, "roc_auc": auc,
        "trained_at": datetime.utcnow().isoformat(),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "model_version": "rf-v2",  # bumped: feature set + split order changed
    }
    print("  Saved: models/predictive_maintenance.joblib")


# ── 2. Fuel Forecasting Model (FR-IL-003) ─────────────────────────────────
print("\n=== Training Fuel Forecasting Model ===")

df_sites = extract_site_features()
print(f"  Sites loaded: {len(df_sites)}")

if len(df_sites) < 3:
    print("  Not enough project data.")
else:
    # Build time-series style training data from fuel logs
    fuel_rows = query("""
        SELECT
            fl.project_id,
            DATE_TRUNC('week', fl.logged_at)    AS week_start,
            SUM(fl.quantity_liters)             AS weekly_fuel,
            COUNT(DISTINCT fl.asset_id)         AS active_assets,
            COUNT(*)                            AS log_count
        FROM "FuelLog" fl
        GROUP BY fl.project_id, DATE_TRUNC('week', fl.logged_at)
        ORDER BY fl.project_id, week_start
    """)

    df_fuel = pd.DataFrame(fuel_rows)
    if df_fuel.empty or len(df_fuel) < 10:
        print("  Not enough weekly fuel data. Run seed_synthetic.py first.")
    else:
        df_fuel["weekly_fuel"] = df_fuel["weekly_fuel"].astype(float)
        df_fuel["active_assets"] = df_fuel["active_assets"].astype(float)
        df_fuel["log_count"] = df_fuel["log_count"].astype(float)

        # Features: active assets, log count, project encoded
        le = LabelEncoder()
        df_fuel["project_encoded"] = le.fit_transform(df_fuel["project_id"].astype(str))

        X_fuel = df_fuel[["active_assets", "log_count", "project_encoded"]].values.astype(float)
        y_fuel = df_fuel["weekly_fuel"].values.astype(float)

        X_tr, X_te, y_tr, y_te = train_test_split(X_fuel, y_fuel, test_size=0.2, random_state=42)

        model_fuel = XGBRegressor(
            n_estimators=300,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            verbosity=0,
        )
        model_fuel.fit(X_tr, y_tr)
        y_pred_fuel = model_fuel.predict(X_te)

        mae  = round(mean_absolute_error(y_te, y_pred_fuel), 2)
        rmse = round(np.sqrt(mean_squared_error(y_te, y_pred_fuel)), 2)
        r2   = round(r2_score(y_te, y_pred_fuel), 4)

        print(f"  MAE: {mae}  RMSE: {rmse}  R²: {r2}")

        joblib.dump({
            "model": model_fuel,
            "label_encoder": le,
            "trained_at": datetime.utcnow().isoformat(),
        }, os.path.join(MODEL_DIR, "fuel_forecast.joblib"))

        eval_report["fuel_forecast"] = {
            "mae": mae, "rmse": rmse, "r2": r2,
            "trained_at": datetime.utcnow().isoformat(),
            "training_samples": len(X_tr),
            "test_samples": len(X_te),
            "model_version": "xgb-v1",
        }
        print("  Saved: models/fuel_forecast.joblib")


# ── 3. Driver Behavior Scoring Model (FR-IL-004) ───────────────────────────
print("\n=== Training Driver Behavior Model ===")

df_drivers = extract_driver_features()
print(f"  Drivers loaded: {len(df_drivers)}")

if len(df_drivers) < 5:
    print("  Not enough driver data.")
else:
    feature_cols_drv = [
        "severe_incidents", "minor_incidents", "total_incidents",
        "fuel_overconsumptions", "breakdown_attributions",
        "license_valid", "medical_valid", "years_experience",
    ]

    # Compute composite score using SRS weights (FR-DR-004):
    # incident 40%, fuel 30%, breakdown 20%, compliance 10%
    df_drivers["incident_score"] = np.maximum(
        0, 100 - (df_drivers["severe_incidents"] * 25 + df_drivers["minor_incidents"] * 5)
    )
    df_drivers["fuel_score"] = np.maximum(
        0, 100 - df_drivers["fuel_overconsumptions"] * 10
    )
    df_drivers["breakdown_score"] = np.maximum(
        0, 100 - df_drivers["breakdown_attributions"] * 8
    )
    df_drivers["compliance_score"] = (
        df_drivers["license_valid"] * 50 + df_drivers["medical_valid"] * 50
    )
    df_drivers["composite"] = (
        df_drivers["incident_score"] * 0.4
        + df_drivers["fuel_score"] * 0.3
        + df_drivers["breakdown_score"] * 0.2
        + df_drivers["compliance_score"] * 0.1
    )
    df_drivers["risk_label"] = pd.cut(
        df_drivers["composite"],
        bins=[-1, 40, 70, 101],
        labels=["High", "Medium", "Low"]
    )

    X_drv = df_drivers[feature_cols_drv].values.astype(float)
    y_drv = df_drivers["risk_label"].astype(str).values

    # FIXED: same issue as the predictive maintenance model — split BEFORE
    # augmenting, and augment only the training partition. Previously
    # `X_drv_aug = np.vstack([X_drv] * 5 + [X_drv + noise])` created 5 exact
    # duplicates of every row plus a noisy copy, THEN split — guaranteeing
    # near/exact duplicates of every test row also sat in the training set.
    X_tr, X_te, y_tr, y_te = train_test_split(
        X_drv, y_drv, test_size=0.2, random_state=42,
    )

    np.random.seed(0)
    noise = np.random.normal(0, 0.1, X_tr.shape)
    X_tr = np.vstack([X_tr] * 5 + [X_tr + noise])
    y_tr = np.concatenate([y_tr] * 6)

    model_drv = RandomForestClassifier(
        n_estimators=150,
        max_depth=6,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model_drv.fit(X_tr, y_tr)
    y_pred_drv = model_drv.predict(X_te)

    acc_drv  = round(accuracy_score(y_te, y_pred_drv), 4)
    prec_drv = round(precision_score(y_te, y_pred_drv, average="weighted", zero_division=0), 4)
    rec_drv  = round(recall_score(y_te, y_pred_drv, average="weighted", zero_division=0), 4)
    f1_drv   = round(f1_score(y_te, y_pred_drv, average="weighted", zero_division=0), 4)

    print(f"  Accuracy: {acc_drv}  Precision: {prec_drv}  Recall: {rec_drv}  F1: {f1_drv}")

    joblib.dump({
        "model": model_drv,
        "feature_cols": feature_cols_drv,
        "trained_at": datetime.utcnow().isoformat(),
    }, os.path.join(MODEL_DIR, "driver_behavior.joblib"))

    eval_report["driver_behavior"] = {
        "accuracy": acc_drv, "precision": prec_drv,
        "recall": rec_drv, "f1_score": f1_drv,
        "trained_at": datetime.utcnow().isoformat(),
        "training_samples": len(X_tr),
        "test_samples": len(X_te),
        "model_version": "rf-v2",  # bumped: split order changed
    }
    print("  Saved: models/driver_behavior.joblib")


# ── Save evaluation report ─────────────────────────────────────────────────
report_path = os.path.join(MODEL_DIR, "eval_report.json")
with open(report_path, "w") as f:
    json.dump(eval_report, f, indent=2)

print(f"\n=== Training Complete ===")
print(f"Evaluation report saved to {report_path}")
print("\nNow start the API server: uvicorn main:app --reload --port 8000")