// backend/src/modules/auth/auth.routes.js
const express = require('express');
const { body } = require('express-validator');
const authService = require('./auth.service');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post(
  '/login',
  [body('email').isEmail(), body('password').isString().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const { accessToken, refreshToken, user } = await authService.login(email, password);
      res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
      res.json({ accessToken, user });
    } catch (err) { next(err); }
  }
);

router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) await authService.logout(refreshToken);
    res.clearCookie('refreshToken', COOKIE_OPTS);
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });
    const accessToken = await authService.refreshAccessToken(refreshToken);
    res.json({ accessToken });
  } catch (err) { next(err); }
});

// /me — returns the current user's profile from the JWT
// Used by AppShell on page refresh to restore session without re-login
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const prisma = require('../../lib/prisma');
    const employee = await prisma.employee.findUnique({
      where: { id: req.user.id },
      // FIX: cannot use `include` and `select` together — role relation
      // is now selected inside `select` below instead of a separate `include`.
      select: {
        id: true,
        fullName: true,
        email: true,
        employeeCode: true,
        department: true,
        isActive: true, // FIX: was missing — the isActive check below always
                         // read `undefined` (falsy), so every /me call would
                         // have 401'd as "Account inactive" once the
                         // include/select conflict was fixed.
        role: true,
      },
    });
    if (!employee || !employee.isActive) {
      return res.status(401).json({ error: 'Account inactive' });
    }
    res.json({
      id: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      role: employee.role.roleCode,
    });
  } catch (err) { next(err); }
});

module.exports = router;