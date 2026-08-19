const express = require('express');
const router = express.Router();
const FareController = require('../controllers/fare.controller');

router.get('/types', FareController.getConfigurations);
router.get('/routes', FareController.getRouteFares);
router.get('/stops', FareController.getAvailableStops);
router.post('/estimate', FareController.estimateRideFare);
router.get('/places', FareController.searchPlaces);
router.get('/reverse', FareController.reverseGeocode);

module.exports = router;
