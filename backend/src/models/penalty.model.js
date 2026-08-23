const db = require('../config/database');

const PenaltyModel = {
  async create({
    rideId,
    customerId,
    riderId,
    amount = 15.00,
    riderUpiId = '',
    riderName = '',
    notes = 'Cancelled by passenger after driver reached pickup point'
  }) {
    const result = await db.query(
      `INSERT INTO cancellation_penalties (
        ride_id, customer_id, rider_id, amount, rider_upi_id,
        rider_name, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, 'UNPAID', ?)`,
      [rideId, customerId, riderId, amount, riderUpiId, riderName, notes]
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const sql = `
      SELECT cp.*,
             r.ride_code, r.pickup_address, r.destination_address,
             c.name as customer_name, c.phone as customer_phone,
             rd.name as db_rider_name, rd.phone as rider_phone
      FROM cancellation_penalties cp
      LEFT JOIN rides r ON cp.ride_id = r.id
      LEFT JOIN users c ON cp.customer_id = c.id
      LEFT JOIN users rd ON cp.rider_id = rd.id
      WHERE cp.id = ?
    `;
    return db.queryOne(sql, [id]);
  },

  async findByRideId(rideId) {
    return db.queryOne('SELECT * FROM cancellation_penalties WHERE ride_id = ? ORDER BY id DESC LIMIT 1', [rideId]);
  },

  async getPendingPenaltyForCustomer(customerId) {
    const sql = `
      SELECT cp.*,
             r.ride_code, r.pickup_address, r.destination_address,
             rd.name as rider_name_full, rd.phone as rider_phone,
             rp.upi_id as profile_upi_id
      FROM cancellation_penalties cp
      LEFT JOIN rides r ON cp.ride_id = r.id
      LEFT JOIN users rd ON cp.rider_id = rd.id
      LEFT JOIN rider_profiles rp ON cp.rider_id = rp.user_id
      WHERE cp.customer_id = ? AND cp.status = 'UNPAID'
      ORDER BY cp.id DESC
      LIMIT 1
    `;
    return db.queryOne(sql, [customerId]);
  },

  async markAsPaid(id, paymentReference = null) {
    await db.query(
      `UPDATE cancellation_penalties
       SET status = 'PAID', paid_at = CURRENT_TIMESTAMP, payment_reference = ?
       WHERE id = ?`,
      [paymentReference, id]
    );
    return this.findById(id);
  },

  async waivePenalty(id, waivedBy = null, notes = null) {
    await db.query(
      `UPDATE cancellation_penalties
       SET status = 'WAIVED', waived_by = ?, notes = COALESCE(?, notes)
       WHERE id = ?`,
      [waivedBy, notes, id]
    );
    return this.findById(id);
  },

  async listAll({ status = null, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT cp.*,
             r.ride_code, r.pickup_address, r.destination_address,
             c.name as customer_name, c.phone as customer_phone,
             rd.name as full_rider_name, rd.phone as rider_phone
      FROM cancellation_penalties cp
      LEFT JOIN rides r ON cp.ride_id = r.id
      LEFT JOIN users c ON cp.customer_id = c.id
      LEFT JOIN users rd ON cp.rider_id = rd.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      sql += ' AND cp.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY cp.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    return db.query(sql, params);
  }
};

module.exports = PenaltyModel;
