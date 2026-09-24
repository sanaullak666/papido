import React from 'react';
import { Power, Radio, Loader2 } from 'lucide-react';
import Button from '../ui/Button';

export function RiderOnlineToggle({
  isOnline = false,
  onToggle,
  loading = false,
  className = '',
  style = {}
}) {
  return (
    <div
      style={{
        background: isOnline ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.06)',
        border: `1.5px solid ${isOnline ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.25)'}`,
        borderRadius: 'var(--radius-lg, 16px)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: isOnline ? '0 4px 20px rgba(16, 185, 129, 0.15)' : 'none',
        transition: 'all 0.2s ease',
        ...style
      }}
      className={`rider-online-toggle-card ${className}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: isOnline ? '#10B981' : '#EF4444',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isOnline ? '0 0 16px rgba(16, 185, 129, 0.5)' : 'none',
            flexShrink: 0
          }}
        >
          {loading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : isOnline ? (
            <Radio size={24} />
          ) : (
            <Power size={24} />
          )}
        </div>

        <div>
          <div
            style={{
              fontSize: '17px',
              fontWeight: 800,
              fontFamily: 'var(--font-heading, inherit)',
              color: isOnline ? '#10B981' : '#F87171',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{isOnline ? 'You are online' : 'You are offline'}</span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '10px',
                background: isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: isOnline ? '#34D399' : '#FCA5A5',
                fontWeight: 800
              }}
            >
              {isOnline ? 'LIVE' : 'IDLE'}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary, #94A3B8)', marginTop: '2px' }}>
            {isOnline
              ? 'You are available for ride requests across campus'
              : 'You are not receiving ride requests right now'}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        disabled={loading}
        style={{
          minHeight: '46px',
          padding: '0 24px',
          borderRadius: 'var(--radius-sm, 8px)',
          border: isOnline ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
          background: isOnline ? 'rgba(239, 68, 68, 0.15)' : 'var(--primary, #F59E0B)',
          color: isOnline ? '#F87171' : '#0F172A',
          fontWeight: 800,
          fontSize: '14px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          boxShadow: isOnline ? 'none' : '0 4px 14px rgba(245, 158, 11, 0.35)',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap'
        }}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {!loading && <Power size={16} />}
        <span>{isOnline ? 'Go offline' : 'Go online'}</span>
      </button>
    </div>
  );
}
export default RiderOnlineToggle;
