/**
 * backend/src/jobs/nightly.js
 * Nightly batch job — SRS §4.6
 * Runs at midnight via node-cron (or can be triggered manually via npm run batch).
 *
 * Usage:
 *   npm run batch          — run once immediately
 *   node src/jobs/nightly.js --schedule   — run on cron schedule (midnight daily)
 */

require('dotenv').config();
const prisma = require('../lib/prisma');
const intelligenceService = require('../modules/intelligence/intelligence.service');

const SCHEDULE = process.argv.includes('--schedule');

async function runBatch() {
  const start = new Date();
  console.log(`\n[${start.toISOString()}] === Nightly Batch Started ===`);

  const results = {};

  // ── 1. KPI Snapshots ──────────────────────────────────────────────────────
  console.log('\n[1/5] Computing asset KPI snapshots...');
  try {
    const assets = await prisma.asset.findMany({
      where: { isArchived: false, currentStatus: { not: 'Written Off' } },
      select: { id: true },
    });

    for (const { id } of assets) {
      const [fuelAgg, maintAgg, breakdowns] = await Promise.all([
        prisma.fuelLog.aggregate({
          where: { assetId: id },
          _sum: { quantityLiters: true, totalCost: true },
        }),
        prisma.maintenanceJobCard.aggregate({
          where: { assetId: id, status: 'Closed' },
          _sum: { totalCost: true },
          _count: { id: true },
        }),
        prisma.breakdownLog.findMany({
          where: { assetId: id },
          select: { occurredAt: true },
          orderBy: { occurredAt: 'asc' },
        }),
      ]);

      // MTBF from gaps between breakdowns
      let mtbf = 0, mttr = 0;
      if (breakdowns.length > 1) {
        const gaps = [];
        for (let i = 1; i < breakdowns.length; i++) {
          gaps.push((breakdowns[i].occurredAt - breakdowns[i - 1].occurredAt) / 3600000);
        }
        mtbf = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      }

      // MTTR from corrective job cards
      const correctiveCards = await prisma.maintenanceJobCard.findMany({
        where: { assetId: id, jobCardType: 'Corrective', status: 'Closed', closedAt: { not: null } },
        select: { openedAt: true, closedAt: true },
      });
      if (correctiveCards.length) {
        const times = correctiveCards.map(c => (c.closedAt - c.openedAt) / 3600000);
        mttr = times.reduce((a, b) => a + b, 0) / times.length;
      }

      const logCount = await prisma.fuelLog.count({ where: { assetId: id } });
      const utilization = Math.min(logCount * 6 / (365 * 10), 1.0) * 100;

      // Use updateMany+create pattern — assetId has no @unique in schema, use find first
      const existing = await prisma.assetKPISnapshot.findFirst({ where: { assetId: id } });
      const kpiData = {
        snapshotDate: new Date(),
        utilizationRatePercent: Math.round(utilization * 10) / 10,
        mtbfHours: Math.round(mtbf * 10) / 10,
        mttrHours: Math.round(mttr * 10) / 10,
        totalFuelLiters: Number(fuelAgg._sum.quantityLiters ?? 0),
        totalFuelCost: Number(fuelAgg._sum.totalCost ?? 0),
        totalMaintenanceCost: Number(maintAgg._sum.totalCost ?? 0),
        breakdownCount: breakdowns.length,
        computedAt: new Date(),
      };
      if (existing) {
        await prisma.assetKPISnapshot.update({ where: { id: existing.id }, data: kpiData });
      } else {
        await prisma.assetKPISnapshot.create({ data: { assetId: id, currency: 'SAR', ...kpiData } });
      }
    }
    results.kpiSnapshots = { processed: assets.length };
    console.log(`  ✓ ${assets.length} KPI snapshots updated`);
  } catch (err) {
    results.kpiSnapshots = { error: err.message };
    console.error('  ✗ KPI snapshots failed:', err.message);
  }

  // ── 2. Predictive Maintenance Scoring ─────────────────────────────────────
  console.log('\n[2/5] Running predictive maintenance scoring...');
  try {
    const r = await intelligenceService.runPredictiveMaintenance();
    results.predictiveMaintenance = r;
    console.log(`  ✓ ${r.processed} assets scored`);
  } catch (err) {
    results.predictiveMaintenance = { error: err.message };
    console.error('  ✗ Predictive maintenance failed:', err.message);
  }

  // ── 3. Fuel Forecasting ────────────────────────────────────────────────────
  console.log('\n[3/5] Running fuel forecasting...');
  try {
    const r = await intelligenceService.runFuelForecasting();
    results.fuelForecast = r;
    console.log(`  ✓ ${r.processed} projects forecasted`);
  } catch (err) {
    results.fuelForecast = { error: err.message };
    console.error('  ✗ Fuel forecasting failed:', err.message);
  }

  // ── 4. Driver Behavior Scoring ────────────────────────────────────────────
  console.log('\n[4/5] Running driver behavior scoring...');
  try {
    const r = await intelligenceService.runDriverBehaviorScoring();
    results.driverScoring = r;
    console.log(`  ✓ ${r.processed} drivers scored`);
  } catch (err) {
    results.driverScoring = { error: err.message };
    console.error('  ✗ Driver scoring failed:', err.message);
  }

  // ── 5. Replacement Alert Engine ───────────────────────────────────────────
  console.log('\n[5/5] Running replacement alert engine...');
  try {
    const r = await intelligenceService.runReplacementAlertEngine();
    results.replacementAlerts = r;
    console.log(`  ✓ ${r.processed} assets checked, ${r.alertsGenerated} alerts generated`);
  } catch (err) {
    results.replacementAlerts = { error: err.message };
    console.error('  ✗ Replacement alerts failed:', err.message);
  }

  const duration = ((new Date() - start) / 1000).toFixed(1);
  console.log(`\n=== Batch Complete in ${duration}s ===`);
  console.log(JSON.stringify(results, null, 2));

  await prisma.$disconnect();
  return results;
}

if (SCHEDULE) {
  // Run on cron schedule — requires node-cron
  try {
    const cron = require('node-cron');
    console.log('Nightly batch scheduled for midnight (00:00) daily.');
    cron.schedule('0 0 * * *', runBatch);
  } catch {
    console.error('node-cron not installed. Run: npm install node-cron');
    process.exit(1);
  }
} else {
  // Run once immediately
  runBatch().catch((err) => {
    console.error('Batch failed:', err);
    process.exit(1);
  });
}