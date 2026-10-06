import React from 'react';
import { PSCard } from '../shared/PassengerUI';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

export function AdvanceEmptyState() {
  return (
    <PSCard className="ps-empty-card ps-fade-up">
      <div className="ps-empty-icon">
        <Calendar size={36} color="#EA580C" />
      </div>

      <h3 className="ps-empty-title">No upcoming pre-booked rides</h3>

      <p className="ps-empty-sub">
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

      {/* Hint row */}
      <div className="ps-empty-hints">
        <div className="ps-empty-hint">
          <Clock size={12} />
          Dispatch 15 min before pickup
        </div>
        <div className="ps-empty-hint">
          Zero cancellation fee
        </div>
      </div>
    </PSCard>
  );
}

export default AdvanceEmptyState;
