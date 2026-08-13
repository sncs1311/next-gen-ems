// backend/src/modules/analytics/analytics.service.js
// Serves pre-computed KPI data from AssetKPISnapshot + raw log tables.
// All heavy aggregation runs in the nightly batch — dashboard reads snapshots only (NFR-P-001).

const prisma = require('../../lib/prisma');

// FR-AD-001 — Fleet-wide KPI summary
async function getFleetStats() {
  const [
    totalAssets,
    underMaintenance,
    inTransit,
    idle,
    snapshots,
    fuelThisMonth,
    maintThisMonth,
  ] = await Promise.all([
    prisma.asset.count({ where: { isArchived: false, currentStatus: { not: 'Written Off' } } }),
    prisma.asset.count({ where: { isArchived: false, currentStatus: 'Under Maintenance' } }),
    prisma.asset.count({ where: { isArchived: false, currentStatus: 'In Transit' } }),
    prisma.asset.count({ where: { isArchived: false, currentStatus: 'Idle' } }),
    prisma.assetKPISnapshot.aggregate({
      _avg: { utilizationRatePercent: true, mtbfHours: true, mttrHours: true },
    }),
    prisma.fuelLog.aggregate({
      where: { loggedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { quantityLiters: true, totalCost: true },
    }),
    prisma.maintenanceJobCard.aggregate({
      where: {
        status: 'Closed',
        closedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { totalCost: true },
    }),
  ]);

  return {
    totalAssets,
    underMaintenance,
    inTransit,
    idle,
    active: totalAssets - underMaintenance - inTransit - idle,
    utilizationRate: Math.round(snapshots._avg.utilizationRatePercent ?? 0),
    mtbf: Math.round(snapshots._avg.mtbfHours ?? 0),
    mttr: Math.round(snapshots._avg.mttrHours ?? 0),
    fuelThisMonthLiters: Math.round(fuelThisMonth._sum.quantityLiters ?? 0),
    fuelThisMonthCost: Math.round(fuelThisMonth._sum.totalCost ?? 0),
    maintenanceCostThisMonth: Math.round(maintThisMonth._sum.totalCost ?? 0),
  };
}

// FR-AD-002 — Fleet utilization by project
async function getUtilizationByProject() {
  const projects = await prisma.project.findMany({
    where: { isArchived: false, projectStatus: 'Active' },
    include: {
      assetSiteAssignmentProjectIdList: {
        where: { assignedTo: null },
        include: {
          asset: {
            include: {
              assetKPISnapshotAssetIdList: {
                take: 1,
                orderBy: { snapshotDate: 'desc' },
              },
            },
          },
        },
      },
    },
  });

  return projects.map((p) => {
    const assignments = p.assetSiteAssignmentProjectIdList;
    const avgUtil =
      assignments.length > 0
        ? assignments.reduce((sum, a) => {
            const snap = a.asset.assetKPISnapshotAssetIdList[0];
            return sum + (snap?.utilizationRatePercent ?? 0);
          }, 0) / assignments.length
        : 0;
    return {
      projectCode: p.projectCode,
      projectName: p.projectName,
      assetCount: assignments.length,
      utilizationRate: Math.round(avgUtil),
    };
  });
}

// FR-AD-003 — MTBF/MTTR trend by month
async function getMTBFTrend() {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const results = await Promise.all(
    months.map(async ({ year, month }) => {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);

      const [breakdowns, repairs] = await Promise.all([
        prisma.breakdownLog.findMany({
          where: { occurredAt: { gte: start, lt: end } },
          select: { occurredAt: true, assetId: true },
        }),
        prisma.maintenanceJobCard.findMany({
          where: {
            jobCardType: 'Corrective',
            openedAt: { gte: start, lt: end },
            closedAt: { not: null },
          },
          select: { openedAt: true, closedAt: true },
        }),
      ]);

      const mttr =
        repairs.length > 0
          ? repairs.reduce((sum, r) => sum + (r.closedAt - r.openedAt) / 3600000, 0) / repairs.length
          : 0;

      return {
        label: `${year}-${String(month).padStart(2, '0')}`,
        breakdowns: breakdowns.length,
        mttr: Math.round(mttr * 10) / 10,
      };
    })
  );

  return results;
}

// FR-AD-004 — Top TCO assets
async function getTopTCOAssets(limit = 10) {
  const snapshots = await prisma.assetKPISnapshot.findMany({
    include: {
      asset: { include: { subType: { include: { category: true } } } },
    },
    orderBy: [{ totalFuelCost: 'desc' }],
    take: limit * 2,
  });

  // Deduplicate by asset, take highest snapshot
  const seen = new Set();
  const unique = [];
  for (const s of snapshots) {
    if (!seen.has(s.assetId)) {
      seen.add(s.assetId);
      unique.push(s);
    }
    if (unique.length >= limit) break;
  }

  return unique.map((s) => ({
    assetNumber: s.asset.assetNumber,
    make: s.asset.make,
    model: s.asset.model,
    category: s.asset.subType?.category?.categoryName ?? '—',
    totalFuelCost: Math.round(Number(s.totalFuelCost ?? 0)),
    totalMaintenanceCost: Math.round(Number(s.totalMaintenanceCost ?? 0)),
    tco: Math.round(Number(s.totalFuelCost ?? 0) + Number(s.totalMaintenanceCost ?? 0)),
  }));
}

// FR-AD-005 — Fuel consumption by project per month
async function getFuelByProject() {
  const projects = await prisma.project.findMany({
    where: { isArchived: false },
    select: { id: true, projectCode: true, projectName: true },
  });

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
    });
  }

  const data = await Promise.all(
    months.map(async ({ label, start, end }) => {
      const row = { month: label };
      for (const p of projects) {
        const agg = await prisma.fuelLog.aggregate({
          where: { projectId: p.id, loggedAt: { gte: start, lt: end } },
          _sum: { quantityLiters: true },
        });
        row[p.projectCode] = Math.round(agg._sum.quantityLiters ?? 0);
      }
      return row;
    })
  );

  return { data, projects: projects.map((p) => ({ id: p.id, code: p.projectCode, name: p.projectName })) };
}

// FR-AD-006 — Maintenance cost trend (preventive vs corrective)
async function getMaintenanceCostTrend() {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
    });
  }

  return Promise.all(
    months.map(async ({ label, start, end }) => {
      const [prev, corr] = await Promise.all([
        prisma.maintenanceJobCard.aggregate({
          where: { jobCardType: 'Preventive', status: 'Closed', closedAt: { gte: start, lt: end } },
          _sum: { totalCost: true },
        }),
        prisma.maintenanceJobCard.aggregate({
          where: { jobCardType: 'Corrective', status: 'Closed', closedAt: { gte: start, lt: end } },
          _sum: { totalCost: true },
        }),
      ]);
      return {
        month: label,
        preventive: Math.round(Number(prev._sum.totalCost ?? 0)),
        corrective: Math.round(Number(corr._sum.totalCost ?? 0)),
      };
    })
  );
}

// FR-AD-007 — Expiry alerts
async function getExpiryAlerts() {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);
  const in60 = new Date(now.getTime() + 60 * 86400000);
  const in90 = new Date(now.getTime() + 90 * 86400000);

  const [gulfRegs, insurances, certs, licenses] = await Promise.all([
    prisma.gulfRegistration.findMany({
      where: { isCurrent: true, registrationExpiryDate: { lte: in90 } },
      include: { asset: { select: { assetNumber: true, make: true, model: true } } },
    }),
    prisma.assetInsuranceCoverage.findMany({
      where: { effectiveTo: { lte: in90 } },
      include: {
        policy: { select: { policyNumber: true, coverageEndDate: true } },
        asset: { select: { assetNumber: true } },
      },
    }),
    prisma.equipmentCertification.findMany({
      where: { isCurrent: true, expiryDate: { lte: in60 } },
      include: { asset: { select: { assetNumber: true, make: true, model: true } } },
    }),
    prisma.driverLicense.findMany({
      where: { isCurrent: true, expiryDate: { lte: in60 } },
      include: { driver: { include: { employee: { select: { fullName: true } } } } },
    }),
  ]);

  function urgency(date) {
    const d = new Date(date);
    if (d <= in30) return 'red';
    if (d <= in60) return 'amber';
    return 'green';
  }
  function daysLeft(date) {
    return Math.ceil((new Date(date) - now) / 86400000);
  }

  const alerts = [
    ...gulfRegs.map((r) => ({
      type: 'Gulf Registration', entity: r.asset.assetNumber,
      detail: `${r.asset.make} ${r.asset.model}`,
      expiryDate: r.registrationExpiryDate, daysLeft: daysLeft(r.registrationExpiryDate),
      urgency: urgency(r.registrationExpiryDate),
    })),
    ...certs.map((c) => ({
      type: 'Equipment Certification', entity: c.asset.assetNumber,
      detail: c.certificateNumber,
      expiryDate: c.expiryDate, daysLeft: daysLeft(c.expiryDate),
      urgency: urgency(c.expiryDate),
    })),
    ...licenses.map((l) => ({
      type: 'Driver License', entity: l.driver?.employee?.fullName ?? 'Unknown',
      detail: l.licenseCategory,
      expiryDate: l.expiryDate, daysLeft: daysLeft(l.expiryDate),
      urgency: urgency(l.expiryDate),
    })),
  ].sort((a, b) => a.daysLeft - b.daysLeft);

  return alerts;
}

// FR-AD-008 — Assets due for service
async function getAssetsDueForService() {
  const schedules = await prisma.preventiveMaintenanceSchedule.findMany({
    where: { isActive: true, overdueStatus: { not: 'OK' } },
    include: {
      asset: { select: { id: true, assetNumber: true, make: true, model: true, currentStatus: true } },
    },
    orderBy: { nextDueHours: 'asc' },
    take: 20,
  });

  // Also check recently created assets with no schedule yet
  return schedules.map((s) => ({
    assetId: s.asset.id,
    assetNumber: s.asset.assetNumber,
    make: s.asset.make,
    model: s.asset.model,
    currentStatus: s.asset.currentStatus,
    serviceType: s.serviceType,
    nextDueHours: s.nextDueHours,
    overdueStatus: s.overdueStatus,
  }));
}

// FR-AD-001 — Incident analytics
async function getIncidentStats() {
  const byType = await prisma.incidentReport.groupBy({
    by: ['incidentType'],
    _count: { id: true },
  });
  const byProject = await prisma.incidentReport.groupBy({
    by: ['projectId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });
  const total = await prisma.incidentReport.count();
  const open = await prisma.incidentReport.count({ where: { incidentStatus: 'Open' } });

  return { total, open, byType, byProject };
}

module.exports = {
  getFleetStats,
  getUtilizationByProject,
  getMTBFTrend,
  getTopTCOAssets,
  getFuelByProject,
  getMaintenanceCostTrend,
  getExpiryAlerts,
  getAssetsDueForService,
  getIncidentStats,
};