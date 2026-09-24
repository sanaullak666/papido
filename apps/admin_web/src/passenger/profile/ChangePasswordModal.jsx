import React, { useMemo, useState } from 'react';
import { PSButton } from '../shared/PassengerUI';
import { X, Lock, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';

/* Password scoring: 0-4 */
function scorePassword(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

export function ChangePasswordModal({
  changePassword, onClose, onSuccess, onError
}) {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const strength = useMemo(() => scorePassword(newPass), [newPass]);
  const strengthPct = (strength / 4) * 100;

  const matches = newPass && confirmPass && newPass === confirmPass;
  const tooShort = newPass.length > 0 && newPass.length < 6;

  const canSubmit =
    currentPass.length > 0 &&
    newPass.length >= 6 &&
    matches &&
    !saving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPass.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      /* ✅ OBJECT signature — standardize everywhere */
      await changePassword({
        currentPassword: currentPass,
        newPassword: newPass
      });
      onSuccess?.();
    } catch (err) {
      const msg = err.message || 'Failed to change password.';
      setError(msg);
      onError?.(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ps-modal-overlay">
      <div className="ps-modal ps-modal--sm ps-modal-in ps-modal--amber">

        {/* HEAD */}
        <div className="ps-modal-head">
          <div>
            <h3 className="ps-modal-title">
              <Lock size={18} color="#EA580C" /> Change Password
            </h3>
            <p className="ps-modal-sub">
              Create a strong new login password
            </p>
          </div>
          <button
            className="ps-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="ps-modal-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* CURRENT */}
          <div className="ps-field">
            <label className="ps-field-label">Current Password</label>
            <div className="ps-input-wrap">
              <input
                type={showCurrent ? 'text' : 'password'}
                className="ps-input"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                required
              />
              <button
                type="button"
                className="ps-input-trail-btn"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? 'Hide' : 'Show'}
              >
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* NEW */}
          <div className="ps-field">
            <label className="ps-field-label">New Password</label>
            <div className="ps-input-wrap">
              <input
                type={showNew ? 'text' : 'password'}
                className="ps-input"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
              />
              <button
                type="button"
                className="ps-input-trail-btn"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? 'Hide' : 'Show'}
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Strength meter */}
            {newPass.length > 0 && (
              <div className="ps-pw-strength ps-fade-up">
                <div className="ps-pw-strength-track">
                  <div
                    className={`ps-pw-strength-fill ps-pw-strength-fill--${
                      strength <= 1 ? 'weak' :
                      strength === 2 ? 'fair' :
                      strength === 3 ? 'good' :
                      'strong'
                    }`}
                    style={{ width: `${strengthPct}%` }}
                  />
                </div>
                <span className="ps-pw-strength-label">
                  {STRENGTH_LABELS[strength]}
                </span>
              </div>
            )}

            {tooShort && (
              <div className="ps-inline-status ps-inline-status--amber">
                <AlertCircle size={12} /> Minimum 6 characters
              </div>
            )}
          </div>

          {/* CONFIRM */}
          <div className="ps-field">
            <label className="ps-field-label">Confirm New Password</label>
            <div className="ps-input-wrap">
              <input
                type={showConfirm ? 'text' : 'password'}
                className="ps-input"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
              />
              <button
                type="button"
                className="ps-input-trail-btn"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide' : 'Show'}
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {matches && (
              <div className="ps-inline-status ps-inline-status--green">
                <Check size={12} /> Passwords match
              </div>
            )}
          </div>

          {/* ACTIONS */}
          <div className="ps-row-2" style={{ marginTop: 18 }}>
            <PSButton type="button" variant="ghost" onClick={onClose}>
              Cancel
            </PSButton>
            <PSButton
              type="submit"
              variant="primary"
              disabled={!canSubmit}
            >
              {saving ? 'Updating...' : 'Save Password'}
            </PSButton>
          </div>

        </form>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
