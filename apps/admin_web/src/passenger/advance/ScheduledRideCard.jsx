import React from 'react';
import { usePassenger } from '../shared/PassengerContext';
import { PSCard, PSButton } from '../shared/PassengerUI';
import { formatRideDateTime } from '../shared/passengerConstants';
import {
  Clock, CheckCircle2, Phone, Calendar
} from 'lucide-react';

export function ScheduledRideCard({ ride, index, onReschedule, onCancel }) {
  const { standardCampusFare } = usePassenger();
  const isRiderAssigned = Boolean(
    ride.rider_name || ride.rider_id || ride.status === 'ACCEPTED'
  );

  const scheduledTime = ride.scheduled_time_ist || ride.scheduled_time;
  const estimatedFare = ride.total_fare || ride.estimated_fare || (standardCampusFare || 25);

  return (
    <PSCard
      className={`ps-sched-card ps-fade-up ${
        isRiderAssigned ? 'is-confirmed' : 'is-pending'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* HEAD: code + time + status chip + fare */}
      <div className="ps-sched-card-head">
        <div className="ps-sched-head-left">
          <span className="ps-sched-code">
            {ride.ride_code || `PAP-${ride.id}`}
          </span>

          <span className="ps-sched-time">
            <Clock size={12} />
            {formatRideDateTime(scheduledTime)}
          </span>

          {isRiderAssigned ? (
            <span className="ps-chip ps-chip--emerald">
              <CheckCircle2 size={12} />
              Confirmed with Rider
            </span>
          ) : (
            <span className="ps-chip ps-chip--amber">
              Pending Rider
            </span>
          )}
        </div>

        <div className="ps-sched-fare">
          <div className="ps-sched-fare-label">ESTIMATED FARE</div>
          <div className="ps-sched-fare-val">₹{estimatedFare}</div>
        </div>
      </div>

      {/* ROUTE */}
      <div className="ps-sched-route">
        <div className="ps-sched-route-row">
          <span className="ps-sched-dot ps-sched-dot--green" />
          <div>
            <strong>Pickup:</strong> {ride.pickup_address}
          </div>
        </div>

        {ride.via_address && (
          <div className="ps-sched-route-row">
            <span className="ps-sched-dot ps-sched-dot--amber" />
            <div>
              <strong>Via:</strong> {ride.via_address}
            </div>
          </div>
        )}

        <div className="ps-sched-route-row">
          <span className="ps-sched-dot ps-sched-dot--orange" />
          <div>
            <strong>Drop:</strong> {ride.destination_address}
          </div>
        </div>

        <div className="ps-sched-meta">
          Vehicle: <strong>{ride.vehicle_type || 'BIKE'}</strong> · Payment:{' '}
          <strong>{ride.payment_method || 'CASH'} ON DROP</strong>
        </div>
      </div>

      {/* BODY: rider box OR pending box */}
      {isRiderAssigned ? (
        <RiderAssignedBox
          ride={ride}
          scheduledTime={scheduledTime}
          onReschedule={onReschedule}
          onCancel={onCancel}
        />
      ) : (
        <PendingBox
          onReschedule={onReschedule}
          onCancel={onCancel}
        />
      )}
    </PSCard>
  );
}

/* ---------- Sub-components ---------- */

function RiderAssignedBox({ ride, scheduledTime, onReschedule, onCancel }) {
  return (
    <div className="ps-sched-rider-box ps-fade-up">
      <div>
        <div className="ps-sched-rider-label">ASSIGNED CAMPUS RIDER</div>
        <div className="ps-sched-rider-name">
          {ride.rider_name || 'Campus Rider'}
        </div>
        <div className="ps-sched-rider-vehicle">
          {ride.rider_vehicle_model || 'Two-Wheeler'}
          {ride.rider_vehicle_number ? ` (${ride.rider_vehicle_number})` : ''}
        </div>
        <div className="ps-sched-rider-note">
          Confirmed for {formatRideDateTime(scheduledTime)}.
        </div>
      </div>

      <div className="ps-sched-actions">
        {ride.rider_phone && (
          <a
            href={`tel:${ride.rider_phone}`}
            className="ps-btn ps-btn--success ps-btn--sm"
            style={{ textDecoration: 'none' }}
          >
            <Phone size={13} /> Call Rider
          </a>
        )}
        <PSButton variant="ghost" size="sm" onClick={onReschedule}>
          <Clock size={13} /> Change Time
        </PSButton>
        <PSButton variant="danger" size="sm" onClick={onCancel}>
          Cancel
        </PSButton>
      </div>
    </div>
  );
}

function PendingBox({ onReschedule, onCancel }) {
  return (
    <div className="ps-sched-pending-box ps-fade-up">
      <div className="ps-sched-pending-note">
        Listed on campus advance board. Nearby riders can claim your request.
      </div>

      <div className="ps-sched-actions">
        <PSButton variant="ghost" size="sm" onClick={onReschedule}>
          <Clock size={13} /> Change Time
        </PSButton>
        <PSButton variant="danger" size="sm" onClick={onCancel}>
          Cancel
        </PSButton>
      </div>
    </div>
  );
}

export default ScheduledRideCard;
