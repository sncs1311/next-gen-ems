// backend/src/modules/intelligence/intelligence.routes.js
const express = require('express');
const controller = require('./intelligence.controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { ROLES } = require('../../config/roles');

const router = express.Router();
router.use(authenticate);

const DASH_ROLES = [ROLES.FLEET_MGR, ROLES.EXEC, ROLES.SYS_ADMIN];

// Read endpoints — FR-IL-002, FR-IL-003, FR-IL-004, FR-IL-005, FR-IL-006
router.get('/health',               controller.health);
router.get('/predictive-scores',    requireRole(...DASH_ROLES), controller.predictiveScores);
router.get('/fuel-forecasts',       requireRole(...DASH_ROLES, ROLES.SITE_ENG, ROLES.PM), controller.fuelForecasts);
router.get('/driver-rankings',      requireRole(...DASH_ROLES, ROLES.HSE), controller.driverRankings);
router.get('/eval-report',          requireRole(...DASH_ROLES), controller.evalReport);

// ADDED — FR-IL-005 replacement alerts, needed by
// frontend/src/app/intelligence/replacement-alerts/page.jsx
router.get('/replacement-alerts',              requireRole(...DASH_ROLES), controller.replacementAlerts);
router.patch('/replacement-alerts/:id/acknowledge', requireRole(...DASH_ROLES), controller.acknowledgeReplacementAlert);

// Manual trigger endpoints — SYS_ADMIN only (for testing without nightly batch)
router.post('/run/maintenance',     requireRole(ROLES.SYS_ADMIN), controller.triggerMaintenance);
router.post('/run/fuel',            requireRole(ROLES.SYS_ADMIN), controller.triggerFuel);
router.post('/run/drivers',         requireRole(ROLES.SYS_ADMIN), controller.triggerDrivers);
router.post('/run/replacement',     requireRole(ROLES.SYS_ADMIN), controller.triggerReplacement);

module.exports = router;