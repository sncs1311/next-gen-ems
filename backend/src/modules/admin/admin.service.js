const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { BCRYPT_ROUNDS } = require('../auth/auth.service');

// FR-SA-001 — User Account Management

async function listUsers() {
  return prisma.employee.findMany({
    where: { role: { roleCode: { not: 'DRIVER' } } }, // exclude non-login driver records
    include: { role: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function createUser(data) {
  const role = await prisma.role.findUnique({ where: { roleCode: data.roleCode } });
  if (!role) throw Object.assign(new Error('Invalid role code'), { status: 422 });

  const exists = await prisma.employee.findUnique({ where: { email: data.email } });
  if (exists) throw Object.assign(new Error('An account with this email already exists'), { status: 409 });

  const codeExists = await prisma.employee.findUnique({ where: { employeeCode: data.employeeCode } });
  if (codeExists) throw Object.assign(new Error('Employee code already in use'), { status: 409 });

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  return prisma.employee.create({
    data: {
      employeeCode: data.employeeCode,
      roleId: role.id,
      fullName: data.fullName,
      nationality: data.nationality,
      jobTitle: data.jobTitle,
      department: data.department ?? null,
      email: data.email,
      phone: data.phone ?? null,
      passwordHash,
      isActive: true,
    },
    include: { role: true },
  });
}

async function toggleUserActive(id, isActive) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw Object.assign(new Error('User not found'), { status: 404 });
  if (employee.role?.roleCode === 'DRIVER') {
    throw Object.assign(new Error('Cannot toggle login status on driver records'), { status: 400 });
  }
  return prisma.employee.update({ where: { id }, data: { isActive } });
}

async function listRoles() {
  return prisma.role.findMany({
    where: { roleCode: { not: 'DRIVER' } },
    orderBy: { roleName: 'asc' },
  });
}

module.exports = { listUsers, createUser, toggleUserActive, listRoles };
