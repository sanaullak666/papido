import React, { useState } from 'react';
import { usePassenger } from '../shared/PassengerContext';
import { formatRideDateTime } from '../shared/passengerConstants';
import {
  CheckCircle2, XCircle, Clock, Calendar, Bike,
  Star, Receipt, ChevronDown, Users, Sparkles
} from 'lucide-react';

export function HistoryCard({ ride, index }) {
  const { standardCampusFare } = usePassenger();
  const [expanded, setExpanded] = useState(false);

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

  const hasReceiptBreakdown =
    ride.base_fare ||
    ride.double_discount ||
    ride.waiting_fare;

  return (
    <article
      className={`ps-hist-card ps-fade-up ${
        isPrebooked ? 'is-prebooked' : ''
      } ${isCancelled ? 'is-cancelled' : ''} ${expanded ? 'is-expanded' : ''}`}
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
            <span className="ps-hist-double-tag">
              <Users size={9} /> DOUBLE
            </span>
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

        {/* Rating display */}
        {Boolean(ride.rating) && (
          <div className="ps-hist-rating">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                size={11}
                fill={star <= ride.rating ? '#D97706' : 'none'}
                color={star <= ride.rating ? '#D97706' : '#D1D5DB'}
              />
            ))}
            <span className="ps-hist-rating-label">
              {Number(ride.rating).toFixed(1)} rated
            </span>
          </div>
        )}

        {/* Expand toggle */}
        {isCompleted && (
          <button
            type="button"
            className="ps-hist-expand-btn"
            onClick={() => setExpanded(v => !v)}
          >
            <Receipt size={12} />
            {expanded ? 'Hide details' : 'View receipt'}
            <ChevronDown size={12} className={expanded ? 'is-rotated' : ''} />
          </button>
        )}

        {expanded && isCompleted && (
          <div className="ps-hist-expanded ps-fade-up">
            {hasReceiptBreakdown ? (
              <>
                <div className="ps-hist-receipt-row">
                  <span>Base fare</span>
                  <span>₹{ride.base_fare || fare}</span>
                </div>
                {Boolean(ride.double_discount) && (
                  <div className="ps-hist-receipt-row ps-hist-receipt-row--discount">
                    <span><Sparkles size={10} /> Double ride discount</span>
                    <span>-₹{ride.double_discount}</span>
                  </div>
                )}
                {Boolean(ride.waiting_fare) && (
                  <div className="ps-hist-receipt-row">
                    <span>Waiting charge</span>
                    <span>+₹{ride.waiting_fare}</span>
                  </div>
                )}
                <div className="ps-hist-receipt-row ps-hist-receipt-row--total">
                  <span>Total</span>
                  <span>₹{fare}</span>
                </div>
              </>
            ) : (
              <div className="ps-hist-receipt-row ps-hist-receipt-row--total">
                <span>Total fare</span>
                <span>₹{fare}</span>
              </div>
            )}

            <div className="ps-hist-receipt-meta">
              Payment: {ride.payment_method || 'CASH'} ·
              {' '}
              {ride.completed_at ? formatRideDateTime(ride.completed_at) : 'N/A'}
            </div>
          </div>
        )}

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
