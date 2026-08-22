import React, { useState } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.password) {
      setErrorMsg('Please fill in all required fields (Name, Email, Phone, Password).');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiRequest('/auth/register-core', 'POST', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        password: formData.password
      });

      setSuccessMsg('🎉 Welcome to Papido Core Team! Logging you in as an Approved Driver...');
      
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
      padding: '24px',
      color: '#FFFFFF'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: '#1F1812',
        border: '1px solid #3D2D1E',
        borderRadius: '20px',
        padding: '32px',
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
          padding: '6px 12px',
          borderRadius: '30px',
          fontSize: '12px',
          fontWeight: 800,
          marginBottom: '16px'
        }}>
          <Sparkles size={14} /> PAPIDO CORE TEAM ONBOARDING
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px', color: '#FFFFFF' }}>
          Core Member Driver Registration
        </h1>
        <p style={{ fontSize: '13px', color: '#A8998A', lineHeight: 1.5, marginBottom: '24px' }}>
          As a Papido Core Team organizer, your driver account is <strong>pre-approved with campus fleet privileges</strong>. No vehicle RC or document uploads required.
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
            marginBottom: '18px'
          }}>
            ⚠️ {errorMsg}
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
            <CheckCircle size={18} color="#10B981" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D6C7B2', marginBottom: '6px' }}>
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#796D61' }} />
              <input
                type="text"
                required
                placeholder="e.g. Sanaulla Khan"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  background: '#2B2016',
                  border: '1px solid #433323',
                  borderRadius: '10px',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D6C7B2', marginBottom: '6px' }}>
                Phone Number *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#796D61' }} />
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 38px',
                    background: '#2B2016',
                    border: '1px solid #433323',
                    borderRadius: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D6C7B2', marginBottom: '6px' }}>
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                style={{
                  width: '100%',
                  padding: '11px 12px',
                  background: '#2B2016',
                  border: '1px solid #433323',
                  borderRadius: '10px',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female (Lady Driver)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D6C7B2', marginBottom: '6px' }}>
              Email Address *
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#796D61' }} />
              <input
                type="email"
                required
                placeholder="name@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  background: '#2B2016',
                  border: '1px solid #433323',
                  borderRadius: '10px',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D6C7B2', marginBottom: '6px' }}>
                Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#796D61' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 38px',
                    background: '#2B2016',
                    border: '1px solid #433323',
                    borderRadius: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D6C7B2', marginBottom: '6px' }}>
                Confirm Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#796D61' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 38px',
                    background: '#2B2016',
                    border: '1px solid #433323',
                    borderRadius: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '12px',
              padding: '14px',
              background: 'linear-gradient(135deg, #F59E0B, #EA580C)',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 900,
              fontSize: '15px',
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
                <span>Complete Core Registration & Start Driving</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#A8998A' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => {
              if (onGoToLogin) onGoToLogin();
              else window.location.pathname = '/login';
            }}
            style={{ background: 'transparent', border: 'none', color: '#FB923C', fontWeight: 800, cursor: 'pointer' }}
          >
            Sign In Here
          </button>
        </div>
      </div>
    </div>
  );
}
