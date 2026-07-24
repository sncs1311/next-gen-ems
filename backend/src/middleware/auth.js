const { verifyAccessToken } = require('../modules/auth/jwt.service');

// FR-SA-002 / NFR-SEC-003: every endpoint validates JWT + role before processing.
// Failures return 403 with no information about the resource (no leakage).
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, employeeCode: payload.employeeCode };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// requireRole('FLEET_MANAGER', 'SYSTEM_ADMIN')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      // NFR-SEC-003: no detail about the resource on authorization failure.
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
