const db = require('../config/database');

const AuditModel = {
  async log({ userId = null, action, entityType, entityId = null, details = null, ipAddress = null, userAgent = null }) {
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          action,
          entityType,
          entityId,
          details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null,
          ipAddress,
          userAgent
        ]
      );
    } catch (err) {
      console.error('[Audit Log Error]', err.message);
    }
  },

  async list({ limit = 50, offset = 0, action, entityType }) {
    let sql = 'SELECT a.*, u.name as user_name, u.email as user_email FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id WHERE 1=1';
    const params = [];

    if (action) {
      sql += ' AND a.action = ?';
      params.push(action);
    }
    if (entityType) {
      sql += ' AND a.entity_type = ?';
      params.push(entityType);
    }

    sql += ' ORDER BY a.id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    return db.query(sql, params);
  }
};

module.exports = AuditModel;
