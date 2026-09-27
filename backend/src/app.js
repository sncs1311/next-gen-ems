// backend/src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

const authRoutes         = require('./modules/auth/auth.routes');
const assetRoutes        = require('./modules/assets/asset.routes');
const driverRoutes       = require('./modules/drivers/driver.routes');
const projectRoutes      = require('./modules/projects/project.routes');
const fuelRoutes         = require('./modules/fuel/fuel.routes');
const maintenanceRoutes  = require('./modules/maintenance/maintenance.routes');
const transferRoutes     = require('./modules/transfers/transfer.routes');
const incidentRoutes     = require('./modules/incidents/incident.routes');
const adminRoutes        = require('./modules/admin/admin.routes');
const analyticsRoutes    = require('./modules/analytics/analytics.routes');
const intelligenceRoutes = require('./modules/intelligence/intelligence.routes');
const { errorHandler }   = require('./middleware/error');
const { authenticate }   = require('./middleware/auth');
const { loadProjectScope } = require('./middleware/projectScope');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ADDED — serve uploaded files (incident photos, documents, etc.) as static
// assets. The URL /uploads/incidents/<filename> maps to
// backend/uploads/incidents/<filename> on disk. Mounted before API routes.
// Note: files are publicly accessible by URL — if you need authenticated
// file access, replace with a signed-URL approach (SRS §4.8) later.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',         authRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/analytics',    analyticsRoutes);
app.use('/api/intelligence', intelligenceRoutes);

app.use('/api/assets',       authenticate, loadProjectScope, assetRoutes);
app.use('/api/drivers',      authenticate, loadProjectScope, driverRoutes);
app.use('/api/projects',     authenticate, loadProjectScope, projectRoutes);
app.use('/api/fuel',         authenticate, loadProjectScope, fuelRoutes);
app.use('/api/maintenance',  authenticate, loadProjectScope, maintenanceRoutes);
app.use('/api/transfers',    authenticate, loadProjectScope, transferRoutes);
app.use('/api/incidents',    authenticate, loadProjectScope, incidentRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;