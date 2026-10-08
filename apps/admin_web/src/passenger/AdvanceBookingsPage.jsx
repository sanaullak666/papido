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
  const { scheduledRides, fetchScheduledRides, setStatusMessage } = usePassenger();

  const [loading, setLoading] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [filterTab, setFilterTab] = useState('upcoming');

  useEffect(() => {
    fetchScheduledRides();

    const interval = setInterval(() => {
      fetchScheduledRides();
    }, 4000);

    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        fetchScheduledRides();
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
    await fetchScheduledRides();
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
      fetchScheduledRides();
      setStatusMessage({ text: 'Pre-booked ride cancelled. No charge applied.', type: 'info' });
    } catch (err) {
      setStatusMessage({
        text: err.message || 'Failed to cancel ride.',
        type: 'error'
      });
    }
  };

  const handleRescheduled = () => {
    setRescheduleTarget(null);
    fetchScheduledRides();
    setStatusMessage({ text: 'Ride rescheduled successfully.', type: 'success' });
  };

  const safeScheduledRides = scheduledRides || [];
  const isEmpty = safeScheduledRides.length === 0;

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
            <a
              href="/passenger/book"
              className="ps-advance-action-btn ps-advance-action-btn--primary"
            >
              <Plus size={16} />
              <span>Pre-Book New</span>
            </a>
          </div>
        </div>

        {/* 12-Column Responsive Bento Layout */}
        <div className="ps-book-grid">
          {/* Left Column: Itinerary list (8 cols) */}
          <div className="ps-book-col-main">

            {/* Filter Tabs */}
            <div className="ps-advance-tabs ps-fade-up">
              <button
                type="button"
                className={`ps-advance-tab-btn ${filterTab === 'upcoming' ? 'is-active' : ''}`}
                onClick={() => setFilterTab('upcoming')}
              >
                Upcoming ({safeScheduledRides.length})
              </button>
              <button
                type="button"
                className={`ps-advance-tab-btn ${filterTab === 'past' ? 'is-active' : ''}`}
                onClick={() => setFilterTab('past')}
              >
                Past Terminals
              </button>
              <button
                type="button"
                className={`ps-advance-tab-btn ${filterTab === 'passes' ? 'is-active' : ''}`}
                onClick={() => setFilterTab('passes')}
              >
                Recurring Passes
              </button>
            </div>

            {/* Body */}
            {isEmpty ? (
              <AdvanceEmptyState />
            ) : (
              <div className="ps-rides-list">
                {safeScheduledRides.map((ride, idx) => (
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
