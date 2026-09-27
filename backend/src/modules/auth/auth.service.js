const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('./jwt.service');
const { getPrimaryProject, getAllAssignedProjects } = require('../../lib/projectScope');

const BCRYPT_ROUNDS = 12; // SRS NFR-SEC-001 — minimum work factor of 12

async function login(email, password) {
  const employee = await prisma.employee.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!employee || !employee.isActive) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, employee.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const payload = { sub: employee.id, role: employee.role.roleCode, employeeCode: employee.employeeCode };
  const accessToken = signAccessToken(payload);
  const { token: refreshToken, jti } = signRefreshToken({ sub: employee.id });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { jti, employeeId: employee.id, expiresAt },
  });

  await prisma.employee.update({
    where: { id: employee.id },
    data: { lastLoginAt: new Date() },
  });

  // ADDED — project-scoping. primaryProject drives the "top corner" project
  // indicator; projects is the full list for roles that may span multiple
  // sites (e.g. a Fleet Manager overseeing several projects). Both are null
  // for global roles (SYS_ADMIN, EXEC) — the frontend should treat a null
  // primaryProject as "this user is global, don't show a project badge",
  // not as "no project assigned yet" (those are different states — an
  // empty array from getAllAssignedProjects for a non-global user IS the
  // "not yet assigned" case).
  const [primaryProject, projects] = await Promise.all([
    getPrimaryProject(employee.id, employee.role.roleCode),
    getAllAssignedProjects(employee.id, employee.role.roleCode),
  ]);

  return {
    accessToken,
    refreshToken,
    user: {
      id: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      role: employee.role.roleCode,
      primaryProject,
      projects,
    },
  };
}

async function logout(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    return; // already invalid/expired — nothing to revoke
  }
  await prisma.refreshToken.updateMany({
    where: { jti: decoded.jti, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function refreshAccessToken(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });
  }

  const stored = await prisma.refreshToken.findUnique({ where: { jti: decoded.jti } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Refresh token revoked or expired'), { status: 401 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: decoded.sub },
    include: { role: true },
  });
  if (!employee || !employee.isActive) {
    throw Object.assign(new Error('Account inactive'), { status: 401 });
  }

  return signAccessToken({
    sub: employee.id,
    role: employee.role.roleCode,
    employeeCode: employee.employeeCode,
  });
}

module.exports = { login, logout, refreshAccessToken, BCRYPT_ROUNDS };