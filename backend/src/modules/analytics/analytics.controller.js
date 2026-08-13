// backend/src/modules/analytics/analytics.controller.js
const svc = require('./analytics.service');

async function fleetStats(req, res, next) {
  try { res.json(await svc.getFleetStats()); } catch (err) { next(err); }
}
async function utilizationByProject(req, res, next) {
  try { res.json(await svc.getUtilizationByProject()); } catch (err) { next(err); }
}
async function mtbfTrend(req, res, next) {
  try { res.json(await svc.getMTBFTrend()); } catch (err) { next(err); }
}
async function topTCO(req, res, next) {
  try { res.json(await svc.getTopTCOAssets(parseInt(req.query.limit, 10) || 10)); } catch (err) { next(err); }
}
async function fuelByProject(req, res, next) {
  try { res.json(await svc.getFuelByProject()); } catch (err) { next(err); }
}
async function maintenanceCostTrend(req, res, next) {
  try { res.json(await svc.getMaintenanceCostTrend()); } catch (err) { next(err); }
}
async function expiryAlerts(req, res, next) {
  try { res.json(await svc.getExpiryAlerts()); } catch (err) { next(err); }
}
async function assetsDueForService(req, res, next) {
  try { res.json(await svc.getAssetsDueForService()); } catch (err) { next(err); }
}
async function incidentStats(req, res, next) {
  try { res.json(await svc.getIncidentStats()); } catch (err) { next(err); }
}

module.exports = {
  fleetStats, utilizationByProject, mtbfTrend, topTCO,
  fuelByProject, maintenanceCostTrend, expiryAlerts,
  assetsDueForService, incidentStats,
};