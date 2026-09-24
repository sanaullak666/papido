import React from 'react';
import { DollarSign, ShieldCheck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

export function FareBreakdown({
  customerFare = 0,
  riderEarnings = 0,
  platformCommission = 0,
  controllerDeduction = 0,
  paymentStatus = 'PENDING',
  settlementStatus = 'UNSETTLED',
  paymentMethod = 'CASH',
  currency = '₹',
  className = '',
  style = {}
}) {
  const cFare = parseFloat(customerFare || 0);
  const rEarn = parseFloat(riderEarnings || (cFare * 0.8));
  const pComm = parseFloat(platformCommission || (cFare - rEarn));
  const cDed = parseFloat(controllerDeduction || 0);
  const netDriverPayout = Math.max(0, rEarn - cDed);

  return (
    <div
      style={{
        background: 'var(--bg-card-raised, #1C2B4B)',
        border: '1px solid var(--border, #23314E)',
        borderRadius: 'var(--radius-md, 10px)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        ...style
      }}
      className={`fare-breakdown-ui ${className}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4
          style={{
            fontSize: '14px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-secondary, #94A3B8)',
            margin: 0
          }}
        >
          Financial & Commission Split Matrix
        </h4>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: paymentStatus === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: paymentStatus === 'COMPLETED' ? '#10B981' : '#F59E0B',
              fontWeight: 700
            }}
          >
            {paymentStatus} ({paymentMethod})
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
        {/* Customer Fare */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary, #94A3B8)' }}>Gross Customer Fare</span>
          <strong style={{ fontSize: '15px', color: 'var(--text-primary, #F8FAFC)' }}>
            {currency}{cFare.toFixed(2)}
          </strong>
        </div>

        {/* Driver Gross Earnings */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary, #94A3B8)' }}>Driver Gross Earnings (80%)</span>
          <strong style={{ color: '#10B981' }}>
            +{currency}{rEarn.toFixed(2)}
          </strong>
        </div>

        {/* Platform Commission */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary, #94A3B8)' }}>Papido Platform Commission (20%)</span>
          <strong style={{ color: 'var(--primary, #F59E0B)' }}>
            {currency}{pComm.toFixed(2)}
          </strong>
        </div>

        {/* Duty Controller Deduction */}
        {cDed > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary, #94A3B8)' }}>Duty Controller Operational Fee</span>
            <strong style={{ color: '#F43F5E' }}>
              -{currency}{cDed.toFixed(2)}
            </strong>
          </div>
        )}

        <div style={{ height: '1px', background: 'var(--border, #23314E)', margin: '4px 0' }} />

        {/* Net Driver Settlement */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary, #F8FAFC)' }}>Net Driver Payable</span>
          <strong style={{ fontSize: '17px', color: '#10B981', fontWeight: 800 }}>
            {currency}{netDriverPayout.toFixed(2)}
          </strong>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: 'var(--radius-sm, 6px)',
          fontSize: '12px'
        }}
      >
        <span style={{ color: 'var(--text-muted, #64748B)' }}>Daily Settlement Status:</span>
        <span
          style={{
            fontWeight: 700,
            color: settlementStatus === 'SETTLED' ? '#10B981' : 'var(--primary, #F59E0B)'
          }}
        >
          {settlementStatus}
        </span>
      </div>
    </div>
  );
}
export default FareBreakdown;
