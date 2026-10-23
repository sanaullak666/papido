import React, { useState } from 'react';
import { usePassenger } from '../shared/PassengerContext';
import { formatRideDateTime } from '../shared/passengerConstants';
import {
  Bike, Bus, Car, CheckCircle2, XCircle, Star,
  Receipt, RotateCcw, ChevronDown, ShieldCheck, Sparkles
} from 'lucide-react';

export function HistoryCard({ ride, index, onRate, onDownloadReceipt }) {
  const { standardCampusFare } = usePassenger();
  const [expanded, setExpanded] = useState(false);

  const isPrebooked = Boolean(
    ride.is_scheduled || ride.isScheduled || ride.scheduled_time
  );
  const isOutside = Boolean(ride.is_outside || ride.isOutside);
  const isCompleted = ride.status === 'COMPLETED';
  const isCancelled = ride.status === 'CANCELLED';

  const fare = ride.total_fare || ride.final_fare || ride.estimated_fare || (standardCampusFare || 25);

  const rideCode = ride.ride_code || (
    ride.id ? `PAP-${ride.id}` : 'PAP-TRIP'
  );

  const pickup = ride.pickup_address || 'Pondicherry University';
  const drop = ride.destination_address || 'Destination';

  const displayTime = formatRideDateTime(
    ride.completed_at || ride.requested_at || ride.created_at
  );

  const hasRider = Boolean(ride.rider_name || ride.rider_id);
  const riderName = ride.rider_name || (hasRider ? 'Campus Driver' : null);
  const riderRating = ride.rider_rating ? Number(ride.rider_rating).toFixed(1) : null;
  const driverPhoto = ride.rider_photo_url || null;
  const driverInitial = (riderName || 'D').charAt(0).toUpperCase();

  const vehicleText = [
    ride.vehicle_model || ride.vehicle_type,
    ride.vehicle_number
  ].filter(Boolean).join(' • ');

  const handleRateClick = (e) => {
    e.stopPropagation();
    if (onRate) onRate(ride.id, riderName);
  };

  const handleReceiptClick = (e) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <article
      className="ps-hist-card ps-fade-up"
      style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 w-full">

        {/* Left: Ride Type Icon + Code + Route */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="ps-hist-icon-wrap shrink-0">
            {isOutside ? (
              <Car size={20} color="#0058BE" />
            ) : isPrebooked ? (
              <Bus size={20} color="#00855B" />
            ) : (
              <Bike size={20} color="#EA580C" />
            )}
          </div>

          <div className="flex flex-col gap-1 min-w-0 w-full">
            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-primary bg-primary-fixed/50 px-2 py-0.5 rounded-full">
                #{rideCode}
              </span>

              {isCompleted && (
                <span className="px-2.5 py-0.5 rounded-full font-label-sm text-[11px] bg-tertiary-fixed text-on-tertiary-fixed font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                  Completed
                </span>
              )}

              {isCancelled && (
                <span className="px-2.5 py-0.5 rounded-full font-label-sm text-[11px] bg-red-100 text-red-800 font-bold flex items-center gap-1">
                  <XCircle size={11} />
                  Cancelled
                </span>
              )}

              {isPrebooked && (
                <span className="px-2 py-0.5 rounded-full font-label-sm text-[11px] bg-[#D8E2FF] text-[#003273] font-bold">
                  Pre-Booked Slot
                </span>
              )}

              {isOutside && (
                <span className="px-2 py-0.5 rounded-full font-label-sm text-[11px] bg-surface-container-high text-on-surface font-bold">
                  Outside Trip
                </span>
              )}
            </div>

            {/* Path */}
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-baseline gap-2 truncate">
                <span className="font-label-sm text-[10px] text-on-surface-variant font-bold w-9 uppercase">FROM</span>
                <span className="font-label-md text-sm text-on-surface font-bold truncate">{pickup}</span>
              </div>
              <div className="flex items-baseline gap-2 truncate">
                <span className="font-label-sm text-[10px] text-on-surface-variant font-bold w-9 uppercase">TO</span>
                <span className="font-label-md text-sm text-on-surface font-bold truncate">{drop}</span>
              </div>
            </div>

            <span className="font-body-sm text-xs text-on-surface-variant pt-0.5">
              {displayTime} • {ride.distance_km ? `${ride.distance_km} km` : 'Campus run'}
            </span>
          </div>
        </div>

        {/* Middle: Driver & Vehicle Details */}
        {!isCancelled && hasRider && (
          <div className="flex items-center gap-3 w-full sm:w-auto bg-surface-container-low px-4 py-2.5 rounded-xl border border-outline-variant/30">
            <div className="relative shrink-0">
              {driverPhoto ? (
                <img
                  src={driverPhoto}
                  alt={riderName}
                  className="w-11 h-11 rounded-full object-cover shadow-sm bg-surface-container"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shadow-xs border border-primary/20">
                  {driverInitial}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-xs flex items-center">
                <ShieldCheck size={12} color="#00855B" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-label-md font-bold text-on-surface text-sm">{riderName}</span>
                {riderRating && (
                  <div className="flex items-center gap-0.5 bg-white px-1.5 py-0.2 rounded font-bold text-xs shadow-xs text-amber-700">
                    <Star size={11} fill="#EA580C" color="#EA580C" />
                    <span>{riderRating}</span>
                  </div>
                )}
              </div>
              {vehicleText && <span className="font-body-sm text-xs text-on-surface-variant">{vehicleText}</span>}
            </div>
          </div>
        )}

        {/* Right: Fare & Actions */}
        <div className="flex items-center justify-between lg:justify-end gap-6 w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0">
          <div className="flex flex-col items-start lg:items-end">
            <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
              Fare Paid
            </span>
            <span className="font-headline-md text-xl font-bold text-on-surface">
              {isCancelled ? '₹0' : `₹${fare}`}
            </span>
            <span className="font-body-sm text-[11px] text-tertiary font-semibold">
              {isCancelled ? '100% Waived' : 'UPI • Zero Surges'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isCompleted && (
              <button
                type="button"
                className="ps-hist-btn ps-hist-btn--receipt"
                onClick={handleReceiptClick}
              >
                <Receipt size={14} />
                <span>{expanded ? 'Details' : 'Receipt'}</span>
              </button>
            )}

            {isCompleted && (
              <button
                type="button"
                className="ps-hist-btn ps-hist-btn--rate"
                onClick={handleRateClick}
              >
                <Star size={14} />
                <span>Rate</span>
              </button>
            )}

            {isPrebooked && isCompleted && (
              <button
                type="button"
                className="ps-hist-btn ps-hist-btn--rebook"
                onClick={() => {
                  window.location.href = '/passenger/book';
                }}
              >
                <RotateCcw size={14} />
                <span>Rebook</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Expanded Receipt Breakdown */}
      {expanded && isCompleted && (
        <div className="ps-hist-expanded ps-fade-up mt-3 pt-3 border-t border-outline-variant/30 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Base Campus Transit:</span>
                <span className="font-bold text-on-surface">₹{ride.base_fare || fare}</span>
              </div>
              {Boolean(ride.double_discount) && (
                <div className="flex justify-between text-xs text-green-700 font-bold">
                  <span>Double Ride Share Discount:</span>
                  <span>-₹{ride.double_discount}</span>
                </div>
              )}
              {Boolean(ride.waiting_fare) && (
                <div className="flex justify-between text-xs text-amber-700">
                  <span>Waiting Transit Fare:</span>
                  <span>+₹{ride.waiting_fare}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-on-surface border-t border-outline-variant/30 pt-1">
                <span>Total Amount Paid:</span>
                <span className="text-primary font-headline-md">₹{fare}</span>
              </div>
            </div>

            <div className="flex flex-col justify-between text-xs text-on-surface-variant bg-surface-container-low p-2.5 rounded-lg">
              <div>
                <p><strong>Payment Mode:</strong> {ride.payment_method || 'UPI / Campus Pass'}</p>
                <p><strong>Status:</strong> Settled &amp; Archived</p>
                <p><strong>Reference:</strong> {rideCode}</p>
              </div>
              <span className="text-[10px] text-tertiary font-bold">Official PU Mobility Digital Invoice</span>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default HistoryCard;
