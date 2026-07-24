const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const authRoutes = require('./modules/auth/auth.routes');
const assetRoutes = require('./modules/assets/asset.routes');
const driverRoutes = require('./modules/drivers/driver.routes');
const projectRoutes = require('./modules/projects/project.routes');
const fuelRoutes = require('./modules/fuel/fuel.routes');
const maintenanceRoutes = require('./modules/maintenance/maintenance.routes');
const transferRoutes = require('./modules/transfers/transfer.routes');
const incidentRoutes = require('./modules/incidents/incident.routes');
const { errorHandler } = require('./middleware/error');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Route modules per SRS 4.3 — one module per functional domain.
// Built (Phase 2, all core operational modules): auth, assets, drivers, projects,
// fuel, maintenance, transfers, incidents. Remaining: Analytics Dashboard,
// Intelligence Layer (Phase 3/4 scope), System Admin.
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/incidents', incidentRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
