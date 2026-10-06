import React from 'react';
import { Bike, MapPin, Calendar, ArrowRight, Zap } from 'lucide-react';
import { usePassenger } from '../shared/PassengerContext';

/**
 * Bento-style hero for the booking page.
 * Matches spec §9: "YOUR CAMPUS. YOUR RIDE." with editorial scale.
 * Different card sizes create visual hierarchy.
 */
export function BentoHero({ user, activeRide, scheduledCount }) {
  const { standardCampusFare } = usePassenger();
  const firstName = (user?.name || 'Student').split(' ')[0];

  return (
    <div className="ps-bento ps-fade-up">
      {/* Big hero cell */}
      <div className="ps-bento-cell ps-bento-cell--hero">
        <div className="ps-bento-hero-eyebrow">
          <span className="ps-bento-dot" />
          PAPIDO · CAMPUS MOBILITY
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
          <span className="ps-bento-hero-meta">
            <span className="ps-bento-live-dot" />
            Riders online now
          </span>
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

      {/* Stat cell: active ride preview (or fallback) */}
      <div className="ps-bento-cell ps-bento-cell--stat ps-bento-cell--accent">
        <div className="ps-bento-stat-icon ps-bento-stat-icon--accent">
          {activeRide ? <Bike size={18} /> : <MapPin size={18} />}
        </div>
        {activeRide ? (
          <>
            <div className="ps-bento-stat-value ps-bento-stat-value--sm">
              {(activeRide.status || '').replace('_', ' ')}
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
            <div className="ps-bento-stat-label">
              Standard campus fare
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BentoHero;
