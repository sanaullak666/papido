const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function cleanProductionDatabase() {
  await db.initializeDatabase();
  console.log('🚀 CLEANING DATABASE FOR PRODUCTION HOSTING...');

  // 1. Clear all dynamic ride and transactional tables
  await db.query('DELETE FROM rides');
  await db.query('DELETE FROM payments');
  await db.query('DELETE FROM rider_earnings');
  await db.query('DELETE FROM ratings');
  await db.query('DELETE FROM notifications');
  await db.query('DELETE FROM audit_logs');
  await db.query('DELETE FROM ride_declines');
  await db.query('DELETE FROM password_resets');
  await db.query('DELETE FROM push_subscriptions');
  console.log('✓ Cleared all rides, payments, earnings, ratings, and logs.');

  // 2. Clear all route presets (empty table ready for real admin route configuration)
  await db.query('DELETE FROM route_fares');
  console.log('✓ Cleared all route presets.');

  // 3. Clear all rider & customer profiles
  await db.query('DELETE FROM rider_profiles');
  await db.query('DELETE FROM customer_profiles');
  console.log('✓ Cleared all rider and customer profiles.');

  // 4. Delete all users except Master Admin
  await db.query("DELETE FROM users WHERE email != 'admin@papido.com'");
  console.log('✓ Removed all mock rider & customer accounts.');

  // 5. Ensure Master Admin exists and is ACTIVE
  const hash = await bcrypt.hash('Password@123', 10);
  const existingAdmin = await db.queryOne("SELECT * FROM users WHERE email = 'admin@papido.com'");
  
  if (!existingAdmin) {
    await db.query(
      `INSERT INTO users (id, name, email, phone, gender, password_hash, role, status) 
       VALUES (1, 'Papido Master Admin', 'admin@papido.com', '+919876543210', 'OTHER', ?, 'ADMIN', 'ACTIVE')`,
      [hash]
    );
    console.log('✓ Created Master Admin account (admin@papido.com).');
  } else {
    await db.query(
      `UPDATE users 
       SET name = 'Papido Master Admin', 
           role = 'ADMIN', 
           status = 'ACTIVE', 
           password_hash = ? 
       WHERE email = 'admin@papido.com'`,
      [hash]
    );
    console.log('✓ Verified & updated Master Admin account (admin@papido.com).');
  }

  // 6. Reset base standard fare configs
  await db.query('DELETE FROM fare_configurations');
  await db.query(`
    INSERT INTO fare_configurations (vehicle_type, base_fare, base_distance_km, per_km_fare, per_minute_fare, minimum_fare, cancellation_fee, is_active) VALUES
    ('BIKE', 20.00, 1.50, 8.50, 0.75, 20.00, 5.00, 1),
    ('SCOOTER', 20.00, 1.50, 8.50, 0.75, 20.00, 5.00, 1),
    ('AUTO', 30.00, 1.50, 12.00, 1.00, 30.00, 10.00, 1),
    ('CAB_MINI', 45.00, 2.00, 16.00, 1.50, 45.00, 15.00, 1),
    ('CAB_SEDAN', 60.00, 2.00, 20.00, 2.00, 60.00, 20.00, 1);
  `);
  console.log('✓ Reset standard base fare configurations.');

  // 7. Reset standard fare split rules
  await db.query('DELETE FROM fare_split_rules');
  await db.query(`
    INSERT INTO fare_split_rules (id, min_fare, max_fare, rule_type, company_cut_fixed, rider_controller_cut_fixed, company_cut_percentage, rider_cut_percentage, description, priority, is_active) VALUES
    (1, 0.00, 25.00, 'FIXED', 2.00, 2.00, 0.00, 0.00, 'Tier 1: Fare up to ₹25 (Company ₹2, Controller ₹2)', 1, 1),
    (2, 25.01, 35.00, 'FIXED', 3.00, 3.00, 0.00, 0.00, 'Tier 2: Fare ₹25–₹35 (Company ₹3, Controller ₹3)', 2, 1),
    (3, 35.01, 60.00, 'FIXED', 4.00, 4.00, 0.00, 0.00, 'Tier 3: Fare ₹35–₹60 (Company ₹4, Controller ₹4)', 3, 1),
    (4, 60.01, NULL, 'PERCENTAGE', 0.00, 4.00, 20.00, 80.00, 'Tier 4: Fare > ₹60 (Company 20%, Rider/Controller ₹4 baseline + 80%)', 4, 1);
  `);
  console.log('✓ Reset standard revenue split rules.');

  const userCount = await db.query('SELECT COUNT(*) as c FROM users');
  const riderCount = await db.query('SELECT COUNT(*) as c FROM rider_profiles');
  const customerCount = await db.query('SELECT COUNT(*) as c FROM customer_profiles');
  const routeCount = await db.query('SELECT COUNT(*) as c FROM route_fares');
  const rideCount = await db.query('SELECT COUNT(*) as c FROM rides');

  console.log('\n=========================================');
  console.log('🎉 PRODUCTION DATABASE CLEANUP COMPLETE!');
  console.log('=========================================');
  console.log(`• Users Remaining: ${userCount[0].c} (Master Admin Only)`);
  console.log(`• Riders: ${riderCount[0].c}`);
  console.log(`• Customers: ${customerCount[0].c}`);
  console.log(`• Active/Past Rides: ${rideCount[0].c}`);
  console.log(`• Configured Routes: ${routeCount[0].c}`);
  console.log('=========================================\n');

  process.exit(0);
}

cleanProductionDatabase().catch(err => {
  console.error('Error during production database cleanup:', err);
  process.exit(1);
});
