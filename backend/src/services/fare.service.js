const FareModel = require('../models/fare.model');
const { calculateDistance, calculateDuration } = require('../utils/geo');

const FareService = {
  /**
   * Calculates estimated fare based on route configuration or distance/duration fallback.
   */
  async calculateEstimatedFare(distanceKm, durationMinutes, vehicleType = 'BIKE', pickupAddress = null, destinationAddress = null, isDoubleRide = false) {
    let baseResult = null;

    // 1. Check if an Admin-defined Fixed Route exists for this Pickup -> Destination
    if (pickupAddress && destinationAddress) {
      const routeFare = await FareModel.findRouteFare(pickupAddress, destinationAddress);
      if (routeFare) {
        const fare = parseFloat(routeFare.fare_amount);
        baseResult = {
          distanceKm: parseFloat(routeFare.distance_km || distanceKm),
          durationMinutes,
          vehicleType,
          baseFare: fare,
          distanceCharge: 0.00,
          timeCharge: 0.00,
          estimatedFare: fare,
          minimumFare: fare,
          isRouteBased: true,
          routeName: `${routeFare.pickup_stop} ➔ ${routeFare.destination_stop}`
        };
      }
    }

    if (!baseResult) {
      // 2. Standard Flat Campus Fare Fallback (for any intra-campus ride where no custom route is set)
      const config = await FareModel.getFareConfiguration(vehicleType === 'ANY' ? 'BIKE' : vehicleType) 
                   || await FareModel.getFareConfiguration('BIKE');
      const baseFare = config 
        ? (parseFloat(config.base_fare) || parseFloat(config.minimum_fare) || 25.0) 
        : 25.0;

      baseResult = {
        distanceKm,
        durationMinutes,
        vehicleType,
        baseFare,
        distanceCharge: 0.00,
        timeCharge: 0.00,
        estimatedFare: baseFare,
        minimumFare: baseFare,
        isRouteBased: false,
        routeName: null
      };
    }

    // Outside Campus Policy: Double rides are strictly forbidden for outside-campus trips
    let isOutside = false;

    if (baseResult.isRouteBased) {
      // Admin preset routes in database are inside campus by definition
      isOutside = false;
    } else {
      const pLower = (pickupAddress || '').toLowerCase();
      const dLower = (destinationAddress || '').toLowerCase();
      
      const isExplicitOutside = pLower.includes('outside') || dLower.includes('outside') ||
                                pLower.includes('other') || dLower.includes('other') ||
                                pLower.includes('station') || dLower.includes('station') ||
                                pLower.includes('mall') || dLower.includes('mall') ||
                                pLower.includes('hospital') || dLower.includes('hospital') ||
                                pLower.includes('metro') || dLower.includes('metro');

      if (isExplicitOutside || distanceKm > 6.0) {
        isOutside = true;
      }
    }

    if (isOutside) {
      isDoubleRide = false;
    }

    // Apply Double Ride Policy: (Single Fare * 2) - 10 (Within campus only)
    const singleFare = baseResult.estimatedFare;
    if (isDoubleRide) {
      const doubleFare = Math.max(singleFare, (singleFare * 2) - 10);
      return {
        ...baseResult,
        singleFare,
        estimatedFare: doubleFare,
        isDoubleRide: true,
        doubleDiscount: 10
      };
    }

    return {
      ...baseResult,
      singleFare,
      isDoubleRide: false,
      doubleDiscount: 0
    };
  },

  /**
   * Calculates dynamic fare split between platform company, controller, and rider based on Papido deduction policy:
   * - Tier 1: Fare <= 25 => Company = ₹2, Rider = ₹(Fare - 2)
   * - Tier 2: Fare 25.01 - 35 => Company = ₹3, Rider = ₹(Fare - 3)
   * - Tier 3: Fare 35.01 - 60 => Company = ₹4, Rider = ₹(Fare - 4)
   * - Tier 4: Fare > 60 => Company = 20%, Rider = 80%
   */
  async calculateFareSplit(finalFare) {
    const fare = parseFloat(finalFare) || 0;
    let companyEarning = 0.00;
    let controllerEarning = 0.00;
    let riderEarning = 0.00;
    let description = '';

    // Fetch dynamic rules from FareModel if available
    let rules = [];
    try {
      rules = await FareModel.getAllSplitRules();
      if (Array.isArray(rules)) {
        rules = rules.filter(r => r.is_active);
      }
    } catch (_) {}

    if (rules && rules.length > 0) {
      const matched = rules.find(r => {
        const min = parseFloat(r.min_fare) || 0;
        const max = r.max_fare !== null && r.max_fare !== undefined ? parseFloat(r.max_fare) : Infinity;
        return fare >= min && fare <= max;
      });

      if (matched) {
        controllerEarning = parseFloat(matched.rider_controller_cut_fixed) || 0;
        if (matched.rule_type === 'PERCENTAGE') {
          const companyPct = parseFloat(matched.company_cut_percentage) || 0;
          companyEarning = Number(((fare * companyPct) / 100).toFixed(2));
          riderEarning = Number(Math.max(0, fare - companyEarning).toFixed(2));
          description = matched.description || `Tier Split: Company ${companyPct}%, Rider remainder`;
        } else {
          companyEarning = parseFloat(matched.company_cut_fixed) || 0;
          riderEarning = Number(Math.max(0, fare - companyEarning).toFixed(2));
          description = matched.description || `Tier Split: Company ₹${companyEarning}, Rider remainder`;
        }
      }
    }

    if (!description) {
      if (fare <= 25.00) {
        companyEarning = 2.00;
        controllerEarning = 2.00;
        riderEarning = Number(Math.max(0, fare - companyEarning).toFixed(2));
        description = 'Tier 1: Fare up to ₹25 (Company ₹2)';
      } else if (fare <= 35.00) {
        companyEarning = 3.00;
        controllerEarning = 3.00;
        riderEarning = Number(Math.max(0, fare - companyEarning).toFixed(2));
        description = 'Tier 2: Fare ₹25–₹35 (Company ₹3)';
      } else if (fare <= 60.00) {
        companyEarning = 4.00;
        controllerEarning = 4.00;
        riderEarning = Number(Math.max(0, fare - companyEarning).toFixed(2));
        description = 'Tier 3: Fare ₹35–₹60 (Company ₹4)';
      } else {
        companyEarning = Number((fare * 0.20).toFixed(2));
        controllerEarning = 4.00;
        riderEarning = Number(Math.max(0, fare - companyEarning).toFixed(2));
        description = 'Tier 4: Fare > ₹60 (Company 20%, Rider 80%)';
      }
    }

    return {
      totalFare: fare,
      riderEarning,
      companyEarning,
      controllerEarning,
      totalDeduction: Number((companyEarning + controllerEarning).toFixed(2)),
      appliedRuleDescription: description
    };
  },

  /**
   * Helper for route estimation between pickup and drop coords & stops
   */
  async getRideEstimates(pickupLat, pickupLng, destLat, destLng, vehicleType = 'BIKE', pickupAddress = null, destinationAddress = null, isDoubleRide = false) {
    const distanceKm = calculateDistance(pickupLat, pickupLng, destLat, destLng);
    const durationMinutes = calculateDuration(distanceKm, vehicleType);
    return this.calculateEstimatedFare(distanceKm, durationMinutes, vehicleType, pickupAddress, destinationAddress, isDoubleRide);
  }
};

module.exports = FareService;
