const assetService = require('./asset.service');

async function create(req, res, next) {
  try {
    const asset = await assetService.createAsset(req.body, req.user.id);
    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await assetService.searchAssets(req.query);
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

async function updateStatus(req, res, next) {
  try {
    const asset = await assetService.updateAssetStatus(req.params.id, req.body.status, req.user.id);
    res.json(asset);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, updateStatus };
