import React from 'react';
import {
  Bike,
  Star,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Car
} from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

export function DriverCard({
  driver,
  onCall,
  onViewDetails,
  className = '',
  style = {}
}) {
  if (!driver) return null;

  const isApproved = driver.verification_status === 'APPROVED';
  const isOnline = driver.is_online;
  const vehicleType = driver.vehicle_type || 'BIKE';

  return (
    <div
      style={{
        background: 'var(--bg-card, #131D31)',
        border: '1px solid var(--border, #23314E)',
        borderRadius: 'var(--radius-md, 10px)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        ...style
      }}
      className={`driver-card-ui ${className}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <img
            src={driver.profile_image || driver.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}
            alt={driver.name}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: `2px solid ${isOnline ? '#10B981' : 'var(--border, #23314E)'}`
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: isOnline ? '#10B981' : '#64748B',
              border: '2px solid var(--bg-card, #131D31)'
            }}
            title={isOnline ? 'Driver is Online' : 'Driver is Offline'}
          />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h4
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-primary, #F8FAFC)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {driver.name}
            </h4>
            {isApproved && (
              <ShieldCheck size={16} color="#10B981" title="KYC Verified Driver" />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--primary, #F59E0B)', fontWeight: 700 }}>
              <Star size={13} fill="currentColor" />
              <span>{parseFloat(driver.rating || 5.0).toFixed(1)}</span>
            </div>
            <span style={{ color: 'var(--border, #23314E)' }}>•</span>
            <span style={{ color: 'var(--text-muted, #64748B)' }}>
              {driver.total_rides || driver.rides_completed || 0} rides
            </span>
          </div>
        </div>
      </div>

      {/* Vehicle Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'var(--bg-input, #1E293B)',
          borderRadius: 'var(--radius-sm, 6px)',
          fontSize: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary, #94A3B8)' }}>
          {vehicleType === 'AUTO' || vehicleType === 'CAB' ? <Car size={14} /> : <Bike size={14} />}
          <span>{driver.vehicle_model || vehicleType}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)' }}>
          {driver.vehicle_number || driver.vehicle_plate || 'No Plate'}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {driver.phone && (
          <a
            href={`tel:${driver.phone}`}
            onClick={onCall}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10B981',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <Phone size={14} />
            <span>Call Driver</span>
          </a>
        )}

        {onViewDetails && (
          <button
            type="button"
            onClick={() => onViewDetails(driver)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'var(--bg-input, #1E293B)',
              border: '1px solid var(--border, #23314E)',
              color: 'var(--text-primary, #F8FAFC)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            Profile & KYC
          </button>
        )}
      </div>
    </div>
  );
}
export default DriverCard;
