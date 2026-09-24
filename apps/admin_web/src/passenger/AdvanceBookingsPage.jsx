import React, { useState } from 'react';
import './advance/advance.css';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
import { usePassenger } from './shared/PassengerContext';
import { PSButton, PSCard, PSSkeleton } from './shared/PassengerUI';
import { ScheduledRideCard } from './advance/ScheduledRideCard';
import { RescheduleModal } from './advance/RescheduleModal';
import { AdvanceEmptyState } from './advance/AdvanceEmptyState';
import { Calendar, RefreshCw, Clock } from 'lucide-react';

export function AdvanceBookingsPage() {
  const { token } = useAuth();
  const { scheduledRides, fetchScheduledRides, setStatusMessage } = usePassenger();

  const [loading, setLoading] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);

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
      setStatusMessage('Pre-booked ride cancelled. No charge applied.');
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
    setStatusMessage('Ride rescheduled successfully.');
  };

  const safeScheduledRides = scheduledRides || [];
  const isEmpty = safeScheduledRides.length === 0;

  return (
    <div className="ps-advance-page">
      <div className="ps-advance-container">

        {/* Header */}
        <div className="ps-tab-header">
          <div>
            <h1 className="ps-heading ps-heading--icon">
              <Calendar size={22} color="#EA580C" />
              Pre-Booked Campus Rides
            </h1>
            <p className="ps-subheading">
              Track, reschedule, and manage your advance trips.
            </p>
          </div>

          <div className="ps-tab-actions">
            <PSButton
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? 'ps-spin' : ''} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </PSButton>

            <a
              href="/passenger/book"
              className="ps-btn ps-btn--primary ps-btn--sm"
              style={{ textDecoration: 'none' }}
            >
              <Clock size={13} />
              Pre-Book New
            </a>
          </div>
        </div>

        {/* Body */}
        {loading && isEmpty ? (
          <div className="ps-skeleton-list">
            <PSSkeleton lines={3} />
            <PSSkeleton lines={3} />
          </div>
        ) : isEmpty ? (
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

        {/* Reschedule Modal */}
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
