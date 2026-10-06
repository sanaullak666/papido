import React from 'react';
import { PSCard } from '../shared/PassengerUI';
import { Lock, LogOut, ChevronRight } from 'lucide-react';

export function SecuritySection({ onChangePassword, onSignOut }) {
  return (
    <PSCard className="ps-profile-card ps-fade-up">
      <div className="ps-profile-card-head">
        <h3 className="ps-profile-card-title">Security</h3>
        <p className="ps-profile-card-sub">
          Password and session management
        </p>
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
