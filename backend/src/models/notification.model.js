const db = require('../config/database');

const NotificationModel = {
  async create({ userId, title, message, type = 'RIDE_UPDATE', data = null }) {
    const result = await db.query(
      'INSERT INTO notifications (user_id, title, message, type, data, is_read) VALUES (?, ?, ?, ?, ?, 0)',
      [userId, title, message, type, data ? JSON.stringify(data) : null]
    );
    return db.queryOne('SELECT * FROM notifications WHERE id = ?', [result.insertId]);
  },

  async getUserNotifications(userId, { limit = 20, offset = 0 } = {}) {
    return db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?',
      [userId, Number(limit), Number(offset)]
    );
  },

  async getUnreadCount(userId) {
    const row = await db.queryOne(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return row ? row.count : 0;
  },

  async markAsRead(notificationId, userId) {
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return true;
  },

  async markAllAsRead(userId) {
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [userId]
    );
    return true;
  }
};

module.exports = NotificationModel;
