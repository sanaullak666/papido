const https = require('https');
const { calculateDistance, calculateDuration, generateRoutePolyline } = require('../utils/geo');
const env = require('../config/environment');

function fetchHttpsJson(url, timeoutMs = 3500) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'PapidoCampusMobility/2.0 (dispatch@papido.app)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (_) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(null);
    });
  });
}

const MapService = {
  /**
   * Calculates distance and duration between coordinates
   */
  async getDistanceAndDuration(origin, destination, vehicleType = 'BIKE') {
    const distanceKm = calculateDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );
    const durationMinutes = calculateDuration(distanceKm, vehicleType);
    const polyline = generateRoutePolyline(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
      12
    );

    return {
      provider: env.MAP.PROVIDER,
      distanceKm,
      durationMinutes,
      waypoints: polyline
    };
  },

  /**
   * Comprehensive Address / Places Autocomplete using Live Geocoding & Campus Presets
   */
  async searchAddresses(query, userLat = 12.9716, userLng = 77.5946) {
    const campusPlaces = [
      { name: 'Gate 1 (Main Entrance)', address: 'Main Campus Entrance, University Outer Road', latitude: 12.971598, longitude: 77.594566 },
      { name: 'Gate 2 (Hostel Gate)', address: 'Hostel Block & Residential Entrance', latitude: 12.973500, longitude: 77.596500 },
      { name: 'Silver Jubilee Campus (SJC)', address: 'Silver Jubilee Academic Block & Law School', latitude: 12.975500, longitude: 77.599000 },
      { name: 'Central Food Court & Mess', address: 'Student Dining Hall & Canteen Area', latitude: 12.974500, longitude: 77.598000 },
      { name: 'Sports Complex & Ground', address: 'Athletic Track, Cricket Ground & Indoor Stadium', latitude: 12.977500, longitude: 77.601000 },
      { name: 'City Central Railway Station', address: 'Majestic Railway Station Terminal', latitude: 12.977800, longitude: 77.571300 },
      { name: 'Central Bus Terminus (KSRTC)', address: 'Kempegowda Bus Station Majestic', latitude: 12.978000, longitude: 77.572500 },
      { name: 'Metro Station Junction', address: 'MG Road Junction Metro Station', latitude: 12.975600, longitude: 77.606700 },
      { name: 'City General Hospital', address: 'Hospital Cross Road, Cantonment Area', latitude: 12.986000, longitude: 77.599000 },
      { name: 'Forum Mall & Multiplex', address: 'Hosur Main Road, Koramangala', latitude: 12.934500, longitude: 77.611000 },
      { name: 'Tech Park SEZ & IT Hub', address: 'Outer Ring Road, Bellandur', latitude: 12.926000, longitude: 77.676200 },
      { name: 'Airport Express Stop', address: 'NH 44 Airport Highway Junction', latitude: 13.035000, longitude: 77.597000 }
    ];

    if (!query || query.trim().length === 0) return campusPlaces;

    const q = query.trim().toLowerCase();
    const matchedCampus = campusPlaces.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.address.toLowerCase().includes(q)
    );

    // 1. Query Live Online Geocoding (Photon OSM index) for real-world places
    const encoded = encodeURIComponent(query.trim());
    const photonUrl = `https://photon.komoot.io/api/?q=${encoded}&limit=8&lat=${userLat}&lon=${userLng}`;
    let photonRes = await fetchHttpsJson(photonUrl, 2500);

    const livePlaces = [];
    if (photonRes && Array.isArray(photonRes.features) && photonRes.features.length > 0) {
      for (const f of photonRes.features) {
        const p = f.properties || {};
        const coords = f.geometry && Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates : null;
        if (!coords || coords.length < 2) continue;

        const name = p.name || p.street || p.district || p.city || query.trim();
        const parts = [p.street, p.district, p.city, p.state].filter(Boolean);
        const address = parts.length > 0 ? parts.join(', ') : `${name}, India`;

        livePlaces.push({
          name,
          address,
          latitude: parseFloat(coords[1]),
          longitude: parseFloat(coords[0])
        });
      }
    }

    // 2. Fallback to Nominatim if Photon returned no items
    if (livePlaces.length === 0 && matchedCampus.length === 0) {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&addressdetails=1&limit=6&countrycodes=in`;
      const nomRes = await fetchHttpsJson(nominatimUrl, 2500);
      if (Array.isArray(nomRes) && nomRes.length > 0) {
        for (const item of nomRes) {
          livePlaces.push({
            name: item.name || item.display_name.split(',')[0],
            address: item.display_name,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon)
          });
        }
      }
    }

    // Merge campus matches with live places, eliminating duplicates
    const combined = [...matchedCampus];
    const seenNames = new Set(matchedCampus.map(c => c.name.toLowerCase()));

    for (const lp of livePlaces) {
      const key = (lp.name + lp.address).toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        combined.push(lp);
      }
    }

    if (combined.length > 0) {
      return combined.slice(0, 10);
    }

    return [
      {
        name: query.trim(),
        address: `${query.trim()} (Custom Address)`,
        latitude: userLat,
        longitude: userLng
      }
    ];
  },

  /**
   * Reverse Geocoding: Turn GPS coordinates into human-readable place & address
   */
  async reverseGeocode(lat, lng) {
    if (!lat || !lng) return { name: 'Campus Gate 1', address: 'Main Entrance' };

    // 1. Try Nominatim first for high-accuracy Indian street names
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const nomRes = await fetchHttpsJson(nominatimUrl, 2500);

    if (nomRes && nomRes.display_name) {
      const addr = nomRes.address || {};
      const primaryName = addr.road || addr.suburb || addr.neighbourhood || addr.amenity || addr.building || nomRes.display_name.split(',')[0];
      return {
        name: primaryName || 'Selected Location',
        address: nomRes.display_name,
        latitude: lat,
        longitude: lng
      };
    }

    // 2. Fallback to Photon Reverse
    const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
    const photonRes = await fetchHttpsJson(photonUrl, 2500);

    if (photonRes && Array.isArray(photonRes.features) && photonRes.features.length > 0) {
      const p = photonRes.features[0].properties || {};
      const name = p.name || p.street || p.locality || p.district || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      const parts = [p.street, p.locality, p.district, p.city].filter(Boolean);
      const address = parts.length > 0 ? parts.join(', ') : `${name}`;

      return { name, address, latitude: lat, longitude: lng };
    }

    return {
      name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      address: `Spot near ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      latitude: lat,
      longitude: lng
    };
  }
};

module.exports = MapService;
