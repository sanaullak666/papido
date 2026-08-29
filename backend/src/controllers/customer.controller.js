const CustomerModel = require('../models/customer.model');
const RideModel = require('../models/ride.model');
const RideService = require('../services/ride.service');
const FareService = require('../services/fare.service');
const FareModel = require('../models/fare.model');
const db = require('../config/database');
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

  async checkPreferenceAvailability(req, res, next) {
    try {
      const vehicleType = req.body?.vehicleType || req.query?.vehicleType || 'ANY';
      const femaleRiderOnly = req.body?.femaleRiderOnly !== undefined
        ? req.body.femaleRiderOnly
        : req.query?.femaleRiderOnly;

      const UserModel = require('../models/user.model');
      const user = await UserModel.findById(req.user.id);
      const isFemaleCustomer = (user?.gender || req.user.gender || '').toUpperCase() === 'FEMALE';
      const isFemaleOnlyRequested = isFemaleCustomer && (femaleRiderOnly === true || femaleRiderOnly === 'true' || femaleRiderOnly === 1 || femaleRiderOnly === '1');

      const RiderModel = require('../models/rider.model');
      const availability = await RiderModel.checkPreferenceAvailability({
        vehicleType,
        femaleRiderOnly: isFemaleOnlyRequested
      });

      return success(res, 'Preference availability checked successfully.', availability);
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
        isOutside,
        isScheduled,
        scheduledTime
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

      const isScheduledTrip = isScheduled === true || isScheduled === 'true' || isScheduled === 1;

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
        isOutside: outsideTrip,
        isScheduled: isScheduledTrip,
        scheduledTime: isScheduledTrip ? scheduledTime : null
      });

      const responseMessage = isScheduledTrip
        ? `Ride pre-booked successfully for ${scheduledTime}.`
        : (outsideTrip
            ? 'Outside trip submitted to Dispatch. Admin is setting the fare & assigning a rider.'
            : 'Ride requested successfully. Searching for nearby riders.');

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
      let activeRide = await RideModel.getActiveRideForCustomer(req.user.id);
      if (!activeRide) {
        activeRide = await RideModel.getLatestCompletedUnratedRideForCustomer(req.user.id);
      }
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
  },

  /**
   * Flash Free Ride: Check active and claim
   */
  async getActiveFlashFreeRide(req, res, next) {
    try {
      // Auto-expire past deadline
      await db.query(`
        UPDATE flash_free_rides 
        SET status = 'EXPIRED' 
        WHERE status = 'OPEN' AND expires_at < NOW()
      `);

      const activeFlash = await db.queryOne(`
        SELECT id, pickup_location as pickup, destination_location as destination, expires_at, status
        FROM flash_free_rides
        WHERE status = 'OPEN' AND expires_at > NOW()
        ORDER BY id DESC LIMIT 1
      `);

      return success(res, 'Active flash free ride status.', activeFlash || null);
    } catch (err) {
      next(err);
    }
  },

  async claimFlashFreeRide(req, res, next) {
    try {
      const { flashId } = req.body;
      const customerId = req.user.id;

      if (!flashId) {
        return error(res, 'Flash offer ID is required.', 400);
      }

      // Check if user already has an active ride
      const existingActive = await RideModel.getActiveRideForCustomer(customerId);
      if (existingActive && ['PENDING_ADMIN_QUOTE', 'REQUESTED', 'ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED', 'STARTED'].includes(existingActive.status)) {
        return error(res, `You already have an active ride (${existingActive.ride_code}) in progress. Complete or cancel it first.`, 400);
      }

      // Atomic claim attempt: strictly 1 winner!
      const updateResult = await db.query(`
        UPDATE flash_free_rides
        SET status = 'CLAIMED', claimed_by_user_id = ?, updated_at = NOW()
        WHERE id = ? AND status = 'OPEN' AND expires_at > NOW()
      `, [customerId, flashId]);

      if (!updateResult || updateResult.affectedRows === 0) {
        return error(res, 'Sorry! This Flash Free Ride was just claimed by another student or has expired.', 409);
      }

      const flashOffer = await db.queryOne(`SELECT * FROM flash_free_rides WHERE id = ?`, [flashId]);
      if (!flashOffer) {
        return error(res, 'Flash offer details could not be found.', 404);
      }

      // Create ₹0 Ride for Core Members only
      const rideCode = RideService.generateRideCode();
      const otp = RideService.generateOTP();

      const newRide = await RideModel.create({
        rideCode,
        customerId,
        vehicleType: 'BIKE',
        pickupAddress: flashOffer.pickup_location,
        pickupLatitude: 12.0240,
        pickupLongitude: 79.8530,
        viaAddress: null,
        viaLatitude: null,
        viaLongitude: null,
        destinationAddress: flashOffer.destination_location,
        destinationLatitude: 11.9350,
        destinationLongitude: 79.8300,
        estimatedDistance: 1.5,
        estimatedDuration: 5,
        estimatedFare: 0.00,
        otp,
        paymentMethod: 'FREE_PASS',
        femaleRiderOnly: false,
        isDoubleRide: false,
        isOutside: false
      });

      // Update ride to be is_free_ride = 1, is_core_only = 1
      await db.query(`
        UPDATE rides 
        SET is_free_ride = 1, is_core_only = 1, final_fare = 0.00, payment_status = 'COMPLETED'
        WHERE id = ?
      `, [newRide.id]);

      // Link ride to flash offer
      await db.query(`UPDATE flash_free_rides SET ride_id = ? WHERE id = ?`, [newRide.id, flashId]);

      const completeRide = await RideModel.findById(newRide.id);

      // Broadcast to socket: offer is claimed
      const socketManager = req.app.get('socketManager');
      if (socketManager) {
        socketManager.io.emit('flash_free_ride:claimed', {
          id: flashId,
          claimedBy: req.user.name || 'Passenger',
          pickup: flashOffer.pickup_location,
          destination: flashOffer.destination_location
        });

        // Notify Core Riders of new trip
        socketManager.io.emit('ride:requested', {
          rideId: completeRide.id,
          rideCode: completeRide.ride_code,
          pickupAddress: completeRide.pickup_address,
          destinationAddress: completeRide.destination_address,
          vehicleType: completeRide.vehicle_type,
          estimatedFare: 0.00,
          isFreeRide: true,
          isCoreOnly: true,
          femaleRiderOnly: false
        });
      }

      return success(res, 'Congratulations! You won the Papido Flash Free Ride!', completeRide);
    } catch (err) {
      next(err);
    }
  },

  async getScheduledRides(req, res, next) {
    try {
      const rides = await RideService.getScheduledRides(req.user.id);
      return success(res, 'Scheduled rides fetched successfully.', rides);
    } catch (err) {
      next(err);
    }
  },

  async cancelScheduledRide(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const result = await RideService.cancelScheduledRide(id, req.user.id, reason);
      return success(res, 'Scheduled ride cancelled successfully with zero charge.', result);
    } catch (err) {
      next(err);
    }
  },

  async rescheduleScheduledRide(req, res, next) {
    try {
      const { id } = req.params;
      const { scheduledTime } = req.body;
      if (!scheduledTime) {
        return error(res, 'New scheduled date and time is required.', 400);
      }
      const result = await RideService.rescheduleRide(id, req.user.id, scheduledTime);
      return success(res, 'Scheduled ride date and time updated successfully.', result);
    } catch (err) {
      return error(res, err.message, 400);
    }
  }
};

module.exports = CustomerController;
