import React from 'react';
import { usePassenger } from '../shared/PassengerContext';
import { formatRideDateTime } from '../shared/passengerConstants';
import {
  CheckCircle2, XCircle, Clock, Calendar, Bike
} from 'lucide-react';

export function HistoryCard({ ride, index }) {
  const { standardCampusFare } = usePassenger();
  const isPrebooked = Boolean(
    ride.is_scheduled || ride.isScheduled || ride.scheduled_time
  );
  const isCompleted = ride.status === 'COMPLETED';
  const isCancelled = ride.status === 'CANCELLED';

  const fare = ride.total_fare || ride.final_fare || ride.estimated_fare || (standardCampusFare || 25);

  const displayTime = isPrebooked && ride.scheduled_time
    ? formatRideDateTime(ride.scheduled_time)
    : formatRideDateTime(
        ride.requested_at || ride.created_at ||
        ride.accepted_at || ride.completed_at
      );

  return (
    <article
      className={`ps-hist-card ps-fade-up ${
        isPrebooked ? 'is-prebooked' : ''
      } ${isCancelled ? 'is-cancelled' : ''}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* LEFT: body */}
      <div className="ps-hist-body">

        {/* Code row */}
        <div className="ps-hist-code-row">
          <span className="ps-hist-code">
            {ride.ride_code || `PAP-${ride.id}`}
          </span>

          {isPrebooked && (
            <span className="ps-hist-prebooked-tag">
              <Calendar size={9} />
              PRE-BOOKED
            </span>
          )}

          {Boolean(ride.is_double_ride) && (
            <span className="ps-hist-double-tag">DOUBLE</span>
          )}
        </div>

        {/* Route timeline */}
        <div className="ps-hist-route">
          <div className="ps-hist-route-row">
            <span className="ps-hist-dot ps-hist-dot--green" />
            <span className="ps-hist-route-text">
              {ride.pickup_address}
            </span>
          </div>
          <span className="ps-hist-route-line" aria-hidden="true" />
          <div className="ps-hist-route-row">
            <span className="ps-hist-dot ps-hist-dot--amber" />
            <span className="ps-hist-route-text">
              {ride.destination_address}
            </span>
          </div>
        </div>

        {/* Meta row */}
        <div className="ps-hist-meta">
          <span className="ps-hist-meta-item">
            {isPrebooked ? (
              <>
                <Calendar size={11} />
                Pickup: {displayTime}
              </>
            ) : (
              <>
                <Clock size={11} />
                {displayTime}
              </>
            )}
          </span>

          <span className="ps-hist-sep">·</span>

          <span className="ps-hist-meta-item">
            <Bike size={11} />
            {ride.rider_name || 'Campus Rider'}
          </span>

          <span className="ps-hist-sep">·</span>

          <span className="ps-hist-meta-item">
            {ride.vehicle_type || 'BIKE'}
          </span>
        </div>

      </div>

      {/* RIGHT: fare + status */}
      <div className="ps-hist-right">
        <div className="ps-hist-fare">
          <span className="ps-hist-fare-sym">₹</span>
          {fare}
        </div>

        <span className={`ps-hist-status ${
          isCompleted ? 'is-complete' :
          isCancelled ? 'is-cancelled' :
          'is-neutral'
        }`}>
          {isCompleted && <CheckCircle2 size={11} />}
          {isCancelled && <XCircle size={11} />}
          {ride.status}
        </span>
      </div>
    </article>
  );
}

export default HistoryCard;
