import React from 'react';
import { PSCard } from '../shared/PassengerUI';
import { Calendar, Clock, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export function AdvanceEmptyState() {
  return (
    <PSCard className="ps-animated-empty ps-fade-up">
      <div className="ps-animated-empty-visual">
        <div className="ps-animated-empty-icon-ring">
          <Calendar size={36} color="#EA580C" />
        </div>
        <div className="ps-animated-empty-pulse" />
      </div>

      <h3 className="ps-animated-empty-title">
        No upcoming pre-booked rides
      </h3>

      <p className="ps-animated-empty-desc">
        Catch an early class, reach Gate 1 for a bus, or plan a trip
        across campus later. Pre-book ahead to guarantee a rider.
      </p>

      <a
        href="/passenger/book"
        className="ps-btn ps-btn--primary ps-btn--md"
        style={{ textDecoration: 'none' }}
      >
        Pre-Book a Ride Now
        <ArrowRight size={14} />
      </a>

      <div className="ps-animated-empty-hints">
        <div className="ps-animated-empty-hint">
          <Clock size={11} /> Dispatch 15 min before pickup
        </div>
        <div className="ps-animated-empty-hint">
          <ShieldCheck size={11} /> Zero cancellation fee
        </div>
        <div className="ps-animated-empty-hint">
          <Zap size={11} /> Instant rider match
        </div>
      </div>
    </PSCard>
  );
}

export default AdvanceEmptyState;
