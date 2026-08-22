const db = require('../config/database');

const EarningModel = {
  async recordEarning({
    riderId,
    rideId,
    totalFare,
    riderEarning,
    companyEarning,
    controllerEarning = 0.00,
    appliedRuleDescription = null
  }) {
    const result = await db.query(
      `INSERT INTO rider_earnings 
       (rider_id, ride_id, total_fare, rider_earning, company_earning, controller_earning, applied_rule_description, gross_fare, platform_fee, controller_fee, net_earning) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        riderId, rideId, totalFare, riderEarning, companyEarning, controllerEarning, appliedRuleDescription,
        totalFare, companyEarning, controllerEarning, riderEarning
      ]
    );
    return db.queryOne('SELECT * FROM rider_earnings WHERE id = ?', [result.insertId]);
  },

  async getRiderEarningsSummary(riderId) {
    // Today's earnings from rider_earnings
    const todaySql = `
      SELECT 
        COALESCE(SUM(rider_earning), 0) as today_earnings,
        COALESCE(SUM(company_earning), 0) as today_company_cut,
        COALESCE(SUM(total_fare), 0) as today_gross_fare,
        COUNT(id) as today_completed_rides
      FROM rider_earnings
      WHERE rider_id = ? AND (created_at >= CURDATE() OR DATE(created_at) = CURDATE())
    `;

    // Weekly earnings (last 7 days)
    const weeklySql = `
      SELECT 
        COALESCE(SUM(rider_earning), 0) as weekly_earnings,
        COALESCE(SUM(company_earning), 0) as weekly_company_cut,
        COALESCE(SUM(total_fare), 0) as weekly_gross_fare,
        COUNT(id) as weekly_completed_rides
      FROM rider_earnings
      WHERE rider_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;

    // Monthly earnings (last 30 days)
    const monthlySql = `
      SELECT 
        COALESCE(SUM(rider_earning), 0) as monthly_earnings,
        COALESCE(SUM(company_earning), 0) as monthly_company_cut,
        COALESCE(SUM(total_fare), 0) as monthly_gross_fare,
        COUNT(id) as monthly_completed_rides
      FROM rider_earnings
      WHERE rider_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;

    // Total lifetime
    const lifetimeSql = `
      SELECT 
        COALESCE(SUM(rider_earning), 0) as lifetime_earnings,
        COALESCE(SUM(company_earning), 0) as lifetime_company_cut,
        COALESCE(SUM(total_fare), 0) as lifetime_gross_fare,
        COUNT(id) as lifetime_completed_rides
      FROM rider_earnings
      WHERE rider_id = ?
    `;

    const [today, weekly, monthly, lifetime] = await Promise.all([
      db.queryOne(todaySql, [riderId]),
      db.queryOne(weeklySql, [riderId]),
      db.queryOne(monthlySql, [riderId]),
      db.queryOne(lifetimeSql, [riderId])
    ]);

    return {
      today: {
        earnings: parseFloat(today.today_earnings || 0),
        companyDeduction: parseFloat(today.today_company_cut || 0),
        grossFare: parseFloat(today.today_gross_fare || 0),
        rides: parseInt(today.today_completed_rides || 0, 10)
      },
      weekly: {
        earnings: parseFloat(weekly.weekly_earnings || 0),
        companyDeduction: parseFloat(weekly.weekly_company_cut || 0),
        grossFare: parseFloat(weekly.weekly_gross_fare || 0),
        rides: parseInt(weekly.weekly_completed_rides || 0, 10)
      },
      monthly: {
        earnings: parseFloat(monthly.monthly_earnings || 0),
        companyDeduction: parseFloat(monthly.monthly_company_cut || 0),
        grossFare: parseFloat(monthly.monthly_gross_fare || 0),
        rides: parseInt(monthly.monthly_completed_rides || 0, 10)
      },
      lifetime: {
        earnings: parseFloat(lifetime.lifetime_earnings || 0),
        companyDeduction: parseFloat(lifetime.lifetime_company_cut || 0),
        grossFare: parseFloat(lifetime.lifetime_gross_fare || 0),
        rides: parseInt(lifetime.lifetime_completed_rides || 0, 10)
      }
    };
  },

  async getPlatformRevenueStats() {
    const sql = `
      SELECT 
        COALESCE(SUM(total_fare), 0) as total_volume,
        COALESCE(SUM(rider_earning), 0) as total_rider_payouts,
        COALESCE(SUM(company_earning), 0) as total_company_revenue,
        COALESCE(SUM(controller_earning), 0) as total_controller_cut,
        COUNT(id) as total_earning_transactions
      FROM rider_earnings
    `;
    const stats = await db.queryOne(sql);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayISO = startOfToday.toISOString().slice(0, 19).replace('T', ' ');

    const todaySql = `
      SELECT 
        COALESCE(SUM(total_fare), 0) as today_volume,
        COALESCE(SUM(company_earning), 0) as today_company_revenue,
        COALESCE(SUM(rider_earning), 0) as today_rider_earnings
      FROM rider_earnings
      WHERE created_at >= ?
    `;
    const todayStats = await db.queryOne(todaySql, [startOfTodayISO]);

    return {
      totalVolume: parseFloat(stats.total_volume || 0),
      totalRiderPayouts: parseFloat(stats.total_rider_payouts || 0),
      totalCompanyRevenue: parseFloat(stats.total_company_revenue || 0),
      totalControllerCut: parseFloat(stats.total_controller_cut || 0),
      totalTransactions: parseInt(stats.total_earning_transactions || 0, 10),
      todayVolume: parseFloat(todayStats?.today_volume || 0),
      todayCompanyRevenue: parseFloat(todayStats?.today_company_revenue || 0),
      todayRiderEarnings: parseFloat(todayStats?.today_rider_earnings || 0)
    };
  },

  async listRiderEarnings(riderId, { limit = 20, offset = 0 }) {
    const sql = `
      SELECT re.*, r.ride_code, r.pickup_address, r.destination_address
      FROM rider_earnings re
      JOIN rides r ON re.ride_id = r.id
      WHERE re.rider_id = ?
      ORDER BY re.id DESC
      LIMIT ? OFFSET ?
    `;
    return db.query(sql, [riderId, Number(limit), Number(offset)]);
  }
};

module.exports = EarningModel;
