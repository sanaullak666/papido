const express = require('express');
const router = express.Router();
const FareController = require('../controllers/fare.controller');

router.get('/types', FareController.getConfigurations);
router.get('/routes', FareController.getRouteFares);
router.get('/stops', FareController.getAvailableStops);
router.get('/grouped-stops', FareController.getGroupedStops);
router.post('/estimate', FareController.estimateRideFare);
router.get('/places', FareController.searchPlaces);
router.get('/reverse', FareController.reverseGeocode);
router.get('/resolve-link', FareController.resolveMapLink);
router.post('/resolve-link', FareController.resolveMapLink);
router.get('/service-areas', FareController.getServiceAreas);
router.post('/route', FareController.getRoute);

module.exports = router;
