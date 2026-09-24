import React from 'react';
import './RiderLayout.css';
import { useRider } from './shared/RiderContext';
import {
  Radio,
  Bike,
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  User,
  LogOut,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';
import { RPButton } from './shared/RiderUI';

export function RiderLayout({ currentTab = 'radar', onTabChange, children }) {
  const {
    user,
    logout,
    isOnline,
    handleToggleOnline,
    soundEnabled,
    setSoundEnabled,
    todayNetEarning,
    incomingRequests,
    activeRide,
    availableScheduledRides,
    pendingShiftsList,
    totalPendingCommissionDues,
    setSelectedSettlementDate,
    pendingPenaltiesToVerify,
    handleConfirmPenalty,
    tripCancelledNotice,
    setTripCancelledNotice,
    statusBanner,
    clearStatusBanner
  } = useRider();

  const navItems = [
    { id: 'radar', label: 'Radar & Requests', icon: Radio, badge: incomingRequests.length > 0 ? incomingRequests.length : null },
    { id: 'active', label: 'Active Trip', icon: Bike, badge: activeRide ? 'dot' : null },
    { id: 'scheduled', label: 'Advance Bookings', icon: Calendar, badge: availableScheduledRides.length > 0 ? `${availableScheduledRides.length} OPEN` : null },
    { id: 'earnings', label: 'Shift Earnings', icon: DollarSign },
    { id: 'settlements', label: 'Daily Settlements', icon: CreditCard, badge: pendingShiftsList.length > 0 ? `${pendingShiftsList.length} PENDING` : null },
    { id: 'kyc', label: 'KYC & Vehicle', icon: FileText },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  const bottomNavItems = [
    { id: 'radar', label: 'Radar', icon: Radio, badge: incomingRequests.length > 0 ? incomingRequests.length : null },
    { id: 'active', label: 'Active', icon: Bike, badge: activeRide ? 'dot' : null },
    { id: 'scheduled', label: 'Advance', icon: Calendar, badge: availableScheduledRides.length > 0 ? availableScheduledRides.length : null },
    { id: 'settlements', label: 'Settlements', icon: CreditCard, badge: pendingShiftsList.length > 0 ? pendingShiftsList.length : null },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  const handleNavClick = (tabId, e) => {
    if (e) e.preventDefault();
    if (onTabChange) onTabChange(tabId);
  };

  return (
    <div className="rider-shell">
      {/* Header */}
      <header className="rp-header">
        <div className="rp-header-inner">
          {/* Brand */}
          <a href="#radar" onClick={(e) => handleNavClick('radar', e)} className="rp-brand">
            <div className="rp-brand-logo-wrap">
              <img src="/papidologo.jpeg" alt="Papido" className="rp-brand-logo" />
            </div>
            <div>
              <div className="rp-brand-title">
                PAPIDO <span className="rp-brand-tag">DRIVER</span>
              </div>
              <div className="rp-brand-sub">Campus Driver Console</div>
            </div>
          </a>

          {/* Duty Pill & Today's Earnings */}
          <div className="rp-header-center">
            <button
              type="button"
              onClick={handleToggleOnline}
              className={`rp-duty-pill ${isOnline ? 'is-online' : 'is-offline'}`}
              aria-label="Toggle Online Duty"
            >
              <span className="rp-duty-dot" />
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </button>

            <div className="rp-earn-chip">
              <span className="rp-earn-chip-label">TODAY:</span>
              <span className="rp-earn-chip-value">₹{todayNetEarning}</span>
            </div>
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="rp-nav" aria-label="Rider navigation tabs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => handleNavClick(item.id, e)}
                  className={`rp-nav-tab ${isActive ? 'is-active' : ''}`}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                  {item.badge === 'dot' ? (
                    <span className="rp-nav-badge--dot" />
                  ) : item.badge ? (
                    <span className="rp-nav-badge">{item.badge}</span>
                  ) : null}
                </a>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="rp-header-right">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="rp-icon-btn"
              title={soundEnabled ? 'Mute Ride Alerts' : 'Unmute Ride Alerts'}
              aria-label={soundEnabled ? 'Mute Ride Alerts' : 'Unmute Ride Alerts'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} color="#DC2626" />}
            </button>

            <div className="rp-user-chip">
              <div className="rp-user-name">{user?.name || 'Driver'}</div>
              <div className="rp-user-email">{user?.email}</div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="rp-icon-btn"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Glass Pill Notification Banner */}
      {statusBanner && (
        <div
          className={`rp-status-banner ${
            statusBanner.type === 'success'
              ? 'is-success'
              : statusBanner.type === 'error'
              ? 'is-error'
              : statusBanner.type === 'info'
              ? 'is-info'
              : ''
          }`}
          role="status"
          aria-live="polite"
        >
          <span className="rp-banner-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              {statusBanner.type === 'success' ? (
                <path d="M13 2 L3 14 h7 l-1 8 L21 10 h-7 z" />
              ) : statusBanner.type === 'error' ? (
                <>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" strokeWidth="2.2" />
                  <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2.2" />
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2.2" />
                </>
              ) : (
                <circle cx="12" cy="12" r="9" stroke="currentColor" fill="none" strokeWidth="2.2" />
              )}
            </svg>
          </span>
          <span className="rp-banner-text">{statusBanner.text}</span>
          <button
            type="button"
            className="rp-banner-close"
            onClick={clearStatusBanner}
            aria-label="Dismiss"
          >
            <svg viewBox="0 0 24 24">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </div>
      )}

      {/* Trip Cancelled Notice */}
      {tripCancelledNotice && (
        <div className="rp-status-banner is-error" role="status" aria-live="polite">
          <span className="rp-banner-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" strokeWidth="2.2" />
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2.2" />
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2.2" />
            </svg>
          </span>
          <span className="rp-banner-text">{tripCancelledNotice}</span>
          <button
            type="button"
            className="rp-banner-close"
            onClick={() => setTripCancelledNotice(null)}
            aria-label="Dismiss"
          >
            <svg viewBox="0 0 24 24">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </div>
      )}

      {/* Pending Commission Warning */}
      {pendingShiftsList && pendingShiftsList.length > 0 && (
        <div className="rp-commission-banner rp-fade-up">
          <div className="rp-commission-left">
            <div className="rp-commission-icon">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="rp-commission-title">
                Pending Platform Fees Notice — Total Due: ₹{totalPendingCommissionDues}
              </div>
              <div className="rp-commission-sub">
                You have pending shift commission on the following date(s):
              </div>
              <div className="rp-commission-pills">
                {pendingShiftsList.map((ps) => (
                  <span key={`pending-pill-${ps.date}`} className="rp-commission-pill">
                    {ps.date}: ₹{Number(ps.totalCommissionDue || 0).toFixed(2)} ({ps.status === 'PENDING_APPROVAL' ? 'In Verification' : ps.status === 'REJECTED' ? 'Rejected' : 'Unsettled'})
                  </span>
                ))}
              </div>
            </div>
          </div>
          <RPButton
            type="button"
            size="sm"
            variant="primary"
            onClick={() => {
              if (pendingShiftsList[0]?.date) {
                setSelectedSettlementDate(pendingShiftsList[0].date);
              }
              if (onTabChange) onTabChange('settlements');
            }}
          >
            <CreditCard size={14} /> View &amp; Settle Dues
          </RPButton>
        </div>
      )}

      {/* Penalty Verification Banners */}
      {pendingPenaltiesToVerify && pendingPenaltiesToVerify.length > 0 && (
        <div className="rp-penalty-banner-group">
          {pendingPenaltiesToVerify.map((p) => (
            <div key={`pen-ver-${p.id}`} className="rp-penalty-banner rp-fade-up">
              <div className="rp-penalty-banner-left">
                <div className="rp-penalty-banner-icon">
                  <DollarSign size={22} />
                </div>
                <div>
                  <div className="rp-penalty-banner-title">
                    ₹15 Cancellation Compensation Verification Needed
                  </div>
                  <div className="rp-penalty-banner-sub">
                    Passenger <strong>{p.customer_name || 'Passenger'}</strong>{' '}
                    {p.customer_phone ? `(${p.customer_phone})` : ''} claims to have paid ₹15 to your UPI for cancelled Ride <strong>#{p.ride_code || ''}</strong>.
                  </div>
                </div>
              </div>
              <div className="rp-penalty-banner-actions">
                <RPButton
                  type="button"
                  size="sm"
                  variant="success"
                  onClick={() => handleConfirmPenalty(p.id, true)}
                >
                  <CheckCircle2 size={15} /> Confirm ₹15 Received
                </RPButton>
                <RPButton
                  type="button"
                  size="sm"
                  variant="danger-soft"
                  onClick={() => handleConfirmPenalty(p.id, false)}
                >
                  <XCircle size={15} /> Not Received
                </RPButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <main className="rp-main">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="rp-bottom-nav" aria-label="Mobile navigation">
        <div className="rp-bottom-nav-inner">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleNavClick(item.id, e)}
                className={`rp-bottom-nav-item ${isActive ? 'is-active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge === 'dot' ? (
                  <span className="rp-nav-badge--dot" />
                ) : item.badge ? (
                  <span className="rp-bottom-nav-badge">{item.badge}</span>
                ) : null}
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
