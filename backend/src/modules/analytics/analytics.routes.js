// backend/src/modules/analytics/analytics.routes.js
const express = require('express');
const controller = require('./analytics.controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { ROLES } = require('../../config/roles');

const router = express.Router();
router.use(authenticate);

const DASH_ROLES = [ROLES.EXEC, ROLES.FLEET_MGR, ROLES.SYS_ADMIN, ROLES.FINANCE];

router.get('/fleet-stats',          requireRole(...DASH_ROLES), controller.fleetStats);
router.get('/utilization',          requireRole(...DASH_ROLES), controller.utilizationByProject);
router.get('/mtbf-trend',           requireRole(...DASH_ROLES), controller.mtbfTrend);
router.get('/tco',                  requireRole(...DASH_ROLES), controller.topTCO);
router.get('/fuel-by-project',      requireRole(...DASH_ROLES), controller.fuelByProject);
router.get('/maintenance-trend',    requireRole(...DASH_ROLES), controller.maintenanceCostTrend);
router.get('/expiry-alerts',        requireRole(ROLES.FLEET_MGR, ROLES.SYS_ADMIN), controller.expiryAlerts);
router.get('/assets-due',           requireRole(ROLES.FLEET_MGR, ROLES.MECH_SUP, ROLES.SYS_ADMIN), controller.assetsDueForService);
router.get('/incident-stats',       requireRole(...DASH_ROLES, ROLES.HSE), controller.incidentStats);

module.exports = router;