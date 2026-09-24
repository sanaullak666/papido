import React from 'react';
import { MAP_MODES } from '../../config/serviceAreas';
import { School, Building2 } from 'lucide-react';

export function MapAreaSelector({
  currentMode = MAP_MODES.CAMPUS_MODE,
  onChange,
  className = '',
  style = {}
}) {
  const isCampus = currentMode === MAP_MODES.CAMPUS_MODE;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#FFFFFF',
        border: '1.5px solid #E2E8F0',
        borderRadius: '9999px',
        padding: '3px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
        gap: '4px',
        ...style
      }}
      className={`papido-map-area-selector ${className}`}
      role="group"
      aria-label="Map Service Area Selector"
    >
      <button
        type="button"
        onClick={() => onChange(MAP_MODES.CAMPUS_MODE)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '9999px',
          border: 'none',
          background: isCampus ? 'var(--primary, #F59E0B)' : 'transparent',
          color: isCampus ? '#000000' : '#64748B',
          fontWeight: 800,
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        aria-pressed={isCampus}
      >
        <School size={14} />
        <span>Campus Mode</span>
      </button>

      <button
        type="button"
        onClick={() => onChange(MAP_MODES.CITY_MODE)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '9999px',
          border: 'none',
          background: !isCampus ? '#2563EB' : 'transparent',
          color: !isCampus ? '#FFFFFF' : '#64748B',
          fontWeight: 800,
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        aria-pressed={!isCampus}
      >
        <Building2 size={14} />
        <span>Puducherry City</span>
      </button>
    </div>
  );
}

export default MapAreaSelector;
