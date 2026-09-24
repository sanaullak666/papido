import React from 'react';
import './outside/outside.css';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
import { usePassenger } from './shared/PassengerContext';
import { PSCard } from './shared/PassengerUI';
import { OutsideForm } from './outside/OutsideForm';
import { Compass } from 'lucide-react';

export function OutsideTripsPage() {
  const { token } = useAuth();
  const { setActiveRide, setStatusMessage, pendingPenalty } = usePassenger();

  const handleSubmit = async (payload) => {
    if (pendingPenalty) {
      setStatusMessage({
        text: 'Settle the outstanding ₹15 before requesting outside trips.',
        type: 'error'
      });
      return false;
    }

    try {
      const res = await apiRequest('/customer/outside-rides', 'POST', payload, token);
      if (res.data) {
        setActiveRide(res.data);
        setStatusMessage('Outside campus request submitted to dispatch!');
        window.history.pushState({}, '', '/passenger/book');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return true;
      }
    } catch (err) {
      setStatusMessage({
        text: err.message || 'Failed to submit outside trip.',
        type: 'error'
      });
    }
    return false;
  };

  return (
    <div className="ps-outside-page">
      <div className="ps-outside-container">

        <div className="ps-heading-block">
          <h1 className="ps-heading ps-heading--icon">
            <Compass size={24} color="#EA580C" />
            Outside Campus Ride
          </h1>
          <p className="ps-subheading">
            Travel anywhere outside campus — White Town, Rock Beach, JIPMER,
            Railway Station, Auroville, or ECR. Dispatch sets a fair
            distance-based fare.
          </p>
        </div>

        <PSCard className="ps-outside-card ps-fade-up">
          <OutsideForm onSubmit={handleSubmit} token={token} />
        </PSCard>

      </div>
    </div>
  );
}

export default OutsideTripsPage;
