const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const RideModel = require('../models/ride.model');
const LiveLocationService = require('../services/liveLocation.service');
const { success, error } = require('../utils/response');

/**
 * GET /api/rides/:id/live-location
 * Returns the active Redis live GPS location for a specific ride
 */
router.get('/:id/live-location', verifyToken, async (req, res, next) => {
  try {
    const rideId = req.params.id;
    const userId = req.user.id;
    const userRole = (req.user.role || '').toUpperCase();

    const ride = await RideModel.findById(rideId);
    if (!ride) {
      return error(res, 'Ride not found', 404);
    }

    // Authorization check: Customer, Assigned Driver, or Admin
    const isCustomer = Number(ride.customer_id) === Number(userId);
    const isDriver = Number(ride.rider_id) === Number(userId);
    const isAdmin = userRole === 'ADMIN';

    if (!isCustomer && !isDriver && !isAdmin) {
      return error(res, 'You are not authorized to view live location for this ride', 403);
    }

    const liveLocation = await LiveLocationService.getLiveLocation(rideId);

    return success(res, {
      rideId: Number(rideId),
      rideCode: ride.ride_code,
      status: ride.status,
      live: Boolean(liveLocation),
      location: liveLocation || null,
      pickup: {
        latitude: parseFloat(ride.pickup_latitude),
        longitude: parseFloat(ride.pickup_longitude),
        address: ride.pickup_address
      },
      destination: {
        latitude: parseFloat(ride.destination_latitude),
        longitude: parseFloat(ride.destination_longitude),
        address: ride.destination_address
      }
    }, 'Live ride location retrieved successfully');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
