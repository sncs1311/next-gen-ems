const express = require('express');
const { body, param, query } = require('express-validator');
const controller = require('./asset.controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ROLES } = require('../../config/roles');

const router = express.Router();
router.use(authenticate);

router.post(
  '/',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
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
  [query('page').optional().isInt({ min: 1 }), query('pageSize').optional().isInt({ min: 1, max: 200 })],
  validate,
  controller.list
);

// /subtypes MUST come before /:id — otherwise Express matches "subtypes" as an ID param
router.get('/subtypes', async (req, res, next) => {
  try {
    const prisma = require('../../lib/prisma');
    const data = await prisma.assetSubType.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: [{ category: { categoryName: 'asc' } }, { subTypeName: 'asc' }],
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/:id', [param('id').isUUID()], validate, controller.getById);

router.patch(
  '/:id/status',
  requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN),
  [param('id').isUUID(), body('status').isString().notEmpty()],
  validate,
  controller.updateStatus
);

module.exports = router;
