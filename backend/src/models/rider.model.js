const db = require('../config/database');
const { calculateDistance } = require('../utils/geo');

const RiderModel = {
  async findByUserId(userId) {
    const sql = `
      SELECT rp.*, u.name, u.email, u.phone, u.status as user_status, u.suspension_reason, u.profile_image
      FROM rider_profiles rp
      JOIN users u ON rp.user_id = u.id
      WHERE rp.user_id = ?
    `;
    return db.queryOne(sql, [userId]);
  },

  async findById(profileId) {
    const sql = `
      SELECT rp.*, u.name, u.email, u.phone, u.status as user_status, u.suspension_reason, u.profile_image
      FROM rider_profiles rp
      JOIN users u ON rp.user_id = u.id
      WHERE rp.id = ?
    `;
    return db.queryOne(sql, [profileId]);
  },

  async createProfile({
    userId,
    vehicleType = 'BIKE',
    vehicleNumber,
    vehicleModel,
    licenseNumber,
    licenseDocUrl = null,
    rcDocUrl = null,
    collegeIdDocUrl = null,
    verificationStatus = 'PENDING'
  }) {
    const result = await db.query(
      `INSERT INTO rider_profiles 
       (user_id, vehicle_type, vehicle_number, vehicle_model, license_number, license_doc_url, rc_doc_url, college_id_doc_url, verification_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, vehicleType, vehicleNumber, vehicleModel, licenseNumber, licenseDocUrl || null, rcDocUrl || null, collegeIdDocUrl || null, verificationStatus]
    );
    return this.findById(result.insertId);
  },

  async updateOnlineStatus(userId, isOnline) {
    await db.query(
      'UPDATE rider_profiles SET is_online = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [isOnline ? 1 : 0, userId]
    );
    return this.findByUserId(userId);
  },

  async updateLocation(userId, latitude, longitude) {
    await db.query(
      `UPDATE rider_profiles 
       SET current_latitude = ?, current_longitude = ?, last_location_update = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`,
      [latitude, longitude, userId]
    );
    return this.findByUserId(userId);
  },

  async updateVerificationStatus(userId, status) {
    await db.query(
      'UPDATE rider_profiles SET verification_status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [status, userId]
    );
    return this.findByUserId(userId);
  },

  async updateDocuments(userId, { licenseDocUrl, rcDocUrl, collegeIdDocUrl }) {
    await db.query(
      `UPDATE rider_profiles 
       SET license_doc_url = COALESCE(?, license_doc_url),
           rc_doc_url = COALESCE(?, rc_doc_url),
           college_id_doc_url = COALESCE(?, college_id_doc_url),
           verification_status = 'PENDING',
           updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`,
      [licenseDocUrl || null, rcDocUrl || null, collegeIdDocUrl || null, userId]
    );
    return this.findByUserId(userId);
  },

  async updateVehicleDetails(userId, { vehicleModel, vehicleNumber, licenseNumber }) {
    await db.query(
      `UPDATE rider_profiles 
       SET vehicle_model = COALESCE(?, vehicle_model),
           vehicle_number = COALESCE(?, vehicle_number),
           license_number = COALESCE(?, license_number),
           updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`,
      [vehicleModel || null, vehicleNumber || null, licenseNumber || null, userId]
    );
    return this.findByUserId(userId);
  },

  async updateRating(userId, newRating) {
    const profile = await this.findByUserId(userId);
    if (!profile) return null;

    const currentCount = profile.total_ratings_count || 0;
    const currentRating = parseFloat(profile.rating) || 5.0;
    const updatedCount = currentCount + 1;
    const updatedRating = Number(((currentRating * currentCount + newRating) / updatedCount).toFixed(2));

    await db.query(
      'UPDATE rider_profiles SET rating = ?, total_ratings_count = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [updatedRating, updatedCount, userId]
    );
    return this.findByUserId(userId);
  },

  async incrementRideCount(userId) {
    await db.query(
      'UPDATE rider_profiles SET total_rides = total_rides + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [userId]
    );
  },

  async findNearbyOnlineRiders(pickupLat, pickupLng, vehicleType = null, maxRadiusKm = 10.0) {
    let sql = `
      SELECT rp.*, u.name, u.phone, u.gender, u.profile_image
      FROM rider_profiles rp
      JOIN users u ON rp.user_id = u.id
      WHERE rp.is_online = 1 
        AND rp.verification_status = 'APPROVED'
        AND u.status = 'ACTIVE'
        AND rp.current_latitude IS NOT NULL 
        AND rp.current_longitude IS NOT NULL
    `;
    const params = [];

    if (vehicleType) {
      sql += ' AND rp.vehicle_type = ?';
      params.push(vehicleType);
    }

    const riders = await db.query(sql, params);

    // Compute actual distance using Haversine formula and filter by max radius
    const ridersWithDistance = riders
      .map(rider => {
        const distance = calculateDistance(
          pickupLat,
          pickupLng,
          parseFloat(rider.current_latitude),
          parseFloat(rider.current_longitude)
        );
        return {
          ...rider,
          distance_to_pickup: distance
        };
      })
      .filter(rider => rider.distance_to_pickup <= maxRadiusKm)
      .sort((a, b) => a.distance_to_pickup - b.distance_to_pickup);

    return ridersWithDistance;
  },

  async listAll({ verificationStatus, vehicleType, isOnline, search, limit = 20, offset = 0 }) {
    let sql = `
      SELECT 
        COALESCE(rp.id, u.id) as id,
        u.id as user_id,
        COALESCE(rp.vehicle_type, 'BIKE') as vehicle_type,
        COALESCE(rp.vehicle_number, 'NOT SET') as vehicle_number,
        COALESCE(rp.vehicle_model, 'Standard Bike') as vehicle_model,
        COALESCE(rp.license_number, 'NOT SET') as license_number,
        rp.license_doc_url,
        rp.rc_doc_url,
        rp.college_id_doc_url,
        rp.rejection_reason,
        COALESCE(rp.verification_status, 'PENDING') as verification_status,
        COALESCE(rp.rating, 5.00) as rating,
        COALESCE(rp.total_ratings_count, 0) as total_ratings_count,
        COALESCE(rp.total_rides, 0) as total_rides,
        COALESCE(rp.is_online, 0) as is_online,
        rp.current_latitude,
        rp.current_longitude,
        rp.last_location_update,
        COALESCE(rp.created_at, u.created_at) as created_at,
        COALESCE(rp.updated_at, u.updated_at) as updated_at,
        u.name,
        u.email,
        u.phone,
        u.gender,
        u.status as user_status,
        u.suspension_reason,
        u.profile_image,
        u.created_at as joined_at
      FROM users u
      LEFT JOIN rider_profiles rp ON u.id = rp.user_id
      WHERE u.role = 'RIDER'
    `;
    const params = [];

    if (verificationStatus) {
      sql += " AND COALESCE(rp.verification_status, 'PENDING') = ?";
      params.push(verificationStatus);
    }
    if (vehicleType) {
      sql += ' AND rp.vehicle_type = ?';
      params.push(vehicleType);
    }
    if (typeof isOnline === 'boolean' || isOnline !== undefined) {
      sql += ' AND COALESCE(rp.is_online, 0) = ?';
      params.push(isOnline ? 1 : 0);
    }
    if (search) {
      sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR rp.vehicle_number LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY u.id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    return db.query(sql, params);
  },

  async countAll({ verificationStatus, vehicleType, isOnline, search }) {
    let sql = `
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN rider_profiles rp ON u.id = rp.user_id
      WHERE u.role = 'RIDER'
    `;
    const params = [];

    if (verificationStatus) {
      sql += " AND COALESCE(rp.verification_status, 'PENDING') = ?";
      params.push(verificationStatus);
    }
    if (vehicleType) {
      sql += ' AND rp.vehicle_type = ?';
      params.push(vehicleType);
    }
    if (typeof isOnline === 'boolean' || isOnline !== undefined) {
      sql += ' AND COALESCE(rp.is_online, 0) = ?';
      params.push(isOnline ? 1 : 0);
    }
    if (search) {
      sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR rp.vehicle_number LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const row = await db.queryOne(sql, params);
    return row ? row.total : 0;
  }
};

module.exports = RiderModel;
