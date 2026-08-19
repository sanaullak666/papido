const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const env = require('./environment');

async function setupMySQL() {
  console.log(`[MySQL Setup] Connecting to MySQL server at ${env.DB.HOST}:${env.DB.PORT} with user '${env.DB.USER}'...`);

  let connection;
  try {
    // Connect without database selected first to create database
    connection = await mysql.createConnection({
      host: env.DB.HOST,
      port: env.DB.PORT,
      user: env.DB.USER,
      password: env.DB.PASSWORD,
      multipleStatements: true
    });

    console.log('[MySQL Setup] Connected to MySQL server successfully!');

    // 1. Create database
    console.log(`[MySQL Setup] Creating database '${env.DB.NAME}' if it does not exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.DB.NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${env.DB.NAME}\`;`);

    // 2. Read schema.sql and execute
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    console.log(`[MySQL Setup] Executing schema definitions from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('[MySQL Setup] Tables created successfully!');

    // 3. Read seed.sql and execute
    const seedPath = path.join(__dirname, '../../../database/seed.sql');
    console.log(`[MySQL Setup] Executing initial seed data from: ${seedPath}`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await connection.query(seedSql);
    console.log('[MySQL Setup] Seed data inserted successfully!');

    // 4. Verify tables
    const [tables] = await connection.query('SHOW TABLES;');
    console.log('\n[MySQL Setup] Existing tables in papido_db:');
    tables.forEach(row => {
      console.log(`  - ${Object.values(row)[0]}`);
    });

    // 5. Verify user count
    const [users] = await connection.query('SELECT id, name, email, role, status FROM users;');
    console.log('\n[MySQL Setup] Seeded Users:');
    users.forEach(u => {
      console.log(`  - #${u.id} [${u.role}] ${u.name} (${u.email}) - Status: ${u.status}`);
    });

    console.log('\n===============================================================');
    console.log('  🎉 MySQL WORKBENCH 8.0 READY & CONNECTED!');
    console.log(`  Host: ${env.DB.HOST}`);
    console.log(`  Port: ${env.DB.PORT}`);
    console.log(`  Database: ${env.DB.NAME}`);
    console.log(`  Username: ${env.DB.USER}`);
    console.log('===============================================================\n');

  } catch (err) {
    console.error('[MySQL Setup Error]:', err.message);
    throw err;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  setupMySQL().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}

module.exports = { setupMySQL };
