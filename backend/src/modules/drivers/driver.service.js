const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { ROLES } = require('../../config/roles');

// FR-DR-002 — License Category Validation: eligible AssetSubType codes per license category.
// Source: SRS FR-DR-002 text (no lookup table exists for this in the data dictionary —
// implemented here as the documented business rule, not as new persisted schema).
const LICENSE_ELIGIBILITY = {
  'Light Vehicle': ['SUV', 'PCKU', 'SDAN'], // Executive/Light Commercial only
  'Heavy Vehicle': ['PBUS', 'MBUS', 'VAN', 'CEXC', 'DUMP', 'BKHL', 'WLDR', 'BULL', 'COMP'], // Personnel Transport + Heavy Earthmoving
  'Crane Operator Certificate': ['CCRN', 'RTCR', 'ATCR'],
  'Forklift Operator Certificate': ['FKLT'],
  'Aerial Work Platform Certificate': ['BLFT', 'TPLF'],
};

// FR-DR-005 — sub-types requiring High Risk driver assignment block/override.
const HIGH_RISK_SUBTYPES = ['CCRN', 'ATCR']; // Crawler Cranes, All-Terrain Cranes
// Note: SRS also names "Executive/Light Commercial VIP vehicles" here, but the data
// dictionary's AssetSubType has no VIP flag — that check can't be implemented until
// the dictionary/ERD defines how a VIP vehicle is distinguished from a regular one.

function validateLicenseEligibility(licenseCategory, subTypeCode) {
  const eligible = LICENSE_ELIGIBILITY[licenseCategory];
  return !!eligible && eligible.includes(subTypeCode);
}

function checkHighRiskAssignment(subTypeCode) {
  return HIGH_RISK_SUBTYPES.includes(subTypeCode);
}

// FR-DR-001 — Driver Registration. Creates the Employee identity record (non-login,
// see ROLES.DRIVER) + Driver + initial DriverLicense together, since the dictionary
// splits demographic fields (Employee), driver-specific fields (Driver), and license
// history (DriverLicense) into separate 3NF tables — SRS §5.1/§5.2.
async function registerDriver(data, userId) {
  const driverRole = await prisma.role.findUnique({ where: { roleCode: ROLES.DRIVER } });
  if (!driverRole) {
    throw Object.assign(new Error('DRIVER role not seeded — run the seed script first'), { status: 500 });
  }

  const unusablePassword = await bcrypt.hash(crypto.randomUUID(), 12);

  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.create({
      data: {
        employeeCode: data.employeeCode,
        roleId: driverRole.id,
        fullName: data.fullName,
        nationality: data.nationality,
        dateOfBirth: data.dateOfBirth ?? null,
        jobTitle: data.jobTitle,
        email: data.email,
        phone: data.phone ?? null,
        passwordHash: unusablePassword,
        isActive: false, // never allowed to authenticate — record-keeping only
      },
    });

    const driver = await tx.driver.create({
      data: {
        employeeId: employee.id,
        medicalCertNumber: data.medicalCertNumber,
        medicalCertExpiry: data.medicalCertExpiry,
        yearsOfExperience: data.yearsOfExperience ?? null,
        previousEmployer: data.previousEmployer ?? null,
        emergencyContactName: data.emergencyContactName ?? null,
        emergencyContactPhone: data.emergencyContactPhone ?? null,
        emergencyContactRelation: data.emergencyContactRelation ?? null,
      },
    });

    await tx.driverLicense.create({
      data: {
        driverId: driver.id,
        licenseNumber: data.licenseNumber,
        licenseCategory: data.licenseCategory,
        issuingAuthority: data.issuingAuthority,
        issuingCountry: data.issuingCountry,
        issueDate: data.issueDate,
        expiryDate: data.licenseExpiry,
      },
    });

    return tx.driver.findUnique({
      where: { id: driver.id },
      include: { employee: true, driverLicenseDriverIdList: { where: { isCurrent: true } } },
    });
  });
}

// FR-DR-003 — Training Record Entry
async function addTrainingRecord(driverId, data) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });

  return prisma.driverTrainingRecord.create({
    data: {
      driverId,
      trainingType: data.trainingType,
      trainingProvider: data.trainingProvider ?? null,
      trainingDate: data.trainingDate,
      certificateNumber: data.certificateNumber ?? null,
      expiryDate: data.expiryDate ?? null,
    },
  });
}

// Supports FR-DR-002/006 — renewing a license supersedes the prior current one.
async function renewLicense(driverId, licenseData) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.driverLicense.findFirst({
      where: { driverId, isCurrent: true },
      orderBy: { issueDate: 'desc' },
    });

    if (current) {
      await tx.driverLicense.update({ where: { id: current.id }, data: { isCurrent: false } });
    }

    return tx.driverLicense.create({
      data: {
        driverId,
        licenseNumber: licenseData.licenseNumber,
        licenseCategory: licenseData.licenseCategory,
        issuingAuthority: licenseData.issuingAuthority,
        issuingCountry: licenseData.issuingCountry,
        issueDate: licenseData.issueDate,
        expiryDate: licenseData.expiryDate,
        renewedFromLicenseId: current ? current.id : null,
      },
    });
  });
}

// FR-DR-007 — Driver Search and List View
async function searchDrivers(filters) {
  const { licenseCategory, riskCategory, q, page = 1, pageSize = 25 } = filters;

  const where = {
    isActive: true,
    ...(licenseCategory && {
      driverLicenseDriverIdList: { some: { licenseCategory, isCurrent: true } },
    }),
    ...(riskCategory && { driverBehaviorScoreDriverId: { riskCategory } }),
    ...(q && {
      employee: {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { employeeCode: { contains: q, mode: 'insensitive' } },
        ],
      },
    }),
  };

  const [total, results] = await prisma.$transaction([
    prisma.driver.count({ where }),
    prisma.driver.findMany({
      where,
      include: {
        employee: true,
        driverLicenseDriverIdList: { where: { isCurrent: true } },
        driverBehaviorScoreDriverId: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { total, page: Number(page), pageSize: Number(pageSize), results };
}

async function getDriverById(id) {
  const driver = await prisma.driver.findUnique({
    where: { id },
    include: {
      employee: true,
      driverLicenseDriverIdList: { orderBy: { issueDate: 'desc' } },
      driverTrainingRecordDriverIdList: { orderBy: { trainingDate: 'desc' } },
      driverBehaviorScoreDriverId: true,
    },
  });
  if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });
  return driver;
}

module.exports = {
  registerDriver,
  addTrainingRecord,
  renewLicense,
  searchDrivers,
  getDriverById,
  validateLicenseEligibility,
  checkHighRiskAssignment,
};
