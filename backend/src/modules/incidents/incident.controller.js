const svc = require('./incident.service');
const { getScopedProjectIds } = require('../../lib/projectScope');

async function create(req, res, next) {
  try { res.status(201).json(await svc.createIncidentReport(req.body, req.user.id)); }
  catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const scopedProjectIds = await getScopedProjectIds(req.user.id, req.user.role);
    res.json(await svc.listIncidents(req.query, scopedProjectIds));
  } catch (err) { next(err); }
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
  try {
    const scopedProjectIds = await getScopedProjectIds(req.user.id, req.user.role);
    res.json(await svc.getIncidentAnalytics(req.query, scopedProjectIds));
  } catch (err) { next(err); }
}

// ADDED — media upload: accepts multipart/form-data with up to 10 files
// (images + PDFs/docs), each max 10 MB, stored locally and linked to the
// incident via IncidentMedia rows.
async function uploadMedia(req, res, next) {
  try {
    if (!req.files?.length) {
      return res.status(422).json({ error: 'No files received' });
    }
    const results = await svc.attachMediaFiles(req.params.id, req.files, req.user.id);
    res.status(201).json(results);
  } catch (err) { next(err); }
}

// ADDED — delete a single media attachment by its IncidentMedia id.
async function deleteMedia(req, res, next) {
  try {
    await svc.deleteMediaFile(req.params.mediaId, req.user.id);
    res.json({ deleted: true });
  } catch (err) { next(err); }
}

module.exports = { create, list, getById, assignOfficer, rootCause, close, analytics, uploadMedia, deleteMedia };