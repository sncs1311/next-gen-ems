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

module.exports = { createLog, recordDelivery, reconciliation, historyForAsset };
