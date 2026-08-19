import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Wifi, WifiOff, Bell, RefreshCw, Menu, Volume2 } from 'lucide-react';
import { alertManager } from '../utils/alertManager';

export function Header({ title, subtitle, onRefresh, isRefreshing, onToggleMobileMenu }) {
  const { isConnected } = useSocket();
  const [alertTested, setAlertTested] = useState(false);

  const handleTestSound = () => {
    alertManager.requestPermission();
    alertManager.triggerRideAlert({
      title: '🔔 Papido Dispatch Alert Active',
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
          <Volume2 size={14} color="#10B981" />
          <span>{alertTested ? '🔔 Sound Playing...' : 'Test Sound & Push'}</span>
        </button>

        {/* Real-time Socket Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
          border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          borderRadius: 'var(--radius-full)',
          fontSize: '12px',
          fontWeight: 600,
          color: isConnected ? '#34D399' : '#FB7185'
        }}>
          {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isConnected ? 'Real-Time Connected' : 'Connecting...'}</span>
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
      </div>
    </header>
  );
}
