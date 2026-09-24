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

  const pickupTimeVal = activeRide.scheduled_time_ist || activeRide.scheduled_time || activeRide.scheduledTime;
  const fare = activeRide.total_fare || activeRide.final_fare || activeRide.estimated_fare || 20;
  const split = calcDriverSplit(fare);

  return (
    <div className="rp-content rp-content--narrow">
      <div className="rp-surface rp-surface--trip rp-fade-up">
        {/* Trip Code & Status Bar */}
        <div className="rp-trip-code-bar">
          <div className="rp-trip-code-left">
            <span className="rp-trip-code-label">TRIP CODE</span>
            <span className="rp-trip-code-val">#{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}</span>
          </div>
          <span className="rp-trip-status-tag">{String(activeRide.status || '').replace('_', ' ')}</span>
        </div>

        {/* Cash to collect at drop banner */}
        <div className="rp-cash-card rp-fade-up">
          <div>
            <div className="rp-cash-label">CASH TO COLLECT AT DROP:</div>
            <div className="rp-cash-value">₹{fare}</div>
            {Boolean(activeRide.waiting_fare > 0) && (
              <div className="rp-cash-waiting">
                Includes ₹{activeRide.waiting_fare} waiting charge ({activeRide.waiting_minutes || 0} mins)
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

        {/* Passenger Contact Card */}
        <div className="rp-passenger-card">
          <div>
            <div className="rp-passenger-name">{activeRide.customer_name || 'Passenger'}</div>
            <div className="rp-passenger-sub">Campus Passenger</div>
          </div>
          {activeRide.customer_phone && (
            <a href={`tel:${activeRide.customer_phone}`} className="rp-btn rp-btn--success rp-btn--sm">
              <Phone size={14} /> Call Passenger
            </a>
          )}
        </div>

        {/* Waiting Control (only visible once trip is STARTED) */}
        {activeRide.status === 'STARTED' && (
          <div className={`rp-waiting-card ${activeRide.is_waiting ? 'is-active' : ''}`}>
            <div className="rp-waiting-card-head">
              <div className="rp-waiting-card-left">
                <div className={`rp-waiting-card-icon ${activeRide.is_waiting ? 'is-active' : ''}`}>
                  <Clock size={16} />
                </div>
                <div>
                  <div className="rp-waiting-card-title">
                    {activeRide.is_waiting ? 'DRIVER ON WAITING MODE' : 'Trip Waiting Controls'}
                  </div>
                  <div className="rp-waiting-card-sub">
                    Policy: 0–9 mins free, ₹10 added for every 10 full minutes of waiting
                  </div>
                </div>
              </div>
              {Boolean(activeRide.is_waiting) && (
                <span className="rp-waiting-tag">ON WAITING</span>
              )}
            </div>

            <div className="rp-waiting-card-body">
              <div>
                <div className="rp-waiting-recorded-label">Total Waiting Recorded:</div>
                <div className="rp-waiting-recorded-value">
                  {activeRide.waiting_minutes || 0} mins (+₹{activeRide.waiting_fare || 0} added)
                </div>
              </div>
              <RPButton
                type="button"
                size="sm"
                variant={activeRide.is_waiting ? 'danger' : 'primary'}
                disabled={waitingLoading}
                loading={waitingLoading}
                onClick={handleToggleWaiting}
              >
                <Clock size={14} />
                {activeRide.is_waiting ? 'Stop Waiting' : 'Start Waiting Timer'}
              </RPButton>
            </div>
          </div>
        )}

        {/* Route Details Card */}
        <div className="rp-route-card">
          {Boolean(pickupTimeVal) && (
            <div className="rp-route-time-callout">
              <Clock size={14} />
              <span>Requested Pickup Time: <strong>{formatRideDateTime(pickupTimeVal)}</strong></span>
            </div>
          )}

          <div className="rp-route-row">
            <div><span className="rp-dot rp-dot--green" /> <strong>Pickup:</strong> {activeRide.pickup_address}</div>
            <a
              href={getMapLink(activeRide.pickup_address, activeRide.pickup_latitude, activeRide.pickup_longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="rp-map-link rp-map-link--lg"
            >
              <ExternalLink size={12} /> Navigate Pickup
            </a>
          </div>

          {activeRide.via_address && (
            <div className="rp-route-row">
              <div><span className="rp-dot rp-dot--amber" /> <strong>Via:</strong> {activeRide.via_address}</div>
              <a
                href={getMapLink(activeRide.via_address, activeRide.via_latitude, activeRide.via_longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="rp-map-link rp-map-link--lg"
              >
                <ExternalLink size={12} /> Navigate Via Stop
              </a>
            </div>
          )}

          <div className="rp-route-row">
            <div><span className="rp-dot rp-dot--rose" /> <strong>Drop:</strong> {activeRide.destination_address}</div>
            <a
              href={getMapLink(activeRide.destination_address, activeRide.destination_latitude, activeRide.destination_longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="rp-map-link rp-map-link--lg"
            >
              <ExternalLink size={12} /> Navigate Drop
            </a>
          </div>
        </div>

        {/* OTP Error Banner (Glass Pill style) */}
        {otpError && (
          <div className="rp-status-banner is-error" role="status" aria-live="polite">
            <span className="rp-banner-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" strokeWidth="2.2" />
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2.2" />
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2.2" />
              </svg>
            </span>
            <span className="rp-banner-text">{otpError}</span>
            <button
              type="button"
              className="rp-banner-close"
              onClick={() => setOtpError(null)}
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24">
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </button>
          </div>
        )}

        {/* Stepper */}
        <div className="rp-stepper-card">
          <div className="rp-stepper-card-label">Trip Progression</div>
          <RideStatusStepper currentStatus={activeRide.status} />
        </div>

        {/* Step-by-Step Action Progression */}
        {activeRide.status === 'ACCEPTED' && (
          <RPButton
            type="button"
            variant="primary"
            size="lg"
            block
            loading={actionLoading}
            onClick={() => handleStatusChange('RIDER_ARRIVING')}
          >
            <Bike size={18} />
            <span>1. I am On The Way (Arriving)</span>
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
          >
            <MapPin size={18} />
            <span>2. Reached Pickup Location</span>
          </RPButton>
        )}

        {activeRide.status === 'RIDER_REACHED' && (
          <div className="rp-otp-verify rp-fade-up">
            <div className="rp-otp-verify-head">
              <div className="rp-otp-verify-label">Verify Passenger to Start Trip</div>
              <div className="rp-otp-verify-sub">Ask passenger for their 4-digit Ride OTP:</div>
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              name={`ride_otp_${activeRide.id}`}
              id={`ride_otp_${activeRide.id}`}
              placeholder="••••"
              className="rp-otp-input"
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
            >
              <CheckCircle2 size={18} />
              <span>3. Verify OTP &amp; Start Trip</span>
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
          >
            <CheckCircle size={18} />
            <span>4. Reached Destination &amp; Complete Trip</span>
          </RPButton>
        )}

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
          >
            Cancel Trip (Driver Emergency)
          </RPButton>
        )}
      </div>
    </div>
  );
}
export default ActiveTripPage;
