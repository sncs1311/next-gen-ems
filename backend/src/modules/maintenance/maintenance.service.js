const prisma = require('../../lib/prisma');

const JOB_CARD_STATUSES = ['Open', 'In Progress', 'Parts Pending', 'Completed Pending Approval', 'Closed'];

async function generateSequenceNumber(tx, model, field, prefix) {
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}-`;
  const latest = await tx[model].findFirst({
    where: { [field]: { startsWith: fullPrefix } },
    orderBy: { [field]: 'desc' },
    select: { [field]: true },
  });
  const nextSeq = latest ? parseInt(latest[field].slice(-5), 10) + 1 : 1;
  return `${fullPrefix}${String(nextSeq).padStart(5, '0')}`;
}

// FR-MM-010 — Breakdown Log Creation. Sets the asset Under Maintenance immediately;
// response time (feeds MTTR) is measured from here to job card creation.
async function createBreakdownLog(data, userId) {
  return prisma.$transaction(async (tx) => {
    const breakdownNumber = await generateSequenceNumber(tx, 'breakdownLog', 'breakdownNumber', 'BRK');
    const log = await tx.breakdownLog.create({
      data: {
        breakdownNumber,
        assetId: data.assetId,
        driverId: data.driverId,
        projectId: data.projectId ?? null,
        yardLocationId: data.yardLocationId ?? null,
        occurredAt: data.occurredAt,
        reportedBy: userId,
        symptomDescription: data.symptomDescription,
        faultCategory: data.faultCategory,
      },
    });
    await tx.asset.update({ where: { id: data.assetId }, data: { currentStatus: 'Under Maintenance' } });
    return log;
  });
}

// FR-CQ / FR-MM-010 — checkRepeatFailure: same fault category on the same asset
// more than once in the last 180 days.
async function checkRepeatFailure(assetId, faultCategory) {
  const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const count = await prisma.breakdownLog.count({
    where: { assetId, faultCategory, occurredAt: { gte: cutoff } },
  });
  return count > 1;
}

// FR-MM-008 — checkWarrantyApplicability: an active RepairWarranty on this asset's
// most recent job cards covering the same fault category.
async function checkWarrantyApplicability(assetId, faultCategory) {
  const warranty = await prisma.repairWarranty.findFirst({
    where: {
      isActive: true,
      warrantyEndDate: { gte: new Date() },
      jobCard: { assetId, faultCategory },
    },
  });
  return !!warranty;
}

// FR-MM-003 — Job Card Creation. Corrective cards must link to a BreakdownLog;
// external (vendor) cards require a vendor selection (data-layer NOT NULL handles
// the latter implicitly since vendorId would be required by the caller for those).
async function createJobCard(data, userId) {
  if (data.jobCardType === 'Corrective' && !data.breakdownLogId) {
    throw Object.assign(new Error('Corrective job cards must link to a Breakdown Report (FR-MM-003)'), { status: 422 });
  }
  if (data.workshopType === 'External' && !data.vendorId) {
    throw Object.assign(new Error('External job cards require a vendor selection (FR-MM-003)'), { status: 422 });
  }

  return prisma.$transaction(async (tx) => {
    const jobCardNumber = await generateSequenceNumber(tx, 'maintenanceJobCard', 'jobCardNumber', 'JC');
    const jobCard = await tx.maintenanceJobCard.create({
      data: {
        jobCardNumber,
        assetId: data.assetId,
        jobCardType: data.jobCardType,
        serviceType: data.serviceType ?? null,
        faultDescription: data.faultDescription ?? null,
        faultCategory: data.faultCategory ?? null,
        workshopType: data.workshopType,
        vendorId: data.vendorId ?? null,
        projectId: data.projectId ?? null,
        yardLocationId: data.yardLocationId ?? null,
        meterReadingAtOpenHours: data.meterReadingAtOpenHours ?? null,
        meterReadingAtOpenKm: data.meterReadingAtOpenKm ?? null,
        breakdownLogId: data.breakdownLogId ?? null,
        preventiveScheduleId: data.preventiveScheduleId ?? null,
        createdBy: userId,
      },
    });
    if (data.assetId) {
      await tx.asset.update({ where: { id: data.assetId }, data: { currentStatus: 'Under Maintenance' } });
    }
    return jobCard;
  });
}

// FR-MM-004 — Parts Consumption Recording. Business rule: Add Parts requires the
// job card to be Open or In Progress (UML_PART_A conditional inclusion).
async function addPartToJobCard(jobCardId, partData) {
  const jobCard = await prisma.maintenanceJobCard.findUnique({ where: { id: jobCardId } });
  if (!jobCard) throw Object.assign(new Error('Job card not found'), { status: 404 });
  if (!['Open', 'In Progress'].includes(jobCard.status)) {
    throw Object.assign(new Error('Job card must be Open or In Progress to add parts'), { status: 409 });
  }

  const totalCost = partData.quantity * partData.unitCost;

  return prisma.$transaction(async (tx) => {
    const part = await tx.jobCardPart.create({
      data: {
        jobCardId,
        sparePartId: partData.sparePartId,
        quantity: partData.quantity,
        unitCost: partData.unitCost,
        totalCost,
        partCondition: partData.partCondition ?? 'New',
        notes: partData.notes ?? null,
      },
    });
    await recomputeJobCardTotals(tx, jobCardId);
    return part;
  });
}

// FR-MM-005 — Labor Hours Recording
async function addLaborToJobCard(jobCardId, laborData) {
  const jobCard = await prisma.maintenanceJobCard.findUnique({ where: { id: jobCardId } });
  if (!jobCard) throw Object.assign(new Error('Job card not found'), { status: 404 });
  if (jobCard.status === 'Closed') {
    throw Object.assign(new Error('Closed job cards are read-only'), { status: 409 });
  }

  const totalLaborCost = laborData.hoursWorked * laborData.laborRatePerHour;

  return prisma.$transaction(async (tx) => {
    const labor = await tx.jobCardLabor.create({
      data: {
        jobCardId,
        technicianId: laborData.technicianId,
        workDate: laborData.workDate,
        hoursWorked: laborData.hoursWorked,
        laborRatePerHour: laborData.laborRatePerHour,
        totalLaborCost,
        workDescription: laborData.workDescription ?? null,
      },
    });
    await recomputeJobCardTotals(tx, jobCardId);
    return labor;
  });
}

async function recomputeJobCardTotals(tx, jobCardId) {
  const [parts, labor] = await Promise.all([
    tx.jobCardPart.aggregate({ where: { jobCardId }, _sum: { totalCost: true } }),
    tx.jobCardLabor.aggregate({ where: { jobCardId }, _sum: { totalLaborCost: true } }),
  ]);
  const totalPartsCost = Number(parts._sum.totalCost ?? 0);
  const totalLaborCost = Number(labor._sum.totalLaborCost ?? 0);
  await tx.maintenanceJobCard.update({
    where: { id: jobCardId },
    data: { totalPartsCost, totalLaborCost, totalCost: totalPartsCost + totalLaborCost },
  });
}

// FR-MM-006 — Job Card Status Workflow. Only closeJobCard (below) may reach Closed.
async function updateJobCardStatus(id, newStatus, data = {}) {
  if (!JOB_CARD_STATUSES.includes(newStatus)) {
    throw Object.assign(new Error('Invalid job card status'), { status: 422 });
  }
  if (newStatus === 'Closed') {
    throw Object.assign(new Error('Use the close-job-card endpoint — Closed requires supervisor sign-off'), { status: 409 });
  }
  const updateData = { status: newStatus };
  if (newStatus === 'Parts Pending') {
    if (!data.reason || !data.expectedDeliveryDate) {
      throw Object.assign(new Error('Parts Pending requires a reason and expected delivery date (FR-MM-006)'), { status: 422 });
    }
    updateData.partsPendingSince = new Date();
    updateData.partsExpectedBy = data.expectedDeliveryDate;
  }
  if (newStatus === 'Completed Pending Approval') {
    updateData.completedAt = new Date();
  }
  return prisma.maintenanceJobCard.update({ where: { id }, data: updateData });
}

// FR-MM-006/007 — Close Job Card. Supervisor-only (enforced at route level), requires
// at least one labor or parts entry (SRS 5.5 validation rule), recalculates next
// service due date, and returns the asset to service.
async function closeJobCard(id, supervisorId, remarks) {
  const jobCard = await prisma.maintenanceJobCard.findUnique({
    where: { id },
    include: { jobCardPartJobCardIdList: true, jobCardLaborJobCardIdList: true },
  });
  if (!jobCard) throw Object.assign(new Error('Job card not found'), { status: 404 });
  if (jobCard.status === 'Closed') {
    throw Object.assign(new Error('Job card already closed'), { status: 409 });
  }
  if (jobCard.jobCardPartJobCardIdList.length === 0 && jobCard.jobCardLaborJobCardIdList.length === 0) {
    throw Object.assign(new Error('Job card cannot be closed without at least one labor or parts entry (SRS 5.5)'), { status: 422 });
  }

  return prisma.$transaction(async (tx) => {
    const closed = await tx.maintenanceJobCard.update({
      where: { id },
      data: {
        status: 'Closed',
        closedAt: new Date(),
        approvedBy: supervisorId,
        approvalRemarks: remarks,
      },
    });

    // FR-MM-007 — recalculate next service due if this job card is tied to a schedule
    if (jobCard.preventiveScheduleId) {
      await recalculateNextServiceDue(tx, jobCard.assetId, jobCard.preventiveScheduleId, closed);
    }

    // Return the asset to service (Idle) unless another open job card still holds it down
    const otherOpenCards = await tx.maintenanceJobCard.count({
      where: { assetId: jobCard.assetId, status: { not: 'Closed' }, id: { not: id } },
    });
    if (otherOpenCards === 0) {
      await tx.asset.update({ where: { id: jobCard.assetId }, data: { currentStatus: 'Idle' } });
    }

    return closed;
  });
}

async function recalculateNextServiceDue(tx, assetId, scheduleId, closedJobCard) {
  const schedule = await tx.preventiveMaintenanceSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) return;

  const meterHours = closedJobCard.meterReadingAtCloseHours ?? closedJobCard.meterReadingAtOpenHours;
  const meterKm = closedJobCard.meterReadingAtCloseKm ?? closedJobCard.meterReadingAtOpenKm;

  const data = {
    lastServiceDate: closedJobCard.closedAt,
    overdueStatus: 'OK',
  };
  if (meterHours != null && schedule.intervalHours) {
    data.lastServiceMeterHours = meterHours;
    data.nextDueHours = Number(meterHours) + schedule.intervalHours;
  }
  if (meterKm != null && schedule.intervalKm) {
    data.lastServiceMeterKm = meterKm;
    data.nextDueKm = Number(meterKm) + schedule.intervalKm;
  }
  data.lastJobCardId = closedJobCard.id;

  await tx.preventiveMaintenanceSchedule.update({ where: { id: scheduleId }, data });
}

// Used by the Transfer module (FR-MM-011 / NFR block) — dispatch is blocked while
// an asset has any open job card.
async function blockTransferIfUnderMaintenance(assetId) {
  const openCount = await prisma.maintenanceJobCard.count({
    where: { assetId, status: { not: 'Closed' } },
  });
  return openCount > 0;
}

async function getAssetMaintenanceHistory(assetId) {
  return prisma.maintenanceJobCard.findMany({
    where: { assetId },
    include: { jobCardPartJobCardIdList: true, jobCardLaborJobCardIdList: true },
    orderBy: { openedAt: 'desc' },
  });
}

module.exports = {
  createBreakdownLog,
  createJobCard,
  addPartToJobCard,
  addLaborToJobCard,
  updateJobCardStatus,
  closeJobCard,
  checkRepeatFailure,
  checkWarrantyApplicability,
  blockTransferIfUnderMaintenance,
  getAssetMaintenanceHistory,
  JOB_CARD_STATUSES,
};
