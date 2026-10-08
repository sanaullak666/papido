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

        {/* Session Status Log */}
        <div className="flex flex-col gap-2 pt-1">
          <span className="font-label-md text-xs text-on-surface font-semibold">
            Active Verified Session
          </span>

          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} color="#00855B" />
              <div className="flex flex-col">
                <span className="font-label-md text-xs font-semibold text-on-surface">
                  {user?.email || 'Logged In Account'}
                </span>
                <span className="font-body-sm text-[11px] text-tertiary font-medium">
                  Active Passenger Portal • Role: {user?.role || 'CUSTOMER'}
                </span>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary" title="Active Connection" />
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
