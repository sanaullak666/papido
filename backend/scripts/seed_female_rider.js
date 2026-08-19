const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    const existing = await db.queryOne("SELECT * FROM users WHERE email = 'rider.priya@papido.com'");
    const hash = await bcrypt.hash('Password@123', 10);
    
    let userId;
    if (!existing) {
      const res = await db.query(
        "INSERT INTO users (name, email, phone, gender, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'RIDER', 'ACTIVE')",
        ['Priya Sharma (Lady Rider)', 'rider.priya@papido.com', '+91 98765 43219', 'FEMALE', hash]
      );
      userId = res.insertId;
      console.log('[Seed] Created Female Rider user:', userId);

      await db.query(
        `INSERT INTO rider_profiles (user_id, vehicle_type, vehicle_number, vehicle_model, license_number, verification_status, is_online, current_latitude, current_longitude)
         VALUES (?, 'BIKE', 'KA-05-LK-9988', 'Honda Activa 6G (Pink/Silver)', 'DL-KA-2024-9988', 'APPROVED', 1, 12.971598, 77.594566)`,
        [userId]
      );
      console.log('[Seed] Created Female Rider profile for:', userId);
    } else {
      userId = existing.id;
      await db.query("UPDATE users SET gender = 'FEMALE', status = 'ACTIVE' WHERE id = ?", [userId]);
      await db.query("UPDATE rider_profiles SET verification_status = 'APPROVED', is_online = 1 WHERE user_id = ?", [userId]);
      console.log('[Seed] Updated existing Female Rider:', userId);
    }

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error:', err);
    process.exit(1);
  }
}

seed();
