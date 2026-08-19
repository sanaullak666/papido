const FareService = require('../services/fare.service');
const FareModel = require('../models/fare.model');
const MapService = require('../services/map.service');
const { success, error } = require('../utils/response');

const FareController = {
  async getConfigurations(req, res, next) {
    try {
      const configs = await FareModel.getAllConfigurations();
      return success(res, 'Active vehicle fare rates fetched.', configs);
    } catch (err) {
      next(err);
    }
  },

  async getCategories(req, res, next) {
    try {
      const categories = await FareModel.getAllCategories();
      return success(res, 'Active campus categories fetched.', categories);
    } catch (err) {
      next(err);
    }
  },

  async getRouteFares(req, res, next) {
    try {
      const routes = await FareModel.getAllRouteFares();
      return success(res, 'Active campus route fares fetched.', routes);
    } catch (err) {
      next(err);
    }
  },

  async getGroupedStops(req, res, next) {
    try {
      const groups = await FareModel.getGroupedCampusStops();
      return success(res, 'Categorized campus stops fetched.', groups);
    } catch (err) {
      next(err);
    }
  },

  async getAvailableStops(req, res, next) {
    try {
      const campusStops = await FareModel.getAllCampusStops();
      if (campusStops && campusStops.length > 0) {
        return success(res, 'Available campus stops fetched.', campusStops.map(s => s.name));
      }
      const routes = await FareModel.getAllRouteFares();
      const stopsSet = new Set();
      (routes || []).filter(r => r.is_active).forEach(r => {
        if (r.pickup_stop && !r.pickup_stop.startsWith('[')) stopsSet.add(r.pickup_stop);
        if (r.destination_stop && !r.destination_stop.startsWith('[')) stopsSet.add(r.destination_stop);
      });
      return success(res, 'Available campus stops fetched.', Array.from(stopsSet));
    } catch (err) {
      next(err);
    }
  },

  async estimateRideFare(req, res, next) {
    try {
      const pLat = req.body.pickupLatitude || req.body.pickupLat || 12.0228;
      const pLng = req.body.pickupLongitude || req.body.pickupLng || 79.8509;
      const dLat = req.body.destinationLatitude || req.body.dropLat || req.body.destLat || 12.0295;
      const dLng = req.body.destinationLongitude || req.body.dropLng || req.body.destLng || 79.8580;
      const {
        vehicleType,
        pickupAddress,
        destinationAddress,
        isDoubleRide
      } = req.body;

      if (pickupAddress && destinationAddress && pickupAddress.trim().toLowerCase() === destinationAddress.trim().toLowerCase()) {
        return error(res, 'Pickup and drop-off cannot be the same location. Please select a different destination.', 400);
      }

      const estimates = await FareService.getRideEstimates(
        parseFloat(pLat),
        parseFloat(pLng),
        parseFloat(dLat),
        parseFloat(dLng),
        vehicleType || 'BIKE',
        pickupAddress || null,
        destinationAddress || null,
        isDoubleRide === true || isDoubleRide === 'true' || isDoubleRide === 1
      );

      return success(res, 'Ride fare estimate computed.', estimates);
    } catch (err) {
      next(err);
    }
  },

  async searchPlaces(req, res, next) {
    try {
      const query = req.query.q || '';
      const userLat = parseFloat(req.query.lat) || 12.9716;
      const userLng = parseFloat(req.query.lng) || 77.5946;
      const places = await MapService.searchAddresses(query, userLat, userLng);
      return success(res, 'Locations found.', places);
    } catch (err) {
      next(err);
    }
  },

  async reverseGeocode(req, res, next) {
    try {
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      if (isNaN(lat) || isNaN(lng)) {
        return error(res, 'Valid lat and lng query params are required.', 400);
      }
      const place = await MapService.reverseGeocode(lat, lng);
      return success(res, 'Address reverse-geocoded.', place);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = FareController;
