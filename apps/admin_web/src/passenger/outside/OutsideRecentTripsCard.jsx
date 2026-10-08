import React from 'react';
import { usePassenger } from '../shared/PassengerContext';
import { formatRideDateTime, POPULAR_OUTSIDE_SPOTS } from '../shared/passengerConstants';
import { History, RotateCcw, ShieldCheck, MapPin, Compass } from 'lucide-react';

export function OutsideRecentTripsCard({ onSelectDestination }) {
  const { pastRides = [] } = usePassenger();

  const realOutsideTrips = pastRides
    .filter(r => r.is_outside || r.isOutside)
    .slice(0, 4);

  const hasHistory = realOutsideTrips.length > 0;

  return (
    <div className="ps-outside-side-card ps-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasHistory ? <History size={18} color="#EA580C" /> : <Compass size={18} color="#EA580C" />}
          <h2 className="font-label-lg font-bold text-on-surface">
            {hasHistory ? 'Your Past Outside Trips' : 'Popular Outside Destinations'}
          </h2>
        </div>
        <span className="font-label-sm text-on-surface-variant uppercase">
          {hasHistory ? `${realOutsideTrips.length} completed` : 'Quick Select'}
        </span>
      </div>

      <p className="font-body-sm text-on-surface-variant text-xs">
        {hasHistory
          ? 'Tap any recent trip to re-populate the booking destination.'
          : 'Tap any popular Pondicherry destination to fill your trip request.'}
      </p>

      {/* Dynamic Items */}
      <div className="flex flex-col gap-2">
        {hasHistory ? (
          realOutsideTrips.map((item) => {
            const dest = item.destination_address || 'Outside Destination';
            const fare = item.total_fare || item.final_fare || item.estimated_fare;
            return (
              <div
                key={item.id}
                className="ps-outside-history-item group"
                role="button"
                tabIndex={0}
                onClick={() => onSelectDestination && onSelectDestination(dest, {
                  lat: Number(item.destination_latitude || 11.9338),
                  lng: Number(item.destination_longitude || 79.8359)
                })}
              >
                <div className="flex items-center gap-3">
                  <div className="ps-outside-history-icon">
                    <MapPin size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md font-semibold text-on-surface group-hover:text-primary transition-colors">
                      {dest}
                    </span>
                    <span className="font-body-sm text-[11px] text-on-surface-variant">
                      {formatRideDateTime(item.completed_at || item.created_at)} {fare ? `· ₹${fare}` : ''}
                    </span>
                  </div>
                </div>
                <RotateCcw size={15} className="text-on-surface-variant group-hover:text-primary transition-colors" />
              </div>
            );
          })
        ) : (
          POPULAR_OUTSIDE_SPOTS.slice(0, 4).map((spot) => (
            <div
              key={spot.name}
              className="ps-outside-history-item group"
              role="button"
              tabIndex={0}
              onClick={() => onSelectDestination && onSelectDestination(spot.name, { lat: spot.lat, lng: spot.lng })}
            >
              <div className="flex items-center gap-3">
                <div className="ps-outside-history-icon">
                  <Compass size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md font-semibold text-on-surface group-hover:text-primary transition-colors">
                    {spot.name}
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant">
                    Direct PU Transit Route
                  </span>
                </div>
              </div>
              <RotateCcw size={15} className="text-on-surface-variant group-hover:text-primary transition-colors" />
            </div>
          ))
        )}
      </div>

      {/* Safety Guarantee */}
      <div className="mt-2 pt-2 border-t border-outline-variant/30 flex items-center gap-2 text-on-surface-variant font-body-sm text-[11px]">
        <ShieldCheck size={16} color="#00855B" className="shrink-0" />
        <span>Drivers are vetted PU staff with official gate security logs.</span>
      </div>
    </div>
  );
}

export default OutsideRecentTripsCard;
