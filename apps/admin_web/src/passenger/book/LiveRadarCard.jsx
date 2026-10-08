import React, { useEffect, useState } from 'react';
import { usePassenger } from '../shared/PassengerContext';
import { Navigation, Share2, Shield, Timer, Radio } from 'lucide-react';

export function LiveRadarCard({ pickupAddress, destAddress, distanceKm, etaMins, isRouteReady }) {
  const { socketRef, onlineDriversCount } = usePassenger();
  const [onlineCount, setOnlineCount] = useState(onlineDriversCount || 0);

  useEffect(() => {
    if (typeof onlineDriversCount === 'number') {
      setOnlineCount(onlineDriversCount);
    }
  }, [onlineDriversCount]);

  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const handleOnline = (data) => {
      const count =
        data?.totalOnlineCount ??
        data?.count ??
        (Array.isArray(data?.riders) ? data.riders.length : null);
      if (typeof count === 'number') setOnlineCount(count);
    };

    socket.on('riders:online_update', handleOnline);
    socket.on('driver:online_update', handleOnline);

    return () => {
      socket.off('riders:online_update', handleOnline);
      socket.off('driver:online_update', handleOnline);
    };
  }, [socketRef]);

  const hasRoute = Boolean(isRouteReady && pickupAddress && destAddress);
  const pShort = (pickupAddress || '').split('(')[0].trim();
  const dShort = (destAddress || '').split('(')[0].trim();
  const dist = distanceKm ? Number(distanceKm).toFixed(1) : '--';
  const eta = etaMins ? Math.round(Number(etaMins)) : '--';

  return (
    <div className="ps-radar-card ps-fade-up">
      <div className="ps-radar-head">
        <div className="ps-radar-head-title">
          <span className="ps-status-live-dot-wrap">
            <span className="ps-status-live-ping" />
            <span className="ps-status-live-dot" />
          </span>
          <span>PU Mobility Live Radar</span>
        </div>
        <span className="ps-radar-drivers-badge">
          {onlineCount > 0 ? `${onlineCount} Driver${onlineCount === 1 ? '' : 's'} Online` : 'Scanning Fleet'}
        </span>
      </div>

      {/* Dynamic Animated Radar Viewport */}
      <div className="ps-radar-viewport">
        <div className="ps-radar-bg-grid" />
        <div className="ps-radar-ring-pulse" />
        <div className="ps-radar-ring-pulse" style={{ animationDelay: '0.6s', width: '160px', height: '160px' }} />

        <div className="ps-radar-pin">
          <div className="ps-radar-pin-inner">
            <Navigation size={15} />
          </div>
        </div>

        <div className="ps-radar-route-badge">
          <span className="ps-radar-route-text truncate">
            {hasRoute ? `${pShort} → ${dShort}` : 'Select Route Above'}
          </span>
          <span className="ps-radar-route-eta">
            {hasRoute ? `${dist} km (${eta} min)` : 'Awaiting Stops'}
          </span>
        </div>
      </div>

      {/* Safety assurance snippet */}
      <div className="ps-radar-assurance">
        <div className="ps-radar-assurance-item">
          <Shield size={14} color="#00855B" />
          <span>PU Campus Safe-Zone</span>
        </div>
        <div className="ps-radar-assurance-item">
          <Timer size={14} color="#EA580C" />
          <span>Avg. Dispatch: 2 mins</span>
        </div>
      </div>
    </div>
  );
}

export default LiveRadarCard;
