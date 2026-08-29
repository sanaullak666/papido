const mysql = require('mysql2/promise');
const env = require('./environment');

let pool = null;
let dbEngine = 'none';

/**
 * Initializes the database connection exclusively with TiDB Cloud (MySQL)
 */
async function initializeDatabase() {
  if (pool) {
    return { engine: 'mysql', pool };
  }

  const poolConfig = {
    host: env.DB.HOST,
    port: env.DB.PORT,
    user: env.DB.USER,
    password: env.DB.PASSWORD,
    database: env.DB.NAME,
    waitForConnections: true,
    connectionLimit: 30,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000,
    compress: true,
    timezone: '+05:30',
    dateStrings: true
  };

  if (env.DB.SSL || (env.DB.HOST && (env.DB.HOST.includes('tidbcloud.com') || env.DB.HOST.includes('aws.')))) {
    poolConfig.ssl = {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: false
    };
  }

  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const testPool = mysql.createPool(poolConfig);
      const connection = await testPool.getConnection();
      await connection.ping();
      connection.release();

      pool = testPool;
      dbEngine = 'mysql';
      console.log(`[Database] 🔒 Connected successfully to Permanent TiDB Cloud Database: ${env.DB.NAME} on ${env.DB.HOST}:${env.DB.PORT}`);
      
      // Auto-bootstrap schema in MySQL/TiDB if missing and ensure migrations run unconditionally
      try {
        await testPool.query('SELECT 1 FROM users LIMIT 1');
      } catch (_) {
        await bootstrapMysqlSchema(testPool);
      }
      await ensureDatabaseSchemaMigrations(testPool);
      await ensureDatabaseIndexes(testPool);
      await ensureFlashFreeRidesSchema(testPool);
      await ensureSettlementsSchema(testPool);
      await ensureDefaultDemoAccounts(testPool);

      return { engine: 'mysql', pool };
    } catch (mysqlErr) {
      console.warn(`[Database Attempt ${attempt}/${maxRetries}] TiDB Cloud connection notice (${mysqlErr.message}). Retrying in 2s...`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000));
      } else {
        console.error('[Database Fatal] TiDB Cloud connection failed after 5 retries.');
        throw new Error(`Failed to connect to TiDB Cloud: ${mysqlErr.message}`);
      }
    }
  }
}

/**
 * Bootstraps MySQL/TiDB tables and master admin if missing (Non-destructive)
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
        is_core_member BOOLEAN DEFAULT FALSE,
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
        vehicle_number VARCHAR(30) DEFAULT NULL,
        vehicle_model VARCHAR(100) NOT NULL,
        license_number VARCHAR(50) DEFAULT NULL,
        license_doc_url VARCHAR(500) DEFAULT NULL,
        rc_doc_url VARCHAR(500) DEFAULT NULL,
        college_id_doc_url VARCHAR(500) DEFAULT NULL,
        rejection_reason VARCHAR(500) DEFAULT NULL,
        verification_status VARCHAR(30) DEFAULT 'PENDING',
        rating DECIMAL(3, 2) DEFAULT 5.00,
        total_ratings_count INT DEFAULT 0,
        total_rides INT DEFAULT 0,
        is_core_member BOOLEAN DEFAULT FALSE,
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
        is_scheduled BOOLEAN DEFAULT FALSE,
        scheduled_time DATETIME DEFAULT NULL,
        is_dispatched BOOLEAN DEFAULT FALSE,
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
        gateway_response LONGTEXT DEFAULT NULL,
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
        total_fare DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        rider_earning DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        company_earning DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        controller_earning DECIMAL(10, 2) DEFAULT 0.00,
        applied_rule_description VARCHAR(255) DEFAULT NULL,
        gross_fare DECIMAL(10, 2) DEFAULT NULL,
        platform_fee DECIMAL(10, 2) DEFAULT NULL,
        controller_fee DECIMAL(10, 2) DEFAULT 0.00,
        net_earning DECIMAL(10, 2) DEFAULT NULL,
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

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS daily_duty_controllers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        core_member_id INT NOT NULL,
        payout_status VARCHAR(30) DEFAULT 'PENDING',
        notes VARCHAR(255) DEFAULT NULL,
        assigned_by INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (core_member_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS cancellation_penalties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ride_id INT NOT NULL,
        customer_id INT NOT NULL,
        rider_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
        rider_upi_id VARCHAR(100) DEFAULT '',
        rider_name VARCHAR(100) DEFAULT '',
        status VARCHAR(30) NOT NULL DEFAULT 'UNPAID',
        payment_reference VARCHAR(150) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        waived_by INT DEFAULT NULL,
        paid_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cp_customer_status (customer_id, status),
        INDEX idx_cp_rider_id (rider_id),
        INDEX idx_cp_ride_id (ride_id),
        INDEX idx_cp_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS daily_shift_settlements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rider_id INT NOT NULL,
        date DATE NOT NULL,
        total_trips INT DEFAULT 0,
        gross_fare DECIMAL(10, 2) DEFAULT 0.00,
        company_due DECIMAL(10, 2) DEFAULT 0.00,
        controller_due DECIMAL(10, 2) DEFAULT 0.00,
        total_commission_due DECIMAL(10, 2) DEFAULT 0.00,
        rider_net_earnings DECIMAL(10, 2) DEFAULT 0.00,
        status VARCHAR(30) NOT NULL DEFAULT 'UNSETTLED',
        utr_reference VARCHAR(150) DEFAULT NULL,
        rejection_reason VARCHAR(255) DEFAULT NULL,
        submitted_at DATETIME DEFAULT NULL,
        approved_at DATETIME DEFAULT NULL,
        approved_by INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_dss_rider_date (rider_id, date),
        INDEX idx_dss_rider (rider_id),
        INDEX idx_dss_date (date),
        INDEX idx_dss_status (status)
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

    // Ensure document and image columns support large Base64 strings for persistent storage
    try {
      await targetPool.query('ALTER TABLE rider_profiles MODIFY COLUMN license_doc_url MEDIUMTEXT;');
      await targetPool.query('ALTER TABLE rider_profiles MODIFY COLUMN rc_doc_url MEDIUMTEXT;');
      await targetPool.query('ALTER TABLE rider_profiles MODIFY COLUMN college_id_doc_url MEDIUMTEXT;');
      await targetPool.query('ALTER TABLE users MODIFY COLUMN profile_image MEDIUMTEXT;');
    } catch (_) {}

    await ensureDatabaseSchemaMigrations(targetPool);
  } catch (err) {
    console.warn('[Database Warning] MySQL bootstrap notice:', err.message);
  }
}

/**
 * Ensures all incremental columns and migrations are applied on every boot
 */
async function ensureDatabaseSchemaMigrations(targetPool) {
  const migrations = [
    'ALTER TABLE rider_earnings ADD COLUMN total_fare DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER ride_id;',
    'ALTER TABLE rider_earnings ADD COLUMN rider_earning DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER total_fare;',
    'ALTER TABLE rider_earnings ADD COLUMN company_earning DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER rider_earning;',
    'ALTER TABLE rider_earnings ADD COLUMN controller_earning DECIMAL(10, 2) DEFAULT 0.00 AFTER company_earning;',
    'ALTER TABLE rider_earnings ADD COLUMN applied_rule_description VARCHAR(255) DEFAULT NULL AFTER controller_earning;',
    'ALTER TABLE payments ADD COLUMN gateway_response LONGTEXT DEFAULT NULL AFTER transaction_reference;',
    'ALTER TABLE users ADD COLUMN is_core_member BOOLEAN DEFAULT FALSE AFTER profile_image;',
    'ALTER TABLE rider_profiles ADD COLUMN is_core_member BOOLEAN DEFAULT FALSE AFTER total_rides;',
    'ALTER TABLE rides ADD COLUMN via_address VARCHAR(500) DEFAULT NULL AFTER pickup_address;',
    'ALTER TABLE rides ADD COLUMN via_latitude DECIMAL(10, 8) DEFAULT NULL AFTER via_address;',
    'ALTER TABLE rides ADD COLUMN via_longitude DECIMAL(11, 8) DEFAULT NULL AFTER via_latitude;',
    'ALTER TABLE rides ADD COLUMN waiting_minutes INT DEFAULT 0 AFTER final_fare;',
    'ALTER TABLE rides ADD COLUMN waiting_fare DECIMAL(10, 2) DEFAULT 0.00 AFTER waiting_minutes;',
    'ALTER TABLE rides ADD COLUMN is_waiting BOOLEAN DEFAULT FALSE AFTER waiting_fare;',
    'ALTER TABLE rides ADD COLUMN waiting_started_at DATETIME DEFAULT NULL AFTER is_waiting;',
    'ALTER TABLE rider_profiles ADD COLUMN upi_id VARCHAR(100) DEFAULT NULL AFTER license_number;',
    'ALTER TABLE rides ADD COLUMN is_scheduled BOOLEAN DEFAULT FALSE AFTER is_outside;',
    'ALTER TABLE rides ADD COLUMN scheduled_time DATETIME DEFAULT NULL AFTER is_scheduled;',
    'ALTER TABLE rides ADD COLUMN is_dispatched BOOLEAN DEFAULT FALSE AFTER scheduled_time;'
  ];

  for (const sql of migrations) {
    try {
      await targetPool.query(sql);
    } catch (_) {}
  }
}

/**
 * Ensures optimal performance indexes exist on high-traffic tables
 */
async function ensureDatabaseIndexes(targetPool) {
  const indexList = [
    { table: 'rides', name: 'idx_rides_status', cols: 'status' },
    { table: 'rides', name: 'idx_rides_customer_id', cols: 'customer_id' },
    { table: 'rides', name: 'idx_rides_rider_id', cols: 'rider_id' },
    { table: 'rides', name: 'idx_rides_created_at', cols: 'created_at' },
    { table: 'rides', name: 'idx_rides_requested_at', cols: 'requested_at' },
    { table: 'rides', name: 'idx_rides_completed_at', cols: 'completed_at' },
    { table: 'rides', name: 'idx_rides_is_outside', cols: 'is_outside' },
    { table: 'rides', name: 'idx_rides_vehicle_type', cols: 'vehicle_type' },
    { table: 'rides', name: 'idx_rides_code', cols: 'ride_code' },
    { table: 'rides', name: 'idx_rides_status_created', cols: 'status, created_at' },

    { table: 'rider_earnings', name: 'idx_re_rider_id', cols: 'rider_id' },
    { table: 'rider_earnings', name: 'idx_re_ride_id', cols: 'ride_id' },
    { table: 'rider_earnings', name: 'idx_re_created_at', cols: 'created_at' },
    { table: 'rider_earnings', name: 'idx_re_settlement_status', cols: 'settlement_status' },
    { table: 'rider_earnings', name: 'idx_re_rider_created', cols: 'rider_id, created_at' },

    { table: 'users', name: 'idx_users_role', cols: 'role' },
    { table: 'users', name: 'idx_users_status', cols: 'status' },
    { table: 'users', name: 'idx_users_is_core', cols: 'is_core_member' },
    { table: 'users', name: 'idx_users_phone', cols: 'phone' },
    { table: 'users', name: 'idx_users_created_at', cols: 'created_at' },

    { table: 'rider_profiles', name: 'idx_rp_user_id', cols: 'user_id' },
    { table: 'rider_profiles', name: 'idx_rp_online_verif', cols: 'is_online, verification_status' },
    { table: 'rider_profiles', name: 'idx_rp_is_core', cols: 'is_core_member' },

    { table: 'payments', name: 'idx_payments_ride_id', cols: 'ride_id' },
    { table: 'payments', name: 'idx_payments_customer_id', cols: 'customer_id' },
    { table: 'payments', name: 'idx_payments_status', cols: 'payment_status' },
    { table: 'payments', name: 'idx_payments_created_at', cols: 'created_at' },

    { table: 'ratings', name: 'idx_ratings_rider_id', cols: 'rider_id' },
    { table: 'ratings', name: 'idx_ratings_customer_id', cols: 'customer_id' },

    { table: 'notifications', name: 'idx_notif_user_read', cols: 'user_id, is_read, created_at' },
    { table: 'daily_duty_controllers', name: 'idx_ddc_date', cols: 'date' },
    { table: 'daily_duty_controllers', name: 'idx_ddc_core_member', cols: 'core_member_id' },
    { table: 'route_fares', name: 'idx_rf_active', cols: 'is_active' }
  ];

  await Promise.all(
    indexList.map(async (idx) => {
      try {
        await targetPool.query(`CREATE INDEX ${idx.name} ON ${idx.table} (${idx.cols})`);
      } catch (_) {}
    })
  );
}

/**
 * Ensures flash_free_rides table and columns exist in TiDB / MySQL
 */
async function ensureFlashFreeRidesSchema(targetPool) {
  try {
    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS flash_free_rides (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pickup_location VARCHAR(255) NOT NULL,
        destination_location VARCHAR(255) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
        created_by_admin_id INT DEFAULT NULL,
        claimed_by_user_id INT DEFAULT NULL,
        ride_id INT DEFAULT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_flash_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure promotional columns exist on rides
    try {
      await targetPool.query('ALTER TABLE rides ADD COLUMN is_free_ride BOOLEAN DEFAULT FALSE');
    } catch (_) {}
    try {
      await targetPool.query('ALTER TABLE rides ADD COLUMN is_core_only BOOLEAN DEFAULT FALSE');
    } catch (_) {}
  } catch (err) {
    console.warn('[Database] Flash free rides schema notice:', err.message);
  }
}

/**
 * Ensures daily shift settlements, duty controllers, and system settings tables exist in TiDB / MySQL
 */
async function ensureSettlementsSchema(targetPool) {
  try {
    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        \`key\` VARCHAR(100) PRIMARY KEY,
        \`value\` TEXT NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await targetPool.query(`
        INSERT IGNORE INTO system_settings (\`key\`, \`value\`, description) VALUES
          ('ADMIN_SETTLEMENT_UPI_ID', 'papido.admin@okaxis', 'Default Admin UPI ID for driver shift commission collection'),
          ('ADMIN_SETTLEMENT_NAME', 'Papido Campus Operations', 'Default Receiver Name for Admin UPI'),
          ('ADMIN_SETTLEMENT_AUTO_LOCK', 'true', 'Whether unsettled shift dues auto-lock driver online status')
      `);
    } catch (_) {}

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS daily_duty_controllers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        core_member_id INT NOT NULL,
        payout_status VARCHAR(30) DEFAULT 'PENDING',
        notes VARCHAR(255) DEFAULT NULL,
        assigned_by INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ddc_date (date),
        INDEX idx_ddc_core (core_member_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS daily_shift_settlements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rider_id INT NOT NULL,
        date DATE NOT NULL,
        total_trips INT DEFAULT 0,
        gross_fare DECIMAL(10, 2) DEFAULT 0.00,
        company_due DECIMAL(10, 2) DEFAULT 0.00,
        controller_due DECIMAL(10, 2) DEFAULT 0.00,
        total_commission_due DECIMAL(10, 2) DEFAULT 0.00,
        rider_net_earnings DECIMAL(10, 2) DEFAULT 0.00,
        status VARCHAR(30) NOT NULL DEFAULT 'UNSETTLED',
        utr_reference VARCHAR(150) DEFAULT NULL,
        rejection_reason VARCHAR(255) DEFAULT NULL,
        submitted_at DATETIME DEFAULT NULL,
        approved_at DATETIME DEFAULT NULL,
        approved_by INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_dss_rider_date (rider_id, date),
        INDEX idx_dss_rider (rider_id),
        INDEX idx_dss_date (date),
        INDEX idx_dss_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err) {
    console.warn('[Database] Settlements schema bootstrap notice:', err.message);
  }
}

/**
 * Ensures demo / test accounts are active with Password@123
 */
async function ensureDefaultDemoAccounts(targetPool) {
  try {
    const bcrypt = require('bcryptjs');
    const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

    const accounts = [
      {
        name: 'Papido Master Admin',
        email: 'admin@papido.com',
        phone: '+919876543210',
        gender: 'OTHER',
        role: 'ADMIN',
        isCoreMember: 1
      },
      {
        name: 'ANANYA SEN',
        email: 'customer.ananya@papido.com',
        phone: '+919876543211',
        gender: 'FEMALE',
        role: 'CUSTOMER',
        isCoreMember: 0
      },
      {
        name: 'ANANYA SEN',
        email: 'ananyasen@papido.com',
        phone: '+919876543212',
        gender: 'FEMALE',
        role: 'CUSTOMER',
        isCoreMember: 0
      },
      {
        name: 'ROHAN MEHTA',
        email: 'customer.rohan@papido.com',
        phone: '+919876543213',
        gender: 'MALE',
        role: 'CUSTOMER',
        isCoreMember: 0
      },
      {
        name: 'RAHUL SHARMA',
        email: 'rider.rahul@papido.com',
        phone: '+919876543214',
        gender: 'MALE',
        role: 'RIDER',
        vehicleType: 'BIKE',
        vehicleModel: 'Hero Splendor Plus',
        vehicleNumber: 'PY-01-BK-1001',
        isCoreMember: 1
      },
      {
        name: 'SANAULLA K',
        email: 'sanaullak294@gmail.com',
        phone: '+919876543215',
        gender: 'MALE',
        role: 'RIDER',
        vehicleType: 'SCOOTER',
        vehicleModel: 'Honda Activa 6G',
        vehicleNumber: 'PY-01-SC-2002',
        isCoreMember: 1
      },
      {
        name: 'PRIYA SHARMA',
        email: 'rider.priya@papido.com',
        phone: '+919876543216',
        gender: 'FEMALE',
        role: 'RIDER',
        vehicleType: 'SCOOTER',
        vehicleModel: 'TVS Jupiter 125',
        vehicleNumber: 'PY-01-FM-3003',
        isCoreMember: 1
      }
    ];

    for (const acc of accounts) {
      try {
        const [existing] = await targetPool.query('SELECT id, password_hash, role FROM users WHERE LOWER(email) = LOWER(?)', [acc.email]);
        let userId = null;

        if (!existing || existing.length === 0) {
          const [ins] = await targetPool.query(
            `INSERT INTO users (name, email, phone, gender, password_hash, role, status, is_core_member)
             VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
            [acc.name, acc.email.toLowerCase(), acc.phone, acc.gender, defaultPasswordHash, acc.role, acc.isCoreMember || 0]
          );
          userId = ins.insertId;
        } else {
          userId = existing[0].id;
          await targetPool.query('UPDATE users SET password_hash = ?, status = \'ACTIVE\' WHERE id = ?', [defaultPasswordHash, userId]);
        }

        if (acc.role === 'CUSTOMER') {
          const [custProf] = await targetPool.query('SELECT id FROM customer_profiles WHERE user_id = ?', [userId]);
          if (!custProf || custProf.length === 0) {
            await targetPool.query('INSERT INTO customer_profiles (user_id, wallet_balance) VALUES (?, 100.00)', [userId]);
          }
        } else if (acc.role === 'RIDER') {
          const [riderProf] = await targetPool.query('SELECT id FROM rider_profiles WHERE user_id = ?', [userId]);
          if (!riderProf || riderProf.length === 0) {
            await targetPool.query(
              `INSERT INTO rider_profiles (user_id, vehicle_type, vehicle_model, vehicle_number, license_number, verification_status, is_online, is_core_member, upi_id)
               VALUES (?, ?, ?, ?, ?, 'APPROVED', 1, ?, ?)`,
              [userId, acc.vehicleType || 'BIKE', acc.vehicleModel || 'Campus Bike', acc.vehicleNumber || `PY-01-DM-${userId}`, acc.licenseNumber || `DL-PY-DM-${userId}`, acc.isCoreMember || 0, `${acc.phone}@upi`]
            );
          } else {
            await targetPool.query('UPDATE rider_profiles SET is_online = 1, verification_status = \'APPROVED\' WHERE user_id = ?', [userId]);
          }
        }
      } catch (accErr) {
        console.warn(`[Database] Seed account notice for ${acc.email}:`, accErr.message);
      }
    }
  } catch (err) {
    console.warn('[Database] Demo accounts seeding notice:', err.message);
  }
}

/**
 * Universal Query Executor for TiDB / MySQL
 */
async function query(sql, params = []) {
  if (!pool) {
    await initializeDatabase();
  }

  const [rows] = await pool.query(sql, params);
  return rows;
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
  if (!pool) {
    await initializeDatabase();
  }

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

module.exports = {
  initializeDatabase,
  query,
  queryOne,
  transaction,
  getEngine: () => 'mysql',
  isMySQL: true,
  isSqlite: false,
  get pool() { return pool; }
};
