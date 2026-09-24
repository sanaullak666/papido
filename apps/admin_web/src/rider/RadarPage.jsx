import React from 'react';
import './RadarPage.css';
import { useRider } from './shared/RiderContext';
import {
  calcDriverSplit,
  formatRideDateTime,
  isScheduledTimeReached,
  getScheduleGapConflict,
  getMapLink
} from './shared/riderConstants';
import {
  Radio,
  Bike,
  Power,
  Volume2,
  VolumeX,
  Zap,
  Users,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Clock,
  ExternalLink,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { RPButton } from './shared/RiderUI';
import { alertManager } from '../utils/alertManager';

export function RadarPage({ onNavigateTab }) {
  const {
    isOnline,
    handleToggleOnline,
    soundEnabled,
    setSoundEnabled,
    kycStatus,
    activeRide,
    incomingRequests,
    acceptingRideId,
    actionLoading,
    handleAcceptRequest,
    handleDeclineRequest,
    reservedScheduledRides
  } = useRider();

  return (
    <div className="rp-content rp-content--narrow">
      <div className="rp-surface rp-fade-up">
        {/* Active trip quick peek if running */}
        {activeRide && (
          <div className="rp-active-quick rp-fade-up">
            <div className="rp-active-quick-left">
              <div className="rp-active-quick-icon">
                <Bike size={22} />
              </div>
              <div>
                <div className="rp-active-quick-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>ACTIVE TRIP IN PROGRESS</span>
                  <span className="rp-tag rp-tag--code">#{activeRide.ride_code || activeRide.rideCode || ('PAP-' + activeRide.id)}</span>
                </div>
                <div className="rp-active-quick-title">
                  {activeRide.pickup_address} → {activeRide.destination_address}
                </div>
                <div className="rp-active-quick-sub">
                  Passenger: <strong>{activeRide.customer_name || 'Passenger'}</strong> · Collect Fare:{' '}
                  <strong>₹{activeRide.total_fare || activeRide.final_fare || 20}</strong>
                </div>
              </div>
            </div>
            <RPButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onNavigateTab && onNavigateTab('active')}
            >
              Open Trip <ArrowRight size={14} />
            </RPButton>
          </div>
        )}

        {/* KYC Verification warning if not approved */}
        {kycStatus !== 'APPROVED' && (
          <div className={`rp-kyc-warning ${kycStatus === 'PENDING' ? 'is-pending' : 'is-rejected'} rp-fade-up`}>
            <ShieldAlert size={26} />
            <div>
              <div className="rp-kyc-warning-title">
                {kycStatus === 'PENDING' ? 'KYC Verification Pending Review' : 'KYC Verification Rejected'}
              </div>
              <div className="rp-kyc-warning-sub">
                {kycStatus === 'PENDING'
                  ? 'Your uploaded documents (Campus ID, Driving Licence, and RC) are under review by Campus Admin. You will be able to go online and accept rides once approved.'
                  : 'Your driver documents were not approved by the admin. Please update your details in the Vehicle & KYC tab.'}
              </div>
            </div>
          </div>
        )}

        {/* Heading Block */}
        <div className="rp-heading-block">
          <h2 className="rp-heading">Driver Dispatch Radar</h2>
          <p className="rp-subheading">
            {isOnline
              ? 'You are ONLINE and listening for nearby student requests across campus in real time.'
              : 'You are OFFLINE. Toggle your duty status online to start receiving rides.'}
          </p>
        </div>

        {/* Sound alerts bar */}
        <div className={`rp-sound-bar ${soundEnabled ? 'is-on' : 'is-off'}`}>
          <div className="rp-sound-bar-left">
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Ride Sound & Chime Alerts: ACTIVE' : 'Ride Sounds Muted'}</span>
          </div>
          <div className="rp-sound-bar-actions">
            <RPButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => alertManager.playOneShot()}
            >
              <Volume2 size={13} /> Test Chime
            </RPButton>
            <RPButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? 'Mute' : 'Unmute'}
            </RPButton>
          </div>
        </div>

        {/* Reserved trips quick peek */}
        {!activeRide && reservedScheduledRides && reservedScheduledRides.length > 0 && (
          <div className="rp-reserved-card rp-fade-up">
            <div className="rp-reserved-header">
              <div className="rp-reserved-title">
                <Calendar size={15} /> UPCOMING CONFIRMED TRIPS ({reservedScheduledRides.length})
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('scheduled')}
                className="rp-text-link"
              >
                View All <ArrowRight size={12} />
              </button>
            </div>

            {reservedScheduledRides.slice(0, 2).map((sr) => {
              const isTimeReady = isScheduledTimeReached(sr.scheduled_time_ist || sr.scheduled_time, 15);
              return (
                <div key={`radar-sr-${sr.id}`} className="rp-reserved-row">
                  <div className="rp-reserved-row-head">
                    <div className="rp-reserved-row-code-row">
                      <span className="rp-ride-code">{sr.ride_code || `PAP-${sr.id}`}</span>
                      <span className="rp-reserved-time">
                        Pickup: {formatRideDateTime(sr.scheduled_time_ist || sr.scheduled_time)}
                      </span>
                    </div>
                    <span className="rp-reserved-fare">₹{sr.total_fare || 20}</span>
                  </div>
                  <div className="rp-reserved-route">
                    <strong>{sr.pickup_address}</strong> → {sr.destination_address}
                  </div>
                  <div className="rp-reserved-row-foot">
                    <span>Passenger: {sr.customer_name || 'Passenger'}</span>
                    <RPButton
                      type="button"
                      size="sm"
                      variant={isTimeReady ? 'success' : 'ghost'}
                      disabled={!isTimeReady}
                      onClick={() => onNavigateTab && onNavigateTab('scheduled')}
                    >
                      {isTimeReady ? 'Start Trip Now' : 'Opens at Booked Time'}
                    </RPButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Incoming Requests List */}
        {!activeRide && incomingRequests.length > 0 && (
          <div className="rp-requests-stack">
            <div className="rp-requests-stack-head">
              <span className="rp-requests-stack-label">
                <Zap size={14} /> AVAILABLE REQUESTS ({incomingRequests.length})
              </span>
              <span className="rp-requests-stack-hint">Select a ride to accept</span>
            </div>

            {incomingRequests.map((req) => {
              const split = calcDriverSplit(req.total_fare);
              const pickupTimeVal = req.scheduled_time_ist || req.scheduled_time || req.scheduledTime;
              const conflict = getScheduleGapConflict(pickupTimeVal, reservedScheduledRides);

              return (
                <div
                  key={req.id}
                  className={`rp-request-card rp-fade-up ${conflict ? 'has-conflict' : ''}`}
                >
                  <div className="rp-request-head">
                    <div>
                      <div className="rp-request-name">{req.customer_name || 'Passenger'}</div>
                      <div className="rp-request-tags">
                        <span className="rp-tag rp-tag--code">#{req.ride_code || req.rideCode || ('PAP-' + req.id)}</span>
                        <span className="rp-tag rp-tag--amber">{req.vehicle_type || 'BIKE'}</span>
                        {Boolean(req.is_outside) && <span className="rp-tag rp-tag--indigo">OUTSIDE CAMPUS</span>}
                        {Boolean(req.is_double_ride) && (
                          <span className="rp-tag rp-tag--amber-soft">
                            <Users size={11} /> Double Ride
                          </span>
                        )}
                        {Boolean(req.is_scheduled) && (
                          <span className="rp-tag rp-tag--blue">
                            <Calendar size={11} /> PRE-BOOKED
                          </span>
                        )}
                        {Boolean(pickupTimeVal) && (
                          <span className="rp-tag rp-tag--amber-border">
                            <Clock size={11} /> {formatRideDateTime(pickupTimeVal)}
                          </span>
                        )}
                        {Boolean(conflict) && (
                          <span className="rp-tag rp-tag--rose">
                            <AlertTriangle size={11} /> Conflict with {conflict.conflictingRideCode}
                          </span>
                        )}
                        {Boolean(req.female_rider_only) && (
                          <span className="rp-tag rp-tag--pink">
                            <ShieldCheck size={11} /> Female Rider Only
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rp-request-fare-block">
                      <div className="rp-request-fare-value">₹{req.total_fare}</div>
                      <div className="rp-request-fare-net">Your Net: ₹{split.rider}</div>
                    </div>
                  </div>

                  <div className="rp-request-route">
                    {Boolean(pickupTimeVal) && (
                      <div className="rp-request-time-callout">
                        <Clock size={13} />
                        <span>Requested Pickup Time: <strong>{formatRideDateTime(pickupTimeVal)}</strong></span>
                      </div>
                    )}

                    <div className="rp-request-route-row">
                      <div><span className="rp-dot rp-dot--green" /> <strong>Pickup:</strong> {req.pickup_address}</div>
                      <a
                        href={getMapLink(req.pickup_address, req.pickup_latitude, req.pickup_longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rp-map-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={11} /> Maps
                      </a>
                    </div>

                    {req.via_address && (
                      <div className="rp-request-route-row">
                        <div><span className="rp-dot rp-dot--amber" /> <strong>Via:</strong> {req.via_address}</div>
                        <a
                          href={getMapLink(req.via_address, req.via_latitude, req.via_longitude)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rp-map-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={11} /> Maps
                        </a>
                      </div>
                    )}

                    <div className="rp-request-route-row">
                      <div><span className="rp-dot rp-dot--rose" /> <strong>Drop:</strong> {req.destination_address}</div>
                      <a
                        href={getMapLink(req.destination_address, req.destination_latitude, req.destination_longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rp-map-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={11} /> Maps
                      </a>
                    </div>

                    <div className="rp-request-route-footer">
                      <span>Collect Cash at Drop: <strong>₹{req.total_fare}</strong></span>
                      <span>Platform Fee: ₹{Number(split.platformFee ?? 4).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="rp-request-actions">
                    <RPButton
                      type="button"
                      variant="danger-soft"
                      onClick={() => handleDeclineRequest(req.id)}
                    >
                      Decline
                    </RPButton>
                    <RPButton
                      type="button"
                      variant={conflict ? 'ghost' : 'success'}
                      size="lg"
                      style={{ flex: 2 }}
                      disabled={acceptingRideId !== null || actionLoading || Boolean(conflict)}
                      loading={acceptingRideId === req.id}
                      onClick={() => handleAcceptRequest(req.id)}
                    >
                      {conflict ? 'Time Conflict' : 'Accept Ride Now'}
                    </RPButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!activeRide && incomingRequests.length === 0 && (
          <div className="rp-radar-empty rp-fade-up">
            {isOnline ? (
              <>
                <div className="rp-radar-empty-icon is-live">
                  <Radio size={32} />
                </div>
                <div className="rp-radar-empty-title">
                  Dispatch Radar Active &amp; Scanning...
                </div>
                <div className="rp-radar-empty-sub">
                  Listening for student ride requests across Pondicherry University campus in real time. Keep this screen active.
                </div>
              </>
            ) : (
              <>
                <div className="rp-radar-empty-icon is-off">
                  <Power size={30} />
                </div>
                <div className="rp-radar-empty-title">
                  You Are Currently Offline
                </div>
                <div className="rp-radar-empty-sub">
                  Toggle your status online to start receiving campus ride requests and earning with Papido.
                </div>
                <RPButton
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={handleToggleOnline}
                >
                  <Power size={16} /> Go Online Now
                </RPButton>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export default RadarPage;
