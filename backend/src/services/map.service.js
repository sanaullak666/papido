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
  async searchAddresses(query, userLat = 12.0240, userLng = 79.8530) {
    const campusPlaces = [
      { name: 'PU Main Gate (Gate 1)', address: 'Pondicherry University Main Entrance, Kalapet', latitude: 12.0228681, longitude: 79.8509415 },
      { name: 'Gate 2 (ECR Gate)', address: 'Pondicherry University East Coast Road Gate, Kalapet', latitude: 12.0295, longitude: 79.8580 },
      { name: 'Silver Jubilee Campus (SJC)', address: 'Silver Jubilee Academic Block, Pondicherry University', latitude: 12.0280, longitude: 79.8520 },
      { name: 'Central Food Court & Mess', address: 'Student Dining Hall, Pondicherry University', latitude: 12.0238, longitude: 79.8541 },
      { name: 'Central Library', address: 'Ananda Rangapillai Central Library, PU Campus', latitude: 12.0245, longitude: 79.8532 },
      { name: 'White Town / French Colony', address: 'White Town, Promenade, Puducherry', latitude: 11.9338, longitude: 79.8359 },
      { name: 'Rock Beach / Promenade Beach', address: 'Goubert Avenue, White Town, Puducherry', latitude: 11.9310, longitude: 79.8365 },
      { name: 'Pondicherry New Bus Stand', address: 'Maraimalai Adigal Salai, Orleanpet, Puducherry', latitude: 11.9350, longitude: 79.8150 },
      { name: 'Pondicherry Railway Station', address: 'Subbiah Salai, South Boulevard, Puducherry', latitude: 11.9280, longitude: 79.8290 },
      { name: 'JIPMER Hospital & Medical College', address: 'Dhanvantari Nagar, Gorimedu, Puducherry', latitude: 11.9560, longitude: 79.7990 },
      { name: 'Auroville Visitor Centre', address: 'Auroville Main Road, Kuilapalayam', latitude: 12.0070, longitude: 79.8110 },
      { name: 'Sri Aurobindo Ashram', address: 'Rue de la Marine, White Town, Puducherry', latitude: 11.9360, longitude: 79.8340 },
      { name: 'Puducherry Airport (Lawspet)', address: 'Airport Road, Lawspet, Puducherry', latitude: 11.9680, longitude: 79.8120 },
      { name: 'Providence Mall / INOX', address: 'Cuddalore Main Road, Orleanpet, Puducherry', latitude: 11.9300, longitude: 79.8190 },
      { name: 'Serenity Beach (Kottakuppam)', address: 'Kottakuppam, East Coast Road, Puducherry', latitude: 11.9670, longitude: 79.8420 },
      { name: 'Paradise Beach / Chunnambar', address: 'Chunnambar Boat House, Nonankuppam', latitude: 11.8840, longitude: 79.8050 },
      { name: 'Kalapet Toll Plaza (ECR)', address: 'East Coast Road, Kalapet, Puducherry', latitude: 12.0360, longitude: 79.8620 }
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
  },

  /**
   * Resolves raw Google Maps / Apple Maps / share links into clean place names & GPS coordinates
   */
  async resolveMapLink(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let url = rawUrl.trim();

    // 1. Direct comma-separated coordinates e.g. "11.9333, 79.8333"
    const directCoordsMatch = url.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
    if (directCoordsMatch) {
      const lat = parseFloat(directCoordsMatch[1]);
      const lng = parseFloat(directCoordsMatch[2]);
      const geocoded = await this.reverseGeocode(lat, lng);
      return {
        success: true,
        name: geocoded.name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        address: geocoded.address,
        latitude: lat,
        longitude: lng,
        originalUrl: rawUrl
      };
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('maps.app.goo.gl') || url.includes('google.com/maps') || url.includes('goo.gl/maps')) {
        url = `https://${url}`;
      } else {
        return null;
      }
    }

    let finalUrl = url;
    let htmlContent = '';

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      finalUrl = response.url || url;
      htmlContent = await response.text().catch(() => '');
    } catch (e) {
      console.warn('[MapService] Redirect resolution notice:', e.message);
    }

    let extractedLat = null;
    let extractedLng = null;
    let extractedName = null;

    // A. Check for coordinates in final URL
    const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      extractedLat = parseFloat(atMatch[1]);
      extractedLng = parseFloat(atMatch[2]);
    }

    if (!extractedLat) {
      const protoMatch = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (protoMatch) {
        extractedLat = parseFloat(protoMatch[1]);
        extractedLng = parseFloat(protoMatch[2]);
      }
    }

    if (!extractedLat) {
      const qCoordMatch = finalUrl.match(/[?&](?:q|query|ll|saddr|daddr|destination|center)=(-?\d+\.\d+)[,+](-?\d+\.\d+)/i);
      if (qCoordMatch) {
        extractedLat = parseFloat(qCoordMatch[1]);
        extractedLng = parseFloat(qCoordMatch[2]);
      }
    }

    // B. Check for place name in URL path
    const placeMatch = finalUrl.match(/\/place\/([^/@?]+)/i);
    if (placeMatch && placeMatch[1]) {
      try {
        const decoded = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
        if (decoded && !/^-?\d+\.\d+,-?\d+\.\d+$/.test(decoded)) {
          extractedName = decoded;
        }
      } catch (_) {}
    }

    // C. Check HTML Title / OpenGraph meta if name is still missing
    if (!extractedName && htmlContent) {
      const ogTitleMatch = htmlContent.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                           htmlContent.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        extractedName = ogTitleMatch[1].replace(/ - Google Maps$/, '').replace(/ · Google Maps$/, '').trim();
      }

      if (!extractedName) {
        const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          const rawTitle = titleMatch[1].replace(/ - Google Maps$/, '').replace(/ · Google Maps$/, '').trim();
          if (rawTitle && rawTitle !== 'Google Maps') {
            extractedName = rawTitle;
          }
        }
      }

      if (!extractedLat) {
        const metaCoords = htmlContent.match(/itemprop=["']latitude["']\s+content=["'](-?\d+\.\d+)["'][\s\S]*?itemprop=["']longitude["']\s+content=["'](-?\d+\.\d+)["']/i) ||
                           htmlContent.match(/content=["'](-?\d+\.\d+)["']\s+itemprop=["']latitude["'][\s\S]*?content=["'](-?\d+\.\d+)["']\s+itemprop=["']longitude["']/i) ||
                           htmlContent.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/i) ||
                           htmlContent.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (metaCoords) {
          extractedLat = parseFloat(metaCoords[1]);
          extractedLng = parseFloat(metaCoords[2]);
        }
      }
    }

    // D. If we have coordinates, reverse geocode to get a clean location name
    let resolvedAddress = extractedName;
    if (extractedLat && extractedLng) {
      const geo = await this.reverseGeocode(extractedLat, extractedLng);
      if (!extractedName || extractedName.toLowerCase() === 'google maps' || extractedName.toLowerCase().startsWith('location (')) {
        extractedName = geo.name;
      }
      resolvedAddress = geo.address || extractedName;
    }

    if (!extractedName) {
      extractedName = 'Selected Destination';
    }

    return {
      success: true,
      name: extractedName,
      address: resolvedAddress || extractedName,
      latitude: extractedLat || 11.9350,
      longitude: extractedLng || 79.8300,
      originalUrl: rawUrl
    };
  }
};

module.exports = MapService;
