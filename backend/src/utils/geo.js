/**
 * Geospatial Utility Functions
 */

/**
 * Calculates great-circle distance between two points on the earth (in kilometers)
 * using the Haversine formula.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  // Return distance rounded to 2 decimal places (minimum 0.1 km)
  return Math.max(0.1, Number(distance.toFixed(2)));
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Estimates driving duration in minutes given distance in km and vehicle type
 */
function calculateDuration(distanceKm, vehicleType = 'BIKE') {
  // Average urban speeds (km/h) accounting for city traffic & campus environments
  const speeds = {
    BIKE: 28,
    AUTO: 22,
    CAB_MINI: 24,
    CAB_SEDAN: 24
  };

  const avgSpeed = speeds[vehicleType] || 25;
  const durationHours = distanceKm / avgSpeed;
  const durationMinutes = Math.round(durationHours * 60);

  // Add 2 minutes base traffic / turnaround buffer
  return Math.max(3, durationMinutes + 2);
}

/**
 * Generates an array of interpolated waypoints between two coordinates
 * Useful for smooth driver movement simulation on maps
 */
function generateRoutePolyline(startLat, startLon, endLat, endLon, pointsCount = 10) {
  const points = [];
  for (let i = 0; i <= pointsCount; i++) {
    const fraction = i / pointsCount;
    // Add a slight natural curve to avoid robotic straight lines
    const curveOffset = Math.sin(fraction * Math.PI) * 0.0012;
    const lat = Number((startLat + (endLat - startLat) * fraction + curveOffset).toFixed(6));
    const lon = Number((startLon + (endLon - startLon) * fraction + curveOffset * 0.5).toFixed(6));
    points.push({ latitude: lat, longitude: lon });
  }
  return points;
}

module.exports = {
  calculateDistance,
  calculateDuration,
  generateRoutePolyline
};
