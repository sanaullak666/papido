const db = require('../config/database');

let configsCache = null;
let configsCacheExpiry = 0;
let routeFaresCache = null;
let routeFaresCacheExpiry = 0;
const FARE_CACHE_TTL = 60000; // 60 seconds TTL

const FareModel = {
  async getFareConfiguration(vehicleType) {
    return db.queryOne('SELECT * FROM fare_configurations WHERE vehicle_type = ? AND is_active = 1', [vehicleType]);
  },

  async getAllConfigurations() {
    if (configsCache && Date.now() < configsCacheExpiry) {
      return configsCache;
    }
    const rows = await db.query('SELECT * FROM fare_configurations ORDER BY id ASC');
    configsCache = rows;
    configsCacheExpiry = Date.now() + FARE_CACHE_TTL;
    return rows;
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
    configsCache = null; // Invalidate cache
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
    if (routeFaresCache && Date.now() < routeFaresCacheExpiry) {
      return routeFaresCache;
    }
    const rows = await db.query('SELECT * FROM route_fares ORDER BY pickup_stop ASC, destination_stop ASC');
    routeFaresCache = rows;
    routeFaresCacheExpiry = Date.now() + FARE_CACHE_TTL;
    return rows;
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

    // 3. Substring inclusion match (both stops must match, e.g. 'Main Gate' inside 'PU Main Gate (Gate 1)')
    for (const r of allRoutes) {
      const rpNorm = normalize(r.pickup_stop);
      const rdNorm = normalize(r.destination_stop);
      if (!rpNorm || !rdNorm || rpNorm.length < 3 || rdNorm.length < 3) continue;

      const directSub = (pNorm.includes(rpNorm) || rpNorm.includes(pNorm)) &&
                        (dNorm.includes(rdNorm) || rdNorm.includes(dNorm));
      const reverseSub = (pNorm.includes(rdNorm) || rdNorm.includes(pNorm)) &&
                         (dNorm.includes(rpNorm) || rpNorm.includes(dNorm));
      if (directSub || reverseSub) {
        return r;
      }
    }

    // No admin route matches this pickup and destination pair
    return null;
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

    routeFaresCache = null;
    await upsertSingle(p, d);
    if (isBidirectional) {
      await upsertSingle(d, p);
    }

    return this.findRouteFare(p, d);
  },

  async updateRouteFareById(id, { fareAmount, distanceKm, isActive }) {
    routeFaresCache = null;
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
    routeFaresCache = null;
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
  },

  /**
   * Fare Split Rules management
   */
  async getAllSplitRules() {
    return db.query('SELECT * FROM fare_split_rules ORDER BY priority ASC, min_fare ASC');
  },

  async createSplitRule(data = {}) {
    const minFare = data.minFare !== undefined ? parseFloat(data.minFare) : (data.min_fare !== undefined ? parseFloat(data.min_fare) : 0);
    const maxFare = data.maxFare !== undefined ? (data.maxFare === null ? null : parseFloat(data.maxFare)) : (data.max_fare !== undefined ? (data.max_fare === null ? null : parseFloat(data.max_fare)) : null);
    const ruleType = data.ruleType || data.rule_type || 'FIXED';
    const companyCutFixed = data.companyCutFixed !== undefined ? parseFloat(data.companyCutFixed) : (data.company_cut_fixed !== undefined ? parseFloat(data.company_cut_fixed) : 0);
    const riderControllerCutFixed = data.riderControllerCutFixed !== undefined ? parseFloat(data.riderControllerCutFixed) : (data.rider_controller_cut_fixed !== undefined ? parseFloat(data.rider_controller_cut_fixed) : 0);
    const companyCutPercentage = data.companyCutPercentage !== undefined ? parseFloat(data.companyCutPercentage) : (data.company_cut_percentage !== undefined ? parseFloat(data.company_cut_percentage) : 0);
    const riderCutPercentage = data.riderCutPercentage !== undefined ? parseFloat(data.riderCutPercentage) : (data.rider_cut_percentage !== undefined ? parseFloat(data.rider_cut_percentage) : 80);
    const description = data.description || '';
    const priority = data.priority !== undefined ? parseInt(data.priority, 10) : 1;
    const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : (data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1);

    const res = await db.query(
      `INSERT INTO fare_split_rules 
       (min_fare, max_fare, rule_type, company_cut_fixed, rider_controller_cut_fixed, company_cut_percentage, rider_cut_percentage, description, priority, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [minFare, maxFare, ruleType, companyCutFixed, riderControllerCutFixed, companyCutPercentage, riderCutPercentage, description, priority, isActive]
    );

    return db.queryOne('SELECT * FROM fare_split_rules WHERE id = ?', [res.insertId]);
  },

  async updateSplitRule(id, data = {}) {
    const existing = await db.queryOne('SELECT * FROM fare_split_rules WHERE id = ?', [id]);
    if (!existing) return null;

    const minFare = data.minFare !== undefined ? parseFloat(data.minFare) : (data.min_fare !== undefined ? parseFloat(data.min_fare) : existing.min_fare);
    const maxFare = data.maxFare !== undefined ? (data.maxFare === null ? null : parseFloat(data.maxFare)) : (data.max_fare !== undefined ? (data.max_fare === null ? null : parseFloat(data.max_fare)) : existing.max_fare);
    const ruleType = data.ruleType || data.rule_type || existing.rule_type;
    const companyCutFixed = data.companyCutFixed !== undefined ? parseFloat(data.companyCutFixed) : (data.company_cut_fixed !== undefined ? parseFloat(data.company_cut_fixed) : existing.company_cut_fixed);
    const riderControllerCutFixed = data.riderControllerCutFixed !== undefined ? parseFloat(data.riderControllerCutFixed) : (data.rider_controller_cut_fixed !== undefined ? parseFloat(data.rider_controller_cut_fixed) : existing.rider_controller_cut_fixed);
    const companyCutPercentage = data.companyCutPercentage !== undefined ? parseFloat(data.companyCutPercentage) : (data.company_cut_percentage !== undefined ? parseFloat(data.company_cut_percentage) : existing.company_cut_percentage);
    const riderCutPercentage = data.riderCutPercentage !== undefined ? parseFloat(data.riderCutPercentage) : (data.rider_cut_percentage !== undefined ? parseFloat(data.rider_cut_percentage) : existing.rider_cut_percentage);
    const description = data.description !== undefined ? data.description : existing.description;
    const priority = data.priority !== undefined ? parseInt(data.priority, 10) : existing.priority;
    const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : (data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active);

    await db.query(
      `UPDATE fare_split_rules 
       SET min_fare = ?, max_fare = ?, rule_type = ?, company_cut_fixed = ?, rider_controller_cut_fixed = ?,
           company_cut_percentage = ?, rider_cut_percentage = ?, description = ?, priority = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [minFare, maxFare, ruleType, companyCutFixed, riderControllerCutFixed, companyCutPercentage, riderCutPercentage, description, priority, isActive, id]
    );

    return db.queryOne('SELECT * FROM fare_split_rules WHERE id = ?', [id]);
  }
};

module.exports = FareModel;
