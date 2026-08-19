const { query, initializeDatabase } = require('../config/database');

async function migrate() {
  try {
    await initializeDatabase();
    console.log('[Migration] Connected to DB.');

    // 1. Update status enum in rides
    try {
      await query(`
        ALTER TABLE rides 
        MODIFY COLUMN status ENUM('PENDING_ADMIN_QUOTE','REQUESTED','ACCEPTED','RIDER_ARRIVING','RIDER_REACHED','STARTED','COMPLETED','CANCELLED') 
        NOT NULL DEFAULT 'REQUESTED'
      `);
    } catch (_) {}

    // 2. Add is_outside column if not present
    try {
      await query(`ALTER TABLE rides ADD COLUMN is_outside TINYINT(1) DEFAULT 0 AFTER is_double_ride`);
    } catch (_) {}

    // 3. Add assigned_rider_id column if not present
    try {
      await query(`ALTER TABLE rides ADD COLUMN assigned_rider_id INT DEFAULT NULL AFTER rider_id`);
    } catch (_) {}

    console.log('[Migration] All migrations verified.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Failed:', err);
    process.exit(1);
  }
}

migrate();
