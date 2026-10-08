import React, { useState } from 'react';
import './outside/outside.css';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
import { usePassenger } from './shared/PassengerContext';
import { OutsideForm } from './outside/OutsideForm';
import { OutsideRoutePreviewCard } from './outside/OutsideRoutePreviewCard';
import { OutsideRecentTripsCard } from './outside/OutsideRecentTripsCard';
import { Compass, ShieldCheck } from 'lucide-react';

export function OutsideTripsPage() {
  const { token } = useAuth();
  const { setActiveRide, setStatusMessage, pendingPenalty, fetchScheduledRides } = usePassenger();

  const [destination, setDestination] = useState('Rock Beach / Promenade');
  const [destinationCoords, setDestinationCoords] = useState({ lat: 11.9338, lng: 79.8359 });

  const handleSelectRecentOrQuick = (destName, coords) => {
    setDestination(destName);
    if (coords) setDestinationCoords(coords);
  };

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
        if (payload.isScheduled) {
          if (typeof fetchScheduledRides === 'function') {
            await fetchScheduledRides();
          }
          setStatusMessage({
            text: 'Outside trip pre-booked successfully! Admin dispatch will review the route & quote fare.',
            type: 'success'
          });
          window.history.pushState({}, '', '/passenger/prebook');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
          setActiveRide(res.data);
          setStatusMessage('Outside campus request submitted to dispatch!');
          window.history.pushState({}, '', '/passenger/book');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
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

        {/* Top Ambient Banner & Header Info (Stitch Design) */}
        <div className="ps-outside-ambient-banner ps-fade-up">
          <div className="ps-outside-ambient-glow" />
          <div className="ps-outside-ambient-content">
            <div className="flex items-start gap-4">
              <div className="ps-outside-ambient-icon">
                <Compass size={28} color="#FFFFFF" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-headline-lg ps-outside-ambient-title">Outside Campus Ride</h1>
                  <span className="ps-outside-tag-pill">Inter-City</span>
                </div>
                <p className="font-body-md ps-outside-ambient-sub">
                  Travel anywhere outside campus — White Town, Rock Beach, JIPMER, Railway Station, Auroville, or ECR. Dispatch sets a fair distance-based fare.
                </p>
              </div>
            </div>

            {/* Formula Pill */}
            <div className="ps-outside-formula-pill">
              <ShieldCheck size={20} color="#00855B" />
              <div className="flex flex-col">
                <span className="font-label-sm text-on-surface-variant uppercase tracking-wider text-[10px]">
                  Fare Formula
                </span>
                <span className="font-label-md text-on-surface font-bold text-xs">
                  ₹12/km · Zero Surge
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 12-Column Bento Grid Workspace */}
        <div className="ps-book-grid">
          {/* Main Booking Form (8 cols) */}
          <div className="ps-book-col-main">
            <OutsideForm
              onSubmit={handleSubmit}
              token={token}
              destination={destination}
              setDestination={setDestination}
              destinationCoords={destinationCoords}
              setDestinationCoords={setDestinationCoords}
            />
          </div>

          {/* Right Column: Route Preview + Recent Destinations (4 cols) */}
          <div className="ps-book-col-side flex flex-col gap-5">
            <OutsideRoutePreviewCard
              destination={destination}
              pickup="Campus Gate 1 (Main Entrance)"
            />
            <OutsideRecentTripsCard
              onSelectDestination={handleSelectRecentOrQuick}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default OutsideTripsPage;
