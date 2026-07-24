const prisma = require('../../lib/prisma');
const { ROLES } = require('../../config/roles');

// FR-AR-006 — valid statuses and enforced transitions
const VALID_STATUSES = ['Active', 'Under Maintenance', 'Idle', 'In Transit', 'Decommissioned', 'Written Off'];

const BLOCKED_TRANSITIONS = {
  // "cannot move to In Transit while Under Maintenance" — FR-AR-006 / FR-MM-011
  'Under Maintenance->In Transit': 'Asset is Under Maintenance and cannot be dispatched (FR-AR-006 / FR-MM-011).',
};

// Roles permitted to see financial fields — NFR-SEC-004
const FINANCIAL_ROLES = new Set([ROLES.FLEET_MGR, ROLES.FINANCE, ROLES.EXEC, ROLES.SYS_ADMIN]);

async function generateAssetNumber(tx) {
  const year = new Date().getFullYear();
  const prefix = `EQ-${year}-`;
  const latest = await tx.asset.findFirst({
    where: { assetNumber: { startsWith: prefix } },
    orderBy: { assetNumber: 'desc' },
    select: { assetNumber: true },
  });
  const nextSeq = latest ? parseInt(latest.assetNumber.slice(-4), 10) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// FR-AR-001 — Asset Registration. Duplicate asset numbers are prevented by the
// unique constraint + retry loop below (handles concurrent creation races).
async function createAsset(data, userId) {
  const subType = await prisma.assetSubType.findUnique({ where: { id: data.subTypeId } });
  if (!subType) {
    throw Object.assign(new Error('Invalid subTypeId'), { status: 422 });
  }

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const assetNumber = await generateAssetNumber(tx);
        return tx.asset.create({
          data: {
            assetNumber,
            subTypeId: data.subTypeId,
            make: data.make,
            model: data.model,
            yearOfManufacture: data.yearOfManufacture,
            ownershipType: data.ownershipType,
            currentStatus: 'Idle',
            color: data.color ?? null,
            notes: data.notes ?? null,
            createdBy: userId,
          },
          include: { subType: { include: { category: true } } },
        });
      });
    } catch (err) {
      if (err.code === 'P2002' && attempt < MAX_ATTEMPTS - 1) continue; // asset number race — retry
      throw err;
    }
  }
}

// FR-AR-007 — Search and Filter Asset List
async function searchAssets(filters) {
  const { status, categoryId, subTypeId, siteId, ownershipType, q, page = 1, pageSize = 25 } = filters;

  const where = {
    isArchived: false,
    ...(status && { currentStatus: status }),
    ...(subTypeId && { subTypeId }),
    ...(ownershipType && { ownershipType }),
    ...(siteId && { currentProjectId: siteId }),
    ...(categoryId && { subType: { categoryId } }),
    ...(q && {
      OR: [
        { assetNumber: { contains: q, mode: 'insensitive' } },
        { make: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, results] = await prisma.$transaction([
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where,
      include: { subType: { include: { category: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { total, page: Number(page), pageSize: Number(pageSize), results };
}

// NFR-SEC-004 — financial fields returned only to Fleet Manager / Finance / Executive / Admin.
// Omitted entirely from the payload for other roles, not just hidden on the front end.
function stripFinancialFields(asset) {
  const { purchaseRecordAssetId, assetInsuranceCoverageAssetIdList, ...rest } = asset;
  return rest;
}

// FR-AR-008 — Asset Detail View
async function getAssetById(id, role) {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      subType: { include: { category: true } },
      engineSpecificationAssetId: true,
      gulfRegistrationAssetId: true,
      purchaseRecordAssetId: true,
      assetInsuranceCoverageAssetIdList: { include: { policy: true } },
      equipmentCertificationAssetIdList: { where: { isCurrent: true } },
      currentProject: true,
      currentOperator: true,
    },
  });
  if (!asset || asset.isArchived) {
    throw Object.assign(new Error('Asset not found'), { status: 404 });
  }
  if (!FINANCIAL_ROLES.has(role)) {
    return stripFinancialFields(asset);
  }
  return asset;
}

// FR-AR-006 — Asset Status Management with transition rules.
// NFR-RC-002: lifting equipment cannot go Active without a valid, unexpired certification —
// this is a hard block with no override, enforced here rather than only at the UI layer.
async function updateAssetStatus(id, newStatus, userId) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw Object.assign(new Error('Invalid status'), { status: 422 });
  }
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { subType: true, equipmentCertificationAssetIdList: true },
  });
  if (!asset) throw Object.assign(new Error('Asset not found'), { status: 404 });

  const key = `${asset.currentStatus}->${newStatus}`;
  if (BLOCKED_TRANSITIONS[key]) {
    throw Object.assign(new Error(BLOCKED_TRANSITIONS[key]), { status: 409 });
  }

  if (newStatus === 'Active' && asset.subType.requiresCertification) {
    const hasValidCert = asset.equipmentCertificationAssetIdList.some(
      (cert) => cert.isCurrent && cert.expiryDate > new Date()
    );
    if (!hasValidCert) {
      throw Object.assign(
        new Error('Lifting equipment requires a valid, unexpired certification before it can be set Active (NFR-RC-002). No override permitted.'),
        { status: 409 }
      );
    }
  }

  return prisma.asset.update({ where: { id }, data: { currentStatus: newStatus } });
}

module.exports = { createAsset, searchAssets, getAssetById, updateAssetStatus, VALID_STATUSES };
