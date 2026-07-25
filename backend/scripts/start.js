// scripts/start.js — entrypoint for production (Render).
// Runs seed before starting the server, seed uses upsert so it's idempotent.
const { execSync } = require('child_process');

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.log('[startup] Running seed (idempotent)...');
    try {
      // seed.js uses upsert — safe to run on every restart, won't duplicate data
      await require('../prisma/seed.js');
    } catch (e) {
      console.error('[startup] Seed error (non-fatal):', e.message);
    }
  }
  console.log('[startup] Starting server...');
  require('../src/server.js');
}

main();
