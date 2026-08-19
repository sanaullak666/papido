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
   * Campus Areas (Campus Zones) Management
   */
  async getCampusAreas(req, res, next) {
    try {
      const areas = await FareModel.getAllAdminCampusAreas();
      return success(res, 'Campus areas fetched.', areas);
    } catch (err) {
      next(err);
    }
  },

  async saveCampusArea(req, res, next) {
    try {
      const { id, area_code, name, icon, color, bg_color, description, display_order, is_active } = req.body;
      if (!name || name.trim().length === 0) {
        return error(res, 'Campus area name is required.', 400);
      }
      if (id) {
        const updated = await FareModel.updateCampusArea(id, { area_code, name, icon, color, bg_color, description, display_order, is_active });
        return success(res, 'Campus area updated successfully.', updated);
      } else {
        const created = await FareModel.createCampusArea({ area_code, name, icon, color, bg_color, description, display_order, is_active });
        return success(res, 'Campus area created successfully.', created, 201);
      }
    } catch (err) {
      next(err);
    }
  },

  async deleteCampusArea(req, res, next) {
    try {
      const id = req.params.id;
      const deleteStops = req.query.deleteStops === 'true' || req.body?.deleteStops === true;
      const result = await FareModel.deleteCampusArea(id, { deleteStops });
      return success(res, 'Campus area deleted successfully.', result);
    } catch (err) {
      next(err);
    }
  },

  async deleteAllCampusAreas(req, res, next) {
    try {
      const deleteStops = req.query.deleteStops === 'true' || req.body?.deleteStops === true;
      await FareModel.deleteAllCampusAreas({ deleteStops });
      return success(res, 'All campus areas deleted successfully.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Area-to-Area Fare Matrix Management
   */
  async getAreaFares(req, res, next) {
    try {
      const fares = await FareModel.getAllAreaFares();
      return success(res, 'Area-to-Area fares fetched.', fares);
    } catch (err) {
      next(err);
    }
  },

  async getAreaFareMatrix(req, res, next) {
    try {
      const matrix = await FareModel.getAreaFareMatrix();
      return success(res, 'Area fare matrix fetched.', matrix);
    } catch (err) {
      next(err);
    }
  },

  async saveAreaFare(req, res, next) {
    try {
      const { fromAreaCode, toAreaCode, fareAmount, distanceKm, isActive } = req.body;
      if (!fromAreaCode || !toAreaCode || fareAmount === undefined) {
        return error(res, 'fromAreaCode, toAreaCode, and fareAmount are required.', 400);
      }
      const saved = await FareModel.upsertAreaFare({ fromAreaCode, toAreaCode, fareAmount, distanceKm, isActive });
      return success(res, 'Area-to-Area fare saved successfully.', saved);
    } catch (err) {
      next(err);
    }
  },

  async saveAreaFareMatrix(req, res, next) {
    try {
      const { updates } = req.body;
      if (!Array.isArray(updates)) {
        return error(res, 'Matrix updates array is required.', 400);
      }
      const matrix = await FareModel.saveAreaFareMatrix(updates);
      return success(res, 'Area fare matrix saved successfully.', matrix);
    } catch (err) {
      next(err);
    }
  },

  async deleteAreaFare(req, res, next) {
    try {
      const id = req.params.id;
      await FareModel.deleteAreaFare(id);
      return success(res, 'Area fare rule deleted successfully.');
    } catch (err) {
      next(err);
    }
  },

  async deleteAllAreaFares(req, res, next) {
    try {
      await FareModel.deleteAllAreaFares();
      return success(res, 'All Area-to-Area fares deleted successfully.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Campus Categories & Lists Management (Legacy / Group Support)
   */
  async getCampusCategories(req, res, next) {
    try {
      const categories = await FareModel.getAllAdminCategories();
      return success(res, 'Campus categories and lists fetched.', categories);
    } catch (err) {
      next(err);
    }
  },

  async saveCampusCategory(req, res, next) {
    try {
      const { id, category_key, label, token, icon, color, bg_color, display_order, is_active } = req.body;
      if (!label || label.trim().length === 0) {
        return error(res, 'Category name/label is required.', 400);
      }
      if (id) {
        const updated = await FareModel.updateCategory(id, { category_key, label, token, icon, color, bg_color, display_order, is_active });
        return success(res, 'Category updated successfully.', updated);
      } else {
        const created = await FareModel.createCategory({ category_key, label, token, icon, color, bg_color, display_order, is_active });
        return success(res, 'Category created successfully.', created, 201);
      }
    } catch (err) {
      next(err);
    }
  },

  async deleteCampusCategory(req, res, next) {
    try {
      const id = req.params.id;
      const deleteStops = req.query.deleteStops === 'true' || req.body?.deleteStops === true;
      const result = await FareModel.deleteCategory(id, { deleteStops });
      return success(res, 'Campus category deleted successfully.', result);
    } catch (err) {
      next(err);
    }
  },

  async deleteAllCampusCategories(req, res, next) {
    try {
      const deleteStops = req.query.deleteStops === 'true' || req.body?.deleteStops === true;
      await FareModel.deleteAllCategories({ deleteStops });
      return success(res, 'All campus categories deleted successfully.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Campus Stops & Location Lists Management
   */
  async getCampusStops(req, res, next) {
    try {
      const stops = await FareModel.getAllAdminCampusStops();
      const grouped = await FareModel.getGroupedCampusStops();
      const categories = await FareModel.getAllAdminCategories();
      return success(res, 'Campus stops and categories fetched.', { stops, grouped, categories });
    } catch (err) {
      next(err);
    }
  },

  async saveCampusStop(req, res, next) {
    try {
      const { id, name, area_code, category, category_label, latitude, longitude, display_order, is_active } = req.body;
      if (!name) {
        return error(res, 'Stop name is required.', 400);
      }
      const finalCategory = category || 'GATE_HUB';
      const finalAreaCode = area_code || 'MAIN_CAMPUS';

      if (id) {
        const updated = await FareModel.updateCampusStop(id, { name, area_code: finalAreaCode, category: finalCategory, category_label, latitude, longitude, display_order, is_active });
        return success(res, 'Campus stop updated successfully.', updated);
      } else {
        const created = await FareModel.createCampusStop({ name, area_code: finalAreaCode, category: finalCategory, category_label, latitude, longitude, display_order });
        return success(res, 'Campus stop created successfully.', created, 201);
      }
    } catch (err) {
      next(err);
    }
  },

  async deleteCampusStop(req, res, next) {
    try {
      const id = req.params.id;
      await FareModel.deleteCampusStop(id);
      return success(res, 'Campus stop deleted successfully.');
    } catch (err) {
      next(err);
    }
  },

  async deleteAllCampusStops(req, res, next) {
    try {
      const category = req.query.category || req.body?.category || null;
      await FareModel.deleteAllCampusStops({ category });
      return success(res, category ? `Stops in category ${category} deleted.` : 'All campus stops deleted.');
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
      const { id, pickupStop, destinationStop, fareAmount, distanceKm, isActive } = req.body;
      if (id) {
        const updated = await FareModel.updateRouteFareById(id, { fareAmount, distanceKm, isActive, pickupStop, destinationStop });
        return success(res, 'Route fare updated successfully.', updated);
      } else {
        if (!pickupStop || !destinationStop || fareAmount === undefined) {
          return error(res, 'Pickup stop, destination stop, and fare amount are required.', 400);
        }
        const created = await FareModel.upsertRouteFare({ pickupStop, destinationStop, fareAmount, distanceKm, isActive });
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

  async deleteAllRouteFares(req, res, next) {
    try {
      await FareModel.deleteAllRouteFares();
      return success(res, 'All route fare rules deleted successfully.');
    } catch (err) {
      next(err);
    }
  },

  async testRouteFare(req, res, next) {
    try {
      const { pickupStop, destinationStop } = req.body;
      if (!pickupStop || !destinationStop) {
        return error(res, 'Pickup and destination stop are required.', 400);
      }
      const pArea = await FareModel.resolveStopArea(pickupStop);
      const dArea = await FareModel.resolveStopArea(destinationStop);
      const matched = await FareModel.findRouteFare(pickupStop, destinationStop);

      if (matched) {
        return success(res, 'Matched route fare rule found.', {
          matched: true,
          routeFare: matched,
          fare: parseFloat(matched.fare_amount),
          ruleTier: matched.ruleTier || 2,
          ruleType: matched.ruleType,
          description: matched.appliedRuleDescription,
          pickupArea: pArea,
          destinationArea: dArea
        });
      } else {
        return success(res, 'No specific area/override fare found, standard GPS base rate will apply.', {
          matched: false,
          fallback: true,
          pickupArea: pArea,
          destinationArea: dArea
        });
      }
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
