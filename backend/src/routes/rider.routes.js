const express = require('express');
const router = express.Router();
const RiderController = require('../controllers/rider.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

// All routes here strictly require role = RIDER (Driver)
router.use(verifyToken, requireRole('RIDER'));

router.get('/profile', RiderController.getProfile);
router.post('/documents', RiderController.uploadDocuments);
router.patch('/status', RiderController.toggleStatus);
router.patch('/location', RiderController.updateLocation);
router.get('/active-ride', RiderController.getActiveRide);
router.get('/requests', RiderController.getAvailableRequests);
router.post('/rides/:id/accept', RiderController.acceptRide);
router.post('/rides/:id/decline', RiderController.declineRide);
router.post('/rides/:id/arriving', RiderController.setArriving);
router.post('/rides/:id/reached', RiderController.setReached);
router.post('/rides/:id/start', RiderController.startRide);
router.post('/rides/:id/waiting', RiderController.toggleWaiting);
router.post('/rides/:id/complete', RiderController.completeRide);
router.post('/rides/:id/cancel', RiderController.cancelRide);
router.get('/earnings', RiderController.getEarnings);
router.get('/penalties/pending', RiderController.getPendingPenaltyVerifications);
router.post('/penalties/:id/confirm', RiderController.confirmPenaltyPayment);
router.get('/shift-settlement', RiderController.getShiftSettlement);
router.post('/shift-settlement/submit', RiderController.submitShiftSettlement);
router.get('/rides/scheduled/available', RiderController.getAvailableScheduledRides);
router.get('/rides/scheduled/reserved', RiderController.getMyReservedScheduledRides);
router.post('/rides/:id/accept-scheduled', RiderController.acceptScheduledRide);
router.post('/rides/:id/cancel-scheduled', RiderController.cancelScheduledRide);
router.get('/rides/history', RiderController.getMyRides);
router.get('/rides', RiderController.getMyRides);

module.exports = router;
