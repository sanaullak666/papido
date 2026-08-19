const db = require('../config/database');
const { CAMPUS_CATEGORIES } = require('../config/constants');

const DEFAULT_CATEGORY_MAP = {
  GIRLS_HOSTEL: { label: 'Girls Hostels', token: '[Girls Hostels]', icon: '👧', color: '#EC4899', bg_color: 'rgba(236, 72, 153, 0.12)' },
  BOYS_HOSTEL: { label: 'Boys Hostels', token: '[Boys Hostels]', icon: '👦', color: '#3B82F6', bg_color: 'rgba(59, 130, 246, 0.12)' },
  DEPARTMENT: { label: 'Departments & Schools', token: '[Departments & Schools]', icon: '🏛️', color: '#10B981', bg_color: 'rgba(16, 185, 129, 0.12)' },
  GATE_HUB: { label: 'Gates & Campus Hubs', token: '[Gates & Hubs]', icon: '🚪', color: '#F59E0B', bg_color: 'rgba(245, 158, 11, 0.12)' }
};

const FareModel = {
  // ==========================================
  // VEHICLE FARE CONFIGURATIONS
  // ==========================================
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
  // CAMPUS CATEGORIES & LIST MANAGEMENT
  // ==========================================
  async getAllCategories() {
    try {
      return await db.query('SELECT * FROM campus_categories WHERE is_active = 1 ORDER BY display_order ASC, id ASC');
    } catch (_) {
      return Object.entries(DEFAULT_CATEGORY_MAP).map(([k, v], idx) => ({
        id: idx + 1,
        category_key: k,
        label: v.label,
        token: v.token,
        icon: v.icon,
        color: v.color,
        bg_color: v.bg_color,
        display_order: idx + 1,
        is_active: 1
      }));
    }
  },

  async getAllAdminCategories() {
    try {
      const categories = await db.query('SELECT * FROM campus_categories ORDER BY display_order ASC, id ASC');
      // Count stops per category
      const stopCounts = await db.query('SELECT category, COUNT(*) as count FROM campus_stops GROUP BY category');
      const countMap = {};
      (stopCounts || []).forEach(sc => {
        if (sc.category) {
          countMap[sc.category] = sc.count;
          countMap[sc.category.toLowerCase()] = sc.count;
          countMap[sc.category.toUpperCase()] = sc.count;
        }
      });

      return (categories || []).map(cat => ({
        ...cat,
        stopsCount: countMap[cat.category_key] || countMap[cat.category_key?.toUpperCase()] || countMap[cat.category_key?.toLowerCase()] || 0
      }));
    } catch (_) {
      return Object.entries(DEFAULT_CATEGORY_MAP).map(([k, v], idx) => ({
        id: idx + 1,
        category_key: k,
        label: v.label,
        token: v.token,
        icon: v.icon,
        color: v.color,
        bg_color: v.bg_color,
        display_order: idx + 1,
        is_active: 1,
        stopsCount: 0
      }));
    }
  },

  async getCategoryById(id) {
    return db.queryOne('SELECT * FROM campus_categories WHERE id = ?', [id]);
  },

  async getCategoryByKey(key) {
    return db.queryOne('SELECT * FROM campus_categories WHERE category_key = ?', [key]);
  },

  async createCategory({ category_key, label, token, icon, color, bg_color, display_order = 0, is_active = 1 }) {
    const rawLabel = (label || '').trim();
    const derivedKey = (category_key || rawLabel.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 45) || `CAT_${Date.now()}`).trim();
    let derivedToken = (token || `[${rawLabel}]`).trim();
    if (!derivedToken.startsWith('[')) derivedToken = `[${derivedToken}`;
    if (!derivedToken.endsWith(']')) derivedToken = `${derivedToken}]`;

    const iconVal = icon || '📍';
    const colorVal = color || '#3B82F6';
    const bgVal = bg_color || `rgba(59, 130, 246, 0.12)`;

    const res = await db.query(
      `INSERT INTO campus_categories (category_key, label, token, icon, color, bg_color, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [derivedKey, rawLabel, derivedToken, iconVal, colorVal, bgVal, parseInt(display_order) || 0, is_active ? 1 : 0]
    );

    const insertedId = res?.insertId;
    if (insertedId) {
      return db.queryOne('SELECT * FROM campus_categories WHERE id = ?', [insertedId]);
    }
    return db.queryOne('SELECT * FROM campus_categories WHERE category_key = ?', [derivedKey]);
  },

  async updateCategory(id, { category_key, label, token, icon, color, bg_color, display_order, is_active }) {
    const current = await this.getCategoryById(id);
    if (!current) return null;

    let derivedToken = token ? token.trim() : current.token;
    if (derivedToken && !derivedToken.startsWith('[')) derivedToken = `[${derivedToken}`;
    if (derivedToken && !derivedToken.endsWith(']')) derivedToken = `${derivedToken}]`;

    const updatedKey = category_key ? category_key.trim() : current.category_key;
    const updatedLabel = label ? label.trim() : current.label;

    await db.query(
      `UPDATE campus_categories
       SET category_key = COALESCE(?, category_key),
           label = COALESCE(?, label),
           token = COALESCE(?, token),
           icon = COALESCE(?, icon),
           color = COALESCE(?, color),
           bg_color = COALESCE(?, bg_color),
           display_order = COALESCE(?, display_order),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        updatedKey,
        updatedLabel,
        derivedToken,
        icon || null,
        color || null,
        bg_color || null,
        display_order !== undefined ? parseInt(display_order) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id
      ]
    );

    // If key or label changed, synchronize campus_stops
    if (current.category_key !== updatedKey || current.label !== updatedLabel) {
      try {
        await db.query(
          `UPDATE campus_stops 
           SET category = ?, category_label = ? 
           WHERE category = ? OR category = ?`,
          [updatedKey, updatedLabel, current.category_key, current.category_key.toLowerCase()]
        );
      } catch (_) {}
    }

    return this.getCategoryById(id);
  },

  async deleteCategory(id, { deleteStops = false } = {}) {
    const category = await this.getCategoryById(id);
    if (!category) return { success: false, message: 'Category not found' };

    if (deleteStops) {
      await db.query('DELETE FROM campus_stops WHERE category = ? OR category = ?', [category.category_key, category.category_key.toLowerCase()]);
    } else {
      await db.query('UPDATE campus_stops SET category = ?, category_label = ? WHERE category = ? OR category = ?', ['GATE_HUB', 'Gates & Campus Hubs', category.category_key, category.category_key.toLowerCase()]);
    }

    await db.query('DELETE FROM campus_categories WHERE id = ?', [id]);
    return { success: true, deletedCategory: category };
  },

  async deleteAllCategories({ deleteStops = false } = {}) {
    if (deleteStops) {
      await db.query('DELETE FROM campus_stops');
    }
    await db.query('DELETE FROM campus_categories');
    return { success: true };
  },

  // ==========================================
  // CAMPUS STOPS MANAGEMENT
  // ==========================================
  async getAllCampusStops() {
    return db.query('SELECT * FROM campus_stops WHERE is_active = 1 ORDER BY display_order ASC, name ASC');
  },

  async getAllAdminCampusStops() {
    return db.query('SELECT * FROM campus_stops ORDER BY display_order ASC, name ASC');
  },

  async getGroupedCampusStops() {
    let categories = [];
    try {
      categories = await this.getAllCategories();
    } catch (_) {}

    const stops = await this.getAllAdminCampusStops();
    const groupedMap = {};

    // 1. Initialize groups from dynamic categories
    if (categories && categories.length > 0) {
      categories.forEach(cat => {
        groupedMap[cat.category_key] = {
          id: cat.id,
          key: cat.category_key,
          label: cat.label,
          token: cat.token,
          icon: cat.icon || '📍',
          color: cat.color || '#3B82F6',
          bg: cat.bg_color || 'rgba(59, 130, 246, 0.12)',
          display_order: cat.display_order || 0,
          stops: []
        };
      });
    } else {
      Object.entries(DEFAULT_CATEGORY_MAP).forEach(([k, v], idx) => {
        groupedMap[k] = {
          id: idx + 1,
          key: k,
          label: v.label,
          token: v.token,
          icon: v.icon,
          color: v.color,
          bg: v.bg_color,
          display_order: idx + 1,
          stops: []
        };
      });
    }

    // 2. Distribute stops into groups
    let otherGroup = null;
    (stops || []).forEach(s => {
      const cat = s.category || 'GATE_HUB';
      const matchedKey = Object.keys(groupedMap).find(k => k.toLowerCase() === cat.toLowerCase());
      if (matchedKey) {
        groupedMap[matchedKey].stops.push(s);
      } else if (groupedMap[cat]) {
        groupedMap[cat].stops.push(s);
      } else {
        if (!otherGroup) {
          otherGroup = {
            id: 'OTHER',
            key: 'OTHER',
            label: 'Other Campus Locations',
            token: '[Other Locations]',
            icon: '📍',
            color: '#64748B',
            bg: 'rgba(100, 116, 139, 0.12)',
            display_order: 999,
            stops: []
          };
        }
        otherGroup.stops.push(s);
      }
    });

    const result = Object.values(groupedMap);
    if (otherGroup && otherGroup.stops.length > 0) {
      result.push(otherGroup);
    }
    return result;
  },

  async createCampusStop({ name, category, category_label, latitude, longitude, display_order = 0 }) {
    let label = category_label;
    if (!label) {
      const cat = await this.getCategoryByKey(category);
      label = cat ? cat.label : (DEFAULT_CATEGORY_MAP[category]?.label || 'Campus Location');
    }

    await db.query(
      `INSERT INTO campus_stops (name, category, category_label, latitude, longitude, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [name.trim(), category, label, latitude ? parseFloat(latitude) : null, longitude ? parseFloat(longitude) : null, parseInt(display_order) || 0]
    );
    return db.queryOne('SELECT * FROM campus_stops WHERE name = ?', [name.trim()]);
  },

  async updateCampusStop(id, { name, category, category_label, latitude, longitude, display_order, is_active }) {
    let label = category_label;
    if (!label && category) {
      const cat = await this.getCategoryByKey(category);
      label = cat ? cat.label : (DEFAULT_CATEGORY_MAP[category]?.label || 'Campus Location');
    }

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

  async deleteAllCampusStops({ category = null } = {}) {
    if (category) {
      return db.query('DELETE FROM campus_stops WHERE category = ? OR category = ?', [category, category.toLowerCase()]);
    }
    return db.query('DELETE FROM campus_stops');
  },

  // Dynamic Stop Category Resolver
  async resolveStopCategory(stopName) {
    if (!stopName) return null;
    const clean = stopName.trim().toLowerCase();

    // 1. Direct DB lookup in campus_stops
    const stopRow = await db.queryOne('SELECT * FROM campus_stops WHERE LOWER(TRIM(name)) = ?', [clean]);
    let categories = [];
    try {
      categories = await this.getAllCategories();
    } catch (_) {}

    const catMap = {};
    for (const c of (categories || [])) {
      catMap[c.category_key] = c;
      catMap[c.category_key.toLowerCase()] = c;
      if (c.token) catMap[c.token.toLowerCase()] = c;
      if (c.label) catMap[c.label.toLowerCase()] = c;
    }

    if (stopRow) {
      const matchedCat = catMap[stopRow.category] || catMap[stopRow.category.toLowerCase()];
      return {
        category: stopRow.category,
        categoryLabel: stopRow.category_label || (matchedCat ? matchedCat.label : stopRow.category),
        token: matchedCat ? matchedCat.token : (DEFAULT_CATEGORY_MAP[stopRow.category]?.token || `[${stopRow.category_label || stopRow.category}]`)
      };
    }

    // 2. Check if string is already a group token or label
    for (const c of (categories || [])) {
      const tLower = (c.token || '').toLowerCase();
      const lLower = (c.label || '').toLowerCase();
      const kLower = (c.category_key || '').toLowerCase();
      if (clean === tLower || clean === `[${kLower}]` || clean === lLower) {
        return { category: c.category_key, categoryLabel: c.label, token: c.token };
      }
    }

    // 3. Partial Token matching
    for (const c of (categories || [])) {
      const tLower = (c.token || '').toLowerCase();
      const lLower = (c.label || '').toLowerCase();
      if ((clean.startsWith('[') && clean.endsWith(']') && clean.includes(lLower)) || clean.includes(tLower)) {
        return { category: c.category_key, categoryLabel: c.label, token: c.token };
      }
    }

    // 4. Keyword Fallbacks
    if (/curie|teresa|ganga|yamuna|sarojini|cauvery|saraswathi/i.test(clean)) {
      const c = catMap['GIRLS_HOSTEL'] || catMap['girls_hostel'];
      return { category: 'GIRLS_HOSTEL', categoryLabel: c ? c.label : 'Girls Hostels', token: c ? c.token : '[Girls Hostels]' };
    }
    if (/silver|jubilee|sjc|bharathidasan|kabilar|subramania|kalidas|valmiki/i.test(clean)) {
      const c = catMap['BOYS_HOSTEL'] || catMap['boys_hostel'];
      return { category: 'BOYS_HOSTEL', categoryLabel: c ? c.label : 'Boys Hostels', token: c ? c.token : '[Boys Hostels]' };
    }
    if (/physics|management|som|humanities|biotech|engineering|media|science|math|department|school/i.test(clean)) {
      const c = catMap['DEPARTMENT'] || catMap['department'];
      return { category: 'DEPARTMENT', categoryLabel: c ? c.label : 'Departments & Schools', token: c ? c.token : '[Departments & Schools]' };
    }
    if (/gate|library|canteen|admin|shopping|stadium|hub/i.test(clean)) {
      const c = catMap['GATE_HUB'] || catMap['gate_hub'];
      return { category: 'GATE_HUB', categoryLabel: c ? c.label : 'Gates & Hubs', token: c ? c.token : '[Gates & Hubs]' };
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
  },

  async deleteAllRouteFares() {
    return db.query('DELETE FROM route_fares');
  }
};

module.exports = FareModel;

