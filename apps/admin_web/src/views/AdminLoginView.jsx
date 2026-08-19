import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, ArrowLeft } from 'lucide-react';

export function AdminLoginView({ onGoToUserPortal }) {
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState('admin@papido.com');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(email, password);
    } catch (err) {
      setError(err.message || 'Administrator authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top, #1E1B4B 0%, #0B0F19 70%)',
      padding: '20px'
    }}>
      <div className="auth-card-container" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        padding: '40px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
      }}>
        {/* Header Badge */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #6366F1, #4338CA)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(99,102,241,0.4)'
          }}>
            <ShieldCheck size={32} />
          </div>
          <div style={{ display: 'inline-block', background: 'rgba(99,102,241,0.2)', color: '#A5B4FC', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, letterSpacing: '1px', marginBottom: '8px' }}>
            RESTRICTED ACCESS
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900 }}>PAPIDO ADMIN</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Campus Fleet & Operations Command Center
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '8px',
            color: '#FB7185',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Administrator Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: '38px', width: '100%' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@papido.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Admin Security Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: '38px', width: '100%' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '12px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              color: '#fff',
              border: 'none'
            }}
            disabled={loading}
          >
            {loading ? 'Authenticating Administrator...' : (
              <>
                Sign In to Command Center <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo Fill */}
        <div style={{
          marginTop: '20px',
          padding: '12px',
          background: 'var(--bg-sidebar)',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Master Admin:</div>
            <strong>admin@papido.com</strong>
          </div>
          <button
            type="button"
            onClick={() => { setEmail('admin@papido.com'); setPassword('Password@123'); }}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px' }}
          >
            Fill Demo
          </button>
        </div>

        {/* Link back to Student / Driver Web Portal */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onGoToUserPortal}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={14} /> Return to Passenger & Driver Web App
          </button>
        </div>
      </div>
    </div>
  );
}
