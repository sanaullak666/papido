import React from 'react';
import { Phone, ShieldAlert } from 'lucide-react';

export function SecurityConciergeCard() {
  return (
    <div className="ps-concierge-support-card ps-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
          <ShieldAlert size={20} />
        </div>
        <div className="flex flex-col">
          <span className="font-label-md font-bold text-on-surface">24/7 Security Concierge</span>
          <span className="font-body-sm text-xs text-on-surface-variant">Pondicherry University Main Gate</span>
        </div>
      </div>

      <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed m-0">
        Direct priority patch to Security Control Room for night-time transits or urgent ride escorting.
      </p>

      <a
        href="tel:+914132655179"
        className="ps-concierge-call-btn"
      >
        <Phone size={15} />
        <span>+91 413 2655179 (Security Helpline)</span>
      </a>
    </div>
  );
}

export default SecurityConciergeCard;
