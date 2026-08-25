const RiderModel = require('../models/rider.model');
const RideModel = require('../models/ride.model');
const EarningModel = require('../models/earning.model');
const RideService = require('../services/ride.service');
const { success, error, paginate } = require('../utils/response');

const RiderController = {
  async getProfile(req, res, next) {
    try {
      const profile = await RiderModel.findByUserId(req.user.id);
      return success(res, 'Rider driver profile fetched successfully.', profile);
    } catch (err) {
      next(err);
    }
  },

  async toggleStatus(req, res, next) {
    try {
      const { isOnline } = req.body;
      if (typeof isOnline !== 'boolean') {
        return error(res, 'isOnline boolean field is required.', 400);
      }

      const currentProfile = await RiderModel.findByUserId(req.user.id);
      if (!currentProfile) {
        return error(res, 'Rider profile not found.', 404);
      }

      if (isOnline && currentProfile.verification_status !== 'APPROVED') {
        return error(
          res,
          `Cannot go online. Your driver account is ${currentProfile.verification_status}. Admin verification is required to start accepting campus rides.`,
          403
        );
      }

      const profile = await RiderModel.updateOnlineStatus(req.user.id, isOnline);

      const socketManager = req.app.get('socketManager');
      if (socketManager) {
        socketManager.io.to('role_ADMIN').emit('admin:rider_status_changed', {
          riderId: req.user.id,
          isOnline: Boolean(isOnline),
          name: req.user.name,
          updatedAt: new Date().toISOString()
        });
      }

      return success(res, `Rider is now ${isOnline ? 'ONLINE' : 'OFFLINE'}.`, profile);
    } catch (err) {
      next(err);
    }
  },

  async uploadDocuments(req, res, next) {
    try {
      const { licenseDocUrl, rcDocUrl, collegeIdDocUrl } = req.body;
      if (!licenseDocUrl && !rcDocUrl && !collegeIdDocUrl) {
        return error(res, 'At least one document URL is required for submission.', 400);
      }

      const updated = await RiderModel.updateDocuments(req.user.id, {
        licenseDocUrl,
        rcDocUrl,
        collegeIdDocUrl
      });
      return success(res, 'Documents submitted for verification successfully.', updated);
    } catch (err) {
      next(err);
    }
  },

  async updateLocation(req, res, next) {
    try {
      const { latitude, longitude } = req.body;
      if (!latitude || !longitude) {
        return error(res, 'Latitude and longitude coordinates are required.', 400);
      }

      const profile = await RiderModel.updateLocation(req.user.id, parseFloat(latitude), parseFloat(longitude));
      return success(res, 'Rider location updated successfully.', profile);
    } catch (err) {
      next(err);
    }
  },

  async getActiveRide(req, res, next) {
    try {
      const activeRide = await RideModel.getActiveRideForRider(req.user.id);
      return success(res, 'Active assigned ride retrieved.', activeRide);
    } catch (err) {
      next(err);
    }
  },

  async getAvailableRequests(req, res, next) {
    try {
      const UserModel = require('../models/user.model');
      const [user, profile] = await Promise.all([
        UserModel.findById(req.user.id),
        RiderModel.findByUserId(req.user.id)
      ]);
      const riderGender = (user?.gender || req.user.gender || 'OTHER').toUpperCase();
      const riderVehicleType = req.query.vehicleType || profile?.vehicle_type || 'BIKE';
      const isCoreMember = Boolean(user?.is_core_member || profile?.is_core_member || user?.role === 'CORE_MEMBER');

      // Find open requested rides matching rider's gender and vehicle type (including core-only if rider is core)
      const rides = await RideModel.getAvailableRequestsForRider(
        req.user.id,
        riderGender,
        riderVehicleType,
        isCoreMember
      );
      return success(res, 'Available ride requests nearby.', rides);
    } catch (err) {
      next(err);
    }
  },

  async acceptRide(req, res, next) {
    try {
      const rideId = req.params.id;
      const ride = await RideService.acceptRide(rideId, req.user.id);
      return success(res, 'Ride accepted successfully! Please head towards pickup.', ride);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async declineRide(req, res, next) {
    try {
      const rideId = req.params.id;
      const result = await RideService.declineRide(rideId, req.user.id);
      return success(res, 'Ride request declined.', result);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async setArriving(req, res, next) {
    try {
      const rideId = req.params.id;
      const ride = await RideService.setRiderArriving(rideId, req.user.id);
      return success(res, 'Status updated: Rider is arriving at pickup.', ride);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async setReached(req, res, next) {
    try {
      const rideId = req.params.id;
      const ride = await RideService.setRiderReached(rideId, req.user.id);
      return success(res, 'Status updated: Rider reached pickup location.', ride);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async startRide(req, res, next) {
    try {
      const rideId = req.params.id;
      const { otp } = req.body;

      const ride = await RideService.startRide(rideId, req.user.id, otp);
      return success(res, 'Ride started successfully! Drive safely.', ride);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async completeRide(req, res, next) {
    try {
      const rideId = req.params.id;
      const { finalFare } = req.body;

      const result = await RideService.completeRide(rideId, req.user.id, finalFare);
      return success(res, 'Ride completed successfully! Earnings added to your wallet.', result);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async toggleWaiting(req, res, next) {
    try {
      const rideId = req.params.id;
      const { isWaiting, waitingMinutes } = req.body;

      const ride = await RideService.toggleWaiting(rideId, req.user.id, isWaiting, waitingMinutes);
      return success(res, isWaiting ? 'Driver is now on waiting.' : 'Driver waiting paused/ended.', ride);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async getEarnings(req, res, next) {
    try {
      const summary = await EarningModel.getRiderEarningsSummary(req.user.id);
      const recentEarnings = await EarningModel.listRiderEarnings(req.user.id, { limit: 10 });

      return success(res, 'Rider earnings breakdown fetched.', {
        summary,
        netDriverEarning: summary?.today?.earnings || 0,
        todayTotal: summary?.today?.earnings || 0,
        todayGross: summary?.today?.grossFare || 0,
        todayTrips: summary?.today?.rides || 0,
        companyCommission: summary?.today?.companyDeduction || 0,
        recentEarnings
      });
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
          riderId: req.user.id,
          status: req.query.status,
          limit,
          offset
        }),
        RideModel.countRides({
          riderId: req.user.id,
          status: req.query.status
        })
      ]);

      return paginate(res, 'Rider trip history fetched.', rides, total, page, limit);
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
        'RIDER',
        reason || 'Rider cancelled ride'
      );

      return success(res, 'Ride cancelled successfully.', ride);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async getPendingPenaltyVerifications(req, res, next) {
    try {
      const PenaltyModel = require('../models/penalty.model');
      const penalties = await PenaltyModel.getPendingConfirmationsForRider(req.user.id);
      return success(res, 'Pending penalty verifications fetched.', penalties);
    } catch (err) {
      next(err);
    }
  },

  async confirmPenaltyPayment(req, res, next) {
    try {
      const penaltyId = req.params.id;
      const { isConfirmed, confirmed, notes } = req.body;
      const result = await RideService.confirmPenaltyPayment(
        penaltyId,
        req.user.id,
        isConfirmed !== undefined ? Boolean(isConfirmed) : Boolean(confirmed),
        notes
      );
      const msg = (isConfirmed || confirmed)
        ? 'Payment receipt confirmed! ₹15 recorded and passenger unlocked.'
        : 'Payment marked as not received. Passenger remains blocked.';
      return success(res, msg, result);
    } catch (err) {
      return error(res, err.message, 400);
    }
  }
};

module.exports = RiderController;
