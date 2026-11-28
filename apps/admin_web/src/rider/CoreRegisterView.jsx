import React, { useState } from 'react';
import './CoreRegisterView.css';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  CheckCircle,
  Sparkles,
  AlertTriangle,
  Eye,
  EyeOff,
  ShieldCheck,
  Crown,
  Loader2
} from 'lucide-react';

export function CoreRegisterView({ onGoToLogin }) {
  const { login } = useAuth();
  const initialInviteCode = (() => {
    try {
      return new URLSearchParams(window.location.search).get('code') || '';
    } catch (_) {
      return '';
    }
  })();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'MALE',
    inviteCode: initialInviteCode,
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const name = formData.name.trim().toUpperCase();
    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim().replace(/\D/g, '');

    if (!name || !email || !phone || !formData.password) {
      setErrorMsg('PLEASE FILL IN ALL REQUIRED FIELDS (NAME, EMAIL, PHONE, PASSWORD).');
      return;
    }

    if (name.length < 2) {
      setErrorMsg('FULL NAME MUST BE AT LEAST 2 CHARACTERS.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('PLEASE ENTER A VALID EMAIL ADDRESS.');
      return;
    }

    if (phone.length !== 10) {
      setErrorMsg('PLEASE ENTER A VALID 10-DIGIT MOBILE NUMBER (STARTING WITH 6-9).');
      return;
    }

    if (
      formData.password.length < 8 ||
      !/[A-Z]/.test(formData.password) ||
      !/[0-9]/.test(formData.password) ||
      !/[^A-Za-z0-9]/.test(formData.password)
    ) {
      setErrorMsg('PASSWORD MUST BE AT LEAST 8 CHARACTERS WITH AN UPPERCASE LETTER, NUMBER, AND SPECIAL CHARACTER.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('PASSWORDS DO NOT MATCH.');
      return;
    }

    if (!formData.inviteCode.trim()) {
      setErrorMsg('CORE TEAM INVITATION CODE IS REQUIRED.');
      return;
    }

    try {
      setLoading(true);
      await apiRequest('/auth/register-core', 'POST', {
        name,
        email,
        phone,
        gender: formData.gender,
        password: formData.password,
        inviteCode: formData.inviteCode.trim()
      });

      setSuccessMsg('Welcome to Papido Core Team! Signing you in...');

      try {
        await login(email, formData.password, 'RIDER');
        window.location.replace('/driver/radar');
      } catch (_) {
        setTimeout(() => {
          if (onGoToLogin) onGoToLogin();
          else window.location.pathname = '/login';
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register core member account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cr-page">
      {/* Ambient orbs */}
      <div className="cr-bg" aria-hidden="true">
        <span className="cr-orb cr-orb--a" />
        <span className="cr-orb cr-orb--b" />
        <span className="cr-orb cr-orb--c" />
      </div>

      <div className="cr-card cr-card-in">
        {/* Core Member Badge */}
        <div className="cr-badge">
          <Sparkles size={14} /> PAPIDO CORE TEAM ONBOARDING
        </div>

        <h1 className="cr-title">Core Member Registration</h1>
        <p className="cr-desc">
          As a Papido Core Team member, your account is <strong>pre-approved with core team privileges</strong>.
          No vehicle RC or document uploads required.
        </p>

        {/* Privilege cards */}
        <div className="cr-privileges">
          <div className="cr-privilege">
            <div className="cr-privilege-icon">
              <Crown size={16} />
            </div>
            <div>
              <div className="cr-privilege-title">Pre-Approved Driver</div>
              <div className="cr-privilege-sub">Skip KYC friction</div>
            </div>
          </div>
          <div className="cr-privilege">
            <div className="cr-privilege-icon">
              <ShieldCheck size={16} />
            </div>
            <div>
              <div className="cr-privilege-title">Shift Controller</div>
              <div className="cr-privilege-sub">Assign fleet shifts</div>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="cr-alert cr-alert--error cr-shake">
            <AlertTriangle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="cr-alert cr-alert--success cr-slide-down">
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="cr-form">
          <div className="cr-field">
            <label htmlFor="cr-name" className="cr-label">FULL NAME *</label>
            <div className="cr-input-wrap">
              <User size={16} className="cr-input-icon" />
              <input
                id="cr-name"
                type="text"
                required
                placeholder="E.G. SANAULLA KHAN"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                className="cr-input"
              />
            </div>
          </div>

          <div className="cr-grid-2">
            <div className="cr-field">
              <label htmlFor="cr-phone" className="cr-label">PHONE NUMBER *</label>
              <div className="cr-input-wrap">
                <Phone size={16} className="cr-input-icon" />
                <input
                  id="cr-phone"
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="cr-input cr-input--mono"
                />
              </div>
            </div>

            <div className="cr-field">
              <label htmlFor="cr-gender" className="cr-label">Gender</label>
              <select
                id="cr-gender"
                aria-label="Gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="cr-input cr-input--select"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="cr-field">
            <label htmlFor="cr-email" className="cr-label">Email Address *</label>
            <div className="cr-input-wrap">
              <Mail size={16} className="cr-input-icon" />
              <input
                id="cr-email"
                type="email"
                required
                placeholder="name@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="cr-input"
              />
            </div>
          </div>

          {!initialInviteCode && (
            <div className="cr-field">
              <label htmlFor="cr-invite-code" className="cr-label">Core Invite Code *</label>
              <div className="cr-input-wrap">
                <ShieldCheck size={16} className="cr-input-icon" />
                <input
                  id="cr-invite-code"
                  type="text"
                  required
                  placeholder="Enter admin invite code"
                  value={formData.inviteCode}
                  onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                  className="cr-input"
                />
              </div>
            </div>
          )}

          <div className="cr-grid-2">
            <div className="cr-field">
              <label htmlFor="cr-password" className="cr-label">Password *</label>
              <div className="cr-input-wrap">
                <Lock size={16} className="cr-input-icon" />
                <input
                  id="cr-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min 8 chars"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="cr-input cr-input--with-trail"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="cr-input-trail"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="cr-field">
              <label htmlFor="cr-confirm-password" className="cr-label">Confirm Password *</label>
              <div className="cr-input-wrap">
                <Lock size={16} className="cr-input-icon" />
                <input
                  id="cr-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="cr-input cr-input--with-trail"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="cr-input-trail"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cr-submit cr-ripple"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="cr-spin" />
                <span>Activating Core Profile...</span>
              </>
            ) : (
              <>
                <span>Complete Core Member Registration</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="cr-bottom">
          <span>Already have an account?</span>
          <button
            type="button"
            onClick={() => {
              if (onGoToLogin) onGoToLogin();
              else window.location.pathname = '/login';
            }}
            className="cr-signin-btn"
          >
            Sign In Here
          </button>
        </div>
      </div>
    </div>
  );
}
export default CoreRegisterView;
