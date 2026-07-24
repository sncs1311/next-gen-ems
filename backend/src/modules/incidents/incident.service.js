const prisma = require('../../lib/prisma');

// FR-IM-006 — incident type -> driver incident-score point deltas (all negative)
const SCORE_IMPACT = {
  'Near Miss': -2,
  'Minor Accident': -5,
  'Major Accident': -15,
  'Personal Injury': -20,
  'Fire': -25,
  'Equipment Tip-Over': -25,
};

// Weights per FR-DR-004 (configurable by System Admin once the Admin module exists —
// hardcoded here for now, same as the anomaly threshold in fuel.service.js).
const WEIGHTS = { incident: 0.4, fuel: 0.3, breakdown: 0.2, compliance: 0.1 };

// ASSUMPTION (not specified in the SRS text available): for DriverBehaviorScore, a
// HIGHER composite score means SAFER (points are subtracted for bad events per
// FR-IM-006), so risk bands run the opposite direction from the asset risk bands in
// FR-IL-002. Flagging this — the exact cutoffs should be confirmed with mentors.
function riskCategoryFor(compositeScore) {
  if (compositeScore >= 70) return 'Low';
  if (compositeScore >= 40) return 'Medium';
  return 'High';
}

const TYPES_REQUIRING_THIRD_PARTY_DATA = ['Minor Accident', 'Major Accident', 'Third-Party Property Damage'];

async function generateIncidentNumber(tx) {
  const year = new Date().getFullYear();
  const prefix = `INC-${year}-`;
  const latest = await tx.incidentReport.findFirst({
    where: { incidentNumber: { startsWith: prefix } },
    orderBy: { incidentNumber: 'desc' },
    select: { incidentNumber: true },
  });
  const nextSeq = latest ? parseInt(latest.incidentNumber.slice(-5), 10) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(5, '0')}`;
}

// FR-IM-001/002/004 — Incident Report Creation, with conditional third-party and
// injury fields required by incident type.
async function createIncidentReport(data, userId) {
  if (TYPES_REQUIRING_THIRD_PARTY_DATA.includes(data.incidentType) && !data.thirdPartyInvolved) {
    throw Object.assign(
      new Error(`${data.incidentType} requires third-party details (FR-IM-002)`),
      { status: 422 }
    );
  }
  if (data.occurredAt && new Date(data.occurredAt) > new Date()) {
    throw Object.assign(new Error('Incident date must not be in the future (SRS 5.5)'), { status: 422 });
  }

  return prisma.$transaction(async (tx) => {
    const incidentNumber = await generateIncidentNumber(tx);
    const report = await tx.incidentReport.create({
      data: {
        incidentNumber,
        assetId: data.assetId,
        driverId: data.driverId,
        projectId: data.projectId ?? null,
        yardLocationId: data.yardLocationId ?? null,
        incidentType: data.incidentType,
        occurredAt: data.occurredAt,
        reportedBy: userId,
        thirdPartyInvolved: !!data.thirdPartyInvolved,
        thirdPartyVehiclePlate: data.thirdPartyVehiclePlate ?? null,
        thirdPartyCompany: data.thirdPartyCompany ?? null,
        thirdPartyDriverName: data.thirdPartyDriverName ?? null,
        thirdPartyInsuranceDetails: data.thirdPartyInsuranceDetails ?? null,
        personalInjuryOccurred: !!data.personalInjuryOccurred,
        injuredPersonsDetails: data.injuredPersonsDetails ?? null,
        medicalAttentionRequired: !!data.medicalAttentionRequired,
        hospitalizationOccurred: !!data.hospitalizationOccurred,
        medicalFacility: data.medicalFacility ?? null,
        policeReportNumber: data.policeReportNumber ?? null,
      },
    });

    // FR-IM-004 — personal injury auto-generates a Critical alert. No SystemAlert
    // service exists yet (belongs to the Admin/Analytics module) — logged for now.
    if (report.personalInjuryOccurred) {
      console.warn(`[CRITICAL ALERT] Personal injury on incident ${report.incidentNumber} — Fleet Manager + HSE Officer notification pending SystemAlert service`);
    }

    return report;
  });
}

// FR-IM-001 — Assign HSE Investigator
async function assignHSEOfficer(incidentId, officerId) {
  return prisma.incidentReport.update({
    where: { id: incidentId },
    data: { investigatedBy: officerId, investigationStartDate: new Date() },
  });
}

// FR-IM-005 — Root Cause and Corrective Action Recording (required before closure)
async function recordRootCause(incidentId, data) {
  return prisma.incidentReport.update({
    where: { id: incidentId },
    data: {
      rootCauseCategory: data.rootCauseCategory,
      rootCauseDescription: data.rootCauseDescription,
      correctiveAction: data.correctiveAction,
    },
  });
}

// FR-IM-006 — apply the driver score impact for this incident type
async function applyDriverScoreImpact(incidentId) {
  const incident = await prisma.incidentReport.findUnique({ where: { id: incidentId } });
  if (!incident) throw Object.assign(new Error('Incident not found'), { status: 404 });

  const delta = SCORE_IMPACT[incident.incidentType];
  if (delta === undefined) return null; // e.g. Falling Object / Third-Party Property Damage carry no driver score impact per FR-IM-006's list

  return prisma.$transaction(async (tx) => {
    const existing = await tx.driverBehaviorScore.findUnique({ where: { driverId: incident.driverId } });

    const currentIncidentScore = existing ? Number(existing.incidentScore) : 100;
    const newIncidentScore = Math.max(0, Math.min(100, currentIncidentScore + delta));
    const fuelScore = existing ? Number(existing.fuelScore) : 100;
    const breakdownScore = existing ? Number(existing.breakdownAttributionScore) : 100;
    const complianceScore = existing ? Number(existing.complianceScore) : 100;

    const compositeScore =
      newIncidentScore * WEIGHTS.incident +
      fuelScore * WEIGHTS.fuel +
      breakdownScore * WEIGHTS.breakdown +
      complianceScore * WEIGHTS.compliance;
    const riskCategory = riskCategoryFor(compositeScore);

    const updated = await tx.driverBehaviorScore.upsert({
      where: { driverId: incident.driverId },
      update: {
        incidentScore: newIncidentScore,
        compositeScore,
        riskCategory,
        incidentsLast90Days: { increment: 1 },
        lastComputedAt: new Date(),
      },
      create: {
        driverId: incident.driverId,
        incidentScore: newIncidentScore,
        fuelScore,
        breakdownAttributionScore: breakdownScore,
        complianceScore,
        compositeScore,
        riskCategory,
        incidentsLast90Days: 1,
        lastComputedAt: new Date(),
        modelVersion: 'rule-based-v0',
      },
    });

    await tx.driverBehaviorScoreHistory.create({
      data: {
        driverId: incident.driverId,
        compositeScore: updated.compositeScore,
        riskCategory: updated.riskCategory,
        incidentScore: updated.incidentScore,
        fuelScore: updated.fuelScore,
        breakdownAttributionScore: updated.breakdownAttributionScore,
        complianceScore: updated.complianceScore,
        computedAt: new Date(),
        modelVersion: 'rule-based-v0',
      },
    });

    return updated;
  });
}

// FR-IM-003/005 — Close Incident Report. Requires root cause first (business rule
// from UML_PART_A conditional inclusion); Major Accident / Third-Party Property
// Damage cannot close without a police report number (NFR-RC-003).
async function closeIncidentReport(incidentId, closerId) {
  const incident = await prisma.incidentReport.findUnique({ where: { id: incidentId } });
  if (!incident) throw Object.assign(new Error('Incident not found'), { status: 404 });
  if (incident.incidentStatus === 'Closed') {
    throw Object.assign(new Error('Incident already closed'), { status: 409 });
  }
  if (!incident.rootCauseCategory || !incident.correctiveAction) {
    throw Object.assign(new Error('Root cause and corrective action must be recorded before closure (FR-IM-005)'), { status: 422 });
  }
  if (
    ['Major Accident', 'Third-Party Property Damage'].includes(incident.incidentType) &&
    !incident.policeReportNumber
  ) {
    throw Object.assign(new Error('Major Accident / Third-Party Property Damage cannot be closed without a police report number (NFR-RC-003)'), { status: 422 });
  }

  const closed = await prisma.incidentReport.update({
    where: { id: incidentId },
    data: { incidentStatus: 'Closed', closureDate: new Date() },
  });

  await applyDriverScoreImpact(incidentId);

  return closed;
}

// FR-IM-007 — Incident Analytics
async function getIncidentAnalytics(filters = {}) {
  const { projectId, startDate, endDate } = filters;
  const where = {
    ...(projectId && { projectId }),
    ...(startDate && endDate && { occurredAt: { gte: new Date(startDate), lte: new Date(endDate) } }),
  };

  const [byType, totalDamage, repeatByAsset] = await Promise.all([
    prisma.incidentReport.groupBy({ by: ['incidentType'], where, _count: { id: true } }),
    prisma.incidentReport.aggregate({ where, _sum: { estimatedDamageCost: true, estimatedThirdPartyClaim: true } }),
    prisma.incidentReport.groupBy({
      by: ['assetId'],
      where,
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
    }),
  ]);

  return {
    incidentsByType: byType.map((b) => ({ type: b.incidentType, count: b._count.id })),
    totalEstimatedDamageCost: Number(totalDamage._sum.estimatedDamageCost ?? 0),
    totalEstimatedThirdPartyClaim: Number(totalDamage._sum.estimatedThirdPartyClaim ?? 0),
    repeatIncidentAssetCount: repeatByAsset.length,
  };
}

async function getIncidentById(id) {
  const incident = await prisma.incidentReport.findUnique({
    where: { id },
    include: { asset: true, driver: { include: { employee: true } }, incidentMediaIncidentIdList: true },
  });
  if (!incident) throw Object.assign(new Error('Incident not found'), { status: 404 });
  return incident;
}

async function listIncidents(filters = {}) {
  const { status, incidentType, page = 1, pageSize = 25 } = filters;
  const where = {
    ...(status && { incidentStatus: status }),
    ...(incidentType && { incidentType }),
  };
  const [total, results] = await prisma.$transaction([
    prisma.incidentReport.count({ where }),
    prisma.incidentReport.findMany({
      where,
      include: { asset: true },
      orderBy: { occurredAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, page: Number(page), pageSize: Number(pageSize), results };
}

module.exports = {
  createIncidentReport,
  assignHSEOfficer,
  recordRootCause,
  closeIncidentReport,
  applyDriverScoreImpact,
  getIncidentAnalytics,
  getIncidentById,
  listIncidents,
};
