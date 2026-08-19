const mysql = require('mysql2/promise');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const env = require('./environment');

let pool = null;
let sqliteDb = null;
let dbEngine = 'none';

/**
 * Initializes the database connection (MySQL with automatic SQLite fallback)
 */
async function initializeDatabase() {
  try {
    const poolConfig = {
      host: env.DB.HOST,
      port: env.DB.PORT,
      user: env.DB.USER,
      password: env.DB.PASSWORD,
      database: env.DB.NAME,
      waitForConnections: true,
      connectionLimit: env.DB.CONNECTION_LIMIT,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    };

    if (env.DB.SSL || (env.DB.HOST && (env.DB.HOST.includes('tidbcloud.com') || env.DB.HOST.includes('aws.')))) {
      poolConfig.ssl = {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      };
    }

    // Attempt MySQL/TiDB connection
    const testPool = mysql.createPool(poolConfig);

    // Test connection with a quick query
    const connection = await testPool.getConnection();
    await connection.ping();
    connection.release();

    pool = testPool;
    dbEngine = 'mysql';
    console.log(`[Database] Connected successfully to MySQL/TiDB database: ${env.DB.NAME} on ${env.DB.HOST}:${env.DB.PORT}`);
    
    // Auto-bootstrap schema in MySQL/TiDB if tables do not exist
    await bootstrapMysqlSchema(testPool);

    return { engine: 'mysql', pool };
  } catch (mysqlErr) {
    console.warn(`[Database Warning] MySQL/TiDB connection failed (${mysqlErr.message}). Initializing local SQLite fallback engine for seamless zero-setup execution...`);
    
    // SQLite Fallback
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const sqlitePath = path.join(dataDir, 'papido_local.db');
    sqliteDb = new Database(sqlitePath);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
    
    dbEngine = 'sqlite';
    bootstrapSqliteSchema();
    console.log(`[Database] SQLite fallback database initialized at ${sqlitePath}`);
    return { engine: 'sqlite', db: sqliteDb };
  }
}

/**
 * Bootstraps MySQL/TiDB tables and master admin if missing
 */
async function bootstrapMysqlSchema(targetPool) {
  try {
    const bcrypt = require('bcryptjs');
    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL UNIQUE,
        gender VARCHAR(20) DEFAULT 'OTHER',
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        status VARCHAR(30) DEFAULT 'ACTIVE',
        suspension_reason VARCHAR(500) DEFAULT NULL,
        profile_image VARCHAR(500) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_email (email),
        INDEX idx_users_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS rider_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        vehicle_type VARCHAR(30) NOT NULL DEFAULT 'BIKE',
        vehicle_number VARCHAR(30) NOT NULL UNIQUE,
        vehicle_model VARCHAR(100) NOT NULL,
        license_number VARCHAR(50) NOT NULL UNIQUE,
        license_doc_url VARCHAR(500) DEFAULT NULL,
        rc_doc_url VARCHAR(500) DEFAULT NULL,
        college_id_doc_url VARCHAR(500) DEFAULT NULL,
        rejection_reason VARCHAR(500) DEFAULT NULL,
        verification_status VARCHAR(30) DEFAULT 'PENDING',
        rating DECIMAL(3, 2) DEFAULT 5.00,
        total_ratings_count INT DEFAULT 0,
        total_rides INT DEFAULT 0,
        is_online BOOLEAN DEFAULT FALSE,
        current_latitude DECIMAL(10, 8) DEFAULT NULL,
        current_longitude DECIMAL(11, 8) DEFAULT NULL,
        last_location_update DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS customer_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        rating DECIMAL(3, 2) DEFAULT 5.00,
        total_ratings_count INT DEFAULT 0,
        total_rides INT DEFAULT 0,
        wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS fare_configurations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_type VARCHAR(30) NOT NULL UNIQUE,
        base_fare DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
        base_distance_km DECIMAL(5, 2) NOT NULL DEFAULT 1.50,
        per_km_fare DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
        per_minute_fare DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
        minimum_fare DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
        cancellation_fee DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS fare_split_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        min_fare DECIMAL(10, 2) NOT NULL,
        max_fare DECIMAL(10, 2) DEFAULT NULL,
        rule_type VARCHAR(30) NOT NULL DEFAULT 'FIXED',
        company_cut_fixed DECIMAL(10, 2) DEFAULT 0.00,
        rider_controller_cut_fixed DECIMAL(10, 2) DEFAULT 0.00,
        company_cut_percentage DECIMAL(5, 2) DEFAULT 0.00,
        rider_cut_percentage DECIMAL(5, 2) DEFAULT 80.00,
        description VARCHAR(255) DEFAULT NULL,
        priority INT DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS route_fares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pickup_stop VARCHAR(150) NOT NULL,
        destination_stop VARCHAR(150) NOT NULL,
        fare_amount DECIMAL(10, 2) NOT NULL,
        distance_km DECIMAL(5, 2) DEFAULT 1.50,
        is_active BOOLEAN DEFAULT TRUE,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_route_stops (pickup_stop, destination_stop)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS rides (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ride_code VARCHAR(30) NOT NULL UNIQUE,
        customer_id INT NOT NULL,
        rider_id INT DEFAULT NULL,
        assigned_rider_id INT DEFAULT NULL,
        vehicle_type VARCHAR(30) NOT NULL DEFAULT 'BIKE',
        pickup_address VARCHAR(500) NOT NULL,
        pickup_latitude DECIMAL(10, 8) DEFAULT NULL,
        pickup_longitude DECIMAL(11, 8) DEFAULT NULL,
        destination_address VARCHAR(500) NOT NULL,
        destination_latitude DECIMAL(10, 8) DEFAULT NULL,
        destination_longitude DECIMAL(11, 8) DEFAULT NULL,
        estimated_distance DECIMAL(6, 2) DEFAULT 0.00,
        estimated_duration INT DEFAULT 0,
        estimated_fare DECIMAL(10, 2) NOT NULL,
        final_fare DECIMAL(10, 2) DEFAULT NULL,
        otp VARCHAR(6) DEFAULT NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'REQUESTED',
        payment_method VARCHAR(30) DEFAULT 'CASH',
        payment_status VARCHAR(30) DEFAULT 'PENDING',
        female_rider_only BOOLEAN DEFAULT FALSE,
        is_double_ride BOOLEAN DEFAULT FALSE,
        is_outside BOOLEAN DEFAULT FALSE,
        cancellation_reason VARCHAR(500) DEFAULT NULL,
        cancelled_by_role VARCHAR(30) DEFAULT NULL,
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        accepted_at DATETIME DEFAULT NULL,
        arrived_at DATETIME DEFAULT NULL,
        started_at DATETIME DEFAULT NULL,
        completed_at DATETIME DEFAULT NULL,
        cancelled_at DATETIME DEFAULT NULL,
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (rider_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ride_id INT NOT NULL,
        customer_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH',
        payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        transaction_reference VARCHAR(100) UNIQUE DEFAULT NULL,
        paid_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS rider_earnings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rider_id INT NOT NULL,
        ride_id INT NOT NULL,
        gross_fare DECIMAL(10, 2) NOT NULL,
        platform_fee DECIMAL(10, 2) NOT NULL,
        controller_fee DECIMAL(10, 2) DEFAULT 0.00,
        net_earning DECIMAL(10, 2) NOT NULL,
        settlement_status VARCHAR(30) DEFAULT 'UNSETTLED',
        settled_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rider_id) REFERENCES users(id),
        FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ride_id INT NOT NULL UNIQUE,
        customer_id INT NOT NULL,
        rider_id INT NOT NULL,
        rating DECIMAL(2, 1) NOT NULL,
        review TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (rider_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        data JSON DEFAULT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT DEFAULT NULL,
        details JSON DEFAULT NULL,
        ip_address VARCHAR(45) DEFAULT NULL,
        user_agent VARCHAR(255) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS ride_declines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ride_id INT NOT NULL,
        rider_id INT NOT NULL,
        declined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_decline (ride_id, rider_id),
        FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
        FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        \`key\` VARCHAR(100) PRIMARY KEY,
        \`value\` TEXT NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Check if master admin exists
    const [rows] = await targetPool.query('SELECT COUNT(*) as count FROM users');
    if (rows[0].count === 0) {
      const hash = await bcrypt.hash('Password@123', 10);
      await targetPool.query(`
        INSERT INTO users (id, name, email, phone, gender, password_hash, role, status)
        VALUES (1, 'Papido Master Admin', 'admin@papido.com', '+919876543210', 'OTHER', ?, 'ADMIN', 'ACTIVE')
      `, [hash]);

      await targetPool.query(`
        INSERT INTO fare_configurations (vehicle_type, base_fare, base_distance_km, per_km_fare, per_minute_fare, minimum_fare, cancellation_fee, is_active)
        VALUES 
          ('BIKE', 20.00, 1.50, 8.50, 0.75, 20.00, 5.00, 1),
          ('SCOOTER', 20.00, 1.50, 8.50, 0.75, 20.00, 5.00, 1),
          ('AUTO', 30.00, 1.50, 12.00, 1.00, 30.00, 10.00, 1),
          ('CAB_MINI', 45.00, 2.00, 16.00, 1.50, 45.00, 15.00, 1),
          ('CAB_SEDAN', 60.00, 2.00, 20.00, 2.00, 60.00, 20.00, 1);
      `);

      await targetPool.query(`
        INSERT INTO fare_split_rules (id, min_fare, max_fare, rule_type, company_cut_fixed, rider_controller_cut_fixed, company_cut_percentage, rider_cut_percentage, description, priority, is_active)
        VALUES 
          (1, 0.00, 25.00, 'FIXED', 2.00, 2.00, 0.00, 0.00, 'Tier 1: Fare up to ₹25 (Company ₹2, Controller ₹2)', 1, 1),
          (2, 25.01, 35.00, 'FIXED', 3.00, 3.00, 0.00, 0.00, 'Tier 2: Fare ₹25–₹35 (Company ₹3, Controller ₹3)', 2, 1),
          (3, 35.01, 60.00, 'FIXED', 4.00, 4.00, 0.00, 0.00, 'Tier 3: Fare ₹35–₹60 (Company ₹4, Controller ₹4)', 3, 1),
          (4, 60.01, NULL, 'PERCENTAGE', 0.00, 4.00, 20.00, 80.00, 'Tier 4: Fare > ₹60 (Company 20%, Rider/Controller ₹4 baseline + 80%)', 4, 1);
      `);

      await targetPool.query(`
        INSERT INTO system_settings (\`key\`, \`value\`, description) VALUES
          ('PLATFORM_NAME', 'Papido', 'Platform brand name'),
          ('CAMPUS_ZONE_ENABLED', 'true', 'Restricts or optimizes for university campus boundaries'),
          ('MAX_SEARCH_RADIUS_KM', '5.0', 'Maximum driver matching radius in km'),
          ('RIDER_TIMEOUT_SECONDS', '45', 'Time rider has to accept incoming ride request'),
          ('OTP_VERIFICATION_REQUIRED', 'true', 'Require 4-digit OTP from customer to start ride');
      `);
    }
  } catch (err) {
    console.warn('[Database Warning] MySQL bootstrap notice:', err.message);
  }
}

/**
 * Bootstraps SQLite tables and initial seed data if running in fallback mode
 */
function bootstrapSqliteSchema() {
  if (!sqliteDb) return;

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL UNIQUE,
      gender TEXT DEFAULT 'OTHER' CHECK(gender IN ('MALE', 'FEMALE', 'OTHER')),
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'RIDER', 'CUSTOMER')),
      status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION')),
      suspension_reason TEXT,
      profile_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rider_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      vehicle_type TEXT NOT NULL DEFAULT 'BIKE',
      vehicle_number TEXT NOT NULL UNIQUE,
      vehicle_model TEXT NOT NULL,
      license_number TEXT NOT NULL UNIQUE,
      license_doc_url TEXT,
      rc_doc_url TEXT,
      college_id_doc_url TEXT,
      verification_status TEXT DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING', 'APPROVED', 'REJECTED')),
      rating REAL DEFAULT 5.00,
      total_ratings_count INTEGER DEFAULT 0,
      total_rides INTEGER DEFAULT 0,
      is_online INTEGER DEFAULT 0,
      current_latitude REAL,
      current_longitude REAL,
      last_location_update DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      rating REAL DEFAULT 5.00,
      total_ratings_count INTEGER DEFAULT 0,
      total_rides INTEGER DEFAULT 0,
      wallet_balance REAL DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fare_configurations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_type TEXT NOT NULL UNIQUE,
      base_fare REAL NOT NULL DEFAULT 20.00,
      base_distance_km REAL NOT NULL DEFAULT 1.50,
      per_km_fare REAL NOT NULL DEFAULT 10.00,
      per_minute_fare REAL NOT NULL DEFAULT 1.00,
      minimum_fare REAL NOT NULL DEFAULT 25.00,
      cancellation_fee REAL NOT NULL DEFAULT 15.00,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fare_split_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      min_fare REAL NOT NULL,
      max_fare REAL,
      rule_type TEXT NOT NULL DEFAULT 'FIXED',
      company_cut_fixed REAL DEFAULT 0.00,
      rider_controller_cut_fixed REAL DEFAULT 0.00,
      company_cut_percentage REAL DEFAULT 0.00,
      rider_cut_percentage REAL DEFAULT 80.00,
      description TEXT,
      priority INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS route_fares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pickup_stop TEXT NOT NULL,
      destination_stop TEXT NOT NULL,
      fare_amount REAL NOT NULL,
      distance_km REAL DEFAULT 1.5,
      is_active INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(pickup_stop, destination_stop)
    );

    CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_code TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      rider_id INTEGER,
      vehicle_type TEXT NOT NULL DEFAULT 'BIKE',
      pickup_address TEXT NOT NULL,
      pickup_latitude REAL NOT NULL,
      pickup_longitude REAL NOT NULL,
      destination_address TEXT NOT NULL,
      destination_latitude REAL NOT NULL,
      destination_longitude REAL NOT NULL,
      estimated_distance REAL NOT NULL,
      estimated_duration INTEGER NOT NULL,
      estimated_fare REAL NOT NULL,
      final_fare REAL,
      otp TEXT,
      status TEXT NOT NULL DEFAULT 'REQUESTED',
      payment_method TEXT DEFAULT 'CASH',
      payment_status TEXT DEFAULT 'PENDING',
      assigned_rider_id INTEGER,
      female_rider_only INTEGER DEFAULT 0,
      is_double_ride INTEGER DEFAULT 0,
      is_outside INTEGER DEFAULT 0,
      cancellation_reason TEXT,
      cancelled_by_role TEXT,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      accepted_at DATETIME,
      arrived_at DATETIME,
      started_at DATETIME,
      completed_at DATETIME,
      cancelled_at DATETIME,
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (rider_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      transaction_reference TEXT UNIQUE,
      gateway_response TEXT,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS rider_earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rider_id INTEGER NOT NULL,
      ride_id INTEGER NOT NULL UNIQUE,
      total_fare REAL NOT NULL,
      rider_earning REAL NOT NULL,
      company_earning REAL NOT NULL,
      controller_earning REAL DEFAULT 0.00,
      applied_rule_description TEXT,
      settlement_status TEXT DEFAULT 'UNSETTLED',
      settled_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rider_id) REFERENCES users(id),
      FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_id INTEGER NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      rider_id INTEGER NOT NULL,
      rating REAL NOT NULL,
      review TEXT,
      rated_by_role TEXT NOT NULL DEFAULT 'CUSTOMER',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (rider_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'RIDE_UPDATE',
      data TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ride_declines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_id INTEGER NOT NULL,
      rider_id INTEGER NOT NULL,
      declined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(ride_id, rider_id),
      FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
      FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Auto-migrate any missing columns in existing SQLite tables
  try {
    const userColumns = sqliteDb.prepare("PRAGMA table_info(users)").all().map(c => c.name);
    if (!userColumns.includes('suspension_reason')) {
      sqliteDb.exec("ALTER TABLE users ADD COLUMN suspension_reason TEXT;");
    }
    if (!userColumns.includes('gender')) {
      sqliteDb.exec("ALTER TABLE users ADD COLUMN gender TEXT DEFAULT 'OTHER';");
    }

    const rideColumns = sqliteDb.prepare("PRAGMA table_info(rides)").all().map(c => c.name);
    if (!rideColumns.includes('assigned_rider_id')) {
      sqliteDb.exec("ALTER TABLE rides ADD COLUMN assigned_rider_id INTEGER;");
    }
    if (!rideColumns.includes('female_rider_only')) {
      sqliteDb.exec("ALTER TABLE rides ADD COLUMN female_rider_only INTEGER DEFAULT 0;");
    }
    if (!rideColumns.includes('is_double_ride')) {
      sqliteDb.exec("ALTER TABLE rides ADD COLUMN is_double_ride INTEGER DEFAULT 0;");
    }
    if (!rideColumns.includes('is_outside')) {
      sqliteDb.exec("ALTER TABLE rides ADD COLUMN is_outside INTEGER DEFAULT 0;");
    }

    const riderColumns = sqliteDb.prepare("PRAGMA table_info(rider_profiles)").all().map(c => c.name);
    if (!riderColumns.includes('license_doc_url')) {
      sqliteDb.exec("ALTER TABLE rider_profiles ADD COLUMN license_doc_url TEXT;");
    }
    if (!riderColumns.includes('rc_doc_url')) {
      sqliteDb.exec("ALTER TABLE rider_profiles ADD COLUMN rc_doc_url TEXT;");
    }
    if (!riderColumns.includes('college_id_doc_url')) {
      sqliteDb.exec("ALTER TABLE rider_profiles ADD COLUMN college_id_doc_url TEXT;");
    }
    if (!riderColumns.includes('rejection_reason')) {
      sqliteDb.exec("ALTER TABLE rider_profiles ADD COLUMN rejection_reason TEXT;");
    }

    // Auto-repair any orphaned RIDER users missing rider_profiles
    const orphanedRiders = sqliteDb.prepare(`
      SELECT u.id, u.name, u.phone 
      FROM users u 
      LEFT JOIN rider_profiles rp ON u.id = rp.user_id 
      WHERE u.role = 'RIDER' AND rp.id IS NULL
    `).all();

    for (const orphan of orphanedRiders) {
      sqliteDb.prepare(`
        INSERT INTO rider_profiles (user_id, vehicle_type, vehicle_number, vehicle_model, license_number, verification_status)
        VALUES (?, 'BIKE', ?, 'Honda Activa 6G', ?, 'PENDING')
      `).run(
        orphan.id,
        `KA-01-XX-${1000 + orphan.id}`,
        `DL-${Date.now().toString().slice(-8)}${orphan.id}`
      );
    }
  } catch (e) {
    console.error('SQLite column migration error:', e.message);
  }

  // Seed default admin user if empty
  const userCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const passwordHash = '$2b$10$q.ljOgbNllNSXlYi0tm7wOBBg8pJ3dy8FLd23UARyPmjDSB1DCJ06'; // Password@123

    sqliteDb.exec(`
      INSERT INTO users (id, name, email, phone, gender, password_hash, role, status, suspension_reason, profile_image) VALUES
      (1, 'Papido Master Admin', 'admin@papido.com', '+919876543210', 'OTHER', '${passwordHash}', 'ADMIN', 'ACTIVE', NULL, NULL);

      INSERT INTO fare_configurations (vehicle_type, base_fare, base_distance_km, per_km_fare, per_minute_fare, minimum_fare, cancellation_fee, is_active) VALUES
      ('BIKE', 20.00, 1.50, 8.50, 0.75, 25.00, 10.00, 1),
      ('AUTO', 30.00, 1.50, 12.00, 1.00, 35.00, 15.00, 1),
      ('CAB_MINI', 45.00, 2.00, 16.00, 1.50, 55.00, 25.00, 1),
      ('CAB_SEDAN', 60.00, 2.00, 20.00, 2.00, 75.00, 35.00, 1);

      INSERT INTO fare_split_rules (id, min_fare, max_fare, rule_type, company_cut_fixed, rider_controller_cut_fixed, company_cut_percentage, rider_cut_percentage, description, priority, is_active) VALUES
      (1, 0.00, 25.00, 'FIXED', 2.00, 2.00, 0.00, 0.00, 'Tier 1: Fare up to ₹25 (Company ₹2, Controller ₹2)', 1, 1),
      (2, 25.01, 35.00, 'FIXED', 3.00, 3.00, 0.00, 0.00, 'Tier 2: Fare ₹25–₹35 (Company ₹3, Controller ₹3)', 2, 1),
      (3, 35.01, 60.00, 'FIXED', 4.00, 4.00, 0.00, 0.00, 'Tier 3: Fare ₹35–₹60 (Company ₹4, Controller ₹4)', 3, 1),
      (4, 60.01, NULL, 'PERCENTAGE', 0.00, 4.00, 20.00, 80.00, 'Tier 4: Fare > ₹60 (Company 20%, Rider/Controller ₹4 baseline + 80%)', 4, 1);

      INSERT INTO system_settings (key, value, description) VALUES
      ('PLATFORM_NAME', 'Papido', 'Platform brand name'),
      ('CAMPUS_ZONE_ENABLED', 'true', 'Restricts or optimizes for university campus boundaries'),
      ('MAX_SEARCH_RADIUS_KM', '5.0', 'Maximum driver matching radius in km'),
      ('RIDER_TIMEOUT_SECONDS', '45', 'Time rider has to accept incoming ride request'),
      ('OTP_VERIFICATION_REQUIRED', 'true', 'Require 4-digit OTP from customer to start ride');
    `);
  }
}

/**
 * Universal Query Executor
 * Formats SQL query and parameters safely across MySQL and SQLite
 */
async function query(sql, params = []) {
  if (dbEngine === 'none') {
    await initializeDatabase();
  }

  if (dbEngine === 'mysql' && pool) {
    const [rows, fields] = await pool.query(sql, params);
    return rows;
  }

  if (dbEngine === 'sqlite' && sqliteDb) {
    const trimmedSql = sql.trim();
    // Normalize parameters for sqlite (booleans, Dates, undefined)
    const normalizedParams = params.map(p => {
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (p instanceof Date) return p.toISOString();
      if (p === undefined) return null;
      return p;
    });

    if (trimmedSql.toUpperCase().startsWith('SELECT') || trimmedSql.toUpperCase().startsWith('WITH') || trimmedSql.toUpperCase().startsWith('PRAGMA')) {
      const stmt = sqliteDb.prepare(sql);
      return stmt.all(normalizedParams);
    } else {
      const stmt = sqliteDb.prepare(sql);
      const result = stmt.run(normalizedParams);
      return {
        insertId: result.lastInsertRowid ? Number(result.lastInsertRowid) : 0,
        affectedRows: result.changes,
        changedRows: result.changes
      };
    }
  }

  throw new Error('Database not initialized');
}

/**
 * Execute single row lookup helper
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Transaction helper
 */
async function transaction(callback) {
  if (dbEngine === 'mysql' && pool) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const result = await callback({
        query: async (sql, params) => {
          const [rows] = await connection.query(sql, params);
          return rows;
        },
        queryOne: async (sql, params) => {
          const [rows] = await connection.query(sql, params);
          return rows && rows.length > 0 ? rows[0] : null;
        }
      });
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  if (dbEngine === 'sqlite' && sqliteDb) {
    const executeTransaction = sqliteDb.transaction(callback);
    return executeTransaction({
      query: async (sql, params) => query(sql, params),
      queryOne: async (sql, params) => queryOne(sql, params)
    });
  }

  throw new Error('Database not initialized');
}

module.exports = {
  initializeDatabase,
  query,
  queryOne,
  transaction,
  getEngine: () => dbEngine
};
