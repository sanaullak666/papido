/**
 * Free OSRM Road-Routing Provider with Route Deviation Detection
 * Calculates actual drivable road geometry (inside & outside campus)
 * Zero paid APIs used.
 */

const routeCache = new Map();
let lastRecalculateTimestamp = 0;
const RECALCULATE_THROTTLE_MS = 12000; // Do not recalculate more than once per 12 seconds
const DEVIATION_THRESHOLD_METERS = 120; // 120m off-route triggers recalculation

/**
 * Calculates distance between two points in meters
 */
export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Minimum distance from point P to line segment AB (in meters)
 */
function distanceToSegment(pLat, pLng, aLat, aLng, bLat, bLng) {
  const l2 = Math.pow(bLat - aLat, 2) + Math.pow(bLng - aLng, 2);
  if (l2 === 0) return getDistanceMeters(pLat, pLng, aLat, aLng);

  let t = ((pLat - aLat) * (bLat - aLat) + (pLng - aLng) * (bLng - aLng)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  return getDistanceMeters(pLat, pLng, projLat, projLng);
}

/**
 * Checks if a point has deviated significantly from the polyline
 * polyline coordinates are [lng, lat] (GeoJSON format)
 */
export function checkRouteDeviation(currentPoint, polylineCoordinates) {
  if (!currentPoint || !Array.isArray(polylineCoordinates) || polylineCoordinates.length < 2) {
    return { isDeviated: false, minDistanceMeters: 0 };
  }

  const pLat = parseFloat(currentPoint.latitude || currentPoint.lat);
  const pLng = parseFloat(currentPoint.longitude || currentPoint.lng);
  if (isNaN(pLat) || isNaN(pLng)) return { isDeviated: false, minDistanceMeters: 0 };

  let minDistance = Infinity;

  for (let i = 0; i < polylineCoordinates.length - 1; i++) {
    const a = polylineCoordinates[i];     // [lng, lat]
    const b = polylineCoordinates[i + 1]; // [lng, lat]
    const dist = distanceToSegment(pLat, pLng, a[1], a[0], b[1], b[0]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  const isDeviated = minDistance > DEVIATION_THRESHOLD_METERS;
  return { isDeviated, minDistanceMeters: Math.round(minDistance) };
}

/**
 * Generate fallback road-approximate waypoints
 * Returns array of [lng, lat] coordinates (MapLibre GeoJSON format)
 */
export function generateFallbackRoute(origin, destination, count = 16) {
  const oLat = parseFloat(origin.latitude || origin.lat);
  const oLng = parseFloat(origin.longitude || origin.lng);
  const dLat = parseFloat(destination.latitude || destination.lat);
  const dLng = parseFloat(destination.longitude || destination.lng);

  const coords = [];
  for (let i = 0; i <= count; i++) {
    const frac = i / count;
    const curve = Math.sin(frac * Math.PI) * 0.0015;
    const lat = Number((oLat + (dLat - oLat) * frac + curve).toFixed(6));
    const lng = Number((oLng + (dLng - oLng) * frac + curve * 0.4).toFixed(6));
    coords.push([lng, lat]); // [lng, lat] for MapLibre
  }

  const distKm = Number((getDistanceMeters(oLat, oLng, dLat, dLng) / 1000).toFixed(2));
  const durationMins = Math.max(2, Math.round((distKm / 25) * 60) + 1);

  return {
    coordinates: coords,
    distanceKm: distKm,
    durationMinutes: durationMins,
    provider: 'Papido Geo Fallback'
  };
}

/**
 * Fetch road route via OSRM
 * origin & destination can be { latitude, longitude } or { lat, lng }
 * Returns: { coordinates: [[lng, lat], ...], distanceKm, durationMinutes, provider }
 */
export async function getRoadRoute(origin, destination, options = {}) {
  const { forceRefresh = false, timeoutMs = 4500 } = options;

  const oLat = parseFloat(origin.latitude || origin.lat);
  const oLng = parseFloat(origin.longitude || origin.lng);
  const dLat = parseFloat(destination.latitude || destination.lat);
  const dLng = parseFloat(destination.longitude || destination.lng);

  if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
    throw new Error('Invalid coordinates supplied to getRoadRoute');
  }

  const cacheKey = `${oLat.toFixed(4)},${oLng.toFixed(4)}->${dLat.toFixed(4)},${dLng.toFixed(4)}`;

  if (!forceRefresh && routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  // 1. Query Project-OSRM public driving router
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;
    const response = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (response.ok) {
      const data = await response.json();
      if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        const route = data.routes[0];
        const distKm = Number((route.distance / 1000).toFixed(2));
        const durationMins = Math.max(2, Math.round(route.duration / 60));

        // OSRM coordinates are already [longitude, latitude]
        const coordinates = route.geometry?.coordinates || [[oLng, oLat], [dLng, dLat]];

        const result = {
          coordinates: coordinates.length > 1 ? coordinates : [[oLng, oLat], [dLng, dLat]],
          distanceKm: Math.max(0.1, distKm),
          durationMinutes: durationMins,
          provider: 'OpenStreetMap OSRM'
        };

        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    // Graceful fallback when OSRM is busy or rate-limited
  }

  // 2. High-fidelity fallback
  const fallback = generateFallbackRoute(origin, destination);
  routeCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Throttled recalculation if driver has moved off route
 */
export async function recalculateIfDeviated(driverPoint, destinationPoint, currentPolyline) {
  const now = Date.now();
  if (now - lastRecalculateTimestamp < RECALCULATE_THROTTLE_MS) {
    return null; // Throttled
  }

  const { isDeviated, minDistanceMeters } = checkRouteDeviation(driverPoint, currentPolyline);
  if (!isDeviated) return null;

  lastRecalculateTimestamp = now;
  console.log(`[RoutingProvider] Driver deviated by ${minDistanceMeters}m from route. Recalculating...`);
  return await getRoadRoute(driverPoint, destinationPoint, { forceRefresh: true });
}

export default {
  getRoadRoute,
  getDistanceMeters,
  checkRouteDeviation,
  recalculateIfDeviated,
  generateFallbackRoute
};
