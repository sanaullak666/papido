import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../api';
import { usePassenger } from '../shared/PassengerContext';
import { PSButton, PSCard } from '../shared/PassengerUI';
import { RatingControl } from '../../components/passenger/RatingControl';
import { CheckCircle2, Phone, Bike, CreditCard, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

export function CompletedRideView({ activeRide, token, onClose, setStatusMessage }) {
  const { standardCampusFare, fetchRideHistory } = usePassenger();
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Payment state
  const isInitiallyPaid = activeRide.payment_status === 'PAID';
  const [paymentStatus, setPaymentStatus] = useState(isInitiallyPaid ? 'PAID' : (activeRide.payment_status || 'PENDING'));
  const [paymentUtr, setPaymentUtr] = useState(activeRide.utr || null);
  const [payingYoupi, setPayingYoupi] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const pollTimerRef = useRef(null);

  const fare = activeRide.final_fare || activeRide.total_fare || activeRide.estimated_fare || (standardCampusFare || 25);

  // Poll payment status if payment session was launched
  const checkStatus = async (silent = false) => {
    if (!silent) setCheckingPayment(true);
    try {
      const res = await apiRequest(`/payments/ride/${activeRide.id}`, 'GET', null, token);
      if (res?.data?.paymentStatus === 'PAID') {
        setPaymentStatus('PAID');
        if (res.data.payment?.utr) setPaymentUtr(res.data.payment.utr);
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        if (setStatusMessage) {
          setStatusMessage({ text: 'Payment confirmed successfully via YouPI!', type: 'success' });
        }
      }
    } catch (_) {
      // Ignore background poll errors
    } finally {
      if (!silent) setCheckingPayment(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handlePayViaYoupi = async () => {
    setPayingYoupi(true);
    try {
      const res = await apiRequest(`/payments/ride/${activeRide.id}/create`, 'POST', {
        returnUrl: `${window.location.origin}/passenger/rides?rideId=${activeRide.id}&paymentSuccess=1`
      }, token);

      if (res?.data?.alreadyPaid) {
        setPaymentStatus('PAID');
        if (res.data.utr) setPaymentUtr(res.data.utr);
        return;
      }

      if (res?.data?.checkoutUrl) {
        // Open YouPI checkout in new window/tab, or fallback to direct location
        const checkoutWindow = window.open(res.data.checkoutUrl, '_blank');
        if (!checkoutWindow) {
          window.location.href = res.data.checkoutUrl;
        }

        // Start polling payment status every 3 seconds for 90 seconds
        let attempts = 0;
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = setInterval(() => {
          attempts += 1;
          if (attempts > 30) {
            clearInterval(pollTimerRef.current);
          } else {
            checkStatus(true);
          }
        }, 3000);
      }
    } catch (err) {
      if (setStatusMessage) {
        setStatusMessage({ text: err.message || 'Unable to initiate YouPI payment session.', type: 'error' });
      }
    } finally {
      setPayingYoupi(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await apiRequest(
        `/customer/rides/${activeRide.id}/rating`,
        'POST',
        { rating: ratingVal, review: ratingReview },
        token
      );
      sessionStorage.setItem(`skipped_feedback_${activeRide.id}`, 'true');
      setRatingSubmitted(true);
      if (typeof fetchRideHistory === 'function') fetchRideHistory();
      setTimeout(onClose, 2000);
    } catch (err) {
      if (setStatusMessage) {
        setStatusMessage({ text: err.message || 'Failed to submit rating.', type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem(`skipped_feedback_${activeRide.id}`, 'true');
    if (typeof fetchRideHistory === 'function') fetchRideHistory();
    onClose();
  };

  return (
    <PSCard className="ps-thanks-card ps-fade-up">
      <div className="ps-thanks-header">
        <div className="ps-thanks-icon">
          <CheckCircle2 size={36} color="#10B981" />
        </div>
        <h2 className="ps-heading">Trip Completed!</h2>
        <div className="ps-thanks-ride-code">
          Trip #{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}
        </div>
        <p className="ps-subheading">You've reached your campus destination.</p>
      </div>

      <div className="ps-thanks-summary">
        <div>
          <div className="ps-thanks-summary-rider">
            Rider: <strong>{activeRide.rider_name || 'Driver'}</strong>
          </div>
          <div className="ps-thanks-summary-route">
            {activeRide.pickup_address} → {activeRide.destination_address}
          </div>
        </div>
        <div className="ps-thanks-summary-right">
          <div className="ps-thanks-summary-fare-label">
            {paymentStatus === 'PAID' ? 'Fare Paid' : 'Fare Due'}
          </div>
          <div className="ps-thanks-summary-fare">₹{fare}</div>
        </div>
      </div>

      {/* Payment Gateway Box */}
      <div style={{
        margin: '12px 0 16px',
        padding: '12px 14px',
        borderRadius: '12px',
        background: paymentStatus === 'PAID' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
        border: `1px solid ${paymentStatus === 'PAID' ? '#10B981' : '#F59E0B'}`
      }}>
        {paymentStatus === 'PAID' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} color="#10B981" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#065F46' }}>
                  Paid via YouPI Gateway
                </div>
                {paymentUtr && (
                  <div style={{ fontSize: '11px', color: '#047857', fontFamily: 'monospace' }}>
                    UTR: {paymentUtr}
                  </div>
                )}
              </div>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px',
              background: '#D1FAE5',
              color: '#065F46'
            }}>
              Settled
            </span>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 700, color: '#92400E' }}>
                <AlertCircle size={15} color="#D97706" />
                <span>Payment Outstanding: ₹{fare}</span>
              </div>
              <button
                type="button"
                onClick={() => checkStatus(false)}
                disabled={checkingPayment}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#B45309',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <RefreshCw size={11} className={checkingPayment ? 'animate-spin' : ''} />
                <span>{checkingPayment ? 'Checking...' : 'Check Status'}</span>
              </button>
            </div>

            <PSButton
              variant="primary"
              block
              onClick={handlePayViaYoupi}
              disabled={payingYoupi}
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
              }}
            >
              <CreditCard size={16} />
              <span>{payingYoupi ? 'Launching YouPI...' : `Pay ₹${fare} via YouPI (UPI)`}</span>
              <ExternalLink size={14} style={{ opacity: 0.8 }} />
            </PSButton>
          </div>
        )}
      </div>

      {!ratingSubmitted ? (
        <>
          <div className="ps-rating-head">Rate your experience</div>
          <div className="ps-rating-control">
            <RatingControl value={ratingVal} onChange={setRatingVal} size={32} />
          </div>
          <input
            type="text"
            placeholder="Brief feedback (optional)..."
            className="ps-input"
            value={ratingReview}
            onChange={(e) => setRatingReview(e.target.value)}
          />
          <div className="ps-row-2" style={{ marginTop: 14 }}>
            <PSButton variant="ghost" onClick={handleSkip}>Skip</PSButton>
            <PSButton variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </PSButton>
          </div>
        </>
      ) : (
        <div className="ps-rating-thanks">
          Thank you! Your feedback was recorded.
        </div>
      )}

      <PSButton variant="ghost" block onClick={handleSkip} style={{ marginTop: 16 }}>
        <Bike size={16} /> Book Another Ride
      </PSButton>
    </PSCard>
  );
}

export default CompletedRideView;
