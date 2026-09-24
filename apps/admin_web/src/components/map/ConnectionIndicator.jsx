import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function ConnectionIndicator({
  connected = true,
  className = '',
  style = {}
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        background: connected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
        color: connected ? '#065F46' : '#991B1B',
        fontSize: '11px',
        fontWeight: 800,
        ...style
      }}
      className={`papido-connection-indicator ${className}`}
    >
      {connected ? (
        <>
          <Wifi size={13} color="#10B981" />
          <span>Live GPS Sync</span>
        </>
      ) : (
        <>
          <WifiOff size={13} color="#EF4444" />
          <span>Reconnecting...</span>
        </>
      )}
    </div>
  );
}

export default ConnectionIndicator;
