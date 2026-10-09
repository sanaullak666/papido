import React, { useState, useEffect, useMemo } from 'react';
import './advance/advance.css';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
import { usePassenger } from './shared/PassengerContext';
import { ScheduledRideCard } from './advance/ScheduledRideCard';
import { RescheduleModal } from './advance/RescheduleModal';
import { AdvanceEmptyState } from './advance/AdvanceEmptyState';
import { AdvancePolicyCard } from './advance/AdvancePolicyCard';
import {
  Calendar, RefreshCw, Plus, Clock, CheckCircle2, ShieldCheck
} from 'lucide-react';

export function AdvanceBookingsPage() {
  const { token } = useAuth();
  const { scheduledRides, fetchScheduledRides, pastRides, fetchRideHistory, setStatusMessage } = usePassenger();

  const [loading, setLoading] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming', 'confirmed', 'past'

  useEffect(() => {
    fetchScheduledRides();
    if (typeof fetchRideHistory === 'function') fetchRideHistory();

    const interval = setInterval(() => {
      fetchScheduledRides();
    }, 4000);

    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        fetchScheduledRides();
        if (typeof fetchRideHistory === 'function') fetchRideHistory();
      }
    };
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([
      fetchScheduledRides(),
      typeof fetchRideHistory === 'function' ? fetchRideHistory() : Promise.resolve()
    ]);
    setLoading(false);
  };

  const handleCancel = async (rideId) => {
    if (!window.confirm(
      'Cancel this pre-booked ride? Zero cancellation fee applies.'
    )) return;

    try {
      await apiRequest(
        `/customer/rides/${rideId}/cancel-scheduled`,
        'POST', {}, token
      );
      await Promise.all([
        fetchScheduledRides(),
        typeof fetchRideHistory === 'function' ? fetchRideHistory() : Promise.resolve()
      ]);
      setStatusMessage({ text: 'Pre-booked ride cancelled. No charge applied.', type: 'info' });
    } catch (err) {
      setStatusMessage({
        text: err.message || 'Failed to cancel ride.',
        type: 'error'
      });
    }
  };

  const handleRescheduled = async () => {
    setRescheduleTarget(null);
    await Promise.all([
      fetchScheduledRides(),
      typeof fetchRideHistory === 'function' ? fetchRideHistory() : Promise.resolve()
    ]);
    setStatusMessage({ text: 'Ride rescheduled successfully.', type: 'success' });
  };

  const safeScheduledRides = scheduledRides || [];
  const confirmedRides = useMemo(() => safeScheduledRides.filter(r => r.rider_id || r.rider_name || r.status === 'ACCEPTED'), [safeScheduledRides]);
  const pastScheduledRides = useMemo(() => (pastRides || []).filter(r => (r.is_scheduled || r.isScheduled || r.scheduled_time) && ['COMPLETED', 'CANCELLED'].includes(r.status)), [pastRides]);

  const displayRides = useMemo(() => {
    if (filterTab === 'confirmed') return confirmedRides;
    if (filterTab === 'past') return pastScheduledRides;
    return safeScheduledRides;
  }, [filterTab, safeScheduledRides, confirmedRides, pastScheduledRides]);

  const isEmpty = displayRides.length === 0;

  const handleGoToSchedule = () => {
    window.history.pushState({}, '', '/passenger/book?mode=schedule');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="ps-advance-page">
      <div className="ps-advance-container">

        {/* Top Management Header (Stitch Design) */}
        <div className="ps-advance-header-card ps-fade-up">
          <div className="flex items-start gap-4">
            <div className="ps-advance-header-icon">
              <Calendar size={28} color="#EA580C" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="ps-tag-pill-sub">Concierge Desk</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="font-label-md text-primary font-semibold">
                  {safeScheduledRides.length} Active Reservation{safeScheduledRides.length === 1 ? '' : 's'}
                </span>
              </div>
              <h1 className="font-headline-lg ps-advance-header-title">Pre-Booked Campus Rides</h1>
              <p className="font-body-md ps-advance-header-sub">
                Track, reschedule, and manage your advance trips across Pondicherry University departments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              className="ps-advance-action-btn ps-advance-action-btn--refresh"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? 'ps-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="ps-advance-action-btn ps-advance-action-btn--primary"
              onClick={handleGoToSchedule}
            >
              <Plus size={16} />
              <span>Pre-Book New</span>
            </button>
          </div>
        </div>

        {/* 12-Column Responsive Bento Layout */}
        <div className="ps-book-grid">
          {/* Left Column: Itinerary list (8 cols) */}
          <div className="ps-book-col-main">

            {/* Filter Tabs backed by real ride records */}
            <div className="ps-advance-tabs ps-fade-up">
              <button
                type="button"
                className={`ps-advance-tab-btn ${filterTab === 'upcoming' ? 'is-active' : ''}`}
                onClick={() => setFilterTab('upcoming')}
              >
                All Active ({safeScheduledRides.length})
              </button>
              <button
                type="button"
                className={`ps-advance-tab-btn ${filterTab === 'confirmed' ? 'is-active' : ''}`}
                onClick={() => setFilterTab('confirmed')}
              >
                Driver Confirmed ({confirmedRides.length})
              </button>
              <button
                type="button"
                className={`ps-advance-tab-btn ${filterTab === 'past' ? 'is-active' : ''}`}
                onClick={() => setFilterTab('past')}
              >
                Past Completed ({pastScheduledRides.length})
              </button>
            </div>

            {/* Body */}
            {isEmpty ? (
              <AdvanceEmptyState />
            ) : (
              <div className="ps-rides-list">
                {displayRides.map((ride, idx) => (
                  <ScheduledRideCard
                    key={ride.id}
                    ride={ride}
                    index={idx}
                    onReschedule={() => setRescheduleTarget(ride)}
                    onCancel={() => handleCancel(ride.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Policies & Quick Hotline (4 cols) */}
          <div className="ps-book-col-side">
            <AdvancePolicyCard />
          </div>
        </div>

        {/* Reschedule Interactive Modal */}
        {rescheduleTarget && (
          <RescheduleModal
            ride={rescheduleTarget}
            token={token}
            onClose={() => setRescheduleTarget(null)}
            onSuccess={handleRescheduled}
          />
        )}

      </div>
    </div>
  );
}

export default AdvanceBookingsPage;
