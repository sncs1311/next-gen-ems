const driverService = require('./driver.service');
const { getScopedProjectIds } = require('../../lib/projectScope');

async function register(req, res, next) {
  try {
    const driver = await driverService.registerDriver(req.body, req.user.id);
    res.status(201).json(driver);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const scopedProjectIds = await getScopedProjectIds(req.user.id, req.user.role);
    res.json(await driverService.searchDrivers(req.query, scopedProjectIds));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    res.json(await driverService.getDriverById(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function addTraining(req, res, next) {
  try {
    res.status(201).json(await driverService.addTrainingRecord(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function renewLicense(req, res, next) {
  try {
    res.status(201).json(await driverService.renewLicense(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

module.exports = { register, list, getById, addTraining, renewLicense };