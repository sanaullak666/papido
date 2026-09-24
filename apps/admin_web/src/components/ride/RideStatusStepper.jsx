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
  className = '',
  style = {}
}) {
  const statusConfig = getRideStatus(currentStatus);
  const isCancelled = statusConfig.key === 'cancelled';

  if (isCancelled) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm, 6px)',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.35)',
          color: '#F43F5E',
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
        padding: '16px 8px',
        overflowX: 'auto',
        ...style
      }}
      className={`ride-status-stepper-ui ${className}`}
    >
      {STEPS.map((step, index) => {
        const StepIcon = step.icon;
        const isPast = currentIndex > index;
        const isCurrent = currentIndex === index;
        const isFuture = currentIndex < index;

        let circleColor = 'var(--text-muted, #64748B)';
        let circleBg = 'var(--bg-input, #1E293B)';
        let circleBorder = 'var(--border, #23314E)';
        let labelColor = 'var(--text-muted, #64748B)';

        if (isPast) {
          circleColor = '#10B981';
          circleBg = 'rgba(16, 185, 129, 0.15)';
          circleBorder = '#10B981';
          labelColor = '#10B981';
        } else if (isCurrent) {
          circleColor = '#0F172A';
          circleBg = 'var(--primary, #F59E0B)';
          circleBorder = 'var(--primary, #F59E0B)';
          labelColor = 'var(--primary, #F59E0B)';
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
                minWidth: '64px',
                textAlign: 'center',
                position: 'relative'
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
                  boxShadow: isCurrent ? '0 0 12px rgba(245, 158, 11, 0.4)' : 'none'
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
                  height: '2px',
                  background: isPast ? '#10B981' : 'var(--border, #23314E)',
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
