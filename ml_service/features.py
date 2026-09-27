"""
Feature engineering for all three ML models.
Pulls raw data from PostgreSQL and transforms into model-ready vectors.
"""

import pandas as pd
from db import query


# ── Predictive Maintenance Features (FR-IL-001) ────────────────────────────
def extract_asset_features() -> pd.DataFrame:
    rows = query("""
        SELECT
            a.id                                                    AS asset_id,
            a.asset_number,
            EXTRACT(YEAR FROM NOW()) - a.year_of_manufacture        AS asset_age_years,
            COALESCE(snap.utilization_rate_percent, 0)              AS utilization_rate,
            COALESCE(snap.mtbf_hours, 0)                           AS mtbf_hours,
            COALESCE(snap.mttr_hours, 0)                           AS mttr_hours,
            COALESCE(snap.breakdown_count, 0)                       AS total_breakdowns,
            COALESCE(snap.total_fuel_liters, 0)                    AS total_fuel_liters,
            COALESCE(snap.total_maintenance_cost, 0)               AS total_maintenance_cost,
            -- breakdowns in last 90 days
            (SELECT COUNT(*) FROM "BreakdownLog" bl
             WHERE bl.asset_id = a.id
               AND bl.occurred_at >= NOW() - INTERVAL '90 days')   AS breakdowns_90d,
            -- breakdowns in last 365 days
            (SELECT COUNT(*) FROM "BreakdownLog" bl
             WHERE bl.asset_id = a.id
               AND bl.occurred_at >= NOW() - INTERVAL '365 days')  AS breakdowns_365d,
            -- fuel anomaly count
            (SELECT COUNT(*) FROM "FuelAnomaly" fa
             JOIN "FuelLog" fl ON fl.id = fa.fuel_log_id
             WHERE fl.asset_id = a.id)                             AS fuel_anomaly_count,
            -- overdue maintenance flag
            CASE WHEN EXISTS (
                SELECT 1 FROM "PreventiveMaintenanceSchedule" pms
                WHERE pms.asset_id = a.id AND pms.overdue_status != 'OK'
            ) THEN 1 ELSE 0 END                                    AS has_overdue_pm,
            st.sub_type_code,
            c.category_code,
            a.current_status
        FROM "Asset" a
        LEFT JOIN "AssetKPISnapshot" snap ON snap.asset_id = a.id
        LEFT JOIN "AssetSubType" st ON st.id = a.sub_type_id
        LEFT JOIN "AssetCategory" c ON c.id = st.category_id
        WHERE a.is_archived = false
          AND a.current_status NOT IN ('Written Off', 'Decommissioned')
    """)

    df = pd.DataFrame(rows)
    if df.empty:
        return df

    # Encode categoricals
    df["sub_type_encoded"] = pd.Categorical(df["sub_type_code"]).codes
    df["category_encoded"] = pd.Categorical(df["category_code"]).codes

    feature_cols = [
        "asset_age_years", "utilization_rate", "mtbf_hours", "mttr_hours",
        "total_breakdowns", "breakdowns_90d", "breakdowns_365d",
        "fuel_anomaly_count", "has_overdue_pm",
        "sub_type_encoded", "category_encoded",
    ]
    df[feature_cols] = df[feature_cols].fillna(0).astype(float)
    return df


# ── Fuel Forecasting Features (FR-IL-003) ─────────────────────────────────
def extract_site_features() -> pd.DataFrame:
    rows = query("""
        SELECT
            p.id                                                    AS project_id,
            p.project_code,
            -- active asset count by category
            COUNT(DISTINCT a.id)                                    AS asset_count,
            -- average daily fuel consumption last 30 days
            COALESCE(
                SUM(fl.quantity_liters) FILTER (
                    WHERE fl.logged_at >= NOW() - INTERVAL '30 days'
                ) / 30.0, 0
            )                                                       AS avg_daily_fuel_30d,
            -- average daily fuel last 7 days
            COALESCE(
                SUM(fl.quantity_liters) FILTER (
                    WHERE fl.logged_at >= NOW() - INTERVAL '7 days'
                ) / 7.0, 0
            )                                                       AS avg_daily_fuel_7d,
            -- heavy equipment count
            COUNT(DISTINCT a.id) FILTER (
                WHERE c.category_code IN ('HE', 'LH')
            )                                                       AS heavy_asset_count,
            -- incident count last 90 days
            (SELECT COUNT(*) FROM "IncidentReport" ir
             WHERE ir.project_id = p.id
               AND ir.occurred_at >= NOW() - INTERVAL '90 days')   AS incidents_90d
        FROM "Project" p
        LEFT JOIN "AssetSiteAssignment" asa ON asa.project_id = p.id AND asa.assigned_to IS NULL
        LEFT JOIN "Asset" a ON a.id = asa.asset_id AND a.is_archived = false
        LEFT JOIN "FuelLog" fl ON fl.project_id = p.id
        LEFT JOIN "AssetSubType" st ON st.id = a.sub_type_id
        LEFT JOIN "AssetCategory" c ON c.id = st.category_id
        WHERE p.is_archived = false AND p.project_status = 'Active'
        GROUP BY p.id, p.project_code
    """)

    df = pd.DataFrame(rows)
    if df.empty:
        return df

    feature_cols = [
        "asset_count", "avg_daily_fuel_30d", "avg_daily_fuel_7d",
        "heavy_asset_count", "incidents_90d",
    ]
    df[feature_cols] = df[feature_cols].fillna(0).astype(float)
    return df


# ── Driver Behavior Features (FR-IL-004) ──────────────────────────────────
def extract_driver_features() -> pd.DataFrame:
    rows = query("""
        SELECT
            d.id                                                    AS driver_id,
            e.full_name,
            -- incident counts by severity
            COUNT(ir.id) FILTER (
                WHERE ir.incident_type IN ('Major Accident','Personal Injury','Fire','Equipment Tip-Over')
            )                                                       AS severe_incidents,
            COUNT(ir.id) FILTER (
                WHERE ir.incident_type IN ('Minor Accident','Near Miss')
            )                                                       AS minor_incidents,
            COUNT(ir.id)                                            AS total_incidents,
            -- fuel anomaly count (overconsumption)
            (SELECT COUNT(*) FROM "FuelAnomaly" fa
             JOIN "FuelLog" fl ON fl.id = fa.fuel_log_id
             WHERE fl.driver_id = d.id
               AND fa.anomaly_type = 'Overconsumption')            AS fuel_overconsumptions,
            -- breakdown attributions (driver was on duty)
            (SELECT COUNT(*) FROM "BreakdownLog" bl
             WHERE bl.driver_id = d.id)                            AS breakdown_attributions,
            -- license compliance (1 = valid, 0 = expired)
            CASE WHEN dl.expiry_date >= NOW() THEN 1 ELSE 0 END    AS license_valid,
            -- medical compliance
            CASE WHEN d.medical_cert_expiry >= CURRENT_DATE THEN 1 ELSE 0 END AS medical_valid,
            -- years of experience
            COALESCE(d.years_of_experience, 0)                     AS years_experience
        FROM "Driver" d
        JOIN "Employee" e ON e.id = d.employee_id
        LEFT JOIN "IncidentReport" ir ON ir.driver_id = d.id
        LEFT JOIN "DriverLicense" dl ON dl.driver_id = d.id AND dl.is_current = true
        WHERE d.is_active = true
        GROUP BY d.id, e.full_name, dl.expiry_date, d.medical_cert_expiry, d.years_of_experience
    """)

    df = pd.DataFrame(rows)
    if df.empty:
        return df

    feature_cols = [
        "severe_incidents", "minor_incidents", "total_incidents",
        "fuel_overconsumptions", "breakdown_attributions",
        "license_valid", "medical_valid", "years_experience",
    ]
    df[feature_cols] = df[feature_cols].fillna(0).astype(float)
    return df