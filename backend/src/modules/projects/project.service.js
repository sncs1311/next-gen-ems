const prisma = require('../../lib/prisma');

const VALID_STATUSES = ['Mobilization', 'Active', 'On Hold', 'Demobilization', 'Completed'];

async function generateProjectCode(tx, countryCode) {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${countryCode.toUpperCase()}-${year}-`;
  const latest = await tx.project.findFirst({
    where: { projectCode: { startsWith: prefix } },
    orderBy: { projectCode: 'desc' },
    select: { projectCode: true },
  });
  const nextSeq = latest ? parseInt(latest.projectCode.slice(-3), 10) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

// FR-PS-001 — Project Registration
async function createProject(data) {
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const projectCode = await generateProjectCode(tx, data.country);
        return tx.project.create({
          data: {
            projectCode,
            projectName: data.projectName,
            clientName: data.clientName,
            sector: data.sector,
            city: data.city,
            country: data.country,
            siteGpsLat: data.siteGpsLat ?? null,
            siteGpsLng: data.siteGpsLng ?? null,
            startDate: data.startDate,
            plannedCompletionDate: data.plannedCompletionDate,
            projectManagerId: data.projectManagerId,
          },
        });
      });
    } catch (err) {
      if (err.code === 'P2002' && attempt < MAX_ATTEMPTS - 1) continue;
      throw err;
    }
  }
}

// FR-PS-002 — Site Engineer Assignment to Project
async function assignSiteEngineer(projectId, employeeId) {
  return prisma.projectSiteEngineerAssignment.create({
    data: { projectId, employeeId, assignedFrom: new Date() },
  });
}

async function unassignSiteEngineer(assignmentId) {
  return prisma.projectSiteEngineerAssignment.update({
    where: { id: assignmentId },
    data: { assignedTo: new Date() },
  });
}

// FR-PS-003 — Project Equipment Summary
async function getProjectEquipmentSummary(projectId) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });

  const assets = await prisma.asset.findMany({
    where: { currentProjectId: projectId, isArchived: false },
    include: { subType: { include: { category: true } } },
  });

  const assetCountByCategory = {};
  for (const a of assets) {
    const cat = a.subType.category.categoryName;
    assetCountByCategory[cat] = (assetCountByCategory[cat] || 0) + 1;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const assetIds = assets.map((a) => a.id);

  const [fuelThisMonth, incidentCount] = await Promise.all([
    prisma.fuelLog.aggregate({
      where: { projectId, loggedAt: { gte: startOfMonth } },
      _sum: { quantityLiters: true },
    }),
    prisma.incidentReport.count({ where: { projectId } }),
  ]);

  return {
    project,
    assetCount: assets.length,
    assetCountByCategory,
    assets,
    fuelConsumedThisMonthLiters: fuelThisMonth._sum.quantityLiters ?? 0,
    incidentCount,
  };
}

// FR-PS-004 — Project Status Management. Completing a project requires that no assets
// remain actively assigned to it (transferred out or returned to yard); otherwise a
// list of remaining assets is returned so the caller can confirm the warning.
async function updateProjectStatus(projectId, newStatus, confirmedByFleetManager = false) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw Object.assign(new Error('Invalid project status'), { status: 422 });
  }
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });

  if (newStatus === 'Completed') {
    const remainingAssets = await prisma.asset.findMany({
      where: { currentProjectId: projectId, isArchived: false },
      select: { id: true, assetNumber: true, make: true, model: true },
    });
    if (remainingAssets.length > 0 && !confirmedByFleetManager) {
      return {
        blocked: true,
        reason: 'Assets are still assigned to this project. Confirm to proceed anyway.',
        remainingAssets,
      };
    }
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      projectStatus: newStatus,
      actualCompletionDate: newStatus === 'Completed' ? new Date() : project.actualCompletionDate,
    },
  });
  return { blocked: false, project: updated };
}

async function searchProjects(filters) {
  const { status, country, q, page = 1, pageSize = 25 } = filters;
  const where = {
    isArchived: false,
    ...(status && { projectStatus: status }),
    ...(country && { country }),
    ...(q && {
      OR: [
        { projectCode: { contains: q, mode: 'insensitive' } },
        { projectName: { contains: q, mode: 'insensitive' } },
        { clientName: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };
  const [total, results] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include: { projectManager: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { total, page: Number(page), pageSize: Number(pageSize), results };
}

module.exports = {
  createProject,
  assignSiteEngineer,
  unassignSiteEngineer,
  getProjectEquipmentSummary,
  updateProjectStatus,
  searchProjects,
  VALID_STATUSES,
};
