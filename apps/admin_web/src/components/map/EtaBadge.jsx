import React from 'react';
import { Navigation, Clock } from 'lucide-react';

export function EtaBadge({
  distanceKm = null,
  durationMinutes = null,
  label = 'Route Info',
  className = '',
  style = {}
}) {
  if (distanceKm === null && durationMinutes === null) return null;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        background: '#FFFFFF',
        border: '1.5px solid #E2E8F0',
        borderRadius: '12px',
        padding: '8px 14px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
        fontSize: '12px',
        fontWeight: 700,
        color: '#1E293B',
        ...style
      }}
      className={`papido-eta-badge ${className}`}
    >
      {distanceKm !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Navigation size={14} color="#EA580C" />
          <span><strong>{Number(distanceKm).toFixed(1)}</strong> km</span>
        </div>
      )}

      {distanceKm !== null && durationMinutes !== null && (
        <span style={{ color: '#CBD5E1' }}>|</span>
      )}

      {durationMinutes !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={14} color="#059669" />
          <span>~<strong>{Math.round(durationMinutes)}</strong> mins</span>
        </div>
      )}
    </div>
  );
}

export default EtaBadge;
