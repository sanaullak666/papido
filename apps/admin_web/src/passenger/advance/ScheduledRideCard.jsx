import React from 'react';
import { usePassenger } from '../shared/PassengerContext';
import { formatRideDateTime } from '../shared/passengerConstants';
import {
  Clock, CheckCircle2, Phone, Calendar, Star, MapPin, Navigation, Info, AlertTriangle
} from 'lucide-react';

export function ScheduledRideCard({ ride, index, onReschedule, onCancel }) {
  const { standardCampusFare } = usePassenger();
  const isCompleted = ride.status === 'COMPLETED';
  const isCancelled = ride.status === 'CANCELLED';
  const isPast = isCompleted || isCancelled;
  const isRiderAssigned = Boolean(
    !isPast && (ride.rider_name || ride.rider_id || ride.status === 'ACCEPTED')
  );

  const scheduledTime = ride.scheduled_time_ist || ride.scheduled_time;
  const estimatedFare = ride.total_fare || ride.estimated_fare || (standardCampusFare || 25);
  const rideCode = ride.ride_code || `PU-ADV-${ride.id}`;

  const pickupStop = (ride.pickup_address || 'Campus Stop').split('(')[0].trim();
  const pickupSub = (ride.pickup_address || '').includes('(')
    ? (ride.pickup_address.match(/\((.*?)\)/)?.[1] || '')
    : '';

  const dropStop = (ride.destination_address || 'Campus Stop').split('(')[0].trim();
  const dropSub = (ride.destination_address || '').includes('(')
    ? (ride.destination_address.match(/\((.*?)\)/)?.[1] || '')
    : '';

  const driverName = ride.rider_name || 'Assigned Driver';
  const driverInitial = (driverName.trim()[0] || 'D').toUpperCase();
  const driverAvatar = ride.rider_avatar || null;
  const driverRating = ride.rider_rating ? Number(ride.rider_rating).toFixed(1) : '5.0';
  const vehicleModel = ride.rider_vehicle_model || ride.vehicle_type || 'Campus Vehicle';
  const vehicleNumber = ride.rider_vehicle_number || '';

  return (
    <div
      className={`ps-sched-itinerary-card ps-fade-up ${isCompleted ? 'is-completed' : isCancelled ? 'is-cancelled' : isRiderAssigned ? 'is-confirmed' : 'is-dispatching'}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top Header: ID + Status + Fare */}
      <div className="ps-sched-itinerary-top">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-on-surface text-sm tracking-wide">
            #{rideCode}
          </span>
          {isCompleted ? (
            <span className="ps-sched-status-badge ps-sched-status-badge--confirmed">
              <CheckCircle2 size={12} color="#00855B" />
              Completed
            </span>
          ) : isCancelled ? (
            <span className="ps-sched-status-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#DC2626' }}>
              <AlertTriangle size={12} color="#DC2626" />
              Cancelled
            </span>
          ) : isRiderAssigned ? (
            <span className="ps-sched-status-badge ps-sched-status-badge--confirmed">
              <span className="ps-status-live-dot" style={{ width: 6, height: 6 }} />
              Confirmed
            </span>
          ) : (
            <span className="ps-sched-status-badge ps-sched-status-badge--dispatching">
              <span className="ps-status-live-ping" style={{ width: 6, height: 6 }} />
              Dispatching
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1">
          <span className="font-body-sm text-on-surface-variant text-xs">Estimated Fare:</span>
          <span className="font-headline-md font-bold text-primary">₹{estimatedFare}</span>
        </div>
      </div>

      {/* Timeline Time Frame Badge */}
      <div className="ps-sched-timeframe-badge">
        <div className="flex items-center gap-2 text-on-surface font-label-md">
          <Clock size={16} color="#EA580C" />
          <span>{formatRideDateTime(scheduledTime)}</span>
        </div>
        <span className="font-label-sm text-primary uppercase font-bold tracking-wider">
          {ride.tag || 'Advance Reservation'}
        </span>
      </div>

      {/* Trip Route Layout & Visual Snippet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
        <div className="flex gap-3 items-start">
          <div className="flex flex-col items-center mt-1">
            <span className="w-3 h-3 rounded-full bg-tertiary" />
            <span className="w-0.5 h-10 bg-surface-container-high my-1" />
            <span className="w-3 h-3 rounded-full bg-primary" />
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-label-sm text-on-surface-variant uppercase tracking-wider text-[11px]">
                Pickup Point
              </p>
              <p className="font-label-md text-on-surface font-semibold">{pickupStop}</p>
              {pickupSub && <p className="font-body-sm text-on-surface-variant text-xs">{pickupSub}</p>}
            </div>
            <div>
              <p className="font-label-sm text-on-surface-variant uppercase tracking-wider text-[11px]">
                Drop Location
              </p>
              <p className="font-label-md text-on-surface font-semibold">{dropStop}</p>
              {dropSub && <p className="font-body-sm text-on-surface-variant text-xs">{dropSub}</p>}
            </div>
          </div>
        </div>

        {/* Route Map Visual Snippet */}
        <div className="ps-sched-snippet-map">
          <div className="ps-sched-snippet-bg" />
          <div className="ps-sched-snippet-pill">
            <Navigation size={13} color="#00855B" />
            <span>Campus Transit Run</span>
          </div>
        </div>
      </div>

      {/* Assigned Rider Segment OR Contextual Dispatch Info */}
      {isCompleted ? (
        <div className="ps-sched-pending-segment" style={{ borderLeft: '3px solid #00855B' }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} color="#00855B" />
            <p className="font-label-md text-on-surface font-semibold">Ride Completed</p>
          </div>
          <p className="font-body-sm text-on-surface-variant text-xs mt-1">
            Trip completed on schedule across Pondicherry University campus.
          </p>
        </div>
      ) : isCancelled ? (
        <div className="ps-sched-pending-segment" style={{ borderLeft: '3px solid #DC2626' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} color="#DC2626" />
            <p className="font-label-md text-on-surface font-semibold">Pre-Booking Cancelled</p>
          </div>
          <p className="font-body-sm text-on-surface-variant text-xs mt-1">
            {ride.cancellation_reason || 'Advance reservation cancelled. Zero cancellation fee applied.'}
          </p>
        </div>
      ) : isRiderAssigned ? (
        <div className="ps-sched-driver-segment">
          <div className="flex items-center gap-3">
            <div className="relative">
              {driverAvatar ? (
                <img
                  src={driverAvatar}
                  alt={driverName}
                  className="w-11 h-11 rounded-full object-cover shadow-sm bg-surface-container"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shadow-xs border border-primary/20">
                  {driverInitial}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-tertiary" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-label-md font-bold text-on-surface">
                  {driverName}
                </span>
                <span className="ps-driver-rating-badge text-xs">
                  <Star size={11} fill="#EA580C" color="#EA580C" />
                  <span>{driverRating}</span>
                </span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant">
                {vehicleModel} {vehicleNumber ? `· ${vehicleNumber}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {ride.rider_phone && (
              <a
                href={`tel:${ride.rider_phone}`}
                className="ps-sched-action-btn ps-sched-action-btn--call"
              >
                <Phone size={14} /> Call Rider
              </a>
            )}
            <button
              type="button"
              className="ps-sched-action-btn ps-sched-action-btn--resched"
              onClick={onReschedule}
            >
              Reschedule
            </button>
            <button
              type="button"
              className="ps-sched-action-btn ps-sched-action-btn--cancel"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="ps-sched-pending-segment">
          <div className="flex items-start gap-3">
            <Info size={20} color="#EA580C" className="shrink-0 mt-0.5" />
            <div>
              <p className="font-label-md text-on-surface font-semibold">Rider Allocation in Progress</p>
              <p className="font-body-sm text-on-surface-variant text-xs mt-1">
                Dispatch assigns rider 30 mins before trip time. Real-time GPS pairing activates automatically.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-surface-container-high/60 mt-2">
            <span className="font-body-sm text-xs text-on-surface-variant">Zero fee applies if modified early</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="ps-sched-action-btn ps-sched-action-btn--resched"
                onClick={onReschedule}
              >
                Reschedule
              </button>
              <button
                type="button"
                className="ps-sched-action-btn ps-sched-action-btn--cancel"
                onClick={onCancel}
              >
                Cancel Trip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduledRideCard;
