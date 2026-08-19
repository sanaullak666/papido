const express = require('express');
const router = express.Router();
const FareController = require('../controllers/fare.controller');

router.get('/types', FareController.getConfigurations);
router.get('/areas', FareController.getAreas);
router.get('/categories', FareController.getCategories);
router.get('/routes', FareController.getRouteFares);
router.get('/stops', FareController.getAvailableStops);
router.get('/grouped-stops', FareController.getGroupedStops);
router.get('/default-campus-fare', async (req, res, next) => {
  try {
    const fare = await FareModel.getDefaultCampusFare();
    return success(res, 'Default campus flat fare fetched.', { defaultCampusFare: fare });
  } catch (err) {
    next(err);
  }
});
router.post('/estimate', FareController.estimateRideFare);
router.get('/places', FareController.searchPlaces);
router.get('/reverse', FareController.reverseGeocode);

module.exports = router;
