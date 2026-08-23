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

  async getRouteFares(req, res, next) {
    try {
      const routes = await FareModel.getAllRouteFares();
      return success(res, 'Active campus route fares fetched.', routes);
    } catch (err) {
      next(err);
    }
  },

  async getAvailableStops(req, res, next) {
    try {
      const routes = await FareModel.getAllRouteFares();
      const stopsSet = new Set();
      (routes || []).filter(r => r.is_active).forEach(r => {
        if (r.pickup_stop) stopsSet.add(r.pickup_stop);
        if (r.destination_stop) stopsSet.add(r.destination_stop);
      });
      return success(res, 'Available campus stops fetched.', Array.from(stopsSet));
    } catch (err) {
      next(err);
    }
  },

  async getGroupedStops(req, res, next) {
    try {
      const DEFAULT_GROUPED = [
        {
          key: 'GIRLS_HOSTEL',
          label: 'Girls Hostels',
          icon: '👧',
          stops: [
            { id: 'gh-1', name: 'Madame Curie Girls Hostel', lat: 12.0215, lng: 79.8565 },
            { id: 'gh-2', name: 'Mother Teresa Girls Hostel', lat: 12.0218, lng: 79.8570 },
            { id: 'gh-3', name: 'Ganga Girls Hostel', lat: 12.0222, lng: 79.8575 },
            { id: 'gh-4', name: 'Yamuna Girls Hostel', lat: 12.0225, lng: 79.8572 },
            { id: 'gh-5', name: 'Sarojini Naidu Girls Hostel', lat: 12.0212, lng: 79.8560 },
            { id: 'gh-6', name: 'Cauvery Girls Hostel', lat: 12.0220, lng: 79.8580 },
            { id: 'gh-7', name: 'Saraswathi Girls Hostel', lat: 12.0216, lng: 79.8568 }
          ]
        },
        {
          key: 'BOYS_HOSTEL',
          label: 'Boys Hostels',
          icon: '👦',
          stops: [
            { id: 'bh-1', name: 'Silver Jubilee Hostel (SJC)', lat: 12.0280, lng: 79.8520 },
            { id: 'bh-2', name: 'Bharathidasan Boys Hostel', lat: 12.0275, lng: 79.8515 },
            { id: 'bh-3', name: 'Kabilar Boys Hostel', lat: 12.0270, lng: 79.8510 },
            { id: 'bh-4', name: 'Subramania Bharathi Boys Hostel', lat: 12.0285, lng: 79.8525 },
            { id: 'bh-5', name: 'Kalidas Boys Hostel', lat: 12.0268, lng: 79.8530 },
            { id: 'bh-6', name: 'Valmiki Boys Hostel', lat: 12.0272, lng: 79.8535 },
            { id: 'bh-7', name: 'Foreign Students Hostel', lat: 12.0288, lng: 79.8540 }
          ]
        },
        {
          key: 'DEPARTMENT',
          label: 'Departments & School Blocks',
          icon: '🏛️',
          stops: [
            { id: 'dp-1', name: 'Science Complex / Physics Dept', lat: 12.0261, lng: 79.8550 },
            { id: 'dp-2', name: 'School of Management (SOM)', lat: 12.0255, lng: 79.8540 },
            { id: 'dp-3', name: 'Ramanujan Math & Computer Science Block', lat: 12.0265, lng: 79.8560 },
            { id: 'dp-4', name: 'School of Humanities & Social Sciences', lat: 12.0248, lng: 79.8535 },
            { id: 'dp-5', name: 'School of Life Sciences & Biotech', lat: 12.0258, lng: 79.8565 },
            { id: 'dp-6', name: 'School of Engineering & Technology', lat: 12.0270, lng: 79.8570 },
            { id: 'dp-7', name: 'School of Media & Communication', lat: 12.0250, lng: 79.8545 }
          ]
        },
        {
          key: 'GATE_HUB',
          label: 'Gates & Campus Hubs',
          icon: '🚪',
          stops: [
            { id: 'gt-1', name: 'PU Main Gate (Gate 1)', lat: 12.0228681, lng: 79.8509415 },
            { id: 'gt-2', name: 'Gate 2 (East Coast Road)', lat: 12.0295, lng: 79.8580 },
            { id: 'gt-3', name: 'Central Library', lat: 12.0245, lng: 79.8532 },
            { id: 'gt-4', name: 'University Canteen & Food Court', lat: 12.0238, lng: 79.8541 },
            { id: 'gt-5', name: 'Admin Block & Exam Wing', lat: 12.0252, lng: 79.8515 },
            { id: 'gt-6', name: 'Shopping Complex / Co-op Stores', lat: 12.0240, lng: 79.8538 },
            { id: 'gt-7', name: 'Rajiv Gandhi Sports Stadium', lat: 12.0290, lng: 79.8555 }
          ]
        }
      ];

      const routes = await FareModel.getAllRouteFares();
      const customStops = [];
      const knownNames = new Set(DEFAULT_GROUPED.flatMap(g => g.stops.map(s => s.name.toLowerCase())));

      (routes || []).filter(r => r.is_active).forEach(r => {
        [r.pickup_stop, r.destination_stop].forEach(s => {
          if (s && !knownNames.has(s.toLowerCase())) {
            knownNames.add(s.toLowerCase());
            customStops.push({
              id: `custom-${customStops.length + 1}`,
              name: s,
              lat: 12.0240,
              lng: 79.8530
            });
          }
        });
      });

      if (customStops.length > 0) {
        DEFAULT_GROUPED.push({
          key: 'ADMIN_CUSTOM',
          label: 'Admin Configured Stops',
          icon: '📍',
          stops: customStops
        });
      }

      return success(res, 'Grouped campus stops fetched.', DEFAULT_GROUPED);
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
      const userLat = parseFloat(req.query.lat) || 12.0240;
      const userLng = parseFloat(req.query.lng) || 79.8530;
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
  },

  async resolveMapLink(req, res, next) {
    try {
      const url = req.query.url || req.body.url;
      if (!url) {
        return error(res, 'Map link URL is required.', 400);
      }
      const resolved = await MapService.resolveMapLink(url);
      if (!resolved) {
        return error(res, 'Could not resolve map link.', 400);
      }
      return success(res, 'Location resolved successfully.', resolved);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = FareController;
