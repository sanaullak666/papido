const db = require('../config/database');

const UserModel = {
  async findById(id) {
    return db.queryOne('SELECT id, name, email, phone, gender, role, status, suspension_reason, profile_image, created_at, updated_at FROM users WHERE id = ?', [id]);
  },

  async findByEmail(email) {
    return db.queryOne('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  },

  async findByPhone(phone) {
    return db.queryOne('SELECT * FROM users WHERE phone = ?', [phone]);
  },

  async create({ name, email, phone, gender = 'OTHER', passwordHash, role, status = 'ACTIVE', profileImage = null, suspensionReason = null }) {
    const result = await db.query(
      'INSERT INTO users (name, email, phone, gender, password_hash, role, status, suspension_reason, profile_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email.toLowerCase(), phone, gender || 'OTHER', passwordHash, role, status, suspensionReason, profileImage]
    );
    return this.findById(result.insertId);
  },

  async updateStatus(id, status, suspensionReason = null) {
    await db.query(
      'UPDATE users SET status = ?, suspension_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, suspensionReason, id]
    );
    return this.findById(id);
  },

  async updateProfile(id, { name, phone, gender, profileImage }) {
    await db.query(
      'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), gender = COALESCE(?, gender), profile_image = COALESCE(?, profile_image), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name || null, phone || null, gender || null, profileImage || null, id]
    );
    return this.findById(id);
  },

  async updatePassword(id, passwordHash) {
    await db.query('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [passwordHash, id]);
    return this.findById(id);
  },

  async listAll({ role, status, search, limit = 20, offset = 0 }) {
    let sql = 'SELECT id, name, email, phone, gender, role, status, suspension_reason, profile_image, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    return db.query(sql, params);
  },

  async countAll({ role, status, search }) {
    let sql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const row = await db.queryOne(sql, params);
    return row ? row.total : 0;
  }
};

module.exports = UserModel;
