const express = require('express');
const { body, param } = require('express-validator');
const controller = require('./transfer.controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ROLES } = require('../../config/roles');

const router = express.Router();
router.use(authenticate);

// FR-ET-001 — Site Engineer and Project Manager submit requests
router.post(
  '/',
  requireRole(ROLES.SITE_ENG, ROLES.PM, ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [body('assetId').isUUID(), body('transferReason').isString().notEmpty()],
  validate,
  controller.submit
);

router.get('/queue', requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN), controller.queue); // FR-ET-002

router.get('/compliance/:assetId', [param('assetId').isUUID()], validate, controller.compliance); // FR-ET-003

router.get('/history/:assetId', [param('assetId').isUUID()], validate, controller.history); // FR-ET-008

// FR-ET-002 — Fleet Manager approves/rejects
router.post(
  '/:id/approve',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [param('id').isUUID()],
  validate,
  controller.approve
);
router.post(
  '/:id/reject',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [param('id').isUUID(), body('reason').isString().notEmpty()],
  validate,
  controller.reject
);

// FR-ET-005 — Pre/Post inspections, open to Site Engineer + Fleet Manager
router.post(
  '/:id/inspections',
  requireRole(ROLES.SITE_ENG, ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [param('id').isUUID(), body('inspectionType').isIn(['Pre-Departure', 'Post-Arrival']), body('overallCondition').isIn(['Excellent', 'Good', 'Fair', 'Poor'])],
  validate,
  controller.inspection
);

// FR-ET-004 — Dispatch (Gate Pass Entry)
router.post(
  '/:id/dispatch',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [param('id').isUUID(), body('gatePassNumber').isString().notEmpty()],
  validate,
  controller.dispatch
);

// FR-ET-006 — Arrival confirmation, by the receiving Site Engineer
router.post(
  '/:id/arrive',
  requireRole(ROLES.SITE_ENG, ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [param('id').isUUID(), body('overallCondition').isIn(['Excellent', 'Good', 'Fair', 'Poor'])],
  validate,
  controller.arrive
);

module.exports = router;
