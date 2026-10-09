import React from 'react';
import { ShieldCheck, Clock, CheckCircle2, Phone, AlertCircle } from 'lucide-react';

export function AdvancePolicyCard() {
  return (
    <div className="ps-advance-side-stack ps-fade-up">
      {/* Policy Card: Zero Cancellation Fee Guarantee */}
      <div className="ps-policy-card">
        <div className="ps-policy-icon">
          <ShieldCheck size={26} color="#00855B" />
        </div>
        <div className="space-y-1">
          <h3 className="font-headline-md ps-policy-title">Zero Cancellation Fee Guarantee</h3>
          <p className="font-body-sm ps-policy-sub">
            We understand academic schedules shift unpredictably. Cancel or reschedule with full reimbursement protection.
          </p>
        </div>

        <div className="ps-policy-terms">
          <div className="ps-policy-term-item">
            <CheckCircle2 size={16} color="#00855B" className="shrink-0 mt-0.5" />
            <p className="font-body-sm text-on-surface">
              <strong>Up to 15 mins prior:</strong> 100% Free cancellation and immediate credit release.
            </p>
          </div>
          <div className="ps-policy-term-item">
            <Clock size={16} color="#EA580C" className="shrink-0 mt-0.5" />
            <p className="font-body-sm text-on-surface">
              <strong>Under 15 mins:</strong> Token ₹10 driver transit compensation fee applies.
            </p>
          </div>
        </div>

        {/* Visual Progress Radial */}
        <div className="ps-policy-radial-row">
          <div className="ps-policy-radial-wrap">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-surface-container-high"
                stroke="currentColor"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                stroke="#00855B"
                strokeDasharray="98, 100"
                strokeLinecap="round"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="ps-policy-radial-text font-label-sm">98%</span>
          </div>
          <div>
            <p className="font-label-md text-on-surface font-semibold">On-Time Arrival Rate</p>
            <p className="font-body-sm text-on-surface-variant">PU Transit Pilot 2025 Fleet Records</p>
          </div>
        </div>
      </div>

      {/* Campus Service Quick Support Card */}
      <div className="ps-concierge-card">
        <div className="flex items-center justify-between">
          <span className="font-label-sm uppercase font-bold text-primary tracking-wider">
            Transit Desk Hotline
          </span>
          <span className="ps-status-live-dot-wrap">
            <span className="ps-status-live-ping" />
            <span className="ps-status-live-dot" />
          </span>
        </div>
        <p className="font-body-sm text-on-surface-variant">
          Need early morning conference drops or multi-passenger luggage shuttles?
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-on-surface font-label-md p-2.5 rounded-lg bg-surface-container-low">
            <span>Security Intercom</span>
            <span className="font-bold text-primary">Ext. 4088</span>
          </div>
          <div className="flex items-center justify-between text-on-surface font-label-md p-2.5 rounded-lg bg-surface-container-low">
            <span>Gate 1 Mobility Booth</span>
            <a href="tel:+914132655120" className="font-bold text-primary hover:underline">
              +91 413 2655 120
            </a>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden relative shadow-xs p-3.5 bg-gradient-to-r from-primary/10 to-tertiary/10 border border-primary/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck size={20} color="#EA580C" />
          </div>
          <div>
            <div className="font-label-md text-on-surface font-semibold">Sustainable Campus Fleet</div>
            <p className="font-body-sm text-on-surface-variant text-xs mt-0.5">
              Zero emissions on PU pathways with verified student partner riders.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdvancePolicyCard;
