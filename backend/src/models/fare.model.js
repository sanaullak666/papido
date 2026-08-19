const db = require('../config/database');

const FareModel = {
  async getFareConfiguration(vehicleType) {
    return db.queryOne('SELECT * FROM fare_configurations WHERE vehicle_type = ? AND is_active = 1', [vehicleType]);
  },

  async getAllConfigurations() {
    return db.query('SELECT * FROM fare_configurations ORDER BY id ASC');
  },

  async updateConfiguration(vehicleType, {
    baseFare,
    baseDistanceKm,
    perKmFare,
    perMinuteFare,
    minimumFare,
    cancellationFee,
    isActive
  }) {
    await db.query(
      `UPDATE fare_configurations 
       SET base_fare = COALESCE(?, base_fare),
           base_distance_km = COALESCE(?, base_distance_km),
           per_km_fare = COALESCE(?, per_km_fare),
           per_minute_fare = COALESCE(?, per_minute_fare),
           minimum_fare = COALESCE(?, minimum_fare),
           cancellation_fee = COALESCE(?, cancellation_fee),
           is_active = COALESCE(?, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE vehicle_type = ?`,
      [baseFare, baseDistanceKm, perKmFare, perMinuteFare, minimumFare, cancellationFee, isActive, vehicleType]
    );
    return this.getFareConfiguration(vehicleType);
  },

  // ==========================================
  // ROUTE-BASED FARE MANAGEMENT
  // ==========================================

  async getAllRouteFares() {
    return db.query('SELECT * FROM route_fares ORDER BY pickup_stop ASC, destination_stop ASC');
  },

  async findRouteFare(pickupStop, destinationStop) {
    if (!pickupStop || !destinationStop) return null;
    const pTrim = pickupStop.trim().toLowerCase();
    const dTrim = destinationStop.trim().toLowerCase();

    // 1. Direct exact or bidirectional match
    const sql = `
      SELECT * FROM route_fares 
      WHERE (
        (LOWER(TRIM(pickup_stop)) = ? AND LOWER(TRIM(destination_stop)) = ?)
        OR 
        (LOWER(TRIM(pickup_stop)) = ? AND LOWER(TRIM(destination_stop)) = ?)
      )
      AND is_active = 1
      LIMIT 1
    `;
    const exact = await db.queryOne(sql, [pTrim, dTrim, dTrim, pTrim]);
    if (exact) return exact;

    // 2. Normalized & Substring Overlap Matching
    const allRoutes = await db.query('SELECT * FROM route_fares WHERE is_active = 1');
    if (!allRoutes || allRoutes.length === 0) return null;

    const normalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const pNorm = normalize(pickupStop);
    const dNorm = normalize(destinationStop);

    for (const r of allRoutes) {
      const rpNorm = normalize(r.pickup_stop);
      const rdNorm = normalize(r.destination_stop);

      if (!rpNorm || !rdNorm) continue;

      const directMatch = (pNorm.includes(rpNorm) || rpNorm.includes(pNorm)) &&
                          (dNorm.includes(rdNorm) || rdNorm.includes(dNorm));
      const reverseMatch = (pNorm.includes(rdNorm) || rdNorm.includes(pNorm)) &&
                           (dNorm.includes(rpNorm) || rpNorm.includes(dNorm));

      if (directMatch || reverseMatch) {
        return r;
      }
    }

    // 3. Keyword / Synonym Matching (Silver Jubilee, Gate 2, Gate 1, Library, Canteen, etc.)
    const getSynonyms = (str) => {
      const s = (str || '').toLowerCase();
      const tokens = [];
      if (s.includes('silver') || s.includes('jubilee') || s.includes('sjc')) tokens.push('silver_jubilee');
      if (s.includes('gate 2') || s.includes('gate2') || s.includes('ecr')) tokens.push('gate_2');
      if (s.includes('gate 1') || s.includes('gate1') || s.includes('main gate')) tokens.push('gate_1');
      if (s.includes('library')) tokens.push('library');
      if (s.includes('canteen') || s.includes('food court')) tokens.push('canteen');
      if (s.includes('curie') || s.includes('girls hostel')) tokens.push('girls_hostel');
      if (s.includes('physics') || s.includes('science')) tokens.push('science_dept');
      if (s.includes('admin block') || s.includes('exam')) tokens.push('admin_block');
      return tokens;
    };

    const pSyns = getSynonyms(pickupStop);
    const dSyns = getSynonyms(destinationStop);

    if (pSyns.length > 0 && dSyns.length > 0) {
      for (const r of allRoutes) {
        const rpSyns = getSynonyms(r.pickup_stop);
        const rdSyns = getSynonyms(r.destination_stop);

        const directSynMatch = pSyns.some(ps => rpSyns.includes(ps)) && dSyns.some(ds => rdSyns.includes(ds));
        const reverseSynMatch = pSyns.some(ps => rdSyns.includes(ps)) && dSyns.some(ds => rpSyns.includes(ds));

        if (directSynMatch || reverseSynMatch) {
          return r;
        }
      }
    }

    return null;
  },

  async upsertRouteFare({ pickupStop, destinationStop, fareAmount, distanceKm = 1.5, isActive = 1 }) {
    // Check if an existing route between these two stops exists (bidirectional)
    const existing = await this.findRouteFare(pickupStop, destinationStop);
    if (existing && existing.id) {
      await db.query(
        `UPDATE route_fares 
         SET fare_amount = ?, distance_km = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [parseFloat(fareAmount), parseFloat(distanceKm), isActive ? 1 : 0, existing.id]
      );
      return this.findRouteFare(pickupStop, destinationStop);
    }

    try {
      await db.query(
        `INSERT INTO route_fares (pickup_stop, destination_stop, fare_amount, distance_km, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [pickupStop.trim(), destinationStop.trim(), parseFloat(fareAmount), parseFloat(distanceKm), isActive ? 1 : 0]
      );
    } catch (err) {
      await db.query(
        `UPDATE route_fares 
         SET fare_amount = ?, distance_km = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE (LOWER(TRIM(pickup_stop)) = LOWER(TRIM(?)) AND LOWER(TRIM(destination_stop)) = LOWER(TRIM(?)))
            OR (LOWER(TRIM(pickup_stop)) = LOWER(TRIM(?)) AND LOWER(TRIM(destination_stop)) = LOWER(TRIM(?)))`,
        [parseFloat(fareAmount), parseFloat(distanceKm), isActive ? 1 : 0, pickupStop, destinationStop, destinationStop, pickupStop]
      );
    }

    return this.findRouteFare(pickupStop, destinationStop);
  },

  async updateRouteFareById(id, { fareAmount, distanceKm, isActive }) {
    await db.query(
      `UPDATE route_fares 
       SET fare_amount = COALESCE(?, fare_amount),
           distance_km = COALESCE(?, distance_km),
           is_active = COALESCE(?, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [fareAmount !== undefined ? parseFloat(fareAmount) : null, distanceKm !== undefined ? parseFloat(distanceKm) : null, isActive !== undefined ? (isActive ? 1 : 0) : null, id]
    );
    return db.queryOne('SELECT * FROM route_fares WHERE id = ?', [id]);
  },

  async deleteRouteFare(id) {
    return db.query('DELETE FROM route_fares WHERE id = ?', [id]);
  }
};

module.exports = FareModel;
