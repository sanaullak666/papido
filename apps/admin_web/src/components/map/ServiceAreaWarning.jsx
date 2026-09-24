import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export function ServiceAreaWarning({
  onSwitchToOutsideTrips,
  onResetLocation,
  className = '',
  style = {}
}) {
  return (
    <div
      style={{
        background: '#FEF2F2',
        border: '1.5px solid #FCA5A5',
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
        ...style
      }}
      className={`papido-service-area-warning ${className}`}
      role="alert"
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#FEE2E2',
          color: '#DC2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px'
        }}
      >
        <AlertTriangle size={18} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B' }}>
          Location Outside Current Campus Service Area
        </div>
        <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: '3px', lineHeight: 1.4 }}>
          This location is outside the standard Pondicherry University boundary. Please choose a location inside Pondicherry University or book through Outside Trips.
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
          {onSwitchToOutsideTrips && (
            <button
              type="button"
              onClick={onSwitchToOutsideTrips}
              style={{
                background: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Go to Outside Trips <ArrowRight size={12} />
            </button>
          )}

          {onResetLocation && (
            <button
              type="button"
              onClick={onResetLocation}
              style={{
                background: '#FFFFFF',
                color: '#991B1B',
                border: '1px solid #FCA5A5',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reset to Main Gate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ServiceAreaWarning;
