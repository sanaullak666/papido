const db = require('../src/config/database');

async function migrate() {
  try {
    console.log('[Migration] Checking and adding is_double_ride column to rides table...');

    try {
      await db.query("ALTER TABLE rides ADD COLUMN is_double_ride BOOLEAN DEFAULT FALSE AFTER female_rider_only");
      console.log('[Migration] Added column `is_double_ride` to `rides` table.');
    } catch (err) {
      if (err.message.includes('Duplicate column name') || err.message.includes('already exists')) {
        console.log('[Migration] `is_double_ride` column already exists in `rides`.');
      } else {
        console.warn('[Migration] Note on rides.is_double_ride:', err.message);
      }
    }

    console.log('[Migration] Complete!');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Error:', err);
    process.exit(1);
  }
}

migrate();
