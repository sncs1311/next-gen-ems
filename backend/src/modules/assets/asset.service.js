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
//
// ADDED — project-scoping: `scopedProjectId` is the creating user's primary
// project (null for global roles). When present, the new asset is
// automatically assigned to that project via currentProjectId — a scoped
// user (e.g. a Site Engineer) can't accidentally (or otherwise) register an
// asset into a different site than their own. Global roles/callers may still
// pass an explicit `data.currentProjectId` if they need to register directly
// into a specific project.
async function createAsset(data, userId, scopedProjectId = null) {
  const subType = await prisma.assetSubType.findUnique({ where: { id: data.subTypeId } });
  if (!subType) {
    throw Object.assign(new Error('Invalid subTypeId'), { status: 422 });
  }

  const currentProjectId = scopedProjectId ?? data.currentProjectId ?? null;

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
            currentProjectId,
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
//
// ADDED — project-scoping: `scopedProjectIds` is either null (global role,
// no filter applied) or an array of project ids (possibly empty) the calling
// user is assigned to. When non-null, results are restricted to assets whose
// currentProjectId is in that list, regardless of any `siteId` filter the
// caller also passed — a scoped user cannot widen their own visibility by
// passing a different siteId in the query string.
async function searchAssets(filters, scopedProjectIds = null) {
  const { status, categoryId, subTypeId, siteId, ownershipType, q } = filters;
  const page = parseInt(filters.page, 10) || 1;
  const pageSize = parseInt(filters.pageSize, 10) || 25;

  // Resolve the effective project filter: scoping wins over the requested
  // siteId. If scoped and siteId was requested but isn't in the user's
  // allowed set, that's just an empty result (not an error) — simplest and
  // safest default.
  let projectFilter;
  if (scopedProjectIds !== null) {
    if (siteId && scopedProjectIds.includes(siteId)) {
      projectFilter = siteId;
    } else if (siteId) {
      projectFilter = { in: [] }; // requested a site outside their scope -> no results
    } else {
      projectFilter = { in: scopedProjectIds };
    }
  } else if (siteId) {
    projectFilter = siteId;
  }

  const where = {
    isArchived: false,
    ...(status && { currentStatus: status }),
    ...(subTypeId && { subTypeId }),
    ...(ownershipType && { ownershipType }),
    ...(projectFilter !== undefined && { currentProjectId: projectFilter }),
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

// ADDED — asset lookup by human-readable assetNumber (e.g. "EQ-2025-0025")
// instead of the internal UUID. This is what the asset detail page's route
// should use now instead of /assets/[id] — nobody should ever need to know
// or see an asset's UUID. Same include shape and financial-field stripping
// as getAssetById above, just a different lookup key.
async function getAssetByNumber(assetNumber, role) {
  const asset = await prisma.asset.findUnique({
    where: { assetNumber },
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

// ADDED — category browsing. Lists AssetCategory rows with a live count of
// non-archived assets in each, so the frontend can render category cards
// (e.g. "Heavy Earthmoving & Construction Equipment — 84 assets") without a
// separate count query per card. Respects project-scoping the same way
// searchAssets does: scopedProjectIds null = no filter (global roles),
// otherwise counts only assets in the user's project(s).
async function getCategoriesWithCounts(scopedProjectIds = null) {
  const categories = await prisma.assetCategory.findMany({
    where: { isActive: true },
    orderBy: { categoryName: 'asc' },
  });

  const counts = await Promise.all(
    categories.map((c) =>
      prisma.asset.count({
        where: {
          isArchived: false,
          subType: { categoryId: c.id },
          ...(scopedProjectIds !== null && { currentProjectId: { in: scopedProjectIds } }),
        },
      })
    )
  );

  return categories.map((c, i) => ({ ...c, assetCount: counts[i] }));
}

module.exports = { createAsset, searchAssets, getAssetById, getAssetByNumber, getCategoriesWithCounts, updateAssetStatus, VALID_STATUSES };