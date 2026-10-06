import React, { useEffect, useState } from 'react';
import { Bike, MapPin, Calendar, ArrowRight, Zap, ShieldCheck } from 'lucide-react';
import { usePassenger } from '../shared/PassengerContext';

/**
 * Bento-style hero for the booking page.
 * Enhanced: live rider pulse, fare preview, animated gradient orb.
 */
export function BentoHero({ user, activeRide, scheduledCount }) {
  const { standardCampusFare, socketRef } = usePassenger();
  const firstName = (user?.name || 'Student').split(' ')[0];
  const [onlineRiders, setOnlineRiders] = useState(0);

  /* Live online rider count from socket (falls back gracefully) */
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
    <div className="ps-bento ps-fade-up">
      {/* Big hero cell */}
      <div className="ps-bento-cell ps-bento-cell--hero">
        <div className="ps-bento-hero-eyebrow">
          <span className="ps-bento-dot" />
          PAPIDO · CAMPUS MOBILITY

          <span className={`ps-bento-live-pill ${isLive ? 'is-live' : ''}`}>
            <span className="ps-bento-live-pulse" />
            {isLive ? `${onlineRiders} online` : 'Live network'}
          </span>
        </div>

        <h1 className="ps-bento-hero-title">
          Your campus.<br />
          Your ride.<br />
          <span className="ps-bento-hero-accent">Your way.</span>
        </h1>

        <p className="ps-bento-hero-sub">
          Hey {firstName} — where are we heading today?
        </p>

        <div className="ps-bento-hero-cta-row">
          <a href="#book-form" className="ps-bento-hero-cta">
            <Zap size={14} />
            Book a Ride
            <ArrowRight size={14} />
          </a>

          <div className="ps-bento-hero-fare-preview">
            <span className="ps-bento-fare-label">Starting from</span>
            <span className="ps-bento-fare-value">
              ₹{standardCampusFare || 25}
            </span>
          </div>
        </div>
      </div>

      {/* Stat cell: scheduled rides */}
      <div className="ps-bento-cell ps-bento-cell--stat">
        <div className="ps-bento-stat-icon">
          <Calendar size={18} />
        </div>
        <div className="ps-bento-stat-value">{scheduledCount}</div>
        <div className="ps-bento-stat-label">
          Pre-booked {scheduledCount === 1 ? 'trip' : 'trips'}
        </div>
        {scheduledCount > 0 && (
          <a href="/passenger/prebook" className="ps-bento-stat-link">
            View all <ArrowRight size={11} />
          </a>
        )}
      </div>

      {/* Stat cell: fare / active ride */}
      <div className="ps-bento-cell ps-bento-cell--stat ps-bento-cell--accent">
        <div className="ps-bento-stat-icon ps-bento-stat-icon--accent">
          {activeRide ? <Bike size={18} /> : <MapPin size={18} />}
        </div>
        {activeRide ? (
          <>
            <div className="ps-bento-stat-value ps-bento-stat-value--sm">
              {(activeRide.status || '').replace(/_/g, ' ')}
            </div>
            <div className="ps-bento-stat-label">
              Ride #{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}
            </div>
          </>
        ) : (
          <>
            <div className="ps-bento-stat-value ps-bento-stat-value--sm">
              ₹{standardCampusFare || 25}
            </div>
            <div className="ps-bento-stat-label">Campus flat rate</div>
            <div className="ps-bento-stat-badge">
              <ShieldCheck size={9} /> No surge pricing
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BentoHero;
