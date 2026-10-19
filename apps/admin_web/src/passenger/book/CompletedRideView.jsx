import React, { useState } from 'react';
import { apiRequest } from '../../api';
import { usePassenger } from '../shared/PassengerContext';
import { RatingControl } from '../../components/passenger/RatingControl';
import { CheckCircle2, Bike, AlertCircle, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';

export function CompletedRideView({ activeRide, token, onClose, setStatusMessage }) {
  const { standardCampusFare, fetchRideHistory } = usePassenger();
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Authoritative payment state
  const isPaid = activeRide.payment_status === 'PAID';
  const paymentMethod = activeRide.payment_method || (isPaid ? 'ONLINE' : 'PENDING');
  const fare = parseFloat(activeRide.final_fare || activeRide.total_fare || activeRide.estimated_fare || (standardCampusFare || 25)).toFixed(2);
  const waitingFare = parseFloat(activeRide.waiting_fare || 0);
  const baseFare = parseFloat(activeRide.base_fare || (fare - waitingFare > 0 ? fare - waitingFare : fare)).toFixed(2);

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
      setTimeout(onClose, 1500);
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
    <div className="ps-completed-container ps-fade-up">
      {/* Success Badge & Title */}
      <div className="ps-completed-header">
        <div className="ps-completed-icon-wrapper">
          <CheckCircle2 size={36} className="text-emerald-500" />
        </div>
        <h2 className="ps-completed-title">Trip Completed</h2>
        <span className="ps-completed-code">
          Ride #{activeRide.ride_code || activeRide.rideCode || activeRide.id}
        </span>
      </div>

      {/* Route & Driver Card */}
      <div className="ps-completed-route-card">
        <div className="ps-completed-route-row">
          <MapPin size={16} className="text-orange-500 flex-shrink-0" />
          <div className="ps-completed-route-text">
            <span className="ps-completed-station-label">Route</span>
            <div className="ps-completed-station-names">
              <span>{activeRide.pickup_address}</span>
              <ArrowRight size={14} className="text-stone-400 inline mx-1.5" />
              <span>{activeRide.destination_address}</span>
            </div>
          </div>
        </div>

        {activeRide.rider_name && (
          <div className="ps-completed-driver-row">
            <span className="text-stone-500 text-xs font-medium">Rider</span>
            <span className="text-stone-800 text-xs font-bold">{activeRide.rider_name}</span>
          </div>
        )}
      </div>

      {/* Fare & Payment Summary Box */}
      <div className="ps-fare-breakdown-card">
        <div className="ps-fare-breakdown-header">
          <span className="ps-fare-breakdown-title">Fare Breakdown</span>
          <div className={`ps-payment-pill ${isPaid ? 'ps-payment-pill--paid' : 'ps-payment-pill--due'}`}>
            {isPaid ? (
              <>
                <ShieldCheck size={13} />
                <span>PAID {paymentMethod === 'CASH' ? '(CASH)' : '(ONLINE)'}</span>
              </>
            ) : (
              <>
                <AlertCircle size={13} />
                <span>PAYMENT PENDING</span>
              </>
            )}
          </div>
        </div>

        <div className="ps-fare-rows">
          <div className="ps-fare-row">
            <span>Base & Transit Fare</span>
            <span>₹{baseFare}</span>
          </div>
          {waitingFare > 0 && (
            <div className="ps-fare-row">
              <span>Waiting Charge ({activeRide.waiting_minutes || 0}m)</span>
              <span>₹{waitingFare.toFixed(2)}</span>
            </div>
          )}
          <div className="ps-fare-row ps-fare-row--total">
            <span>Total Fare</span>
            <span className="ps-fare-total-num">₹{fare}</span>
          </div>
        </div>

        <p className="ps-fare-payment-note">
          {isPaid
            ? paymentMethod === 'CASH'
              ? 'Cash fare was handed over directly to the rider.'
              : 'Payment confirmed received. No additional cash needed.'
            : 'Please pay the driver in cash or through driver’s direct UPI QR code.'}
        </p>
      </div>

      {/* Driver Rating & Review */}
      {!ratingSubmitted ? (
        <div className="ps-rating-box">
          <div className="ps-rating-title">How was your ride experience?</div>
          <div className="ps-rating-control-wrap">
            <RatingControl value={ratingVal} onChange={setRatingVal} size={30} />
          </div>
          <input
            type="text"
            placeholder="Add a feedback note (optional)..."
            className="ps-feedback-input"
            value={ratingReview}
            onChange={(e) => setRatingReview(e.target.value)}
            maxLength={180}
          />
          <div className="ps-action-row">
            <button
              type="button"
              className="ps-btn ps-btn--secondary"
              onClick={handleSkip}
            >
              Skip
            </button>
            <button
              type="button"
              className="ps-btn ps-btn--primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>
      ) : (
        <div className="ps-rating-thankyou">
          <CheckCircle2 size={18} className="text-emerald-600 inline mr-1.5" />
          <span>Thank you! Your rating has been recorded.</span>
        </div>
      )}

      {/* Book Next Ride */}
      <button
        type="button"
        className="ps-btn ps-btn--ghost w-full mt-3"
        onClick={handleSkip}
      >
        <Bike size={16} />
        <span>Book Another Ride</span>
      </button>
    </div>
  );
}

export default CompletedRideView;
