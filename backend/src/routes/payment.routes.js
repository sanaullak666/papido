const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/payment.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole, requireAnyRole } = require('../middleware/role.middleware');

/**
 * Public Webhook Endpoint
 * Must not require JWT auth; authenticates via X-Gateway-Signature HMAC-SHA256
 */
router.post('/webhook/youpi', PaymentController.handleYoupiWebhook);

/**
 * FLOW A: Ride Payments (Passenger -> Rider)
 */
// Customer initiates YouPI payment session for a completed ride
router.post('/ride/:rideId/create', verifyToken, requireAnyRole(['CUSTOMER', 'ADMIN']), PaymentController.createRidePayment);

// Customer, Rider, or Admin inspects payment details & gateway attempts
router.get('/ride/:rideId', verifyToken, PaymentController.getRidePayment);

/**
 * FLOW B: Settlement Payments (Rider -> Papido Daily Commission)
 */
// Rider initiates YouPI payment session to pay daily platform commission
router.post('/settlement/:date/pay', verifyToken, requireAnyRole(['RIDER', 'ADMIN']), PaymentController.createSettlementPayment);

// Rider or Admin inspects daily settlement details
router.get('/settlement/:date', verifyToken, requireAnyRole(['RIDER', 'ADMIN']), PaymentController.getSettlementStatus);

/**
 * Admin Reconciliation & Audit
 */
router.get('/admin/reconcile', verifyToken, requireRole('ADMIN'), PaymentController.getPaymentReconciliation);

module.exports = router;
