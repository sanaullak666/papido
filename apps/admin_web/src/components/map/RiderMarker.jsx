import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export function RiderMarker({
  map,
  position,
  heading = 0,
  speed = 0,
  riderName = 'Assigned Rider',
  vehicleModel = 'Campus Ride',
  vehicleType = 'BIKE',
  lastUpdated = null,
  autoPan = false
}) {
  const markerRef = useRef(null);
  const lastTimeRef = useRef(null);
  const [staleStatus, setStaleStatus] = useState('live'); // 'live' | 'slow' | 'delayed' | 'unavailable'
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Periodic stale status calculation
  useEffect(() => {
    const updateStaleTimer = () => {
      const ts = lastUpdated ? new Date(lastUpdated).getTime() : (lastTimeRef.current || Date.now());
      const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
      setSecondsAgo(diffSec);

      if (diffSec <= 15) {
        setStaleStatus('live');
      } else if (diffSec <= 45) {
        setStaleStatus('slow');
      } else if (diffSec <= 120) {
        setStaleStatus('delayed');
      } else {
        setStaleStatus('unavailable');
      }
    };

    updateStaleTimer();
    const interval = setInterval(updateStaleTimer, 5000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  useEffect(() => {
    if (!map || !position || !position.latitude || !position.longitude) return;

    const lat = parseFloat(position.latitude);
    const lng = parseFloat(position.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    lastTimeRef.current = Date.now();

    const getStatusColor = () => {
      if (staleStatus === 'live') return '#10B981';
      if (staleStatus === 'slow') return '#F59E0B';
      if (staleStatus === 'delayed') return '#EA580C';
      return '#64748B';
    };

    const color = getStatusColor();
    const rotation = typeof heading === 'number' ? heading : 0;

    // Custom vehicle / rider SVG icon with heading rotation
    const customIcon = L.divIcon({
      className: 'papido-rider-marker-icon',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          ${staleStatus === 'live' ? `<div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(16, 185, 129, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
          <div style="transform: rotate(${rotation}deg); transition: transform 0.4s ease; width: 34px; height: 34px; border-radius: 50%; background: #0F172A; border: 2.5px solid ${color}; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; color: #FFFFFF;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="15" cy="5" r="1"/>
              <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
            </svg>
          </div>
          <div style="position: absolute; top: -2px; right: -2px; width: 10px; height: 10px; border-radius: 50%; background: ${color}; border: 2px solid #FFFFFF;"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22]
    });

    const marker = L.marker([lat, lng], {
      icon: customIcon,
      title: `${riderName} - ${vehicleModel}`,
      zIndexOffset: 1000
    }).addTo(map);

    marker.bindPopup(`
      <div style="padding: 6px 4px; font-family: sans-serif; min-width: 140px;">
        <div style="font-size: 11px; font-weight: 800; color: #059669; display: flex; align-items: center; gap: 4px;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: ${color};"></span>
          ${staleStatus === 'live' ? 'LIVE RIDER LOCATION' : staleStatus === 'slow' ? 'UPDATING SLOWLY' : 'LOCATION DELAYED'}
        </div>
        <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-top: 3px;">${riderName}</div>
        <div style="font-size: 11px; color: #64748B;">${vehicleModel} (${vehicleType})</div>
        ${speed > 0 ? `<div style="font-size: 11px; color: #059669; font-weight: 700; margin-top: 2px;">Speed: ${Math.round(speed)} km/h</div>` : ''}
        <div style="font-size: 10px; color: #94A3B8; margin-top: 4px; border-top: 1px solid #E2E8F0; padding-top: 4px;">
          ${secondsAgo <= 15 ? 'Driver location is live' : `Updated ${secondsAgo}s ago`}
        </div>
      </div>
    `);

    markerRef.current = marker;

    if (autoPan) {
      map.panTo([lat, lng], { animate: true });
    }

    return () => {
      if (marker) {
        marker.remove();
        markerRef.current = null;
      }
    };
  }, [map]);

  // Smooth position update
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !position) return;

    const lat = parseFloat(position.latitude);
    const lng = parseFloat(position.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      lastTimeRef.current = Date.now();
      const cur = marker.getLatLng();
      if (Math.abs(cur.lat - lat) > 0.00001 || Math.abs(cur.lng - lng) > 0.00001) {
        marker.setLatLng([lat, lng]);
        if (autoPan && map) {
          map.panTo([lat, lng], { animate: true });
        }
      }
    }
  }, [position?.latitude, position?.longitude, autoPan]);

  return null;
}

export default RiderMarker;
