const svc = require('./transfer.service');

async function submit(req, res, next) {
  try { res.status(201).json(await svc.submitTransferRequest(req.body, req.user.id)); }
  catch (err) { next(err); }
}

async function queue(req, res, next) {
  try { res.json(await svc.getApprovalQueue()); }
  catch (err) { next(err); }
}

async function approve(req, res, next) {
  try {
    const result = await svc.approveTransfer(req.params.id, req.user.id, req.body.remarks, req.body.overrideReason);
    res.status(result.blocked ? 409 : 200).json(result);
  } catch (err) { next(err); }
}

async function reject(req, res, next) {
  try { res.json(await svc.rejectTransfer(req.params.id, req.user.id, req.body.reason)); }
  catch (err) { next(err); }
}

async function inspection(req, res, next) {
  try { res.status(201).json(await svc.createInspectionRecord(req.params.id, req.body.inspectionType, req.body, req.user.id)); }
  catch (err) { next(err); }
}

async function dispatch(req, res, next) {
  try { res.json(await svc.dispatchTransfer(req.params.id, req.body, req.user.id)); }
  catch (err) { next(err); }
}

async function arrive(req, res, next) {
  try { res.json(await svc.confirmArrival(req.params.id, req.user.id, req.body)); }
  catch (err) { next(err); }
}

async function history(req, res, next) {
  try { res.json(await svc.getTransferHistory(req.params.assetId)); }
  catch (err) { next(err); }
}

async function compliance(req, res, next) {
  try { res.json(await svc.checkComplianceForTransfer(req.params.assetId, req.query.driverId)); }
  catch (err) { next(err); }
}

module.exports = { submit, queue, approve, reject, inspection, dispatch, arrive, history, compliance };
