import React from 'react';
import './ActiveTripPage.css';
import { useRider } from './shared/RiderContext';
import { calcDriverSplit, formatRideDateTime, getMapLink } from './shared/riderConstants';
import { RideStatusStepper } from '../components/ride/RideStatusStepper';
import { RPButton } from './shared/RiderUI';
import {
  Bike,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Radio,
  X
} from 'lucide-react';

export function ActiveTripPage({ onNavigateTab }) {
  const {
    activeRide,
    setActiveRide,
    actionLoading,
    handleStatusChange,
    handleToggleWaiting,
    waitingLoading,
    handleCancelActiveTrip,
    enteredOtp,
    setEnteredOtp,
    otpError,
    setOtpError
  } = useRider();

  if (!activeRide) {
    return (
      <div className="rp-content rp-content--narrow">
        <div className="rp-empty rp-fade-up">
          <div className="rp-empty-icon">
            <Bike size={32} />
          </div>
          <h3 className="rp-empty-title">No Active Trip In Progress</h3>
          <p className="rp-empty-sub">
            You do not have an ongoing trip right now. Go to the Dispatch Radar to view and accept incoming ride requests.
          </p>
          <RPButton
            type="button"
            variant="primary"
            size="lg"
            onClick={() => onNavigateTab && onNavigateTab('radar')}
          >
            <Radio size={16} /> Go to Dispatch Radar
          </RPButton>
        </div>
      </div>
    );
  }
  const [elapsedSec, setElapsedSec] = React.useState(0);

  React.useEffect(() => {
    if (!activeRide) return;
    const startTimeStr = activeRide.started_at || activeRide.accepted_at || activeRide.created_at;
    const startMs = startTimeStr ? new Date(startTimeStr).getTime() : Date.now();

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - startMs) / 1000));
      setElapsedSec(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeRide?.id, activeRide?.status]);

  const formatElapsed = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const pickupTimeVal = activeRide.scheduled_time_ist || activeRide.scheduled_time || activeRide.scheduledTime;
  const fare = activeRide.total_fare || activeRide.final_fare || activeRide.estimated_fare || 20;
  const split = calcDriverSplit(fare);
  const waitingMins = Number(activeRide.waiting_minutes || 0);
  const isPaidWaiting = waitingMins >= 10;
  const freeMinsRemaining = Math.max(0, 10 - waitingMins);

  const isHeadingToPickup = activeRide.status === 'ACCEPTED' || activeRide.status === 'RIDER_ARRIVING';
  const isAtPickup = activeRide.status === 'RIDER_REACHED';
  const isEnRoute = activeRide.status === 'STARTED';

  return (
    <div className="rp-content rp-content--narrow">
      <div className="rp-surface rp-surface--trip rp-fade-up">
        {/* Trip Code & Live Operational Timer Bar */}
        <div className="rp-trip-code-bar">
          <div className="rp-trip-code-left">
            <span className="rp-trip-code-label">ACTIVE TRIP</span>
            <span className="rp-trip-code-val">#{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="font-mono text-xs font-bold text-muted flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '6px' }}>
              <Clock size={12} color="#F59E0B" /> {formatElapsed(elapsedSec)}
            </span>
            <span className="rp-trip-status-tag">{String(activeRide.status || '').replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* Cash to collect at drop banner */}
        <div className="rp-cash-card rp-fade-up">
          <div>
            <div className="rp-cash-label">CASH TO COLLECT AT DROP:</div>
            <div className="rp-cash-value">₹{fare}</div>
            {Boolean(activeRide.waiting_fare > 0) && (
              <div className="rp-cash-waiting">
                Includes ₹{activeRide.waiting_fare} waiting charge ({waitingMins} mins)
              </div>
            )}
          </div>
          <div className="rp-cash-right">
            <div className="rp-cash-net">
              Net Pay: ₹{activeRide.rider_earning || split.rider}
            </div>
            <div className="rp-cash-fee">
              Platform Fee: ₹{activeRide.company_earning || split.company}
              {split.controller > 0 && ` + ₹${split.controller} Ctrl`}
            </div>
          </div>
        </div>

        {/* DOMINANT PRIMARY NEXT ACTION DOCK */}
        <div className="rp-next-action-hero rp-fade-up" style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '2px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F59E0B' }}>
              CURRENT MISSION STEP
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
              {isHeadingToPickup ? 'Navigate to Passenger' : isAtPickup ? 'Verify & Board' : isEnRoute ? 'Transit to Destination' : 'Complete'}
            </span>
          </div>

          {activeRide.status === 'ACCEPTED' && (
            <RPButton
              type="button"
              variant="primary"
              size="lg"
              block
              loading={actionLoading}
              onClick={() => handleStatusChange('RIDER_ARRIVING')}
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: 800 }}
            >
              <Bike size={20} />
              <span>I AM ON THE WAY (ARRIVING)</span>
            </RPButton>
          )}

          {activeRide.status === 'RIDER_ARRIVING' && (
            <RPButton
              type="button"
              variant="primary"
              size="lg"
              block
              loading={actionLoading}
              onClick={() => handleStatusChange('RIDER_REACHED')}
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: 800 }}
            >
              <MapPin size={20} />
              <span>I'VE REACHED PICKUP LOCATION</span>
            </RPButton>
          )}

          {activeRide.status === 'RIDER_REACHED' && (
            <div className="rp-otp-verify rp-fade-up" style={{ width: '100%', padding: '16px', background: '#FFFFFF', borderRadius: '14px' }}>
              <div className="rp-otp-verify-head" style={{ marginBottom: '12px' }}>
                <div className="rp-otp-verify-label" style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  Ask Passenger for 4-Digit Ride OTP
                </div>
                <div className="rp-otp-verify-sub" style={{ fontSize: '12px', color: '#64748B' }}>
                  Displayed on the passenger's screen
                </div>
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="off"
                placeholder="••••"
                className="rp-otp-input"
                style={{
                  fontSize: '28px',
                  letterSpacing: '10px',
                  textAlign: 'center',
                  fontWeight: 900,
                  height: '56px',
                  borderRadius: '12px',
                  border: '2px solid #F59E0B',
                  marginBottom: '12px'
                }}
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
              <RPButton
                type="button"
                variant={enteredOtp.length === 4 ? 'success' : 'ghost'}
                size="lg"
                block
                disabled={actionLoading || enteredOtp.length !== 4}
                loading={actionLoading}
                onClick={() => handleStatusChange('STARTED')}
                style={{ minHeight: '54px' }}
              >
                <CheckCircle2 size={20} />
                <span>Verify OTP &amp; Start Trip</span>
              </RPButton>
            </div>
          )}

          {activeRide.status === 'STARTED' && (
            <RPButton
              type="button"
              variant="success"
              size="lg"
              block
              loading={actionLoading}
              onClick={() => handleStatusChange('COMPLETED')}
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: 800 }}
            >
              <CheckCircle size={20} />
              <span>REACHED DESTINATION &amp; COMPLETE TRIP</span>
            </RPButton>
          )}
        </div>

        {/* Passenger Contact Card */}
        <div className="rp-passenger-card">
          <div>
            <div className="rp-passenger-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{activeRide.customer_name || 'Passenger'}</span>
              <span style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                ★ 4.8
              </span>
            </div>
            <div className="rp-passenger-sub">Campus Passenger</div>
          </div>
          {activeRide.customer_phone && (
            <a href={`tel:${activeRide.customer_phone}`} className="rp-btn rp-btn--success rp-btn--sm" style={{ minHeight: '44px', padding: '0 16px' }}>
              <Phone size={15} /> Call Passenger
            </a>
          )}
        </div>

        {/* Waiting Control (Visible once rider reached pickup or during trip) */}
        {(activeRide.status === 'RIDER_REACHED' || activeRide.status === 'STARTED') && (
          <div className={`rp-waiting-card ${activeRide.is_waiting ? 'is-active' : ''}`} style={{
            borderLeft: isPaidWaiting ? '4px solid #EF4444' : (activeRide.is_waiting ? '4px solid #F59E0B' : '1px solid var(--rp-border)')
          }}>
            <div className="rp-waiting-card-head">
              <div className="rp-waiting-card-left">
                <div className={`rp-waiting-card-icon ${activeRide.is_waiting ? 'is-active' : ''}`}>
                  <Clock size={16} />
                </div>
                <div>
                  <div className="rp-waiting-card-title">
                    {activeRide.is_waiting
                      ? (isPaidWaiting ? 'WAITING CHARGE ACTIVE (₹10/10 min)' : 'FREE WAITING ACTIVE')
                      : 'Trip Waiting Timer'}
                  </div>
                  <div className="rp-waiting-card-sub">
                    {isPaidWaiting
                      ? `Paid waiting tier: +₹${activeRide.waiting_fare || 10} added to drop fare`
                      : `Policy: 0–9 mins free (${freeMinsRemaining} mins free remaining)`}
                  </div>
                </div>
              </div>
              {Boolean(activeRide.is_waiting) && (
                <span className={`rp-waiting-tag ${isPaidWaiting ? 'is-paid' : ''}`}>
                  {isPaidWaiting ? 'PAID WAITING' : 'FREE WAITING'}
                </span>
              )}
            </div>

            <div className="rp-waiting-card-body">
              <div>
                <div className="rp-waiting-recorded-label">Waiting Elapsed:</div>
                <div className="rp-waiting-recorded-value">
                  {waitingMins} mins {Boolean(activeRide.waiting_fare > 0) && `(+₹${activeRide.waiting_fare})`}
                </div>
              </div>
              <RPButton
                type="button"
                size="sm"
                variant={activeRide.is_waiting ? 'danger' : 'primary'}
                disabled={waitingLoading}
                loading={waitingLoading}
                onClick={handleToggleWaiting}
                style={{ minHeight: '44px' }}
              >
                <Clock size={14} />
                {activeRide.is_waiting ? 'Stop Waiting Timer' : 'Start Waiting Timer'}
              </RPButton>
            </div>
          </div>
        )}

        {/* Route Details Card with Direct Navigation Highlights */}
        <div className="rp-route-card">
          {Boolean(pickupTimeVal) && (
            <div className="rp-route-time-callout">
              <Clock size={14} />
              <span>Requested Pickup Time: <strong>{formatRideDateTime(pickupTimeVal)}</strong></span>
            </div>
          )}

          {/* Pickup Waypoint */}
          <div className="rp-route-row" style={{
            background: isHeadingToPickup ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
            padding: '10px 12px',
            borderRadius: '10px',
            border: isHeadingToPickup ? '1px solid rgba(16, 185, 129, 0.3)' : 'none'
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>
                Pickup Location {isHeadingToPickup && '• CURRENT TARGET'}
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px', wordBreak: 'break-word' }}>
                {activeRide.pickup_address}
              </div>
            </div>
            <a
              href={getMapLink(activeRide.pickup_address, activeRide.pickup_latitude, activeRide.pickup_longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="rp-map-link rp-map-link--lg rp-btn rp-btn--primary rp-btn--sm"
              style={{ minHeight: '40px', padding: '0 12px' }}
            >
              <ExternalLink size={13} /> Open Nav
            </a>
          </div>

          {activeRide.via_address && (
            <div className="rp-route-row" style={{ padding: '8px 12px' }}>
              <div><span className="rp-dot rp-dot--amber" /> <strong>Via:</strong> {activeRide.via_address}</div>
              <a
                href={getMapLink(activeRide.via_address, activeRide.via_latitude, activeRide.via_longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="rp-map-link"
              >
                <ExternalLink size={12} /> Via Nav
              </a>
            </div>
          )}

          {/* Drop Waypoint */}
          <div className="rp-route-row" style={{
            background: isEnRoute ? 'rgba(244, 63, 94, 0.08)' : 'transparent',
            padding: '10px 12px',
            borderRadius: '10px',
            border: isEnRoute ? '1px solid rgba(244, 63, 94, 0.3)' : 'none'
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#F43F5E', textTransform: 'uppercase' }}>
                Drop-off Destination {isEnRoute && '• CURRENT TARGET'}
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px', wordBreak: 'break-word' }}>
                {activeRide.destination_address}
              </div>
            </div>
            <a
              href={getMapLink(activeRide.destination_address, activeRide.destination_latitude, activeRide.destination_longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="rp-map-link rp-map-link--lg rp-btn rp-btn--primary rp-btn--sm"
              style={{ minHeight: '40px', padding: '0 12px' }}
            >
              <ExternalLink size={13} /> Open Nav
            </a>
          </div>
        </div>

        {/* OTP Error Banner (Glass Pill style) */}
        {otpError && (
          <div className="rp-status-banner is-error" role="status" aria-live="polite">
            <span className="rp-banner-icon" aria-hidden="true">
              <AlertCircle size={18} />
            </span>
            <span className="rp-banner-text">{otpError}</span>
            <button
              type="button"
              className="rp-banner-close"
              onClick={() => setOtpError(null)}
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Stepper */}
        <div className="rp-stepper-card">
          <div className="rp-stepper-card-label">Trip Progression</div>
          <RideStatusStepper currentStatus={activeRide.status} variant="dark" />
        </div>

        {activeRide.status === 'COMPLETED' && (
          <div className="rp-trip-complete rp-fade-up">
            <CheckCircle size={48} color="#10B981" />
            <h3 className="rp-trip-complete-title">Trip Completed &amp; Settled!</h3>
            <div className="rp-trip-code-val" style={{ margin: '4px 0 12px', display: 'inline-block' }}>
              #{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}
            </div>

            <div className="rp-trip-complete-summary">
              <div className="rp-trip-complete-label">CASH TO COLLECT FROM PASSENGER:</div>
              <div className="rp-trip-complete-value">₹{fare}</div>
              <div className="rp-trip-complete-net">
                Your Net Take-Home: ₹{activeRide.rider_earning || split.rider}
              </div>
            </div>

            <RPButton
              type="button"
              variant="primary"
              size="lg"
              block
              onClick={() => {
                setActiveRide(null);
                setEnteredOtp('');
                if (onNavigateTab) onNavigateTab('radar');
              }}
            >
              Return to Radar for Next Trip
            </RPButton>
          </div>
        )}

        {/* Emergency trip cancellation before ride starts */}
        {['ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED'].includes(activeRide.status) && (
          <RPButton
            type="button"
            variant="danger-soft"
            block
            disabled={actionLoading}
            onClick={handleCancelActiveTrip}
            style={{ minHeight: '44px' }}
          >
            Cancel Trip (Driver Emergency)
          </RPButton>
        )}
      </div>
    </div>
  );
}
export default ActiveTripPage;
