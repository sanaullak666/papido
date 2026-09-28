import React from 'react';
import './outside/outside.css';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
import { usePassenger } from './shared/PassengerContext';
import { PSCard } from './shared/PassengerUI';
import { OutsideForm } from './outside/OutsideForm';
import {
  Compass, MapPin, Users, Sparkles, Route, ArrowRight
} from 'lucide-react';

const HOW_IT_WORKS_STEPS = [
  { id: 'pick', label: 'Pick location', icon: MapPin },
  { id: 'submit', label: 'Submit request', icon: Route },
  { id: 'quote', label: 'Get fair quote', icon: Sparkles },
  { id: 'ride', label: 'Rider assigned', icon: Users }
];

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

        {/* ── HERO ── */}
        <div className="ps-outside-hero ps-fade-up">
          <div className="ps-outside-hero-eyebrow">
            <Compass size={12} />
            OUTSIDE CAMPUS
          </div>
          <h1 className="ps-outside-hero-title">
            Go anywhere in <span className="ps-outside-hero-accent">Puducherry</span>
          </h1>
          <p className="ps-outside-hero-sub">
            White Town, Rock Beach, JIPMER, Railway Station, Auroville, or ECR —
            dispatch sets a fair distance-based fare.
          </p>
        </div>

        {/* ── HOW IT WORKS STEPPER (NEW) ── */}
        <div className="ps-outside-stepper ps-fade-up">
          {HOW_IT_WORKS_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === HOW_IT_WORKS_STEPS.length - 1;
            return (
              <React.Fragment key={step.id}>
                <div className="ps-outside-step">
                  <div className="ps-outside-step-icon">
                    <Icon size={14} />
                  </div>
                  <div className="ps-outside-step-label">{step.label}</div>
                </div>
                {!isLast && (
                  <div className="ps-outside-step-connector" aria-hidden="true">
                    <ArrowRight size={11} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── FORM CARD ── */}
        <PSCard className="ps-outside-card ps-fade-up">
          <OutsideForm onSubmit={handleSubmit} token={token} />
        </PSCard>

      </div>
    </div>
  );
}

export default OutsideTripsPage;
