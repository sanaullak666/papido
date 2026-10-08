import React, { useState, useEffect, useMemo } from 'react';
import './profile/profile.css';
import { useAuth } from '../context/AuthContext';
import { usePassenger } from './shared/PassengerContext';
import { IdentityTerminalCard } from './profile/IdentityTerminalCard';
import { PickupStationCard } from './profile/PickupStationCard';
import { SecurityConciergeCard } from './profile/SecurityConciergeCard';
import { ProfileForm } from './profile/ProfileForm';
import { SecuritySection } from './profile/SecuritySection';
import { ChangePasswordModal } from './profile/ChangePasswordModal';
import {
  ShieldCheck, CheckCircle2, QrCode, X, User
} from 'lucide-react';

export function PassengerProfilePage() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { pastRides = [], scheduledRides = [], loadingHistory, fetchRideHistory } = usePassenger();

  const [feedback, setFeedback] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  /* Auto-dismiss toast */
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  /* Load history once on mount */
  useEffect(() => {
    if (typeof fetchRideHistory === 'function') {
      fetchRideHistory();
    }
  }, []);

  /* Activity metrics */
  const stats = useMemo(() => {
    const safeRides = Array.isArray(pastRides) ? pastRides : [];
    const completed = safeRides.filter(r => r.status === 'COMPLETED');
    const rated = completed.filter(r => r.rating);
    const avgRating = rated.length
      ? rated.reduce((sum, r) => sum + Number(r.rating), 0) / rated.length
      : 0;

    return {
      totalRides: completed.length,
      avgRating: avgRating > 0 ? avgRating : 5.0,
      upcoming: Array.isArray(scheduledRides) ? scheduledRides.length : 0
    };
  }, [pastRides, scheduledRides]);

  const handleSaveProfile = async (payload) => {
    try {
      if (payload.pickupStation) {
        localStorage.setItem('papido_pref_pickup', payload.pickupStation);
      }
      if (typeof updateProfile === 'function') {
        await updateProfile(payload);
      }
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

        {/* Page Header: Hospitality Lounge Style Banner */}
        <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2 ps-fade-up">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-primary shadow-sm shrink-0">
              <ShieldCheck size={32} color="#EA580C" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-xs uppercase tracking-widest text-primary font-bold">
                  Portal Concierge
                </span>
                <span className="w-1 h-1 rounded-full bg-outline-variant" />
                <span className="font-label-sm text-xs text-on-surface-variant font-medium">
                  PU Transit Desk
                </span>
              </div>
              <h1 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface tracking-tight m-0">
                Profile &amp; Security
              </h1>
              <p className="font-body-md text-sm text-on-surface-variant max-w-2xl mt-0.5">
                Manage your verified campus mobility credentials, safe-travel points, security keys, and active transit sessions.
              </p>
            </div>
          </div>

          {/* Quick Status Badge */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/30">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse" />
            <span className="font-label-md text-xs text-on-surface">
              Campus Mobility Pass: <strong className="text-tertiary">Active</strong>
            </span>
          </div>
        </div>

        {/* Global Toast */}
        {feedback && (
          <div
            className={`ps-status-banner ${
              feedback.type === 'success' ? 'is-success' : 'is-error'
            }`}
            role="status"
          >
            <CheckCircle2 size={16} />
            <span className="ps-banner-text">{feedback.msg}</span>
            <button
              type="button"
              className="ps-banner-close"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* 12-Column Asymmetric Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Column: Identity Terminal, Station, Concierge (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <IdentityTerminalCard
              user={user}
              stats={stats}
              onViewQr={() => setShowQrModal(true)}
            />
            <PickupStationCard />
            <SecurityConciergeCard />
          </div>

          {/* Right Column: Profile Form & Security Section (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <ProfileForm
              user={user}
              onSave={handleSaveProfile}
            />
            <SecuritySection
              user={user}
              onChangePassword={() => setShowPasswordModal(true)}
              onSignOut={handleLogout}
            />
          </div>

        </div>

        {/* QR Token Modal */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col items-center gap-4 ps-fade-up text-center">
              <div className="flex items-center justify-between w-full">
                <span className="font-label-md font-bold text-on-surface">Fast-Boarding Token</span>
                <button
                  type="button"
                  className="bg-transparent border-0 cursor-pointer text-on-surface-variant hover:text-on-surface"
                  onClick={() => setShowQrModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* QR Container */}
              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 flex flex-col items-center gap-2">
                <div className="w-44 h-44 bg-white p-3 rounded-xl shadow-xs flex items-center justify-center">
                  <QrCode size={140} color="#231A12" />
                </div>
                <span className="font-mono text-xs font-bold text-primary">
                  {user?.roll_no || 'PU-TOKEN-2025-9981'}
                </span>
              </div>

              <p className="font-body-sm text-xs text-on-surface-variant m-0">
                Show this digital fast-boarding pass to campus shuttle pilots at terminal bays for zero-contact boarding.
              </p>

              <button
                type="button"
                className="w-full py-2.5 rounded-full bg-primary text-white font-label-md text-xs font-bold border-0 cursor-pointer shadow-xs"
                onClick={() => setShowQrModal(false)}
              >
                Close Token
              </button>
            </div>
          </div>
        )}

        {/* Password Modal */}
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
