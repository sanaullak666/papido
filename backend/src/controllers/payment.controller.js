const PaymentService = require('../services/payment.service');
const PaymentModel = require('../models/payment.model');
const RideModel = require('../models/ride.model');
const EarningModel = require('../models/earning.model');
const { success, error, paginate } = require('../utils/response');

class PaymentController {
  /**
   * POST /api/payments/ride/:rideId/create
   * Passenger initiates payment for a ride
   */
  async createRidePayment(req, res, next) {
    try {
      const rideId = parseInt(req.params.rideId, 10);
      if (isNaN(rideId)) {
        return error(res, 'Invalid ride ID provided.', 400);
      }

      const result = await PaymentService.createRidePayment(rideId, req.user.id, {
        returnUrl: req.body?.returnUrl,
        idempotencyKey: req.headers['idempotency-key'] || req.body?.idempotencyKey
      });

      return success(res, 'Ride payment session created.', result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/payments/ride/:rideId
   * Passenger or Rider checks current payment status for a ride
   */
  async getRidePayment(req, res, next) {
    try {
      const rideId = parseInt(req.params.rideId, 10);
      if (isNaN(rideId)) {
        return error(res, 'Invalid ride ID.', 400);
      }

      const ride = await RideModel.findById(rideId);
      if (!ride) {
        return error(res, 'Ride not found.', 404);
      }

      // Authorization: passenger, assigned rider, or admin
      const isCustomer = ride.customer_id === req.user.id;
      const isRider = ride.rider_id === req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      if (!isCustomer && !isRider && !isAdmin) {
        return error(res, 'Unauthorized access to ride payment.', 403);
      }

      const payment = await PaymentModel.findByRideId(rideId);
      const attempts = await PaymentModel.getTransactionsForReference('RIDE_FARE', rideId);

      return success(res, 'Ride payment details fetched.', {
        rideId: ride.id,
        rideCode: ride.ride_code,
        status: ride.status,
        paymentStatus: ride.payment_status || payment?.payment_status || 'UNPAID',
        paymentMethod: ride.payment_method || payment?.payment_method || 'UPI',
        fare: parseFloat(ride.final_fare || ride.total_fare || ride.estimated_fare || 0),
        payment: payment || null,
        attempts: attempts || []
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/settlement/:date/pay
   * Rider initiates daily platform commission settlement
   */
  async createSettlementPayment(req, res, next) {
    try {
      const date = req.params.date || req.body.date;
      const result = await PaymentService.createSettlementPayment(req.user.id, date, {
        returnUrl: req.body?.returnUrl,
        idempotencyKey: req.headers['idempotency-key'] || req.body?.idempotencyKey
      });

      return success(res, 'Daily settlement payment session created.', result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/payments/settlement/:date
   * Rider or Admin checks daily settlement status
   */
  async getSettlementStatus(req, res, next) {
    try {
      const date = req.params.date || req.query.date;
      const riderId = req.query.riderId && req.user.role === 'ADMIN'
        ? parseInt(req.query.riderId, 10)
        : req.user.id;

      const settlement = await EarningModel.getRiderShiftSettlement(riderId, date);
      const attempts = await PaymentModel.getTransactionsForReference('SETTLEMENT', riderId);

      return success(res, 'Settlement status details fetched.', {
        settlement,
        attempts: (attempts || []).filter(a => !date || (a.metadata && a.metadata.includes(date)))
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/webhook/youpi
   * Authoritative YOUPI PG V2 Webhook Receiver
   * Verifies HMAC-SHA256 signature and executes state transition
   */
  async handleYoupiWebhook(req, res, next) {
    try {
      // Use raw body for cryptographic signature verification
      const rawBody = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      const result = await PaymentService.processYoupiWebhook(rawBody, req.headers);

      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully.',
        data: result
      });
    } catch (err) {
      console.error('[PaymentController] Webhook error:', err.message);
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }

  /**
   * GET /api/payments/admin/reconcile
   * Admin Financial Reconciliation endpoint
   */
  async getPaymentReconciliation(req, res, next) {
    try {
      const { fromDate, toDate, type, status, page = 1, limit = 50 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

      const result = await PaymentService.getPaymentReconciliation({
        fromDate,
        toDate,
        type,
        status,
        limit: parseInt(limit, 10),
        offset
      });

      return paginate(res, 'Payment reconciliation data fetched.', result.items, result.total, page, limit);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PaymentController();
