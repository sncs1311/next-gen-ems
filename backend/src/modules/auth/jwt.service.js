const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Access token: 8h (one work shift) — SRS NFR-SEC-002
// Refresh token: 7 days max lifetime — SRS NFR-SEC-002
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '8h';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

function signRefreshToken(payload) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ ...payload, jti }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY,
  });
  return { token, jti };
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
