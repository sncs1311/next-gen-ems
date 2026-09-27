const assetService = require('./asset.service');
const { getScopedProjectIds, getPrimaryProject } = require('../../lib/projectScope');

async function create(req, res, next) {
  try {
    // ADDED — project-scoping: resolve the creating user's primary project
    // (null for global roles) so the new asset lands in the right site
    // automatically. See createAsset()'s scopedProjectId param.
    const primaryProject = await getPrimaryProject(req.user.id, req.user.role);
    const scopedProjectId = primaryProject ? primaryProject.id : null;
    const asset = await assetService.createAsset(req.body, req.user.id, scopedProjectId);
    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    // ADDED — project-scoping: null for global roles (no filter applied),
    // otherwise the array of project ids this user is assigned to.
    const scopedProjectIds = await getScopedProjectIds(req.user.id, req.user.role);
    const result = await assetService.searchAssets(req.query, scopedProjectIds);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const asset = await assetService.getAssetById(req.params.id, req.user.role);
    res.json(asset);
  } catch (err) {
    next(err);
  }
}

// ADDED — lookup by human-readable assetNumber, for the new UUID-free
// asset detail route.
async function getByNumber(req, res, next) {
  try {
    const asset = await assetService.getAssetByNumber(req.params.assetNumber, req.user.role);
    res.json(asset);
  } catch (err) {
    next(err);
  }
}

// ADDED — category cards for the Assets home view.
async function categories(req, res, next) {
  try {
    const { getScopedProjectIds } = require('../../lib/projectScope');
    const scopedProjectIds = await getScopedProjectIds(req.user.id, req.user.role);
    res.json(await assetService.getCategoriesWithCounts(scopedProjectIds));
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const asset = await assetService.updateAssetStatus(req.params.id, req.body.status, req.user.id);
    res.json(asset);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, getByNumber, categories, updateStatus };