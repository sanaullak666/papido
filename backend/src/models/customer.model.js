const db = require('../config/database');

const CustomerModel = {
  async findByUserId(userId) {
    const sql = `
      SELECT cp.*, u.name, u.email, u.phone, u.status as user_status, u.suspension_reason, u.profile_image
      FROM customer_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.user_id = ?
    `;
    return db.queryOne(sql, [userId]);
  },

  async findById(profileId) {
    const sql = `
      SELECT cp.*, u.name, u.email, u.phone, u.status as user_status, u.suspension_reason, u.profile_image
      FROM customer_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.id = ?
    `;
    return db.queryOne(sql, [profileId]);
  },

  async createProfile({ userId, walletBalance = 0.00 }) {
    const result = await db.query(
      'INSERT INTO customer_profiles (user_id, wallet_balance) VALUES (?, ?)',
      [userId, walletBalance]
    );
    return this.findById(result.insertId);
  },

  async updateRating(userId, newRating) {
    const profile = await this.findByUserId(userId);
    if (!profile) return null;

    const currentCount = profile.total_ratings_count || 0;
    const currentRating = parseFloat(profile.rating) || 5.0;
    const updatedCount = currentCount + 1;
    const updatedRating = Number(((currentRating * currentCount + newRating) / updatedCount).toFixed(2));

    await db.query(
      'UPDATE customer_profiles SET rating = ?, total_ratings_count = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [updatedRating, updatedCount, userId]
    );
    return this.findByUserId(userId);
  },

  async incrementRideCount(userId) {
    await db.query(
      'UPDATE customer_profiles SET total_rides = total_rides + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [userId]
    );
  },

  async updateWalletBalance(userId, amount) {
    await db.query(
      'UPDATE customer_profiles SET wallet_balance = wallet_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [amount, userId]
    );
    return this.findByUserId(userId);
  },

  async listAll({ search, limit = 20, offset = 0 }) {
    let sql = `
      SELECT cp.*, u.name, u.email, u.phone, u.status as user_status, u.suspension_reason, u.profile_image, u.created_at as joined_at
      FROM customer_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY cp.id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    return db.query(sql, params);
  },

  async countAll({ search }) {
    let sql = `
      SELECT COUNT(*) as total
      FROM customer_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const row = await db.queryOne(sql, params);
    return row ? row.total : 0;
  }
};

module.exports = CustomerModel;
