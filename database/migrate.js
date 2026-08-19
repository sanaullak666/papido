const { initializeDatabase, query } = require('../backend/src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('[Migration] Starting database migration...');
  const dbInfo = await initializeDatabase();
  console.log(`[Migration] Database initialized with engine: ${dbInfo.engine}`);
  console.log('[Migration] Database schema tables ready.');
}

if (require.main === module) {
  runMigration().then(() => {
    console.log('[Migration] Complete.');
    process.exit(0);
  }).catch((err) => {
    console.error('[Migration Error]', err);
    process.exit(1);
  });
}

module.exports = { runMigration };
