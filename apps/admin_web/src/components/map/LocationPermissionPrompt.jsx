import React from 'react';
import { MapPin, X, AlertCircle } from 'lucide-react';

export function LocationPermissionPrompt({
  isOpen = false,
  onClose,
  onRetry,
  className = ''
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 9999
      }}
      className={`papido-location-prompt-modal ${className}`}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '400px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--primary, #F59E0B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}
        >
          <MapPin size={26} />
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
          Location Access Needed
        </h3>

        <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, marginBottom: '20px' }}>
          We could not automatically access your device GPS. You can enable location permission in your browser or search for a pickup spot manually.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontWeight: 800 }}
            >
              Try GPS Again
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '12px', fontWeight: 700 }}
          >
            Search Manually
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationPermissionPrompt;
