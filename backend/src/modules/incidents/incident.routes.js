const express = require('express');
const { body, param } = require('express-validator');
const controller = require('./incident.controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ROLES } = require('../../config/roles');

const router = express.Router();
router.use(authenticate);

// FR-IM-001 — HSE Officer, Site Engineer, Fleet Manager create incident reports
router.post(
  '/',
  requireRole(ROLES.HSE, ROLES.SITE_ENG, ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [
    body('assetId').isUUID(),
    body('driverId').isUUID(),
    body('incidentType').isString().notEmpty(),
    body('occurredAt').isISO8601(),
  ],
  validate,
  controller.create
);

router.get('/', controller.list);
router.get('/analytics', requireRole(ROLES.HSE, ROLES.FLEET_MGR, ROLES.EXEC, ROLES.SYS_ADMIN), controller.analytics); // FR-IM-007
router.get('/:id', [param('id').isUUID()], validate, controller.getById);

router.post(
  '/:id/assign-investigator',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [param('id').isUUID(), body('officerId').isUUID()],
  validate,
  controller.assignOfficer
);

router.post(
  '/:id/root-cause',
  requireRole(ROLES.HSE, ROLES.SYS_ADMIN),
  [param('id').isUUID(), body('rootCauseCategory').isString().notEmpty(), body('correctiveAction').isString().notEmpty()],
  validate,
  controller.rootCause
); // FR-IM-005

router.post(
  '/:id/close',
  requireRole(ROLES.HSE, ROLES.SYS_ADMIN),
  [param('id').isUUID()],
  validate,
  controller.close
); // FR-IM-005/006

module.exports = router;
