import React from 'react';
import { usePassenger } from '../shared/PassengerContext';
import { formatRideDateTime } from '../shared/passengerConstants';
import {
  Clock, CheckCircle2, Phone, Calendar, Star, MapPin, Navigation, Info, AlertTriangle
} from 'lucide-react';

export function ScheduledRideCard({ ride, index, onReschedule, onCancel }) {
  const { standardCampusFare } = usePassenger();
  const isRiderAssigned = Boolean(
    ride.rider_name || ride.rider_id || ride.status === 'ACCEPTED'
  );

  const scheduledTime = ride.scheduled_time_ist || ride.scheduled_time;
  const estimatedFare = ride.total_fare || ride.estimated_fare || (standardCampusFare || 25);
  const rideCode = ride.ride_code || `PU-ADV-${ride.id}`;

  const pickupStop = (ride.pickup_address || 'Campus Stop').split('(')[0].trim();
  const pickupSub = (ride.pickup_address || '').includes('(')
    ? (ride.pickup_address.match(/\((.*?)\)/)?.[1] || 'East Quadrangle Gate')
    : 'Campus Terminal Bay';

  const dropStop = (ride.destination_address || 'Campus Stop').split('(')[0].trim();
  const dropSub = (ride.destination_address || '').includes('(')
    ? (ride.destination_address.match(/\((.*?)\)/)?.[1] || 'Central Transit Portico')
    : 'University Department';

  return (
    <div
      className={`ps-sched-itinerary-card ps-fade-up ${isRiderAssigned ? 'is-confirmed' : 'is-dispatching'}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top Header: ID + Status + Fare */}
      <div className="ps-sched-itinerary-top">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-on-surface text-sm tracking-wide">
            #{rideCode}
          </span>
          {isRiderAssigned ? (
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
          {ride.tag || 'Standard Booking'}
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
                Pickup Terminal
              </p>
              <p className="font-label-md text-on-surface font-semibold">{pickupStop}</p>
              <p className="font-body-sm text-on-surface-variant text-xs">{pickupSub}</p>
            </div>
            <div>
              <p className="font-label-sm text-on-surface-variant uppercase tracking-wider text-[11px]">
                Drop Location
              </p>
              <p className="font-label-md text-on-surface font-semibold">{dropStop}</p>
              <p className="font-body-sm text-on-surface-variant text-xs">{dropSub}</p>
            </div>
          </div>
        </div>

        {/* Route Map Visual Snippet */}
        <div className="ps-sched-snippet-map">
          <div className="ps-sched-snippet-bg" />
          <div className="ps-sched-snippet-pill">
            <Navigation size={13} color="#00855B" />
            <span>2.4 km Transit Run</span>
          </div>
        </div>
      </div>

      {/* Assigned Rider Segment OR Contextual Dispatch Info */}
      {isRiderAssigned ? (
        <div className="ps-sched-driver-segment">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKEx3NkROvvxoYSIMLJIWUX1mQi-rnHJjgJfK9mDL_r70BapxYaJ1bE_-aFN5x6WZHhPVtIoL4__c9OL94wgbXCo0DlVuhbAFB0b0-WoTp62ZbS0Q0B9-_tCn-hiEEtrdPeL9XUMe9lmeSJURbGkP2SFxzfLWlg58sy8ZxSmEvdoe5UvNyd8pHioCwx5l1UmEZmm58qM3IM44YPqxm_Lc41bkB3xbJNyhqtSdauNQmHu-Vyn7knaFQnQ"
                alt="Murugan S."
                className="w-11 h-11 rounded-full object-cover shadow-sm bg-surface-container"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-tertiary" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-label-md font-bold text-on-surface">
                  {ride.rider_name || 'Murugan S.'}
                </span>
                <span className="ps-driver-rating-badge text-xs">
                  <Star size={11} fill="#EA580C" color="#EA580C" />
                  <span>4.9</span>
                </span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant">
                {ride.rider_vehicle_model || 'TVS Jupiter'} · <span className="font-semibold text-on-surface">{ride.rider_vehicle_number || 'TN-32-BK-9182'}</span>
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
