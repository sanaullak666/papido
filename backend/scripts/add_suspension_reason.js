const db = require('../src/config/database');

async function migrate() {
  try {
    if (db.isSqlite) {
      const tableInfo = await db.query("PRAGMA table_info(users)");
      const hasCol = tableInfo.some(c => c.name === 'suspension_reason');
      if (!hasCol) {
        await db.query("ALTER TABLE users ADD COLUMN suspension_reason TEXT DEFAULT NULL");
        console.log('Added suspension_reason column to SQLite users table.');
      } else {
        console.log('suspension_reason column already exists in SQLite users table.');
      }
    } else {
      const cols = await db.query("SHOW COLUMNS FROM users LIKE 'suspension_reason'");
      if (cols.length === 0) {
        await db.query("ALTER TABLE users ADD COLUMN suspension_reason VARCHAR(500) DEFAULT NULL AFTER status");
        console.log('Added suspension_reason column to MySQL users table.');
      } else {
        console.log('suspension_reason column already exists in MySQL users table.');
      }
    }
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
