const { PrismaClient } = require('@prisma/client');

// Single shared PrismaClient instance across the app (per SRS 4.3 Data Access Layer).
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
