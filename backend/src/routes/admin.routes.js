const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

// All routes here strictly require role = ADMIN
router.use(verifyToken, requireRole('ADMIN'));

router.get('/dashboard', AdminController.getDashboardOverview);
router.get('/customers', AdminController.listCustomers);
router.get('/riders', AdminController.listRiders);
router.get('/riders/leaderboard', AdminController.getRiderLeaderboard);
router.patch('/riders/:id/verify', AdminController.verifyRider);
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.get('/rides', AdminController.listRides);
router.get('/payments', AdminController.listPayments);
router.get('/fare-settings', AdminController.getFareConfigurations);
router.patch('/fare-settings/:vehicleType', AdminController.updateFareConfiguration);
router.get('/route-fares', AdminController.getRouteFares);
router.post('/route-fares', AdminController.saveRouteFare);
router.delete('/route-fares/:id', AdminController.deleteRouteFare);
router.get('/split-rules', AdminController.getSplitRules);
router.post('/split-rules', AdminController.createSplitRule);
router.patch('/split-rules/:id', AdminController.updateSplitRule);
router.get('/reports', AdminController.getReports);
router.get('/daily-settlements', AdminController.getDailySettlements);
router.patch('/daily-settlements/status', AdminController.updateDailySettlementStatus);
router.post('/daily-settlements/controller', AdminController.saveDailyDutyController);
router.get('/outside-rides', AdminController.listPendingOutsideRides);
router.get('/active-riders', AdminController.listActiveRiders);
router.post('/outside-rides/:id/dispatch', AdminController.dispatchOutsideRide);
router.get('/core-members', AdminController.listCoreMembers);
router.patch('/users/:id/core-status', AdminController.toggleCoreMemberStatus);
router.delete('/riders/:id', AdminController.deleteRider);
router.delete('/users/:id', AdminController.deleteUser);

module.exports = router;
