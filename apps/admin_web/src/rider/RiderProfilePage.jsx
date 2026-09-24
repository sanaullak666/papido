import React, { useState } from 'react';
import './RiderProfilePage.css';
import { useRider } from './shared/RiderContext';
import { RPButton, RPField } from './shared/RiderUI';
import { PasswordChangeModal } from './shared/RiderModals';
import { alertManager } from '../utils/alertManager';
import { User, Lock, Volume2, VolumeX } from 'lucide-react';

export function RiderProfilePage() {
  const {
    user,
    updateProfile,
    soundEnabled,
    setSoundEnabled
  } = useRider();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateProfile({ name, phone });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="rp-content rp-content--narrow">
      <div className="rp-surface rp-fade-up">
        <div>
          <h2 className="rp-heading rp-heading--icon">
            <User size={24} color="#EA580C" /> Driver Profile &amp; Security
          </h2>
          <p className="rp-subheading">
            Manage your personal contact details, sound preferences, and account security.
          </p>
        </div>

        {/* Profile Feedback in Glass Pill style */}
        {profileMsg && (
          <div
            className={`rp-status-banner ${profileMsg.type === 'success' ? 'is-success' : 'is-error'}`}
            role="status"
            aria-live="polite"
          >
            <span className="rp-banner-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                {profileMsg.type === 'success' ? (
                  <path d="M13 2 L3 14 h7 l-1 8 L21 10 h-7 z" />
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" strokeWidth="2.2" />
                    <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2.2" />
                    <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2.2" />
                  </>
                )}
              </svg>
            </span>
            <span className="rp-banner-text">{profileMsg.text}</span>
            <button
              type="button"
              className="rp-banner-close"
              onClick={() => setProfileMsg(null)}
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24">
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </button>
          </div>
        )}

        {/* Profile Contact Form */}
        <form onSubmit={handleSaveProfile} className="rp-form">
          <RPField label="Full Name">
            <input
              type="text"
              className="rp-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </RPField>

          <RPField label="Phone Number">
            <input
              type="text"
              className="rp-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </RPField>

          <RPField label="Email Address (Login ID)">
            <input
              type="text"
              className="rp-input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
          </RPField>

          <RPButton
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={savingProfile}
            disabled={savingProfile}
          >
            {savingProfile ? 'Saving...' : 'Save Profile Changes'}
          </RPButton>
        </form>

        <hr className="rp-hr" />

        {/* Sound & Notifications Settings */}
        <div className="rp-security-card">
          <div>
            <h4 className="rp-security-title">Ride Alert Chimes &amp; Ringtone</h4>
            <p className="rp-security-sub">
              {soundEnabled ? 'Alert audio is active and will ring for new requests' : 'Audio is currently muted'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <RPButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => alertManager.playOneShot()}
            >
              <Volume2 size={14} /> Test Ringtone
            </RPButton>
            <RPButton
              type="button"
              variant={soundEnabled ? 'ghost' : 'primary'}
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <VolumeX size={14} /> : <Volume2 size={14} />}
              {soundEnabled ? 'Mute' : 'Enable'}
            </RPButton>
          </div>
        </div>

        {/* Account Password */}
        <div className="rp-security-card">
          <div>
            <h4 className="rp-security-title">Account Password</h4>
            <p className="rp-security-sub">Update your secret driver password</p>
          </div>
          <RPButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPasswordModal(true)}
          >
            <Lock size={14} /> Change Password
          </RPButton>
        </div>
      </div>

      {/* Password Modal */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
export default RiderProfilePage;
