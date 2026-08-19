const db = require('../config/database');
const { CAMPUS_CATEGORIES } = require('../config/constants');

const CATEGORY_MAP = {
  GIRLS_HOSTEL: { label: 'Girls Hostels', token: '[Girls Hostels]', icon: '👧' },
  BOYS_HOSTEL: { label: 'Boys Hostels', token: '[Boys Hostels]', icon: '👦' },
  DEPARTMENT: { label: 'Departments & Schools', token: '[Departments & Schools]', icon: '🏛️' },
  GATE_HUB: { label: 'Gates & Hubs', token: '[Gates & Hubs]', icon: '🚪' }
};

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
  // CAMPUS STOPS & CATEGORY MANAGEMENT
  // ==========================================

  async getAllCampusStops() {
    return db.query('SELECT * FROM campus_stops WHERE is_active = 1 ORDER BY display_order ASC, name ASC');
  },

  async getAllAdminCampusStops() {
    return db.query('SELECT * FROM campus_stops ORDER BY display_order ASC, name ASC');
  },

  async getGroupedCampusStops() {
    const stops = await this.getAllCampusStops();
    const grouped = {
      GIRLS_HOSTEL: { key: 'GIRLS_HOSTEL', label: 'Girls Hostels', token: '[Girls Hostels]', icon: '👧', stops: [] },
      BOYS_HOSTEL: { key: 'BOYS_HOSTEL', label: 'Boys Hostels', token: '[Boys Hostels]', icon: '👦', stops: [] },
      DEPARTMENT: { key: 'DEPARTMENT', label: 'Departments & School Blocks', token: '[Departments & Schools]', icon: '🏛️', stops: [] },
      GATE_HUB: { key: 'GATE_HUB', label: 'Gates & Campus Hubs', token: '[Gates & Hubs]', icon: '🚪', stops: [] }
    };

    (stops || []).forEach(s => {
      const cat = s.category || 'GATE_HUB';
      if (!grouped[cat]) {
        grouped[cat] = { key: cat, label: s.category_label || cat, token: `[${s.category_label || cat}]`, icon: '📍', stops: [] };
      }
      grouped[cat].stops.push(s);
    });

    return Object.values(grouped);
  },

  async createCampusStop({ name, category, category_label, latitude, longitude, display_order = 0 }) {
    const label = category_label || CATEGORY_MAP[category]?.label || 'Campus Location';
    await db.query(
      `INSERT INTO campus_stops (name, category, category_label, latitude, longitude, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [name.trim(), category, label, latitude ? parseFloat(latitude) : null, longitude ? parseFloat(longitude) : null, parseInt(display_order) || 0]
    );
    return db.queryOne('SELECT * FROM campus_stops WHERE name = ?', [name.trim()]);
  },

  async updateCampusStop(id, { name, category, category_label, latitude, longitude, display_order, is_active }) {
    const label = category_label || (category ? CATEGORY_MAP[category]?.label : null);
    await db.query(
      `UPDATE campus_stops
       SET name = COALESCE(?, name),
           category = COALESCE(?, category),
           category_label = COALESCE(?, category_label),
           latitude = COALESCE(?, latitude),
           longitude = COALESCE(?, longitude),
           display_order = COALESCE(?, display_order),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        category || null,
        label || null,
        latitude !== undefined ? parseFloat(latitude) : null,
        longitude !== undefined ? parseFloat(longitude) : null,
        display_order !== undefined ? parseInt(display_order) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id
      ]
    );
    return db.queryOne('SELECT * FROM campus_stops WHERE id = ?', [id]);
  },

  async deleteCampusStop(id) {
    return db.query('DELETE FROM campus_stops WHERE id = ?', [id]);
  },

  // Helper to detect or lookup category for any stop string
  async resolveStopCategory(stopName) {
    if (!stopName) return null;
    const clean = stopName.trim().toLowerCase();

    // 1. Direct DB lookup
    const stopRow = await db.queryOne('SELECT * FROM campus_stops WHERE LOWER(TRIM(name)) = ?', [clean]);
    if (stopRow) {
      return {
        category: stopRow.category,
        categoryLabel: stopRow.category_label,
        token: CATEGORY_MAP[stopRow.category]?.token || `[${stopRow.category_label}]`
      };
    }

    // 2. Check if string is already a group token
    if (clean.includes('girls') && (clean.includes('hostel') || clean.includes('['))) {
      return { category: 'GIRLS_HOSTEL', categoryLabel: 'Girls Hostels', token: '[Girls Hostels]' };
    }
    if (clean.includes('boys') && (clean.includes('hostel') || clean.includes('['))) {
      return { category: 'BOYS_HOSTEL', categoryLabel: 'Boys Hostels', token: '[Boys Hostels]' };
    }
    if (clean.includes('department') || clean.includes('school') || clean.includes('science') || clean.includes('math')) {
      return { category: 'DEPARTMENT', categoryLabel: 'Departments & Schools', token: '[Departments & Schools]' };
    }
    if (clean.includes('gate') || clean.includes('library') || clean.includes('canteen') || clean.includes('admin')) {
      return { category: 'GATE_HUB', categoryLabel: 'Gates & Hubs', token: '[Gates & Hubs]' };
    }

    // 3. Keyword matching for hostels / buildings
    if (/curie|teresa|ganga|yamuna|sarojini|cauvery|saraswathi/i.test(clean)) {
      return { category: 'GIRLS_HOSTEL', categoryLabel: 'Girls Hostels', token: '[Girls Hostels]' };
    }
    if (/silver|jubilee|sjc|bharathidasan|kabilar|subramania|kalidas|valmiki/i.test(clean)) {
      return { category: 'BOYS_HOSTEL', categoryLabel: 'Boys Hostels', token: '[Boys Hostels]' };
    }
    if (/physics|management|som|humanities|biotech|engineering|media/i.test(clean)) {
      return { category: 'DEPARTMENT', categoryLabel: 'Departments & Schools', token: '[Departments & Schools]' };
    }

    return null;
  },

  // ==========================================
  // ROUTE-BASED & GROUP-BASED FARE MANAGEMENT
  // ==========================================

  async getAllRouteFares() {
    return db.query('SELECT * FROM route_fares ORDER BY pickup_stop ASC, destination_stop ASC');
  },

  /**
   * Multi-tier resolution:
   * 1. Exact Stop-to-Stop Match
   * 2. Stop-to-Group Match (e.g. SJC -> [Girls Hostels])
   * 3. Group-to-Group Match (e.g. [Boys Hostels] -> [Departments & Schools])
   * 4. Substring / Synonym Match
   */
  async findRouteFare(pickupStop, destinationStop) {
    if (!pickupStop || !destinationStop) return null;
    const pTrim = pickupStop.trim();
    const dTrim = destinationStop.trim();
    const pLower = pTrim.toLowerCase();
    const dLower = dTrim.toLowerCase();

    // 1. Tier 1: Direct exact stop-to-stop (bidirectional)
    const exactSql = `
      SELECT * FROM route_fares 
      WHERE (
        (LOWER(TRIM(pickup_stop)) = ? AND LOWER(TRIM(destination_stop)) = ?)
        OR 
        (LOWER(TRIM(pickup_stop)) = ? AND LOWER(TRIM(destination_stop)) = ?)
      )
      AND is_active = 1
      LIMIT 1
    `;
    const exact = await db.queryOne(exactSql, [pLower, dLower, dLower, pLower]);
    if (exact) {
      return {
        ...exact,
        ruleType: 'EXACT',
        appliedRuleDescription: `Direct Route: ${exact.pickup_stop} ➔ ${exact.destination_stop}`
      };
    }

    // Resolve categories and group tokens for both stops
    const pCat = await this.resolveStopCategory(pickupStop);
    const dCat = await this.resolveStopCategory(destinationStop);

    const allRoutes = await db.query('SELECT * FROM route_fares WHERE is_active = 1');
    if (!allRoutes || allRoutes.length === 0) return null;

    // 2. Tier 2: Specific Stop ➔ Target Group List (e.g. SJC -> [Girls Hostels])
    if (dCat && dCat.token) {
      const targetTokenLower = dCat.token.toLowerCase();
      const codeTokenLower = `[${dCat.category.toLowerCase()}]`;

      for (const r of allRoutes) {
        const rp = (r.pickup_stop || '').trim().toLowerCase();
        const rd = (r.destination_stop || '').trim().toLowerCase();

        // Pickup is exact, Destination is group token
        const matchForward = (pLower.includes(rp) || rp.includes(pLower)) && (rd === targetTokenLower || rd === codeTokenLower || rd.includes(dCat.categoryLabel.toLowerCase()));
        const matchReverse = (pLower.includes(rd) || rd.includes(pLower)) && (rp === targetTokenLower || rp === codeTokenLower || rp.includes(dCat.categoryLabel.toLowerCase()));

        if (matchForward || matchReverse) {
          return {
            ...r,
            ruleType: 'STOP_TO_GROUP',
            appliedRuleDescription: `Group Rule: ${pTrim} ➔ ${dCat.categoryLabel} list (${dTrim})`
          };
        }
      }
    }

    // Check reverse: Pickup's Group ➔ Specific Destination (e.g. [Girls Hostels] -> Central Library)
    if (pCat && pCat.token) {
      const pTokenLower = pCat.token.toLowerCase();
      const pCodeTokenLower = `[${pCat.category.toLowerCase()}]`;

      for (const r of allRoutes) {
        const rp = (r.pickup_stop || '').trim().toLowerCase();
        const rd = (r.destination_stop || '').trim().toLowerCase();

        const matchForward = (rp === pTokenLower || rp === pCodeTokenLower || rp.includes(pCat.categoryLabel.toLowerCase())) && (dLower.includes(rd) || rd.includes(dLower));
        const matchReverse = (rd === pTokenLower || rd === pCodeTokenLower || rd.includes(pCat.categoryLabel.toLowerCase())) && (dLower.includes(rp) || rp.includes(dLower));

        if (matchForward || matchReverse) {
          return {
            ...r,
            ruleType: 'GROUP_TO_STOP',
            appliedRuleDescription: `Group Rule: ${pCat.categoryLabel} list ➔ ${dTrim}`
          };
        }
      }
    }

    // 3. Tier 3: Group List ➔ Group List (e.g. [Boys Hostels] -> [Departments & Schools])
    if (pCat && dCat && pCat.category !== dCat.category) {
      const pTokenLower = pCat.token.toLowerCase();
      const dTokenLower = dCat.token.toLowerCase();
      const pCatLower = pCat.categoryLabel.toLowerCase();
      const dCatLower = dCat.categoryLabel.toLowerCase();

      for (const r of allRoutes) {
        const rp = (r.pickup_stop || '').trim().toLowerCase();
        const rd = (r.destination_stop || '').trim().toLowerCase();

        const matchForward = (rp === pTokenLower || rp.includes(pCatLower)) && (rd === dTokenLower || rd.includes(dCatLower));
        const matchReverse = (rp === dTokenLower || rp.includes(dCatLower)) && (rd === pTokenLower || rd.includes(pCatLower));

        if (matchForward || matchReverse) {
          return {
            ...r,
            ruleType: 'GROUP_TO_GROUP',
            appliedRuleDescription: `Group Matrix: ${pCat.categoryLabel} ➔ ${dCat.categoryLabel}`
          };
        }
      }
    }

    // 4. Tier 4: Normalized & Substring Overlap Matching
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
        return {
          ...r,
          ruleType: 'NORMALIZED_MATCH',
          appliedRuleDescription: `Matched Campus Route: ${r.pickup_stop} ➔ ${r.destination_stop}`
        };
      }
    }

    // 5. Tier 5: Keyword / Synonym Fallback
    const getSynonyms = (str) => {
      const s = (str || '').toLowerCase();
      const tokens = [];
      if (s.includes('silver') || s.includes('jubilee') || s.includes('sjc')) tokens.push('silver_jubilee');
      if (s.includes('gate 2') || s.includes('gate2') || s.includes('ecr')) tokens.push('gate_2');
      if (s.includes('gate 1') || s.includes('gate1') || s.includes('main gate')) tokens.push('gate_1');
      if (s.includes('library')) tokens.push('library');
      if (s.includes('canteen') || s.includes('food court')) tokens.push('canteen');
      if (s.includes('curie') || s.includes('girls hostel') || s.includes('teresa') || s.includes('ganga')) tokens.push('girls_hostel');
      if (s.includes('physics') || s.includes('science') || s.includes('management') || s.includes('math')) tokens.push('dept');
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
          return {
            ...r,
            ruleType: 'SYNONYM_MATCH',
            appliedRuleDescription: `Synonym Route: ${r.pickup_stop} ➔ ${r.destination_stop}`
          };
        }
      }
    }

    return null;
  },

  async upsertRouteFare({ pickupStop, destinationStop, fareAmount, distanceKm = 1.5, isActive = 1 }) {
    const existing = await db.queryOne(
      `SELECT * FROM route_fares 
       WHERE (LOWER(TRIM(pickup_stop)) = LOWER(TRIM(?)) AND LOWER(TRIM(destination_stop)) = LOWER(TRIM(?)))
          OR (LOWER(TRIM(pickup_stop)) = LOWER(TRIM(?)) AND LOWER(TRIM(destination_stop)) = LOWER(TRIM(?)))`,
      [pickupStop, destinationStop, destinationStop, pickupStop]
    );

    if (existing && existing.id) {
      await db.query(
        `UPDATE route_fares 
         SET fare_amount = ?, distance_km = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [parseFloat(fareAmount), parseFloat(distanceKm), isActive ? 1 : 0, existing.id]
      );
      return db.queryOne('SELECT * FROM route_fares WHERE id = ?', [existing.id]);
    }

    try {
      const res = await db.query(
        `INSERT INTO route_fares (pickup_stop, destination_stop, fare_amount, distance_km, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [pickupStop.trim(), destinationStop.trim(), parseFloat(fareAmount), parseFloat(distanceKm), isActive ? 1 : 0]
      );
      const insertedId = res?.insertId;
      if (insertedId) {
        return db.queryOne('SELECT * FROM route_fares WHERE id = ?', [insertedId]);
      }
    } catch (err) {
      await db.query(
        `UPDATE route_fares 
         SET fare_amount = ?, distance_km = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE (LOWER(TRIM(pickup_stop)) = LOWER(TRIM(?)) AND LOWER(TRIM(destination_stop)) = LOWER(TRIM(?)))
            OR (LOWER(TRIM(pickup_stop)) = LOWER(TRIM(?)) AND LOWER(TRIM(destination_stop)) = LOWER(TRIM(?)))`,
        [parseFloat(fareAmount), parseFloat(distanceKm), isActive ? 1 : 0, pickupStop, destinationStop, destinationStop, pickupStop]
      );
    }

    return db.queryOne(
      `SELECT * FROM route_fares 
       WHERE (LOWER(TRIM(pickup_stop)) = LOWER(TRIM(?)) AND LOWER(TRIM(destination_stop)) = LOWER(TRIM(?)))
          OR (LOWER(TRIM(pickup_stop)) = LOWER(TRIM(?)) AND LOWER(TRIM(destination_stop)) = LOWER(TRIM(?))) LIMIT 1`,
      [pickupStop, destinationStop, destinationStop, pickupStop]
    );
  },

  async updateRouteFareById(id, { fareAmount, distanceKm, isActive, pickupStop, destinationStop }) {
    await db.query(
      `UPDATE route_fares 
       SET fare_amount = COALESCE(?, fare_amount),
           distance_km = COALESCE(?, distance_km),
           pickup_stop = COALESCE(?, pickup_stop),
           destination_stop = COALESCE(?, destination_stop),
           is_active = COALESCE(?, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        fareAmount !== undefined ? parseFloat(fareAmount) : null,
        distanceKm !== undefined ? parseFloat(distanceKm) : null,
        pickupStop ? pickupStop.trim() : null,
        destinationStop ? destinationStop.trim() : null,
        isActive !== undefined ? (isActive ? 1 : 0) : null,
        id
      ]
    );
    return db.queryOne('SELECT * FROM route_fares WHERE id = ?', [id]);
  },

  async deleteRouteFare(id) {
    return db.query('DELETE FROM route_fares WHERE id = ?', [id]);
  }
};

module.exports = FareModel;

