import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapLibreStyle } from './tileProvider';
import { getRoadRoute, recalculateIfDeviated } from './routingProvider';
import { attachCampusLayers } from './campusLayerProvider';
import {
  Plus,
  Minus,
  Locate,
  Navigation,
  Compass,
  AlertTriangle,
  Clock,
  Gauge
} from 'lucide-react';
import './PapidoLiveMap.css';

/**
 * Normalizes coordinates to { lat, lng }
 */
function normalizeCoord(pt) {
  if (!pt) return null;
  const lat = pt.latitude !== undefined ? Number(pt.latitude) : (pt.lat !== undefined ? Number(pt.lat) : null);
  const lng = pt.longitude !== undefined ? Number(pt.longitude) : (pt.lng !== undefined ? Number(pt.lng) : null);
  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng, latitude: lat, longitude: lng, address: pt.address || pt.name || '' };
}

export function PapidoLiveMap({
  driverLocation = null, // { latitude, longitude, heading, speed, accuracy }
  pickup = null,         // { latitude, longitude, address }
  destination = null,    // { latitude, longitude, address }
  riderLocation = null,  // { latitude, longitude }
  activeRide = null,
  isDriverView = false,  // True if driver app, false if customer/admin
  tileSource = 'CARTO_VOYAGER',
  onPickupSelect = null,
  height = '100%',
  className = '',
  style = {}
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const riderMarkerRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [routeData, setRouteData] = useState(null); // { coordinates, distanceKm, durationMinutes }
  const [initError, setInitError] = useState(null);

  // Position interpolation state for smooth driver movement
  const prevDriverPosRef = useRef(null);
  const animFrameRef = useRef(null);

  const normDriver = normalizeCoord(driverLocation);
  const normPickup = normalizeCoord(pickup || activeRide?.pickup_coords || (activeRide?.pickup_latitude ? { lat: activeRide.pickup_latitude, lng: activeRide.pickup_longitude } : null));
  const normDest = normalizeCoord(destination || activeRide?.drop_coords || (activeRide?.destination_latitude ? { lat: activeRide.destination_latitude, lng: activeRide.destination_longitude } : null));
  const normRider = normalizeCoord(riderLocation);

  // Default center: Pondicherry University (Kalapet)
  const defaultCenter = [79.8520, 12.0250]; // [lng, lat]

  /* -------------------------------------------------------------
     1. Initialize MapLibre GL JS Map
     ------------------------------------------------------------- */
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: getMapLibreStyle(tileSource),
        center: defaultCenter,
        zoom: 14.5,
        attributionControl: false
      });

      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

      map.on('load', () => {
        mapRef.current = map;
        setMapLoaded(true);

        // Attach campus GeoJSON overlays (boundaries, pickup spots, buildings)
        attachCampusLayers(map, onPickupSelect);

        // Setup empty route line source
        if (!map.getSource('papido-active-route')) {
          map.addSource('papido-active-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: [] }
            }
          });

          // Route line shadow/glow
          map.addLayer({
            id: 'papido-route-glow',
            type: 'line',
            source: 'papido-active-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#1D4ED8',
              'line-width': 8,
              'line-opacity': 0.3
            }
          });

          // Core route line
          map.addLayer({
            id: 'papido-route-core',
            type: 'line',
            source: 'papido-active-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#3B82F6',
              'line-width': 4.5,
              'line-opacity': 0.95
            }
          });
        }
      });

      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error('[PapidoLiveMap] Failed to initialize MapLibre GL:', err);
      setInitError('Could not initialize WebGL Map. Please ensure hardware acceleration is enabled.');
    }
  }, [tileSource]);

  /* -------------------------------------------------------------
     2. Create & Smoothly Animate Driver Marker
     ------------------------------------------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !normDriver) return;

    const targetLng = normDriver.lng;
    const targetLat = normDriver.lat;
    const heading = Number(driverLocation?.heading || 0);

    // If marker doesn't exist, create it
    if (!driverMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'papido-driver-marker-wrap';
      el.innerHTML = `
        <div class="papido-driver-radar-ring"></div>
        <div class="papido-driver-marker-body" id="papido-driver-body" style="transform: rotate(${heading}deg);">
          <div class="papido-driver-heading-pointer"></div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18.5" cy="17.5" r="3.5"/>
            <circle cx="5.5" cy="17.5" r="3.5"/>
            <circle cx="15" cy="5" r="1"/>
            <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
          </svg>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([targetLng, targetLat])
        .addTo(map);

      driverMarkerRef.current = marker;
      prevDriverPosRef.current = { lng: targetLng, lat: targetLat };
    } else {
      // Smooth interpolation animation between previous and new position
      const startLng = prevDriverPosRef.current ? prevDriverPosRef.current.lng : targetLng;
      const startLat = prevDriverPosRef.current ? prevDriverPosRef.current.lat : targetLat;

      const bodyEl = document.getElementById('papido-driver-body');
      if (bodyEl) {
        bodyEl.style.transform = `rotate(${heading}deg)`;
      }

      if (startLng === targetLng && startLat === targetLat) {
        return;
      }

      const startTime = performance.now();
      const durationMs = 1200; // Smooth 1.2s glide along road

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      const animateMarker = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        // Ease-out cubic curve
        const ease = 1 - Math.pow(1 - progress, 3);

        const currentLng = startLng + (targetLng - startLng) * ease;
        const currentLat = startLat + (targetLat - startLat) * ease;

        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLngLat([currentLng, currentLat]);
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animateMarker);
        } else {
          prevDriverPosRef.current = { lng: targetLng, lat: targetLat };
        }
      };

      animFrameRef.current = requestAnimationFrame(animateMarker);
    }
  }, [normDriver?.lat, normDriver?.lng, driverLocation?.heading, mapLoaded]);

  /* -------------------------------------------------------------
     3. Pickup Marker
     ------------------------------------------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!normPickup) {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.remove();
        pickupMarkerRef.current = null;
      }
      return;
    }

    if (!pickupMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'papido-pin-marker';
      el.innerHTML = `
        <div class="papido-pin-badge">PICKUP</div>
        <div class="papido-pin-icon-wrap is-pickup">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `;

      pickupMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([normPickup.lng, normPickup.lat])
        .addTo(map);
    } else {
      pickupMarkerRef.current.setLngLat([normPickup.lng, normPickup.lat]);
    }
  }, [normPickup?.lat, normPickup?.lng, mapLoaded]);

  /* -------------------------------------------------------------
     4. Destination Marker
     ------------------------------------------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!normDest) {
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      return;
    }

    if (!destMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'papido-pin-marker';
      el.innerHTML = `
        <div class="papido-pin-badge">DROP</div>
        <div class="papido-pin-icon-wrap is-destination">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" x2="4" y1="22" y2="15"/>
          </svg>
        </div>
      `;

      destMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([normDest.lng, normDest.lat])
        .addTo(map);
    } else {
      destMarkerRef.current.setLngLat([normDest.lng, normDest.lat]);
    }
  }, [normDest?.lat, normDest?.lng, mapLoaded]);

  /* -------------------------------------------------------------
     5. Calculate and Render Road Route via OSRM
     ------------------------------------------------------------- */
  const calculateRoute = useCallback(async () => {
    // Determine route origin and destination based on trip state
    let originPoint = null;
    let targetPoint = null;

    if (activeRide?.status === 'STARTED') {
      // Ride in progress: driver to destination
      originPoint = normDriver || normPickup;
      targetPoint = normDest;
    } else {
      // Arriving at pickup: driver to pickup (or pickup to destination)
      originPoint = normDriver || normPickup;
      targetPoint = normPickup || normDest;
    }

    if (!originPoint || !targetPoint) return;
    if (originPoint.lat === targetPoint.lat && originPoint.lng === targetPoint.lng) {
      if (normDest && targetPoint !== normDest) {
        targetPoint = normDest;
      } else {
        return;
      }
    }

    try {
      const route = await getRoadRoute(originPoint, targetPoint);
      if (route && Array.isArray(route.coordinates)) {
        setRouteData(route);

        const map = mapRef.current;
        if (map && map.getSource('papido-active-route')) {
          map.getSource('papido-active-route').setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: route.coordinates
            }
          });
        }
      }
    } catch (err) {
      console.warn('[PapidoLiveMap] Road route calculation notice:', err);
    }
  }, [normDriver, normPickup, normDest, activeRide?.status]);

  useEffect(() => {
    if (mapLoaded) {
      calculateRoute();
    }
  }, [mapLoaded, normPickup?.lat, normPickup?.lng, normDest?.lat, normDest?.lng, activeRide?.status]);

  /* -------------------------------------------------------------
     6. Route Deviation Check
     ------------------------------------------------------------- */
  useEffect(() => {
    if (!normDriver || !routeData || !Array.isArray(routeData.coordinates)) return;
    const target = (activeRide?.status === 'STARTED') ? normDest : normPickup;
    if (!target) return;

    recalculateIfDeviated(normDriver, target, routeData.coordinates)
      .then(newRoute => {
        if (newRoute && mapRef.current) {
          setRouteData(newRoute);
          const source = mapRef.current.getSource('papido-active-route');
          if (source) {
            source.setData({
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: newRoute.coordinates }
            });
          }
        }
      })
      .catch(() => {});
  }, [normDriver?.lat, normDriver?.lng]);

  /* -------------------------------------------------------------
     7. Camera Auto-Fitting
     ------------------------------------------------------------- */
  const fitAllPoints = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = new maplibregl.LngLatBounds();
    let pointCount = 0;

    if (normDriver) { bounds.extend([normDriver.lng, normDriver.lat]); pointCount++; }
    if (normPickup) { bounds.extend([normPickup.lng, normPickup.lat]); pointCount++; }
    if (normDest) { bounds.extend([normDest.lng, normDest.lat]); pointCount++; }

    if (pointCount >= 2) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 16.5, duration: 1000 });
    } else if (normDriver) {
      map.flyTo({ center: [normDriver.lng, normDriver.lat], zoom: 16, duration: 800 });
    } else if (normPickup) {
      map.flyTo({ center: [normPickup.lng, normPickup.lat], zoom: 15.5, duration: 800 });
    }
  }, [normDriver, normPickup, normDest]);

  // Initial auto-fit once map is loaded
  useEffect(() => {
    if (mapLoaded) {
      fitAllPoints();
    }
  }, [mapLoaded]);

  const recenterDriver = () => {
    const map = mapRef.current;
    if (!map) return;
    if (normDriver) {
      map.flyTo({ center: [normDriver.lng, normDriver.lat], zoom: 16.5, duration: 800 });
    } else if (normPickup) {
      map.flyTo({ center: [normPickup.lng, normPickup.lat], zoom: 16, duration: 800 });
    }
  };

  const isLiveGpsActive = Boolean(driverLocation && (driverLocation.latitude || driverLocation.lat));

  return (
    <div className={`papido-live-map-wrapper ${className}`} style={{ height, ...style }}>
      {/* Top Floating Route & Tracking Pill */}
      <div className="papido-map-top-card">
        <div className="papido-map-status-pill">
          <span className={`papido-map-status-dot ${isLiveGpsActive ? 'is-live' : 'is-off'}`} />
          <span>{isLiveGpsActive ? 'Live GPS Active' : 'Live location stopped'}</span>
        </div>

        {routeData && (
          <div className="papido-map-stats-group">
            <div className="papido-map-stat-item">
              <Compass size={14} color="#F59E0B" />
              <span><strong>{routeData.distanceKm}</strong> km</span>
            </div>
            <div className="papido-map-stat-item">
              <Clock size={14} color="#F59E0B" />
              <span><strong>{routeData.durationMinutes}</strong> mins</span>
            </div>
            {driverLocation?.speed > 0 && (
              <div className="papido-map-stat-item">
                <Gauge size={14} color="#10B981" />
                <span><strong>{driverLocation.speed}</strong> km/h</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Controls */}
      <div className="papido-map-controls-group">
        <button
          type="button"
          className="papido-map-btn"
          title="Recenter on Driver"
          onClick={recenterDriver}
        >
          <Locate size={18} />
        </button>
        <button
          type="button"
          className="papido-map-btn"
          title="Fit Route to Screen"
          onClick={fitAllPoints}
        >
          <Navigation size={18} />
        </button>
        <button
          type="button"
          className="papido-map-btn"
          title="Zoom In"
          onClick={() => mapRef.current?.zoomIn()}
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          className="papido-map-btn"
          title="Zoom Out"
          onClick={() => mapRef.current?.zoomOut()}
        >
          <Minus size={18} />
        </button>
      </div>

      {/* Error Notice */}
      {initError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          padding: '16px 20px',
          borderRadius: '12px',
          zIndex: 20,
          textAlign: 'center',
          maxWidth: '320px'
        }}>
          <AlertTriangle size={24} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '13px', fontWeight: 600 }}>{initError}</div>
        </div>
      )}

      {/* MapLibre DOM Node */}
      <div ref={containerRef} className="papido-map-container" />
    </div>
  );
}

export default PapidoLiveMap;
