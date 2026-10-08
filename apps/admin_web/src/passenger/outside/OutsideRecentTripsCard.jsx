import React from 'react';
import { History, RotateCcw, ShieldCheck, Waves, Train, Trees } from 'lucide-react';

const DEFAULT_RECENT = [
  {
    name: 'Rock Beach / Promenade',
    sub: 'Last ridden 3 days ago · ₹170',
    icon: Waves,
    lat: 11.9338,
    lng: 79.8359
  },
  {
    name: 'Puducherry Railway Station',
    sub: 'Last ridden Oct 12 · ₹195',
    icon: Train,
    lat: 11.9288,
    lng: 79.8286
  },
  {
    name: 'Auroville Visitors Centre',
    sub: 'Last ridden Oct 04 · ₹110',
    icon: Trees,
    lat: 12.0069,
    lng: 79.8105
  }
];

export function OutsideRecentTripsCard({ onSelectDestination }) {
  return (
    <div className="ps-outside-side-card ps-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={18} color="#EA580C" />
          <h2 className="font-label-lg font-bold text-on-surface">Recent Trips History</h2>
        </div>
        <span className="font-label-sm text-on-surface-variant uppercase">3 completed</span>
      </div>

      <p className="font-body-sm text-on-surface-variant text-xs">
        Tap any recent destination to re-populate the booking form directly.
      </p>

      {/* History Items */}
      <div className="flex flex-col gap-2">
        {DEFAULT_RECENT.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              className="ps-outside-history-item group"
              role="button"
              tabIndex={0}
              onClick={() => onSelectDestination && onSelectDestination(item.name, { lat: item.lat, lng: item.lng })}
            >
              <div className="flex items-center gap-3">
                <div className="ps-outside-history-icon">
                  <Icon size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md font-semibold text-on-surface group-hover:text-primary transition-colors">
                    {item.name}
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant">
                    {item.sub}
                  </span>
                </div>
              </div>
              <RotateCcw size={15} className="text-on-surface-variant group-hover:text-primary transition-colors" />
            </div>
          );
        })}
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
