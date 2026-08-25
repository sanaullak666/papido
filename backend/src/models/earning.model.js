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
  },

  /**
   * Daily Rider Settlement & Deductions aggregation (High Performance Parallel Execution)
   */
  async getDailySettlements({ date, search, riderId = null }) {
    const targetDate = date || new Date().toISOString().slice(0, 10);

    let sql = `
      SELECT 
        re.id as earning_id,
        re.rider_id,
        re.ride_id,
        re.total_fare,
        re.rider_earning,
        re.company_earning,
        re.controller_earning,
        re.applied_rule_description,
        re.settlement_status,
        re.settled_at,
        re.created_at,
        r.ride_code,
        r.pickup_address,
        r.destination_address,
        r.vehicle_type,
        r.completed_at,
        u.name as rider_name,
        u.phone as rider_phone,
        u.email as rider_email,
        rp.vehicle_model,
        rp.vehicle_number
      FROM rider_earnings re
      JOIN rides r ON re.ride_id = r.id
      JOIN users u ON re.rider_id = u.id
      LEFT JOIN rider_profiles rp ON u.id = rp.user_id
      WHERE (DATE(re.created_at) = ? OR DATE(r.completed_at) = ?)
    `;
    const params = [targetDate, targetDate];

    if (riderId) {
      sql += ' AND re.rider_id = ?';
      params.push(riderId);
    }

    if (search) {
      sql += ' AND (u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR r.ride_code LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY re.id DESC';

    // Parallel queries
    const [rows, dutyController, availableCoreMembers, shiftSubmissions, adminSettings] = await Promise.all([
      db.query(sql, params),
      db.queryOne(`
        SELECT ddc.*, u.name as controller_name, u.email as controller_email, u.phone as controller_phone, u.profile_image as controller_profile_image
        FROM daily_duty_controllers ddc
        JOIN users u ON ddc.core_member_id = u.id
        WHERE ddc.date = ?
      `, [targetDate]).catch(() => null),
      db.query(`
        SELECT u.id, u.name, u.email, u.phone, u.profile_image
        FROM users u
        LEFT JOIN rider_profiles rp ON u.id = rp.user_id
        WHERE u.is_core_member = 1 OR rp.is_core_member = 1
        ORDER BY u.name ASC
      `).catch(() => []),
      db.query(`SELECT * FROM daily_shift_settlements WHERE date = ?`, [targetDate]).catch(() => []),
      this.getAdminSettlementSettings()
    ]);

    const shiftMap = new Map();
    for (const s of shiftSubmissions) {
      shiftMap.set(s.rider_id, s);
    }

    // Group rides by rider
    const riderMap = new Map();
    let totalGrossVolume = 0;
    let totalCompanyCut = 0;
    let totalControllerCut = 0;
    let totalRiderNet = 0;
    let totalDeductionsDue = 0;

    for (const row of rows) {
      const fare = parseFloat(row.total_fare || 0);
      
      // Each completed ride gives exactly Rs. 2 to the Controller
      const controller = 2.00;
      
      // Company cut: Rs. 2 if fare <= 80, or 10% if fare > 80
      let company = 0.00;
      if (fare <= 80.00) {
        company = fare < 4.00 ? Number(Math.max(0, fare - controller).toFixed(2)) : 2.00;
      } else {
        company = Number((fare * 0.10).toFixed(2));
      }

      const riderNet = Number(Math.max(0, fare - company - controller).toFixed(2));
      const deduction = Number((company + controller).toFixed(2));

      totalGrossVolume += fare;
      totalCompanyCut += company;
      totalControllerCut += controller;
      totalDeductionsDue += deduction;
      totalRiderNet += riderNet;

      if (!riderMap.has(row.rider_id)) {
        const sData = shiftMap.get(row.rider_id);
        riderMap.set(row.rider_id, {
          riderId: row.rider_id,
          riderName: row.rider_name,
          riderPhone: row.rider_phone,
          riderEmail: row.rider_email,
          vehicleModel: row.vehicle_model || 'N/A',
          vehicleNumber: row.vehicle_number || 'N/A',
          vehicleType: row.vehicle_type || 'BIKE',
          totalTrips: 0,
          grossFare: 0,
          companyDue: 0,
          controllerDue: 0,
          totalDeductionDue: 0,
          riderNetEarnings: 0,
          settledTrips: 0,
          allSettled: true,
          shiftStatus: sData?.status || 'UNSETTLED',
          utrReference: sData?.utr_reference || null,
          rejectionReason: sData?.rejection_reason || null,
          submittedAt: sData?.submitted_at || null,
          approvedAt: sData?.approved_at || null,
          rides: []
        });
      }

      const rData = riderMap.get(row.rider_id);
      rData.totalTrips += 1;
      rData.grossFare += fare;
      rData.companyDue += company;
      rData.controllerDue += controller;
      rData.totalDeductionDue += deduction;
      rData.riderNetEarnings += riderNet;
      if (row.settlement_status === 'SETTLED') {
        rData.settledTrips += 1;
      } else {
        rData.allSettled = false;
      }

      rData.rides.push({
        earningId: row.earning_id,
        rideId: row.ride_id,
        rideCode: row.ride_code,
        pickupAddress: row.pickup_address,
        destinationAddress: row.destination_address,
        vehicleType: row.vehicle_type,
        totalFare: fare,
        companyEarning: company,
        controllerEarning: controller,
        totalDeduction: deduction,
        riderEarning: riderNet,
        appliedRuleDescription: fare <= 80.00
          ? `Standard Policy (Fare ≤ ₹80): Company ₹${company.toFixed(2)}, Controller ₹${controller.toFixed(2)}, Rider ₹${riderNet.toFixed(2)}`
          : `Outside / Long Trip Policy (Fare > ₹80): Company 10% (₹${company.toFixed(2)}), Controller ₹${controller.toFixed(2)}, Rider ₹${riderNet.toFixed(2)}`,
        settlementStatus: row.settlement_status || 'UNSETTLED',
        settledAt: row.settled_at,
        time: row.completed_at || row.created_at
      });
    }

    const ridersList = Array.from(riderMap.values()).map(r => {
      const sData = shiftMap.get(r.riderId);
      const computedStatus = sData?.status || (r.totalTrips > 0 && r.settledTrips === r.totalTrips ? 'SETTLED' : (r.settledTrips > 0 ? 'PARTIALLY_SETTLED' : 'UNSETTLED'));
      return {
        ...r,
        grossFare: Number(r.grossFare.toFixed(2)),
        companyDue: Number(r.companyDue.toFixed(2)),
        controllerDue: Number(r.controllerDue.toFixed(2)),
        totalDeductionDue: Number(r.totalDeductionDue.toFixed(2)),
        riderNetEarnings: Number(r.riderNetEarnings.toFixed(2)),
        settlementStatus: computedStatus,
        shiftStatus: computedStatus
      };
    });

    return {
      date: targetDate,
      adminSettings,
      summary: {
        totalRides: rows.length,
        totalActiveRiders: ridersList.length,
        totalGrossVolume: Number(totalGrossVolume.toFixed(2)),
        totalCompanyCut: Number(totalCompanyCut.toFixed(2)),
        totalControllerCut: Number(totalControllerCut.toFixed(2)),
        totalDeductionsDue: Number(totalDeductionsDue.toFixed(2)),
        totalRiderNet: Number(totalRiderNet.toFixed(2))
      },
      dutyController: dutyController ? {
        id: dutyController.id,
        date: dutyController.date,
        coreMemberId: dutyController.core_member_id,
        controllerName: dutyController.controller_name,
        controllerEmail: dutyController.controller_email,
        controllerPhone: dutyController.controller_phone,
        controllerProfileImage: dutyController.controller_profile_image,
        payoutStatus: dutyController.payout_status || 'PENDING',
        notes: dutyController.notes,
        totalEarned: Number(totalControllerCut.toFixed(2))
      } : null,
      availableCoreMembers: availableCoreMembers || [],
      riders: ridersList,
      rawRidesCount: rows.length
    };
  },

  async getAdminSettlementSettings() {
    try {
      const rows = await db.query(`
        SELECT \`key\`, \`value\` FROM system_settings 
        WHERE \`key\` IN ('ADMIN_SETTLEMENT_UPI_ID', 'ADMIN_SETTLEMENT_NAME', 'ADMIN_SETTLEMENT_AUTO_LOCK')
      `);
      const map = {};
      for (const r of rows) map[r.key] = r.value;
      return {
        adminUpiId: map['ADMIN_SETTLEMENT_UPI_ID'] || 'papido.admin@okaxis',
        adminName: map['ADMIN_SETTLEMENT_NAME'] || 'Papido Campus Operations',
        autoLockEnabled: map['ADMIN_SETTLEMENT_AUTO_LOCK'] !== 'false'
      };
    } catch (_) {
      return {
        adminUpiId: 'papido.admin@okaxis',
        adminName: 'Papido Campus Operations',
        autoLockEnabled: true
      };
    }
  },

  async saveAdminSettlementSettings({ upiId, adminName, autoLockEnabled }) {
    const queries = [];
    if (upiId !== undefined) {
      queries.push(db.query(`
        INSERT INTO system_settings (\`key\`, \`value\`, description)
        VALUES ('ADMIN_SETTLEMENT_UPI_ID', ?, 'Admin settlement receiver UPI ID')
        ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)
      `, [upiId.trim()]));
    }
    if (adminName !== undefined) {
      queries.push(db.query(`
        INSERT INTO system_settings (\`key\`, \`value\`, description)
        VALUES ('ADMIN_SETTLEMENT_NAME', ?, 'Admin settlement receiver name')
        ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)
      `, [adminName.trim()]));
    }
    if (autoLockEnabled !== undefined) {
      queries.push(db.query(`
        INSERT INTO system_settings (\`key\`, \`value\`, description)
        VALUES ('ADMIN_SETTLEMENT_AUTO_LOCK', ?, 'Lock drivers with past unsettled commission shifts')
        ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)
      `, [String(autoLockEnabled)]));
    }
    await Promise.all(queries);
    return this.getAdminSettlementSettings();
  },

  async isRiderShiftLocked(riderId) {
    const today = new Date().toISOString().slice(0, 10);
    // Find any past dates where driver completed rides and settlement is not SETTLED
    const sql = `
      SELECT 
        DATE(r.completed_at) as shift_date,
        COUNT(r.id) as trips_count,
        SUM(re.company_earning + re.controller_earning) as total_due,
        dss.status as shift_status,
        dss.rejection_reason
      FROM rides r
      JOIN rider_earnings re ON r.id = re.ride_id
      LEFT JOIN daily_shift_settlements dss ON (dss.rider_id = r.rider_id AND dss.date = DATE(r.completed_at))
      WHERE r.rider_id = ?
        AND r.status = 'COMPLETED'
        AND DATE(r.completed_at) < ?
        AND (re.settlement_status != 'SETTLED' OR re.settlement_status IS NULL)
        AND (dss.status != 'SETTLED' OR dss.status IS NULL)
      GROUP BY DATE(r.completed_at), dss.status, dss.rejection_reason
      ORDER BY DATE(r.completed_at) ASC
      LIMIT 1
    `;
    const row = await db.queryOne(sql, [riderId, today]).catch(() => null);
    if (row && parseFloat(row.total_due || 0) > 0) {
      return {
        isLocked: true,
        pastDate: String(row.shift_date).slice(0, 10),
        tripsCount: row.trips_count,
        unpaidAmount: parseFloat(row.total_due || 0),
        status: row.shift_status || 'UNSETTLED',
        rejectionReason: row.rejection_reason || null
      };
    }
    return { isLocked: false, unpaidAmount: 0 };
  },

  async getRiderShiftSettlement(riderId, date = null) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const [settings, dailyData, shiftRecord, lockCheck] = await Promise.all([
      this.getAdminSettlementSettings(),
      this.getDailySettlements({ date: targetDate, riderId }),
      db.queryOne('SELECT * FROM daily_shift_settlements WHERE rider_id = ? AND date = ?', [riderId, targetDate]).catch(() => null),
      this.isRiderShiftLocked(riderId)
    ]);

    const riderData = (dailyData.riders && dailyData.riders[0]) || {
      totalTrips: 0,
      grossFare: 0,
      companyDue: 0,
      controllerDue: 0,
      totalDeductionDue: 0,
      riderNetEarnings: 0,
      settlementStatus: 'UNSETTLED',
      rides: []
    };

    const effectiveStatus = shiftRecord?.status || riderData.settlementStatus || 'UNSETTLED';

    const upiPayUrl = `upi://pay?pa=${encodeURIComponent(settings.adminUpiId)}&pn=${encodeURIComponent(settings.adminName)}&am=${riderData.totalDeductionDue.toFixed(2)}&tn=Papido_Shift_Settlement_${targetDate}&cu=INR`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(upiPayUrl)}`;

    return {
      date: targetDate,
      totalTrips: riderData.totalTrips,
      grossFare: riderData.grossFare,
      riderNetEarnings: riderData.riderNetEarnings,
      companyDue: riderData.companyDue,
      controllerDue: riderData.controllerDue,
      totalCommissionDue: riderData.totalDeductionDue,
      status: effectiveStatus,
      utrReference: shiftRecord?.utr_reference || null,
      rejectionReason: shiftRecord?.rejection_reason || null,
      submittedAt: shiftRecord?.submitted_at || null,
      approvedAt: shiftRecord?.approved_at || null,
      adminUpi: {
        upiId: settings.adminUpiId,
        receiverName: settings.adminName,
        upiPayUrl,
        qrCodeUrl
      },
      isLocked: lockCheck.isLocked,
      lockDetails: lockCheck
    };
  },

  async submitRiderShiftSettlement({ riderId, date, utrReference }) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const dailyData = await this.getDailySettlements({ date: targetDate, riderId });
    const riderData = (dailyData.riders && dailyData.riders[0]) || {
      totalTrips: 0,
      grossFare: 0,
      companyDue: 0,
      controllerDue: 0,
      totalDeductionDue: 0,
      riderNetEarnings: 0
    };

    await db.query(`
      INSERT INTO daily_shift_settlements (
        rider_id, date, total_trips, gross_fare, company_due, controller_due,
        total_commission_due, rider_net_earnings, status, utr_reference, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        total_trips = VALUES(total_trips),
        gross_fare = VALUES(gross_fare),
        company_due = VALUES(company_due),
        controller_due = VALUES(controller_due),
        total_commission_due = VALUES(total_commission_due),
        rider_net_earnings = VALUES(rider_net_earnings),
        status = 'PENDING_APPROVAL',
        utr_reference = VALUES(utr_reference),
        rejection_reason = NULL,
        submitted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `, [
      riderId,
      targetDate,
      riderData.totalTrips,
      riderData.grossFare,
      riderData.companyDue,
      riderData.controllerDue,
      riderData.totalDeductionDue,
      riderData.riderNetEarnings,
      utrReference.trim()
    ]);

    return this.getRiderShiftSettlement(riderId, targetDate);
  },

  async approveRiderShiftSettlement({ riderId, date, approvedBy }) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    
    // Update daily_shift_settlements
    await db.query(`
      UPDATE daily_shift_settlements
      SET status = 'SETTLED', approved_at = CURRENT_TIMESTAMP, approved_by = ?, rejection_reason = NULL
      WHERE rider_id = ? AND date = ?
    `, [approvedBy || null, riderId, targetDate]);

    // Update rider_earnings
    await db.query(`
      UPDATE rider_earnings
      SET settlement_status = 'SETTLED', settled_at = CURRENT_TIMESTAMP
      WHERE rider_id = ? AND (DATE(created_at) = ? OR DATE(created_at) = DATE(?))
    `, [riderId, targetDate, targetDate]);

    return this.getDailySettlements({ date: targetDate, riderId });
  },

  async rejectRiderShiftSettlement({ riderId, date, reason, rejectedBy }) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    
    await db.query(`
      UPDATE daily_shift_settlements
      SET status = 'REJECTED', rejection_reason = ?, approved_at = NULL, approved_by = ?
      WHERE rider_id = ? AND date = ?
    `, [reason || 'Payment verification failed', rejectedBy || null, riderId, targetDate]);

    await db.query(`
      UPDATE rider_earnings
      SET settlement_status = 'UNSETTLED', settled_at = NULL
      WHERE rider_id = ? AND (DATE(created_at) = ? OR DATE(created_at) = DATE(?))
    `, [riderId, targetDate, targetDate]);

    return this.getDailySettlements({ date: targetDate, riderId });
  },

  async updateDailySettlementStatus({ riderId, date, status, approvedBy = null, reason = null }) {
    if (status === 'SETTLED') {
      return this.approveRiderShiftSettlement({ riderId, date, approvedBy });
    } else if (status === 'REJECTED') {
      return this.rejectRiderShiftSettlement({ riderId, date, reason, rejectedBy: approvedBy });
    } else {
      const targetDate = date || new Date().toISOString().slice(0, 10);
      await db.query(
        `UPDATE rider_earnings 
         SET settlement_status = 'UNSETTLED', settled_at = NULL 
         WHERE rider_id = ? AND (DATE(created_at) = ? OR DATE(created_at) = DATE(?))`,
        [riderId, targetDate, targetDate]
      );
      await db.query(
        `UPDATE daily_shift_settlements 
         SET status = 'UNSETTLED', approved_at = NULL, approved_by = NULL 
         WHERE rider_id = ? AND date = ?`,
        [riderId, targetDate]
      );
      return this.getDailySettlements({ date: targetDate, riderId });
    }
  },

  async saveDailyDutyController({ date, coreMemberId, payoutStatus = 'PENDING', notes = null, assignedBy = null }) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    
    await db.query(`
      INSERT INTO daily_duty_controllers (date, core_member_id, payout_status, notes, assigned_by)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        core_member_id = VALUES(core_member_id),
        payout_status = VALUES(payout_status),
        notes = VALUES(notes),
        assigned_by = VALUES(assigned_by),
        updated_at = CURRENT_TIMESTAMP
    `, [targetDate, coreMemberId, payoutStatus, notes, assignedBy]);

    return this.getDailySettlements({ date: targetDate });
  }
};

module.exports = EarningModel;

