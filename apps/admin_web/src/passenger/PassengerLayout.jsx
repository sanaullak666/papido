import React, { useEffect, useState } from 'react';
import './PassengerLayout.css';
import { useAuth } from '../context/AuthContext';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { PassengerProvider, usePassenger } from './shared/PassengerContext';
import { PassengerModals } from './shared/PassengerModals';
import {
  Bike, Calendar, Compass, History, User, LogOut, X
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'book',      label: 'Book',    icon: Bike,     path: '/passenger/book' },
  { id: 'scheduled', label: 'Advance', icon: Calendar, path: '/passenger/prebook' },
  { id: 'outside',   label: 'Outside', icon: Compass,  path: '/passenger/outside' },
  { id: 'history',   label: 'Rides',   icon: History,  path: '/passenger/rides' },
  { id: 'profile',   label: 'Profile', icon: User,     path: '/passenger/profile' }
];

function LayoutInner({ children, currentTab }) {
  const { user, logout } = useAuth();
  const { statusMessage, setStatusMessage } = usePassenger();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [statusMessage, setStatusMessage]);

  const goTo = (item) => {
    if (window.location.pathname !== item.path) {
      window.history.pushState({}, '', item.path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className={`passenger-shell theme-orange-beige has-bottom-nav ${compact ? 'is-compact' : ''}`}>
      <div className="ps-ambient" aria-hidden="true">
        <span className="ps-orb ps-orb--a" />
        <span className="ps-orb ps-orb--b" />
      </div>

      <header className="ps-header">
        <div className="ps-header-inner">
          <a
            className="ps-brand"
            href="/passenger/book"
            onClick={(e) => { e.preventDefault(); goTo(NAV_ITEMS[0]); }}
          >
            <span className="ps-brand-logo-wrap">
              <img src="/papidologo.jpeg" alt="Papido" className="ps-brand-logo" />
            </span>
            <span className="ps-brand-text">
              <span className="ps-brand-name">
                PAPIDO <span className="ps-brand-tag">PASSENGER</span>
              </span>
              <span className="ps-brand-sub">Pondicherry University Campus Mobility</span>
            </span>
          </a>

          <nav className="ps-nav" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <a
                  key={item.id}
                  href={item.path}
                  onClick={(e) => { e.preventDefault(); goTo(item); }}
                  className={`ps-nav-tab ${active ? 'is-active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="ps-user-chip">
            <div className="ps-user-text">
              <div className="ps-user-name">{user?.name || 'Passenger'}</div>
              <div className="ps-user-email">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="ps-icon-btn"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {statusMessage && (() => {
        const text = typeof statusMessage === 'object' ? statusMessage.text : statusMessage;
        const explicitType = typeof statusMessage === 'object' ? statusMessage.type : null;
        let variant = '';
        if (explicitType) {
          variant = `is-${explicitType}`;
        } else {
          const lower = (text || '').toLowerCase();
          if (lower.includes('success') || lower.includes('scheduled') || lower.includes('confirmed') || lower.includes('unlocked') || lower.includes('saved')) {
            variant = 'is-success';
          } else if (lower.includes('error') || lower.includes('fail') || lower.includes('penalty') || lower.includes('unpaid') || lower.includes('cancel')) {
            variant = 'is-error';
          } else if (lower.includes('search') || lower.includes('dispatch') || lower.includes('refresh') || lower.includes('connecting')) {
            variant = 'is-info';
          }
        }

        return (
          <div className={`ps-status-banner ${variant}`} role="status" aria-live="polite">
            <span className="ps-banner-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M13 2 L3 14 h7 l-1 8 L21 10 h-7 z" />
              </svg>
            </span>
            <span className="ps-banner-text">{text}</span>
            <button
              className="ps-banner-close"
              onClick={() => setStatusMessage(null)}
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24">
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </button>
          </div>
        );
      })()}

      <main className="ps-main">
        <div className="ps-page-enter" key={currentTab}>
          {children}
        </div>
      </main>

      <BottomNavigation
        items={NAV_ITEMS}
        activeId={currentTab}
        onChange={(id) => {
          const item = NAV_ITEMS.find(n => n.id === id);
          if (item) goTo(item);
        }}
        theme="passenger"
      />

      <PassengerModals />
    </div>
  );
}

export function PassengerLayout({ children, currentTab }) {
  return (
    <PassengerProvider>
      <LayoutInner currentTab={currentTab}>{children}</LayoutInner>
    </PassengerProvider>
  );
}
export default PassengerLayout;
