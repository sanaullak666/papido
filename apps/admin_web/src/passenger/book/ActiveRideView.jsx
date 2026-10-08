import React, { useState } from 'react';
import { usePassenger } from '../shared/PassengerContext';
import { RideStatusStepper } from '../../components/ride/RideStatusStepper';
import { PSButton, PSCard } from '../shared/PassengerUI';
import { openCancelWarning, openPenaltyModal } from '../shared/PassengerModals';
import {
  Bike, MapPin, Clock, Phone, Search, CheckCircle2, Navigation,
  ExternalLink, Star, Award, Sparkles, ShieldCheck, ThumbsUp,
  QrCode, Copy, Smartphone, CreditCard, Check, Calendar, Users, Zap, Download,
  MessageCircle, AlertTriangle
} from 'lucide-react';

export function ActiveRideView({ activeRide, onCancel, setStatusMessage }) {
  const { socketRef, standardCampusFare } = usePassenger();
  const [payMode, setPayMode] = useState('APPS');
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
    ACCEPTED: 'Rider assigned & en route',
    RIDER_ARRIVING: 'Rider is arriving at pickup',
    RIDER_REACHED: 'Rider has reached your location',
    STARTED: 'Trip in progress'
  }[activeRide.status] || activeRide.status;

  const isEm = ['ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED', 'STARTED'].includes(activeRide.status);
  const fare = activeRide.total_fare || activeRide.final_fare || activeRide.estimated_fare || (standardCampusFare || 20);

  /* Driver UPI details */
  const driverUpi = (activeRide.rider_upi_id || '').trim()
    || (activeRide.rider_phone ? `${activeRide.rider_phone}@upi` : 'driver@upi');
  const driverName = activeRide.rider_name || 'Murugan S.';
  const rawFare = activeRide.total_fare || activeRide.final_fare || activeRide.estimated_fare || (standardCampusFare || 20);
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

  const otpStr = String(activeRide.otp || activeRide.otp_code || '4829');
  const otpDigits = otpStr.padStart(4, '0').slice(0, 4).split('');

  return (
    <div className="ps-active-ride-layout ps-fade-up">
      {/* Status banner */}
      <div className={`ps-status-pill-banner ps-fade-up ${isEm ? 'is-emerald' : 'is-amber'}`}>
        <div className="ps-status-pill-banner-inner">
          <div className="ps-status-pill-left">
            <span className="ps-status-live-dot-wrap">
              <span className="ps-status-live-ping" />
              <span className="ps-status-live-dot" />
            </span>
            <span className="ps-status-pill-title">{statusLabel}</span>
            <span className="ps-status-pill-dot">•</span>
            <span className="font-mono text-xs font-bold text-primary">
              #{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}
            </span>
          </div>
          <div className="ps-status-pill-right">
            <span>{activeRide.status === 'STARTED' ? 'On Trip' : 'Assigned & En Route'}</span>
          </div>
        </div>
      </div>

      <div className="ps-book-grid">
        {/* Left Column: Progress Stepper & Live Route Map (7 or 8 cols) */}
        <div className="ps-book-col-main">

          {/* Stepper Card */}
          <div className="ps-terminal-box">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-label-lg font-bold text-on-surface">Trip Progress</h3>
              <span className="font-label-sm text-primary font-semibold">Active Transit</span>
            </div>
            <RideStatusStepper currentStatus={activeRide.status} />
          </div>

          {/* Live Map Preview Tile */}
          <div className="ps-radar-card">
            <div className="ps-radar-head">
              <div className="ps-radar-head-title">
                <span className="ps-status-live-dot-wrap">
                  <span className="ps-status-live-ping" />
                  <span className="ps-status-live-dot" />
                </span>
                <span>PU Mobility Live Route Tracker</span>
              </div>
              {activeRide.pickup_address && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeRide.pickup_address)}&destination=${encodeURIComponent(activeRide.destination_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-label-sm text-primary flex items-center gap-1 hover:underline"
                >
                  <ExternalLink size={13} /> Maps
                </a>
              )}
            </div>

            <div className="ps-radar-viewport">
              <div className="ps-radar-bg-grid" />
              <div className="ps-radar-ring-pulse" />
              <div className="ps-radar-pin">
                <div className="ps-radar-pin-inner">
                  <Navigation size={15} />
                </div>
              </div>
              <div className="ps-radar-route-badge">
                <span className="truncate">
                  {activeRide.pickup_address?.split('(')[0]} → {activeRide.destination_address?.split('(')[0]}
                </span>
                <span className="text-tertiary font-bold">1.4 km (4 min)</span>
              </div>
            </div>

            {/* Route Status Timeline */}
            <div className="ps-route-timeline-stitch mt-2">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-primary mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-label-sm text-primary uppercase font-bold block">Pickup Spot</span>
                  <p className="font-body-sm text-on-surface truncate">{activeRide.pickup_address}</p>
                </div>
              </div>
              <div className="ml-1.5 w-0.5 h-6 bg-surface-variant my-1" />
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-error mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-label-sm text-on-surface-variant uppercase font-bold block">Destination</span>
                  <p className="font-body-sm text-on-surface truncate">{activeRide.destination_address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cancellation section */}
          {['REQUESTED', 'ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED'].includes(activeRide.status) && (
            <div className="ps-cancel-box">
              {activeRide.status === 'RIDER_REACHED' && (
                <div className="ps-cancel-warning">
                  <AlertTriangle size={16} />
                  <span>Driver has reached pickup. Cancelling now incurs a <strong>₹15 driver transit compensation fee</strong>.</span>
                </div>
              )}
              <button
                type="button"
                className="ps-cancel-btn"
                onClick={handleCancelClick}
              >
                {activeRide.status === 'RIDER_REACHED' ? 'Cancel Ride (₹15 Fee Applies)' : 'Cancel Trip'}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Active Driver Card & Live Boarding Credentials (4 or 5 cols) */}
        <div className="ps-book-col-side">
          <div className="ps-driver-credential-card ps-fade-up">

            {/* Status Pill in Card */}
            <div className="flex items-center justify-between mb-2">
              <span className="ps-driver-status-pill">
                <span className="ps-driver-status-dot" />
                {activeRide.status === 'STARTED' ? 'Trip in Progress' : 'Assigned & En Route'}
              </span>
              <span className="font-body-sm text-xs text-on-surface-variant">
                Arriving in <strong>2 min</strong>
              </span>
            </div>

            {/* Driver Info & Photo matching Stitch */}
            <div className="flex items-center gap-3 py-2">
              <div className="ps-driver-avatar-wrap">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5DP2MpkqxTJzbHWF8EbHF4HBCZfrGxcg0mHjmdU8WW-29fr4pYFIMnJdXZCaGUywgWlPvHCiE8FYSzks2MdMj3imjWFMaN-0j7gjvB1vOxh0jNST0v26QQGFrzRWeud_8wFrRJpx6zjYl5Q4HGtvBHKhs1qX2fGk-2d5QbPUrfNyjKmmrMYcfWUXc6v_g05yWvbw5GdnWcquWuCBNofBhkvhkJzqqvIYsHWi7fR0sOMvEbKlHjpWOZA"
                  alt={driverName}
                  className="w-14 h-14 rounded-full object-cover shadow-sm bg-surface-container"
                />
                <div className="ps-driver-verified-badge">
                  <Check size={11} color="#FFFFFF" strokeWidth={3} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-headline-md font-bold text-on-surface truncate">
                    {driverName}
                  </h4>
                  <div className="ps-driver-rating-badge">
                    <Star size={13} fill="#EA580C" color="#EA580C" />
                    <span>{Number(activeRide.rider_rating || 4.9).toFixed(1)}</span>
                  </div>
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  {activeRide.rider_vehicle_model || 'Hero Splendor EV'}
                </p>
                <p className="font-label-sm text-primary font-mono font-bold tracking-wider">
                  {activeRide.rider_vehicle_number || 'TN-32-AB-4021'}
                </p>
              </div>
            </div>

            {/* Perforated ticket divider with semicircular punch cutouts */}
            <div className="ps-ticket-perforated">
              <div className="ps-ticket-perforated-line" />
              <div className="ps-ticket-perforated-cut-left" />
              <div className="ps-ticket-perforated-cut-right" />
            </div>

            {/* 4-Digit Boarding OTP Highlight Card */}
            <div className="ps-otp-highlight-card">
              <div>
                <span className="ps-otp-highlight-title">Boarding Passcode (OTP)</span>
                <div className="ps-otp-highlight-sub">Share with driver only upon pickup</div>
              </div>
              <div className="ps-otp-digit-group">
                {otpDigits.map((d, i) => (
                  <span key={i} className="ps-otp-digit-box">{d}</span>
                ))}
              </div>
            </div>

            {/* Direct UPI Settlement Actions */}
            <div className="ps-upi-quick-dock">
              <div className="ps-upi-quick-head">
                <span className="ps-upi-quick-title">Direct UPI Settlement</span>
                <span className="ps-upi-quick-badge">
                  <CheckCircle2 size={13} color="#00855B" /> Instant Verification
                </span>
              </div>
              <div className="ps-upi-grid">
                <a href={gpayUrl} className="ps-upi-btn" target="_blank" rel="noopener noreferrer">
                  <CreditCard size={18} color="#0058BE" />
                  <span>Google Pay</span>
                </a>
                <a href={phonepeUrl} className="ps-upi-btn" target="_blank" rel="noopener noreferrer">
                  <Zap size={18} color="#EA580C" />
                  <span>PhonePe</span>
                </a>
                <button type="button" onClick={() => setPayMode(payMode === 'QR' ? 'APPS' : 'QR')} className="ps-upi-btn">
                  <QrCode size={18} color="#271E16" />
                  <span>Scan QR</span>
                </button>
              </div>

              {payMode === 'QR' && (
                <div className="mt-3 p-3 bg-surface-container-low rounded-xl text-center ps-fade-up">
                  <img src={qrCodeUrl} alt="UPI QR" className="w-36 h-36 mx-auto rounded-lg shadow-sm" />
                  <div className="flex justify-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      Save QR Image
                    </button>
                    <span className="text-xs text-outline">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(driverUpi);
                        setCopiedUpi(true);
                        setTimeout(() => setCopiedUpi(false), 2000);
                      }}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      {copiedUpi ? 'Copied!' : 'Copy UPI'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Driver Action Buttons: Call / Chat / SOS */}
            <div className="ps-driver-action-dock">
              {activeRide.rider_phone && (
                <a href={`tel:${activeRide.rider_phone}`} className="ps-driver-action-pill">
                  <Phone size={15} />
                  <span>Call Driver</span>
                </a>
              )}
              <a href={`sms:${activeRide.rider_phone || ''}`} className="ps-driver-action-pill">
                <MessageCircle size={15} />
                <span>Quick Message</span>
              </a>
              <a href="tel:112" className="ps-driver-sos-btn" title="Safety Emergency">
                <AlertTriangle size={16} />
              </a>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default ActiveRideView;
