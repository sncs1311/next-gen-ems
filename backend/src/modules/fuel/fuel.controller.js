const fuelService = require('./fuel.service');

async function createLog(req, res, next) {
  try {
    const result = await fuelService.createFuelLog(req.body, req.user.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function recordDelivery(req, res, next) {
  try {
    res.status(201).json(await fuelService.recordTankDelivery(req.body, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function reconciliation(req, res, next) {
  try {
    const { tankId } = req.params;
    const { periodStart, periodEnd } = req.query;
    res.json(await fuelService.getFuelReconciliation(tankId, new Date(periodStart), new Date(periodEnd)));
  } catch (err) {
    next(err);
  }
}

async function historyForAsset(req, res, next) {
  try {
    res.json(await fuelService.getFuelHistoryForAsset(req.params.assetId, req.query));
  } catch (err) {
    next(err);
  }
}

// Pie-chart summary, project-scoped.
// CHANGED: uses req.scope (set once per request by middleware/projectScope.js,
// mounted in app.js after authenticate) instead of a separate
// getScopedProjectIds() lookup — that was a second, independent scope
// resolution living in lib/projectScope.js. Keeping one scope resolver avoids
// the two drifting apart, and skips a redundant DB round trip per request.
// req.scope.isGlobal ? null (no filter) : req.scope.projectIds (array) —
// matches exactly what fuelService.getFuelSummary already expects.
async function summary(req, res, next) {
  try {
    const scopedProjectIds = req.scope?.isGlobal ? null : (req.scope?.projectIds ?? []);
    const { startDate, endDate } = req.query;
    res.json(await fuelService.getFuelSummary(scopedProjectIds, { startDate, endDate }));
  } catch (err) {
    next(err);
  }
}

module.exports = { createLog, recordDelivery, reconciliation, historyForAsset, summary };