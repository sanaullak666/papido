const db = require('../config/database');
const PaymentModel = require('../models/payment.model');
const RideModel = require('../models/ride.model');
const UserModel = require('../models/user.model');
const EarningModel = require('../models/earning.model');
const socketManager = require('../sockets/socketManager');
const crypto = require('crypto');

class PaymentService {
  /**
   * Helper to parse rideId from Order ID: PAPIDO-RIDE-<rideId>-<ts>-<suffix>
   */
  parseRideId(orderId) {
    if (!orderId || typeof orderId !== 'string') return null;
    const match = orderId.match(/^PAPIDO-RIDE-(\d+)-/i);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Helper to parse riderId and date from Settlement Order ID: PAPIDO-SETTLE-RIDER<riderId>-<date>-<ts>-<suffix>
   */
  parseSettlementInfo(orderId) {
    if (!orderId || typeof orderId !== 'string') return { riderId: null, dateStr: null };
    const match = orderId.match(/^PAPIDO-SETTLE-RIDER(\d+)-(\d{8})-/i);
    if (!match) return { riderId: null, dateStr: null };
    const riderId = parseInt(match[1], 10);
    const rawDate = match[2];
    const dateStr = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
    return { riderId, dateStr };
  }

  /**
   * Generates a deterministic Order ID preserving original Ride ID.
   */
  generateRideOrderId(rideId) {
    const ts = Date.now();
    const suffix = crypto.randomBytes(3).toString('hex');
    return `PAPIDO-RIDE-${rideId}-${ts}-${suffix}`;
  }

  /**
   * FLOW A: Passenger or Driver initiates payment for a completed/active ride.
   * Direct NPCI UPI standard (0% fee, zero external gateway).
   */
  async createRidePayment(rideId, userId, options = {}) {
    const ride = await RideModel.findById(rideId);
    if (!ride) {
      throw new Error(`Ride #${rideId} not found.`);
    }

    // Verify ownership: allow passenger, assigned rider, or admin
    const isCustomer = parseInt(ride.customer_id, 10) === parseInt(userId, 10);
    const isRider = parseInt(ride.rider_id, 10) === parseInt(userId, 10);
    const isAdmin = options.role === 'ADMIN';

    if (!isCustomer && !isRider && !isAdmin) {
      throw new Error('Unauthorized: Only assigned rider, passenger, or admin can initiate payment session.');
    }

    // Verify payable state
    const allowedStatuses = ['COMPLETED', 'STARTED', 'RIDER_REACHED'];
    if (!allowedStatuses.includes(ride.status)) {
      throw new Error(`Ride cannot be paid in current status: ${ride.status}. Must be completed or active.`);
    }

    // Check if already paid
    if (ride.payment_status === 'PAID') {
      const existingPayment = await PaymentModel.findByRideId(ride.id);
      return {
        alreadyPaid: true,
        success: true,
        rideId: ride.id,
        amount: parseFloat(ride.final_fare || ride.total_fare || 0),
        utr: existingPayment?.utr || null,
        message: 'This ride has already been paid successfully.'
      };
    }

    // Authoritative fare from backend (never trusted blindly from client)
    const fareAmount = parseFloat(ride.final_fare || ride.total_fare || ride.estimated_fare || 25);
    if (isNaN(fareAmount) || fareAmount <= 0) {
      throw new Error('Invalid ride fare computed.');
    }

    const orderId = this.generateRideOrderId(ride.id);

    // Fetch assigned rider details to get their personal UPI ID if available
    let riderUpi = 'papido.admin@okaxis';
    if (ride.rider_id) {
      try {
        const riderRow = await db.queryOne('SELECT upi_id FROM rider_profiles WHERE user_id = ?', [ride.rider_id]);
        if (riderRow?.upi_id && riderRow.upi_id.trim()) {
          riderUpi = riderRow.upi_id.trim();
        }
      } catch (_) {}
    }

    const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(riderUpi)}&pn=Papido&am=${fareAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Papido_Ride_${ride.id}`)}`;

    // Record attempt in payment_transactions table for traceability
    await PaymentModel.recordTransactionAttempt({
      paymentType: 'RIDE_FARE',
      referenceId: ride.id,
      orderId,
      gatewayPaymentId: orderId,
      gateway: 'UPI',
      amount: fareAmount,
      currency: 'INR',
      status: 'INITIATED',
      idempotencyKey: options.idempotencyKey || null,
      metadata: {
        rideId: ride.id,
        customerId: ride.customer_id,
        riderId: ride.rider_id,
        upiId: riderUpi
      }
    });

    // Update or insert primary payment record
    await PaymentModel.create({
      rideId: ride.id,
      customerId: ride.customer_id,
      riderId: ride.rider_id,
      amount: fareAmount,
      paymentMethod: 'UPI',
      paymentStatus: 'PENDING',
      orderId,
      transactionReference: orderId,
      gateway: 'UPI',
      currency: 'INR'
    });

    console.log(`[PaymentService] PAYMENT_CREATED: Ride #${ride.id}, Order #${orderId}, Amount: ₹${fareAmount}`);

    return {
      success: true,
      orderId,
      rideId: ride.id,
      amount: fareAmount,
      currency: 'INR',
      status: 'INITIATED',
      upiIntentUrl,
      upiId: riderUpi
    };
  }

  /**
   * Rider or Admin marks ride fare as collected in physical cash.
   */
  async markCashPayment(rideId, userId, options = {}) {
    const ride = await RideModel.findById(rideId);
    if (!ride) {
      throw new Error(`Ride #${rideId} not found.`);
    }

    const isRider = parseInt(ride.rider_id, 10) === parseInt(userId, 10);
    const isAdmin = options.role === 'ADMIN';

    if (!isRider && !isAdmin) {
      throw new Error('Unauthorized: Only assigned rider or admin can confirm cash receipt.');
    }

    if (ride.payment_status === 'PAID') {
      return {
        alreadyPaid: true,
        success: true,
        rideId: ride.id,
        amount: parseFloat(ride.final_fare || ride.total_fare || 0),
        message: 'This ride has already been marked as paid.'
      };
    }

    const fareAmount = parseFloat(ride.final_fare || ride.total_fare || ride.estimated_fare || 25);

    // Update ride in database
    await db.query(
      'UPDATE rides SET payment_status = ?, payment_method = ? WHERE id = ?',
      ['PAID', 'CASH', rideId]
    );

    // Record or update payment record
    await PaymentModel.create({
      rideId: ride.id,
      customerId: ride.customer_id,
      riderId: ride.rider_id,
      amount: fareAmount,
      paymentMethod: 'CASH',
      paymentStatus: 'COMPLETED',
      transactionReference: `CASH-${Date.now()}-${ride.ride_code || ride.id}`,
      gateway: 'CASH'
    });

    // Emit real-time notification
    try {
      if (socketManager?.io) {
        const socketPayload = {
          rideId,
          amount: fareAmount,
          paymentStatus: 'PAID',
          paymentMethod: 'CASH',
          timestamp: new Date().toISOString()
        };
        socketManager.io.to(`user_${ride.customer_id}`).emit('payment:success', socketPayload);
        socketManager.io.to(`user_${ride.rider_id}`).emit('ride:payment_received', socketPayload);
        socketManager.io.to(`ride_${rideId}`).emit('ride:payment_status', socketPayload);
      }
    } catch (socketErr) {
      console.warn('[PaymentService] Notice emitting socket event for cash payment:', socketErr.message);
    }

    return {
      success: true,
      rideId,
      amount: fareAmount,
      paymentMethod: 'CASH',
      paymentStatus: 'PAID'
    };
  }

  /**
   * FLOW B: Rider initiates daily platform commission settlement info.
   */
  async createSettlementPayment(riderId, date, options = {}) {
    const targetDate = date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const settlement = await EarningModel.getRiderShiftSettlement(riderId, targetDate);

    if (!settlement) {
      throw new Error(`No shift settlement found for ${targetDate}.`);
    }

    if (settlement.status === 'SETTLED' || settlement.status === 'CLEARED') {
      return {
        alreadySettled: true,
        success: true,
        riderId,
        date: targetDate,
        amount: settlement.totalCommissionDue,
        utr: settlement.utrReference,
        message: 'This daily shift settlement has already been cleared and approved.'
      };
    }

    const dueAmount = parseFloat(settlement.totalCommissionDue || 0);
    if (dueAmount <= 0) {
      throw new Error(`No platform commission due for ${targetDate} (₹0.00).`);
    }

    const adminUpi = settlement.adminUpi?.upiId || 'papido.admin@okaxis';
    const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(adminUpi)}&pn=Papido%20Commission&am=${dueAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Settlement_${targetDate}`)}`;

    return {
      success: true,
      riderId,
      date: targetDate,
      amount: dueAmount,
      currency: 'INR',
      status: 'PENDING',
      adminUpi,
      upiIntentUrl
    };
  }

  /**
   * Admin Financial Reconciliation Query
   */
  async getPaymentReconciliation({ fromDate, toDate, type, status, limit = 50, offset = 0 }) {
    let sql = `
      SELECT pt.*,
             CASE
               WHEN pt.payment_type = 'RIDE_FARE' THEN r.ride_code
               ELSE NULL
             END as ride_code,
             CASE
               WHEN pt.payment_type = 'RIDE_FARE' THEN c.name
               ELSE NULL
             END as customer_name,
             CASE
               WHEN pt.payment_type = 'RIDE_FARE' THEN rd.name
               WHEN pt.payment_type = 'SETTLEMENT' THEN u.name
               ELSE NULL
             END as rider_name
      FROM payment_transactions pt
      LEFT JOIN rides r ON (pt.payment_type = 'RIDE_FARE' AND pt.reference_id = r.id)
      LEFT JOIN users c ON (r.customer_id = c.id)
      LEFT JOIN users rd ON (r.rider_id = rd.id)
      LEFT JOIN users u ON (pt.payment_type = 'SETTLEMENT' AND pt.reference_id = u.id)
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      sql += ' AND pt.payment_type = ?';
      params.push(type);
    }
    if (status) {
      sql += ' AND pt.status = ?';
      params.push(status);
    }
    if (fromDate) {
      sql += ' AND pt.created_at >= ?';
      params.push(fromDate);
    }
    if (toDate) {
      sql += ' AND pt.created_at <= ?';
      params.push(toDate);
    }

    sql += ' ORDER BY pt.id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const rows = await db.query(sql, params);
    const countRow = await db.queryOne('SELECT COUNT(*) as total FROM payment_transactions');

    return {
      items: rows,
      total: countRow ? countRow.total : 0
    };
  }
}

module.exports = new PaymentService();
