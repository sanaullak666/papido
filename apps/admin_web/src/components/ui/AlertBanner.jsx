import React from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';

export function AlertBanner({
  alert,
  onAction,
  onDismiss,
  className = '',
  style = {}
}) {
  if (!alert) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
        color: '#0F172A',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontWeight: 700,
        fontSize: '13px',
        boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)',
        zIndex: 1000,
        cursor: onAction ? 'pointer' : 'default',
        animation: 'slideDown 0.2s ease',
        ...style
      }}
      onClick={onAction}
      className={`alert-banner-ui ${className}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(15, 23, 42, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <AlertTriangle size={18} color="#0F172A" />
        </div>

        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            NEW OUTSIDE CAMPUS TRIP:
          </span>{' '}
          <span>{alert.customerName || 'Passenger'}</span> requested{' '}
          <strong>{alert.pickupAddress} → {alert.destinationAddress}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {onAction && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            style={{
              background: '#0F172A',
              color: '#F8FAFC',
              border: 'none',
              fontWeight: 700,
              fontSize: '12px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm, 6px)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
            }}
          >
            <span>Open Dispatch & Set Fare</span>
            <ArrowRight size={13} />
          </button>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#0F172A',
              opacity: 0.8
            }}
            title="Dismiss Alert"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
export default AlertBanner;
