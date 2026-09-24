/**
 * Reusable Map Service Abstraction for Papido (Frontend)
 * Pure Free OpenStreetMap & OSRM based geolocation and routing service.
 * No Google Maps API or paid services required.
 */

import {
  PAPIDO_SERVICE_AREAS,
  TILE_CONFIG,
  isInsideServiceArea,
  classifyLocationArea,
  validateRideServiceAreas
} from '../config/serviceAreas';
import { apiRequest } from '../api';

const routeCache = new Map();
const geocodeCache = new Map();

/**
 * Calculates Haversine distance in kilometers
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0.1, Number((R * c).toFixed(2)));
}

/**
 * Generates an interpolated polyline between two coordinates
 */
export function generateCurvedFallbackWaypoints(startLat, startLon, endLat, endLon, pointsCount = 12) {
  const points = [];
  for (let i = 0; i <= pointsCount; i++) {
    const fraction = i / pointsCount;
    const curveOffset = Math.sin(fraction * Math.PI) * 0.0012;
    const lat = Number((startLat + (endLat - startLat) * fraction + curveOffset).toFixed(6));
    const lon = Number((startLon + (endLon - startLon) * fraction + curveOffset * 0.5).toFixed(6));
    points.push([lat, lon]);
  }
  return points;
}

export const mapService = {
  getTileConfig() {
    return TILE_CONFIG;
  },

  getServiceAreas() {
    return PAPIDO_SERVICE_AREAS;
  },

  isInsideServiceArea(lat, lng, areaKey) {
    return isInsideServiceArea(lat, lng, areaKey);
  },

  classifyLocationArea(lat, lng) {
    return classifyLocationArea(lat, lng);
  },

  validateRideServiceAreas(pickup, destination) {
    return validateRideServiceAreas(pickup, destination);
  },

  /**
   * Search places using campus presets, city landmarks, and live backend geocoding
   */
  async searchPlaces(query, area = 'PONDICHERRY_UNIVERSITY') {
    const q = (query || '').trim().toLowerCase();
    const campusLandmarks = PAPIDO_SERVICE_AREAS.PONDICHERRY_UNIVERSITY.landmarks || [];
    const cityLandmarks = PAPIDO_SERVICE_AREAS.PONDICHERRY_CITY.landmarks || [];

    if (!q) {
      if (area === 'PONDICHERRY_UNIVERSITY') return campusLandmarks;
      if (area === 'PONDICHERRY_CITY') return cityLandmarks;
      return [...campusLandmarks, ...cityLandmarks];
    }

    // 1. Check local landmark matches
    const allPresets = [...campusLandmarks, ...cityLandmarks];
    const matchedPresets = allPresets.filter(
      p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
    );

    // 2. Query backend geocoding endpoint for live places
    let remotePlaces = [];
    try {
      const center = PAPIDO_SERVICE_AREAS[area]?.center || PAPIDO_SERVICE_AREAS.PONDICHERRY_UNIVERSITY.center;
      const res = await apiRequest(`/fares/places?query=${encodeURIComponent(query)}&lat=${center.latitude}&lng=${center.longitude}`, 'GET');
      if (res && res.data && Array.isArray(res.data)) {
        remotePlaces = res.data.map(p => ({
          id: `osm-${p.latitude}-${p.longitude}`,
          name: p.name,
          address: p.address || p.name,
          latitude: parseFloat(p.latitude),
          longitude: parseFloat(p.longitude),
          category: 'SEARCH_RESULT'
        }));
      }
    } catch (_) {
      // Offline / network failure fallback: continue with matched presets
    }

    // Deduplicate
    const combined = [...matchedPresets];
    const seenNames = new Set(matchedPresets.map(p => p.name.toLowerCase()));
    for (const rp of remotePlaces) {
      if (!seenNames.has(rp.name.toLowerCase())) {
        seenNames.add(rp.name.toLowerCase());
        combined.push(rp);
      }
    }

    return combined.slice(0, 10);
  },

  /**
   * Reverse geocode GPS coordinates to human-readable place name
   */
  async reverseGeocode(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) return { name: 'Unknown Spot', address: 'Invalid coordinates' };

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey);
    }

    // Check if close to a known campus stop (within 80 meters)
    for (const lm of PAPIDO_SERVICE_AREAS.PONDICHERRY_UNIVERSITY.landmarks) {
      const dist = calculateHaversineDistance(lat, lng, lm.latitude, lm.longitude);
      if (dist <= 0.08) {
        const result = { name: lm.name, address: lm.description || `${lm.name}, Pondicherry University`, latitude: lat, longitude: lng };
        geocodeCache.set(cacheKey, result);
        return result;
      }
    }

    try {
      const res = await apiRequest(`/fares/reverse?lat=${lat}&lng=${lng}`, 'GET');
      if (res && res.data) {
        const result = {
          name: res.data.name || `Spot (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          address: res.data.address || res.data.name,
          latitude: lat,
          longitude: lng
        };
        geocodeCache.set(cacheKey, result);
        return result;
      }
    } catch (_) {}

    const fallback = {
      name: `Spot (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      address: `Pondicherry (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      latitude: lat,
      longitude: lng
    };
    geocodeCache.set(cacheKey, fallback);
    return fallback;
  },

  /**
   * Calculate Road Route between origin and destination using free OSRM with fallback
   * Returns: { distanceKm, durationMinutes, geometry: [[lat, lng], ...], provider }
   */
  async getRoute(origin, destination, options = {}) {
    const { vehicleType = 'BIKE', timeoutMs = 4000 } = options;
    const oLat = parseFloat(origin.latitude || origin.lat);
    const oLng = parseFloat(origin.longitude || origin.lng);
    const dLat = parseFloat(destination.latitude || destination.lat);
    const dLng = parseFloat(destination.longitude || destination.lng);

    if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
      throw new Error('Invalid origin or destination coordinates');
    }

    const straightDist = calculateHaversineDistance(oLat, oLng, dLat, dLng);
    const cacheKey = `${oLat.toFixed(4)},${oLng.toFixed(4)}->${dLat.toFixed(4)},${dLng.toFixed(4)}`;

    if (routeCache.has(cacheKey)) {
      return routeCache.get(cacheKey);
    }

    // 1. Attempt free Project-OSRM public driving route
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
          const durationMins = Math.max(3, Math.round(route.duration / 60) + 1);
          // OSRM coordinates are [lng, lat], convert to Leaflet [lat, lng]
          const geometry = (route.geometry?.coordinates || []).map(coord => [coord[1], coord[0]]);

          const routeResult = {
            distanceKm: Math.max(0.2, distKm),
            durationMinutes: durationMins,
            geometry: geometry.length > 1 ? geometry : [[oLat, oLng], [dLat, dLng]],
            provider: 'OpenStreetMap OSRM'
          };
          routeCache.set(cacheKey, routeResult);
          return routeResult;
        }
      }
    } catch (_) {
      // OSRM unavailable or timed out: fall back gracefully
    }

    // 2. High quality realistic fallback using curved waypoints and vehicle speed
    const avgSpeed = vehicleType === 'BIKE' ? 28 : vehicleType === 'AUTO' ? 22 : 25;
    const estDuration = Math.max(3, Math.round((straightDist / avgSpeed) * 60) + 2);
    const waypoints = generateCurvedFallbackWaypoints(oLat, oLng, dLat, dLng, 14);

    const fallbackResult = {
      distanceKm: straightDist,
      durationMinutes: estDuration,
      geometry: waypoints,
      provider: 'Papido Geo Interpolation'
    };
    routeCache.set(cacheKey, fallbackResult);
    return fallbackResult;
  },

  getDistance(origin, destination) {
    const oLat = parseFloat(origin.latitude || origin.lat);
    const oLng = parseFloat(origin.longitude || origin.lng);
    const dLat = parseFloat(destination.latitude || destination.lat);
    const dLng = parseFloat(destination.longitude || destination.lng);
    return calculateHaversineDistance(oLat, oLng, dLat, dLng);
  },

  getNearbyCampusStops(latitude, longitude, maxStops = 5) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) return [];

    const landmarks = PAPIDO_SERVICE_AREAS.PONDICHERRY_UNIVERSITY.landmarks || [];
    return landmarks
      .map(lm => ({
        ...lm,
        distanceKm: calculateHaversineDistance(lat, lng, lm.latitude, lm.longitude)
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, maxStops);
  },

  /**
   * Computes live arrival estimate and geofence state between rider and pickup
   */
  getRiderPickupProximity(riderCoords, pickupCoords, geofenceMeters = 100) {
    if (!riderCoords || !pickupCoords) return null;
    const rLat = parseFloat(riderCoords.latitude || riderCoords.lat);
    const rLng = parseFloat(riderCoords.longitude || riderCoords.lng);
    const pLat = parseFloat(pickupCoords.latitude || pickupCoords.lat);
    const pLng = parseFloat(pickupCoords.longitude || pickupCoords.lng);

    if (isNaN(rLat) || isNaN(rLng) || isNaN(pLat) || isNaN(pLng)) return null;

    const distKm = calculateHaversineDistance(rLat, rLng, pLat, pLng);
    const distMeters = Math.round(distKm * 1000);
    const isInsideGeofence = distMeters <= geofenceMeters;
    const etaMinutes = Math.max(1, Math.round((distKm / 24) * 60));

    return {
      distanceKm: distKm,
      distanceMeters: distMeters,
      isInsideGeofence,
      etaMinutes
    };
  }
};

export default mapService;
