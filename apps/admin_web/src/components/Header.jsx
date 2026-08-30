import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Wifi, Bell, RefreshCw, Menu, Volume2, LogOut } from 'lucide-react';
import { alertManager } from '../utils/alertManager';

export function Header({ title, subtitle, onRefresh, isRefreshing, onToggleMobileMenu }) {
  const { isConnected } = useSocket();
  const { adminLogout } = useAuth();
  const [alertTested, setAlertTested] = useState(false);

  const handleTestSound = () => {
    alertManager.requestPermission();
    alertManager.triggerRideAlert({
      title: 'Papido Dispatch Alert Active',
      body: 'Sound and Browser Notifications are enabled for this session.',
      repeat: false
    });
    setAlertTested(true);
    setTimeout(() => setAlertTested(false), 3000);
  };

  return (
    <header className="top-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="btn btn-secondary btn-sm"
            style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
            title="Open Menu"
            aria-label="Open sidebar navigation"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="page-title-wrap">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      <div className="top-bar-actions">
        {/* Real-time Sound & Push Alert Toggle */}
        <button
          type="button"
          onClick={handleTestSound}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          title="Click to test audio chime & enable browser push notifications"
          aria-label="Test sound and push notifications"
        >
          {alertTested ? <Bell size={14} color="#10B981" /> : <Volume2 size={14} color="#10B981" />}
          <span className="hide-on-mobile">{alertTested ? 'Testing...' : 'Test Sound'}</span>
        </button>

        {/* Real-time Socket / Live Sync Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 10px',
          background: isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
          border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.2)'}`,
          borderRadius: 'var(--radius-full)',
          fontSize: '11.5px',
          fontWeight: 700,
          color: '#34D399',
          whiteSpace: 'nowrap'
        }}>
          <Wifi size={13} color="#34D399" />
          <span className="hide-on-mobile">{isConnected ? 'Live Sync' : 'Live Sync'}</span>
        </div>

        {onRefresh && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hide-on-mobile">Refresh</span>
          </button>
        )}

        {/* Admin Sign Out Button */}
        {adminLogout && (
          <button
            type="button"
            onClick={adminLogout}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              borderColor: 'rgba(239, 68, 68, 0.35)',
              color: '#F87171'
            }}
            title="Sign out of Admin Portal"
            aria-label="Sign out of Admin Portal"
          >
            <LogOut size={14} />
            <span className="hide-on-mobile">Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;
