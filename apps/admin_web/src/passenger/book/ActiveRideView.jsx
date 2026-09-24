import React, { useState } from 'react';
import { usePassenger } from '../shared/PassengerContext';
import { RideStatusStepper } from '../../components/ride/RideStatusStepper';
import { PSButton, PSCard } from '../shared/PassengerUI';
import { openCancelWarning } from '../shared/PassengerModals';
import {
  Bike, MapPin, Clock, Phone, Search, CheckCircle, Navigation,
  ExternalLink, Star, Award, Sparkles, ShieldCheck, ThumbsUp,
  QrCode, Copy, Smartphone, CreditCard, Check, Calendar, Users, Zap
} from 'lucide-react';

export function ActiveRideView({ activeRide, onCancel, setStatusMessage }) {
  const { socketRef, standardCampusFare } = usePassenger();
  const [showTripQr, setShowTripQr] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleCancelClick = () => {
    if (activeRide.status === 'RIDER_REACHED') {
      openCancelWarning(() => onCancel('Cancelled by passenger after arrival'));
    } else {
      onCancel('Cancelled by passenger');
    }
  };

  const statusLabel = {
    PENDING_ADMIN_QUOTE: 'Submitted to Dispatch',
    REQUESTED: 'Searching for nearby riders...',
    ACCEPTED: 'Rider accepted your trip',
    RIDER_ARRIVING: 'Rider is on the way',
    RIDER_REACHED: 'Rider has arrived',
    STARTED: 'Trip in progress'
  }[activeRide.status] || activeRide.status;

  const isEm = ['ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED', 'STARTED'].includes(activeRide.status);

  const fare = activeRide.total_fare || activeRide.final_fare || activeRide.estimated_fare || (standardCampusFare || 25);

  /* UPI payment URL & NPCI Intent Specifications */
  const driverUpi = (activeRide.rider_upi_id || '').trim()
    || (activeRide.rider_phone ? `${activeRide.rider_phone}@upi` : 'driver@upi');
  const driverName = activeRide.rider_name || 'Campus Driver';
  const rawFare = activeRide.total_fare || activeRide.final_fare || activeRide.estimated_fare || (standardCampusFare || 25);
  const formattedFare = Number(rawFare).toFixed(2);
  const txRef = String(activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id || Date.now()}`).trim();
  const txNote = `Papido_${txRef}`;

  // App-specific intent URIs & universal generic fallback
  const gpayUrl = `gpay://upi/pay?pa=${encodeURIComponent(driverUpi)}&pn=${encodeURIComponent(driverName)}&tr=${encodeURIComponent(txRef)}&am=${formattedFare}&tn=${encodeURIComponent(txNote)}&cu=INR`;
  const phonepeUrl = `phonepe://pay?pa=${encodeURIComponent(driverUpi)}&pn=${encodeURIComponent(driverName)}&tr=${encodeURIComponent(txRef)}&am=${formattedFare}&tn=${encodeURIComponent(txNote)}&cu=INR`;
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(driverUpi)}&pn=${encodeURIComponent(driverName)}&tr=${encodeURIComponent(txRef)}&am=${formattedFare}&tn=${encodeURIComponent(txNote)}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiPayUrl)}`;

  return (
    <div className="ps-live-trip ps-fade-up">

      {/* Status badge */}
      <div className={`ps-status-badge-card ${isEm ? 'is-emerald' : 'is-amber'}`}>
        <div className="ps-status-badge-card-header">
          <div className="ps-status-badge-card-label">
            STATUS: {activeRide.status}
          </div>
          <span className="ps-status-ride-code-badge">
            Ride #{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}
          </span>
        </div>
        <div className="ps-status-badge-card-text">
          {activeRide.status === 'REQUESTED' && <><Search size={18} /> {statusLabel}</>}
          {activeRide.status === 'ACCEPTED' && <><CheckCircle size={18} color="#059669" /> {statusLabel}</>}
          {activeRide.status === 'RIDER_ARRIVING' && <><Bike size={18} /> {statusLabel}</>}
          {activeRide.status === 'RIDER_REACHED' && <><MapPin size={18} /> {statusLabel}</>}
          {activeRide.status === 'STARTED' && <><Navigation size={18} /> {statusLabel}</>}
          {activeRide.status === 'PENDING_ADMIN_QUOTE' && <><Clock size={18} /> {statusLabel}</>}
        </div>
      </div>

      {/* Stepper */}
      <div className="ps-stepper-card">
        <div className="ps-stepper-card-label">Ride Progression</div>
        <RideStatusStepper currentStatus={activeRide.status} />
      </div>

      {/* Route card */}
      <div className="ps-route-card">
        <div className="ps-route-card-header">
          <div className="ps-route-card-live">
            <span className={`ps-live-dot ${socketRef.current?.connected ? 'is-live' : 'is-pending'}`} />
            <span>Live Route</span>
          </div>
          {activeRide.pickup_address && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeRide.pickup_address)}&destination=${encodeURIComponent(activeRide.destination_address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ps-route-open-link"
            >
              <ExternalLink size={12} /> Open Navigation
            </a>
          )}
        </div>

        <div className="ps-route-timeline">
          <div className="ps-route-stop">
            <div className="ps-route-marker ps-route-marker--pickup ps-pulse-marker">P</div>
            <div className="ps-route-stop-body">
              <div className="ps-route-stop-label">Pickup</div>
              <div className="ps-route-stop-value">{activeRide.pickup_address}</div>
            </div>
          </div>

          {activeRide.via_address && (
            <div className="ps-route-stop">
              <div className="ps-route-marker ps-route-marker--via">V</div>
              <div className="ps-route-stop-body">
                <div className="ps-route-stop-label">Via</div>
                <div className="ps-route-stop-value">{activeRide.via_address}</div>
              </div>
            </div>
          )}

          <div className="ps-route-stop">
            <div className="ps-route-marker ps-route-marker--drop">D</div>
            <div className="ps-route-stop-body">
              <div className="ps-route-stop-label">Drop</div>
              <div className="ps-route-stop-value">{activeRide.destination_address}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled confirmed banner */}
      {activeRide.status === 'ACCEPTED' && activeRide.scheduled_time && (
        <div className="ps-confirmed-banner ps-fade-up">
          <div className="ps-confirmed-left">
            <div className="ps-confirmed-icon">
              <Calendar size={16} />
            </div>
            <div>
              <div className="ps-confirmed-title">Confirmed for your time</div>
              <div className="ps-confirmed-sub">{activeRide.scheduled_time}</div>
            </div>
          </div>
          <span className="ps-confirmed-tag">CONFIRMED</span>
        </div>
      )}

      {/* Waiting banner */}
      {activeRide.is_waiting && (
        <div className="ps-waiting-banner ps-pulse-soft">
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

      {/* Fare card */}
      <div className="ps-fare-pay-card">
        <div>
          <div className="ps-fare-pay-label">FARE TO PAY</div>
          <div className="ps-fare-pay-value">₹{fare}</div>
        </div>
        <div className="ps-fare-pay-right">
          <span className="ps-fare-pay-method">
            {activeRide.payment_method || 'CASH'} ON DROP
          </span>
        </div>
      </div>

      {/* OTP */}
      {['ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED'].includes(activeRide.status) &&
       (activeRide.otp || activeRide.otp_code) && (
        <div className="ps-otp-card ps-fade-up">
          <div className="ps-otp-header-row">
            <span className="ps-otp-ride-chip">#{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}</span>
            <span className="ps-otp-label">Share OTP with rider</span>
          </div>
          <div className="ps-otp-value">{activeRide.otp || activeRide.otp_code}</div>
          <div className="ps-otp-note">Verify before sharing.</div>
        </div>
      )}

      {/* Rider card */}
      {activeRide.rider_name && (
        <div className="ps-rider-card ps-fade-up">
          <div className="ps-rider-card-head">
            <div className="ps-rider-card-head-left">
              <div className="ps-rider-avatar">
                <Bike size={22} color="#FFFFFF" />
              </div>
              <div>
                <div className="ps-rider-name-row">
                  <div className="ps-rider-name">{activeRide.rider_name}</div>
                  {activeRide.rider_rating && (
                    <span className="ps-rider-rating-pill">
                      <Star size={11} fill="#D97706" color="#D97706" />
                      {Number(activeRide.rider_rating).toFixed(1)}
                    </span>
                  )}
                </div>
                {!(activeRide.rider_is_core || activeRide.is_core_member) && (
                  <div className="ps-rider-vehicle">
                    {activeRide.rider_vehicle_model || 'Honda Activa'} · {activeRide.rider_vehicle_number || 'PY 01 AB 1234'}
                  </div>
                )}
              </div>
            </div>
            {activeRide.rider_phone && (
              <a href={`tel:${activeRide.rider_phone}`} className="ps-rider-call-btn">
                <Phone size={14} /> Call
              </a>
            )}
          </div>
        </div>
      )}

      {/* UPI payment */}
      {(activeRide.rider_name || activeRide.rider_id) && !activeRide.is_free_ride && !activeRide.is_core_only && parseFloat(fare) > 0 && (
        <div className="ps-upi-card ps-fade-up">
          <div className="ps-upi-header">
            <div className="ps-upi-header-left">
              <div className="ps-upi-icon"><CreditCard size={18} /></div>
              <div>
                <div className="ps-upi-title">Pay via UPI</div>
                <div className="ps-upi-sub">{driverName}'s verified UPI</div>
              </div>
            </div>
            <div className="ps-upi-fare-right">
              <div className="ps-upi-fare-label">Fare</div>
              <div className="ps-upi-fare-value">₹{fare}</div>
            </div>
          </div>

          <div className="ps-upi-actions">
            <a href={gpayUrl} className="ps-upi-action ps-upi-action--gpay" rel="noopener noreferrer">
              <Smartphone size={15} /> GPay
            </a>
            <a href={phonepeUrl} className="ps-upi-action ps-upi-action--phonepe" rel="noopener noreferrer">
              <Zap size={15} /> PhonePe
            </a>
            <a href={upiPayUrl} className="ps-upi-action ps-upi-action--generic" rel="noopener noreferrer">
              <ExternalLink size={14} /> Any UPI
            </a>
          </div>

          <div className="ps-upi-copy-row">
            <div>
              <div className="ps-upi-copy-label">Driver UPI</div>
              <div className="ps-upi-copy-value">{driverUpi}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(driverUpi);
                setCopiedUpi(true);
                setTimeout(() => setCopiedUpi(false), 2500);
              }}
              className={`ps-upi-copy-btn ${copiedUpi ? 'is-copied' : ''}`}
            >
              {copiedUpi ? <Check size={12} /> : <Copy size={12} />}
              {copiedUpi ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="ps-qr-toggle-wrap">
            <button
              type="button"
              onClick={() => setShowTripQr(!showTripQr)}
              className="ps-qr-toggle"
            >
              <QrCode size={14} />
              {showTripQr ? 'Hide QR' : 'Show Payment QR'}
            </button>
            {showTripQr && (
              <div className="ps-qr-box ps-fade-up">
                <div className="ps-qr-inner">
                  <img src={qrCodeUrl} alt="Payment QR" className="ps-qr-img" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel */}
      {['REQUESTED', 'ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED'].includes(activeRide.status) && (
        <div style={{ marginTop: '12px' }}>
          {activeRide.status === 'RIDER_REACHED' && (
            <div style={{
              background: '#FFF7ED',
              border: '1px solid #FED7AA',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '8px',
              fontSize: '12px',
              color: '#9A3412',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <span>Driver has reached pickup location. Cancelling now incurs a <strong>₹15 driver compensation fee</strong> payable directly via UPI.</span>
            </div>
          )}
          <PSButton
            variant="danger"
            size="lg"
            block
            onClick={handleCancelClick}
          >
            {activeRide.status === 'RIDER_REACHED' ? 'Cancel Ride (₹15 Fee Applies)' : 'Cancel Ride'}
          </PSButton>
        </div>
      )}
    </div>
  );
}

export default ActiveRideView;
