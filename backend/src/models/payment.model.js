const db = require('../config/database');

const PaymentModel = {
  /**
   * Creates or initializes a ride payment record
   */
  async create({
    rideId,
    customerId,
    riderId = null,
    amount,
    paymentMethod = 'CASH',
    paymentStatus = 'COMPLETED',
    orderId = null,
    gatewayPaymentId = null,
    transactionReference = null,
    gateway = 'UPI',
    currency = 'INR',
    utr = null,
    gatewayResponse = null,
    paidAt = null
  }) {
    // If an existing payment entry exists for this ride, update it
    const existing = await this.findByRideId(rideId);
    if (existing) {
      await db.query(`
        UPDATE payments SET
          customer_id = COALESCE(?, customer_id),
          rider_id = COALESCE(?, rider_id),
          amount = ?,
          payment_method = ?,
          payment_status = ?,
          order_id = COALESCE(?, order_id),
          gateway_payment_id = COALESCE(?, gateway_payment_id),
          transaction_reference = COALESCE(?, transaction_reference),
          gateway = COALESCE(?, gateway),
          currency = COALESCE(?, currency),
          utr = COALESCE(?, utr),
          gateway_response = COALESCE(?, gateway_response),
          paid_at = COALESCE(?, paid_at)
        WHERE id = ?
      `, [
        customerId, riderId, amount, paymentMethod, paymentStatus,
        orderId, gatewayPaymentId, transactionReference || orderId,
        gateway, currency, utr,
        gatewayResponse ? (typeof gatewayResponse === 'string' ? gatewayResponse : JSON.stringify(gatewayResponse)) : null,
        paidAt,
        existing.id
      ]);
      return this.findById(existing.id);
    }

    const result = await db.query(
      `INSERT INTO payments (
        ride_id, customer_id, rider_id, amount, order_id, gateway_payment_id,
        payment_method, payment_status, transaction_reference, gateway, currency, utr,
        gateway_response, paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rideId,
        customerId,
        riderId,
        amount,
        orderId,
        gatewayPaymentId,
        paymentMethod,
        paymentStatus,
        transactionReference || orderId || `TXN-${Date.now()}-${rideId}`,
        gateway,
        currency,
        utr,
        gatewayResponse ? (typeof gatewayResponse === 'string' ? gatewayResponse : JSON.stringify(gatewayResponse)) : null,
        paidAt
      ]
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    return db.queryOne('SELECT * FROM payments WHERE id = ?', [id]);
  },

  async findByRideId(rideId) {
    return db.queryOne('SELECT * FROM payments WHERE ride_id = ? ORDER BY id DESC LIMIT 1', [rideId]);
  },

  async findByOrderId(orderId) {
    if (!orderId) return null;
    return db.queryOne('SELECT * FROM payments WHERE order_id = ?', [orderId]);
  },

  /**
   * Updates payment record state upon webhook confirmation
   */
  async updateStatusByOrderId(orderId, {
    status,
    utr = null,
    gatewayPaymentId = null,
    gatewayResponse = null,
    paidAt = null,
    failedAt = null,
    failureReason = null
  }) {
    const serializedResponse = gatewayResponse
      ? (typeof gatewayResponse === 'string' ? gatewayResponse : JSON.stringify(gatewayResponse))
      : null;

    await db.query(`
      UPDATE payments SET
        payment_status = ?,
        utr = COALESCE(?, utr),
        gateway_payment_id = COALESCE(?, gateway_payment_id),
        gateway_response = COALESCE(?, gateway_response),
        paid_at = COALESCE(?, paid_at),
        failed_at = COALESCE(?, failed_at),
        failure_reason = COALESCE(?, failure_reason)
      WHERE order_id = ?
    `, [
      status,
      utr,
      gatewayPaymentId,
      serializedResponse,
      paidAt,
      failedAt,
      failureReason,
      orderId
    ]);

    return this.findByOrderId(orderId);
  },

  /**
   * Record every payment attempt in payment_transactions table for full traceability
   */
  async recordTransactionAttempt({
    paymentType,
    referenceId,
    orderId,
    gatewayPaymentId = null,
    gateway = 'UPI',
    amount,
    currency = 'INR',
    status = 'INITIATED',
    checkoutUrl = null,
    idempotencyKey = null,
    metadata = {}
  }) {
    const serializedMetadata = metadata
      ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata))
      : null;

    try {
      const result = await db.query(`
        INSERT INTO payment_transactions (
          payment_type, reference_id, order_id, gateway_payment_id, gateway,
          amount, currency, status, checkout_url, idempotency_key, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          gateway_payment_id = COALESCE(VALUES(gateway_payment_id), gateway_payment_id),
          status = VALUES(status),
          checkout_url = COALESCE(VALUES(checkout_url), checkout_url),
          updated_at = CURRENT_TIMESTAMP
      `, [
        paymentType,
        referenceId,
        orderId,
        gatewayPaymentId,
        gateway,
        amount,
        currency,
        status,
        checkoutUrl,
        idempotencyKey,
        serializedMetadata
      ]);
      return this.findTransactionByOrderId(orderId);
    } catch (err) {
      console.warn('[PaymentModel] Notice recording transaction attempt:', err.message);
      return { order_id: orderId, status };
    }
  },

  async findTransactionByOrderId(orderId) {
    return db.queryOne('SELECT * FROM payment_transactions WHERE order_id = ?', [orderId]);
  },

  async updateTransactionStatus(orderId, {
    status,
    utr = null,
    gatewayPaymentId = null,
    rawPayload = null,
    completedAt = null
  }) {
    const serializedPayload = rawPayload
      ? (typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload))
      : null;

    await db.query(`
      UPDATE payment_transactions SET
        status = ?,
        utr = COALESCE(?, utr),
        gateway_payment_id = COALESCE(?, gateway_payment_id),
        raw_webhook_payload = COALESCE(?, raw_webhook_payload),
        completed_at = COALESCE(?, completed_at),
        updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ?
    `, [
      status,
      utr,
      gatewayPaymentId,
      serializedPayload,
      completedAt || (status === 'SUCCESS' ? new Date() : null),
      orderId
    ]);

    return this.findTransactionByOrderId(orderId);
  },

  async getTransactionsForReference(paymentType, referenceId) {
    return db.query(
      'SELECT * FROM payment_transactions WHERE payment_type = ? AND reference_id = ? ORDER BY id DESC',
      [paymentType, referenceId]
    );
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
