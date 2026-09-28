import React from 'react';
import { PSCard, PSButton } from '../shared/PassengerUI';
import { Clock, Bike, Filter, ArrowRight, Receipt, Calendar } from 'lucide-react';

export function HistoryEmptyState({
  variant = 'empty',
  filterLabel,
  onReset
}) {
  if (variant === 'filtered') {
    return (
      <PSCard className="ps-animated-empty ps-animated-empty--filtered ps-fade-up">
        <div className="ps-animated-empty-visual">
          <div className="ps-animated-empty-icon-ring">
            <Filter size={32} color="#EA580C" />
          </div>
          <div className="ps-animated-empty-pulse" />
        </div>
        <h3 className="ps-animated-empty-title">
          No {filterLabel?.toLowerCase()} rides yet
        </h3>
        <p className="ps-animated-empty-desc">
          Try switching filters to see other trips.
        </p>
        <PSButton variant="primary" onClick={onReset}>
          Show all rides
        </PSButton>
      </PSCard>
    );
  }

  return (
    <PSCard className="ps-animated-empty ps-fade-up">
      <div className="ps-animated-empty-visual">
        <div className="ps-animated-empty-icon-ring">
          <Clock size={36} color="#EA580C" />
        </div>
        <div className="ps-animated-empty-pulse" />
      </div>

      <h3 className="ps-animated-empty-title">No rides yet</h3>

      <p className="ps-animated-empty-desc">
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

      <div className="ps-animated-empty-hints">
        <div className="ps-animated-empty-hint">
          <Receipt size={11} /> Receipts saved automatically
        </div>
        <div className="ps-animated-empty-hint">
          <Calendar size={11} /> Fare history always available
        </div>
      </div>
    </PSCard>
  );
}

export default HistoryEmptyState;
