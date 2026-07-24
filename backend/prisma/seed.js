const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Source: data_dictionary-DRIVERPEOPLE.txt, Table 1: Role — "VALID ROLE CODES AND PERMISSIONS SUMMARY"
const ROLES = [
  { roleCode: 'EXEC', roleName: 'Executive', description: 'Read-only: executive dashboard, KPIs, cost reports' },
  { roleCode: 'FLEET_MGR', roleName: 'Fleet Manager', description: 'Full access to all modules except system admin' },
  { roleCode: 'SITE_ENG', roleName: 'Site Engineer', description: 'Fuel entry, breakdown reports, transfer requests, incidents' },
  { roleCode: 'PM', roleName: 'Project Manager', description: 'View project summary, submit transfers, set fuel forecast intensity' },
  { roleCode: 'MECH', roleName: 'Workshop Mechanic', description: 'Create and update job cards, log parts and labor' },
  { roleCode: 'MECH_SUP', roleName: 'Workshop Supervisor', description: 'All mechanic actions plus close job cards, record warranties' },
  { roleCode: 'HSE', roleName: 'HSE Officer', description: 'Incident investigation, root cause, closure' },
  { roleCode: 'FINANCE', roleName: 'Finance User', description: 'View purchase records, insurance, TCO reports only' },
  { roleCode: 'SYS_ADMIN', roleName: 'System Admin', description: 'User management, config, lookup tables, audit log' },
  // ADDED — see src/config/roles.js for why. Non-login role for driver/operator identity records.
  { roleCode: 'DRIVER', roleName: 'Driver / Operator', description: 'Field personnel — no EMS login, record-keeping only' },
];

// Source: data_dictionary-ASSETMASTER.txt, Table 1: AssetCategory — "VALID CATEGORY CODES"
const CATEGORIES = [
  { categoryCode: 'EV', categoryName: 'Executive & Light Commercial Vehicles' },
  { categoryCode: 'PT', categoryName: 'Personnel Transport' },
  { categoryCode: 'HE', categoryName: 'Heavy Earthmoving & Construction Equipment' },
  { categoryCode: 'LH', categoryName: 'Lifting & Heavy Shifting Equipment' },
  { categoryCode: 'SA', categoryName: 'Static Auxiliary & Power Generation Assets' },
];

// Source: data_dictionary-ASSETMASTER.txt, Table 2: AssetSubType — "SAMPLE SUB-TYPE CODES"
// requiresCertification / requiresGulfRegistration follow FR-AR-013 (lifting equipment)
// and FR-AR-003 (road-going categories EV/PT) respectively.
const SUB_TYPES = [
  { subTypeCode: 'SUV', subTypeName: 'SUV / Station Wagon', category: 'EV', gulfReg: true },
  { subTypeCode: 'PCKU', subTypeName: 'Pickup Truck', category: 'EV', gulfReg: true },
  { subTypeCode: 'SDAN', subTypeName: 'Sedan', category: 'EV', gulfReg: true },
  { subTypeCode: 'PBUS', subTypeName: 'Personnel Bus', category: 'PT', gulfReg: true },
  { subTypeCode: 'MBUS', subTypeName: 'Mini Bus', category: 'PT', gulfReg: true },
  { subTypeCode: 'VAN', subTypeName: 'Van', category: 'PT', gulfReg: true },
  { subTypeCode: 'CEXC', subTypeName: 'Crawler Excavator', category: 'HE', gulfReg: false },
  { subTypeCode: 'DUMP', subTypeName: 'Dump Truck / Tipper', category: 'HE', gulfReg: true },
  { subTypeCode: 'BKHL', subTypeName: 'Backhoe Loader', category: 'HE', gulfReg: false },
  { subTypeCode: 'WLDR', subTypeName: 'Wheel Loader', category: 'HE', gulfReg: false },
  { subTypeCode: 'BULL', subTypeName: 'Bulldozer', category: 'HE', gulfReg: false },
  { subTypeCode: 'COMP', subTypeName: 'Soil Compactor', category: 'HE', gulfReg: false },
  { subTypeCode: 'CCRN', subTypeName: 'Crawler Crane', category: 'LH', gulfReg: false, cert: true },
  { subTypeCode: 'RTCR', subTypeName: 'Rough Terrain Crane', category: 'LH', gulfReg: false, cert: true },
  { subTypeCode: 'ATCR', subTypeName: 'All Terrain Crane', category: 'LH', gulfReg: true, cert: true },
  { subTypeCode: 'THND', subTypeName: 'Telehandler', category: 'LH', gulfReg: false, cert: true },
  { subTypeCode: 'FKLT', subTypeName: 'Forklift', category: 'LH', gulfReg: false, cert: true },
  { subTypeCode: 'BLFT', subTypeName: 'Boom Lift', category: 'LH', gulfReg: false, cert: true },
  { subTypeCode: 'TPLF', subTypeName: 'Telescopic Work Platform', category: 'LH', gulfReg: false, cert: true },
  { subTypeCode: 'GNST', subTypeName: 'Generator Set', category: 'SA', gulfReg: false },
  { subTypeCode: 'AIRC', subTypeName: 'Air Compressor', category: 'SA', gulfReg: false },
  { subTypeCode: 'WELD', subTypeName: 'Welding Machine', category: 'SA', gulfReg: false },
  { subTypeCode: 'LTWR', subTypeName: 'Light Tower', category: 'SA', gulfReg: false },
  { subTypeCode: 'PUMP', subTypeName: 'Water Pump', category: 'SA', gulfReg: false },
];

async function main() {
  console.log('Seeding roles...');
  for (const r of ROLES) {
    await prisma.role.upsert({
      where: { roleCode: r.roleCode },
      update: {},
      create: r,
    });
  }

  console.log('Seeding asset categories...');
  const categoryIds = {};
  for (const c of CATEGORIES) {
    const row = await prisma.assetCategory.upsert({
      where: { categoryCode: c.categoryCode },
      update: {},
      create: c,
    });
    categoryIds[c.categoryCode] = row.id;
  }

  console.log('Seeding asset sub-types...');
  for (const s of SUB_TYPES) {
    await prisma.assetSubType.upsert({
      where: { subTypeCode: s.subTypeCode },
      update: {},
      create: {
        subTypeCode: s.subTypeCode,
        subTypeName: s.subTypeName,
        categoryId: categoryIds[s.category],
        requiresCertification: !!s.cert,
        requiresGulfRegistration: !!s.gulfReg,
      },
    });
  }

  // One System Admin account so there's a way to log in on a fresh database.
  // Password is intentionally not committed — set SEED_ADMIN_PASSWORD before running.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminPassword) {
    console.log('Seeding initial System Admin account...');
    const sysAdminRole = await prisma.role.findUnique({ where: { roleCode: 'SYS_ADMIN' } });
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.employee.upsert({
      where: { email: 'admin@ems.local' },
      update: {},
      create: {
        employeeCode: 'EMP-0001',
        roleId: sysAdminRole.id,
        fullName: 'System Administrator',
        nationality: 'N/A',
        jobTitle: 'System Administrator',
        email: 'admin@ems.local',
        passwordHash,
      },
    });
  } else {
    console.log('SEED_ADMIN_PASSWORD not set — skipping initial admin account.');
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
