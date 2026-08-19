const db = require('../src/config/database');

async function migrate() {
  try {
    console.log('[Migration] Checking and adding gender and female_rider_only columns...');

    // 1. Add gender column to users table if it doesn't exist
    try {
      await db.query("ALTER TABLE users ADD COLUMN gender ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL DEFAULT 'OTHER' AFTER phone");
      console.log('[Migration] Added column `gender` to `users` table.');
    } catch (err) {
      if (err.message.includes('Duplicate column name') || err.message.includes('already exists')) {
        console.log('[Migration] `gender` column already exists in `users`.');
      } else {
        console.warn('[Migration] Note on users.gender:', err.message);
      }
    }

    // 2. Add female_rider_only column to rides table if it doesn't exist
    try {
      await db.query("ALTER TABLE rides ADD COLUMN female_rider_only BOOLEAN DEFAULT FALSE AFTER payment_method");
      console.log('[Migration] Added column `female_rider_only` to `rides` table.');
    } catch (err) {
      if (err.message.includes('Duplicate column name') || err.message.includes('already exists')) {
        console.log('[Migration] `female_rider_only` column already exists in `rides`.');
      } else {
        console.warn('[Migration] Note on rides.female_rider_only:', err.message);
      }
    }

    // 3. Set realistic genders for seed accounts
    await db.query("UPDATE users SET gender = 'FEMALE' WHERE email = 'customer.ananya@papido.com' OR name LIKE '%Ananya%' OR name LIKE '%Priya%' OR name LIKE '%Sneha%'");
    await db.query("UPDATE users SET gender = 'MALE' WHERE email = 'rider.rahul@papido.com' OR name LIKE '%Rahul%' OR name LIKE '%hafiz%' OR name LIKE '%Vikram%'");
    
    // Check users
    const users = await db.query("SELECT id, name, email, role, gender FROM users LIMIT 10");
    console.log('[Migration] Sample Users:', users);

    process.exit(0);
  } catch (err) {
    console.error('[Migration] Error:', err);
    process.exit(1);
  }
}

migrate();
