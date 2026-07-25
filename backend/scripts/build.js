// scripts/build.js — runs automatically on Render during build phase.
// Uses upsert throughout so it's safe to run on every deploy without duplicating data.
const { execSync } = require('child_process');

async function main() {
  console.log('Running prisma migrate deploy...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('Running seed...');
  // Import and run the seed directly
  require('../prisma/seed.js');
}

main().catch((e) => { console.error(e); process.exit(1); });
