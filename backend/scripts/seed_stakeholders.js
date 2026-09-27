/**
 * backend/scripts/seed_stakeholders.js
 *
 * Creates 75 stakeholder login accounts spread across every role in the system,
 * so you have realistic test users for each dashboard/permission set instead of
 * just the one System Admin account from npm run seed.
 *
 * Usage:
 *   cd backend
 *   node scripts/seed_stakeholders.js
 *
 * Writes credentials to: stakeholder_credentials.txt (in backend/, gitignored —
 * do NOT commit this file or share it outside your team).
 *
 * All accounts share ONE password (set below) for simplicity during testing/demo.
 * Change SHARED_PASSWORD if you want something else. Passwords are hashed with
 * bcrypt cost 12, matching the convention already used elsewhere in this project
 * (see README: "bcrypt (cost 12)").
 *
 * Safe to re-run — uses ON CONFLICT-equivalent (Prisma upsert on email) so
 * re-running won't create duplicates.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SHARED_PASSWORD = 'Demo@12345';
const EMAIL_DOMAIN = 'fleet.local';

// Role distribution across 75 accounts — weighted roughly toward the roles
// with the most day-to-day users (Site Engineer, Mechanic) per the SRS's
// module-to-role mapping (section 2.x).
const ROLE_PLAN = [
  { code: 'FLEET_MGR', count: 6,  jobTitle: 'Fleet Manager',        codePrefix: 'FLM' },
  { code: 'SITE_ENG',  count: 15, jobTitle: 'Site Engineer',        codePrefix: 'SEN' },
  { code: 'MECH',      count: 15, jobTitle: 'Workshop Mechanic',    codePrefix: 'MEC' },
  { code: 'MECH_SUP',  count: 6,  jobTitle: 'Workshop Supervisor',  codePrefix: 'MSP' },
  { code: 'HSE',       count: 6,  jobTitle: 'HSE Officer',          codePrefix: 'HSE' },
  { code: 'FINANCE',   count: 6,  jobTitle: 'Finance Analyst',      codePrefix: 'FIN' },
  { code: 'EXEC',      count: 4,  jobTitle: 'Executive',            codePrefix: 'EXE' },
  { code: 'PM',        count: 10, jobTitle: 'Project Manager',      codePrefix: 'PRM' },
  { code: 'SYS_ADMIN', count: 7,  jobTitle: 'System Administrator', codePrefix: 'SYS' },
];
// Total: 6+15+15+6+6+6+4+10+7 = 75
// NOTE: codePrefix is explicit per role (not auto-sliced from role code) because
// MECH and MECH_SUP both start with "MEC" — auto-slicing caused duplicate
// employeeCode values, which violates the @unique constraint on that field.

const FIRST_NAMES = [
  'Ahmed','Mohammed','Sara','Fatima','Omar','Layla','Khalid','Noura','Yousef','Mariam',
  'Rashid','Aisha','Hassan','Huda','Tariq','Salma','Faisal','Reem','Bilal','Dana',
  'Karim','Lina','Adel','Nadia','Sami',
];
const LAST_NAMES = [
  'Al-Sayed','Al-Rashid','Hussain','Al-Farsi','Al-Mansour','Qureshi','Al-Amin','Nasser',
  'Al-Khouri','Al-Sabah','Malik','Al-Zahrani','Hamdan','Al-Otaibi','Farooq',
];
const NATIONALITIES = ['Qatari','Indian','Pakistani','Egyptian','Jordanian','Lebanese','Filipino','Emirati'];

function pick(arr, i) { return arr[i % arr.length]; }
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '.'); }

async function main() {
  console.log('=== Seeding 75 stakeholder accounts ===\n');

  const passwordHash = bcrypt.hashSync(SHARED_PASSWORD, 12);

  // Fetch Role table so we can map roleCode -> roleId
  const roles = await prisma.role.findMany();
  const roleByCode = Object.fromEntries(roles.map((r) => [r.roleCode, r.id]));

  const missing = ROLE_PLAN.filter((p) => !roleByCode[p.code]);
  if (missing.length) {
    console.error('ERROR: these role codes are not in the Role table:', missing.map((m) => m.code));
    console.error('Run npm run seed first to seed the Role table, then retry.');
    process.exit(1);
  }

  const created = [];
  let globalIdx = 0;

  for (const plan of ROLE_PLAN) {
    for (let i = 0; i < plan.count; i++) {
      globalIdx++;
      const firstName = pick(FIRST_NAMES, globalIdx);
      const lastName = pick(LAST_NAMES, globalIdx + i);
      const fullName = `${firstName} ${lastName}`;
      const nationality = pick(NATIONALITIES, globalIdx);
      const roleSlug = plan.code.toLowerCase().replace('_', '');
      const email = `${roleSlug}${i + 1}@${EMAIL_DOMAIN}`;
      const employeeCode = `EMP-${plan.codePrefix}-${String(i + 1).padStart(3, '0')}`;

      const employee = await prisma.employee.upsert({
        where: { email },
        update: {}, // don't overwrite if already exists — script is idempotent
        create: {
          employeeCode,
          roleId: roleByCode[plan.code],
          fullName,
          nationality,
          jobTitle: plan.jobTitle,
          department: plan.jobTitle,
          email,
          passwordHash,
          isActive: true,
        },
      });

      created.push({
        role: plan.code,
        jobTitle: plan.jobTitle,
        fullName,
        email,
        password: SHARED_PASSWORD,
        employeeCode: employee.employeeCode,
      });
    }
    console.log(`  Created ${plan.count} × ${plan.jobTitle} (${plan.code})`);
  }

  // ── Write credentials file ────────────────────────────────────────────────
  const outPath = path.join(__dirname, '..', 'stakeholder_credentials.txt');
  const lines = [
    '=== EMS Stakeholder Test Accounts ===',
    `Generated: ${new Date().toISOString()}`,
    `Shared password for ALL accounts below: ${SHARED_PASSWORD}`,
    '',
    'DO NOT commit this file or share it outside your team.',
    '',
  ];

  let currentRole = null;
  for (const acc of created) {
    if (acc.role !== currentRole) {
      currentRole = acc.role;
      lines.push(`\n--- ${acc.jobTitle} (${acc.role}) ---`);
    }
    lines.push(`${acc.email}  |  ${acc.password}  |  ${acc.fullName}  |  ${acc.employeeCode}`);
  }

  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

  console.log(`\n=== Done: ${created.length} accounts created ===`);
  console.log(`Credentials written to: ${outPath}`);
  console.log('Add "stakeholder_credentials.txt" to .gitignore if it is not already there.');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});