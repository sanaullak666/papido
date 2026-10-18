const db = require('../config/database');
const YoupiService = require('./youpi.service');
const PaymentModel = require('../models/payment.model');
const RideModel = require('../models/ride.model');
const UserModel = require('../models/user.model');
const EarningModel = require('../models/earning.model');
const socketManager = require('../sockets/socketManager');

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
   * FLOW A: Passenger initiates payment for a completed ride.
   * Preserves existing ride ID (e.g. ride_id = 105).
   */
  async createRidePayment(rideId, customerId, options = {}) {
    const ride = await RideModel.findById(rideId);
    if (!ride) {
      throw new Error(`Ride #${rideId} not found.`);
    }

    // Verify ownership
    if (parseInt(ride.customer_id, 10) !== parseInt(customerId, 10)) {
      throw new Error('Unauthorized: You can only pay for your own rides.');
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

    const customer = await UserModel.findById(customerId);
    const orderId = YoupiService.generateRideOrderId(ride.id);

    // Call YOUPI PG V2
    const session = await YoupiService.createPaymentSession({
      orderId,
      amount: fareAmount,
      customer: {
        name: customer?.name || 'Papido Passenger',
        email: customer?.email || 'passenger@papido.in',
        phoneNumber: customer?.phone || '9999999999'
      },
      description: `Papido Ride #${ride.ride_code || ride.id} Fare`,
      returnUrl: options.returnUrl || `${process.env.CLIENT_URL || 'http://localhost:5173'}/passenger/rides?rideId=${ride.id}&orderId=${orderId}`,
      metadata: {
        type: 'RIDE_FARE',
        rideId: ride.id,
        customerId: ride.customer_id,
        riderId: ride.rider_id
      },
      idempotencyKey: options.idempotencyKey || `idem_ride_${ride.id}_${Date.now()}`
    });

    // Record attempt in payment_transactions table for full traceability
    await PaymentModel.recordTransactionAttempt({
      paymentType: 'RIDE_FARE',
      referenceId: ride.id,
      orderId,
      gatewayPaymentId: session.paymentId,
      gateway: 'YOUPI',
      amount: fareAmount,
      currency: 'INR',
      status: 'INITIATED',
      checkoutUrl: session.checkoutUrl,
      idempotencyKey: options.idempotencyKey || null,
      metadata: {
        rideId: ride.id,
        customerId: ride.customer_id,
        riderId: ride.rider_id
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
      gatewayPaymentId: session.paymentId,
      transactionReference: orderId,
      gateway: 'YOUPI',
      currency: 'INR'
    });

    console.log(`[PaymentService] PAYMENT_CREATED: Ride #${ride.id}, Order #${orderId}, Amount: ₹${fareAmount}`);

    return {
      success: true,
      paymentId: session.paymentId,
      orderId,
      rideId: ride.id,
      amount: fareAmount,
      currency: 'INR',
      status: 'INITIATED',
      checkoutUrl: session.checkoutUrl,
      upiIntentUrl: session.upiIntentUrl
    };
  }

  /**
   * FLOW B: Rider initiates daily platform commission settlement to Papido.
   * Separate from passenger ride payments.
   */
  async createSettlementPayment(riderId, dateInput, options = {}) {
    const targetDate = (dateInput && String(dateInput).trim()) || new Date().toISOString().slice(0, 10);

    // Retrieve authoritative settlement data
    const settlement = await EarningModel.getRiderShiftSettlement(riderId, targetDate);
    if (!settlement) {
      throw new Error(`No shift settlement found for driver on ${targetDate}.`);
    }

    // Check if already settled
    if (settlement.status === 'SETTLED') {
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

    const rider = await UserModel.findById(riderId);
    const orderId = YoupiService.generateSettlementOrderId(riderId, targetDate);

    // Call YOUPI PG V2
    const session = await YoupiService.createPaymentSession({
      orderId,
      amount: dueAmount,
      customer: {
        name: rider?.name || 'Papido Driver',
        email: rider?.email || 'driver@papido.in',
        phoneNumber: rider?.phone || '9999999999'
      },
      description: `Papido Platform Commission Settlement for ${targetDate}`,
      returnUrl: options.returnUrl || `${process.env.CLIENT_URL || 'http://localhost:5173'}/rider/settlements?date=${targetDate}&orderId=${orderId}`,
      metadata: {
        type: 'COMMISSION_SETTLEMENT',
        riderId,
        date: targetDate,
        dueAmount
      },
      idempotencyKey: options.idempotencyKey || `idem_settle_${riderId}_${targetDate}`
    });

    // Record in payment_transactions table
    await PaymentModel.recordTransactionAttempt({
      paymentType: 'SETTLEMENT',
      referenceId: riderId,
      orderId,
      gatewayPaymentId: session.paymentId,
      gateway: 'YOUPI',
      amount: dueAmount,
      currency: 'INR',
      status: 'INITIATED',
      checkoutUrl: session.checkoutUrl,
      idempotencyKey: options.idempotencyKey || null,
      metadata: {
        riderId,
        date: targetDate,
        dueAmount
      }
    });

    // Update daily_shift_settlements record state
    await db.query(`
      INSERT INTO daily_shift_settlements (
        rider_id, date, total_trips, gross_fare, company_due, controller_due,
        total_commission_due, rider_net_earnings, status, order_id, gateway_payment_id,
        checkout_url, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAYMENT_INITIATED', ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        status = 'PAYMENT_INITIATED',
        order_id = VALUES(order_id),
        gateway_payment_id = VALUES(gateway_payment_id),
        checkout_url = VALUES(checkout_url),
        updated_at = CURRENT_TIMESTAMP
    `, [
      riderId,
      targetDate,
      settlement.totalTrips,
      settlement.grossFare,
      settlement.companyDue,
      settlement.controllerDue,
      dueAmount,
      settlement.riderNetEarnings,
      orderId,
      session.paymentId,
      session.checkoutUrl
    ]);

    console.log(`[PaymentService] SETTLEMENT_PAYMENT_CREATED: Rider #${riderId}, Date: ${targetDate}, Order: #${orderId}, Amount: ₹${dueAmount}`);

    return {
      success: true,
      paymentId: session.paymentId,
      orderId,
      riderId,
      date: targetDate,
      amount: dueAmount,
      currency: 'INR',
      status: 'INITIATED',
      checkoutUrl: session.checkoutUrl,
      upiIntentUrl: session.upiIntentUrl
    };
  }

  /**
   * CRITICAL: Authoritative YOUPI Webhook Processor
   * Validates HMAC-SHA256 signature, enforces idempotency, updates database transactionally,
   * and dispatches real-time Socket.IO notifications.
   */
  async processYoupiWebhook(rawBody, headers) {
    const signature = headers['x-gateway-signature'] || headers['x-youpi-signature'];
    const deliveryId = headers['x-gateway-delivery-id'] || null;

    console.log(`[PaymentService] PAYMENT_WEBHOOK_RECEIVED: Delivery ID: ${deliveryId}`);

    if (!signature) {
      console.warn('[PaymentService] PAYMENT_INVALID_SIGNATURE: Missing X-Gateway-Signature header.');
      throw new Error('Missing signature header.');
    }

    // 1. Cryptographically verify signature
    const isValid = YoupiService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('[PaymentService] PAYMENT_INVALID_SIGNATURE: HMAC-SHA256 signature mismatch.');
      throw new Error('Invalid HMAC-SHA256 webhook signature.');
    }

    console.log('[PaymentService] PAYMENT_WEBHOOK_VERIFIED: Signature matched successfully.');

    // 2. Parse payload
    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf8'));
    const { event, paymentId, orderId, amount, utr, metadata } = payload;
    const isSuccess = event === 'SUCCESS' || event === 'PAYMENT_SUCCESS' || payload.status === 'SUCCESS' || payload.status === 'COMPLETED';

    if (!orderId) {
      throw new Error('Webhook payload missing orderId.');
    }

    // 3. Idempotency Check: prevent duplicate processing or crediting
    const existingTx = await PaymentModel.findTransactionByOrderId(orderId);
    if (existingTx && existingTx.status === 'SUCCESS' && isSuccess) {
      console.log(`[PaymentService] PAYMENT_DUPLICATE_WEBHOOK: Order #${orderId} already marked SUCCESS.`);
      return {
        success: true,
        handled: true,
        idempotent: true,
        duplicate: true,
        alreadyProcessed: true,
        orderId,
        message: 'Order already processed successfully.'
      };
    }

    // Determine Payment Type
    const paymentType = metadata?.type || (orderId.includes('SETTLE') ? 'COMMISSION_SETTLEMENT' : 'RIDE_FARE');

    if (paymentType === 'RIDE_FARE') {
      const rideId = metadata?.rideId || this.parseRideId(orderId);
      if (!rideId) {
        throw new Error(`Unable to resolve rideId for order ${orderId}`);
      }

      // Update payment attempt transaction
      await PaymentModel.updateTransactionStatus(orderId, {
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        utr: utr || null,
        gatewayPaymentId: paymentId || null,
        rawPayload: payload,
        completedAt: new Date()
      });

      if (isSuccess) {
        // Update payments table
        await PaymentModel.updateStatusByOrderId(orderId, {
          status: 'COMPLETED',
          utr: utr || 'YOUPI_VERIFIED',
          gatewayPaymentId: paymentId,
          gatewayResponse: payload,
          paidAt: new Date()
        });

        // Update ride payment status
        await db.query(
          'UPDATE rides SET payment_status = ?, payment_method = COALESCE(?, payment_method) WHERE id = ?',
          ['PAID', 'UPI', rideId]
        );

        const ride = await RideModel.findById(rideId);
        const customerId = ride?.customer_id;
        const riderId = ride?.rider_id;

        console.log(`[PaymentService] PAYMENT_SUCCESS: Ride #${rideId} marked PAID via YOUPI (UTR: ${utr || 'VERIFIED'})`);

        // Real-time Socket.IO dispatch
        try {
          if (socketManager?.io) {
            const socketPayload = {
              rideId,
              orderId,
              amount: parseFloat(amount || ride?.final_fare || 0),
              utr: utr || null,
              paymentStatus: 'PAID',
              paymentMethod: 'UPI',
              timestamp: new Date().toISOString()
            };

            if (customerId) socketManager.io.to(`user_${customerId}`).emit('payment:success', socketPayload);
            if (riderId) socketManager.io.to(`user_${riderId}`).emit('ride:payment_received', socketPayload);
            socketManager.io.to(`ride_${rideId}`).emit('ride:payment_status', socketPayload);
            socketManager.io.to('role_ADMIN').emit('admin:payment_received', socketPayload);
          }
        } catch (socketErr) {
          console.warn('[PaymentService] Notice emitting socket event for ride payment:', socketErr.message);
        }
      } else {
        await PaymentModel.updateStatusByOrderId(orderId, {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: `Gateway event: ${event}`
        });
        console.warn(`[PaymentService] PAYMENT_FAILED: Ride #${rideId}, Order #${orderId}, Event: ${event}`);
      }

      return { success: true, orderId, paymentType: 'RIDE_FARE', status: isSuccess ? 'SUCCESS' : 'FAILED' };
    }

    if (paymentType === 'COMMISSION_SETTLEMENT') {
      const { riderId, dateStr } = this.parseSettlementInfo(orderId);
      const effectiveRiderId = metadata?.riderId || riderId;
      const effectiveDate = metadata?.date || dateStr;

      // Update payment attempt transaction
      await PaymentModel.updateTransactionStatus(orderId, {
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        utr: utr || null,
        gatewayPaymentId: paymentId || null,
        rawPayload: payload,
        completedAt: new Date()
      });

      if (isSuccess && effectiveRiderId && effectiveDate) {
        // Mark settlement cleared and approved
        await db.query(`
          UPDATE daily_shift_settlements SET
            status = 'SETTLED',
            utr_reference = COALESCE(?, utr_reference, 'YOUPI_PG'),
            paid_at = CURRENT_TIMESTAMP,
            approved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE (rider_id = ? AND date = ?) OR order_id = ?
        `, [utr || 'YOUPI_VERIFIED', effectiveRiderId, effectiveDate, orderId]);

        // Mark associated ride earnings as settled
        await db.query(`
          UPDATE rider_earnings SET
            settlement_status = 'SETTLED',
            settled_at = CURRENT_TIMESTAMP
          WHERE rider_id = ?
            AND DATE(CONVERT_TZ(COALESCE(created_at, NOW()), '+00:00', '+05:30')) = ?
        `, [effectiveRiderId, effectiveDate]);

        console.log(`[PaymentService] SETTLEMENT_PAID: Rider #${effectiveRiderId}, Date: ${effectiveDate}, Order: #${orderId}, UTR: ${utr}`);

        // Real-time Socket.IO dispatch
        try {
          if (socketManager?.io) {
            const settlePayload = {
              riderId: effectiveRiderId,
              date: effectiveDate,
              orderId,
              amount: parseFloat(amount || 0),
              utr: utr || null,
              status: 'SETTLED',
              timestamp: new Date().toISOString()
            };

            socketManager.io.to(`user_${effectiveRiderId}`).emit('rider:shift_settlement_updated', settlePayload);
            socketManager.io.to('role_ADMIN').emit('admin:shift_settlement_updated', settlePayload);
          }
        } catch (socketErr) {
          console.warn('[PaymentService] Notice emitting socket event for settlement:', socketErr.message);
        }
      }

      return { success: true, orderId, paymentType: 'COMMISSION_SETTLEMENT', status: isSuccess ? 'SUCCESS' : 'FAILED' };
    }

    return { success: true, orderId, status: isSuccess ? 'SUCCESS' : 'FAILED' };
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
