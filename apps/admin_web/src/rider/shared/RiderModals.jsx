import React, { useState } from 'react';
import './RiderModals.css';
import { Lock, X, QrCode, Copy, Check, ExternalLink } from 'lucide-react';
import { useRider } from './RiderContext';
import { RPButton, RPField } from './RiderUI';

export function PasswordChangeModal({ isOpen, onClose }) {
  const { changePassword } = useRider();
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passUpdating, setPassUpdating] = useState(false);
  const [passError, setPassError] = useState(null);
  const [passSuccess, setPassSuccess] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPass.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('New passwords do not match.');
      return;
    }

    setPassUpdating(true);
    try {
      await changePassword(currentPass, newPass);
      setPassSuccess('Password changed successfully!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => {
        onClose();
        setPassSuccess(null);
      }, 1800);
    } catch (err) {
      setPassError(err.message || 'Failed to change password. Check your current password.');
    } finally {
      setPassUpdating(false);
    }
  };

  return (
    <div className="rp-modal-overlay">
      <div className="rp-modal rp-modal--sm rp-modal--amber">
        <div className="rp-modal-head">
          <div>
            <h3 className="rp-modal-title">
              <Lock size={18} color="#EA580C" /> Change Password
            </h3>
            <p className="rp-modal-sub">Create a strong new login password (min 6 chars)</p>
          </div>
          <button className="rp-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {passError && (
          <div className="rp-status-banner is-error" role="status" aria-live="polite">
            <span className="rp-banner-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" strokeWidth="2.2" />
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2.2" />
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2.2" />
              </svg>
            </span>
            <span className="rp-banner-text">{passError}</span>
            <button
              type="button"
              className="rp-banner-close"
              onClick={() => setPassError(null)}
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24">
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </button>
          </div>
        )}

        {passSuccess && (
          <div className="rp-status-banner is-success" role="status" aria-live="polite">
            <span className="rp-banner-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M13 2 L3 14 h7 l-1 8 L21 10 h-7 z" />
              </svg>
            </span>
            <span className="rp-banner-text">{passSuccess}</span>
            <button
              type="button"
              className="rp-banner-close"
              onClick={() => setPassSuccess(null)}
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24">
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rp-form">
          <RPField label="Current Password">
            <input
              type="password"
              className="rp-input"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              required
            />
          </RPField>

          <RPField label="New Password (min 6 chars)">
            <input
              type="password"
              className="rp-input"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              required
            />
          </RPField>

          <RPField label="Confirm New Password">
            <input
              type="password"
              className="rp-input"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              required
            />
          </RPField>

          <div className="rp-row-2" style={{ marginTop: '12px' }}>
            <RPButton type="button" variant="ghost" onClick={onClose}>
              Cancel
            </RPButton>
            <RPButton type="submit" variant="primary" loading={passUpdating}>
              {passUpdating ? 'Updating...' : 'Save Password'}
            </RPButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminQrModal({ isOpen, onClose, shiftSettlement, selectedDate }) {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const adminUpiId = shiftSettlement?.adminUpi?.upiId || 'papido.admin@okaxis';
  const qrUrl = shiftSettlement?.adminUpi?.qrCodeUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(shiftSettlement?.adminUpi?.upiPayUrl || `upi://pay?pa=${adminUpiId}`)}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(adminUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rp-modal-overlay">
      <div className="rp-modal rp-modal--sm rp-modal--amber">
        <div className="rp-modal-head">
          <div>
            <h3 className="rp-modal-title">
              <QrCode size={18} color="#EA580C" /> Admin Settlement QR
            </h3>
            <p className="rp-modal-sub">
              Scan &amp; pay exact ₹{Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2)} for {shiftSettlement?.date || selectedDate}
            </p>
          </div>
          <button className="rp-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '10px 0' }}>
          <div style={{
            background: '#FFFFFF',
            padding: '12px',
            borderRadius: '16px',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
            border: '1px solid rgba(234, 88, 12, 0.15)'
          }}>
            <img src={qrUrl} alt="Admin Settlement QR" style={{ width: '200px', height: '200px', display: 'block' }} />
          </div>

          <div style={{
            width: '100%',
            background: 'rgba(249, 115, 22, 0.06)',
            border: '1px solid rgba(249, 115, 22, 0.2)',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
              UPI ID: <span style={{ fontFamily: 'monospace', color: '#EA580C' }}>{adminUpiId}</span>
            </div>
            <RPButton type="button" size="sm" variant="secondary" onClick={handleCopy}>
              {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </RPButton>
          </div>
        </div>

        <RPButton type="button" variant="primary" block onClick={onClose}>
          Done / Enter UTR Number
        </RPButton>
      </div>
    </div>
  );
}
