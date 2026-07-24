const crypto = require('crypto');

// NFR-AV-004 — never show raw DB errors/stack traces; user-friendly message +
// a reference code that maps to the server-side log for support/debugging.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const refCode = crypto.randomUUID().slice(0, 8);
  const status = err.status || 500;

  console.error(`[${refCode}] ${req.method} ${req.originalUrl} ->`, err);

  if (status >= 500) {
    return res.status(500).json({ error: 'Internal server error', refCode });
  }
  res.status(status).json({ error: err.message, refCode });
}

module.exports = { errorHandler };
