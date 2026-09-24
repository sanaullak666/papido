import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export function CampusLandmarkMarker({
  map,
  landmark,
  onSelectAsPickup,
  onSelectAsDrop
}) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !landmark || !landmark.latitude || !landmark.longitude) return;

    const lat = parseFloat(landmark.latitude);
    const lng = parseFloat(landmark.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    const getCategoryBadge = (cat) => {
      switch (cat) {
        case 'GATES': return { icon: '🚪', color: '#2563EB', bg: '#EFF6FF' };
        case 'HOSTELS': return { icon: '🏠', color: '#DB2777', bg: '#FDF2F8' };
        case 'ACADEMIC': return { icon: '🏛️', color: '#7C3AED', bg: '#F5F3FF' };
        case 'FOOD': return { icon: '🍽️', color: '#D97706', bg: '#FFFBEB' };
        case 'SPORTS': return { icon: '⚽', color: '#059669', bg: '#ECFDF5' };
        default: return { icon: '📍', color: '#4B5563', bg: '#F3F4F6' };
      }
    };

    const styleInfo = getCategoryBadge(landmark.category);

    const icon = L.divIcon({
      className: 'papido-landmark-icon',
      html: `
        <div style="width: 28px; height: 28px; border-radius: 50%; background: ${styleInfo.bg}; border: 2px solid ${styleInfo.color}; box-shadow: 0 2px 6px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; font-size: 13px; cursor: pointer; transition: transform 0.15s ease;">
          ${styleInfo.icon}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14]
    });

    const marker = L.marker([lat, lng], {
      icon,
      title: landmark.name
    }).addTo(map);

    const popupContent = document.createElement('div');
    popupContent.style.padding = '6px 2px';
    popupContent.style.fontFamily = 'sans-serif';
    popupContent.style.minWidth = '150px';

    popupContent.innerHTML = `
      <div style="font-size: 10px; font-weight: 800; color: ${styleInfo.color}; text-transform: uppercase;">
        ${landmark.category || 'CAMPUS SPOT'}
      </div>
      <div style="font-size: 13px; font-weight: 700; color: #1E293B; margin: 2px 0 6px;">
        ${landmark.name}
      </div>
      <div style="display: flex; gap: 6px; margin-top: 6px;">
        <button id="btn-pickup-${landmark.id}" style="flex: 1; padding: 4px 8px; font-size: 10px; font-weight: 800; background: #10B981; color: #FFF; border: none; border-radius: 6px; cursor: pointer;">
          Set Pickup
        </button>
        <button id="btn-drop-${landmark.id}" style="flex: 1; padding: 4px 8px; font-size: 10px; font-weight: 800; background: #EA580C; color: #FFF; border: none; border-radius: 6px; cursor: pointer;">
          Set Drop
        </button>
      </div>
    `;

    marker.bindPopup(popupContent);

    marker.on('popupopen', () => {
      const pBtn = document.getElementById(`btn-pickup-${landmark.id}`);
      const dBtn = document.getElementById(`btn-drop-${landmark.id}`);
      if (pBtn && onSelectAsPickup) {
        pBtn.onclick = () => {
          onSelectAsPickup(landmark);
          marker.closePopup();
        };
      }
      if (dBtn && onSelectAsDrop) {
        dBtn.onclick = () => {
          onSelectAsDrop(landmark);
          marker.closePopup();
        };
      }
    });

    markerRef.current = marker;

    return () => {
      if (marker) {
        marker.remove();
        markerRef.current = null;
      }
    };
  }, [map, landmark]);

  return null;
}

export default CampusLandmarkMarker;
