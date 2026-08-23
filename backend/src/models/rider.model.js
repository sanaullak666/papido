const db = require('../config/database');
const { calculateDistance } = require('../utils/geo');

const RiderModel = {
  async findByUserId(userId) {
    const sql = `
      SELECT rp.*, u.name, u.email, u.phone, u.status as user_status, u.suspension_reason, u.profile_image, COALESCE(rp.is_core_member, u.is_core_member, 0) as is_core_member
      FROM rider_profiles rp
      JOIN users u ON rp.user_id = u.id
      WHERE rp.user_id = ?
    `;
    return db.queryOne(sql, [userId]);
  },

  async findById(profileId) {
    const sql = `
      SELECT rp.*, u.name, u.email, u.phone, u.status as user_status, u.suspension_reason, u.profile_image, COALESCE(rp.is_core_member, u.is_core_member, 0) as is_core_member
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
    collegeIdNumber = null,
    licenseDocUrl = null,
    rcDocUrl = null,
    collegeIdDocUrl = null,
    verificationStatus = 'PENDING',
    isCoreMember = false
  }) {
    const result = await db.query(
      `INSERT INTO rider_profiles 
       (user_id, vehicle_type, vehicle_number, vehicle_model, license_number, license_doc_url, rc_doc_url, college_id_doc_url, verification_status, is_core_member) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, vehicleType, vehicleNumber, vehicleModel, licenseNumber, licenseDocUrl || null, rcDocUrl || null, collegeIdDocUrl || null, verificationStatus, isCoreMember ? 1 : 0]
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
        COALESCE(rp.is_core_member, u.is_core_member, 0) as is_core_member,
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
  },

  async getPeriodicLeaderboard({
    periodType = 'MONTHLY', // 'MONTHLY' | 'YEARLY' | 'ALL_TIME'
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
    search = '',
    filter = 'ALL',
    limit = 100,
    offset = 0
  }) {
    let rideDateClause = '';
    let ratingDateClause = '';
    const rideParams = [];
    const ratingParams = [];

    const numYear = parseInt(year, 10) || new Date().getFullYear();
    const numMonth = parseInt(month, 10) || (new Date().getMonth() + 1);

    if (periodType === 'MONTHLY') {
      rideDateClause = ' AND YEAR(requested_at) = ? AND MONTH(requested_at) = ?';
      rideParams.push(numYear, numMonth);
      ratingDateClause = ' AND YEAR(created_at) = ? AND MONTH(created_at) = ?';
      ratingParams.push(numYear, numMonth);
    } else if (periodType === 'YEARLY') {
      rideDateClause = ' AND YEAR(requested_at) = ?';
      rideParams.push(numYear);
      ratingDateClause = ' AND YEAR(created_at) = ?';
      ratingParams.push(numYear);
    }

    const availableDatesRaw = await db.query(`
      SELECT DISTINCT 
        YEAR(requested_at) as year,
        MONTH(requested_at) as month
      FROM rides
      WHERE requested_at IS NOT NULL
      ORDER BY year DESC, month DESC
    `);

    let sql = `
      SELECT 
        u.id as user_id,
        COALESCE(rp.id, u.id) as profile_id,
        u.name,
        u.email,
        u.phone,
        u.gender,
        u.status as user_status,
        u.suspension_reason,
        u.profile_image,
        u.created_at as joined_at,
        COALESCE(rp.vehicle_type, 'BIKE') as vehicle_type,
        COALESCE(rp.vehicle_number, 'NOT SET') as vehicle_number,
        COALESCE(rp.vehicle_model, 'Standard Bike') as vehicle_model,
        COALESCE(rp.verification_status, 'PENDING') as verification_status,
        COALESCE(rp.is_online, 0) as is_online,
        COALESCE(rp.is_core_member, u.is_core_member, 0) as is_core_member,
        COALESCE(rp.rating, 5.00) as profile_rating,
        COALESCE(rp.total_ratings_count, 0) as profile_ratings_count,
        COALESCE(ride_stats.completed_rides, 0) as completed_rides,
        COALESCE(ride_stats.cancelled_rides, 0) as cancelled_rides,
        COALESCE(ride_stats.total_rides, 0) as total_rides,
        COALESCE(ride_stats.total_earnings, 0) as total_earnings,
        COALESCE(rating_stats.avg_period_rating, rp.rating, 5.00) as avg_rating,
        COALESCE(rating_stats.period_rating_count, 0) as period_ratings_count
      FROM users u
      LEFT JOIN rider_profiles rp ON u.id = rp.user_id
      LEFT JOIN (
        SELECT 
          rider_id,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_rides,
          COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_rides,
          COUNT(id) as total_rides,
          SUM(CASE WHEN status = 'COMPLETED' THEN COALESCE(rider_earning, final_fare, total_fare, 0) ELSE 0 END) as total_earnings
        FROM rides
        WHERE rider_id IS NOT NULL ${rideDateClause}
        GROUP BY rider_id
      ) ride_stats ON u.id = ride_stats.rider_id
      LEFT JOIN (
        SELECT 
          rider_id,
          ROUND(AVG(rating), 2) as avg_period_rating,
          COUNT(id) as period_rating_count
        FROM ratings
        WHERE rider_id IS NOT NULL AND (rated_by_role = 'CUSTOMER' OR rated_by_role IS NULL) ${ratingDateClause}
        GROUP BY rider_id
      ) rating_stats ON u.id = rating_stats.rider_id
      WHERE u.role = 'RIDER'
    `;

    const mainParams = [...rideParams, ...ratingParams];

    if (search) {
      sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR rp.vehicle_number LIKE ?)';
      const term = `%${search}%`;
      mainParams.push(term, term, term, term);
    }

    const rows = await db.query(sql, mainParams);

    const enriched = rows.map(r => {
      const completed = Number(r.completed_rides) || 0;
      const cancelled = Number(r.cancelled_rides) || 0;
      const totalTaken = completed + cancelled;
      const completionRate = totalTaken > 0 ? Number(((completed / totalTaken) * 100).toFixed(1)) : 100.0;
      const cancellationRate = totalTaken > 0 ? Number(((cancelled / totalTaken) * 100).toFixed(1)) : 0.0;
      const avgRating = Number(parseFloat(r.avg_rating || r.profile_rating || 5.0).toFixed(2));
      const ratingCount = Number(r.period_ratings_count || r.profile_ratings_count || 0);

      const flags = [];
      if (avgRating < 3.5 && ratingCount >= 1) {
        flags.push({ type: 'LOW_RATING', label: `Low Rating (${avgRating} / 5.0)`, severity: 'danger' });
      } else if (avgRating < 4.0 && ratingCount >= 2) {
        flags.push({ type: 'BELOW_AVERAGE', label: `Below Average (${avgRating} / 5.0)`, severity: 'warning' });
      }

      if (cancellationRate >= 20.0 && totalTaken >= 3) {
        flags.push({ type: 'HIGH_CANCELLATION', label: `High Cancellations (${cancellationRate}%)`, severity: 'danger' });
      } else if (cancellationRate >= 12.0 && totalTaken >= 4) {
        flags.push({ type: 'MODERATE_CANCELLATION', label: `Noticeable Drops (${cancellationRate}%)`, severity: 'warning' });
      }

      if (r.user_status === 'SUSPENDED') {
        flags.push({ type: 'SUSPENDED', label: 'Account Suspended', severity: 'danger' });
      }

      if (r.verification_status === 'PENDING') {
        flags.push({ type: 'KYC_PENDING', label: 'KYC Verification Pending', severity: 'info' });
      }

      return {
        ...r,
        completed_rides: completed,
        cancelled_rides: cancelled,
        total_taken: totalTaken,
        completion_rate: completionRate,
        cancellation_rate: cancellationRate,
        avg_rating: avgRating,
        rating_count: ratingCount,
        total_earnings: Number(parseFloat(r.total_earnings || 0).toFixed(2)),
        is_flagged: flags.some(f => f.severity === 'danger' || f.severity === 'warning'),
        has_critical_flag: flags.some(f => f.severity === 'danger'),
        flags
      };
    });

    enriched.sort((a, b) => {
      if (b.completed_rides !== a.completed_rides) return b.completed_rides - a.completed_rides;
      if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
      return a.cancellation_rate - b.cancellation_rate;
    });

    const ranked = enriched.map((rider, index) => ({
      ...rider,
      rank: index + 1
    }));

    let filtered = ranked;
    if (filter === 'FLAGGED') {
      filtered = ranked.filter(r => r.is_flagged);
    } else if (filter === 'TOP_PERFORMERS') {
      filtered = ranked.filter(r => r.completed_rides > 0 && r.avg_rating >= 4.5);
    } else if (filter === 'ONLINE') {
      filtered = ranked.filter(r => r.is_online === 1);
    } else if (filter === 'SUSPENDED') {
      filtered = ranked.filter(r => r.user_status === 'SUSPENDED');
    } else if (filter === 'PENDING_KYC') {
      filtered = ranked.filter(r => r.verification_status === 'PENDING');
    }

    const summary = {
      totalRiders: ranked.length,
      topRiders: ranked.slice(0, 3),
      flaggedCount: ranked.filter(r => r.is_flagged).length,
      criticalCount: ranked.filter(r => r.has_critical_flag).length,
      onlineCount: ranked.filter(r => r.is_online === 1).length,
      periodCompletedRides: ranked.reduce((acc, r) => acc + r.completed_rides, 0),
      periodTotalEarnings: ranked.reduce((acc, r) => acc + r.total_earnings, 0),
      fleetAvgRating: ranked.length > 0
        ? Number((ranked.reduce((acc, r) => acc + r.avg_rating, 0) / ranked.length).toFixed(2))
        : 5.0,
      selectedPeriod: {
        periodType,
        year: numYear,
        month: numMonth
      },
      availableDates: availableDatesRaw.map(d => ({
        year: d.year,
        month: d.month,
        label: new Date(d.year, d.month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
      }))
    };

    return {
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
      summary
    };
  }
};

module.exports = RiderModel;
