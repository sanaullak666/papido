const { pool, query, isMySQL } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function resetAllData() {
  console.log('=== Cleaning and Resetting Papido Database ===');
  console.log('Target Database Engine:', isMySQL ? 'MySQL (papido_db)' : 'SQLite (local fallback)');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  if (isMySQL) {
    // 1. Disable FK checks for clean truncate
    await query('SET FOREIGN_KEY_CHECKS = 0;');

    console.log('Truncating transactional tables...');
    await query('TRUNCATE TABLE audit_logs;');
    await query('TRUNCATE TABLE notifications;');
    await query('TRUNCATE TABLE rider_earnings;');
    await query('TRUNCATE TABLE payments;');
    await query('TRUNCATE TABLE rides;');
    await query('TRUNCATE TABLE customer_profiles;');
    await query('TRUNCATE TABLE rider_profiles;');
    await query('TRUNCATE TABLE users;');

    console.log('Seeding initial test users & profiles...');
    // Seed Users
    await query(`
      INSERT INTO users (id, name, email, phone, password_hash, role, status, profile_image) VALUES
      (1, 'Papido Master Admin', 'admin@papido.com', '+919876543210', ?, 'ADMIN', 'ACTIVE', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
      (2, 'Rahul Sharma (Rider)', 'rider.rahul@papido.com', '+919876543211', ?, 'RIDER', 'ACTIVE', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
      (3, 'Amit Verma (Rider)', 'rider.amit@papido.com', '+919876543212', ?, 'RIDER', 'ACTIVE', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'),
      (4, 'Vikram Singh (Rider - Pending KYC)', 'rider.vikram@papido.com', '+919876543213', ?, 'RIDER', 'PENDING_VERIFICATION', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150'),
      (5, 'Ananya Sen (Customer)', 'customer.ananya@papido.com', '+919876543220', ?, 'CUSTOMER', 'ACTIVE', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
      (6, 'Rohan Mehta (Customer)', 'customer.rohan@papido.com', '+919876543221', ?, 'CUSTOMER', 'ACTIVE', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150');
    `, [passwordHash, passwordHash, passwordHash, passwordHash, passwordHash, passwordHash]);

    // Seed Rider Profiles
    await query(`
      INSERT INTO rider_profiles (id, user_id, vehicle_type, vehicle_number, vehicle_model, license_number, verification_status, rating, total_ratings_count, total_rides, is_online, current_latitude, current_longitude, last_location_update) VALUES
      (1, 2, 'BIKE', 'KA-01-EQ-1024', 'Honda Activa 6G (Matte Black)', 'DL-0420190012345', 'APPROVED', 5.00, 0, 0, 1, 12.971598, 77.594566, NOW()),
      (2, 3, 'BIKE', 'KA-05-MB-8890', 'TVS Jupiter (Midnight Blue)', 'DL-0420180098765', 'APPROVED', 5.00, 0, 0, 1, 12.978369, 77.640835, NOW()),
      (3, 4, 'BIKE', 'KA-03-NZ-4411', 'Hero Splendor Plus', 'DL-0420220055443', 'PENDING', 5.00, 0, 0, 0, 12.935242, 77.624461, NOW());
    `);

    // Seed Customer Profiles
    await query(`
      INSERT INTO customer_profiles (id, user_id, rating, total_ratings_count, total_rides, wallet_balance) VALUES
      (1, 5, 5.00, 0, 0, 500.00),
      (2, 6, 5.00, 0, 0, 300.00);
    `);

    // 2. Re-enable FK checks
    await query('SET FOREIGN_KEY_CHECKS = 1;');
  }

  // Also clean SQLite if exists
  const fs = require('fs');
  const path = require('path');
  const sqliteFile = path.resolve(__dirname, '../data/papido_local.db');
  if (fs.existsSync(sqliteFile)) {
    try {
      const Database = require('better-sqlite3');
      const db = new Database(sqliteFile);
      db.exec('DELETE FROM audit_logs;');
      db.exec('DELETE FROM notifications;');
      db.exec('DELETE FROM rider_earnings;');
      db.exec('DELETE FROM payments;');
      db.exec('DELETE FROM rides;');
      db.exec('DELETE FROM customer_profiles;');
      db.exec('DELETE FROM rider_profiles;');
      db.exec('DELETE FROM users;');

      const insertUser = db.prepare('INSERT INTO users (id, name, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
      insertUser.run(1, 'Papido Master Admin', 'admin@papido.com', '+919876543210', passwordHash, 'ADMIN', 'ACTIVE');
      insertUser.run(2, 'Rahul Sharma (Rider)', 'rider.rahul@papido.com', '+919876543211', passwordHash, 'RIDER', 'ACTIVE');
      insertUser.run(3, 'Amit Verma (Rider)', 'rider.amit@papido.com', '+919876543212', passwordHash, 'RIDER', 'ACTIVE');
      insertUser.run(4, 'Vikram Singh (Rider - Pending KYC)', 'rider.vikram@papido.com', '+919876543213', passwordHash, 'RIDER', 'PENDING_VERIFICATION');
      insertUser.run(5, 'Ananya Sen (Customer)', 'customer.ananya@papido.com', '+919876543220', passwordHash, 'CUSTOMER', 'ACTIVE');
      insertUser.run(6, 'Rohan Mehta (Customer)', 'customer.rohan@papido.com', '+919876543221', passwordHash, 'CUSTOMER', 'ACTIVE');

      const insertRider = db.prepare('INSERT INTO rider_profiles (id, user_id, vehicle_type, vehicle_number, vehicle_model, license_number, verification_status, rating, total_rides, is_online) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      insertRider.run(1, 2, 'BIKE', 'KA-01-EQ-1024', 'Honda Activa 6G (Matte Black)', 'DL-0420190012345', 'APPROVED', 5.0, 0, 1);
      insertRider.run(2, 3, 'BIKE', 'KA-05-MB-8890', 'TVS Jupiter (Midnight Blue)', 'DL-0420180098765', 'APPROVED', 5.0, 0, 1);

      const insertCust = db.prepare('INSERT INTO customer_profiles (id, user_id, rating, total_rides, wallet_balance) VALUES (?, ?, ?, ?, ?)');
      insertCust.run(1, 5, 5.0, 0, 500.0);
      insertCust.run(2, 6, 5.0, 0, 300.0);
      console.log('SQLite fallback database cleaned and re-seeded.');
    } catch (e) {
      console.log('SQLite cleanup notice:', e.message);
    }
  }

  console.log('=== Database Clean & Reset Completed Successfully! ===');
  process.exit(0);
}

resetAllData().catch(err => {
  console.error('Database reset failed:', err);
  process.exit(1);
});
