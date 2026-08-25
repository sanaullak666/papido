const db = require('../src/config/database');

async function cleanAllDatabaseRecords() {
  await db.initializeDatabase();
  console.log('🚀 CLEANING ALL TRANSACTIONAL & RIDE RECORDS IN PAPIDO DATABASE...');

  // Disable FK checks temporarily for clean wipes
  try {
    await db.query('SET FOREIGN_KEY_CHECKS = 0;');
  } catch (_) {}

  // 1. Wipe all transactional and history tables
  const tablesToWipe = [
    'rides',
    'payments',
    'rider_earnings',
    'daily_shift_settlements',
    'daily_duty_controllers',
    'cancellation_penalties',
    'ratings',
    'notifications',
    'audit_logs',
    'ride_declines',
    'password_resets',
    'push_subscriptions'
  ];

  for (const table of tablesToWipe) {
    try {
      await db.query(`DELETE FROM \`${table}\``);
      console.log(`✓ Cleared table: ${table}`);
    } catch (err) {
      console.warn(`! Table ${table} notice: ${err.message}`);
    }
  }

  // 2. Reset counters and stats on all Rider Profiles
  try {
    await db.query(`
      UPDATE rider_profiles 
      SET total_rides = 0, 
          total_ratings_count = 0, 
          rating = 5.00, 
          is_online = 0
    `);
    console.log('✓ Reset all Rider Profiles: total_rides = 0, rating = 5.00, is_online = 0');
  } catch (err) {
    console.warn('! Rider profiles update notice:', err.message);
  }

  // 3. Reset counters and balances on all Customer Profiles
  try {
    await db.query(`
      UPDATE customer_profiles 
      SET total_rides = 0, 
          total_ratings_count = 0, 
          rating = 5.00, 
          wallet_balance = 0.00
    `);
    console.log('✓ Reset all Customer Profiles: total_rides = 0, rating = 5.00, wallet_balance = 0.00');
  } catch (err) {
    console.warn('! Customer profiles update notice:', err.message);
  }

  // Re-enable FK checks
  try {
    await db.query('SET FOREIGN_KEY_CHECKS = 1;');
  } catch (_) {}

  // Verification summary
  const [usersCount] = await db.query('SELECT COUNT(*) as count FROM users');
  const [ridersCount] = await db.query('SELECT COUNT(*) as count FROM rider_profiles');
  const [customersCount] = await db.query('SELECT COUNT(*) as count FROM customer_profiles');
  const [ridesCount] = await db.query('SELECT COUNT(*) as count FROM rides');
  const [earningsCount] = await db.query('SELECT COUNT(*) as count FROM rider_earnings');

  console.log('\n=========================================');
  console.log('🎉 DATABASE CLEANUP COMPLETE!');
  console.log('=========================================');
  console.log(`• Registered Users: ${usersCount.count}`);
  console.log(`• Rider Profiles (Counters @ 0): ${ridersCount.count}`);
  console.log(`• Customer Profiles (Counters @ 0): ${customersCount.count}`);
  console.log(`• Total Rides in Database: ${ridesCount.count}`);
  console.log(`• Total Earnings in Database: ${earningsCount.count}`);
  console.log('=========================================\n');

  process.exit(0);
}

cleanAllDatabaseRecords().catch(err => {
  console.error('Database cleanup failed:', err);
  process.exit(1);
});
