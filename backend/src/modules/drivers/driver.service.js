const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { ROLES } = require('../../config/roles');

const LICENSE_ELIGIBILITY = {
  'Light Vehicle': ['SUV', 'PCKU', 'SDAN'],
  'Heavy Vehicle': ['PBUS', 'MBUS', 'VAN', 'CEXC', 'DUMP', 'BKHL', 'WLDR', 'BULL', 'COMP'],
  'Crane Operator Certificate': ['CCRN', 'RTCR', 'ATCR'],
  'Forklift Operator Certificate': ['FKLT'],
  'Aerial Work Platform Certificate': ['BLFT', 'TPLF'],
};

const HIGH_RISK_SUBTYPES = ['CCRN', 'ATCR'];

function validateLicenseEligibility(licenseCategory, subTypeCode) {
  const eligible = LICENSE_ELIGIBILITY[licenseCategory];
  return !!eligible && eligible.includes(subTypeCode);
}

function checkHighRiskAssignment(subTypeCode) {
  return HIGH_RISK_SUBTYPES.includes(subTypeCode);
}

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
        isActive: false,
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
//
// ADDED — project-scoping. Driver has no direct projectId column (unlike
// Asset or IncidentReport), so scoping goes through AssetOperatorAssignment:
// a driver counts as "in scope" if they have at least one active/historical
// operator assignment tied to one of the user's project(s). scopedProjectIds
// null = no filter (global roles).
async function searchDrivers(filters, scopedProjectIds = null) {
  const { licenseCategory, riskCategory, q } = filters;
  const page = parseInt(filters.page, 10) || 1;
  const pageSize = parseInt(filters.pageSize, 10) || 25;

  const where = {
    isActive: true,
    ...(scopedProjectIds !== null && {
      assetOperatorAssignmentDriverIdList: { some: { projectId: { in: scopedProjectIds } } },
    }),
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