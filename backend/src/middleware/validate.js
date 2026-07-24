const { validationResult } = require('express-validator');

// NFR-P: invalid input returns HTTP 422 with field-level error messages (TR-IT-001).
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array().map((e) => ({ field: e.path, message: e.msg })) });
  }
  next();
}

module.exports = { validate };
