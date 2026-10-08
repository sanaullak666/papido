import React from 'react';
import { Camera, QrCode, ShieldCheck, BadgeCheck, User } from 'lucide-react';

export function IdentityTerminalCard({ user, stats, onViewQr }) {
  const name = user?.name || 'Ananya Sharma';
  const rollNo = user?.roll_no || user?.rollNo || 'PU/2023/MSC/1042';
  const dept = user?.department || 'M.Sc. Computer Science • Department of Computer Science, Silver Jubilee Campus';
  const avatarUrl = user?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAH9866E_WmpeK0_t6E8AYkBOBIHZ91bDvlpdeWeEo9gwCiFqI0xXL41U6qCdKyVH8Y4K4B5NxGwjK8L3n6zJKJF62FNn1vHLdj-hhWX01huBRrreKcYlevVDF56JpwLPpxKvMAIle3-RAzBMhVbbtGjpvnz3YSIl1jqt1Lm3zQLt_gxzi5fHMByWaGfPtvAIKSFHbdvFv_7Z8pAZHXSFKa5nbk2EflkcyfPRDtFTo4COND6Gw1aH8aOQ';

  const ridesCount = stats?.totalRides ?? 38;
  const rating = stats?.avgRating ? stats.avgRating.toFixed(1) : '4.9';

  return (
    <div className="ps-identity-card ps-fade-up">
      {/* Visual Accent Glow */}
      <div className="ps-identity-glow" />

      {/* Verified Badge */}
      <div className="ps-identity-verified-badge">
        <ShieldCheck size={14} color="#00855B" />
        <span>Verified Student</span>
      </div>

      {/* Passenger Avatar with Ring */}
      <div className="relative mt-2 mb-3">
        <div className="w-24 h-24 rounded-full overflow-hidden p-1 bg-surface-container-high shadow-md">
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full rounded-full object-cover"
          />
        </div>
        <button
          type="button"
          className="ps-avatar-camera-btn"
          title="Change Avatar"
          onClick={() => alert('Profile photo is synchronized with Pondicherry University Samarth Portal.')}
        >
          <Camera size={14} />
        </button>
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
