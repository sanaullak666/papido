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

    // 1. Direct exact match in database
    const sql = `
      SELECT * FROM route_fares 
      WHERE (
        (LOWER(TRIM(pickup_stop)) = ? AND LOWER(TRIM(destination_stop)) = ?)
        OR 
        (LOWER(TRIM(pickup_stop)) = ? AND LOWER(TRIM(destination_stop)) = ?)
      )
      AND is_active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    const exact = await db.queryOne(sql, [pTrim, dTrim, dTrim, pTrim]);
    if (exact) return exact;

    const allRoutes = await db.query('SELECT * FROM route_fares WHERE is_active = 1 ORDER BY updated_at DESC');
    if (!allRoutes || allRoutes.length === 0) return null;

    const normalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const pNorm = normalize(pickupStop);
    const dNorm = normalize(destinationStop);

    // 2. Normalized exact string match
    for (const r of allRoutes) {
      const rpNorm = normalize(r.pickup_stop);
      const rdNorm = normalize(r.destination_stop);
      if ((pNorm === rpNorm && dNorm === rdNorm) || (pNorm === rdNorm && dNorm === rpNorm)) {
        return r;
      }
    }

    // 3. Substring inclusion match (e.g. 'Main Gate' inside 'PU Main Gate (Gate 1)')
    for (const r of allRoutes) {
      const rpNorm = normalize(r.pickup_stop);
      const rdNorm = normalize(r.destination_stop);
      if (!rpNorm || !rdNorm) continue;
      const directSub = (pNorm.includes(rpNorm) || rpNorm.includes(pNorm)) &&
                        (dNorm.includes(rdNorm) || rdNorm.includes(dNorm));
      const reverseSub = (pNorm.includes(rdNorm) || rdNorm.includes(pNorm)) &&
                         (dNorm.includes(rpNorm) || rpNorm.includes(dNorm));
      if (directSub || reverseSub) {
        return r;
      }
    }

    // 4. Multi-tier Campus Category & Synonym Matcher
    const getCampusTags = (str) => {
      if (!str) return [];
      const s = (str || '').toLowerCase();
      const tags = [];
      if (s.includes('gate 1') || s.includes('gate1') || s.includes('main gate')) tags.push('GATE_1');
      if (s.includes('gate 2') || s.includes('gate2') || s.includes('ecr')) tags.push('GATE_2');
      if (s.includes('gate') || s.includes('ecr') || s.includes('entrance')) tags.push('GATES');
      if (s.includes('girl') || s.includes('curie') || s.includes('teresa') || s.includes('ganga') || s.includes('yamuna') || s.includes('sarojini') || s.includes('cauvery') || s.includes('saraswathi')) tags.push('GIRLS_HOSTEL');
      if (s.includes('boy') || s.includes('bharathidasan') || s.includes('kabilar') || s.includes('subramania') || s.includes('kalidas') || s.includes('valmiki') || s.includes('foreign') || s.includes('birsa') || s.includes('munda')) tags.push('BOYS_HOSTEL');
      if (s.includes('silver') || s.includes('jubilee') || s.includes('sjc') || s.includes('school of management') || s.includes('som')) tags.push('SILVER_JUBILEE');
      if (s.includes('science') || s.includes('physics') || s.includes('math') || s.includes('ramanujan') || s.includes('biotech') || s.includes('chemistry') || s.includes('life science')) tags.push('SCIENCE_BLOCK');
      if (s.includes('library') || s.includes('reading')) tags.push('LIBRARY');
      if (s.includes('canteen') || s.includes('food') || s.includes('mess') || s.includes('shopping') || s.includes('store') || s.includes('co-op')) tags.push('CANTEEN');
      if (s.includes('admin') || s.includes('exam') || s.includes('vc') || s.includes('registrar') || s.includes('auditorium')) tags.push('ADMIN_BLOCK');
      if (s.includes('dept') || s.includes('department') || s.includes('humanities') || s.includes('social science') || s.includes('media') || s.includes('communication') || s.includes('engineering') || s.includes('technology') || s.includes('sociology')) tags.push('DEPARTMENTS');
      return tags;
    };

    const pTags = getCampusTags(pickupStop);
    const dTags = getCampusTags(destinationStop);

    let bestRoute = null;
    let highestScore = 0;

    for (const r of allRoutes) {
      const rpTags = getCampusTags(r.pickup_stop);
      const rdTags = getCampusTags(r.destination_stop);

      let score = 0;

      // Specific gate bonus
      if ((pTags.includes('GATE_1') && rpTags.includes('GATE_1')) || (dTags.includes('GATE_1') && rdTags.includes('GATE_1'))) score += 30;
      if ((pTags.includes('GATE_2') && rpTags.includes('GATE_2')) || (dTags.includes('GATE_2') && rdTags.includes('GATE_2'))) score += 30;

      const directMatches = pTags.filter(t => rpTags.includes(t)).length + dTags.filter(t => rdTags.includes(t)).length;
      const reverseMatches = pTags.filter(t => rdTags.includes(t)).length + dTags.filter(t => rpTags.includes(t)).length;
      const matchCount = Math.max(directMatches, reverseMatches);

      if (matchCount >= 2) {
        score += matchCount * 10;
        if (score > highestScore) {
          highestScore = score;
          bestRoute = r;
        }
      }
    }

    return bestRoute;
  },

  async upsertRouteFare({ pickupStop, destinationStop, fareAmount, distanceKm = 1.5, isActive = 1, isBidirectional = true }) {
    const p = (pickupStop || '').trim();
    const d = (destinationStop || '').trim();
    if (!p || !d) return null;

    const fare = parseFloat(fareAmount);
    const dist = parseFloat(distanceKm);
    const act = isActive ? 1 : 0;

    const upsertSingle = async (from, to) => {
      const existing = await db.queryOne(
        `SELECT id FROM route_fares WHERE LOWER(TRIM(pickup_stop)) = LOWER(TRIM(?)) AND LOWER(TRIM(destination_stop)) = LOWER(TRIM(?)) LIMIT 1`,
        [from, to]
      );
      if (existing && existing.id) {
        await db.query(
          `UPDATE route_fares SET fare_amount = ?, distance_km = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [fare, dist, act, existing.id]
        );
      } else {
        await db.query(
          `INSERT INTO route_fares (pickup_stop, destination_stop, fare_amount, distance_km, is_active) VALUES (?, ?, ?, ?, ?)`,
          [from, to, fare, dist, act]
        );
      }
    };

    await upsertSingle(p, d);
    if (isBidirectional) {
      await upsertSingle(d, p);
    }

    return this.findRouteFare(p, d);
  },

  async updateRouteFareById(id, { fareAmount, distanceKm, isActive }) {
    const target = await db.queryOne('SELECT * FROM route_fares WHERE id = ?', [id]);
    if (!target) return null;

    const fare = fareAmount !== undefined ? parseFloat(fareAmount) : parseFloat(target.fare_amount);
    const dist = distanceKm !== undefined ? parseFloat(distanceKm) : parseFloat(target.distance_km);
    const act = isActive !== undefined ? (isActive ? 1 : 0) : target.is_active;

    await db.query(
      `UPDATE route_fares 
       SET fare_amount = ?, distance_km = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [fare, dist, act, id]
    );

    // Also update reverse direction if exists
    if (target.pickup_stop && target.destination_stop) {
      await db.query(
        `UPDATE route_fares 
         SET fare_amount = ?, distance_km = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE LOWER(TRIM(pickup_stop)) = LOWER(TRIM(?)) AND LOWER(TRIM(destination_stop)) = LOWER(TRIM(?))`,
        [fare, dist, act, target.destination_stop, target.pickup_stop]
      );
    }

    return db.queryOne('SELECT * FROM route_fares WHERE id = ?', [id]);
  },

  async deleteRouteFare(id) {
    const target = await db.queryOne('SELECT * FROM route_fares WHERE id = ?', [id]);
    if (target && target.pickup_stop && target.destination_stop) {
      await db.query(
        `DELETE FROM route_fares 
         WHERE (LOWER(TRIM(pickup_stop)) = LOWER(TRIM(?)) AND LOWER(TRIM(destination_stop)) = LOWER(TRIM(?)))
            OR (LOWER(TRIM(pickup_stop)) = LOWER(TRIM(?)) AND LOWER(TRIM(destination_stop)) = LOWER(TRIM(?)))`,
        [target.pickup_stop, target.destination_stop, target.destination_stop, target.pickup_stop]
      );
    } else {
      await db.query('DELETE FROM route_fares WHERE id = ?', [id]);
    }
    return true;
  }
};

module.exports = FareModel;
