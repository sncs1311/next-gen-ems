// backend/src/modules/intelligence/intelligence.service.js
// Calls the Python ML service and writes scores back to the database.
// Called by the nightly batch job (SRS §4.6).

const axios = require('axios');
const prisma = require('../../lib/prisma');

const ML_BASE_URL = process.env.ML_SERVICE_BASE_URL || 'http://localhost:8000';

async function healthCheck() {
  try {
    const res = await axios.get(`${ML_BASE_URL}/health`, { timeout: 5000 });
    return res.data;
  } catch {
    return { status: 'unreachable' };
  }
}

// FR-IL-001/002 — Run predictive maintenance scoring and persist to DB
async function runPredictiveMaintenance() {
  const { data } = await axios.post(`${ML_BASE_URL}/ml/predict-maintenance`, {}, { timeout: 60000 });
  const scores = data.scores || [];

  for (const s of scores) {
    // Use findFirst+update/create — assetId may not be unique in schema
    const existing = await prisma.predictiveMaintenanceScore.findFirst({
      where: { assetId: s.asset_id },
    });
    if (existing) {
      await prisma.predictiveMaintenanceScore.update({
        where: { id: existing.id },
        data: {
          score: s.score,
          riskCategory: s.risk_category,
          computedAt: new Date(s.computed_at),
          modelVersion: 'rf-v1',
        },
      });
    } else {
      await prisma.predictiveMaintenanceScore.create({
        data: {
          assetId: s.asset_id,
          score: s.score,
          riskCategory: s.risk_category,
          computedAt: new Date(s.computed_at),
          modelVersion: 'rf-v1',
          isCurrent: true,
        },
      });
    }

    // Auto-generate alert for High risk assets (FR-IL-002)
    // FIXED: was `prisma.systemAlert.upsert({ where: { entityType_entityId_alertType: ... } })`.
    // Even after `npx prisma generate`, the client kept rejecting that compound key name —
    // rather than keep chasing a client/schema cache mismatch, this now uses the same
    // findFirst + update/create pattern already used above for predictiveMaintenanceScore,
    // which only depends on ordinary field names and can't hit this class of error.
    if (s.risk_category === 'High') {
      const existingAlert = await prisma.systemAlert.findFirst({
        where: { entityType: 'Asset', entityId: s.asset_id, alertType: 'PredictiveMaintenance' },
      });
      if (existingAlert) {
        await prisma.systemAlert.update({
          where: { id: existingAlert.id },
          // FIXED: SystemAlert has no `updatedAt` field in schema.prisma (only
          // `createdAt`) — the previous version tried to set updatedAt here,
          // which Prisma rejected with "Unknown argument `updatedAt`".
          data: { isAcknowledged: false },
        });
      } else {
        await prisma.systemAlert.create({
          data: {
            entityType: 'Asset',
            entityId: s.asset_id,
            alertType: 'PredictiveMaintenance',
            severity: 'High',
            entityDisplayName: s.asset_number,
            routedToRole: 'FLEET_MGR',
            message: `Asset ${s.asset_number} has a HIGH breakdown risk score of ${s.score}/100. Recommend workshop inspection.`,
          },
        });
      }
    }
  }

  return { processed: scores.length };
}

// FR-IL-003 — Run fuel forecasting and persist
// FIXED: FuelForecast.confidenceLower, confidenceUpper, and generatedAt are all
// required (non-nullable, no default) columns in schema.prisma — the previous
// version omitted all three, so every create() call threw "Argument
// `confidenceLower` is missing." and step 3 of the nightly batch failed every run.
//
// Also: the ML service returns both a 7-day and a 30-day forecast per project,
// but FuelForecast only has one predictedVolumeLiters column per row. We now
// store two rows per project (forecastType: 'Weekly' and 'Monthly') so both
// numbers are actually persisted, matching what FR-IL-003 / the eval report
// page describe. getFuelForecasts() below reshapes these back into a single
// {forecast7dLiters, forecast30dLiters} object per project for the frontend.
async function runFuelForecasting() {
  const { data } = await axios.post(`${ML_BASE_URL}/ml/forecast-fuel`, {}, { timeout: 60000 });
  const forecasts = data.forecasts || [];

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 86400000);
  const in30d = new Date(now.getTime() + 30 * 86400000);

  for (const f of forecasts) {
    // Confidence interval placeholders (±10%) until the model exposes real
    // prediction intervals — flag to mentors if exact-CI is required by SRS.
    await prisma.fuelForecast.create({
      data: {
        projectId: f.project_id,
        forecastType: 'Weekly',
        forecastPeriodStart: now,
        forecastPeriodEnd: in7d,
        predictedVolumeLiters: f.forecast_7d_liters,
        confidenceLower: Math.round(f.forecast_7d_liters * 0.9 * 100) / 100,
        confidenceUpper: Math.round(f.forecast_7d_liters * 1.1 * 100) / 100,
        modelVersion: 'xgb-v1',
        generatedAt: now,
      },
    });

    await prisma.fuelForecast.create({
      data: {
        projectId: f.project_id,
        forecastType: 'Monthly',
        forecastPeriodStart: now,
        forecastPeriodEnd: in30d,
        predictedVolumeLiters: f.forecast_30d_liters,
        confidenceLower: Math.round(f.forecast_30d_liters * 0.9 * 100) / 100,
        confidenceUpper: Math.round(f.forecast_30d_liters * 1.1 * 100) / 100,
        modelVersion: 'xgb-v1',
        generatedAt: now,
      },
    });
  }

  return { processed: forecasts.length };
}

// FR-IL-004 — Run driver behavior scoring and persist
async function runDriverBehaviorScoring() {
  const { data } = await axios.post(`${ML_BASE_URL}/ml/score-drivers`, {}, { timeout: 60000 });
  const scores = data.scores || [];

  for (const s of scores) {
    await prisma.driverBehaviorScore.upsert({
      where: { driverId: s.driver_id },
      update: {
        compositeScore: s.composite_score,
        riskCategory: s.risk_category,
        incidentScore: s.incident_score,
        fuelScore: s.fuel_score,
        breakdownAttributionScore: s.breakdown_score,
        complianceScore: s.compliance_score,
        lastComputedAt: new Date(s.computed_at),
        modelVersion: 'rf-v1',
      },
      create: {
        driverId: s.driver_id,
        compositeScore: s.composite_score,
        riskCategory: s.risk_category,
        incidentScore: s.incident_score,
        fuelScore: s.fuel_score,
        breakdownAttributionScore: s.breakdown_score,
        complianceScore: s.compliance_score,
        incidentsLast90Days: 0,
        lastComputedAt: new Date(s.computed_at),
        modelVersion: 'rf-v1',
      },
    });
  }

  return { processed: scores.length };
}

// FR-IL-005 — Replacement alert engine
async function runReplacementAlertEngine() {
  const assets = await prisma.asset.findMany({
    where: { isArchived: false, currentStatus: { not: 'Written Off' } },
    include: {
      assetKPISnapshotAssetIdList: { take: 1, orderBy: { snapshotDate: 'desc' } },
      purchaseRecordAssetId: true,
    },
  });

  let alertsGenerated = 0;
  const THRESHOLD_1 = parseFloat(process.env.REPLACEMENT_ALERT_THRESHOLD_1 || '0.60');
  const THRESHOLD_2 = parseFloat(process.env.REPLACEMENT_ALERT_THRESHOLD_2 || '0.80');

  for (const asset of assets) {
    const snap = asset.assetKPISnapshotAssetIdList[0];
    const purchase = asset.purchaseRecordAssetId;
    if (!snap || !purchase?.currentBookValue) continue;

    const bookValue = Number(purchase.currentBookValue);
    const maintCost = Number(snap.totalMaintenanceCost ?? 0);
    if (bookValue <= 0) continue;

    const ratio = maintCost / bookValue;

    // FIXED: same compound-key upsert issue as runPredictiveMaintenance() above —
    // replaced with findFirst + update/create for both alert levels. Also:
    // SystemAlert has no `updatedAt` field in schema.prisma, so update() calls
    // only set isAcknowledged/message, never updatedAt.
    if (ratio >= THRESHOLD_2) {
      const existing = await prisma.systemAlert.findFirst({
        where: { entityType: 'Asset', entityId: asset.id, alertType: 'ReplacementAlert2' },
      });
      const msg = `Asset ${asset.assetNumber}: cumulative repair cost is ${Math.round(ratio * 100)}% of book value (QAR ${maintCost.toLocaleString()}). Replacement strongly recommended.`;
      if (existing) {
        await prisma.systemAlert.update({
          where: { id: existing.id },
          data: { isAcknowledged: false, message: msg },
        });
      } else {
        await prisma.systemAlert.create({
          data: {
            entityType: 'Asset', entityId: asset.id, alertType: 'ReplacementAlert2', severity: 'Critical',
            entityDisplayName: asset.assetNumber, routedToRole: 'FLEET_MGR', message: msg,
          },
        });
      }
      alertsGenerated++;
    } else if (ratio >= THRESHOLD_1) {
      const existing = await prisma.systemAlert.findFirst({
        where: { entityType: 'Asset', entityId: asset.id, alertType: 'ReplacementAlert1' },
      });
      const msg = `Asset ${asset.assetNumber}: cumulative repair cost has reached ${Math.round(ratio * 100)}% of book value. Consider replacement.`;
      if (existing) {
        await prisma.systemAlert.update({
          where: { id: existing.id },
          data: { isAcknowledged: false, message: msg },
        });
      } else {
        await prisma.systemAlert.create({
          data: {
            entityType: 'Asset', entityId: asset.id, alertType: 'ReplacementAlert1', severity: 'High',
            entityDisplayName: asset.assetNumber, routedToRole: 'FLEET_MGR', message: msg,
          },
        });
      }
      alertsGenerated++;
    }
  }

  return { processed: assets.length, alertsGenerated };
}

// Get all ML scores for the intelligence dashboard
async function getPredictiveScores() {
  return prisma.predictiveMaintenanceScore.findMany({
    include: { asset: { include: { subType: { include: { category: true } } } } },
    orderBy: { score: 'desc' },
  });
}

// FIXED: reshapes the two per-project rows (Weekly + Monthly) written by
// runFuelForecasting() back into the single {forecast7dLiters, forecast30dLiters}
// shape the frontend (fuel-forecast/page.jsx) reads. Previously the frontend read
// fields that were never written under any name — this was the root display bug.
async function getFuelForecasts() {
  const rows = await prisma.fuelForecast.findMany({
    include: { project: true },
    orderBy: { generatedAt: 'desc' },
    take: 200, // enough rows to cover Weekly+Monthly for all active projects' latest run
  });

  const byProject = new Map();
  for (const r of rows) {
    if (!byProject.has(r.projectId)) {
      byProject.set(r.projectId, {
        id: r.projectId,
        project: r.project,
        forecast7dLiters: null,
        forecast30dLiters: null,
        // FIXED: frontend (intelligence/page.jsx) reads `f.computedAt` for the
        // "Computed" column, but this object previously only set
        // `forecastPeriodEnd` — the field the page actually reads was never set,
        // so the column always rendered "—". Using generatedAt (when the batch
        // job actually ran) here, which is what "Computed" means anyway.
        computedAt: r.generatedAt,
      });
    }
    const entry = byProject.get(r.projectId);
    if (r.forecastType === 'Weekly' && entry.forecast7dLiters === null) {
      entry.forecast7dLiters = Number(r.predictedVolumeLiters);
    }
    if (r.forecastType === 'Monthly' && entry.forecast30dLiters === null) {
      entry.forecast30dLiters = Number(r.predictedVolumeLiters);
      entry.computedAt = r.generatedAt;
    }
  }

  return Array.from(byProject.values())
    .filter((f) => f.forecast7dLiters !== null || f.forecast30dLiters !== null)
    .sort((a, b) => (b.forecast30dLiters ?? 0) - (a.forecast30dLiters ?? 0))
    .slice(0, 20);
}

async function getDriverRankings() {
  return prisma.driverBehaviorScore.findMany({
    include: { driver: { include: { employee: true } } },
    orderBy: { compositeScore: 'asc' },
  });
}

async function getReplacementAlerts() {
  const alerts = await prisma.systemAlert.findMany({
    where: {
      entityType: 'Asset',
      alertType: { in: ['ReplacementAlert1', 'ReplacementAlert2'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  const assetIds = [...new Set(alerts.map((a) => a.entityId))];
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, assetNumber: true, make: true, model: true },
  });
  const assetById = new Map(assets.map((a) => [a.id, a]));

  return alerts.map((a) => ({
    id: a.id,
    entityId: a.entityId,
    entity: assetById.get(a.entityId) || null,
    severity: a.alertType === 'ReplacementAlert2' ? 'Critical' : 'High',
    message: a.message,
    isAcknowledged: a.isAcknowledged,
    createdAt: a.createdAt,
  }));
}

async function acknowledgeAlert(id, acknowledgedBy) {
  return prisma.systemAlert.update({
    where: { id },
    data: { isAcknowledged: true, acknowledgedBy, acknowledgedAt: new Date() },
  });
}

async function getEvalReport() {
  try {
    const { data } = await axios.get(`${ML_BASE_URL}/ml/eval-report`, { timeout: 5000 });
    return data;
  } catch {
    return { error: 'ML service unreachable or models not trained yet. Run train.py first.' };
  }
}

module.exports = {
  healthCheck,
  runPredictiveMaintenance,
  runFuelForecasting,
  runDriverBehaviorScoring,
  runReplacementAlertEngine,
  getPredictiveScores,
  getFuelForecasts,
  getDriverRankings,
  getReplacementAlerts,
  acknowledgeAlert,
  getEvalReport,
};