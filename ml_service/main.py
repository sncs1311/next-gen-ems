"""
main.py — FastAPI ML Service (SRS §4.5)
Exposes three internal endpoints called by the Node.js nightly batch job.
Not publicly accessible — only the backend API calls these.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from dotenv import load_dotenv
from features import extract_asset_features, extract_site_features, extract_driver_features
from db import query

load_dotenv()

MODEL_DIR = os.getenv("MODEL_DIR", "./models")

app = FastAPI(title="FleetCore ML Service", version="1.0.0")

# ── Load models at startup ──────────────────────────────────────────────────
models = {}

def load_model(name: str):
    path = os.path.join(MODEL_DIR, f"{name}.joblib")
    if os.path.exists(path):
        models[name] = joblib.load(path)
        print(f"  Loaded: {name}")
    else:
        print(f"  WARNING: {name}.joblib not found — run train.py first")

@app.on_event("startup")
def startup():
    print("Loading ML models...")
    load_model("predictive_maintenance")
    load_model("fuel_forecast")
    load_model("driver_behavior")
    print("ML Service ready.")


# ── Health check ────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "models_loaded": list(models.keys()),
        "timestamp": datetime.utcnow().isoformat(),
    }


# ── Predictive Maintenance (FR-IL-001/002) ──────────────────────────────────
@app.post("/ml/predict-maintenance")
def predict_maintenance():
    """
    Scores all active assets with a breakdown probability (0-100).
    Risk bands: Low (0-39), Medium (40-69), High (70-100).
    """
    if "predictive_maintenance" not in models:
        raise HTTPException(503, "Predictive maintenance model not loaded. Run train.py first.")

    bundle = models["predictive_maintenance"]
    model  = bundle["model"]
    feature_cols = bundle["feature_cols"]

    df = extract_asset_features()
    if df.empty:
        return {"scores": [], "count": 0}

    X = df[feature_cols].fillna(0).values
    probs = model.predict_proba(X)[:, 1]  # probability of breakdown
    scores = (probs * 100).round(1)

    results = []
    for i, row in df.iterrows():
        score = float(scores[i - df.index[0]])
        risk = "High" if score >= 70 else ("Medium" if score >= 40 else "Low")
        results.append({
            "asset_id": row["asset_id"],
            "asset_number": row["asset_number"],
            "score": score,
            "risk_category": risk,
            "computed_at": datetime.utcnow().isoformat(),
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"scores": results, "count": len(results)}


# ── Fuel Forecasting (FR-IL-003) ────────────────────────────────────────────
@app.post("/ml/forecast-fuel")
def forecast_fuel():
    """
    Forecasts weekly fuel volume per active project.
    """
    if "fuel_forecast" not in models:
        raise HTTPException(503, "Fuel forecast model not loaded. Run train.py first.")

    bundle = models["fuel_forecast"]
    model  = bundle["model"]
    le     = bundle["label_encoder"]

    df = extract_site_features()
    if df.empty:
        return {"forecasts": [], "count": 0}

    results = []
    for _, row in df.iterrows():
        try:
            proj_encoded = le.transform([str(row["project_id"])])[0]
        except ValueError:
            proj_encoded = 0

        X = np.array([[
            row["asset_count"],
            row["avg_daily_fuel_30d"] * 7,  # convert daily to weekly
            proj_encoded,
        ]])
        forecast_7d  = float(model.predict(X)[0])
        forecast_30d = forecast_7d * 4.3  # weekly → monthly estimate

        results.append({
            "project_id": str(row["project_id"]),
            "project_code": row["project_code"],
            "forecast_7d_liters": round(max(forecast_7d, 0), 1),
            "forecast_30d_liters": round(max(forecast_30d, 0), 1),
            "computed_at": datetime.utcnow().isoformat(),
        })

    return {"forecasts": results, "count": len(results)}


# ── Driver Behavior Scoring (FR-IL-004) ─────────────────────────────────────
@app.post("/ml/score-drivers")
def score_drivers():
    """
    Assigns Low / Medium / High risk category to each active driver.
    """
    if "driver_behavior" not in models:
        raise HTTPException(503, "Driver behavior model not loaded. Run train.py first.")

    bundle = models["driver_behavior"]
    model  = bundle["model"]
    feature_cols = bundle["feature_cols"]

    df = extract_driver_features()
    if df.empty:
        return {"scores": [], "count": 0}

    X = df[feature_cols].fillna(0).values
    risk_labels = model.predict(X)

    # Compute composite score for display
    df["incident_score"]    = np.maximum(0, 100 - (df["severe_incidents"] * 25 + df["minor_incidents"] * 5))
    df["fuel_score"]        = np.maximum(0, 100 - df["fuel_overconsumptions"] * 10)
    df["breakdown_score"]   = np.maximum(0, 100 - df["breakdown_attributions"] * 8)
    df["compliance_score"]  = df["license_valid"] * 50 + df["medical_valid"] * 50
    df["composite"]         = (
        df["incident_score"] * 0.4 + df["fuel_score"] * 0.3
        + df["breakdown_score"] * 0.2 + df["compliance_score"] * 0.1
    )

    results = []
    for i, (_, row) in enumerate(df.iterrows()):
        results.append({
            "driver_id": str(row["driver_id"]),
            "full_name": row["full_name"],
            "risk_category": str(risk_labels[i]),
            "composite_score": round(float(row["composite"]), 1),
            "incident_score": round(float(row["incident_score"]), 1),
            "fuel_score": round(float(row["fuel_score"]), 1),
            "breakdown_score": round(float(row["breakdown_score"]), 1),
            "compliance_score": round(float(row["compliance_score"]), 1),
            "computed_at": datetime.utcnow().isoformat(),
        })

    results.sort(key=lambda x: x["composite_score"])
    return {"scores": results, "count": len(results)}


# ── Model Evaluation Report (FR-IL-006) ─────────────────────────────────────
@app.get("/ml/eval-report")
def eval_report():
    report_path = os.path.join(MODEL_DIR, "eval_report.json")
    if not os.path.exists(report_path):
        raise HTTPException(404, "Evaluation report not found. Run train.py first.")
    with open(report_path) as f:
        return json.load(f)