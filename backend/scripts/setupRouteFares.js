const { query } = require('../src/config/database');

async function setupRouteFares() {
  console.log('=== Setting up Campus Route Fares Table ===');

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS route_fares (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pickup_stop VARCHAR(255) NOT NULL,
      destination_stop VARCHAR(255) NOT NULL,
      fare_amount DECIMAL(10, 2) NOT NULL,
      distance_km DECIMAL(10, 2) DEFAULT 1.5,
      is_active TINYINT DEFAULT 1,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_route (pickup_stop, destination_stop)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await query(createTableSql);

  const defaultRoutes = [
    { from: 'Campus Main Gate', to: 'Central Food Court & Mess', fare: 25.00, dist: 1.8 },
    { from: 'Campus Main Gate', to: 'Academic Block A', fare: 20.00, dist: 1.0 },
    { from: 'Campus Main Gate', to: 'Library & Research Center', fare: 20.00, dist: 1.2 },
    { from: 'Campus Main Gate', to: 'Hostel Block 4 (Boys)', fare: 30.00, dist: 2.2 },
    { from: 'Campus Main Gate', to: 'Hostel Block 9 (Girls)', fare: 30.00, dist: 2.4 },
    { from: 'Campus Main Gate', to: 'Sports Complex & Ground', fare: 35.00, dist: 2.8 },
    { from: 'Academic Block A', to: 'Hostel Block 4 (Boys)', fare: 25.00, dist: 1.5 },
    { from: 'Academic Block A', to: 'Hostel Block 9 (Girls)', fare: 25.00, dist: 1.6 },
    { from: 'Academic Block A', to: 'Central Food Court & Mess', fare: 20.00, dist: 1.1 },
    { from: 'Library & Research Center', to: 'Hostel Block 4 (Boys)', fare: 25.00, dist: 1.4 },
    { from: 'Hostel Block 4 (Boys)', to: 'Hostel Block 9 (Girls)', fare: 20.00, dist: 0.9 },
  ];

  for (const r of defaultRoutes) {
    await query(
      `INSERT INTO route_fares (pickup_stop, destination_stop, fare_amount, distance_km, is_active)
       VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE fare_amount = VALUES(fare_amount), distance_km = VALUES(distance_km), is_active = 1`,
      [r.from, r.to, r.fare, r.dist]
    );

    // Also register the reverse route if not present
    await query(
      `INSERT INTO route_fares (pickup_stop, destination_stop, fare_amount, distance_km, is_active)
       VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE fare_amount = VALUES(fare_amount), distance_km = VALUES(distance_km), is_active = 1`,
      [r.to, r.from, r.fare, r.dist]
    );
  }

  console.log('✅ Campus route fares table created and seeded with default routes successfully!');
}

if (require.main === module) {
  setupRouteFares().then(() => process.exit(0)).catch(err => {
    console.error('Error setting up route fares:', err);
    process.exit(1);
  });
}

module.exports = setupRouteFares;
