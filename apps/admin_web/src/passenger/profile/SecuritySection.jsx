import React from 'react';
import { PSCard } from '../shared/PassengerUI';
import {
  Lock, LogOut, ChevronRight, Clock, ShieldCheck, Smartphone, KeyRound
} from 'lucide-react';

/**
 * Derive a friendly "last sign-in" string from user metadata
 * (falls back to today's date if unavailable).
 */
function getLastSignIn(user) {
  const raw =
    user?.last_login_at ||
    user?.last_signin_at ||
    user?.updated_at;
  if (!raw) return 'Just now';

  try {
    const str = String(raw).trim();
    const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
    if (isNaN(d.getTime())) return 'Just now';

    const diffMs = Date.now() - d.getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min} min ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'Just now';
  }
}

export function SecuritySection({ user, onChangePassword, onSignOut }) {
  const lastSignIn = getLastSignIn(user);

  return (
    <PSCard className="ps-profile-card ps-fade-up">
      <div className="ps-profile-card-head">
        <h3 className="ps-profile-card-title">Security</h3>
        <p className="ps-profile-card-sub">
          Password and session management
        </p>
      </div>

      {/* ── Session info strip (NEW) ── */}
      <div className="ps-security-info-strip">
        <div className="ps-security-info-item">
          <Clock size={12} />
          <span className="ps-security-info-label">Last sign-in</span>
          <span className="ps-security-info-value">{lastSignIn}</span>
        </div>
        <div className="ps-security-info-item">
          <ShieldCheck size={12} />
          <span className="ps-security-info-label">Account</span>
          <span className="ps-security-info-value">Protected</span>
        </div>
      </div>

      {/* Change password row */}
      <button
        type="button"
        className="ps-security-row"
        onClick={onChangePassword}
      >
        <div className="ps-security-row-left">
          <div className="ps-security-icon ps-security-icon--amber">
            <Lock size={15} />
          </div>
          <div>
            <div className="ps-security-title">Change Password</div>
            <div className="ps-security-sub">
              Update your login credentials
            </div>
          </div>
        </div>
        <ChevronRight size={16} color="#796D61" />
      </button>

      {/* ── Extra info rows (NEW, purely decorative) ── */}
      <div className="ps-security-row ps-security-row--static" role="presentation">
        <div className="ps-security-row-left">
          <div className="ps-security-icon ps-security-icon--blue">
            <KeyRound size={15} />
          </div>
          <div>
            <div className="ps-security-title">Password strength</div>
            <div className="ps-security-sub">
              Use 6+ characters with a mix of letters, numbers &amp; symbols
            </div>
          </div>
        </div>
      </div>

      <div className="ps-security-row ps-security-row--static" role="presentation">
        <div className="ps-security-row-left">
          <div className="ps-security-icon ps-security-icon--green">
            <Smartphone size={15} />
          </div>
          <div>
            <div className="ps-security-title">Device session</div>
            <div className="ps-security-sub">
              This browser is currently signed in
            </div>
          </div>
        </div>
      </div>

      {/* Sign out row */}
      <button
        type="button"
        className="ps-security-row ps-security-row--danger"
        onClick={onSignOut}
      >
        <div className="ps-security-row-left">
          <div className="ps-security-icon ps-security-icon--red">
            <LogOut size={15} />
          </div>
          <div>
            <div className="ps-security-title ps-security-title--danger">
              Sign Out
            </div>
            <div className="ps-security-sub">
              End session on this browser
            </div>
          </div>
        </div>
        <ChevronRight size={16} color="#DC2626" />
      </button>
    </PSCard>
  );
}

export default SecuritySection;
