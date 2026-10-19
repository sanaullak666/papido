import React, { useState } from 'react';
import './DailySettlementsPage.css';
import { apiRequest } from '../api';
import { useRider } from './shared/RiderContext';
import { getTodayDateString, getYesterdayDateString } from './shared/riderConstants';
import { RPButton } from './shared/RiderUI';
import {
  Calendar,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Check,
  Copy,
  QrCode,
  Smartphone,
  Zap,
  Send,
  ExternalLink,
  CreditCard,
  X
} from 'lucide-react';

export function DailySettlementsPage() {
  const {
    selectedSettlementDate,
    setSelectedSettlementDate,
    shiftSettlement,
    loadingShiftSettlement,
    submittingShiftSettlement,
    shiftUtrInput,
    setShiftUtrInput,
    shiftSuccessMsg,
    fetchShiftSettlement,
    handleSubmitShiftSettlement
  } = useRider();

  const [copiedAdminUpi, setCopiedAdminUpi] = useState(false);
  const [showAdminQr, setShowAdminQr] = useState(false);
  const [payingYoupi, setPayingYoupi] = useState(false);
  const [youpiError, setYoupiError] = useState('');
  const [settleSession, setSettleSession] = useState(null);
  const [showSettleQr, setShowSettleQr] = useState(false);
  const [copiedSettleLink, setCopiedSettleLink] = useState(false);

  const todayStr = getTodayDateString();
  const yestStr = getYesterdayDateString();

  const handlePayYoupiSettlement = async () => {
    setPayingYoupi(true);
    setYoupiError('');
    try {
      const res = await apiRequest(`/payments/settlement/${selectedSettlementDate}/pay`, 'POST', {
        returnUrl: `${window.location.origin}/rider/settlements?date=${selectedSettlementDate}&settled=1`
      });

      if (res?.data?.alreadySettled) {
        fetchShiftSettlement(selectedSettlementDate);
        return;
      }

      setSettleSession(res.data);
      setShowSettleQr(true);

      if (res?.data?.checkoutUrl) {
        // Poll for clearance
        let checks = 0;
        const interval = setInterval(async () => {
          checks += 1;
          if (checks > 30) {
            clearInterval(interval);
          } else {
            try {
              const checkRes = await apiRequest(`/payments/settlement/${selectedSettlementDate}`, 'GET');
              if (checkRes?.data?.settlement?.status === 'SETTLED') {
                clearInterval(interval);
                setShowSettleQr(false);
                fetchShiftSettlement(selectedSettlementDate);
              }
            } catch (_) {}
          }
        }, 3000);
      }
    } catch (err) {
      setYoupiError(err.message || 'Failed to initialize YouPI settlement.');
    } finally {
      setPayingYoupi(false);
    }
  };

  return (
    <div className="rp-content rp-content--wide">
      {/* Header with Date Switcher */}
      <div className="rp-tab-header rp-tab-header--no-surface rp-fade-up">
        <div>
          <h2 className="rp-heading">Day-Wise Commission Settlement</h2>
          <p className="rp-subheading">
            Settle daily platform commission shift-by-shift to clear your account for upcoming rides.
          </p>
        </div>

        <div className="rp-settle-date-bar">
          <RPButton
            type="button"
            size="sm"
            variant={selectedSettlementDate === todayStr ? 'primary' : 'ghost'}
            onClick={() => {
              setSelectedSettlementDate(todayStr);
              fetchShiftSettlement(todayStr);
            }}
          >
            Today
          </RPButton>

          <RPButton
            type="button"
            size="sm"
            variant={selectedSettlementDate === yestStr ? 'primary' : 'ghost'}
            onClick={() => {
              setSelectedSettlementDate(yestStr);
              fetchShiftSettlement(yestStr);
            }}
          >
            Yesterday
          </RPButton>

          <div className="rp-settle-date-input">
            <Calendar size={14} />
            <input
              type="date"
              value={selectedSettlementDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setSelectedSettlementDate(newDate);
                fetchShiftSettlement(newDate);
              }}
            />
          </div>

          <RPButton
            type="button"
            variant="ghost"
            size="sm"
            title="Refresh Settlement Data"
            disabled={loadingShiftSettlement}
            onClick={() => fetchShiftSettlement(selectedSettlementDate)}
          >
            <RefreshCw size={13} className={loadingShiftSettlement ? 'rp-spin' : ''} />
          </RPButton>
        </div>
      </div>

      {/* Selected Shift Card */}
      {shiftSettlement && (
        <div className={`rp-settle-card rp-fade-up ${shiftSettlement.status === 'REJECTED' ? 'is-rejected' : ''}`}>
          <div className="rp-settle-card-head">
            <div>
              <div className="rp-settle-card-title-row">
                <h3 className="rp-settle-card-title">
                  Shift Commission: {shiftSettlement?.date || selectedSettlementDate}
                </h3>
                {selectedSettlementDate === todayStr && (
                  <span className="rp-tag rp-tag--amber-soft">TODAY'S SHIFT</span>
                )}
              </div>
              <div className="rp-settle-card-sub">
                Trips Completed on this date: <strong>{shiftSettlement?.totalTrips || 0}</strong>
              </div>
            </div>

            <div>
              {shiftSettlement?.status === 'SETTLED' ? (
                <span className="rp-status-chip rp-status-chip--emerald rp-status-chip--lg">
                  <CheckCircle2 size={14} /> Approved &amp; Cleared
                </span>
              ) : shiftSettlement?.status === 'PENDING_APPROVAL' ? (
                <span className="rp-status-chip rp-status-chip--amber rp-status-chip--lg">
                  <Clock size={14} /> Verification In Progress
                </span>
              ) : shiftSettlement?.status === 'REJECTED' ? (
                <span className="rp-status-chip rp-status-chip--rose rp-status-chip--lg">
                  <AlertTriangle size={14} /> Settlement Rejected
                </span>
              ) : Number(shiftSettlement?.totalCommissionDue || 0) === 0 ? (
                <span className="rp-status-chip rp-status-chip--neutral rp-status-chip--lg">
                  <Check size={14} /> No Due (₹0)
                </span>
              ) : selectedSettlementDate === todayStr ? (
                <span className="rp-status-chip rp-status-chip--amber rp-status-chip--lg">
                  <Clock size={14} /> Today's Active Shift
                </span>
              ) : (
                <span className="rp-status-chip rp-status-chip--rose rp-status-chip--lg">
                  <AlertTriangle size={14} /> Past Shift Due (Unsettled)
                </span>
              )}
            </div>
          </div>

          {/* Today's shift notification notice */}
          {selectedSettlementDate === todayStr && (
            <div className="rp-settle-info rp-settle-info--blue">
              <Clock size={16} color="#2563EB" />
              <span>
                <strong>Today's Shift:</strong> Rides accumulate during your active day up to 12:00 midnight. You can take rides freely. Any unsettled commission becomes due for payment tomorrow.
              </span>
            </div>
          )}

          {shiftSuccessMsg && (
            <div className="rp-settle-info rp-settle-info--green rp-slide-down">
              <CheckCircle2 size={16} color="#059669" />
              <span>{shiftSuccessMsg}</span>
            </div>
          )}

          {shiftSettlement?.status === 'REJECTED' && shiftSettlement?.rejectionReason && (
            <div className="rp-settle-info rp-settle-info--rose">
              <AlertTriangle size={16} color="#DC2626" />
              <span>
                <strong>Rejection Reason:</strong> {shiftSettlement.rejectionReason}. Please re-transfer or verify UTR reference.
              </span>
            </div>
          )}

          {/* Dues Breakdown */}
          <div className="rp-settle-breakdown">
            <div>
              <div className="rp-settle-breakdown-label">GROSS COLLECTED:</div>
              <div className="rp-settle-breakdown-value">
                ₹{Number(shiftSettlement?.grossFare ?? 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="rp-settle-breakdown-label">YOUR NET TAKE-HOME:</div>
              <div className="rp-settle-breakdown-value rp-settle-breakdown-value--emerald">
                ₹{Number(shiftSettlement?.riderNetEarnings ?? 0).toFixed(2)}
              </div>
            </div>
            <div className="rp-settle-breakdown-due">
              <div className="rp-settle-breakdown-due-label">
                {selectedSettlementDate === todayStr ? 'ACCUMULATING PLATFORM FEE:' : 'PLATFORM FEE DUE:'}
              </div>
              <div className="rp-settle-breakdown-due-value">
                ₹{Number(shiftSettlement?.totalCommissionDue ?? 0).toFixed(2)}
              </div>
              <div className="rp-settle-breakdown-due-note">
                {selectedSettlementDate === todayStr
                  ? "Accumulates during today's shift · Due after 12:00 AM midnight"
                  : 'Standard: ₹4 / ride (Fare ≤ ₹80) · Long Trips: 10% + ₹2 (Fare > ₹80)'}
              </div>
            </div>
          </div>

          {/* Settlement Action Area */}
          {shiftSettlement?.status === 'SETTLED' ? (
            <div className="rp-settle-info rp-settle-info--green">
              <CheckCircle2 size={22} color="#059669" />
              <div>
                <div style={{ fontWeight: 800 }}>Shift Commission Cleared &amp; Approved</div>
                <div style={{ fontSize: '12px', marginTop: '2px' }}>
                  Admin has verified UTR <strong>{shiftSettlement.utrReference || 'N/A'}</strong>. This shift settlement is complete.
                </div>
              </div>
            </div>
          ) : Number(shiftSettlement?.totalCommissionDue || 0) === 0 ? (
            <div className="rp-settle-info rp-settle-info--neutral">
              No completed rides or commission dues on {shiftSettlement?.date || selectedSettlementDate}.
            </div>
          ) : (
            <>
              {selectedSettlementDate === todayStr && (
                <div className="rp-settle-info rp-settle-info--blue" style={{ marginBottom: 14 }}>
                  <Clock size={20} color="#2563EB" />
                  <div>
                    <div style={{ fontWeight: 800 }}>Today's Shift is Currently Active</div>
                    <div style={{ fontSize: '12px', marginTop: '2px' }}>
                      Your rides accumulate throughout today. You can settle your accumulated commission fee (₹{Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2)}) right now via YouPI PG to clear your shift, or let it accumulate until 12:00 AM midnight. You can continue driving freely!
                    </div>
                  </div>
                </div>
              )}

              {/* YouPI Gateway Instant Auto-Settlement */}
              {(() => {
                const dueAmount = Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2);
                return (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.05))',
                    border: '1.5px solid #10B981',
                    borderRadius: '14px',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Zap size={18} color="#10B981" />
                        <span style={{ fontWeight: 800, fontSize: '14px', color: '#065F46' }}>
                          Instant Auto-Settlement via YouPI Gateway
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#D1FAE5', color: '#047857' }}>
                        RECOMMENDED · AUTO-VERIFIED
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 12px', lineHeight: 1.4 }}>
                      Pay ₹{dueAmount} commission directly. Shift is cleared automatically on payment without waiting for manual admin approval.
                    </p>
                    {youpiError && (
                      <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '8px' }}>
                        {youpiError}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={payingYoupi}
                      onClick={handlePayYoupiSettlement}
                      className="rp-btn rp-btn--block rp-btn--primary"
                      style={{
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                        fontSize: '14px',
                        fontWeight: 800,
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        color: '#FFFFFF'
                      }}
                    >
                      <CreditCard size={16} />
                      <span>{payingYoupi ? 'Launching Gateway...' : `Pay Commission ₹${dueAmount} (YouPI PG)`}</span>
                      <ExternalLink size={14} style={{ opacity: 0.8 }} />
                    </button>
                  </div>
                );
              })()}

              {/* YouPI Settlement QR Modal */}
              {showSettleQr && settleSession && (
                <div className="rp-modal-overlay rp-fade-in" onClick={() => setShowSettleQr(false)}>
                  <div className="rp-qr-modal rp-slide-up" onClick={(e) => e.stopPropagation()}>
                    <div className="rp-qr-modal-head">
                      <div className="rp-qr-modal-title">
                        <CreditCard size={18} color="#10B981" />
                        <span>YouPI — Settle Commission ₹{Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2)}</span>
                      </div>
                      <button
                        type="button"
                        className="rp-qr-modal-close"
                        onClick={() => setShowSettleQr(false)}
                        aria-label="Close"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="rp-qr-modal-body">
                      <div className="rp-qr-code-wrapper">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(settleSession.upiIntentUrl || settleSession.checkoutUrl)}`}
                          alt="YouPI Settlement QR"
                          className="rp-qr-img"
                        />
                        <div className="rp-qr-pulse-badge">
                          <span className="rp-pulse-dot" />
                          <span>Listening for payment clearance...</span>
                        </div>
                      </div>

                      <p className="rp-qr-instructions">
                        Scan with <strong>Google Pay, PhonePe, Paytm, BHIM</strong>, or any UPI app to settle ₹{Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2)} commission. Shift will be cleared automatically on payment.
                      </p>

                      <div className="rp-qr-upi-links">
                        <a
                          href={settleSession.upiIntentUrl}
                          className="rp-btn rp-btn--sm rp-btn--success"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <Zap size={14} /> 1-Tap UPI Intent
                        </a>
                        {settleSession.checkoutUrl && (
                          <a
                            href={settleSession.checkoutUrl}
                            className="rp-btn rp-btn--sm rp-btn--ghost"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <ExternalLink size={14} /> Open Checkout
                          </a>
                        )}
                        <button
                          type="button"
                          className="rp-btn rp-btn--sm rp-btn--ghost"
                          onClick={() => {
                            navigator.clipboard?.writeText(settleSession.checkoutUrl || settleSession.upiIntentUrl);
                            setCopiedSettleLink(true);
                            setTimeout(() => setCopiedSettleLink(false), 2000);
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <Copy size={14} />
                          <span>{copiedSettleLink ? 'Copied Link!' : 'Copy Payment Link'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 1-Tap UPI Apps */}
              {(() => {
                const adminUpiId = shiftSettlement?.adminUpi?.upiId || 'papido.admin@okaxis';
                const adminReceiverName = shiftSettlement?.adminUpi?.receiverName || 'Papido Operations';
                const dueAmount = Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2);
                const gpaySettleUrl = `gpay://upi/pay?pa=${encodeURIComponent(adminUpiId)}&pn=${encodeURIComponent(adminReceiverName)}&am=${dueAmount}&cu=INR`;
                const phonepeSettleUrl = `phonepe://pay?pa=${encodeURIComponent(adminUpiId)}&pn=${encodeURIComponent(adminReceiverName)}&am=${dueAmount}&cu=INR`;
                const upiSettleUrl = `upi://pay?pa=${encodeURIComponent(adminUpiId)}&pn=${encodeURIComponent(adminReceiverName)}&am=${dueAmount}&cu=INR`;

                return (
                  <div className="rp-settle-pay-btns">
                    <a
                      href={gpaySettleUrl}
                      onClick={() => navigator.clipboard?.writeText(adminUpiId)}
                      className="rp-btn rp-btn--block rp-btn--success"
                      rel="noopener noreferrer"
                    >
                      <Smartphone size={15} /> 1-Tap Google Pay (₹{dueAmount})
                    </a>
                    <a
                      href={phonepeSettleUrl}
                      onClick={() => navigator.clipboard?.writeText(adminUpiId)}
                      className="rp-btn rp-btn--block rp-btn--phonepe"
                      rel="noopener noreferrer"
                    >
                      <Zap size={15} /> 1-Tap PhonePe (₹{dueAmount})
                    </a>
                    <a
                      href={upiSettleUrl}
                      onClick={() => navigator.clipboard?.writeText(adminUpiId)}
                      className="rp-btn rp-btn--block rp-btn--ghost"
                      style={{ border: '1px solid #10B981', color: '#047857' }}
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={15} /> Any UPI App
                    </a>
                  </div>
                );
              })()}

              {/* UPI Copy */}
              <div className="rp-upi-copy-row">
                <div>
                  <div className="rp-upi-copy-label">
                    Admin Settlement UPI ID ({shiftSettlement?.adminUpi?.receiverName || 'Papido Operations'})
                  </div>
                  <div className="rp-upi-copy-value">
                    {shiftSettlement?.adminUpi?.upiId || 'papido.admin@okaxis'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const targetUpi = shiftSettlement?.adminUpi?.upiId || 'papido.admin@okaxis';
                    navigator.clipboard?.writeText(targetUpi);
                    setCopiedAdminUpi(true);
                    setTimeout(() => setCopiedAdminUpi(false), 2500);
                  }}
                  className={`rp-upi-copy-btn ${copiedAdminUpi ? 'is-copied' : ''}`}
                >
                  {copiedAdminUpi ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                  <span>{copiedAdminUpi ? 'Copied' : 'Copy UPI'}</span>
                </button>
              </div>

              {/* QR Toggle */}
              <div className="rp-qr-toggle-wrap">
                <button
                  type="button"
                  onClick={() => setShowAdminQr(!showAdminQr)}
                  className="rp-qr-toggle"
                >
                  <QrCode size={14} />
                  <span>{showAdminQr ? 'Hide Admin Settlement QR Code' : 'Show Admin Settlement QR Code'}</span>
                </button>

                {showAdminQr && (
                  <div className="rp-qr-box rp-fade-up">
                    <div className="rp-qr-inner">
                      <img
                        src={shiftSettlement?.adminUpi?.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(shiftSettlement?.adminUpi?.upiPayUrl || 'upi://pay?pa=papido.admin@okaxis')}`}
                        alt="Admin Settlement QR"
                        className="rp-qr-img"
                      />
                    </div>
                    <div className="rp-qr-note">
                      Scan to pay exact ₹{Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2)} for {shiftSettlement?.date || selectedSettlementDate}
                    </div>
                  </div>
                )}
              </div>

              {/* UTR Input Form */}
              <form onSubmit={handleSubmitShiftSettlement} className="rp-utr-form">
                <label className="rp-utr-label">
                  UPI Transaction Reference / UTR Number (12 Digits) for {shiftSettlement?.date || selectedSettlementDate} *
                </label>
                <div className="rp-utr-input-row">
                  <input
                    type="text"
                    className="rp-input rp-input--mono"
                    placeholder="e.g. 428192849102"
                    value={shiftUtrInput}
                    onChange={(e) => setShiftUtrInput(e.target.value)}
                    required
                  />
                  <RPButton
                    type="submit"
                    variant="primary"
                    disabled={submittingShiftSettlement || !shiftUtrInput.trim()}
                    loading={submittingShiftSettlement}
                  >
                    <Send size={14} />
                    <span>Submit Settlement</span>
                  </RPButton>
                </div>
                <div className="rp-utr-note">
                  Admin verifies this payment and clears your shift so you can accept rides tomorrow.
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* Past 14 Days History Table */}
      {shiftSettlement?.recentShifts && shiftSettlement.recentShifts.length > 0 && (
        <div className="rp-panel rp-fade-up">
          <div className="rp-panel-head">
            <div>
              <h3 className="rp-panel-title">Past 14 Days Shift Settlements Ledger</h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                Click any day to view or settle
              </p>
            </div>
          </div>
          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th>Shift Date</th>
                  <th>Trips</th>
                  <th>Gross Volume</th>
                  <th>Commission Due</th>
                  <th>Your Net</th>
                  <th>Status</th>
                  <th>Submitted UTR</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {shiftSettlement.recentShifts.map((s) => {
                  const isSelected = selectedSettlementDate === s.date;
                  return (
                    <tr key={s.date} className={isSelected ? 'is-selected' : ''}>
                      <td className="rp-table-code">
                        {s.date}
                        {s.date === todayStr && (
                          <span className="rp-tag rp-tag--amber-soft" style={{ marginLeft: '6px' }}>TODAY</span>
                        )}
                      </td>
                      <td>{s.totalTrips}</td>
                      <td>₹{Number(s.grossFare || 0).toFixed(2)}</td>
                      <td style={{ color: Number(s.totalCommissionDue || 0) > 0 ? '#DC2626' : '#64748B', fontWeight: 700 }}>
                        ₹{Number(s.totalCommissionDue || 0).toFixed(2)}
                      </td>
                      <td style={{ color: '#059669', fontWeight: 700 }}>₹{Number(s.riderNetEarnings || 0).toFixed(2)}</td>
                      <td>
                        {s.status === 'SETTLED' ? (
                          <span className="rp-status-chip rp-status-chip--emerald">SETTLED</span>
                        ) : s.status === 'PENDING_APPROVAL' ? (
                          <span className="rp-status-chip rp-status-chip--amber">VERIFYING</span>
                        ) : s.status === 'REJECTED' ? (
                          <span className="rp-status-chip rp-status-chip--rose">REJECTED</span>
                        ) : (
                          <span className="rp-status-chip rp-status-chip--rose">DUE</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{s.utrReference || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <RPButton
                          type="button"
                          size="sm"
                          variant={isSelected ? 'primary' : 'ghost'}
                          onClick={() => {
                            setSelectedSettlementDate(s.date);
                            fetchShiftSettlement(s.date);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          {isSelected ? 'Viewing' : 'Select Day'}
                        </RPButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
export default DailySettlementsPage;
