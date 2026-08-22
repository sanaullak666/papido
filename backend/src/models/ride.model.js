const db = require('../config/database');

const RideModel = {
  async findById(id) {
    const sql = `
      SELECT r.*, 
             COALESCE(r.final_fare, r.estimated_fare) as total_fare,
             c.name as customer_name, c.gender as customer_gender, c.phone as customer_phone, c.profile_image as customer_avatar,
             rd.name as rider_name, rd.gender as rider_gender, rd.phone as rider_phone, rd.profile_image as rider_avatar,
             COALESCE(rp.is_core_member, rd.is_core_member, 0) as rider_is_core,
             rp.vehicle_type as rider_vehicle_type, rp.vehicle_number, rp.vehicle_number as rider_vehicle_number,
             rp.vehicle_model, rp.vehicle_model as rider_vehicle_model, rp.rating as rider_rating,
             rp.current_latitude as rider_current_lat, rp.current_longitude as rider_current_lng,
             rt.rating as user_rating, rt.review as user_review
      FROM rides r
      JOIN users c ON r.customer_id = c.id
      LEFT JOIN users rd ON r.rider_id = rd.id
      LEFT JOIN rider_profiles rp ON rd.id = rp.user_id
      LEFT JOIN ratings rt ON r.id = rt.ride_id
      WHERE r.id = ?
    `;
    return db.queryOne(sql, [id]);
  },

  async findByCode(rideCode) {
    const sql = `
      SELECT r.*, 
             c.name as customer_name, c.gender as customer_gender, c.phone as customer_phone,
             rd.name as rider_name, rd.gender as rider_gender, rd.phone as rider_phone
      FROM rides r
      JOIN users c ON r.customer_id = c.id
      LEFT JOIN users rd ON r.rider_id = rd.id
      WHERE r.ride_code = ?
    `;
    return db.queryOne(sql, [rideCode]);
  },

  async create({
    rideCode,
    customerId,
    vehicleType,
    pickupAddress,
    pickupLatitude,
    pickupLongitude,
    destinationAddress,
    destinationLatitude,
    destinationLongitude,
    estimatedDistance,
    estimatedDuration,
    estimatedFare,
    otp,
    status = 'REQUESTED',
    paymentMethod = 'CASH',
    femaleRiderOnly = false,
    isDoubleRide = false,
    isOutside = false
  }) {
    const result = await db.query(
      `INSERT INTO rides (
        ride_code, customer_id, vehicle_type,
        pickup_address, pickup_latitude, pickup_longitude,
        destination_address, destination_latitude, destination_longitude,
        estimated_distance, estimated_duration, estimated_fare,
        otp, status, payment_method, female_rider_only, is_double_ride, is_outside, payment_status, requested_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP)`,
      [
        rideCode, customerId, vehicleType,
        pickupAddress, pickupLatitude, pickupLongitude,
        destinationAddress, destinationLatitude, destinationLongitude,
        estimatedDistance, estimatedDuration, estimatedFare,
        otp, status, paymentMethod, femaleRiderOnly ? 1 : 0, isDoubleRide ? 1 : 0, isOutside ? 1 : 0
      ]
    );
    return this.findById(result.insertId);
  },

  async assignRider(rideId, riderId) {
    await db.query(
      `UPDATE rides 
       SET rider_id = ?, status = 'ACCEPTED', accepted_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND status = 'REQUESTED'`,
      [riderId, rideId]
    );
    return this.findById(rideId);
  },

  async updateStatus(rideId, status, extraFields = {}) {
    let sql = 'UPDATE rides SET status = ?';
    const params = [status];

    if (status === 'RIDER_ARRIVING') {
      // Arriving state
    } else if (status === 'RIDER_REACHED') {
      sql += ', arrived_at = CURRENT_TIMESTAMP';
    } else if (status === 'STARTED') {
      sql += ', started_at = CURRENT_TIMESTAMP';
    } else if (status === 'COMPLETED') {
      sql += ', completed_at = CURRENT_TIMESTAMP, final_fare = COALESCE(?, estimated_fare), payment_status = ?';
      params.push(extraFields.finalFare || null, extraFields.paymentStatus || 'COMPLETED');
    } else if (status === 'CANCELLED') {
      sql += ', cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = ?, cancelled_by_role = ?';
      params.push(extraFields.cancellationReason || null, extraFields.cancelledByRole || null);
    }

    sql += ' WHERE id = ?';
    params.push(rideId);

    await db.query(sql, params);
    return this.findById(rideId);
  },

  async getActiveRideForCustomer(customerId) {
    const sql = `
      SELECT r.*, 
             COALESCE(r.final_fare, r.estimated_fare) as total_fare,
             c.name as customer_name, c.gender as customer_gender,
             rd.name as rider_name, rd.gender as rider_gender, rd.phone as rider_phone, rd.profile_image as rider_avatar,
             COALESCE(rp.is_core_member, rd.is_core_member, 0) as rider_is_core,
             rp.vehicle_type as rider_vehicle_type, rp.vehicle_number, rp.vehicle_number as rider_vehicle_number,
             rp.vehicle_model, rp.vehicle_model as rider_vehicle_model, rp.rating as rider_rating,
             rp.current_latitude as rider_current_lat, rp.current_longitude as rider_current_lng
      FROM rides r
      JOIN users c ON r.customer_id = c.id
      LEFT JOIN users rd ON r.rider_id = rd.id
      LEFT JOIN rider_profiles rp ON rd.id = rp.user_id
      WHERE r.customer_id = ? 
        AND r.status IN ('PENDING_ADMIN_QUOTE', 'REQUESTED', 'ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED', 'STARTED')
      ORDER BY r.id DESC LIMIT 1
    `;
    return db.queryOne(sql, [customerId]);
  },

  async getActiveRideForRider(riderId) {
    const sql = `
      SELECT r.*, 
             COALESCE(r.final_fare, r.estimated_fare) as total_fare,
             c.name as customer_name, c.gender as customer_gender, c.phone as customer_phone, c.profile_image as customer_avatar
      FROM rides r
      JOIN users c ON r.customer_id = c.id
      WHERE r.rider_id = ? 
        AND r.status IN ('ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED', 'STARTED')
      ORDER BY r.id DESC LIMIT 1
    `;
    return db.queryOne(sql, [riderId]);
  },

  async recordDecline(rideId, riderId) {
    try {
      return await db.query(
        `INSERT INTO ride_declines (ride_id, rider_id) VALUES (?, ?)`,
        [rideId, riderId]
      );
    } catch (err) {
      // Ignore duplicate entry error if already declined
      if (err.message && (err.message.includes('UNIQUE') || err.message.includes('Duplicate entry'))) {
        return { message: 'Already declined' };
      }
      throw err;
    }
  },

  async reopenForSearch(rideId) {
    const sql = `
      UPDATE rides 
      SET status = 'REQUESTED', 
          rider_id = NULL, 
          accepted_at = NULL, 
          arrived_at = NULL, 
          started_at = NULL
      WHERE id = ?
    `;
    await db.query(sql, [rideId]);
    return this.findById(rideId);
  },

  async getAvailableRequestsForRider(riderId, riderGender = 'OTHER', riderVehicleType = 'BIKE') {
    let sql = `
      SELECT r.*, 
             COALESCE(r.final_fare, r.estimated_fare) as total_fare,
             c.name as customer_name, c.gender as customer_gender, c.phone as customer_phone, c.profile_image as customer_avatar
      FROM rides r
      JOIN users c ON r.customer_id = c.id
      WHERE r.status = 'REQUESTED'
        AND r.rider_id IS NULL
        AND (r.assigned_rider_id IS NULL OR r.assigned_rider_id = ?)
        AND r.id NOT IN (SELECT ride_id FROM ride_declines WHERE rider_id = ?)
    `;
    const params = [riderId, riderId];

    if (riderGender !== 'FEMALE') {
      sql += ' AND (r.female_rider_only = 0 OR r.female_rider_only IS NULL)';
    }

    if (riderVehicleType && riderVehicleType !== 'ANY') {
      sql += " AND (r.vehicle_type IS NULL OR r.vehicle_type = 'ANY' OR UPPER(r.vehicle_type) = ?)";
      params.push(riderVehicleType.toUpperCase());
    }

    sql += ' ORDER BY r.id DESC LIMIT 10';
    return db.query(sql, params);
  },

  async listPendingOutsideRides() {
    const sql = `
      SELECT r.*, 
             c.name as customer_name, c.gender as customer_gender, c.phone as customer_phone, c.profile_image as customer_avatar
      FROM rides r
      JOIN users c ON r.customer_id = c.id
      WHERE r.status = 'PENDING_ADMIN_QUOTE'
      ORDER BY r.id DESC
    `;
    return db.query(sql);
  },

  async listAllOutsideRides({ limit = 50, offset = 0 } = {}) {
    const sql = `
      SELECT r.*, 
             c.name as customer_name, c.gender as customer_gender, c.phone as customer_phone, c.profile_image as customer_avatar,
             rd.name as rider_name, rd.phone as rider_phone,
             rp.vehicle_number, rp.vehicle_model
      FROM rides r
      JOIN users c ON r.customer_id = c.id
      LEFT JOIN users rd ON r.rider_id = rd.id OR r.assigned_rider_id = rd.id
      LEFT JOIN rider_profiles rp ON rd.id = rp.user_id
      WHERE r.is_outside = 1 OR r.status = 'PENDING_ADMIN_QUOTE'
      ORDER BY r.id DESC
      LIMIT ? OFFSET ?
    `;
    return db.query(sql, [Number(limit), Number(offset)]);
  },

  async adminQuoteAndDispatch(rideId, fareAmount, assignedRiderId = null) {
    await db.query(
      `UPDATE rides 
       SET estimated_fare = ?, final_fare = ?, assigned_rider_id = ?, status = 'REQUESTED'
       WHERE id = ? AND status = 'PENDING_ADMIN_QUOTE'`,
      [fareAmount, fareAmount, assignedRiderId || null, rideId]
    );
    return this.findById(rideId);
  },

  async listRides({
    customerId,
    riderId,
    status,
    vehicleType,
    search,
    limit = 20,
    offset = 0
  }) {
    let sql = `
      SELECT r.*, 
             c.name as customer_name, c.phone as customer_phone,
             rd.name as rider_name, rd.phone as rider_phone,
             rp.vehicle_number, rp.vehicle_model,
             rt.rating as rating, rt.review as review
      FROM rides r
      JOIN users c ON r.customer_id = c.id
      LEFT JOIN users rd ON r.rider_id = rd.id
      LEFT JOIN rider_profiles rp ON rd.id = rp.user_id
      LEFT JOIN ratings rt ON r.id = rt.ride_id
      WHERE 1=1
    `;
    const params = [];

    if (customerId) {
      sql += ' AND r.customer_id = ?';
      params.push(customerId);
    }
    if (riderId) {
      sql += ' AND r.rider_id = ?';
      params.push(riderId);
    }
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (vehicleType) {
      sql += ' AND r.vehicle_type = ?';
      params.push(vehicleType);
    }
    if (search) {
      sql += ' AND (r.ride_code LIKE ? OR c.name LIKE ? OR rd.name LIKE ? OR r.pickup_address LIKE ? OR r.destination_address LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY r.id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    return db.query(sql, params);
  },

  async countRides({ customerId, riderId, status, vehicleType, search }) {
    let sql = `
      SELECT COUNT(*) as total
      FROM rides r
      JOIN users c ON r.customer_id = c.id
      LEFT JOIN users rd ON r.rider_id = rd.id
      WHERE 1=1
    `;
    const params = [];

    if (customerId) {
      sql += ' AND r.customer_id = ?';
      params.push(customerId);
    }
    if (riderId) {
      sql += ' AND r.rider_id = ?';
      params.push(riderId);
    }
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (vehicleType) {
      sql += ' AND r.vehicle_type = ?';
      params.push(vehicleType);
    }
    if (search) {
      sql += ' AND (r.ride_code LIKE ? OR c.name LIKE ? OR rd.name LIKE ? OR r.pickup_address LIKE ? OR r.destination_address LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    const row = await db.queryOne(sql, params);
    return row ? row.total : 0;
  }
};

module.exports = RideModel;
