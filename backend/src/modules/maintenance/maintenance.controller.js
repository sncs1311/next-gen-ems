const svc = require('./maintenance.service');

async function reportBreakdown(req, res, next) {
  try {
    res.status(201).json(await svc.createBreakdownLog(req.body, req.user.id));
  } catch (err) { next(err); }
}

async function createJobCard(req, res, next) {
  try {
    res.status(201).json(await svc.createJobCard(req.body, req.user.id));
  } catch (err) { next(err); }
}

async function addPart(req, res, next) {
  try {
    res.status(201).json(await svc.addPartToJobCard(req.params.id, req.body));
  } catch (err) { next(err); }
}

async function addLabor(req, res, next) {
  try {
    res.status(201).json(await svc.addLaborToJobCard(req.params.id, req.body));
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    res.json(await svc.updateJobCardStatus(req.params.id, req.body.status, req.body));
  } catch (err) { next(err); }
}

async function close(req, res, next) {
  try {
    res.json(await svc.closeJobCard(req.params.id, req.user.id, req.body.remarks));
  } catch (err) { next(err); }
}

async function history(req, res, next) {
  try {
    res.json(await svc.getAssetMaintenanceHistory(req.params.assetId));
  } catch (err) { next(err); }
}

module.exports = { reportBreakdown, createJobCard, addPart, addLabor, updateStatus, close, history };
