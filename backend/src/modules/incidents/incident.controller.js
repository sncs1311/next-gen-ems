const svc = require('./incident.service');

async function create(req, res, next) {
  try { res.status(201).json(await svc.createIncidentReport(req.body, req.user.id)); }
  catch (err) { next(err); }
}

async function list(req, res, next) {
  try { res.json(await svc.listIncidents(req.query)); }
  catch (err) { next(err); }
}

async function getById(req, res, next) {
  try { res.json(await svc.getIncidentById(req.params.id)); }
  catch (err) { next(err); }
}

async function assignOfficer(req, res, next) {
  try { res.json(await svc.assignHSEOfficer(req.params.id, req.body.officerId)); }
  catch (err) { next(err); }
}

async function rootCause(req, res, next) {
  try { res.json(await svc.recordRootCause(req.params.id, req.body)); }
  catch (err) { next(err); }
}

async function close(req, res, next) {
  try { res.json(await svc.closeIncidentReport(req.params.id, req.user.id)); }
  catch (err) { next(err); }
}

async function analytics(req, res, next) {
  try { res.json(await svc.getIncidentAnalytics(req.query)); }
  catch (err) { next(err); }
}

module.exports = { create, list, getById, assignOfficer, rootCause, close, analytics };
