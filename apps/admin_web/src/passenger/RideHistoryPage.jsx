import React, { useEffect, useMemo, useState } from 'react';
import './history/history.css';
import { usePassenger } from './shared/PassengerContext';
import { PSButton, PSCard, PSSkeleton } from './shared/PassengerUI';
import { HistoryCard } from './history/HistoryCard';
import { HistoryFilters } from './history/HistoryFilters';
import { HistoryEmptyState } from './history/HistoryEmptyState';
import { HistorySummary } from './history/HistorySummary';
import { History, RefreshCw } from 'lucide-react';

const FILTERS = [
  { id: 'ALL',         label: 'All' },
  { id: 'COMPLETED',   label: 'Completed' },
  { id: 'CANCELLED',   label: 'Cancelled' },
  { id: 'PREBOOKED',   label: 'Pre-booked' }
];

export function RideHistoryPage() {
  const { pastRides = [], loadingHistory, fetchRideHistory } = usePassenger();
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    fetchRideHistory();
  }, []);

  const safePastRides = pastRides || [];

  /* Derived: filter + sort */
  const filteredRides = useMemo(() => {
    const list = [...safePastRides];
    list.sort((a, b) => {
      const da = new Date(a.completed_at || a.requested_at || a.created_at || 0);
      const db = new Date(b.completed_at || b.requested_at || b.created_at || 0);
      return db - da;
    });

    if (activeFilter === 'ALL') return list;

    if (activeFilter === 'PREBOOKED') {
      return list.filter(r => r.is_scheduled || r.isScheduled || r.scheduled_time);
    }
    return list.filter(r => r.status === activeFilter);
  }, [safePastRides, activeFilter]);

  /* Derived: totals for summary */
  const totals = useMemo(() => {
    const completed = safePastRides.filter(r => r.status === 'COMPLETED');
    const prebooked = safePastRides.filter(r => Boolean(r.is_scheduled || r.isScheduled || r.scheduled_time));
    return {
      count: completed.length,
      prebookedCount: prebooked.length
    };
  }, [safePastRides]);

  const isEmpty = safePastRides.length === 0;
  const isFilteredEmpty = !isEmpty && filteredRides.length === 0;
  const showSkeletons = loadingHistory && isEmpty;

  return (
    <div className="ps-history-page">
      <div className="ps-history-container">

        {/* HEADER */}
        <div className="ps-tab-header">
          <div>
            <h1 className="ps-heading ps-heading--icon">
              <History size={22} color="#EA580C" />
              Ride History
            </h1>
            <p className="ps-subheading">
              Review completed trips, receipts, and pre-booked records.
            </p>
          </div>

          <PSButton
            variant="ghost"
            size="sm"
            onClick={fetchRideHistory}
            disabled={loadingHistory}
          >
            <RefreshCw size={13} className={loadingHistory ? 'ps-spin' : ''} />
            {loadingHistory ? 'Refreshing...' : 'Refresh'}
          </PSButton>
        </div>

        {/* SUMMARY (only when data exists) */}
        {!isEmpty && (
          <HistorySummary
            totalRides={totals.count}
            prebookedRides={totals.prebookedCount}
          />
        )}

        {/* FILTERS (only when data exists) */}
        {!isEmpty && (
          <HistoryFilters
            filters={FILTERS}
            active={activeFilter}
            counts={{
              ALL: safePastRides.length,
              COMPLETED: safePastRides.filter(r => r.status === 'COMPLETED').length,
              CANCELLED: safePastRides.filter(r => r.status === 'CANCELLED').length,
              PREBOOKED: safePastRides.filter(r =>
                r.is_scheduled || r.isScheduled || r.scheduled_time
              ).length
            }}
            onChange={setActiveFilter}
          />
        )}

        {/* BODY */}
        {showSkeletons ? (
          <div className="ps-skeleton-list">
            <PSSkeleton lines={3} />
            <PSSkeleton lines={3} />
            <PSSkeleton lines={3} />
          </div>
        ) : isEmpty ? (
          <HistoryEmptyState />
        ) : isFilteredEmpty ? (
          <HistoryEmptyState
            variant="filtered"
            filterLabel={FILTERS.find(f => f.id === activeFilter)?.label}
            onReset={() => setActiveFilter('ALL')}
          />
        ) : (
          <div className="ps-history-list">
            {filteredRides.map((ride, idx) => (
              <HistoryCard
                key={ride.id}
                ride={ride}
                index={idx}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default RideHistoryPage;
