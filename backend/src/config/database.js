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
    connectionLimit: env.DB.CONNECTION_LIMIT,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
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
      
      // Auto-bootstrap schema in MySQL/TiDB if tables do not exist (Non-destructive)
      await bootstrapMysqlSchema(testPool);

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

    // Ensure rider_earnings columns match models and reporting
    try {
      await targetPool.query('ALTER TABLE rider_earnings ADD COLUMN total_fare DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER ride_id;');
    } catch (_) {}
    try {
      await targetPool.query('ALTER TABLE rider_earnings ADD COLUMN rider_earning DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER total_fare;');
    } catch (_) {}
    try {
      await targetPool.query('ALTER TABLE rider_earnings ADD COLUMN company_earning DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER rider_earning;');
    } catch (_) {}
    try {
      await targetPool.query('ALTER TABLE rider_earnings ADD COLUMN controller_earning DECIMAL(10, 2) DEFAULT 0.00 AFTER company_earning;');
    } catch (_) {}
    try {
      await targetPool.query('ALTER TABLE rider_earnings ADD COLUMN applied_rule_description VARCHAR(255) DEFAULT NULL AFTER controller_earning;');
    } catch (_) {}

    // Ensure payments table has gateway_response column
    try {
      await targetPool.query('ALTER TABLE payments ADD COLUMN gateway_response LONGTEXT DEFAULT NULL AFTER transaction_reference;');
    } catch (_) {}
  } catch (err) {
    console.warn('[Database Warning] MySQL bootstrap notice:', err.message);
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
