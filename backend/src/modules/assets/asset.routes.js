const express = require('express');
const { body, param, query } = require('express-validator');
const controller = require('./asset.controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ROLES } = require('../../config/roles');

const router = express.Router();

router.use(authenticate); // FR-SA-002 — every endpoint requires a valid JWT

router.post(
  '/',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN), // FR-AR-001
  [
    body('subTypeId').isUUID(),
    body('make').isString().notEmpty(),
    body('model').isString().notEmpty(),
    body('yearOfManufacture').isInt({ min: 1980, max: new Date().getFullYear() + 1 }),
    body('ownershipType').isString().notEmpty(),
  ],
  validate,
  controller.create
);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 200 }),
  ],
  validate,
  controller.list
); // FR-AR-007 — all authenticated roles may search/filter

router.get('/:id', [param('id').isUUID()], validate, controller.getById); // FR-AR-008

router.patch(
  '/:id/status',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN), // FR-AR-006
  [param('id').isUUID(), body('status').isString().notEmpty()],
  validate,
  controller.updateStatus
);

module.exports = router;
