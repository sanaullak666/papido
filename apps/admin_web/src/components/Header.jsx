import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Wifi, WifiOff, Bell, RefreshCw, Menu, Volume2, LogOut, Shield } from 'lucide-react';
import { alertManager } from '../utils/alertManager';

export function Header({ title, subtitle, onRefresh, isRefreshing, onToggleMobileMenu }) {
  const { isConnected } = useSocket();
  const { adminUser, adminLogout } = useAuth();
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
            title="Open Menu"
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
          onClick={handleTestSound}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          title="Click to test audio chime & enable browser push notifications"
        >
          {alertTested ? <Bell size={14} color="#10B981" /> : <Volume2 size={14} color="#10B981" />}
          <span>{alertTested ? 'Sound Playing...' : 'Test Sound & Push'}</span>
        </button>

        {/* Real-time Socket / Live Sync Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
          border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
          borderRadius: 'var(--radius-full)',
          fontSize: '12px',
          fontWeight: 600,
          color: '#34D399'
        }}>
          <Wifi size={14} color="#34D399" />
          <span>{isConnected ? 'Real-Time Connected' : 'Live Sync Active'}</span>
        </div>

        {onRefresh && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        )}

        {/* Admin Sign Out Button */}
        {adminLogout && (
          <button
            onClick={adminLogout}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: '#F87171'
            }}
            title="Sign out of Admin Portal"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
