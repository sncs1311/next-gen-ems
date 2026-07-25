const svc = require('./admin.service');

async function getUsers(req, res, next) {
  try { res.json(await svc.listUsers()); } catch (err) { next(err); }
}

async function createUser(req, res, next) {
  try { res.status(201).json(await svc.createUser(req.body)); } catch (err) { next(err); }
}

async function toggleActive(req, res, next) {
  try { res.json(await svc.toggleUserActive(req.params.id, req.body.isActive)); } catch (err) { next(err); }
}

async function getRoles(req, res, next) {
  try { res.json(await svc.listRoles()); } catch (err) { next(err); }
}

module.exports = { getUsers, createUser, toggleActive, getRoles };
