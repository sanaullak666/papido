import React from 'react';
import { MapPin } from 'lucide-react';

export function PickupStationCard() {
  return (
    <div className="ps-pickup-station-card ps-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPin size={18} color="#EA580C" />
          <span className="font-label-md font-bold text-on-surface">Default Pickup Station</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-label-sm text-[10px] font-bold">
          Saved Hub
        </span>
      </div>

      <p className="font-body-sm text-xs text-on-surface-variant m-0">
        Pondicherry University, Madam Curie PG Girls Hostel, East Gate Loop.
      </p>

      <div
        className="ps-station-map-preview"
        style={{
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDnw_0eG_gGxHA-3TGDI4Z3-svvqPNZepLO93QH7_v_6_s8f0vLU4ae9nNVerlkKev8ZkCIhwSbuOI4JE8gz8ipsxk8SKrUzdk90F3qFLfZILHYK75UVFSDnKieZy2FCaZioisr5JvhqFtpl-rPUSA-KNVSRjic2B7mWedGfj25jLfJPcS7bXu_4CK2U-ZCKXUEmxnMQyJKzCefyEG7w1N8Yn4ktB_xkTKtyeW4XmGICumCpjtvim6-Cw')`
        }}
      >
        <div className="ps-station-map-overlay" />
        <div className="ps-station-map-badge">
          <span className="w-2 h-2 rounded-full bg-tertiary" />
          <span className="font-label-sm text-[11px] font-semibold text-on-surface">
            East Gate Transit Node
          </span>
        </div>
      </div>
    </div>
  );
}

export default PickupStationCard;
