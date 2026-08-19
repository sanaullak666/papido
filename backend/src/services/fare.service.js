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
      // 2. Fallback to standard base + distance fare configuration if not an exact preset route
      const config = await FareModel.getFareConfiguration(vehicleType);
      const baseFare = config ? parseFloat(config.base_fare) : 25.0;
      const baseDistance = config ? parseFloat(config.base_distance_km) : 1.5;
      const perKmFare = config ? parseFloat(config.per_km_fare) : 8.5;
      const perMinuteFare = config ? parseFloat(config.per_minute_fare) : 0.75;
      const minimumFare = config ? parseFloat(config.minimum_fare) : 25.0;

      const extraDistance = Math.max(0, distanceKm - baseDistance);
      const distanceCharge = extraDistance * perKmFare;
      const timeCharge = durationMinutes * perMinuteFare;

      const rawFare = baseFare + distanceCharge + timeCharge;
      const finalEstimatedFare = Math.max(minimumFare, Math.round(rawFare));

      baseResult = {
        distanceKm,
        durationMinutes,
        vehicleType,
        baseFare,
        distanceCharge: Number(distanceCharge.toFixed(2)),
        timeCharge: Number(timeCharge.toFixed(2)),
        estimatedFare: finalEstimatedFare,
        minimumFare,
        isRouteBased: false
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
   * Calculates dynamic fare split between platform company, controller, and rider based on company policy:
   * - Below ₹80: Company takes ₹4 flat per ride. Controller takes ₹0. Rider gets remainder.
   * - ₹80 or above: Company takes 10% of fare. Controller takes ₹2 flat. Rider gets remainder.
   */
  async calculateFareSplit(finalFare) {
    const fare = parseFloat(finalFare) || 0;
    let companyEarning = 0.00;
    let controllerEarning = 0.00;
    let riderEarning = 0.00;
    let description = '';

    if (fare < 80.00) {
      // Below ₹80: Flat ₹4 to Company, ₹0 to Controller
      companyEarning = Math.min(fare, 4.00);
      controllerEarning = 0.00;
      riderEarning = Number(Math.max(0, fare - companyEarning).toFixed(2));
      description = `Standard Policy (Fare < ₹80): Company ₹4.00, Controller ₹0.00, Rider ₹${riderEarning.toFixed(2)}`;
    } else {
      // ₹80 or above: 10% to Company, ₹2 to Controller
      companyEarning = Number((fare * 0.10).toFixed(2));
      controllerEarning = 2.00;
      riderEarning = Number(Math.max(0, fare - companyEarning - controllerEarning).toFixed(2));
      description = `Outside / Long Trip Policy (Fare ≥ ₹80): Company 10% (₹${companyEarning.toFixed(2)}), Controller ₹2.00, Rider ₹${riderEarning.toFixed(2)}`;
    }

    return {
      totalFare: fare,
      riderEarning,
      companyEarning,
      controllerEarning,
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
