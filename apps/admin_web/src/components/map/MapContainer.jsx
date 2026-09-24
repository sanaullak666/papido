import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { TILE_CONFIG, PAPIDO_SERVICE_AREAS, MAP_MODES } from '../../config/serviceAreas';
import { Loader2, AlertTriangle, RefreshCw, Layers } from 'lucide-react';

export function MapContainer({
  mode = MAP_MODES.CAMPUS_MODE,
  center = null,
  zoom = null,
  bounds = null,
  className = '',
  style = {},
  children,
  onMapReady,
  onMapClick,
  showLayerToggle = false,
  attribution = true
}) {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if map already initialized on this DOM node
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    try {
      const defaultCenter = center || PAPIDO_SERVICE_AREAS.PONDICHERRY_UNIVERSITY.center;
      const defaultZoom = zoom || (mode === MAP_MODES.CITY_MODE ? 12 : 15);

      const map = L.map(mapContainerRef.current, {
        center: [defaultCenter.latitude, defaultCenter.longitude],
        zoom: defaultZoom,
        zoomControl: false,
        attributionControl: false
      });

      // Add Zoom control at top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Add OpenStreetMap Tile Layer
      L.tileLayer(TILE_CONFIG.url, {
        maxZoom: TILE_CONFIG.maxZoom,
        minZoom: TILE_CONFIG.minZoom,
        attribution: TILE_CONFIG.attribution
      }).addTo(map);

      if (attribution) {
        L.control.attribution({
          position: 'bottomright',
          prefix: false
        }).addAttribution(TILE_CONFIG.attribution).addTo(map);
      }

      if (onMapClick) {
        map.on('click', (e) => {
          onMapClick({
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
            latlng: e.latlng
          });
        });
      }

      leafletMapRef.current = map;
      setMapReady(true);

      if (onMapReady) {
        onMapReady(map);
      }

      // Invalidate size after container settles
      const resizeTimer = setTimeout(() => {
        if (map) map.invalidateSize();
      }, 250);

      return () => {
        clearTimeout(resizeTimer);
        map.remove();
        leafletMapRef.current = null;
      };
    } catch (err) {
      console.error('[MapContainer] Error initializing Leaflet map:', err);
      setError(err.message || 'Failed to initialize map');
    }
  }, []);

  // Update bounds or center when props change
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    if (bounds && Array.isArray(bounds) && bounds.length >= 2) {
      try {
        const leafletBounds = L.latLngBounds(bounds.map(b => [b[0] || b.latitude || b.lat, b[1] || b.longitude || b.lng]));
        map.fitBounds(leafletBounds, { padding: [40, 40], maxZoom: 16, animate: true });
      } catch (_) {}
    } else if (center && center.latitude && center.longitude) {
      map.panTo([center.latitude, center.longitude], { animate: true });
      if (zoom) map.setZoom(zoom);
    }
  }, [center, zoom, bounds]);

  // Adjust view when mode changes
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    if (mode === MAP_MODES.CAMPUS_MODE) {
      const c = PAPIDO_SERVICE_AREAS.PONDICHERRY_UNIVERSITY.center;
      map.flyTo([c.latitude, c.longitude], 15, { duration: 1 });
    } else if (mode === MAP_MODES.CITY_MODE) {
      const c = PAPIDO_SERVICE_AREAS.PONDICHERRY_CITY.center;
      map.flyTo([c.latitude, c.longitude], 12.5, { duration: 1.2 });
    }
  }, [mode]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '280px',
        background: '#E2E8F0',
        borderRadius: 'var(--radius-md, 12px)',
        overflow: 'hidden',
        ...style
      }}
      className={`papido-map-wrapper ${className}`}
    >
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '280px',
          zIndex: 1
        }}
      />

      {/* Loading state indicator */}
      {!mapReady && !error && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          zIndex: 10
        }}>
          <Loader2 size={28} className="animate-spin" color="var(--primary, #F59E0B)" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
            Loading OpenStreetMap...
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#FFF7ED',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '20px',
          textAlign: 'center',
          zIndex: 10
        }}>
          <AlertTriangle size={32} color="#EA580C" />
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#9A3412' }}>
            Map view unavailable
          </div>
          <div style={{ fontSize: '12px', color: '#C2410C' }}>
            {error}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <RefreshCw size={14} /> Retry Map
          </button>
        </div>
      )}

      {/* Render child overlay markers & controls if map is ready */}
      {mapReady && leafletMapRef.current && typeof children === 'function'
        ? children(leafletMapRef.current)
        : null}
    </div>
  );
}

export default MapContainer;
