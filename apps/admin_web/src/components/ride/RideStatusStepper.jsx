import React from 'react';
import {
  Clock,
  UserCheck,
  Navigation,
  MapPin,
  ShieldCheck,
  Compass,
  CheckCircle2,
  XCircle,
  Check
} from 'lucide-react';
import { getRideStatus, RIDE_PROGRESSION_ORDER } from '../../design/statusConfig';

const STEPS = [
  { key: 'requested', label: 'Requested', icon: Clock },
  { key: 'assigned', label: 'Assigned', icon: UserCheck },
  { key: 'arriving', label: 'Arriving', icon: Navigation },
  { key: 'reached', label: 'Reached', icon: MapPin },
  { key: 'otp_verified', label: 'OTP Verified', icon: ShieldCheck },
  { key: 'in_progress', label: 'In Progress', icon: Compass },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 }
];

export function RideStatusStepper({
  currentStatus,
  variant = 'auto',
  className = '',
  style = {}
}) {
  const statusConfig = getRideStatus(currentStatus);
  const isCancelled = statusConfig.key === 'cancelled';
  const isWarm = variant === 'warm' || (variant === 'auto' && typeof document !== 'undefined' && document.querySelector('.passenger-shell'));

  if (isCancelled) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: 'var(--papido-radius-md, 12px)',
          background: isWarm ? 'rgba(220, 38, 38, 0.08)' : 'rgba(244, 63, 94, 0.12)',
          border: `1px solid ${isWarm ? 'rgba(220, 38, 38, 0.25)' : 'rgba(244, 63, 94, 0.35)'}`,
          color: isWarm ? '#DC2626' : '#F43F5E',
          fontSize: '13px',
          fontWeight: 600,
          ...style
        }}
        className={`stepper-cancelled ${className}`}
      >
        <XCircle size={18} />
        <div>
          <span style={{ fontWeight: 700 }}>Trip Cancelled:</span> This ride was cancelled before completion.
        </div>
      </div>
    );
  }

  const currentIndex = RIDE_PROGRESSION_ORDER.indexOf(statusConfig.key);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '16px 4px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        ...style
      }}
      className={`ride-status-stepper-ui ${isWarm ? 'is-warm' : 'is-dark'} ${className}`}
    >
      {STEPS.map((step, index) => {
        const StepIcon = step.icon;
        const isPast = currentIndex > index;
        const isCurrent = currentIndex === index;

        let circleColor = isWarm ? '#8E7166' : 'var(--papido-text-dim, #64748B)';
        let circleBg = isWarm ? '#FFF1E8' : 'var(--papido-surface, #131D31)';
        let circleBorder = isWarm ? '#E2BFB2' : 'var(--papido-border, #23314E)';
        let labelColor = isWarm ? '#5A4138' : 'var(--papido-text-muted, #94A3B8)';

        if (isPast) {
          circleColor = isWarm ? '#00855B' : '#10B981';
          circleBg = isWarm ? 'rgba(0, 133, 91, 0.12)' : 'rgba(16, 185, 129, 0.15)';
          circleBorder = isWarm ? '#00855B' : '#10B981';
          labelColor = isWarm ? '#00855B' : '#10B981';
        } else if (isCurrent) {
          circleColor = isWarm ? '#FFFFFF' : '#0F172A';
          circleBg = isWarm ? '#EA580C' : 'var(--papido-primary, #F59E0B)';
          circleBorder = isWarm ? '#EA580C' : 'var(--papido-primary, #F59E0B)';
          labelColor = isWarm ? '#EA580C' : 'var(--papido-primary, #F59E0B)';
        }

        return (
          <React.Fragment key={step.key}>
            {/* Step Node */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                minWidth: '56px',
                textAlign: 'center',
                position: 'relative',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: circleBg,
                  border: `2px solid ${circleBorder}`,
                  color: circleColor,
                  fontWeight: 700,
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                  boxShadow: isCurrent ? (isWarm ? '0 0 12px rgba(234, 88, 12, 0.35)' : '0 0 12px rgba(245, 158, 11, 0.4)') : 'none'
                }}
              >
                {isPast ? <Check size={16} /> : <StepIcon size={15} />}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isCurrent ? 700 : 500,
                  color: labelColor,
                  whiteSpace: 'nowrap'
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connecting Line */}
            {index < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  minWidth: '12px',
                  height: '2px',
                  background: isPast ? (isWarm ? '#00855B' : '#10B981') : (isWarm ? '#E2BFB2' : 'var(--papido-border, #23314E)'),
                  margin: '0 4px',
                  marginBottom: '18px',
                  transition: 'background 0.2s ease'
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
export default RideStatusStepper;
