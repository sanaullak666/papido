import React from 'react';
import {
  MapPin,
  Navigation,
  Bike,
  Car,
  User,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  KeyRound
} from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { getRideStatus } from '../../design/statusConfig';

export function RideCard({
  ride,
  onSelect,
  isSelected = false,
  className = '',
  style = {}
}) {
  if (!ride) return null;

  const status = getRideStatus(ride.status);
  const vehicleType = ride.vehicle_type || 'BIKE';
  const fare = parseFloat(ride.total_fare || ride.fare_amount || ride.fare || 0);

  return (
    <div
      onClick={onSelect ? () => onSelect(ride) : undefined}
      style={{
        background: isSelected ? 'var(--bg-card-hover, #1A2642)' : 'var(--bg-card, #131D31)',
        border: `1px solid ${isSelected ? 'var(--primary, #F59E0B)' : 'var(--border, #23314E)'}`,
        borderRadius: 'var(--radius-md, 10px)',
        padding: '16px',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        boxShadow: isSelected ? '0 0 16px rgba(245, 158, 11, 0.2)' : 'var(--shadow-sm)',
        ...style
      }}
      className={`ride-card-ui ${isSelected ? 'selected' : ''} ${className}`}
    >
      {/* Top Header: Code, Vehicle Badge, OTP, Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 700,
              fontSize: '13px',
              color: 'var(--primary, #F59E0B)'
            }}
          >
            {ride.ride_code || `#${ride.id}`}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.06)',
              color: 'var(--text-secondary, #94A3B8)'
            }}
          >
            {vehicleType === 'AUTO' || vehicleType === 'CAB' ? <Car size={12} /> : <Bike size={12} />}
            <span>{vehicleType}</span>
          </span>
          {ride.otp && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: ['STARTED', 'COMPLETED'].includes(ride.status)
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(245, 158, 11, 0.14)',
                color: ['STARTED', 'COMPLETED'].includes(ride.status)
                  ? '#10B981'
                  : '#F59E0B',
                border: `1px solid ${['STARTED', 'COMPLETED'].includes(ride.status)
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(245, 158, 11, 0.3)'}`,
                fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace'
              }}
              title={['STARTED', 'COMPLETED'].includes(ride.status) ? "Verified Start OTP" : "Active Start OTP"}
            >
              <KeyRound size={11} />
              <span style={{ fontSize: '10px', opacity: 0.85 }}>OTP</span>
              <strong style={{ letterSpacing: '0.8px' }}>{ride.otp}</strong>
            </span>
          )}
        </div>

        <StatusBadge status={ride.status} size="sm" />
      </div>

      {/* Route: Pickup & Destination */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <MapPin size={14} color="#10B981" style={{ marginTop: '3px', flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: 'var(--text-primary, #F8FAFC)', lineHeight: 1.3 }}>
            {ride.pickup_address || ride.pickup_stop || 'Pickup Location'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <Navigation size={14} color="var(--primary, #F59E0B)" style={{ marginTop: '3px', flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: 'var(--text-primary, #F8FAFC)', lineHeight: 1.3 }}>
            {ride.destination_address || ride.destination_stop || 'Destination Location'}
          </div>
        </div>
      </div>

      {/* Customer & Rider Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '8px',
          borderTop: '1px solid var(--border, #23314E)',
          fontSize: '12px',
          color: 'var(--text-secondary, #94A3B8)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <User size={13} color="var(--text-muted, #64748B)" />
          <span>{ride.customer_name || 'Passenger'}</span>
        </div>

        {ride.rider_name ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bike size={13} color="#10B981" />
            <span style={{ color: '#10B981', fontWeight: 600 }}>{ride.rider_name}</span>
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted, #64748B)', fontStyle: 'italic' }}>
            No rider assigned
          </span>
        )}
      </div>

      {/* Footer: Fare & Time */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted, #64748B)' }}>
          <Clock size={12} />
          <span>
            {ride.created_at ? new Date(ride.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#10B981' }}>
            ₹{fare.toFixed(2)}
          </span>
          {onSelect && <ChevronRight size={14} color="var(--text-muted, #64748B)" />}
        </div>
      </div>
    </div>
  );
}
export default RideCard;
