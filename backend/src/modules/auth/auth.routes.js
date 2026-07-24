const express = require('express');
const { body } = require('express-validator');
const authService = require('./auth.service');
const { validate } = require('../../middleware/validate');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
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
    } catch (err) {
      next(err);
    }
  }
);

router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) await authService.logout(refreshToken);
    res.clearCookie('refreshToken', COOKIE_OPTS);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });
    const accessToken = await authService.refreshAccessToken(refreshToken);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
