import React from 'react';
import { MapPin } from 'lucide-react';

export function PickupStationCard({ preferredStation }) {
  const stationName = preferredStation || localStorage.getItem('papido_pref_pickup_name') || 'Gate 1 Main Entrance';

  return (
    <div className="ps-pickup-station-card ps-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPin size={18} color="#EA580C" />
          <span className="font-label-md font-bold text-on-surface">Default Pickup Station</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-label-sm text-[10px] font-bold">
          Campus Hub
        </span>
      </div>

      <p className="font-body-sm text-xs text-on-surface-variant m-0">
        {stationName} • Designated Campus Boarding Bay
      </p>

      <div
        className="ps-station-map-preview"
        style={{
          background: 'linear-gradient(135deg, rgba(234,88,12,0.12) 0%, rgba(245,158,11,0.16) 100%)'
        }}
      >
        <div className="ps-station-map-overlay" />
        <div className="ps-station-map-badge">
          <span className="w-2 h-2 rounded-full bg-tertiary" />
          <span className="font-label-sm text-[11px] font-semibold text-on-surface">
            {stationName}
          </span>
        </div>
      </div>
    </div>
  );
}

export default PickupStationCard;
