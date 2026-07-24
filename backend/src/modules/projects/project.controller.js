const projectService = require('./project.service');

async function create(req, res, next) {
  try {
    res.status(201).json(await projectService.createProject(req.body));
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    res.json(await projectService.searchProjects(req.query));
  } catch (err) {
    next(err);
  }
}

async function summary(req, res, next) {
  try {
    res.json(await projectService.getProjectEquipmentSummary(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function assignEngineer(req, res, next) {
  try {
    res.status(201).json(await projectService.assignSiteEngineer(req.params.id, req.body.employeeId));
  } catch (err) {
    next(err);
  }
}

async function unassignEngineer(req, res, next) {
  try {
    res.json(await projectService.unassignSiteEngineer(req.params.assignmentId));
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const result = await projectService.updateProjectStatus(
      req.params.id,
      req.body.status,
      !!req.body.confirmed
    );
    res.status(result.blocked ? 409 : 200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, summary, assignEngineer, unassignEngineer, updateStatus };
