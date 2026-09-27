// backend/src/modules/intelligence/intelligence.controller.js
const svc = require('./intelligence.service');

async function health(req, res, next) {
  try { res.json(await svc.healthCheck()); } catch (err) { next(err); }
}
async function predictiveScores(req, res, next) {
  try { res.json(await svc.getPredictiveScores()); } catch (err) { next(err); }
}
async function fuelForecasts(req, res, next) {
  try { res.json(await svc.getFuelForecasts()); } catch (err) { next(err); }
}
async function driverRankings(req, res, next) {
  try { res.json(await svc.getDriverRankings()); } catch (err) { next(err); }
}
async function evalReport(req, res, next) {
  try { res.json(await svc.getEvalReport()); } catch (err) { next(err); }
}

// ADDED — needed by frontend/src/app/intelligence/replacement-alerts/page.jsx
// which calls GET /intelligence/replacement-alerts and
// PATCH /intelligence/replacement-alerts/:id/acknowledge. Neither existed
// on the backend before this page was added.
async function replacementAlerts(req, res, next) {
  try { res.json(await svc.getReplacementAlerts()); } catch (err) { next(err); }
}
async function acknowledgeReplacementAlert(req, res, next) {
  try {
    res.json(await svc.acknowledgeAlert(req.params.id, req.user?.id));
  } catch (err) { next(err); }
}

// Manual trigger endpoints — for testing without waiting for the nightly batch
async function triggerMaintenance(req, res, next) {
  try { res.json(await svc.runPredictiveMaintenance()); } catch (err) { next(err); }
}
async function triggerFuel(req, res, next) {
  try { res.json(await svc.runFuelForecasting()); } catch (err) { next(err); }
}
async function triggerDrivers(req, res, next) {
  try { res.json(await svc.runDriverBehaviorScoring()); } catch (err) { next(err); }
}
async function triggerReplacement(req, res, next) {
  try { res.json(await svc.runReplacementAlertEngine()); } catch (err) { next(err); }
}

module.exports = {
  health, predictiveScores, fuelForecasts, driverRankings, evalReport,
  replacementAlerts, acknowledgeReplacementAlert,
  triggerMaintenance, triggerFuel, triggerDrivers, triggerReplacement,
};