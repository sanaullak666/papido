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
import { ShieldCheck, Zap, Navigation, MapPin } from 'lucide-react';

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
            role="alert"
          >
            <div className="ps-penalty-banner-left">
              <div className="ps-penalty-banner-icon" aria-hidden="true">
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
          <div className="ps-flash-banner ps-fade-up" role="region" aria-label="Flash free ride offer">
            <div className="ps-flash-banner-top">
              <span className="ps-flash-badge">⚡ FLASH FREE RIDE (₹0)</span>
              <span className="ps-flash-hint">FASTEST FINGER FIRST</span>
            </div>
            <div className="ps-flash-route">
              {flashFreeRide.pickup_location || flashFreeRide.pickup}
              <span className="ps-flash-arrow" aria-hidden="true">→</span>
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
          <div className="ps-book-workspace">
            {/* Left Column: Focused 380–440px Booking Panel */}
            <div className="ps-book-panel">
              <BentoHero
                user={user}
                activeRide={activeRide}
                scheduledCount={scheduledRides?.length || 0}
              />

              <BookingForm
                user={user}
                token={token}
                onBookingStart={() => setBookingLoading(true)}
                onBookingEnd={() => setBookingLoading(false)}
                bookingLoading={bookingLoading}
              />
            </div>

            {/* Right Column: Flexible Context Workspace Panel (Desktop) */}
            <aside className="ps-context-panel" aria-label="Campus Transit Guide">
              <div className="ps-context-card ps-fade-up">
                <div className="ps-context-header">
                  <span className="ps-context-badge">CAMPUS MOBILITY TRANSIT</span>
                  <h2 className="ps-context-title">Pondicherry University Network</h2>
                  <p className="ps-context-desc">
                    Direct point-to-point campus rides between gates, academic blocks, central library, and all hostel clusters.
                  </p>
                </div>

                <div className="ps-context-features">
                  <div className="ps-context-feature-row">
                    <div className="ps-context-feature-icon" aria-hidden="true">₹25</div>
                    <div>
                      <div className="ps-context-feature-head">Standard Flat Fare</div>
                      <div className="ps-context-feature-sub">Fixed transparent rate across all internal university routes. No surge multipliers.</div>
                    </div>
                  </div>
                  <div className="ps-context-feature-row">
                    <div className="ps-context-feature-icon" aria-hidden="true">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div className="ps-context-feature-head">Verified Student Riders</div>
                      <div className="ps-context-feature-sub">Every driver is a verified university student with authenticated campus credentials.</div>
                    </div>
                  </div>
                  <div className="ps-context-feature-row">
                    <div className="ps-context-feature-icon" aria-hidden="true">
                      <Zap size={18} />
                    </div>
                    <div>
                      <div className="ps-context-feature-head">Direct Start OTP</div>
                      <div className="ps-context-feature-sub">Your ride only commences once you share your secure 4-digit code with the rider upon boarding.</div>
                    </div>
                  </div>
                </div>

                <div className="ps-context-hubs">
                  <div className="ps-context-hubs-title">Key Campus Stations</div>
                  <div className="ps-context-hubs-chips">
                    <span className="ps-hub-chip">Gate 1 (Main Gate)</span>
                    <span className="ps-hub-chip">Central Library</span>
                    <span className="ps-hub-chip">Madame Curie Hostels</span>
                    <span className="ps-hub-chip">Silver Jubilee Campus</span>
                    <span className="ps-hub-chip">Science Complex</span>
                    <span className="ps-hub-chip">ECR Gate 2</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {activeRide && activeRide.status === 'COMPLETED' && (
          <div className="ps-active-ride-wrap">
            <CompletedRideView
              activeRide={activeRide}
              token={token}
              onClose={() => setActiveRide(null)}
              setStatusMessage={setStatusMessage}
            />
          </div>
        )}

        {activeRide && activeRide.status !== 'COMPLETED' && (
          <div className="ps-active-ride-wrap">
            <ActiveRideView
              activeRide={activeRide}
              token={token}
              onCancel={handleCancel}
              setStatusMessage={setStatusMessage}
            />
          </div>
        )}

      </div>
    </div>
  );
}

export default BookRidePage;
