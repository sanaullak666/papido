import React from 'react';
import { Compass, Home, ArrowLeft } from 'lucide-react';

export function NotFoundView({ onGoHome, user, adminUser, onGoDashboard }) {
  const handleHome = () => {
    if (typeof onGoHome === 'function') {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleDashboard = () => {
    if (typeof onGoDashboard === 'function') {
      onGoDashboard();
    } else {
      if (adminUser) window.location.href = '/admin/dashboard';
      else if (user?.role === 'RIDER') window.location.href = '/driver/radar';
      else window.location.href = '/passenger';
    }
  };

  const hasActiveSession = Boolean(user || adminUser);

  return (
    <main
      role="main"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#090d16',
        color: '#f8fafc',
        padding: '32px 20px',
        textAlign: 'center',
        fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif"
      }}
    >
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: '0 0 30px rgba(16, 185, 129, 0.15)'
        }}
      >
        <Compass size={40} color="#10b981" />
      </div>

      <div
        style={{
          fontSize: '72px',
          fontWeight: '900',
          letterSpacing: '-2px',
          lineHeight: '1',
          marginBottom: '12px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        404
      </div>

      <h1
        style={{
          fontSize: '24px',
          fontWeight: '800',
          margin: '0 0 10px',
          color: '#f1f5f9'
        }}
      >
        Page Not Found
      </h1>

      <p
        style={{
          fontSize: '15px',
          color: '#94a3b8',
          maxWidth: '440px',
          margin: '0 0 32px',
          lineHeight: '1.6'
        }}
      >
        The link you followed doesn't exist, has been removed, or was entered incorrectly.
      </p>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}
      >
        <button
          type="button"
          onClick={handleHome}
          aria-label="Return to Homepage"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#10b981',
            color: '#064e3b',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '12px',
            fontWeight: '700',
            fontSize: '15px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
            transition: 'transform 0.15s ease'
          }}
        >
          <Home size={18} />
          <span>Return Home</span>
        </button>

        {hasActiveSession && (
          <button
            type="button"
            onClick={handleDashboard}
            aria-label="Return to Dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '15px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <ArrowLeft size={18} />
            <span>Go to Portal</span>
          </button>
        )}
      </div>
    </main>
  );
}

export default NotFoundView;
