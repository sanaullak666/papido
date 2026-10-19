import React, { useState, useEffect, useRef } from 'react';
import './ActiveTripPage.css';
import { apiRequest } from '../api';
import { useRider } from './shared/RiderContext';
import { calcDriverSplit, formatRideDateTime, getMapLink } from './shared/riderConstants';
import { RideStatusStepper } from '../components/ride/RideStatusStepper';
import { RPButton } from './shared/RiderUI';
import { alertManager } from '../utils/alertManager';
import {
  Bike,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Radio,
  X,
  CreditCard,
  QrCode,
  Zap,
  Check,
  Copy,
  RefreshCw,
  DollarSign
} from 'lucide-react';

export function ActiveTripPage({ onNavigateTab }) {
  const {
    activeRide,
    setActiveRide,
    actionLoading,
    handleStatusChange,
    handleToggleWaiting,
    waitingLoading,
    handleCancelActiveTrip,
    enteredOtp,
    setEnteredOtp,
    otpError,
    setOtpError,
    markRideCashPayment
  } = useRider();

  const isPaid = activeRide?.payment_status === 'PAID';
  const [showYoupiQr, setShowYoupiQr] = useState(false);
  const [youpiSession, setYoupiSession] = useState(null);
  const [loadingYoupi, setLoadingYoupi] = useState(false);
  const [youpiError, setYoupiError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [markingCash, setMarkingCash] = useState(false);
  const pollTimerRef = useRef(null);

  const fare = activeRide ? (activeRide.total_fare || activeRide.final_fare || activeRide.estimated_fare || 20) : 20;
  const split = calcDriverSplit(fare);

  const handleGenerateYoupiQr = async () => {
    setShowYoupiQr(true);
    setLoadingYoupi(true);
    setYoupiError('');
    try {
      const res = await apiRequest(`/payments/ride/${activeRide.id}/create`, 'POST', {
        returnUrl: `${window.location.origin}/driver/active?rideId=${activeRide.id}&paymentSuccess=1`
      });

      if (res?.data?.alreadyPaid) {
        setActiveRide(prev => ({
          ...prev,
          payment_status: 'PAID',
          utr: res.data.utr,
          payment_utr: res.data.utr
        }));
        return;
      }

      setYoupiSession(res.data);

      // Start live polling every 2.5s for real-time payment clearance
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      let attempts = 0;
      pollTimerRef.current = setInterval(async () => {
        attempts += 1;
        if (attempts > 60) {
          clearInterval(pollTimerRef.current);
        } else {
          try {
            const check = await apiRequest(`/payments/ride/${activeRide.id}`, 'GET');
            if (check?.data?.paymentStatus === 'PAID') {
              clearInterval(pollTimerRef.current);
              setActiveRide(prev => ({
                ...prev,
                payment_status: 'PAID',
                payment_method: 'UPI',
                utr: check.data.payment?.utr || 'YOUPI_VERIFIED',
                payment_utr: check.data.payment?.utr || 'YOUPI_VERIFIED'
              }));
              alertManager.playOneShot();
            }
          } catch (_) {}
        }
      }, 2500);
    } catch (err) {
      setYoupiError(err.message || 'Failed to initialize YouPI payment gateway session.');
    } finally {
      setLoadingYoupi(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    setCheckingPayment(true);
    try {
      const check = await apiRequest(`/payments/ride/${activeRide.id}`, 'GET');
      if (check?.data?.paymentStatus === 'PAID') {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setActiveRide(prev => ({
          ...prev,
          payment_status: 'PAID',
          payment_method: 'UPI',
          utr: check.data.payment?.utr || 'YOUPI_VERIFIED',
          payment_utr: check.data.payment?.utr || 'YOUPI_VERIFIED'
        }));
        alertManager.playOneShot();
      } else {
        alert('Payment not yet detected. If passenger transferred, it will verify automatically in a moment.');
      }
    } catch (err) {
      alert(err.message || 'Error checking payment status.');
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleMarkCash = async () => {
    if (!window.confirm(`Confirm passenger handed over ₹${fare} in CASH?`)) return;
    setMarkingCash(true);
    try {
      if (typeof markRideCashPayment === 'function') {
        await markRideCashPayment(activeRide.id);
      } else {
        await apiRequest(`/payments/ride/${activeRide.id}/mark-cash`, 'POST');
        setActiveRide(prev => ({ ...prev, payment_status: 'PAID', payment_method: 'CASH' }));
      }
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setShowYoupiQr(false);
    } catch (err) {
      alert(err.message || 'Failed to mark cash payment.');
    } finally {
      setMarkingCash(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  if (!activeRide) {
    return (
      <div className="rp-content rp-content--narrow">
        <div className="rp-empty rp-fade-up">
          <div className="rp-empty-icon">
            <Bike size={32} />
          </div>
          <h3 className="rp-empty-title">No Active Trip In Progress</h3>
          <p className="rp-empty-sub">
            You do not have an ongoing trip right now. Go to the Dispatch Radar to view and accept incoming ride requests.
          </p>
          <RPButton
            type="button"
            variant="primary"
            size="lg"
            onClick={() => onNavigateTab && onNavigateTab('radar')}
          >
            <Radio size={16} /> Go to Dispatch Radar
          </RPButton>
        </div>
      </div>
    );
  }

  const pickupTimeVal = activeRide.scheduled_time_ist || activeRide.scheduled_time || activeRide.scheduledTime;

  return (
    <div className="rp-content rp-content--narrow">
      <div className="rp-surface rp-surface--trip rp-fade-up">
        {/* Trip Code & Status Bar */}
        <div className="rp-trip-code-bar">
          <div className="rp-trip-code-left">
            <span className="rp-trip-code-label">TRIP CODE</span>
            <span className="rp-trip-code-val">#{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}</span>
          </div>
          <span className="rp-trip-status-tag">{String(activeRide.status || '').replace('_', ' ')}</span>
        </div>

        {/* Payment & Fare Section */}
        {isPaid ? (
          <div className="rp-payment-verified-card rp-fade-up">
            <div className="rp-payment-verified-head">
              <div className="rp-payment-verified-badge">
                <CheckCircle2 size={18} color="#10B981" />
                <span>PAID VIA YOUPI GATEWAY</span>
              </div>
              <span className="rp-tag--emerald">SETTLED ONLINE</span>
            </div>
            <div className="rp-payment-verified-body">
              <div>
                <div className="rp-payment-verified-label">Amount Paid by Passenger:</div>
                <div className="rp-payment-verified-val">₹{fare}</div>
                {activeRide.payment_utr || activeRide.utr ? (
                  <div className="rp-payment-verified-utr">
                    UTR: <strong>{activeRide.payment_utr || activeRide.utr}</strong>
                  </div>
                ) : null}
              </div>
              <div className="rp-payment-verified-splits">
                <div>Your Net: <strong>₹{activeRide.rider_earning || split.rider}</strong></div>
                <div>Platform Fee: <strong>₹{activeRide.company_earning || split.company}</strong></div>
              </div>
            </div>
            <div className="rp-payment-verified-notice">
              🛡️ <strong>No Cash Required:</strong> Passenger paid electronically via YouPI UPI Gateway. Do not collect cash from passenger.
            </div>
          </div>
        ) : (
          <div className="rp-cash-card rp-fade-up">
            <div className="rp-cash-top">
              <div>
                <div className="rp-cash-label">FARE TO COLLECT AT DROP:</div>
                <div className="rp-cash-value">₹{fare}</div>
                {Boolean(activeRide.waiting_fare > 0) && (
                  <div className="rp-cash-waiting">
                    Includes ₹{activeRide.waiting_fare} waiting charge ({activeRide.waiting_minutes || 0} mins)
                  </div>
                )}
              </div>
              <div className="rp-cash-right">
                <div className="rp-cash-net">
                  Net Pay: ₹{activeRide.rider_earning || split.rider}
                </div>
                <div className="rp-cash-fee">
                  Platform Fee: ₹{activeRide.company_earning || split.company}
                  {split.controller > 0 && ` + ₹${split.controller} Ctrl`}
                </div>
              </div>
            </div>

            {/* Quick Action buttons for YouPI Payment or Cash Collection */}
            <div className="rp-cash-actions">
              <button
                type="button"
                className="rp-btn rp-btn--primary rp-btn--sm"
                onClick={handleGenerateYoupiQr}
                disabled={loadingYoupi}
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <QrCode size={15} />
                <span>{loadingYoupi ? 'Generating QR...' : 'Collect via YouPI QR'}</span>
              </button>

              <button
                type="button"
                className="rp-btn rp-btn--ghost rp-btn--sm"
                onClick={handleMarkCash}
                disabled={markingCash}
                style={{
                  border: '1.5px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#334155',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <DollarSign size={15} />
                <span>{markingCash ? 'Marking...' : 'Passenger Paid Cash'}</span>
              </button>
            </div>
          </div>
        )}

        {/* YouPI QR Code Modal */}
        {showYoupiQr && !isPaid && (
          <div className="rp-modal-overlay rp-fade-in" onClick={() => setShowYoupiQr(false)}>
            <div className="rp-qr-modal rp-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="rp-qr-modal-head">
                <div className="rp-qr-modal-title">
                  <CreditCard size={18} color="#10B981" />
                  <span>YouPI Gateway — Scan to Pay ₹{fare}</span>
                </div>
                <button
                  type="button"
                  className="rp-qr-modal-close"
                  onClick={() => setShowYoupiQr(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="rp-qr-modal-body">
                {loadingYoupi ? (
                  <div className="rp-qr-loading">
                    <RefreshCw size={32} className="rp-spin" color="#10B981" />
                    <p>Generating dynamic YouPI QR code for Ride #{activeRide.ride_code || activeRide.id}...</p>
                  </div>
                ) : youpiError ? (
                  <div className="rp-qr-error">
                    <AlertCircle size={24} color="#DC2626" />
                    <p>{youpiError}</p>
                    <RPButton size="sm" variant="primary" onClick={handleGenerateYoupiQr}>
                      Retry
                    </RPButton>
                  </div>
                ) : youpiSession ? (
                  <>
                    <div className="rp-qr-code-wrapper">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(youpiSession.upiIntentUrl || youpiSession.checkoutUrl)}`}
                        alt="YouPI Payment QR"
                        className="rp-qr-img"
                      />
                      <div className="rp-qr-pulse-badge">
                        <span className="rp-pulse-dot" />
                        <span>Listening for payment confirmation...</span>
                      </div>
                    </div>

                    <p className="rp-qr-instructions">
                      Ask passenger to open <strong>Google Pay, PhonePe, Paytm, BHIM</strong>, or any UPI app and scan this QR code to pay exact fare <strong>₹{fare}</strong>.
                    </p>

                    <div className="rp-qr-upi-links">
                      <a
                        href={youpiSession.upiIntentUrl}
                        className="rp-btn rp-btn--sm rp-btn--success"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Zap size={14} /> 1-Tap UPI Intent
                      </a>
                      {youpiSession.checkoutUrl && (
                        <a
                          href={youpiSession.checkoutUrl}
                          className="rp-btn rp-btn--sm rp-btn--ghost"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <ExternalLink size={14} /> Open Checkout
                        </a>
                      )}
                      <button
                        type="button"
                        className="rp-btn rp-btn--sm rp-btn--ghost"
                        onClick={() => {
                          navigator.clipboard?.writeText(youpiSession.checkoutUrl || youpiSession.upiIntentUrl);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Copy size={14} />
                        <span>{copiedLink ? 'Copied Link!' : 'Copy Payment Link'}</span>
                      </button>
                    </div>

                    <div style={{ marginTop: 10, width: '100%', display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={handleCheckPaymentStatus}
                        disabled={checkingPayment}
                        className="rp-btn rp-btn--sm rp-btn--ghost"
                        style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <RefreshCw size={12} className={checkingPayment ? 'rp-spin' : ''} />
                        <span>{checkingPayment ? 'Checking Gateway...' : 'Refresh Payment Status'}</span>
                      </button>
                    </div>

                    <div className="rp-qr-modal-footer">
                      <button
                        type="button"
                        className="rp-btn rp-btn--block rp-btn--ghost"
                        onClick={handleMarkCash}
                        disabled={markingCash}
                        style={{ marginTop: 12, border: '1px dashed #94A3B8', fontSize: '12px' }}
                      >
                        Passenger handed cash instead? Mark Cash Paid
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Passenger Contact Card */}
        <div className="rp-passenger-card">
          <div>
            <div className="rp-passenger-name">{activeRide.customer_name || 'Passenger'}</div>
            <div className="rp-passenger-sub">Campus Passenger</div>
          </div>
          {activeRide.customer_phone && (
            <a href={`tel:${activeRide.customer_phone}`} className="rp-btn rp-btn--success rp-btn--sm">
              <Phone size={14} /> Call Passenger
            </a>
          )}
        </div>

        {/* Waiting Control (only visible once trip is STARTED) */}
        {activeRide.status === 'STARTED' && (
          <div className={`rp-waiting-card ${activeRide.is_waiting ? 'is-active' : ''}`}>
            <div className="rp-waiting-card-head">
              <div className="rp-waiting-card-left">
                <div className={`rp-waiting-card-icon ${activeRide.is_waiting ? 'is-active' : ''}`}>
                  <Clock size={16} />
                </div>
                <div>
                  <div className="rp-waiting-card-title">
                    {activeRide.is_waiting ? 'DRIVER ON WAITING MODE' : 'Trip Waiting Controls'}
                  </div>
                  <div className="rp-waiting-card-sub">
                    Policy: 0–9 mins free, ₹10 added for every 10 full minutes of waiting
                  </div>
                </div>
              </div>
              {Boolean(activeRide.is_waiting) && (
                <span className="rp-waiting-tag">ON WAITING</span>
              )}
            </div>

            <div className="rp-waiting-card-body">
              <div>
                <div className="rp-waiting-recorded-label">Total Waiting Recorded:</div>
                <div className="rp-waiting-recorded-value">
                  {activeRide.waiting_minutes || 0} mins (+₹{activeRide.waiting_fare || 0} added)
                </div>
              </div>
              <RPButton
                type="button"
                size="sm"
                variant={activeRide.is_waiting ? 'danger' : 'primary'}
                disabled={waitingLoading}
                loading={waitingLoading}
                onClick={handleToggleWaiting}
              >
                <Clock size={14} />
                {activeRide.is_waiting ? 'Stop Waiting' : 'Start Waiting Timer'}
              </RPButton>
            </div>
          </div>
        )}

        {/* Route Details Card */}
        <div className="rp-route-card">
          {Boolean(pickupTimeVal) && (
            <div className="rp-route-time-callout">
              <Clock size={14} />
              <span>Requested Pickup Time: <strong>{formatRideDateTime(pickupTimeVal)}</strong></span>
            </div>
          )}

          <div className="rp-route-row">
            <div><span className="rp-dot rp-dot--green" /> <strong>Pickup:</strong> {activeRide.pickup_address}</div>
            <a
              href={getMapLink(activeRide.pickup_address, activeRide.pickup_latitude, activeRide.pickup_longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="rp-map-link rp-map-link--lg"
            >
              <ExternalLink size={12} /> Navigate Pickup
            </a>
          </div>

          {activeRide.via_address && (
            <div className="rp-route-row">
              <div><span className="rp-dot rp-dot--amber" /> <strong>Via:</strong> {activeRide.via_address}</div>
              <a
                href={getMapLink(activeRide.via_address, activeRide.via_latitude, activeRide.via_longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="rp-map-link rp-map-link--lg"
              >
                <ExternalLink size={12} /> Navigate Via Stop
              </a>
            </div>
          )}

          <div className="rp-route-row">
            <div><span className="rp-dot rp-dot--rose" /> <strong>Drop:</strong> {activeRide.destination_address}</div>
            <a
              href={getMapLink(activeRide.destination_address, activeRide.destination_latitude, activeRide.destination_longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="rp-map-link rp-map-link--lg"
            >
              <ExternalLink size={12} /> Navigate Drop
            </a>
          </div>
        </div>

        {/* OTP Error Banner */}
        {otpError && (
          <div className="rp-status-banner is-error" role="status" aria-live="polite">
            <span className="rp-banner-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" strokeWidth="2.2" />
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2.2" />
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2.2" />
              </svg>
            </span>
            <span className="rp-banner-text">{otpError}</span>
            <button
              type="button"
              className="rp-banner-close"
              onClick={() => setOtpError(null)}
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24">
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </button>
          </div>
        )}

        {/* Stepper */}
        <div className="rp-stepper-card">
          <div className="rp-stepper-card-label">Trip Progression</div>
          <RideStatusStepper currentStatus={activeRide.status} />
        </div>

        {/* Step-by-Step Action Progression */}
        {activeRide.status === 'ACCEPTED' && (
          <RPButton
            type="button"
            variant="primary"
            size="lg"
            block
            loading={actionLoading}
            onClick={() => handleStatusChange('RIDER_ARRIVING')}
          >
            <Bike size={18} />
            <span>I am On The Way (Arriving)</span>
          </RPButton>
        )}

        {activeRide.status === 'RIDER_ARRIVING' && (
          <RPButton
            type="button"
            variant="primary"
            size="lg"
            block
            loading={actionLoading}
            onClick={() => handleStatusChange('RIDER_REACHED')}
          >
            <MapPin size={18} />
            <span>Reached Pickup Location</span>
          </RPButton>
        )}

        {activeRide.status === 'RIDER_REACHED' && (
          <div className="rp-otp-verify rp-fade-up">
            <div className="rp-otp-verify-head">
              <div className="rp-otp-verify-label">Verify Passenger to Start Trip</div>
              <div className="rp-otp-verify-sub">Ask passenger for their 4-digit Ride OTP:</div>
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              name={`ride_otp_${activeRide.id}`}
              id={`ride_otp_${activeRide.id}`}
              placeholder="••••"
              className="rp-otp-input"
              value={enteredOtp}
              onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
            <RPButton
              type="button"
              variant={enteredOtp.length === 4 ? 'success' : 'ghost'}
              size="lg"
              block
              disabled={actionLoading || enteredOtp.length !== 4}
              loading={actionLoading}
              onClick={() => handleStatusChange('STARTED')}
            >
              <CheckCircle2 size={18} />
              <span>Verify OTP &amp; Start Trip</span>
            </RPButton>
          </div>
        )}

        {activeRide.status === 'STARTED' && (
          <RPButton
            type="button"
            variant="success"
            size="lg"
            block
            loading={actionLoading}
            onClick={() => handleStatusChange('COMPLETED')}
          >
            <CheckCircle size={18} />
            <span>Reached Destination &amp; Complete Trip</span>
          </RPButton>
        )}

        {activeRide.status === 'COMPLETED' && (
          <div className="rp-trip-complete rp-fade-up">
            <CheckCircle size={48} color="#10B981" />
            <h3 className="rp-trip-complete-title">
              {isPaid ? 'Trip Completed & Settled!' : 'Trip Completed!'}
            </h3>
            <div className="rp-trip-code-val" style={{ margin: '4px 0 12px', display: 'inline-block' }}>
              #{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}
            </div>

            <div className="rp-trip-complete-summary">
              {isPaid ? (
                <>
                  <div className="rp-trip-complete-label" style={{ color: '#059669', fontWeight: 800 }}>
                    ✅ PAID VIA YOUPI GATEWAY (₹{fare})
                  </div>
                  {activeRide.payment_utr || activeRide.utr ? (
                    <div style={{ fontSize: '12px', color: '#065F46', marginTop: 4, fontFamily: 'monospace' }}>
                      UTR: {activeRide.payment_utr || activeRide.utr}
                    </div>
                  ) : null}
                  <div className="rp-trip-complete-net" style={{ marginTop: 8 }}>
                    Your Net Take-Home: ₹{activeRide.rider_earning || split.rider}
                  </div>
                </>
              ) : (
                <>
                  <div className="rp-trip-complete-label">FARE TO COLLECT:</div>
                  <div className="rp-trip-complete-value">₹{fare}</div>
                  <div className="rp-trip-complete-net">
                    Your Net Take-Home: ₹{activeRide.rider_earning || split.rider}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12, width: '100%' }}>
                    <button
                      type="button"
                      className="rp-btn rp-btn--primary rp-btn--sm"
                      onClick={handleGenerateYoupiQr}
                      style={{
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        color: '#FFF',
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <QrCode size={14} /> Show YouPI QR
                    </button>
                    <button
                      type="button"
                      className="rp-btn rp-btn--secondary rp-btn--sm"
                      onClick={handleMarkCash}
                      disabled={markingCash}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <DollarSign size={14} /> Paid Cash
                    </button>
                  </div>
                </>
              )}
            </div>

            <RPButton
              type="button"
              variant="primary"
              size="lg"
              block
              onClick={() => {
                setActiveRide(null);
                setEnteredOtp('');
                if (onNavigateTab) onNavigateTab('radar');
              }}
            >
              Return to Radar for Next Trip
            </RPButton>
          </div>
        )}

        {/* Emergency trip cancellation before ride starts */}
        {['ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED'].includes(activeRide.status) && (
          <RPButton
            type="button"
            variant="danger-soft"
            block
            disabled={actionLoading}
            onClick={handleCancelActiveTrip}
          >
            Cancel Trip (Driver Emergency)
          </RPButton>
        )}
      </div>
    </div>
  );
}

export default ActiveTripPage;
