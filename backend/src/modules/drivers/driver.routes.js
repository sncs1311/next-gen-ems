const express = require('express');
const { body, param } = require('express-validator');
const controller = require('./driver.controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ROLES } = require('../../config/roles');

const router = express.Router();
router.use(authenticate);

// FR-DR-001 — Fleet Manager and System Admin can register drivers (matches UML actor list)
router.post(
  '/',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [
    body('employeeCode').isString().notEmpty(),
    body('fullName').isString().notEmpty(),
    body('nationality').isString().notEmpty(),
    body('jobTitle').isString().notEmpty(),
    body('email').isEmail(),
    body('medicalCertNumber').isString().notEmpty(),
    body('medicalCertExpiry').isISO8601(),
    body('licenseNumber').isString().notEmpty(),
    body('licenseCategory').isString().notEmpty(),
    body('issuingAuthority').isString().notEmpty(),
    body('issuingCountry').isString().notEmpty(),
    body('issueDate').isISO8601(),
    body('licenseExpiry').isISO8601(),
  ],
  validate,
  controller.register
);

router.get('/', controller.list); // FR-DR-007

router.get('/:id', [param('id').isUUID()], validate, controller.getById);

router.post(
  '/:id/training-records',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN, ROLES.SITE_ENG),
  [param('id').isUUID(), body('trainingType').isString().notEmpty(), body('trainingDate').isISO8601()],
  validate,
  controller.addTraining
); // FR-DR-003

router.post(
  '/:id/license/renew',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [
    param('id').isUUID(),
    body('licenseNumber').isString().notEmpty(),
    body('licenseCategory').isString().notEmpty(),
    body('issuingAuthority').isString().notEmpty(),
    body('issuingCountry').isString().notEmpty(),
    body('issueDate').isISO8601(),
    body('expiryDate').isISO8601(),
  ],
  validate,
  controller.renewLicense
);

module.exports = router;
