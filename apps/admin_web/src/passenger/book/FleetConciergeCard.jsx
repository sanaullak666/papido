import React from 'react';
import { ShieldCheck, PhoneCall, Zap, CheckCircle2, Clock } from 'lucide-react';

export function FleetConciergeCard() {
  return (
    <div className="ps-concierge-card ps-fade-up">
      <div className="ps-concierge-header">
        <div className="ps-concierge-icon">
          <ShieldCheck size={20} color="#00855B" />
        </div>
        <div>
          <h4 className="ps-concierge-title">Pondicherry University Fleet Concierge</h4>
          <p className="ps-concierge-sub">Subsidized student transit network</p>
        </div>
      </div>

      <div className="ps-concierge-list">
        <div className="ps-concierge-item">
          <CheckCircle2 size={15} color="#00855B" className="shrink-0" />
          <span>Zero surge pricing on all campus pathways</span>
        </div>
        <div className="ps-concierge-item">
          <CheckCircle2 size={15} color="#00855B" className="shrink-0" />
          <span>Verified campus driver identity & vehicle inspection</span>
        </div>
        <div className="ps-concierge-item">
          <Clock size={15} color="#EA580C" className="shrink-0" />
          <span>Priority dispatch during morning lectures & exam shifts</span>
        </div>
      </div>

      <div className="ps-concierge-hotline">
        <div className="ps-concierge-hotline-text">
          <span className="ps-concierge-hotline-label">Gate 1 Transit Control</span>
          <span className="ps-concierge-hotline-val">Ext. 4088 / +91 413 2655 120</span>
        </div>
        <a href="tel:+914132655120" className="ps-concierge-hotline-btn">
          <PhoneCall size={14} />
        </a>
      </div>
    </div>
  );
}

export default FleetConciergeCard;
