import React, { useEffect, useState } from 'react';
import { Bike, Calendar, ArrowRight, ShieldCheck, Users } from 'lucide-react';
import { usePassenger } from '../shared/PassengerContext';

/**
 * Compact, purposeful header greeting for the passenger booking workspace.
 * Replaces oversized promotional heroes with a calm "Where are you going?" entry.
 */
export function BentoHero({ user, activeRide, scheduledCount }) {
  const { standardCampusFare, socketRef } = usePassenger();
  const firstName = (user?.name || 'Passenger').split(' ')[0];
  const [onlineRiders, setOnlineRiders] = useState(0);

  /* Live online rider count from socket */
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const handleOnline = (data) => {
      const count =
        data?.totalOnlineCount ??
        data?.count ??
        (Array.isArray(data?.riders) ? data.riders.length : null);
      if (typeof count === 'number') setOnlineRiders(count);
    };

    socket.on('riders:online_update', handleOnline);
    socket.on('driver:online_update', handleOnline);

    return () => {
      socket.off('riders:online_update', handleOnline);
      socket.off('driver:online_update', handleOnline);
    };
  }, [socketRef]);

  const isLive = (onlineRiders || 0) > 0;

  return (
    <div className="ps-greeting-header ps-fade-up">
      <div className="ps-greeting-content">
        <div className="ps-greeting-eyebrow">
          <span>Good day, {firstName}</span>
          <span className="ps-greeting-sep" aria-hidden="true">·</span>
          <span className={`ps-live-indicator ${isLive ? 'is-live' : ''}`}>
            <span className="ps-live-pulse" aria-hidden="true" />
            {isLive ? `${onlineRiders} riders on campus` : 'Campus mobility active'}
          </span>
        </div>
        <h1 className="ps-greeting-title">Where are you going?</h1>
      </div>

      <div className="ps-greeting-meta">
        <div className="ps-greeting-badge">
          <ShieldCheck size={14} className="ps-badge-icon" />
          <span>₹{standardCampusFare || 25} flat campus rate</span>
        </div>

        {scheduledCount > 0 && (
          <a
            href="/passenger/prebook"
            className="ps-greeting-link"
            title="View scheduled trips"
          >
            <Calendar size={13} />
            <span>{scheduledCount} pre-booked</span>
            <ArrowRight size={11} />
          </a>
        )}
      </div>
    </div>
  );
}

export default BentoHero;
