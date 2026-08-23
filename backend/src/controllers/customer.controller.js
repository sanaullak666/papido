const CustomerModel = require('../models/customer.model');
const RideModel = require('../models/ride.model');
const RideService = require('../services/ride.service');
const FareService = require('../services/fare.service');
const FareModel = require('../models/fare.model');
const { success, error, paginate } = require('../utils/response');

const CustomerController = {
  async getProfile(req, res, next) {
    try {
      const profile = await CustomerModel.findByUserId(req.user.id);
      return success(res, 'Customer profile fetched successfully.', profile);
    } catch (err) {
      next(err);
    }
  },

  async estimateFare(req, res, next) {
    try {
      const pLat = req.body.pickupLatitude || req.body.pickupLat;
      const pLng = req.body.pickupLongitude || req.body.pickupLng;
      const dLat = req.body.destinationLatitude || req.body.dropLat || req.body.destLat;
      const dLng = req.body.destinationLongitude || req.body.dropLng || req.body.destLng;
      const {
        vehicleType,
        pickupAddress,
        destinationAddress,
        isDoubleRide
      } = req.body;

      if (!pLat || !pLng || !dLat || !dLng) {
        return error(res, 'Pickup and destination coordinates are required.', 400);
      }

      const estimate = await FareService.getRideEstimates(
        parseFloat(pLat),
        parseFloat(pLng),
        parseFloat(dLat),
        parseFloat(dLng),
        vehicleType || 'BIKE',
        pickupAddress || null,
        destinationAddress || null,
        isDoubleRide === true || isDoubleRide === 'true' || isDoubleRide === 1
      );

      return success(res, 'Fare estimated successfully.', estimate);
    } catch (err) {
      next(err);
    }
  },

  async requestRide(req, res, next) {
    try {
      const {
        vehicleType,
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        viaAddress,
        viaLatitude,
        viaLongitude,
        destinationAddress,
        destinationLatitude,
        destinationLongitude,
        paymentMethod,
        femaleRiderOnly,
        isDoubleRide,
        isOutside
      } = req.body;

      if (!pickupAddress || !destinationAddress) {
        return error(res, 'Complete pickup and destination details are required.', 400);
      }

      let finalPickup = pickupAddress.trim();
      let finalVia = viaAddress ? viaAddress.trim() : null;
      let finalDest = destinationAddress.trim();
      let pLat = parseFloat(pickupLatitude) || 12.0240;
      let pLng = parseFloat(pickupLongitude) || 79.8530;
      let vLat = viaLatitude ? parseFloat(viaLatitude) : null;
      let vLng = viaLongitude ? parseFloat(viaLongitude) : null;
      let dLat = parseFloat(destinationLatitude) || 11.9350;
      let dLng = parseFloat(destinationLongitude) || 79.8300;

      const MapService = require('../services/map.service');

      if (finalPickup.includes('http://') || finalPickup.includes('https://') || finalPickup.includes('maps.app.goo.gl') || finalPickup.includes('google.com/maps') || finalPickup.includes('goo.gl/maps')) {
        const resolved = await MapService.resolveMapLink(finalPickup);
        if (resolved && resolved.name) {
          finalPickup = resolved.name;
          if (resolved.latitude && resolved.longitude) {
            pLat = resolved.latitude;
            pLng = resolved.longitude;
          }
        }
      }

      if (finalVia && (finalVia.includes('http://') || finalVia.includes('https://') || finalVia.includes('maps.app.goo.gl') || finalVia.includes('google.com/maps') || finalVia.includes('goo.gl/maps'))) {
        const resolved = await MapService.resolveMapLink(finalVia);
        if (resolved && resolved.name) {
          finalVia = resolved.name;
          if (resolved.latitude && resolved.longitude) {
            vLat = resolved.latitude;
            vLng = resolved.longitude;
          }
        }
      }

      if (finalDest.includes('http://') || finalDest.includes('https://') || finalDest.includes('maps.app.goo.gl') || finalDest.includes('google.com/maps') || finalDest.includes('goo.gl/maps')) {
        const resolved = await MapService.resolveMapLink(finalDest);
        if (resolved && resolved.name) {
          finalDest = resolved.name;
          if (resolved.latitude && resolved.longitude) {
            dLat = resolved.latitude;
            dLng = resolved.longitude;
          }
        }
      }

      if (finalPickup.toLowerCase() === finalDest.toLowerCase()) {
        return error(res, 'Pickup and drop-off cannot be the same location. Please choose a different destination.', 400);
      }

      const pLower = finalPickup.toLowerCase();
      const dLower = finalDest.toLowerCase();

      // Outside Trip Detection
      const isExplicitOutside = isOutside === true || isOutside === 'true' || isOutside === 1;
      const isKeywordsOutside = pLower.includes('other (type') || dLower.includes('other (type') ||
                                pLower.includes('outside') || dLower.includes('outside');

      const routeFare = await FareModel.findRouteFare(finalPickup, finalDest);
      const outsideTrip = isExplicitOutside || (isKeywordsOutside && !routeFare);

      const UserModel = require('../models/user.model');
      const customer = await UserModel.findById(req.user.id);
      const isFemaleCustomer = (customer?.gender || req.user.gender || '').toUpperCase() === 'FEMALE';
      const isFemaleOnlyRequested = isFemaleCustomer && Boolean(femaleRiderOnly === true || femaleRiderOnly === 'true' || femaleRiderOnly === 1 || femaleRiderOnly === '1');

      const ride = await RideService.requestRide({
        customerId: req.user.id,
        vehicleType: vehicleType || 'BIKE',
        pickupAddress: finalPickup,
        pickupLatitude: pLat,
        pickupLongitude: pLng,
        viaAddress: finalVia,
        viaLatitude: vLat,
        viaLongitude: vLng,
        destinationAddress: finalDest,
        destinationLatitude: dLat,
        destinationLongitude: dLng,
        paymentMethod: paymentMethod || 'CASH',
        femaleRiderOnly: isFemaleOnlyRequested,
        isDoubleRide: !outsideTrip && (isDoubleRide === true || isDoubleRide === 'true' || isDoubleRide === 1),
        isOutside: outsideTrip
      });

      const responseMessage = outsideTrip
        ? 'Outside trip submitted to Dispatch. Admin is setting the fare & assigning a rider.'
        : 'Ride requested successfully. Searching for nearby riders.';

      return success(res, responseMessage, ride, 201);
    } catch (err) {
      if (err.code === 'UNPAID_CANCELLATION_PENALTY') {
        return res.status(403).json({
          success: false,
          hasPendingPenalty: true,
          penalty: err.penalty,
          message: err.message
        });
      }
      return error(res, err.message, 400);
    }
  },

  async getPendingPenalty(req, res, next) {
    try {
      const PenaltyModel = require('../models/penalty.model');
      const penalty = await PenaltyModel.getPendingPenaltyForCustomer(req.user.id);
      if (penalty) {
        const riderUpi = penalty.rider_upi_id || penalty.profile_upi_id || `${penalty.rider_phone}@upi`;
        const riderName = penalty.rider_name || penalty.rider_name_full || 'Driver';
        const upiPayUrl = `upi://pay?pa=${encodeURIComponent(riderUpi)}&pn=${encodeURIComponent(riderName)}&am=15.00&tn=Papido_Driver_Comp_${penalty.ride_code || 'Fee'}&cu=INR`;
        return success(res, 'Pending cancellation penalty found.', {
          ...penalty,
          riderUpi,
          riderName,
          upiPayUrl
        });
      }
      return success(res, 'No pending penalty.', null);
    } catch (err) {
      next(err);
    }
  },

  async claimPenaltyPaid(req, res, next) {
    try {
      const penaltyId = req.params.id;
      const { paymentReference } = req.body;
      const result = await RideService.claimPenaltyPaid(penaltyId, req.user.id, paymentReference);
      return success(res, 'Payment claimed! Notification sent to driver to verify.', result);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async settlePenalty(req, res, next) {
    try {
      const penaltyId = req.params.id;
      const { paymentReference } = req.body;
      const result = await RideService.settlePenalty(penaltyId, req.user.id, paymentReference);
      return success(res, 'Cancellation compensation settled successfully! You can now book rides.', result);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async getActiveRide(req, res, next) {
    try {
      const activeRide = await RideModel.getActiveRideForCustomer(req.user.id);
      return success(res, 'Active ride status retrieved.', activeRide);
    } catch (err) {
      next(err);
    }
  },

  async getMyRides(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;

      const [rides, total] = await Promise.all([
        RideModel.listRides({
          customerId: req.user.id,
          status: req.query.status,
          limit,
          offset
        }),
        RideModel.countRides({
          customerId: req.user.id,
          status: req.query.status
        })
      ]);

      return paginate(res, 'Customer ride history fetched.', rides, total, page, limit);
    } catch (err) {
      next(err);
    }
  },

  async getRideById(req, res, next) {
    try {
      const ride = await RideModel.findById(req.params.id);
      if (!ride) {
        return error(res, 'Ride not found.', 404);
      }
      if (ride.customer_id !== req.user.id) {
        return error(res, 'Access denied to this ride record.', 403);
      }
      return success(res, 'Ride details fetched.', ride);
    } catch (err) {
      next(err);
    }
  },

  async cancelRide(req, res, next) {
    try {
      const rideId = req.params.id;
      const { reason } = req.body;

      const ride = await RideService.cancelRide(
        rideId,
        req.user.id,
        'CUSTOMER',
        reason || 'Customer cancelled ride request'
      );

      return success(res, 'Ride cancelled successfully.', ride);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async submitRating(req, res, next) {
    try {
      const rideId = req.params.id;
      const { rating, review } = req.body;

      if (!rating) {
        return error(res, 'Rating is required (1.0 to 5.0).', 400);
      }

      const result = await RideService.submitRating({
        rideId,
        customerId: req.user.id,
        rating: parseFloat(rating),
        review
      });

      return success(res, 'Thank you! Rating submitted successfully.', result);
    } catch (err) {
      return error(res, err.message, 400);
    }
  }
};

module.exports = CustomerController;
