const prisma = require('../../lib/prisma');
const maintenanceService = require('../maintenance/maintenance.service');

// FR-ET-001 — Transfer Request Submission
async function submitTransferRequest(data, userId) {
  const existing = await prisma.transferRequest.findFirst({
    where: { assetId: data.assetId, currentStatus: { in: ['Pending', 'Approved', 'Dispatched', 'In Transit'] } },
  });
  if (existing) {
    throw Object.assign(new Error('A pending or approved transfer already exists for this asset (FR-ET-001)'), { status: 409 });
  }

  return prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear();
    const prefix = `TRF-${year}-`;
    const latest = await tx.transferRequest.findFirst({
      where: { transferNumber: { startsWith: prefix } },
      orderBy: { transferNumber: 'desc' },
      select: { transferNumber: true },
    });
    const nextSeq = latest ? parseInt(latest.transferNumber.slice(-5), 10) + 1 : 1;
    const transferNumber = `${prefix}${String(nextSeq).padStart(5, '0')}`;

    const request = await tx.transferRequest.create({
      data: {
        transferNumber,
        assetId: data.assetId,
        sourceProjectId: data.sourceProjectId ?? null,
        sourceYardId: data.sourceYardId ?? null,
        destinationProjectId: data.destinationProjectId ?? null,
        destinationYardId: data.destinationYardId ?? null,
        requestedBy: userId,
        requiredByDate: data.requiredByDate ?? null,
        transferReason: data.transferReason,
        reasonDetails: data.reasonDetails ?? null,
      },
    });
    await tx.transferStateHistory.create({
      data: { transferRequestId: request.id, toStatus: 'Pending', changedBy: userId },
    });
    return request;
  });
}

// FR-ET-003 — Gulf Regulatory Compliance Check on Transfer. Verifies Gulf Registration,
// Insurance, and (if a driver is assigned) driver license — all with expiry dates.
async function checkComplianceForTransfer(assetId, driverId) {
  const issues = [];
  const now = new Date();

  const gulfReg = await prisma.gulfRegistration.findUnique({ where: { assetId } });
  if (gulfReg) {
    if (!gulfReg.isCurrent || gulfReg.registrationExpiryDate < now) {
      issues.push({ check: 'Gulf Registration', status: 'FAILED', expiryDate: gulfReg.registrationExpiryDate });
    }
  }

  const activeCoverage = await prisma.assetInsuranceCoverage.findFirst({
    where: { assetId, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
    include: { policy: true },
  });
  if (!activeCoverage || !activeCoverage.policy.isActive || activeCoverage.policy.coverageEndDate < now) {
    issues.push({ check: 'Insurance Policy', status: 'FAILED', expiryDate: activeCoverage?.policy?.coverageEndDate ?? null });
  }

  if (driverId) {
    const license = await prisma.driverLicense.findFirst({
      where: { driverId, isCurrent: true },
      orderBy: { issueDate: 'desc' },
    });
    if (!license || license.expiryDate < now) {
      issues.push({ check: 'Driver License', status: 'FAILED', expiryDate: license?.expiryDate ?? null });
    }
  }

  const underMaintenance = await maintenanceService.blockTransferIfUnderMaintenance(assetId);
  if (underMaintenance) {
    issues.push({ check: 'Maintenance Status', status: 'FAILED', reason: 'Asset has an open job card (FR-MM-011)' });
  }

  return { passed: issues.length === 0, issues };
}

// FR-ET-002 — Transfer Approval Workflow (Approve). Blocked until compliance passes
// or the Fleet Manager overrides with a logged reason (NFR-RC-001).
async function approveTransfer(id, approverId, remarks, overrideReason) {
  const request = await prisma.transferRequest.findUnique({ where: { id } });
  if (!request) throw Object.assign(new Error('Transfer request not found'), { status: 404 });
  if (request.currentStatus !== 'Pending') {
    throw Object.assign(new Error('Only Pending transfers can be approved'), { status: 409 });
  }

  const compliance = await checkComplianceForTransfer(request.assetId, request.driverId);
  if (!compliance.passed && !overrideReason) {
    return { blocked: true, compliance };
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.transferRequest.update({
      where: { id },
      data: {
        currentStatus: 'Approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        approvalRemarks: overrideReason ? `${remarks ?? ''} [OVERRIDE: ${overrideReason}]`.trim() : remarks,
      },
    });
    await tx.transferStateHistory.create({
      data: { transferRequestId: id, fromStatus: 'Pending', toStatus: 'Approved', changedBy: approverId, remarks },
    });
    return { blocked: false, request: updated };
  });
}

// FR-ET-002 — Reject
async function rejectTransfer(id, approverId, reason) {
  const request = await prisma.transferRequest.findUnique({ where: { id } });
  if (!request) throw Object.assign(new Error('Transfer request not found'), { status: 404 });
  if (request.currentStatus !== 'Pending') {
    throw Object.assign(new Error('Only Pending transfers can be rejected'), { status: 409 });
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.transferRequest.update({
      where: { id },
      data: { currentStatus: 'Rejected', approvedBy: approverId, rejectionReason: reason },
    });
    await tx.transferStateHistory.create({
      data: { transferRequestId: id, fromStatus: 'Pending', toStatus: 'Rejected', changedBy: approverId, remarks: reason },
    });
    return updated;
  });
}

// FR-ET-005 — Pre-Departure Inspection (required before dispatch)
async function createInspectionRecord(transferId, type, data, inspectorId) {
  return prisma.transferInspection.create({
    data: {
      transferRequestId: transferId,
      inspectionType: type,
      inspectionDate: new Date(),
      inspectedBy: inspectorId,
      tyreCondition: data.tyreCondition,
      lightsOperational: data.lightsOperational,
      fluidLevelsChecked: data.fluidLevelsChecked,
      bodyDamageNoted: !!data.bodyDamageNoted,
      bodyDamageDescription: data.bodyDamageDescription ?? null,
      fuelLevelPercent: data.fuelLevelPercent ?? null,
      meterReadingHours: data.meterReadingHours ?? null,
      meterReadingKm: data.meterReadingKm ?? null,
      overallCondition: data.overallCondition,
      photosAttached: !!data.photosAttached,
      generalRemarks: data.generalRemarks ?? null,
    },
  });
}

// FR-ET-004 — Dispatch (moves to Dispatched). Requires a completed Pre-Departure inspection.
async function dispatchTransfer(id, gatePassData, userId) {
  const request = await prisma.transferRequest.findUnique({ where: { id } });
  if (!request) throw Object.assign(new Error('Transfer request not found'), { status: 404 });
  if (request.currentStatus !== 'Approved') {
    throw Object.assign(new Error('Only Approved transfers can be dispatched'), { status: 409 });
  }
  const preDeparture = await prisma.transferInspection.findFirst({
    where: { transferRequestId: id, inspectionType: 'Pre-Departure' },
  });
  if (!preDeparture) {
    throw Object.assign(new Error('Pre-Departure Inspection must be completed before dispatch (FR-ET-005)'), { status: 409 });
  }
  if (!preDeparture.photosAttached) {
    throw Object.assign(new Error('Pre-Departure Inspection requires at least one photograph (FR-ET-005)'), { status: 422 });
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.transferRequest.update({
      where: { id },
      data: {
        currentStatus: 'Dispatched',
        gatePassNumber: gatePassData.gatePassNumber,
        departureDate: new Date(),
        driverId: gatePassData.driverId ?? request.driverId,
        transporterCompany: gatePassData.transporterCompany ?? null,
        transporterVehiclePlate: gatePassData.transporterVehiclePlate ?? null,
        transporterDriverName: gatePassData.transporterDriverName ?? null,
        waybillNumber: gatePassData.waybillNumber ?? null,
      },
    });
    await tx.asset.update({ where: { id: request.assetId }, data: { currentStatus: 'In Transit' } });
    await tx.transferStateHistory.create({
      data: { transferRequestId: id, fromStatus: 'Approved', toStatus: 'Dispatched', changedBy: userId },
    });
    return updated;
  });
}

// FR-ET-006 — Arrival Confirmation and Post-Arrival Inspection. Flags transit damage
// if condition worsened, updates the asset's site assignment.
async function confirmArrival(id, receiverId, postInspectionData) {
  const request = await prisma.transferRequest.findUnique({ where: { id } });
  if (!request) throw Object.assign(new Error('Transfer request not found'), { status: 404 });
  if (!['Dispatched', 'In Transit'].includes(request.currentStatus)) {
    throw Object.assign(new Error('Only Dispatched/In Transit transfers can be marked arrived'), { status: 409 });
  }

  return prisma.$transaction(async (tx) => {
    const postInspection = await tx.transferInspection.create({
      data: {
        transferRequestId: id,
        inspectionType: 'Post-Arrival',
        inspectionDate: new Date(),
        inspectedBy: receiverId,
        tyreCondition: postInspectionData.tyreCondition,
        lightsOperational: postInspectionData.lightsOperational,
        fluidLevelsChecked: postInspectionData.fluidLevelsChecked,
        bodyDamageNoted: !!postInspectionData.bodyDamageNoted,
        bodyDamageDescription: postInspectionData.bodyDamageDescription ?? null,
        overallCondition: postInspectionData.overallCondition,
        photosAttached: !!postInspectionData.photosAttached,
        generalRemarks: postInspectionData.generalRemarks ?? null,
      },
    });

    const preDeparture = await tx.transferInspection.findFirst({
      where: { transferRequestId: id, inspectionType: 'Pre-Departure' },
    });
    const conditionRank = { Excellent: 4, Good: 3, Fair: 2, Poor: 1 };
    const transitDamage =
      preDeparture &&
      (postInspection.bodyDamageNoted ||
        (conditionRank[postInspection.overallCondition] ?? 0) < (conditionRank[preDeparture.overallCondition] ?? 0));

    const updated = await tx.transferRequest.update({
      where: { id },
      data: { currentStatus: 'Completed', arrivalDate: new Date() },
    });

    if (request.destinationProjectId) {
      await tx.asset.update({ where: { id: request.assetId }, data: { currentProjectId: request.destinationProjectId, currentStatus: 'Idle' } });
      await tx.assetSiteAssignment.updateMany({
        where: { assetId: request.assetId, assignedTo: null },
        data: { assignedTo: new Date() },
      });
      await tx.assetSiteAssignment.create({
        data: { assetId: request.assetId, projectId: request.destinationProjectId, assignedFrom: new Date(), assignedBy: receiverId },
      });
    } else {
      await tx.asset.update({ where: { id: request.assetId }, data: { currentStatus: 'Idle' } });
    }

    await tx.transferStateHistory.create({
      data: { transferRequestId: id, fromStatus: request.currentStatus, toStatus: 'Completed', changedBy: receiverId },
    });

    return { transfer: updated, postInspection, transitDamageFlagged: !!transitDamage };
  });
}

// FR-ET-008 — Transfer History View
async function getTransferHistory(assetId) {
  return prisma.transferRequest.findMany({
    where: { assetId },
    include: {
      transferStateHistoryTransferRequestIdList: { orderBy: { changedAt: 'asc' } },
      transferInspectionTransferRequestIdList: true,
    },
    orderBy: { requestedAt: 'desc' },
  });
}

async function getApprovalQueue() {
  return prisma.transferRequest.findMany({
    where: { currentStatus: 'Pending' },
    include: { asset: true, requestedByEmployee: true },
    orderBy: { requestedAt: 'asc' },
  });
}

module.exports = {
  submitTransferRequest,
  checkComplianceForTransfer,
  approveTransfer,
  rejectTransfer,
  createInspectionRecord,
  dispatchTransfer,
  confirmArrival,
  getTransferHistory,
  getApprovalQueue,
};
