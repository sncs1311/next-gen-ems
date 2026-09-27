// backend/src/middleware/projectScope.js
const prisma = require('../lib/prisma');

const GLOBAL_ROLES = ['SYS_ADMIN', 'EXEC', 'FINANCE'];

async function loadProjectScope(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    if (GLOBAL_ROLES.includes(req.user.role)) {
      req.scope = { isGlobal: true, projectIds: null, primaryProjectId: null };
      return next();
    }

    const assignments = await prisma.employeeProjectAssignment.findMany({
      where: { employeeId: req.user.id, assignedTo: null },
      select: { projectId: true, isPrimary: true },
    });

    req.scope = {
      isGlobal: false,
      projectIds: assignments.map((a) => a.projectId),
      primaryProjectId:
        assignments.find((a) => a.isPrimary)?.projectId ??
        assignments[0]?.projectId ??
        null,
    };

    next();
  } catch (err) {
    next(err);
  }
}

function scopeWhere(scope, projectField = 'currentProjectId') {
  if (!scope || scope.isGlobal) return {};
  return { [projectField]: { in: scope.projectIds } };
}

function isInScope(scope, recordProjectId) {
  if (!scope || scope.isGlobal) return true;
  if (!recordProjectId) return false;
  return scope.projectIds.includes(recordProjectId);
}

module.exports = { loadProjectScope, scopeWhere, isInScope, GLOBAL_ROLES };