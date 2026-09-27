// backend/src/lib/projectScope.js
const prisma = require('./prisma');

const GLOBAL_ROLES = ['SYS_ADMIN', 'EXEC', 'FINANCE'];

async function getScopedProjectIds(employeeId, role) {
  if (GLOBAL_ROLES.includes(role)) return null;
  const assignments = await prisma.employeeProjectAssignment.findMany({
    where: { employeeId, assignedTo: null },
    select: { projectId: true },
  });
  return assignments.map((a) => a.projectId);
}

async function getPrimaryProject(employeeId, role) {
  if (GLOBAL_ROLES.includes(role)) return null;
  const assignment = await prisma.employeeProjectAssignment.findFirst({
    where: { employeeId, assignedTo: null, isPrimary: true },
    select: {
      project: {
        select: {
          id: true, projectCode: true, projectName: true,
          clientName: true, sector: true, city: true,
          country: true, projectStatus: true,
          startDate: true, plannedCompletionDate: true,
        },
      },
    },
  });
  if (assignment) return assignment.project;

  // fallback to first active assignment if no isPrimary row
  const fallback = await prisma.employeeProjectAssignment.findFirst({
    where: { employeeId, assignedTo: null },
    select: {
      project: {
        select: {
          id: true, projectCode: true, projectName: true,
          clientName: true, sector: true, city: true,
          country: true, projectStatus: true,
          startDate: true, plannedCompletionDate: true,
        },
      },
    },
  });
  return fallback?.project ?? null;
}

module.exports = { getScopedProjectIds, getPrimaryProject, GLOBAL_ROLES };