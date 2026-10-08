import React from 'react';
import { Camera, QrCode, ShieldCheck, BadgeCheck, User } from 'lucide-react';

export function IdentityTerminalCard({ user, stats, onViewQr }) {
  const name = user?.name || 'Passenger';
  const rollNo = user?.roll_no || user?.rollNo || (user?.id ? `PU-${user.id}` : 'PU Member');
  const dept = user?.department || user?.college || 'Pondicherry University Campus Community';
  const avatarUrl = user?.profile_image || user?.avatar_url || null;
  const initialLetter = (name.trim()[0] || 'P').toUpperCase();

  const ridesCount = typeof stats?.totalRides === 'number' ? stats.totalRides : 0;
  const rating = stats?.avgRating ? Number(stats.avgRating).toFixed(1) : '5.0';

  return (
    <div className="ps-identity-card ps-fade-up">
      {/* Visual Accent Glow */}
      <div className="ps-identity-glow" />

      {/* Verified Badge */}
      <div className="ps-identity-verified-badge">
        <ShieldCheck size={14} color="#00855B" />
        <span>Verified Campus Member</span>
      </div>

      {/* Passenger Avatar with Ring */}
      <div className="relative mt-2 mb-3">
        <div className="w-24 h-24 rounded-full overflow-hidden p-1 bg-surface-container-high shadow-md flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold font-headline-lg shadow-inner">
              {initialLetter}
            </div>
          )}
        </div>
      </div>

      {/* Identity Typography */}
      <h2 className="font-headline-md text-xl font-bold text-on-surface text-center m-0">
        {name}
      </h2>

      <div className="inline-flex items-center gap-1.5 mt-1 px-3 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-xs">
        <BadgeCheck size={14} color="#EA580C" />
        <span className="font-mono font-bold tracking-wide">{rollNo}</span>
      </div>

      <p className="font-body-sm text-xs text-on-surface-variant mt-2 text-center max-w-xs">
        {dept}
      </p>

      {/* 3 Metric Pills */}
      <div className="w-full grid grid-cols-3 gap-1 mt-4 pt-3 bg-surface-container-low rounded-xl p-2.5">
        <div className="flex flex-col items-center">
          <span className="font-headline-md text-lg font-bold text-primary">{ridesCount}</span>
          <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-semibold">Rides Taken</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-headline-md text-lg font-bold text-tertiary">{rating}</span>
          <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-semibold">Pass Rating</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-headline-md text-lg font-bold text-blue-700">Tier-1</span>
          <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-semibold">Priority</span>
        </div>
      </div>

      {/* Fast-Boarding QR Stamp Indicator */}
      <div className="w-full mt-3 flex items-center justify-between px-3.5 py-2.5 bg-surface-container-high/50 rounded-xl">
        <div className="flex items-center gap-2.5 text-left">
          <QrCode size={22} color="#EA580C" />
          <div className="flex flex-col">
            <span className="font-label-md text-xs font-bold text-on-surface">Fast-Boarding Token</span>
            <span className="font-body-sm text-[10px] text-on-surface-variant">Validated for Intra-Campus Fleet</span>
          </div>
        </div>
        <button
          type="button"
          className="px-3 py-1 rounded-full bg-white text-xs font-bold text-on-surface hover:bg-surface-container transition-colors shadow-xs border-0 cursor-pointer"
          onClick={onViewQr}
        >
          View
        </button>
      </div>
    </div>
  );
}

export default IdentityTerminalCard;
