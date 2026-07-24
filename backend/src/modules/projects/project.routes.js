const express = require('express');
const { body, param } = require('express-validator');
const controller = require('./project.controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ROLES } = require('../../config/roles');

const router = express.Router();
router.use(authenticate);

// FR-PS-001 — Fleet Manager and System Admin create projects
router.post(
  '/',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [
    body('projectName').isString().notEmpty(),
    body('clientName').isString().notEmpty(),
    body('sector').isString().notEmpty(),
    body('city').isString().notEmpty(),
    body('country').isString().isLength({ min: 2, max: 10 }),
    body('startDate').isISO8601(),
    body('plannedCompletionDate').isISO8601(),
    body('projectManagerId').isUUID(),
  ],
  validate,
  controller.create
);

router.get('/', controller.list);

router.get('/:id/summary', [param('id').isUUID()], validate, controller.summary); // FR-PS-003

router.post(
  '/:id/site-engineers',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [param('id').isUUID(), body('employeeId').isUUID()],
  validate,
  controller.assignEngineer
); // FR-PS-002

router.delete(
  '/site-engineers/:assignmentId',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [param('assignmentId').isUUID()],
  validate,
  controller.unassignEngineer
);

router.patch(
  '/:id/status',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [param('id').isUUID(), body('status').isString().notEmpty()],
  validate,
  controller.updateStatus
); // FR-PS-004

module.exports = router;
