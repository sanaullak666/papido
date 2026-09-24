import React, { useState, useEffect } from 'react';
import './PassengerModals.css';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api';
import { usePassenger } from './PassengerContext';
import {
  AlertTriangle, X, CreditCard, Clock, QrCode, Smartphone,
  ExternalLink, Check, Copy, CheckCircle2, Lock, AlertCircle, MapPin,
  RefreshCw, Search, Compass, Calendar
} from 'lucide-react';

/* Cancel Warning Modal — triggered externally via window event */
export function useCancelWarningModal() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState(null);
  useEffect(() => {
    const handler = (e) => { setOpen(true); setPayload(e.detail); };
    window.addEventListener('ps:openCancelWarning', handler);
    return () => window.removeEventListener('ps:openCancelWarning', handler);
  }, []);
  return { open, setOpen, payload };
}

/* Penalty Payment Modal */
export function PenaltyPaymentModal({ penalty, onClose }) {
  const { token } = useAuth();
  const { fetchPendingPenalty, setStatusMessage } = usePassenger();
  const [payMode, setPayMode] = useState('QR');
  const [settling, setSettling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waitingConfirm, setWaitingConfirm] = useState(penalty?.status === 'PENDING_DRIVER_CONFIRMATION');

  if (!penalty) return null;

  const riderUpi = penalty.rider_upi || penalty.rider_upi_id || `${penalty.rider_phone || 'driver'}@upi`;
  const riderName = penalty.rider_name || penalty.rider_name_full || 'Driver';
  const txRef = String(penalty.ride_code || penalty.penalty_id || penalty.id || Date.now()).trim();
  const txNote = `Papido_Comp_${txRef}`;

  const gpayUri = `gpay://upi/pay?pa=${encodeURIComponent(riderUpi)}&pn=${encodeURIComponent(riderName)}&tr=${encodeURIComponent(txRef)}&am=15.00&tn=${encodeURIComponent(txNote)}&cu=INR`;
  const phonepeUri = `phonepe://pay?pa=${encodeURIComponent(riderUpi)}&pn=${encodeURIComponent(riderName)}&tr=${encodeURIComponent(txRef)}&am=15.00&tn=${encodeURIComponent(txNote)}&cu=INR`;
  const upiUri = penalty.upiPayUrl || `upi://pay?pa=${encodeURIComponent(riderUpi)}&pn=${encodeURIComponent(riderName)}&tr=${encodeURIComponent(txRef)}&am=15.00&tn=${encodeURIComponent(txNote)}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(upiUri)}`;

  const handleSettle = async () => {
    setSettling(true);
    try {
      const targetId = penalty.id || penalty.penalty_id || penalty.ride_id;
      const res = await apiRequest(`/customer/penalties/${targetId}/claim-paid`, 'POST', {
        paymentReference: `CLAIMED_${Date.now()}`
      }, token);
      if (res.data?.status === 'SETTLED' || res.data?.status === 'PAID') {
        onClose();
        setStatusMessage('Account unlocked.');
      } else {
        setWaitingConfirm(true);
      }
      fetchPendingPenalty();
    } catch (err) {
      alert(err.message || 'Failed to confirm payment.');
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="ps-modal-overlay">
      <div className="ps-modal ps-modal--md ps-modal-in ps-modal--amber">
        <div className="ps-modal-head">
          <div className="ps-modal-head-icon ps-modal-head-icon--amber">
            <CreditCard size={22} />
          </div>
          <div>
            <h3 className="ps-modal-title">Driver Compensation</h3>
            <p className="ps-modal-sub">Pay ₹15 directly to unlock your account.</p>
          </div>
          <button className="ps-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ps-penalty-amount">
          <div>
            <div className="ps-penalty-label">Beneficiary Driver</div>
            <div className="ps-penalty-name">{riderName}</div>
            {penalty.rider_phone && <div className="ps-penalty-phone">Phone: {penalty.rider_phone}</div>}
          </div>
          <div className="ps-penalty-right">
            <div className="ps-penalty-label">Amount Due</div>
            <div className="ps-penalty-value">₹15.00</div>
          </div>
        </div>

        {waitingConfirm ? (
          <div className="ps-penalty-wait">
            <Clock size={32} />
            <h4>Waiting for Driver Confirmation</h4>
            <p>We've notified <strong>{riderName}</strong>. This screen unlocks automatically once they confirm.</p>
            <div className="ps-penalty-live">
              <RefreshCw size={13} className="ps-spin" /> Live listener active
            </div>
            <button className="ps-btn ps-btn--ghost ps-btn--sm" onClick={() => setWaitingConfirm(false)}>
              Back to Payment Options
            </button>
          </div>
        ) : (
          <>
            <div className="ps-pay-tabs">
              {[
                { id: 'QR', label: 'Scan QR', icon: QrCode },
                { id: 'APPS', label: 'UPI Apps', icon: Smartphone },
                { id: 'UPI_ID', label: 'UPI ID', icon: CreditCard }
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setPayMode(t.id)}
                    className={`ps-pay-tab ${payMode === t.id ? 'is-active' : ''}`}
                  >
                    <Icon size={14} /> {t.label}
                  </button>
                );
              })}
            </div>

            {payMode === 'QR' && (
              <div className="ps-pay-qr ps-fade-up">
                <img src={qrCodeUrl} alt="UPI QR" />
                <div className="ps-pay-qr-title">Scan with any UPI app</div>
              </div>
            )}

            {payMode === 'APPS' && (
              <div className="ps-pay-apps ps-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a href={gpayUri} className="ps-upi-action ps-upi-action--gpay" rel="noopener noreferrer">
                  <Smartphone size={16} /> Pay ₹15 via Google Pay
                </a>
                <a href={phonepeUri} className="ps-upi-action ps-upi-action--phonepe" rel="noopener noreferrer">
                  <Zap size={16} /> Pay ₹15 via PhonePe
                </a>
                <a href={upiUri} className="ps-upi-action ps-upi-action--generic" rel="noopener noreferrer">
                  <ExternalLink size={16} /> Pay ₹15 with Any UPI App
                </a>
              </div>
            )}

            {payMode === 'UPI_ID' && (
              <div className="ps-pay-upiid ps-fade-up">
                <div className="ps-upiid-row">
                  <span className="ps-upiid-value">{riderUpi}</span>
                  <button
                    className="ps-upi-copy"
                    onClick={() => {
                      navigator.clipboard?.writeText(riderUpi);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <button
              className="ps-btn ps-btn--primary ps-btn--lg ps-btn--block"
              onClick={handleSettle}
              disabled={settling}
            >
              <CheckCircle2 size={18} />
              {settling ? 'Sending Claim...' : 'I Have Paid ₹15'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* Cancel Warning */
export function CancelWarningModal({ open, onClose, onConfirm }) {
  if (!open) return null;
  return (
    <div className="ps-modal-overlay">
      <div className="ps-modal ps-modal--sm ps-modal-in ps-modal--danger ps-shake">
        <div className="ps-modal-head">
          <div className="ps-modal-head-icon ps-modal-head-icon--danger">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="ps-modal-title">Driver Has Reached</h3>
            <p className="ps-modal-sub">Cancelling now applies ₹15 compensation</p>
          </div>
        </div>
        <div className="ps-warn-box">
          Your driver has already arrived at pickup. Cancelling this ride now applies a <strong>₹15 compensation charge</strong> payable directly to the driver's UPI.
        </div>
        <div className="ps-row-2">
          <button className="ps-btn ps-btn--ghost ps-btn--block" onClick={onClose}>
            Keep Ride
          </button>
          <button className="ps-btn ps-btn--danger ps-btn--block" onClick={onConfirm}>
            Cancel · Pay ₹15
          </button>
        </div>
      </div>
    </div>
  );
}

/* Shared Modal Mount — placed once in layout */
export function PassengerModals() {
  const { pendingPenalty, setPendingPenalty, fetchPendingPenalty } = usePassenger();
  const [penaltyOpen, setPenaltyOpen] = useState(false);

  useEffect(() => {
    if (pendingPenalty) setPenaltyOpen(true);
  }, [pendingPenalty]);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.penalty) {
        setPendingPenalty(e.detail.penalty);
      } else if (!pendingPenalty && typeof fetchPendingPenalty === 'function') {
        fetchPendingPenalty();
      }
      setPenaltyOpen(true);
    };
    window.addEventListener('ps:openPenaltyModal', handler);
    return () => window.removeEventListener('ps:openPenaltyModal', handler);
  }, [pendingPenalty, setPendingPenalty, fetchPendingPenalty]);

  const cancelWarn = useCancelWarningModal();

  return (
    <>
      {penaltyOpen && pendingPenalty && (
        <PenaltyPaymentModal
          penalty={pendingPenalty}
          onClose={() => {
            setPenaltyOpen(false);
          }}
        />
      )}
      <CancelWarningModal
        open={cancelWarn.open}
        onClose={() => cancelWarn.setOpen(false)}
        onConfirm={() => {
          cancelWarn.setOpen(false);
          cancelWarn.payload?.onConfirm?.();
        }}
      />
    </>
  );
}

/* Helper to trigger modals cross-page */
export const openCancelWarning = (onConfirm) => {
  window.dispatchEvent(new CustomEvent('ps:openCancelWarning', { detail: { onConfirm } }));
};

export const openPenaltyModal = (penalty = null) => {
  window.dispatchEvent(new CustomEvent('ps:openPenaltyModal', { detail: { penalty } }));
};

