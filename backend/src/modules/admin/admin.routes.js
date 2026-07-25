const express = require('express');
const { body, param } = require('express-validator');
const controller = require('./admin.controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ROLES } = require('../../config/roles');

const router = express.Router();
router.use(authenticate);
router.use(requireRole(ROLES.SYS_ADMIN)); // all admin endpoints — SYS_ADMIN only

router.get('/users', controller.getUsers);
router.get('/roles', controller.getRoles);

router.post(
  '/users',
  [
    body('employeeCode').isString().notEmpty(),
    body('fullName').isString().notEmpty(),
    body('email').isEmail(),
    body('roleCode').isString().notEmpty(),
    body('jobTitle').isString().notEmpty(),
    body('nationality').isString().notEmpty(),
    body('password').isString().isLength({ min: 8 }),
  ],
  validate,
  controller.createUser
);

router.patch(
  '/users/:id/active',
  [param('id').isUUID(), body('isActive').isBoolean()],
  validate,
  controller.toggleActive
);

module.exports = router;
