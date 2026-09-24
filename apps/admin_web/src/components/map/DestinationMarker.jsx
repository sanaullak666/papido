import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export function DestinationMarker({
  map,
  position,
  label = 'Destination Point',
  draggable = false,
  onDragEnd,
  onClick
}) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !position || !position.latitude || !position.longitude) return;

    const lat = parseFloat(position.latitude);
    const lng = parseFloat(position.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    // Custom Amber / Orange Destination Pin
    const customIcon = L.divIcon({
      className: 'papido-drop-marker-icon',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(234, 88, 12, 0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #EA580C; border: 3px solid #FFFFFF; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.5); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 900; font-size: 13px;">
            D
          </div>
          <div style="position: absolute; bottom: -4px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #EA580C;"></div>
        </div>
      `,
      iconSize: [36, 42],
      iconAnchor: [18, 42],
      popupAnchor: [0, -42]
    });

    const marker = L.marker([lat, lng], {
      icon: customIcon,
      draggable: Boolean(draggable),
      title: label
    }).addTo(map);

    marker.bindPopup(`
      <div style="padding: 4px 2px; font-family: sans-serif; text-align: center;">
        <div style="font-size: 10px; font-weight: 800; color: #EA580C; letter-spacing: 0.5px; text-transform: uppercase;">DESTINATION DROP</div>
        <div style="font-size: 13px; font-weight: 700; color: #1E293B; margin-top: 2px;">${label}</div>
        ${draggable ? '<div style="font-size: 10px; color: #64748B; margin-top: 4px;">Drag pin to adjust</div>' : ''}
      </div>
    `);

    if (draggable && onDragEnd) {
      marker.on('dragend', (e) => {
        const newLatLng = e.target.getLatLng();
        onDragEnd({
          latitude: newLatLng.lat,
          longitude: newLatLng.lng,
          latlng: newLatLng
        });
      });
    }

    if (onClick) {
      marker.on('click', onClick);
    }

    markerRef.current = marker;

    return () => {
      if (marker) {
        marker.remove();
        markerRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !position) return;

    const lat = parseFloat(position.latitude);
    const lng = parseFloat(position.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      const cur = marker.getLatLng();
      if (Math.abs(cur.lat - lat) > 0.00001 || Math.abs(cur.lng - lng) > 0.00001) {
        marker.setLatLng([lat, lng]);
      }
    }
    if (draggable) {
      marker.dragging?.enable();
    } else {
      marker.dragging?.disable();
    }
  }, [position?.latitude, position?.longitude, draggable, label]);

  return null;
}

export default DestinationMarker;
