import React, { useState } from 'react';
import './AdminLoginView.css';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle
} from 'lucide-react';

export function AdminLoginView({ onGoToUserPortal }) {
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="al-page">
      {/* Ambient orbs */}
      <div className="al-bg" aria-hidden="true">
        <span className="al-orb al-orb--a" />
        <span className="al-orb al-orb--b" />
        <span className="al-orb al-orb--c" />
      </div>

      <div className="al-card al-card-in">
        {/* Header badge */}
        <div className="al-card-head">
          <div className="al-shield-badge">
            <ShieldCheck size={30} />
          </div>
          <div className="al-restricted-tag">
            <span className="al-restricted-dot" />
            RESTRICTED ACCESS
          </div>
          <h1 className="al-title">PAPIDO ADMIN</h1>
          <p className="al-sub">Campus Fleet &amp; Operations Command Center</p>
        </div>

        {error && (
          <div className="al-alert al-alert--error al-shake">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="al-form">
          <div className="al-field">
            <label className="al-label">Administrator Email</label>
            <div className="al-input-wrap">
              <Mail size={16} className="al-input-icon" />
              <input
                type="email"
                required
                className="al-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pupapido@gmail.com"
              />
            </div>
          </div>

          <div className="al-field">
            <label className="al-label">Admin Security Password</label>
            <div className="al-input-wrap">
              <Lock size={16} className="al-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="al-input al-input--with-trail"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="al-input-trail"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="al-submit al-ripple"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="al-spin" />
                <span>Authenticating Administrator...</span>
              </>
            ) : (
              <>
                <span>Sign In to Command Center</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Back link */}
        <div className="al-back-wrap">
          <button
            type="button"
            onClick={onGoToUserPortal}
            className="al-back-btn"
          >
            <ArrowLeft size={14} />
            <span>Return to Passenger &amp; Driver Web App</span>
          </button>
        </div>
      </div>
    </div>
  );
}
export default AdminLoginView;
