import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Wifi, WifiOff, Bell, RefreshCw, Menu, Volume2, VolumeX, LogOut, Shield } from 'lucide-react';
import { alertManager } from '../utils/alertManager';

export function Header({ title, subtitle, onRefresh, isRefreshing, onToggleMobileMenu }) {
  const { isConnected } = useSocket();
  const { adminUser, adminLogout } = useAuth();
  const [alertTested, setAlertTested] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => alertManager.isSoundEnabled());
  const [isRinging, setIsRinging] = useState(() => alertManager.isPlayingRingtone());

  useEffect(() => {
    const unsubMute = alertManager.onMuteChange(setSoundEnabled);
    const unsubRing = alertManager.onRingtoneChange(setIsRinging);
    return () => {
      unsubMute();
      unsubRing();
    };
  }, []);

  const handleToggleSound = () => {
    const unmuted = alertManager.toggleMute();
    setSoundEnabled(unmuted);
  };

  const handleSilenceSound = () => {
    alertManager.silence();
  };

  const handleTestSound = () => {
    alertManager.requestPermission();
    if (!soundEnabled) {
      alertManager.setSoundEnabled(true);
      setSoundEnabled(true);
    } else {
      alertManager.playOneShot();
    }
    setAlertTested(true);
    setTimeout(() => setAlertTested(false), 2500);
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
        {/* Silence Active Ringtone Button */}
        {isRinging && (
          <button
            onClick={handleSilenceSound}
            className="btn btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              borderColor: '#EF4444',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Silence ringing alert audio immediately"
          >
            <VolumeX size={14} />
            <span>Silence Ringtone</span>
          </button>
        )}

        {/* Sound Alerts Mute / Unmute Toggle */}
        <button
          onClick={handleToggleSound}
          className="btn btn-secondary btn-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            borderColor: soundEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            color: soundEnabled ? '#34D399' : '#F87171'
          }}
          title={soundEnabled ? 'Alert sounds are ON. Click to mute.' : 'Alert sounds are MUTED. Click to unmute.'}
        >
          {soundEnabled ? <Volume2 size={14} color="#10B981" /> : <VolumeX size={14} color="#EF4444" />}
          <span>{soundEnabled ? 'Sound: ON' : 'Sound: MUTED'}</span>
        </button>

        {/* Real-time Sound & Push Alert Test */}
        <button
          onClick={handleTestSound}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          title="Click to test audio chime & enable browser push notifications"
        >
          {alertTested ? <Bell size={14} color="#10B981" /> : <Volume2 size={14} color="#94A3B8" />}
          <span>{alertTested ? 'Playing...' : 'Test Chime'}</span>
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
