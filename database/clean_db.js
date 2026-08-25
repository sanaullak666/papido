const { initializeDatabase, query } = require('../backend/src/config/database');
const bcrypt = require('../backend/node_modules/bcryptjs');

async function cleanDatabase() {
  console.log('--- Starting Full TiDB Database Cleaning ---');
  const dbInfo = await initializeDatabase();
  console.log(`Connected to database engine: ${dbInfo.engine}`);

  // Fetch all base tables
  const tables = await query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  console.log(`Found ${tables.length} tables to wipe.`);

  // Disable foreign keys to allow truncating in any order
  await query('SET FOREIGN_KEY_CHECKS = 0;');

  for (const t of tables) {
    const tableName = Object.values(t)[0];
    try {
      await query(`TRUNCATE TABLE \`${tableName}\`;`);
      console.log(`✓ Cleared table: ${tableName}`);
    } catch (err) {
      console.warn(`! Truncate failed for ${tableName} (${err.message}), attempting DELETE FROM...`);
      await query(`DELETE FROM \`${tableName}\`;`);
      console.log(`✓ Deleted rows from: ${tableName}`);
    }
  }

  // Re-enable foreign keys
  await query('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('All tables successfully wiped.');

  // Bootstrap fresh Master Admin & Base Configuration
  console.log('\n--- Bootstrapping Clean Master Admin & Core Config ---');
  const hash = await bcrypt.hash('Password@123', 10);
  
  await query(`
    INSERT INTO users (id, name, email, phone, gender, password_hash, role, status, is_core_member)
    VALUES (1, 'Papido Master Admin', 'admin@papido.com', '+919876543210', 'OTHER', ?, 'ADMIN', 'ACTIVE', 1)
  `, [hash]);
  console.log('✓ Created clean Master Admin (admin@papido.com / Password@123)');

  await query(`
    INSERT INTO fare_configurations (vehicle_type, base_fare, base_distance_km, per_km_fare, per_minute_fare, minimum_fare, cancellation_fee, is_active)
    VALUES 
      ('BIKE', 20.00, 1.50, 8.50, 0.75, 20.00, 5.00, 1),
      ('SCOOTER', 20.00, 1.50, 8.50, 0.75, 20.00, 5.00, 1),
      ('AUTO', 30.00, 1.50, 12.00, 1.00, 30.00, 10.00, 1),
      ('CAB_MINI', 45.00, 2.00, 16.00, 1.50, 45.00, 15.00, 1),
      ('CAB_SEDAN', 60.00, 2.00, 20.00, 2.00, 60.00, 20.00, 1);
  `);
  console.log('✓ Initialized default Fare Configurations');

  await query(`
    INSERT INTO fare_split_rules (id, min_fare, max_fare, rule_type, company_cut_fixed, rider_controller_cut_fixed, company_cut_percentage, rider_cut_percentage, description, priority, is_active)
    VALUES 
      (1, 0.00, 25.00, 'FIXED', 2.00, 2.00, 0.00, 0.00, 'Tier 1: Fare up to ₹25 (Company ₹2, Controller ₹2)', 1, 1),
      (2, 25.01, 35.00, 'FIXED', 3.00, 3.00, 0.00, 0.00, 'Tier 2: Fare ₹25–₹35 (Company ₹3, Controller ₹3)', 2, 1),
      (3, 35.01, 60.00, 'FIXED', 4.00, 4.00, 0.00, 0.00, 'Tier 3: Fare ₹35–₹60 (Company ₹4, Controller ₹4)', 3, 1),
      (4, 60.01, NULL, 'PERCENTAGE', 0.00, 4.00, 20.00, 80.00, 'Tier 4: Fare > ₹60 (Company 20%, Rider/Controller ₹4 baseline + 80%)', 4, 1);
  `);
  console.log('✓ Initialized default Fare Split Rules');

  await query(`
    INSERT INTO system_settings (\`key\`, \`value\`, description) VALUES
      ('PLATFORM_NAME', 'Papido', 'Platform brand name'),
      ('CAMPUS_ZONE_ENABLED', 'true', 'Restricts or optimizes for university campus boundaries'),
      ('MAX_SEARCH_RADIUS_KM', '5.0', 'Maximum driver matching radius in km'),
      ('RIDER_TIMEOUT_SECONDS', '45', 'Time rider has to accept incoming ride request'),
      ('OTP_VERIFICATION_REQUIRED', 'true', 'Require 4-digit OTP from customer to start ride'),
      ('ADMIN_SETTLEMENT_UPI_ID', 'papido.admin@okaxis', 'Default Admin UPI ID for driver shift commission collection'),
      ('ADMIN_SETTLEMENT_NAME', 'Papido Campus Operations', 'Default Receiver Name for Admin UPI'),
      ('ADMIN_SETTLEMENT_AUTO_LOCK', 'true', 'Whether unsettled shift dues auto-lock driver online status');
  `);
  console.log('✓ Initialized default System Settings');

  // Verify final counts across all tables
  console.log('\n--- Final Verification: Row Count by Table ---');
  const finalTables = await query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  for (const t of finalTables) {
    const tableName = Object.values(t)[0];
    const [countRes] = await query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
    console.log(`• ${tableName.padEnd(26)} : ${countRes.cnt} rows`);
  }

  console.log('\n✅ Database Full Clean and Reset Completed Successfully!');
  process.exit(0);
}

cleanDatabase().catch(err => {
  console.error('Fatal error during database cleanup:', err);
  process.exit(1);
});
