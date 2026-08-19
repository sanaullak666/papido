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
router.patch('/riders/:id/verify', AdminController.verifyRider);
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.get('/rides', AdminController.listRides);
router.get('/payments', AdminController.listPayments);
router.get('/fare-settings', AdminController.getFareConfigurations);
router.patch('/fare-settings/:vehicleType', AdminController.updateFareConfiguration);

// Campus Areas (Campus Zones)
router.get('/campus-areas', AdminController.getCampusAreas);
router.post('/campus-areas', AdminController.saveCampusArea);
router.delete('/campus-areas/all', AdminController.deleteAllCampusAreas);
router.delete('/campus-areas/:id', AdminController.deleteCampusArea);

// Area-to-Area Fare Matrix
router.get('/area-fares', AdminController.getAreaFares);
router.get('/area-fares/matrix', AdminController.getAreaFareMatrix);
router.post('/area-fares/matrix-save', AdminController.saveAreaFareMatrix);
router.post('/area-fares', AdminController.saveAreaFare);
router.delete('/area-fares/all', AdminController.deleteAllAreaFares);
router.delete('/area-fares/:id', AdminController.deleteAreaFare);

// Categories & Lists (Legacy/Grouping Support)
router.get('/campus-categories', AdminController.getCampusCategories);
router.post('/campus-categories', AdminController.saveCampusCategory);
router.delete('/campus-categories/all', AdminController.deleteAllCampusCategories);
router.delete('/campus-categories/:id', AdminController.deleteCampusCategory);

// Campus Stops & Locations
router.get('/campus-stops', AdminController.getCampusStops);
router.post('/campus-stops', AdminController.saveCampusStop);
router.delete('/campus-stops/all', AdminController.deleteAllCampusStops);
router.delete('/campus-stops/:id', AdminController.deleteCampusStop);

// Campus Route Fares & Group Rules
router.get('/route-fares', AdminController.getRouteFares);
router.post('/route-fares', AdminController.saveRouteFare);
router.delete('/route-fares/all', AdminController.deleteAllRouteFares);
router.delete('/route-fares/:id', AdminController.deleteRouteFare);
router.post('/route-fares/test', AdminController.testRouteFare);
router.get('/split-rules', AdminController.getSplitRules);
router.post('/split-rules', AdminController.createSplitRule);
router.patch('/split-rules/:id', AdminController.updateSplitRule);
router.get('/reports', AdminController.getReports);
router.get('/outside-rides', AdminController.listPendingOutsideRides);
router.get('/active-riders', AdminController.listActiveRiders);
router.post('/outside-rides/:id/dispatch', AdminController.dispatchOutsideRide);

module.exports = router;
