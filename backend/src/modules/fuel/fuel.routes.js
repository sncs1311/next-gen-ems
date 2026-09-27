const express = require('express');
const { body, param, query } = require('express-validator');
const controller = require('./fuel.controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ROLES } = require('../../config/roles');

const router = express.Router();
router.use(authenticate);

// FR-FM-001 — Site Engineer and Workshop Mechanic create fuel log entries
router.post(
  '/logs',
  requireRole(ROLES.SITE_ENG, ROLES.MECH, ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [
    body('assetId').isUUID(),
    body('driverId').isUUID(),
    body('projectId').isUUID(),
    body('fuelType').isString().notEmpty(),
    body('quantityLiters').isFloat({ gt: 0 }),
    body('fuelSource').isString().notEmpty(),
  ],
  validate,
  controller.createLog
);

router.get('/logs/asset/:assetId', [param('assetId').isUUID()], validate, controller.historyForAsset); // FR-FM-...

// ADDED — FR-FM-007-adjacent: pie-chart / total-spend summary. Project-scoped
// automatically via req.scope (see fuel.controller.js) — no siteId param
// needed, same pattern as GET /assets. Open to any authenticated role whose
// home screen shows fuel numbers (Fleet Manager, Site Engineer for their own
// site, Finance/Exec globally, PM for their project, Sys Admin globally).
router.get(
  '/summary',
  requireRole(ROLES.FLEET_MGR, ROLES.SITE_ENG, ROLES.PM, ROLES.FINANCE, ROLES.EXEC, ROLES.SYS_ADMIN),
  [query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()],
  validate,
  controller.summary
);

// FR-FM-005 — Fleet Manager and Site Engineer record bulk fuel deliveries
router.post(
  '/deliveries',
  requireRole(ROLES.SITE_ENG, ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [
    body('tankId').isUUID(),
    body('vendorId').isUUID(),
    body('deliveryDate').isISO8601(),
    body('quantityLiters').isFloat({ gt: 0 }),
    body('unitPrice').isFloat({ gt: 0 }),
    body('currency').isString().notEmpty(),
  ],
  validate,
  controller.recordDelivery
);

router.get(
  '/tanks/:tankId/reconciliation',
  [param('tankId').isUUID(), query('periodStart').isISO8601(), query('periodEnd').isISO8601()],
  validate,
  controller.reconciliation
); // FR-FM-006

module.exports = router;