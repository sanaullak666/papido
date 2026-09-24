import React, { useState } from 'react';
import './book/book.css';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
import { usePassenger } from './shared/PassengerContext';
import { openPenaltyModal } from './shared/PassengerModals';
import { BentoHero } from './book/BentoHero';
import { BookingForm } from './book/BookingForm';
import { ActiveRideView } from './book/ActiveRideView';
import { CompletedRideView } from './book/CompletedRideView';

export function BookRidePage() {
  const { user, token } = useAuth();
  const {
    activeRide, setActiveRide,
    scheduledRides, flashFreeRide, setFlashFreeRide,
    pendingPenalty, setPendingPenalty, fetchPendingPenalty, setStatusMessage
  } = usePassenger();

  const [bookingLoading, setBookingLoading] = useState(false);

  /* ---------- Claim Flash Free Ride ---------- */
  const handleClaimFlash = async () => {
    if (!flashFreeRide?.id) return;
    setBookingLoading(true);
    try {
      const res = await apiRequest(
        `/customer/flash-free-ride/${flashFreeRide.id}/claim`,
        'POST', {}, token
      );
      const claimedRide = res.data?.ride || res.data;
      if (claimedRide) {
        setActiveRide(claimedRide);
        setFlashFreeRide(null);
        setStatusMessage({ text: 'Flash Free Ride claimed! Connecting with rider...', type: 'success' });
      }
    } catch (err) {
      setStatusMessage({ text: err.message || 'Failed to claim.', type: 'error' });
    } finally {
      setBookingLoading(false);
    }
  };

  /* ---------- Cancel active ride ---------- */
  const handleCancel = async (reason = 'Cancelled by passenger') => {
    if (!activeRide) return;
    try {
      const res = await apiRequest(
        `/customer/rides/${activeRide.id}/cancel`,
        'POST', { reason }, token
      );
      setActiveRide(null);
      if (res.data?.penalty) {
        setPendingPenalty(res.data.penalty);
        openPenaltyModal(res.data.penalty);
      } else if (typeof fetchPendingPenalty === 'function') {
        fetchPendingPenalty();
      }
      setStatusMessage({ text: 'Ride cancelled.', type: 'info' });
    } catch (err) {
      setStatusMessage({ text: err.message || 'Failed to cancel.', type: 'error' });
    }
  };

  const showBookingView = !activeRide;

  return (
    <div className="ps-book-page">
      <div className="ps-book-container">

        {/* Pending penalty banner (always on top) */}
        {pendingPenalty && showBookingView && (
          <div
            className="ps-penalty-banner ps-fade-up"
            style={{ cursor: 'pointer' }}
            onClick={() => openPenaltyModal(pendingPenalty)}
          >
            <div className="ps-penalty-banner-left">
              <div className="ps-penalty-banner-icon">
                <span>!</span>
              </div>
              <div>
                <div className="ps-penalty-banner-title">
                  Unpaid ₹15 Driver Compensation
                </div>
                <div className="ps-penalty-banner-sub">
                  Settle to {pendingPenalty.rider_name || 'Driver'} to unlock new rides.
                </div>
              </div>
            </div>
            <button
              type="button"
              className="ps-penalty-banner-btn"
              onClick={(e) => {
                e.stopPropagation();
                openPenaltyModal(pendingPenalty);
              }}
            >
              Pay ₹15 Now
            </button>
          </div>
        )}

        {/* Flash Free Ride banner */}
        {flashFreeRide?.status === 'OPEN' && showBookingView && (
          <div className="ps-flash-banner ps-fade-up">
            <div className="ps-flash-banner-top">
              <span className="ps-flash-badge">⚡ FLASH FREE RIDE (₹0)</span>
              <span className="ps-flash-hint">FASTEST FINGER FIRST</span>
            </div>
            <div className="ps-flash-route">
              {flashFreeRide.pickup_location || flashFreeRide.pickup}
              <span className="ps-flash-arrow">→</span>
              {flashFreeRide.destination_location || flashFreeRide.destination}
            </div>
            <button
              type="button"
              onClick={handleClaimFlash}
              disabled={bookingLoading}
              className="ps-flash-cta"
            >
              {bookingLoading ? 'CLAIMING...' : 'CLAIM THIS FREE RIDE NOW (₹0)'}
            </button>
          </div>
        )}

        {/* ================= MAIN VIEWS ================= */}

        {showBookingView && (
          <>
            {/* ✨ Bento Hero (spec §9) */}
            <BentoHero
              user={user}
              activeRide={activeRide}
              scheduledCount={scheduledRides?.length || 0}
            />

            {/* Booking form */}
            <BookingForm
              user={user}
              token={token}
              onBookingStart={() => setBookingLoading(true)}
              onBookingEnd={() => setBookingLoading(false)}
              bookingLoading={bookingLoading}
            />
          </>
        )}

        {activeRide && activeRide.status === 'COMPLETED' && (
          <CompletedRideView
            activeRide={activeRide}
            token={token}
            onClose={() => setActiveRide(null)}
            setStatusMessage={setStatusMessage}
          />
        )}

        {activeRide && activeRide.status !== 'COMPLETED' && (
          <ActiveRideView
            activeRide={activeRide}
            token={token}
            onCancel={handleCancel}
            setStatusMessage={setStatusMessage}
          />
        )}

      </div>
    </div>
  );
}

export default BookRidePage;
