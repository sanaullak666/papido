const UserModel = require('../models/user.model');
const RiderModel = require('../models/rider.model');
const CustomerModel = require('../models/customer.model');
const RideModel = require('../models/ride.model');
const PaymentModel = require('../models/payment.model');
const EarningModel = require('../models/earning.model');
const FareModel = require('../models/fare.model');
const RideService = require('../services/ride.service');
const db = require('../config/database');
const { success, error, paginate } = require('../utils/response');

const AdminController = {
  /**
   * Complete overview dashboard statistics
   */
  async getDashboardOverview(req, res, next) {
    try {
      const [
        totalCustomers,
        totalRiders,
        onlineRiders,
        totalRides,
        ridesByStatus,
        financials,
        recentRides
      ] = await Promise.all([
        CustomerModel.countAll({}),
        RiderModel.countAll({}),
        RiderModel.countAll({ isOnline: true, verificationStatus: 'APPROVED' }),
        RideModel.countRides({}),
        db.query('SELECT status, COUNT(*) as count FROM rides GROUP BY status'),
        EarningModel.getPlatformRevenueStats(),
        RideModel.listRides({ limit: 8 })
      ]);

      const statusMap = {};
      ridesByStatus.forEach(r => { statusMap[r.status] = r.count; });

      // Daily ride trends for chart
      const rideTrends = await db.query(`
        SELECT date(requested_at) as date, COUNT(id) as total_rides,
               SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_rides,
               SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_rides
        FROM rides
        GROUP BY date(requested_at)
        ORDER BY date(requested_at) DESC
        LIMIT 7
      `);

      return success(res, 'Admin dashboard overview data fetched.', {
        metrics: {
          totalCustomers,
          totalRiders,
          activeRiders: onlineRiders,
          totalRides,
          pendingOutsideRides: statusMap['PENDING_ADMIN_QUOTE'] || 0,
          completedRides: statusMap['COMPLETED'] || 0,
          cancelledRides: statusMap['CANCELLED'] || 0,
          requestedRides: statusMap['REQUESTED'] || 0,
          inProgressRides: (statusMap['ACCEPTED'] || 0) + (statusMap['RIDER_ARRIVING'] || 0) + (statusMap['RIDER_REACHED'] || 0) + (statusMap['STARTED'] || 0),
          todayVolume: financials.todayVolume,
          todayCompanyRevenue: financials.todayCompanyRevenue,
          todayRiderEarnings: financials.todayRiderEarnings,
          totalVolume: financials.totalVolume,
          totalCompanyRevenue: financials.totalCompanyRevenue,
          totalRiderPayouts: financials.totalRiderPayouts
        },
        rideTrends: rideTrends.reverse(),
        recentRides
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Customer management
   */
  async listCustomers(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;

      const [customers, total] = await Promise.all([
        CustomerModel.listAll({ search: req.query.search, limit, offset }),
        CustomerModel.countAll({ search: req.query.search })
      ]);

      return paginate(res, 'Customers fetched.', customers, total, page, limit);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Rider management
   */
  async listRiders(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;

      const filters = {
        verificationStatus: req.query.verificationStatus,
        vehicleType: req.query.vehicleType,
        isOnline: req.query.isOnline !== undefined ? req.query.isOnline === 'true' : undefined,
        search: req.query.search
      };

      const [riders, total] = await Promise.all([
        RiderModel.listAll({ ...filters, limit, offset }),
        RiderModel.countAll(filters)
      ]);

      return paginate(res, 'Riders fetched.', riders, total, page, limit);
    } catch (err) {
      next(err);
    }
  },

  async verifyRider(req, res, next) {
    try {
      const riderUserId = req.params.id;
      const { status } = req.body; // 'APPROVED' or 'REJECTED'

      if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
        return error(res, 'Status must be APPROVED, REJECTED, or PENDING.', 400);
      }

      const updated = await RiderModel.updateVerificationStatus(riderUserId, status);
      return success(res, `Rider verification status updated to ${status}.`, updated);
    } catch (err) {
      next(err);
    }
  },

  async updateUserStatus(req, res, next) {
    try {
      const userId = req.params.id;
      const { status, reason } = req.body;

      if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
        return error(res, 'Status must be ACTIVE, INACTIVE, or SUSPENDED.', 400);
      }

      if (status === 'SUSPENDED' && (!reason || reason.trim().length === 0)) {
        return error(res, 'Please provide a valid suspension reason explaining why the account is suspended.', 400);
      }

      const suspensionReason = status === 'SUSPENDED' ? reason.trim() : null;
      const updated = await UserModel.updateStatus(userId, status, suspensionReason);

      // If user is suspended, disconnect rider from online state if applicable
      if (status === 'SUSPENDED') {
        try {
          await RiderModel.updateOnlineStatus(userId, false);
        } catch (_) {}
      }

      // Emit real-time socket event so user's app receives suspension notice immediately
      try {
        const socketService = require('../services/socket.service');
        if (socketService.io) {
          socketService.io.to(`user_${userId}`).emit('account_status_changed', {
            status,
            suspensionReason,
            message: status === 'SUSPENDED'
              ? `Your account has been suspended: ${suspensionReason}`
              : `Your account status is now ${status}`
          });
        }
      } catch (_) {}

      return success(res, `User status updated to ${status}.`, updated);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Ride operations
   */
  async listRides(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;

      const filters = {
        customerId: req.query.customerId,
        riderId: req.query.riderId,
        status: req.query.status,
        vehicleType: req.query.vehicleType,
        search: req.query.search
      };

      const [rides, total] = await Promise.all([
        RideModel.listRides({ ...filters, limit, offset }),
        RideModel.countRides(filters)
      ]);

      return paginate(res, 'Rides list fetched.', rides, total, page, limit);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Payment transactions
   */
  async listPayments(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;

      const filters = {
        customerId: req.query.customerId,
        paymentStatus: req.query.paymentStatus,
        paymentMethod: req.query.paymentMethod
      };

      const [payments, total] = await Promise.all([
        PaymentModel.listAll({ ...filters, limit, offset }),
        PaymentModel.countAll(filters)
      ]);

      return paginate(res, 'Payments fetched.', payments, total, page, limit);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Fare configurations
   */
  async getFareConfigurations(req, res, next) {
    try {
      const configs = await FareModel.getAllConfigurations();
      return success(res, 'Fare configurations fetched.', configs);
    } catch (err) {
      next(err);
    }
  },

  async updateFareConfiguration(req, res, next) {
    try {
      const vehicleType = req.params.vehicleType;
      const updated = await FareModel.updateConfiguration(vehicleType, req.body);
      return success(res, `Fare configuration for ${vehicleType} updated.`, updated);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Campus Route Fares
   */
  async getRouteFares(req, res, next) {
    try {
      const routes = await FareModel.getAllRouteFares();
      return success(res, 'Campus route fares fetched.', routes);
    } catch (err) {
      next(err);
    }
  },

  async saveRouteFare(req, res, next) {
    try {
      const { id, pickupStop, destinationStop, fareAmount, distanceKm, isActive, isBidirectional } = req.body;
      if (id) {
        const updated = await FareModel.updateRouteFareById(id, { fareAmount, distanceKm, isActive });
        return success(res, 'Route fare updated successfully.', updated);
      } else {
        if (!pickupStop || !destinationStop || fareAmount === undefined) {
          return error(res, 'Pickup stop, destination stop, and fare amount are required.', 400);
        }
        const created = await FareModel.upsertRouteFare({
          pickupStop,
          destinationStop,
          fareAmount,
          distanceKm,
          isActive,
          isBidirectional: isBidirectional !== false
        });
        return success(res, 'Route fare saved successfully.', created, 201);
      }
    } catch (err) {
      next(err);
    }
  },

  async deleteRouteFare(req, res, next) {
    try {
      const id = req.params.id;
      await FareModel.deleteRouteFare(id);
      return success(res, 'Route fare deleted successfully.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Dynamic split rules
   */
  async getSplitRules(req, res, next) {
    try {
      const rules = await FareModel.getAllSplitRules();
      return success(res, 'Fare split rules fetched.', rules);
    } catch (err) {
      next(err);
    }
  },

  async createSplitRule(req, res, next) {
    try {
      const created = await FareModel.createSplitRule(req.body);
      return success(res, 'Fare split rule created successfully.', created, 201);
    } catch (err) {
      next(err);
    }
  },

  async updateSplitRule(req, res, next) {
    try {
      const ruleId = req.params.id;
      const updated = await FareModel.updateSplitRule(ruleId, req.body);
      return success(res, 'Fare split rule updated successfully.', updated);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Reports & Analytics
   */
  async getReports(req, res, next) {
    try {
      const period = req.query.period || 'daily'; // 'daily', 'weekly', 'monthly'

      const reportData = await db.query(`
        SELECT 
          date(r.requested_at) as report_date,
          COUNT(r.id) as total_rides,
          SUM(CASE WHEN r.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_rides,
          SUM(CASE WHEN r.status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_rides,
          COALESCE(SUM(re.total_fare), 0) as gross_volume,
          COALESCE(SUM(re.rider_earning), 0) as rider_payouts,
          COALESCE(SUM(re.company_earning), 0) as company_revenue
        FROM rides r
        LEFT JOIN rider_earnings re ON r.id = re.ride_id
        GROUP BY date(r.requested_at)
        ORDER BY date(r.requested_at) DESC
        LIMIT 30
      `);

      return success(res, `Platform ${period} performance report fetched.`, reportData);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Outside Ride Quoting & Manual Dispatch
   */
  async listPendingOutsideRides(req, res, next) {
    try {
      const pending = await RideModel.listPendingOutsideRides();
      const allOutside = await RideModel.listAllOutsideRides({ limit: 100 });
      return success(res, 'Outside trips fetched successfully.', {
        pending,
        all: allOutside
      });
    } catch (err) {
      next(err);
    }
  },

  async listActiveRiders(req, res, next) {
    try {
      const riders = await db.query(`
        SELECT u.id as user_id, u.name, u.phone, u.gender,
               rp.vehicle_type, rp.vehicle_number, rp.vehicle_model, rp.rating, rp.is_online, rp.verification_status
        FROM users u
        JOIN rider_profiles rp ON u.id = rp.user_id
        WHERE u.role = 'RIDER' AND rp.verification_status = 'APPROVED'
        ORDER BY rp.is_online DESC, u.name ASC
      `);
      return success(res, 'Active riders list fetched.', riders);
    } catch (err) {
      next(err);
    }
  },

  async dispatchOutsideRide(req, res, next) {
    try {
      const rideId = req.params.id;
      const { fareAmount, assignedRiderId } = req.body;

      if (!fareAmount || isNaN(fareAmount) || parseFloat(fareAmount) <= 0) {
        return error(res, 'A valid positive fare amount is required.', 400);
      }

      const ride = await RideService.adminQuoteAndDispatch(
        rideId,
        parseFloat(fareAmount),
        assignedRiderId ? parseInt(assignedRiderId) : null
      );

      return success(res, 'Outside ride fare quoted and dispatched successfully.', ride);
    } catch (err) {
      return error(res, err.message, 400);
    }
  }
};

module.exports = AdminController;
