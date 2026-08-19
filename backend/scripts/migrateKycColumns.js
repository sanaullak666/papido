const { initializeDatabase, query } = require('../src/config/database');

async function migrate() {
  console.log('Ensuring KYC and document columns exist in MySQL / SQLite...');
  await initializeDatabase();

  try {
    // Add columns to rider_profiles if they do not exist
    try {
      await query(`ALTER TABLE rider_profiles ADD COLUMN license_doc_url VARCHAR(500) DEFAULT NULL;`);
      console.log('Added license_doc_url column');
    } catch (e) {
      console.log('license_doc_url check/notice:', e.message);
    }

    try {
      await query(`ALTER TABLE rider_profiles ADD COLUMN rc_doc_url VARCHAR(500) DEFAULT NULL;`);
      console.log('Added rc_doc_url column');
    } catch (e) {
      console.log('rc_doc_url check/notice:', e.message);
    }

    try {
      await query(`ALTER TABLE rider_profiles ADD COLUMN college_id_doc_url VARCHAR(500) DEFAULT NULL;`);
      console.log('Added college_id_doc_url column');
    } catch (e) {
      console.log('college_id_doc_url check/notice:', e.message);
    }

    console.log('KYC column migration completed successfully.');
  } catch (err) {
    console.error('Migration error:', err);
  }
  process.exit(0);
}

migrate();
