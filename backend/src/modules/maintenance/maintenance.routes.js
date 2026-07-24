const express = require('express');
const { body, param } = require('express-validator');
const controller = require('./maintenance.controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ROLES } = require('../../config/roles');

const router = express.Router();
router.use(authenticate);

// FR-MM-010 — Site Engineer and Workshop Mechanic report breakdowns
router.post(
  '/breakdowns',
  requireRole(ROLES.SITE_ENG, ROLES.MECH, ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [
    body('assetId').isUUID(),
    body('driverId').isUUID(),
    body('occurredAt').isISO8601(),
    body('symptomDescription').isString().notEmpty(),
    body('faultCategory').isString().notEmpty(),
  ],
  validate,
  controller.reportBreakdown
);

// FR-MM-003 — Workshop Mechanic and Supervisor create job cards
router.post(
  '/job-cards',
  requireRole(ROLES.MECH, ROLES.MECH_SUP, ROLES.SYS_ADMIN),
  [
    body('assetId').isUUID(),
    body('jobCardType').isIn(['Preventive', 'Corrective']),
    body('workshopType').isIn(['Internal', 'External']),
  ],
  validate,
  controller.createJobCard
);

router.get('/job-cards/asset/:assetId', [param('assetId').isUUID()], validate, controller.history);

router.post(
  '/job-cards/:id/parts',
  requireRole(ROLES.MECH, ROLES.MECH_SUP, ROLES.SYS_ADMIN),
  [param('id').isUUID(), body('sparePartId').isUUID(), body('quantity').isFloat({ gt: 0 }), body('unitCost').isFloat({ gt: 0 })],
  validate,
  controller.addPart
); // FR-MM-004

router.post(
  '/job-cards/:id/labor',
  requireRole(ROLES.MECH, ROLES.MECH_SUP, ROLES.SYS_ADMIN),
  [param('id').isUUID(), body('technicianId').isUUID(), body('workDate').isISO8601(), body('hoursWorked').isFloat({ gt: 0 }), body('laborRatePerHour').isFloat({ gt: 0 })],
  validate,
  controller.addLabor
); // FR-MM-005

router.patch(
  '/job-cards/:id/status',
  requireRole(ROLES.MECH, ROLES.MECH_SUP, ROLES.SYS_ADMIN),
  [param('id').isUUID(), body('status').isString().notEmpty()],
  validate,
  controller.updateStatus
); // FR-MM-006

// FR-MM-006 — only Workshop Supervisor may close a job card
router.post(
  '/job-cards/:id/close',
  requireRole(ROLES.MECH_SUP, ROLES.SYS_ADMIN),
  [param('id').isUUID(), body('remarks').isString().notEmpty()],
  validate,
  controller.close
);

module.exports = router;
