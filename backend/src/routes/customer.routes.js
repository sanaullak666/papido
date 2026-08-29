const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/customer.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

// All routes here strictly require role = CUSTOMER
router.use(verifyToken, requireRole('CUSTOMER'));

router.get('/profile', CustomerController.getProfile);
router.post('/estimate', CustomerController.estimateFare);
router.post('/rides/check-availability', CustomerController.checkPreferenceAvailability);
router.get('/rides/check-availability', CustomerController.checkPreferenceAvailability);
router.post('/rides', CustomerController.requestRide);
router.post('/outside-rides', CustomerController.requestRide);
router.get('/outside-rides', CustomerController.getMyRides);
router.get('/pending-penalty', CustomerController.getPendingPenalty);
router.post('/penalties/:id/claim-paid', CustomerController.claimPenaltyPaid);
router.get('/flash-free-ride/active', CustomerController.getActiveFlashFreeRide);
router.post('/flash-free-ride/claim', CustomerController.claimFlashFreeRide);
router.get('/rides/active', CustomerController.getActiveRide);
router.get('/rides/history', CustomerController.getMyRides);
router.get('/rides', CustomerController.getMyRides);
router.get('/rides/:id', CustomerController.getRideById);
router.post('/rides/:id/cancel', CustomerController.cancelRide);
router.post('/rides/:id/rating', CustomerController.submitRating);

module.exports = router;
