import React from 'react';
import './ScheduledRidesPage.css';
import { useRider } from './shared/RiderContext';
import {
  formatRideDateTime,
  isScheduledTimeReached,
  getScheduleGapConflict,
  calcDriverSplit
} from './shared/riderConstants';
import { RPButton } from './shared/RiderUI';
import {
  Calendar,
  RefreshCw,
  ShieldCheck,
  Radio,
  CheckCircle2,
  Phone,
  ArrowRight
} from 'lucide-react';

export function ScheduledRidesPage({ onNavigateTab }) {
  const {
    availableScheduledRides,
    reservedScheduledRides,
    loadingScheduled,
    fetchScheduledRides,
    handleAcceptScheduledRide,
    handleCancelScheduledRide,
    scheduledActionLoadingId,
    setActiveRide,
    showStatusBanner
  } = useRider();

  const handleStartScheduledTrip = (ride) => {
    const schedTime = ride.scheduled_time_ist || ride.scheduled_time;
    if (!isScheduledTimeReached(schedTime, 15)) {
      showStatusBanner({
        type: 'info',
        text: `This booking is scheduled for ${formatRideDateTime(schedTime)}. Active trip view will be enabled 15 minutes before the booked pickup time.`
      });
      return;
    }
    const fare = ride.total_fare || ride.final_fare || ride.estimated_fare || 20;
    const split = calcDriverSplit(fare);
    setActiveRide({
      ...ride,
      total_fare: fare,
      estimated_fare: fare,
      final_fare: fare,
      rider_earning: ride.rider_earning || split.rider,
      company_earning: ride.company_earning || split.company,
      controller_earning: ride.controller_earning || split.controller
    });
    if (onNavigateTab) onNavigateTab('active');
  };

  return (
    <div className="rp-content rp-content--wide">
      {/* Header */}
      <div className="rp-tab-header rp-tab-header--no-surface rp-fade-up">
        <div>
          <h2 className="rp-heading rp-heading--icon">
            <Calendar size={24} color="#EA580C" /> Advance Campus Pre-Bookings
          </h2>
          <p className="rp-subheading">
            Browse and claim passenger pre-booked trips hours or days in advance.
          </p>
        </div>
        <RPButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={loadingScheduled}
          onClick={fetchScheduledRides}
        >
          <RefreshCw size={14} className={loadingScheduled ? 'rp-spin' : ''} />
          <span>{loadingScheduled ? 'Refreshing...' : 'Refresh List'}</span>
        </RPButton>
      </div>

      {/* Metrics Row */}
      <div className="rp-metrics-row rp-fade-up">
        <div className="rp-metric-tile">
          <div className="rp-metric-tile-label">MY RESERVED SCHEDULE</div>
          <div className="rp-metric-tile-value rp-metric-tile-value--emerald">
            {reservedScheduledRides.length} <span>Trips Confirmed</span>
          </div>
        </div>

        <div className="rp-metric-tile">
          <div className="rp-metric-tile-label">OPEN PRE-BOOKINGS</div>
          <div className="rp-metric-tile-value rp-metric-tile-value--amber">
            {availableScheduledRides.length} <span>Available to Claim</span>
          </div>
        </div>
      </div>

      {/* Confirmed / Reserved Schedule */}
      <div className="rp-section rp-fade-up">
        <div className="rp-section-head">
          <ShieldCheck size={20} color="#10B981" />
          <h3 className="rp-section-title">
            My Confirmed Advance Schedule ({reservedScheduledRides.length})
          </h3>
        </div>

        {reservedScheduledRides.length === 0 ? (
          <div className="rp-empty-flat">
            <Calendar size={32} />
            <div className="rp-empty-flat-title">No advance trips reserved yet</div>
            <div className="rp-empty-flat-sub">
              Claim an open campus pre-booking below to lock in guaranteed trips for your schedule.
            </div>
          </div>
        ) : (
          <div className="rp-list">
            {reservedScheduledRides.map((sr, idx) => {
              const isTimeReady = isScheduledTimeReached(sr.scheduled_time_ist || sr.scheduled_time, 15);
              return (
                <div
                  key={`res-${sr.id}`}
                  className="rp-scheduled-card rp-scheduled-card--confirmed rp-fade-up"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="rp-scheduled-card-head">
                    <div>
                      <div className="rp-scheduled-card-tags">
                        <span className="rp-tag rp-tag--emerald">CONFIRMED TO YOU</span>
                        <span className="rp-tag rp-tag--neutral">{sr.ride_code || `PAP-${sr.id}`}</span>
                        <span className="rp-scheduled-card-time">
                          {formatRideDateTime(sr.scheduled_time_ist || sr.scheduled_time)}
                        </span>
                      </div>
                    </div>
                    <div className="rp-scheduled-card-payout">
                      <div className="rp-scheduled-card-payout-label">YOUR NET PAYOUT:</div>
                      <div className="rp-scheduled-card-payout-value">
                        ₹{sr.rider_earning || Number(sr.total_fare || 20).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="rp-scheduled-route">
                    <div className="rp-scheduled-route-row">
                      <span className="rp-dot rp-dot--green" />
                      <div><strong>Pickup:</strong> {sr.pickup_address}</div>
                    </div>
                    <div className="rp-scheduled-route-row">
                      <span className="rp-dot rp-dot--amber" />
                      <div><strong>Drop:</strong> {sr.destination_address}</div>
                    </div>
                  </div>

                  <div className="rp-scheduled-foot">
                    <div>
                      <div className="rp-scheduled-foot-label">PASSENGER</div>
                      <div className="rp-scheduled-foot-name">
                        {sr.customer_name || 'Campus Passenger'}
                      </div>
                      {sr.customer_phone && (
                        <a href={`tel:${sr.customer_phone}`} className="rp-text-link rp-text-link--amber" style={{ marginTop: '2px' }}>
                          <Phone size={12} /> Call ({sr.customer_phone})
                        </a>
                      )}
                    </div>

                    <div className="rp-scheduled-foot-actions">
                      <RPButton
                        type="button"
                        variant="danger-soft"
                        size="sm"
                        disabled={scheduledActionLoadingId === sr.id}
                        onClick={() => handleCancelScheduledRide(sr.id)}
                      >
                        Release Booking
                      </RPButton>

                      <RPButton
                        type="button"
                        variant={isTimeReady ? 'success' : 'ghost'}
                        size="sm"
                        disabled={scheduledActionLoadingId === sr.id || !isTimeReady}
                        onClick={() => handleStartScheduledTrip(sr)}
                        title={isTimeReady ? 'Open active trip view' : `Enabled 15 mins before booked time (${formatRideDateTime(sr.scheduled_time_ist || sr.scheduled_time)})`}
                      >
                        <span>{isTimeReady ? 'Start Trip Now' : 'Opens at Booked Time'}</span>
                        {isTimeReady && <ArrowRight size={14} />}
                      </RPButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Open Pre-Bookings */}
      <div className="rp-section rp-fade-up">
        <div className="rp-section-head">
          <Radio size={20} color="#EA580C" />
          <h3 className="rp-section-title">
            Open Campus Pre-Bookings ({availableScheduledRides.length})
          </h3>
        </div>

        {availableScheduledRides.length === 0 ? (
          <div className="rp-empty-flat">
            <CheckCircle2 size={32} color="#10B981" />
            <div className="rp-empty-flat-title">No open pre-booked trips right now</div>
            <div className="rp-empty-flat-sub">
              When students pre-book rides for upcoming hours or tomorrow, they will appear here instantly for you to claim.
            </div>
          </div>
        ) : (
          <div className="rp-list">
            {availableScheduledRides.map((sr, idx) => {
              const conflict = getScheduleGapConflict(sr.scheduled_time_ist || sr.scheduled_time, reservedScheduledRides);
              return (
                <div
                  key={`avail-${sr.id}`}
                  className={`rp-scheduled-card rp-fade-up ${conflict ? 'has-conflict' : ''}`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="rp-scheduled-card-head">
                    <div>
                      <div className="rp-scheduled-card-tags">
                        <span className="rp-tag rp-tag--amber-border">PRE-BOOKED TRIP</span>
                        <span className="rp-tag rp-tag--neutral">{sr.ride_code || `PAP-${sr.id}`}</span>
                        {Boolean(sr.female_rider_only) && (
                          <span className="rp-tag rp-tag--pink">Female Rider Only</span>
                        )}
                        {Boolean(sr.is_double_ride) && (
                          <span className="rp-tag rp-tag--indigo">Double Ride</span>
                        )}
                        {conflict && (
                          <span className="rp-tag rp-tag--rose">
                            Time Conflict (&lt; 15 min gap with {conflict.conflictingRideCode})
                          </span>
                        )}
                      </div>
                      <div className="rp-scheduled-card-time rp-scheduled-card-time--amber">
                        Pickup Scheduled: {formatRideDateTime(sr.scheduled_time_ist || sr.scheduled_time)}
                      </div>
                    </div>
                    <div className="rp-scheduled-card-payout">
                      <div className="rp-scheduled-card-payout-label">ESTIMATED FARE:</div>
                      <div className="rp-scheduled-card-payout-value rp-scheduled-card-payout-value--amber">
                        ₹{Number(sr.total_fare || sr.estimated_fare || 20).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="rp-scheduled-route">
                    <div className="rp-scheduled-route-row">
                      <span className="rp-dot rp-dot--green" />
                      <div><strong>Pickup:</strong> {sr.pickup_address}</div>
                    </div>
                    <div className="rp-scheduled-route-row">
                      <span className="rp-dot rp-dot--amber" />
                      <div><strong>Drop:</strong> {sr.destination_address}</div>
                    </div>
                  </div>

                  <div className="rp-scheduled-foot">
                    <div className="rp-scheduled-foot-meta">
                      Passenger: <strong>{sr.customer_name || 'Campus Passenger'}</strong> · Vehicle: <strong>{sr.vehicle_type || 'BIKE'}</strong>
                    </div>

                    <RPButton
                      type="button"
                      variant={conflict ? 'ghost' : 'primary'}
                      disabled={scheduledActionLoadingId === sr.id || Boolean(conflict)}
                      loading={scheduledActionLoadingId === sr.id}
                      onClick={() => handleAcceptScheduledRide(sr.id)}
                      title={conflict ? `Schedule conflict with your confirmed ride ${conflict.conflictingRideCode}. Please maintain at least a 15-minute gap.` : 'Claim this pre-booking for your shift'}
                    >
                      <CheckCircle2 size={15} />
                      <span>
                        {conflict
                          ? `Unavailable (Conflicts with ${conflict.conflictingRideCode})`
                          : 'ACCEPT & CONFIRM PRE-BOOKING'}
                      </span>
                    </RPButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
export default ScheduledRidesPage;
