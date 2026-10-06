import React, { useState, useEffect } from 'react';
import './profile/profile.css';
import { useAuth } from '../context/AuthContext';
import { PSButton, PSCard } from './shared/PassengerUI';
import { AvatarCard } from './profile/AvatarCard';
import { ProfileForm } from './profile/ProfileForm';
import { SecuritySection } from './profile/SecuritySection';
import { ChangePasswordModal } from './profile/ChangePasswordModal';
import { User } from 'lucide-react';

export function PassengerProfilePage() {
  const { user, updateProfile, changePassword, logout } = useAuth();

  const [feedback, setFeedback] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  /* Auto-dismiss toast */
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleSaveProfile = async (payload) => {
    try {
      await updateProfile(payload);
      setFeedback({
        type: 'success',
        msg: 'Profile updated successfully.'
      });
      return true;
    } catch (err) {
      setFeedback({
        type: 'error',
        msg: err.message || 'Failed to update profile.'
      });
      return false;
    }
  };

  const handleLogout = () => {
    if (window.confirm('Sign out of this session?')) {
      logout();
    }
  };

  return (
    <div className="ps-profile-page">
      <div className="ps-profile-container">

        {/* HEADER */}
        <div className="ps-heading-block">
          <h1 className="ps-heading ps-heading--icon">
            <User size={24} color="#EA580C" />
            Profile & Security
          </h1>
          <p className="ps-subheading">
            Manage your personal details, security, and session.
          </p>
        </div>

        {/* TOAST */}
        {feedback && (
          <div
            className={`ps-status-banner ${
              feedback.type === 'success' ? 'is-success' : 'is-error'
            }`}
            role="status"
            aria-live="polite"
          >
            <span className="ps-banner-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                {feedback.type === 'success' ? (
                  <path d="M13 2 L3 14 h7 l-1 8 L21 10 h-7 z" />
                ) : (
                  <>
                    <circle
                      cx="12" cy="12" r="10"
                      stroke="currentColor" fill="none" strokeWidth="2.2"
                    />
                    <line x1="12" y1="8" x2="12" y2="12"
                      stroke="currentColor" strokeWidth="2.2" />
                    <line x1="12" y1="16" x2="12.01" y2="16"
                      stroke="currentColor" strokeWidth="2.2" />
                  </>
                )}
              </svg>
            </span>
            <span className="ps-banner-text">{feedback.msg}</span>
            <button
              type="button"
              className="ps-banner-close"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24">
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </button>
          </div>
        )}

        {/* IDENTITY CARD */}
        <AvatarCard user={user} />

        {/* PERSONAL DETAILS */}
        <ProfileForm
          user={user}
          onSave={handleSaveProfile}
        />

        {/* SECURITY */}
        <SecuritySection
          onChangePassword={() => setShowPasswordModal(true)}
          onSignOut={handleLogout}
        />

        {/* MODAL */}
        {showPasswordModal && (
          <ChangePasswordModal
            changePassword={changePassword}
            onClose={() => setShowPasswordModal(false)}
            onSuccess={() => {
              setShowPasswordModal(false);
              setFeedback({
                type: 'success',
                msg: 'Password changed successfully.'
              });
            }}
            onError={(msg) => {
              setFeedback({ type: 'error', msg });
            }}
          />
        )}

      </div>
    </div>
  );
}

export default PassengerProfilePage;
