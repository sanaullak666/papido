import React, { useState } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, ArrowRight, CheckCircle, Sparkles, AlertTriangle, Eye, EyeOff } from 'lucide-react';

export function CoreRegisterView({ onGoToLogin }) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'MALE',
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

    if (formData.password.length < 6) {
      setErrorMsg('PASSWORD MUST BE AT LEAST 6 CHARACTERS LONG.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('PASSWORDS DO NOT MATCH.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiRequest('/auth/register-core', 'POST', {
        name,
        email,
        phone,
        gender: formData.gender,
        password: formData.password
      });

      setSuccessMsg('Welcome to Papido Core Team! Logging you in...');
      
      // Auto login with returned credentials
      if (res.data?.tokens?.accessToken && res.data?.user) {
        setTimeout(() => {
          login(res.data.user, res.data.tokens.accessToken);
          window.location.pathname = '/';
        }, 1200);
      } else {
        setTimeout(() => {
          if (onGoToLogin) onGoToLogin();
          else window.location.pathname = '/login';
        }, 1500);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register core member account.');
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
      background: 'radial-gradient(circle at 50% 20%, #2A1D13 0%, #15100B 100%)',
      padding: 'clamp(16px, 4vw, 32px)',
      color: '#FFFFFF'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: '#1F1812',
        border: '1px solid #3D2D1E',
        borderRadius: '20px',
        padding: 'clamp(24px, 4vw, 36px)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        position: 'relative'
      }}>
        {/* Core Member Golden Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))',
          border: '1px solid #F59E0B',
          color: '#FBBF24',
          padding: '5px 12px',
          borderRadius: '30px',
          fontSize: '11.5px',
          fontWeight: 800,
          marginBottom: '16px'
        }}>
          <Sparkles size={14} /> PAPIDO CORE TEAM ONBOARDING
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px', color: '#FFFFFF' }}>
          Core Member Registration
        </h1>
        <p style={{ fontSize: '13px', color: '#A8998A', lineHeight: 1.5, marginBottom: '22px' }}>
          As a Papido Core Team member, your account is <strong>pre-approved with core driver privileges</strong>. Zero document upload required.
        </p>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #EF4444',
            color: '#FCA5A5',
            padding: '12px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={15} color="#EF4444" style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10B981',
            color: '#6EE7B7',
            padding: '14px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={18} color="#10B981" style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ color: '#D6C7B2', fontSize: '11.5px' }}>
              FULL NAME *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#796D61', pointerEvents: 'none' }} />
              <input
                type="text"
                required
                placeholder="E.G. SANAULLA KHAN"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: '#2B2016',
                  border: '1px solid #433323',
                  borderRadius: '10px',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  minHeight: '44px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#D6C7B2', fontSize: '11.5px' }}>
                PHONE NUMBER *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#796D61', pointerEvents: 'none' }} />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: '#2B2016',
                    border: '1px solid #433323',
                    borderRadius: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                    letterSpacing: '1px',
                    fontWeight: 600,
                    minHeight: '44px'
                  }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#D6C7B2', fontSize: '11.5px' }}>
                GENDER
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#2B2016',
                  border: '1px solid #433323',
                  borderRadius: '10px',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none',
                  minHeight: '44px'
                }}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ color: '#D6C7B2', fontSize: '11.5px' }}>
              CAMPUS EMAIL ADDRESS *
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#796D61', pointerEvents: 'none' }} />
              <input
                type="email"
                required
                placeholder="name@pondiuni.ac.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: '#2B2016',
                  border: '1px solid #433323',
                  borderRadius: '10px',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none',
                  minHeight: '44px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#D6C7B2', fontSize: '11.5px' }}>
                PASSWORD *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#796D61', pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    background: '#2B2016',
                    border: '1px solid #433323',
                    borderRadius: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                    minHeight: '44px'
                  }}
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
                    color: '#A8998A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#D6C7B2', fontSize: '11.5px' }}>
                CONFIRM PASSWORD *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#796D61', pointerEvents: 'none' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    background: '#2B2016',
                    border: '1px solid #433323',
                    borderRadius: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                    minHeight: '44px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#A8998A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px'
                  }}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
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
            style={{
              marginTop: '10px',
              padding: '12px',
              minHeight: '46px',
              background: 'linear-gradient(135deg, #F59E0B, #EA580C)',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 900,
              fontSize: '14.5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 6px 20px rgba(245, 158, 11, 0.35)'
            }}
          >
            {loading ? 'Activating Core Profile...' : (
              <>
                <span>Complete Core Member Registration</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '22px', textAlign: 'center', fontSize: '13px', color: '#A8998A' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => {
              if (onGoToLogin) onGoToLogin();
              else window.location.pathname = '/login';
            }}
            style={{ background: 'transparent', border: 'none', color: '#FB923C', fontWeight: 800, cursor: 'pointer', padding: '4px' }}
          >
            Sign In Here
          </button>
        </div>
      </div>
    </div>
  );
}

export default CoreRegisterView;
