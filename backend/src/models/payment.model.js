const db = require('../config/database');

const PaymentModel = {
  async create({
    rideId,
    customerId,
    amount,
    paymentMethod = 'CASH',
    paymentStatus = 'COMPLETED',
    transactionReference = null,
    gatewayResponse = null,
    paidAt = new Date()
  }) {
    const result = await db.query(
      `INSERT INTO payments (
        ride_id, customer_id, amount, payment_method, payment_status,
        transaction_reference, gateway_response, paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rideId, customerId, amount, paymentMethod, paymentStatus,
        transactionReference,
        gatewayResponse ? JSON.stringify(gatewayResponse) : null,
        paidAt
      ]
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    return db.queryOne('SELECT * FROM payments WHERE id = ?', [id]);
  },

  async findByRideId(rideId) {
    return db.queryOne('SELECT * FROM payments WHERE ride_id = ?', [rideId]);
  },

  async listAll({ customerId, paymentStatus, paymentMethod, limit = 20, offset = 0 }) {
    let sql = `
      SELECT p.*, r.ride_code, c.name as customer_name, c.email as customer_email,
             rd.name as rider_name
      FROM payments p
      JOIN rides r ON p.ride_id = r.id
      JOIN users c ON p.customer_id = c.id
      LEFT JOIN users rd ON r.rider_id = rd.id
      WHERE 1=1
    `;
    const params = [];

    if (customerId) {
      sql += ' AND p.customer_id = ?';
      params.push(customerId);
    }
    if (paymentStatus) {
      sql += ' AND p.payment_status = ?';
      params.push(paymentStatus);
    }
    if (paymentMethod) {
      sql += ' AND p.payment_method = ?';
      params.push(paymentMethod);
    }

    sql += ' ORDER BY p.id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    return db.query(sql, params);
  },

  async countAll({ customerId, paymentStatus, paymentMethod }) {
    let sql = 'SELECT COUNT(*) as total FROM payments WHERE 1=1';
    const params = [];

    if (customerId) {
      sql += ' AND customer_id = ?';
      params.push(customerId);
    }
    if (paymentStatus) {
      sql += ' AND payment_status = ?';
      params.push(paymentStatus);
    }
    if (paymentMethod) {
      sql += ' AND payment_method = ?';
      params.push(paymentMethod);
    }

    const row = await db.queryOne(sql, params);
    return row ? row.total : 0;
  }
};

module.exports = PaymentModel;
