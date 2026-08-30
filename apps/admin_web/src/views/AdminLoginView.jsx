import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, ArrowLeft, Eye, EyeOff, Sparkles } from 'lucide-react';

export function AdminLoginView({ onGoToUserPortal }) {
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState('admin@papido.com');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
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
      background: 'radial-gradient(circle at 50% 10%, #1E1B4B 0%, #0B0F19 75%)',
      padding: 'clamp(16px, 4vw, 32px)'
    }}>
      <div className="auth-card-container" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: 'clamp(24px, 4vw, 40px)',
        width: '100%',
        maxWidth: '440px',
        boxShadow: 'var(--shadow-xl)',
        position: 'relative'
      }}>
        {/* Header Badge */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #6366F1, #4338CA)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(99,102,241,0.35)'
          }}>
            <ShieldCheck size={30} />
          </div>
          <div style={{
            display: 'inline-block',
            background: 'rgba(99,102,241,0.18)',
            color: '#A5B4FC',
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '1px',
            marginBottom: '8px',
            border: '1px solid rgba(99,102,241,0.3)'
          }}>
            RESTRICTED ACCESS
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#FFF' }}>PAPIDO ADMIN</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Campus Fleet & Operations Command Center
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            borderRadius: 'var(--radius-md)',
            color: '#FB7185',
            fontSize: '13px',
            marginBottom: '20px',
            lineHeight: 1.4
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-email">Administrator Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="admin-email"
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: '38px', height: '44px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@papido.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">Admin Security Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                className="form-input"
                style={{ paddingLeft: '38px', paddingRight: '42px', height: '44px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  borderRadius: '4px'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              minHeight: '46px',
              marginTop: '12px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              color: '#FFF',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
            }}
            disabled={loading}
          >
            {loading ? 'Authenticating Administrator...' : (
              <>
                <span>Sign In to Command Center</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo Fill Widget */}
        <div style={{
          marginTop: '20px',
          padding: '12px 14px',
          background: 'var(--bg-sidebar)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Master Admin:</div>
            <strong style={{ color: '#FFF' }}>admin@papido.com</strong>
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
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '6px'
            }}
          >
            <ArrowLeft size={14} /> Return to Passenger & Driver Web App
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginView;
