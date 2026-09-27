/**
 * backend/scripts/seed_employee_project_assignments.js
 *
 * Assigns the stakeholder accounts (from seed_stakeholders.js) to projects,
 * so project-scoping actually has data to work with. Without this, every
 * non-global role sees zero assets/drivers/etc — EmployeeProjectAssignment
 * starts empty.
 *
 * Assignment logic:
 *   - SYS_ADMIN, EXEC: no assignment (global roles, by design)
 *   - FLEET_MGR: assigned to 2-3 projects (oversees multiple sites), first one isPrimary
 *   - Everyone else (SITE_ENG, MECH, MECH_SUP, HSE, FINANCE, PM): assigned to
 *     exactly 1 project, isPrimary=true. Distributed round-robin across all
 *     projects so every site has coverage.
 *
 * Usage:
 *   cd backend
 *   node scripts/seed_employee_project_assignments.js
 *
 * Safe to re-run — checks for an existing active assignment per employee
 * before creating a new one.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GLOBAL_ROLES = new Set(['SYS_ADMIN', 'EXEC']);
const MULTI_SITE_ROLES = new Set(['FLEET_MGR']);

async function main() {
  console.log('=== Assigning stakeholders to projects ===\n');

  const projects = await prisma.project.findMany({
    where: { isArchived: false },
    select: { id: true, projectCode: true },
    orderBy: { projectCode: 'asc' },
  });
  if (projects.length === 0) {
    console.error('ERROR: No projects found. Run seed_synthetic.py first.');
    process.exit(1);
  }
  console.log(`Found ${projects.length} projects to assign across.\n`);

  // Only touch employees from the stakeholder seed (job titles match
  // seed_stakeholders.js's ROLE_PLAN) — skips the original single admin
  // account from npm run seed, which stays untouched.
  const employees = await prisma.employee.findMany({
    where: { email: { endsWith: '@fleet.local' }, isActive: true },
    include: { role: true },
    orderBy: { employeeCode: 'asc' },
  });
  console.log(`Found ${employees.length} stakeholder accounts.\n`);

  let assignedCount = 0;
  let skippedGlobal = 0;
  let roundRobinIdx = 0;

  for (const emp of employees) {
    const roleCode = emp.role.roleCode;

    if (GLOBAL_ROLES.has(roleCode)) {
      skippedGlobal++;
      continue;
    }

    // Skip if already has an active assignment (idempotent re-run)
    const existing = await prisma.employeeProjectAssignment.findFirst({
      where: { employeeId: emp.id, assignedTo: null },
    });
    if (existing) continue;

    if (MULTI_SITE_ROLES.has(roleCode)) {
      // Fleet Manager: 2-3 projects, first is primary
      const count = Math.min(3, projects.length);
      for (let i = 0; i < count; i++) {
        const proj = projects[(roundRobinIdx + i) % projects.length];
        await prisma.employeeProjectAssignment.create({
          data: {
            employeeId: emp.id,
            projectId: proj.id,
            isPrimary: i === 0,
          },
        });
      }
      roundRobinIdx += count;
    } else {
      // Single-project roles: round-robin across all projects for even coverage
      const proj = projects[roundRobinIdx % projects.length];
      await prisma.employeeProjectAssignment.create({
        data: {
          employeeId: emp.id,
          projectId: proj.id,
          isPrimary: true,
        },
      });
      roundRobinIdx++;
    }

    assignedCount++;
    if (assignedCount % 20 === 0) console.log(`  ...${assignedCount} employees assigned`);
  }

  console.log(`\n=== Done ===`);
  console.log(`Assigned: ${assignedCount}`);
  console.log(`Skipped (global roles — SYS_ADMIN/EXEC): ${skippedGlobal}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});