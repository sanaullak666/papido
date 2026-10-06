import React, { useState } from 'react';
import { usePassenger } from '../shared/PassengerContext';
import { RideStatusStepper } from '../../components/ride/RideStatusStepper';
import { PSButton, PSCard } from '../shared/PassengerUI';
import { openCancelWarning } from '../shared/PassengerModals';
import {
  Bike, MapPin, Clock, Phone, Search, CheckCircle2, Navigation,
  ExternalLink, Star, ShieldCheck, QrCode, Copy, Smartphone,
  CreditCard, Check, Calendar, Download, AlertTriangle
} from 'lucide-react';

export function ActiveRideView({ activeRide, onCancel, setStatusMessage }) {
  const { socketRef, standardCampusFare } = usePassenger();
  const [payMode, setPayMode] = useState('QR');
  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleCancelClick = () => {
    if (activeRide.status === 'RIDER_REACHED') {
      openCancelWarning(() => onCancel('Cancelled by passenger after arrival'));
    } else {
      onCancel('Cancelled by passenger');
    }
  };

  /* Clear status heading hierarchy */
  const statusDetails = {
    REQUESTED: {
      title: 'Finding your campus rider',
      sub: 'Notifying nearby verified student riders...',
      tone: 'amber'
    },
    ACCEPTED: {
      title: 'Rider confirmed your trip',
      sub: 'Your rider is getting ready to depart.',
      tone: 'emerald'
    },
    RIDER_ARRIVING: {
      title: 'Rider is on the way',
      sub: `Heading towards ${activeRide.pickup_address || 'pickup'}`,
      tone: 'emerald'
    },
    RIDER_REACHED: {
      title: 'Rider has arrived!',
      sub: 'Your rider is waiting at the pickup point.',
      tone: 'emerald'
    },
    STARTED: {
      title: 'Trip in progress',
      sub: `Heading towards ${activeRide.destination_address || 'destination'}`,
      tone: 'blue'
    },
    PENDING_ADMIN_QUOTE: {
      title: 'Submitted to Dispatch',
      sub: 'Admin team is reviewing route distance.',
      tone: 'amber'
    }
  }[activeRide.status] || {
    title: (activeRide.status || 'Active Ride').replace(/_/g, ' '),
    sub: 'Trip active on campus.',
    tone: 'amber'
  };

  const isAssigned = ['ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED', 'STARTED'].includes(activeRide.status);
  const fare = activeRide.total_fare || activeRide.final_fare || activeRide.estimated_fare || (standardCampusFare || 25);

  /* UPI payment URL & NPCI Intent Specifications */
  const driverUpi = (activeRide.rider_upi_id || '').trim()
    || (activeRide.rider_phone ? `${activeRide.rider_phone}@upi` : 'driver@upi');
  const driverName = activeRide.rider_name || 'Campus Driver';
  const rawFare = activeRide.total_fare || activeRide.final_fare || activeRide.estimated_fare || (standardCampusFare || 25);
  const formattedFare = Number(rawFare).toFixed(2);

  const gpayUrl = `gpay://upi/pay?pa=${encodeURIComponent(driverUpi)}&pn=${encodeURIComponent(driverName)}&am=${formattedFare}&cu=INR`;
  const phonepeUrl = `phonepe://pay?pa=${encodeURIComponent(driverUpi)}&pn=${encodeURIComponent(driverName)}&am=${formattedFare}&cu=INR`;
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(driverUpi)}&pn=${encodeURIComponent(driverName)}&am=${formattedFare}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(upiPayUrl)}`;

  const handleDownloadQr = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Papido_QR_${driverName.replace(/\s+/g, '_')}_Rs${formattedFare}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (_) {
      window.open(qrCodeUrl, '_blank');
    }
  };

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeRide.pickup_address || '')}&destination=${encodeURIComponent(activeRide.destination_address || '')}`;

  return (
    <div className="ps-live-trip ps-fade-up">

      {/* ── 1. Strongest Heading: Current Status Card ── */}
      <div className={`ps-active-status-card ps-active-status-card--${statusDetails.tone}`}>
        <div className="ps-active-status-top">
          <span className="ps-active-ride-code">
            Ride #{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}
          </span>
          <span className={`ps-active-status-pill ps-active-status-pill--${statusDetails.tone}`}>
            {activeRide.status === 'REQUESTED' && (
              <span className="ps-searching-pulse" aria-hidden="true" />
            )}
            {activeRide.status.replace(/_/g, ' ')}
          </span>
        </div>

        <h1 className="ps-active-status-title">{statusDetails.title}</h1>
        <p className="ps-active-status-sub">{statusDetails.sub}</p>

        {/* Searching state compact indicator */}
        {activeRide.status === 'REQUESTED' && (
          <div className="ps-searching-bar">
            <span className="ps-searching-dot" />
            <span>Broadcasting request to nearby campus bikes</span>
          </div>
        )}
      </div>

      {/* ── 2. OTP Card (Shown when assigned before completion) ── */}
      {isAssigned && (activeRide.otp || activeRide.otp_code) && (
        <div className="ps-otp-card ps-fade-up" role="region" aria-label="Start OTP Code">
          <div className="ps-otp-header-row">
            <span className="ps-otp-label">START OTP</span>
            <span className="ps-otp-hint">Share with rider to begin ride</span>
          </div>
          <div className="ps-otp-value" aria-label={`OTP Code ${activeRide.otp || activeRide.otp_code}`}>
            {activeRide.otp || activeRide.otp_code}
          </div>
          <div className="ps-otp-note">
            Verify rider identity, then provide this 4-digit code upon boarding.
          </div>
        </div>
      )}

      {/* ── 3. Rider Details Card (Prioritized) ── */}
      {activeRide.rider_name && (
        <div className="ps-rider-card ps-fade-up" role="region" aria-label="Driver Information">
          <div className="ps-rider-card-head">
            <div className="ps-rider-card-head-left">
              <div className="ps-rider-avatar" aria-hidden="true">
                <Bike size={22} color="#FFFFFF" />
              </div>
              <div>
                <div className="ps-rider-name-row">
                  <span className="ps-rider-name">{activeRide.rider_name}</span>
                  {activeRide.rider_rating && (
                    <span className="ps-rider-rating-pill">
                      <Star size={11} fill="#EA580C" color="#EA580C" />
                      <span>{Number(activeRide.rider_rating).toFixed(1)}</span>
                    </span>
                  )}
                </div>

                <div className="ps-rider-vehicle-row">
                  <span className="ps-rider-vehicle-model">
                    {activeRide.rider_vehicle_model || 'Campus Scooter'}
                  </span>
                  <span className="ps-rider-vehicle-plate">
                    {activeRide.rider_vehicle_number || 'PY 01 CAMPUS'}
                  </span>
                </div>
              </div>
            </div>

            {activeRide.rider_phone && (
              <a
                href={`tel:${activeRide.rider_phone}`}
                className="ps-rider-call-btn"
                aria-label={`Call driver at ${activeRide.rider_phone}`}
              >
                <Phone size={14} aria-hidden="true" />
                <span>Call</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Progression Stepper ── */}
      <div className="ps-stepper-card" aria-label="Trip Progression">
        <div className="ps-stepper-card-label">Trip Status Progression</div>
        <RideStatusStepper currentStatus={activeRide.status} />
      </div>

      {/* ── 5. Authentic Route & Navigation ── */}
      <div className="ps-route-card" role="region" aria-label="Trip Route Details">
        <div className="ps-route-card-header">
          <div className="ps-route-card-live">
            <span className={`ps-live-dot ${socketRef?.current?.connected ? 'is-live' : ''}`} aria-hidden="true" />
            <span>Campus Transit Route</span>
          </div>

          {activeRide.pickup_address && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ps-route-open-link"
              title="Open route in Google Maps"
            >
              <ExternalLink size={12} aria-hidden="true" />
              <span>Open in Maps</span>
            </a>
          )}
        </div>

        <div className="ps-route-timeline">
          <div className="ps-route-stop">
            <div className="ps-route-marker ps-route-marker--pickup" aria-hidden="true">P</div>
            <div className="ps-route-stop-body">
              <div className="ps-route-stop-label">Pickup Point</div>
              <div className="ps-route-stop-value">{activeRide.pickup_address}</div>
            </div>
          </div>

          {activeRide.via_address && (
            <div className="ps-route-stop">
              <div className="ps-route-marker ps-route-marker--via" aria-hidden="true">V</div>
              <div className="ps-route-stop-body">
                <div className="ps-route-stop-label">Via Stop</div>
                <div className="ps-route-stop-value">{activeRide.via_address}</div>
              </div>
            </div>
          )}

          <div className="ps-route-stop">
            <div className="ps-route-marker ps-route-marker--drop" aria-hidden="true">D</div>
            <div className="ps-route-stop-body">
              <div className="ps-route-stop-label">Drop-off Destination</div>
              <div className="ps-route-stop-value">{activeRide.destination_address}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Waiting banner (if applicable) */}
      {Boolean(activeRide.is_waiting) && (
        <div className="ps-waiting-banner" role="status">
          <div className="ps-waiting-left">
            <div className="ps-waiting-icon"><Clock size={15} /></div>
            <div>
              <div className="ps-waiting-title">Rider is waiting</div>
              <div className="ps-waiting-sub">
                {activeRide.waiting_minutes || 0} mins (+₹{activeRide.waiting_fare || 0})
              </div>
            </div>
          </div>
          <span className="ps-waiting-tag">WAITING</span>
        </div>
      )}

      {/* ── 6. Fare & Payment Card ── */}
      <div className="ps-fare-pay-card">
        <div>
          <div className="ps-fare-pay-label">FARE PAYABLE</div>
          <div className="ps-fare-pay-value">₹{fare}</div>
        </div>
        <div className="ps-fare-pay-right">
          <span className="ps-fare-pay-method">
            {activeRide.payment_method || 'CASH'} ON DROP
          </span>
        </div>
      </div>

      {/* UPI QR Payment Options for trip */}
      {['STARTED', 'RIDER_REACHED'].includes(activeRide.status) && (
        <div className="ps-upi-pay-card ps-fade-up">
          <div className="ps-upi-pay-head">
            <div>
              <div className="ps-upi-pay-title">Instant UPI Settlement</div>
              <div className="ps-upi-pay-sub">Pay ₹{fare} directly to {driverName}</div>
            </div>
            <div className="ps-upi-mode-switch">
              <button
                type="button"
                className={`ps-upi-mode-btn ${payMode === 'QR' ? 'is-active' : ''}`}
                onClick={() => setPayMode('QR')}
              >
                <QrCode size={13} /> QR
              </button>
              <button
                type="button"
                className={`ps-upi-mode-btn ${payMode === 'APPS' ? 'is-active' : ''}`}
                onClick={() => setPayMode('APPS')}
              >
                <Smartphone size={13} /> Apps
              </button>
            </div>
          </div>

          {payMode === 'QR' ? (
            <div className="ps-upi-qr-view">
              <img src={qrCodeUrl} alt="UPI Payment QR Code" className="ps-upi-qr-img" />
              <div className="ps-upi-qr-actions">
                <button type="button" onClick={handleDownloadQr} className="ps-upi-btn ps-upi-btn--outline">
                  <Download size={13} /> Download QR
                </button>
                <button
                  type="button"
                  className="ps-upi-btn ps-upi-btn--outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(driverUpi);
                    setCopiedUpi(true);
                    setTimeout(() => setCopiedUpi(false), 2500);
                  }}
                >
                  {copiedUpi ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="ps-upi-apps-row">
              <a href={gpayUrl} className="ps-upi-app-btn">GPay</a>
              <a href={phonepeUrl} className="ps-upi-app-btn">PhonePe</a>
              <a href={upiPayUrl} className="ps-upi-app-btn">Any UPI</a>
            </div>
          )}
        </div>
      )}

      {/* ── 7. Secondary Action: Cancel Trip ── */}
      {['REQUESTED', 'ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED'].includes(activeRide.status) && (
        <div className="ps-cancel-section">
          <button
            type="button"
            onClick={handleCancelClick}
            className="ps-cancel-trip-btn"
          >
            Cancel Ride Request
          </button>
        </div>
      )}

    </div>
  );
}

export default ActiveRideView;
