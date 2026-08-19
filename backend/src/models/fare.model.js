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
  // CAMPUS AREAS (CAMPUS ZONES) MANAGEMENT
  // ==========================================
  async getAllCampusAreas() {
    try {
      return await db.query('SELECT * FROM campus_areas WHERE is_active = 1 ORDER BY display_order ASC, id ASC');
    } catch (_) {
      return [];
    }
  },

  async getAllAdminCampusAreas() {
    try {
      const areas = await db.query('SELECT * FROM campus_areas ORDER BY display_order ASC, id ASC');
      const stopCounts = await db.query('SELECT area_code, COUNT(*) as count FROM campus_stops WHERE is_active = 1 GROUP BY area_code');
      const countMap = {};
      (stopCounts || []).forEach(sc => {
        if (sc.area_code) countMap[sc.area_code] = sc.count;
      });
      return (areas || []).map(a => ({
        ...a,
        stopsCount: countMap[a.area_code] || 0
      }));
    } catch (_) {
      return [];
    }
  },

  async getCampusAreaByCode(areaCode) {
    return db.queryOne('SELECT * FROM campus_areas WHERE area_code = ?', [areaCode]);
  },

  async createCampusArea({ area_code, name, icon, color, bg_color, description, display_order, is_active = 1 }) {
    let finalCode = area_code;
    if (!finalCode) {
      finalCode = name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 50);
    }
    const res = await db.query(
      `INSERT INTO campus_areas (area_code, name, icon, color, bg_color, description, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [finalCode, name.trim(), icon || '📍', color || '#3B82F6', bg_color || 'rgba(59, 130, 246, 0.12)', description || null, parseInt(display_order) || 0, is_active ? 1 : 0]
    );
    const insertedId = res?.insertId;
    return this.getCampusAreaByCode(finalCode) || (insertedId ? db.queryOne('SELECT * FROM campus_areas WHERE id = ?', [insertedId]) : null);
  },

  async updateCampusArea(id, { area_code, name, icon, color, bg_color, description, display_order, is_active }) {
    await db.query(
      `UPDATE campus_areas
       SET area_code = COALESCE(?, area_code),
           name = COALESCE(?, name),
           icon = COALESCE(?, icon),
           color = COALESCE(?, color),
           bg_color = COALESCE(?, bg_color),
           description = COALESCE(?, description),
           display_order = COALESCE(?, display_order),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        area_code || null,
        name ? name.trim() : null,
        icon || null,
        color || null,
        bg_color || null,
        description !== undefined ? description : null,
        display_order !== undefined ? parseInt(display_order) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id
      ]
    );
    return db.queryOne('SELECT * FROM campus_areas WHERE id = ?', [id]);
  },

  async deleteCampusArea(id, { deleteStops = false } = {}) {
    const area = await db.queryOne('SELECT * FROM campus_areas WHERE id = ?', [id]);
    if (!area) return { success: false, message: 'Campus area not found' };

    if (deleteStops) {
      await db.query('DELETE FROM campus_stops WHERE area_code = ?', [area.area_code]);
    } else {
      await db.query('UPDATE campus_stops SET area_code = "MAIN_CAMPUS" WHERE area_code = ?', [area.area_code]);
    }
    // Delete any area fares referencing this area
    await db.query('DELETE FROM area_fares WHERE from_area_code = ? OR to_area_code = ?', [area.area_code, area.area_code]);
    await db.query('DELETE FROM campus_areas WHERE id = ?', [id]);
    return { success: true, deleted: area };
  },

  async deleteAllCampusAreas({ deleteStops = false } = {}) {
    if (deleteStops) {
      await db.query('DELETE FROM campus_stops');
    } else {
      await db.query('UPDATE campus_stops SET area_code = "MAIN_CAMPUS"');
    }
    await db.query('DELETE FROM area_fares');
    return db.query('DELETE FROM campus_areas');
  },

  // ==========================================
  // AREA-TO-AREA FARE MATRIX MANAGEMENT
  // ==========================================
  async getAllAreaFares() {
    try {
      const fares = await db.query('SELECT * FROM area_fares WHERE is_active = 1 ORDER BY from_area_code ASC, to_area_code ASC');
      const areas = await this.getAllCampusAreas();
      const areaMap = {};
      (areas || []).forEach(a => { areaMap[a.area_code] = a; });

      return (fares || []).map(f => ({
        ...f,
        fromAreaName: areaMap[f.from_area_code]?.name || f.from_area_code,
        fromAreaIcon: areaMap[f.from_area_code]?.icon || '📍',
        fromAreaColor: areaMap[f.from_area_code]?.color || '#3B82F6',
        toAreaName: areaMap[f.to_area_code]?.name || f.to_area_code,
        toAreaIcon: areaMap[f.to_area_code]?.icon || '📍',
        toAreaColor: areaMap[f.to_area_code]?.color || '#3B82F6'
      }));
    } catch (_) {
      return [];
    }
  },

  async getAreaFareMatrix() {
    const areas = await this.getAllAdminCampusAreas();
    const fares = await db.query('SELECT * FROM area_fares WHERE is_active = 1');
    const fareMap = {};
    (fares || []).forEach(f => {
      fareMap[`${f.from_area_code}_${f.to_area_code}`] = f;
      fareMap[`${f.to_area_code}_${f.from_area_code}`] = f;
    });

    const matrix = [];
    for (const fromArea of areas) {
      const row = {
        fromArea,
        targets: []
      };
      for (const toArea of areas) {
        const key = `${fromArea.area_code}_${toArea.area_code}`;
        const existing = fareMap[key];
        row.targets.push({
          toArea,
          fareAmount: existing ? parseFloat(existing.fare_amount) : (fromArea.area_code === toArea.area_code ? 15.00 : 20.00),
          distanceKm: existing ? parseFloat(existing.distance_km) : (fromArea.area_code === toArea.area_code ? 1.0 : 1.5),
          isConfigured: !!existing,
          id: existing?.id || null
        });
      }
      matrix.push(row);
    }
    return { areas, matrix };
  },

  async upsertAreaFare({ fromAreaCode, toAreaCode, fareAmount, distanceKm = 1.5, isActive = 1 }) {
    const existing = await db.queryOne(
      `SELECT * FROM area_fares 
       WHERE (from_area_code = ? AND to_area_code = ?)
          OR (from_area_code = ? AND to_area_code = ?)`,
      [fromAreaCode, toAreaCode, toAreaCode, fromAreaCode]
    );

    if (existing && existing.id) {
      await db.query(
        `UPDATE area_fares 
         SET fare_amount = ?, distance_km = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [parseFloat(fareAmount), parseFloat(distanceKm), isActive ? 1 : 0, existing.id]
      );
      return db.queryOne('SELECT * FROM area_fares WHERE id = ?', [existing.id]);
    }

    await db.query(
      `INSERT INTO area_fares (from_area_code, to_area_code, fare_amount, distance_km, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [fromAreaCode, toAreaCode, parseFloat(fareAmount), parseFloat(distanceKm), isActive ? 1 : 0]
    );
    return db.queryOne(
      `SELECT * FROM area_fares WHERE (from_area_code = ? AND to_area_code = ?) OR (from_area_code = ? AND to_area_code = ?) LIMIT 1`,
      [fromAreaCode, toAreaCode, toAreaCode, fromAreaCode]
    );
  },

  async saveAreaFareMatrix(matrixUpdates = []) {
    for (const item of matrixUpdates) {
      if (item.fromAreaCode && item.toAreaCode && item.fareAmount !== undefined) {
        await this.upsertAreaFare(item);
      }
    }
    return this.getAreaFareMatrix();
  },

  async deleteAreaFare(id) {
    return db.query('DELETE FROM area_fares WHERE id = ?', [id]);
  },

  async deleteAllAreaFares() {
    return db.query('DELETE FROM area_fares');
  },

  // ==========================================
  // CAMPUS STOPS & GROUPED STOPS BY AREA
  // ==========================================
  async getGroupedCampusStops() {
    try {
      const areas = await this.getAllCampusAreas();
      const allStops = await db.query('SELECT * FROM campus_stops WHERE is_active = 1 ORDER BY display_order ASC, name ASC');

      const areaMap = {};
      (areas || []).forEach(a => {
        areaMap[a.area_code] = {
          id: a.id,
          code: a.area_code,
          key: a.area_code,
          label: a.name,
          name: a.name,
          icon: a.icon || '📍',
          color: a.color || '#3B82F6',
          bg: a.bg_color || 'rgba(59, 130, 246, 0.12)',
          description: a.description,
          stops: []
        };
      });

      // Fallback area if unmapped
      if (!areaMap['MAIN_CAMPUS']) {
        areaMap['MAIN_CAMPUS'] = {
          id: 999,
          code: 'MAIN_CAMPUS',
          key: 'MAIN_CAMPUS',
          label: 'Main Campus & Gate 1 Hub',
          name: 'Main Campus & Gate 1 Hub',
          icon: '🏛️',
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.12)',
          stops: []
        };
      }

      (allStops || []).forEach(stop => {
        const areaCode = stop.area_code || 'MAIN_CAMPUS';
        if (!areaMap[areaCode]) {
          areaMap[areaCode] = {
            id: 999,
            code: areaCode,
            key: areaCode,
            label: areaCode,
            name: areaCode,
            icon: '📍',
            color: '#3B82F6',
            bg: 'rgba(59, 130, 246, 0.12)',
            stops: []
          };
        }
        areaMap[areaCode].stops.push(stop);
      });

      return Object.values(areaMap);
    } catch (_) {
      return [];
    }
  },

  async resolveStopArea(stopName) {
    if (!stopName) return null;
    const clean = stopName.trim().toLowerCase();

    // 1. Direct match in campus_stops table
    const stopRow = await db.queryOne(
      'SELECT * FROM campus_stops WHERE LOWER(TRIM(name)) = ? LIMIT 1',
      [clean]
    );
    if (stopRow && stopRow.area_code) {
      const area = await this.getCampusAreaByCode(stopRow.area_code);
      return {
        areaCode: stopRow.area_code,
        areaName: area ? area.name : stopRow.area_code,
        areaIcon: area ? area.icon : '📍',
        stopName: stopRow.name
      };
    }

    // 2. Keyword heuristic matching
    if (/curie|teresa|ganga|yamuna|sarojini|cauvery|saraswathi|bharathidasan|kabilar|subramania|kalidas|valmiki|hostel/i.test(clean) && !clean.includes('silver') && !clean.includes('foreign')) {
      const a = await this.getCampusAreaByCode('HOSTEL_AREA');
      return { areaCode: 'HOSTEL_AREA', areaName: a ? a.name : 'Hostel & Residential Area', areaIcon: a ? a.icon : '🏡', stopName };
    }
    if (/silver|jubilee|sjc|foreign|sociology|history/i.test(clean)) {
      const a = await this.getCampusAreaByCode('SJC_CAMPUS');
      return { areaCode: 'SJC_CAMPUS', areaName: a ? a.name : 'Silver Jubilee Campus (SJC)', areaIcon: a ? a.icon : '🎓', stopName };
    }
    if (/science|physics|management|som|ramanujan|math|computer|humanities|biotech|engineering|media|department|school/i.test(clean)) {
      const a = await this.getCampusAreaByCode('SCIENCE_BLOCK');
      return { areaCode: 'SCIENCE_BLOCK', areaName: a ? a.name : 'Science & Academic Block', areaIcon: a ? a.icon : '🔬', stopName };
    }
    if (/gate 2|gate2|stadium|sports|ecr/i.test(clean)) {
      const a = await this.getCampusAreaByCode('SPORTS_GATE2');
      return { areaCode: 'SPORTS_GATE2', areaName: a ? a.name : 'Sports Area & Gate 2 (ECR)', areaIcon: a ? a.icon : '⚽', stopName };
    }
    if (/gate|library|canteen|admin|shopping|co-op|stores|main/i.test(clean)) {
      const a = await this.getCampusAreaByCode('MAIN_CAMPUS');
      return { areaCode: 'MAIN_CAMPUS', areaName: a ? a.name : 'Main Campus & Gate 1 Hub', areaIcon: a ? a.icon : '🏛️', stopName };
    }

    return null;
  },

  // =========================================================================
  // 🌟 ULTIMATE 4-TIER FARE PRIORITY ENGINE
  // Priority: Specific Route Override -> Area-to-Area Fare -> Default Campus Flat -> GPS Fallback
  // =========================================================================
  async findRouteFare(pickupStop, destinationStop) {
    if (!pickupStop || !destinationStop) return null;
    const pTrim = pickupStop.trim();
    const dTrim = destinationStop.trim();
    const pLower = pTrim.toLowerCase();
    const dLower = dTrim.toLowerCase();

    // -------------------------------------------------------------
    // TIER 1: Specific Route Override (Exact Stop A ➔ Exact Stop B)
    // -------------------------------------------------------------
    const exactOverride = await db.queryOne(
      `SELECT * FROM route_fares 
       WHERE (
         (LOWER(TRIM(pickup_stop)) = ? AND LOWER(TRIM(destination_stop)) = ?)
         OR 
         (LOWER(TRIM(pickup_stop)) = ? AND LOWER(TRIM(destination_stop)) = ?)
       )
       AND is_active = 1
       LIMIT 1`,
      [pLower, dLower, dLower, pLower]
    );

    if (exactOverride) {
      return {
        ...exactOverride,
        ruleTier: 1,
        ruleType: 'SPECIFIC_OVERRIDE',
        appliedRuleDescription: `🌟 Tier 1 Specific Override: ${exactOverride.pickup_stop} ➔ ${exactOverride.destination_stop}`
      };
    }

    // -------------------------------------------------------------
    // TIER 2: Campus Area ➔ Campus Area Fare (e.g. Hostel Area ➔ SJC = ₹35)
    // -------------------------------------------------------------
    const pArea = await this.resolveStopArea(pTrim);
    const dArea = await this.resolveStopArea(dTrim);

    if (pArea && dArea) {
      const areaRule = await db.queryOne(
        `SELECT * FROM area_fares 
         WHERE (
           (from_area_code = ? AND to_area_code = ?)
           OR 
           (from_area_code = ? AND to_area_code = ?)
         )
         AND is_active = 1
         LIMIT 1`,
        [pArea.areaCode, dArea.areaCode, dArea.areaCode, pArea.areaCode]
      );

      if (areaRule) {
        return {
          id: areaRule.id,
          pickup_stop: pTrim,
          destination_stop: dTrim,
          fare_amount: areaRule.fare_amount,
          distance_km: areaRule.distance_km || 1.5,
          ruleTier: 2,
          ruleType: 'AREA_TO_AREA',
          appliedRuleDescription: `🗺️ Tier 2 Area Rule: ${pArea.areaIcon} ${pArea.areaName} ➔ ${dArea.areaIcon} ${dArea.areaName}`
        };
      }
    }

    // -------------------------------------------------------------
    // TIER 3: Default Campus Flat Fare (If both stops are recognized on campus)
    // -------------------------------------------------------------
    if (pArea && dArea) {
      const sameArea = pArea.areaCode === dArea.areaCode;
      const defaultFlatFare = sameArea ? 15.00 : 20.00;
      return {
        id: 0,
        pickup_stop: pTrim,
        destination_stop: dTrim,
        fare_amount: defaultFlatFare.toFixed(2),
        distance_km: sameArea ? 1.0 : 1.5,
        ruleTier: 3,
        ruleType: 'DEFAULT_CAMPUS_FARE',
        appliedRuleDescription: `🏛️ Tier 3 Default Campus Fare (${sameArea ? 'Within Same Area: ₹15' : 'Standard Campus: ₹20'})`
      };
    }

    // Return null -> falls back to Tier 4: GPS Distance Fallback
    return null;
  },

  async getAllRouteFares() {
    return db.query('SELECT * FROM route_fares ORDER BY pickup_stop ASC, destination_stop ASC');
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
