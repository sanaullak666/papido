import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export function RouteLine({
  map,
  waypoints = [],
  color = '#EA580C',
  weight = 4.5,
  dashArray = null,
  opacity = 0.85,
  fitBounds = false,
  tooltipText = null
}) {
  const lineRef = useRef(null);
  const casingRef = useRef(null);

  useEffect(() => {
    if (!map || !waypoints || waypoints.length < 2) return;

    try {
      const latLngs = waypoints.map(wp => {
        if (Array.isArray(wp)) return [wp[0], wp[1]];
        return [wp.latitude || wp.lat, wp.longitude || wp.lng];
      }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));

      if (latLngs.length < 2) return;

      // Outer darker casing for high contrast on map tiles
      const casing = L.polyline(latLngs, {
        color: '#FFFFFF',
        weight: weight + 3,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Main colored route polyline
      const line = L.polyline(latLngs, {
        color: color,
        weight: weight,
        opacity: opacity,
        dashArray: dashArray,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      if (tooltipText) {
        line.bindTooltip(tooltipText, {
          sticky: true,
          className: 'papido-route-tooltip'
        });
      }

      lineRef.current = line;
      casingRef.current = casing;

      if (fitBounds) {
        map.fitBounds(line.getBounds(), { padding: [40, 40], maxZoom: 16 });
      }

      return () => {
        if (line) line.remove();
        if (casing) casing.remove();
        lineRef.current = null;
        casingRef.current = null;
      };
    } catch (err) {
      console.warn('[RouteLine] Error rendering polyline:', err);
    }
  }, [map, waypoints, color, weight, dashArray, opacity, fitBounds, tooltipText]);

  return null;
}

export default RouteLine;
