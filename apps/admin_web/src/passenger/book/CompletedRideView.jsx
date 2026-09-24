import React, { useState } from 'react';
import { apiRequest } from '../../api';
import { usePassenger } from '../shared/PassengerContext';
import { PSButton, PSCard } from '../shared/PassengerUI';
import { RatingControl } from '../../components/passenger/RatingControl';
import { CheckCircle2, Phone, Bike } from 'lucide-react';

export function CompletedRideView({ activeRide, token, onClose, setStatusMessage }) {
  const { standardCampusFare } = usePassenger();
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fare = activeRide.final_fare || activeRide.total_fare || activeRide.estimated_fare || (standardCampusFare || 25);

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
      setTimeout(onClose, 2000);
    } catch (err) {
      setStatusMessage({ text: err.message || 'Failed to submit rating.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem(`skipped_feedback_${activeRide.id}`, 'true');
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
          <div className="ps-thanks-summary-fare-label">Fare Paid</div>
          <div className="ps-thanks-summary-fare">₹{fare}</div>
        </div>
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
