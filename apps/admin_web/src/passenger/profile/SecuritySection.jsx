import React from 'react';
import { KeyRound, ShieldCheck, Smartphone, Laptop, LogOut, Lock } from 'lucide-react';

export function SecuritySection({ user, onChangePassword, onSignOut }) {
  return (
    <div className="ps-profile-form-card ps-fade-up">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <KeyRound size={20} color="#EA580C" />
          <h3 className="font-headline-md text-lg font-bold text-on-surface m-0">
            Security &amp; Account Protection
          </h3>
        </div>
        <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 font-label-sm text-xs font-bold">
          2FA Protected
        </span>
      </div>

      <div className="flex flex-col gap-4 mt-3">

        {/* Password Status Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-surface-container-low gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
              <Lock size={18} color="#EA580C" />
            </div>
            <div className="flex flex-col">
              <span className="font-label-md font-bold text-on-surface">Account Access Password</span>
              <span className="font-body-sm text-xs text-on-surface-variant">
                Last changed 2 months ago • Strength: Strong
              </span>
            </div>
          </div>
          <button
            type="button"
            className="ps-security-change-btn"
            onClick={onChangePassword}
          >
            Change Password
          </button>
        </div>

        {/* Connected Devices / Session Log */}
        <div className="flex flex-col gap-2 pt-1">
          <span className="font-label-md text-xs text-on-surface font-semibold">
            Active Authorized Sessions
          </span>

          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
            <div className="flex items-center gap-3">
              <Smartphone size={20} color="#EA580C" />
              <div className="flex flex-col">
                <span className="font-label-md text-xs font-semibold text-on-surface">
                  Mobile Device • Safari / Chrome
                </span>
                <span className="font-body-sm text-[11px] text-tertiary font-medium">
                  Current Session • Pondicherry University WiFi (172.16.4.88)
                </span>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
          </div>

          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
            <div className="flex items-center gap-3">
              <Laptop size={20} className="text-on-surface-variant" />
              <div className="flex flex-col">
                <span className="font-label-md text-xs font-semibold text-on-surface">
                  MacBook Air • Desktop Browser
                </span>
                <span className="font-body-sm text-[11px] text-on-surface-variant">
                  Active 3 hours ago • CS Lab Wi-Fi
                </span>
              </div>
            </div>
            <button
              type="button"
              className="text-on-surface-variant hover:text-red-600 text-xs font-semibold bg-transparent border-0 cursor-pointer transition-colors"
              onClick={() => alert('Device session revoked.')}
            >
              Revoke
            </button>
          </div>
        </div>

        {/* Danger Zone: Sign Out Session */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 mt-2">
          <div className="flex items-start gap-3">
            <LogOut size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-label-md font-bold text-red-700 text-xs">
                Terminate Current Portal Session
              </span>
              <span className="font-body-sm text-xs text-on-surface-variant">
                Sign out of this browser device. You will need your PU credentials to log back in.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="ps-security-signout-btn"
            onClick={onSignOut}
          >
            Sign Out of Session
          </button>
        </div>

      </div>
    </div>
  );
}

export default SecuritySection;
