/**
 * Campus GeoJSON Layer Provider for MapLibre GL JS
 * Overlays university campus boundaries, buildings, and pickup/drop points
 * seamlessly onto the base geographic map.
 */

let campusGeoJsonCache = null;
let pickupPointsGeoJsonCache = null;
let buildingsGeoJsonCache = null;

/**
 * Loads campus GeoJSON data with memory caching
 */
export async function loadCampusData() {
  if (campusGeoJsonCache && pickupPointsGeoJsonCache && buildingsGeoJsonCache) {
    return {
      campus: campusGeoJsonCache,
      pickupPoints: pickupPointsGeoJsonCache,
      buildings: buildingsGeoJsonCache
    };
  }

  try {
    const [campusRes, pickupRes, buildingsRes] = await Promise.all([
      fetch('/map/campus/campus.geojson').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/map/campus/pickup-points.geojson').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/map/campus/buildings.geojson').then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    campusGeoJsonCache = campusRes;
    pickupPointsGeoJsonCache = pickupRes;
    buildingsGeoJsonCache = buildingsRes;

    return {
      campus: campusRes,
      pickupPoints: pickupRes,
      buildings: buildingsRes
    };
  } catch (err) {
    console.warn('[CampusLayerProvider] Error loading campus GeoJSON:', err);
    return { campus: null, pickupPoints: null, buildings: null };
  }
}

/**
 * Attaches the campus vector layers onto a MapLibre GL JS map instance
 */
export async function attachCampusLayers(map, onPickupSelect = null) {
  if (!map || !map.isStyleLoaded()) {
    return;
  }

  const data = await loadCampusData();

  // 1. Campus Boundary Layer
  if (data.campus && !map.getSource('pu-campus-boundary')) {
    map.addSource('pu-campus-boundary', {
      type: 'geojson',
      data: data.campus
    });

    map.addLayer({
      id: 'pu-campus-fill',
      type: 'fill',
      source: 'pu-campus-boundary',
      paint: {
        'fill-color': '#F59E0B',
        'fill-opacity': 0.07
      }
    });

    map.addLayer({
      id: 'pu-campus-line',
      type: 'line',
      source: 'pu-campus-boundary',
      paint: {
        'line-color': '#F59E0B',
        'line-width': 2,
        'line-dasharray': [3, 2],
        'line-opacity': 0.65
      }
    });
  }

  // 2. Campus Buildings Layer
  if (data.buildings && !map.getSource('pu-campus-buildings')) {
    map.addSource('pu-campus-buildings', {
      type: 'geojson',
      data: data.buildings
    });

    map.addLayer({
      id: 'pu-buildings-fill',
      type: 'fill',
      source: 'pu-campus-buildings',
      paint: {
        'fill-color': '#3B82F6',
        'fill-opacity': 0.14
      }
    });

    map.addLayer({
      id: 'pu-buildings-line',
      type: 'line',
      source: 'pu-campus-buildings',
      paint: {
        'line-color': '#2563EB',
        'line-width': 1.5,
        'line-opacity': 0.5
      }
    });
  }

  // 3. Official Campus Pickup & Drop Points
  if (data.pickupPoints && !map.getSource('pu-campus-stops')) {
    map.addSource('pu-campus-stops', {
      type: 'geojson',
      data: data.pickupPoints
    });

    // Outer beacon ring
    map.addLayer({
      id: 'pu-stops-circle-outer',
      type: 'circle',
      source: 'pu-campus-stops',
      paint: {
        'circle-radius': 11,
        'circle-color': '#F59E0B',
        'circle-opacity': 0.22,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#F59E0B'
      }
    });

    // Inner point
    map.addLayer({
      id: 'pu-stops-circle-inner',
      type: 'circle',
      source: 'pu-campus-stops',
      paint: {
        'circle-radius': 5,
        'circle-color': '#F59E0B'
      }
    });

    // Interactive cursor & click handler
    map.on('mouseenter', 'pu-stops-circle-outer', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'pu-stops-circle-outer', () => {
      map.getCanvas().style.cursor = '';
    });

    if (onPickupSelect) {
      map.on('click', 'pu-stops-circle-outer', (e) => {
        if (e.features && e.features.length > 0) {
          const feat = e.features[0];
          const coords = feat.geometry.coordinates;
          onPickupSelect({
            name: feat.properties.name,
            address: feat.properties.description || feat.properties.name,
            latitude: coords[1],
            longitude: coords[0]
          });
        }
      });
    }
  }
}

export default {
  loadCampusData,
  attachCampusLayers
};
