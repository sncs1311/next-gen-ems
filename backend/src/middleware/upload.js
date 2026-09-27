// backend/src/middleware/upload.js
//
// Multer configuration for file uploads. Currently used by incident.routes.js
// for incident media (photos + documents). Add new upload configs here as
// other modules need file upload support (e.g. document attachments on
// assets, transfer inspection photos) rather than creating separate multer
// instances per module.
//
// Files are stored on disk under backend/uploads/<module>/ — the directory
// is created automatically if it doesn't exist. The upload path is exposed
// as a static route in app.js:
//   app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Add that line to app.js if it isn't already there.

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure an upload directory exists, creating it (and parents) if needed.
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

// ── Incident media ────────────────────────────────────────────────────────────
// Accepts: JPEG, PNG, WEBP (photos) + PDF, DOC, DOCX (documents)
// Limit: 10 MB per file, up to 10 files per request (enforced in the route:
//   incidentUpload.array('files', 10))

const incidentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ensureDir(path.join(UPLOAD_ROOT, 'incidents')));
  },
  filename: (req, file, cb) => {
    // randomised name to prevent collisions and path-traversal attacks
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const ALLOWED_INCIDENT_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function incidentFileFilter(req, file, cb) {
  if (ALLOWED_INCIDENT_MIMETYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(
        new Error(`File type not allowed: ${file.mimetype}. Accepted: JPEG, PNG, WEBP, PDF, DOC, DOCX`),
        { status: 422 }
      ),
      false
    );
  }
}

const incidentUpload = multer({
  storage: incidentStorage,
  fileFilter: incidentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 10,                   // max 10 files per request
  },
});

module.exports = { incidentUpload };