import React from 'react';
import { PSCard, PSButton } from '../shared/PassengerUI';
import { Clock, Bike, Filter, ArrowRight } from 'lucide-react';

export function HistoryEmptyState({
  variant = 'empty',
  filterLabel,
  onReset
}) {
  if (variant === 'filtered') {
    return (
      <PSCard className="ps-empty-card ps-fade-up">
        <div className="ps-empty-icon">
          <Filter size={32} color="#EA580C" />
        </div>
        <h3 className="ps-empty-title">
          No {filterLabel?.toLowerCase()} rides yet
        </h3>
        <p className="ps-empty-sub">
          Try switching filters to see other trips.
        </p>
        <PSButton variant="primary" onClick={onReset}>
          Show all rides
        </PSButton>
      </PSCard>
    );
  }

  return (
    <PSCard className="ps-empty-card ps-fade-up">
      <div className="ps-empty-icon">
        <Clock size={36} color="#EA580C" />
      </div>

      <h3 className="ps-empty-title">No rides yet</h3>

      <p className="ps-empty-sub">
        Your completed campus rides and receipts will appear here
        automatically after your first trip.
      </p>

      <a
        href="/passenger/book"
        className="ps-btn ps-btn--primary ps-btn--md"
        style={{ textDecoration: 'none' }}
      >
        <Bike size={16} />
        Book Your First Ride
        <ArrowRight size={14} />
      </a>

      <div className="ps-empty-hints">
        <div className="ps-empty-hint">Receipts saved automatically</div>
        <div className="ps-empty-hint">Fare history always available</div>
      </div>
    </PSCard>
  );
}

export default HistoryEmptyState;
