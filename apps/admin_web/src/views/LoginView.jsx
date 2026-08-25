import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, uploadFile } from '../api';
import { Shield, Lock, Mail, ArrowRight, UserPlus, KeyRound, Bike, User, Sparkles, ShieldCheck, Zap, Upload, FileText, CheckCircle2, AlertCircle, Check } from 'lucide-react';

export function LoginView({ onGoToAdminPortal }) {
  const { login, register, forgotPassword, resetPassword } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'forgot'

  // Login State
  const [email, setEmail] = useState('customer.ananya@papido.com');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Register State
  const [regRole, setRegRole] = useState('CUSTOMER'); // 'CUSTOMER' or 'RIDER'
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regVehicleType, setRegVehicleType] = useState('BIKE'); // 'BIKE' or 'SCOOTER'
  const [regVehicleModel, setRegVehicleModel] = useState('');
  const [regVehicleNumber, setRegVehicleNumber] = useState('');
  const [regLicenseNumber, setRegLicenseNumber] = useState('');
  const [regCollegeIdNumber, setRegCollegeIdNumber] = useState('');

  // Rider KYC Document Files (Max 150 KB, PDF / JPG / PNG)
  const MAX_DOC_SIZE_BYTES = 150 * 1024; // 150 KB limit
  const [collegeIdFile, setCollegeIdFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [rcFile, setRcFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const validateDocFile = (file, docName) => {
    if (!file) return null;
    const fileName = (file.name || '').toLowerCase();
    const ext = fileName.slice(fileName.lastIndexOf('.'));
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

    if (!allowedMimeTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      return `${docName}: Invalid file format. Only PDF and JPG / PNG images are allowed.`;
    }

    if (file.size > MAX_DOC_SIZE_BYTES) {
      const sizeKb = (file.size / 1024).toFixed(1);
      return `${docName}: File size is ${sizeKb} KB. Maximum allowed size is 150 KB. Please compress or choose a smaller file.`;
    }

    return null;
  };

  const handleDocFileChange = (e, setFile, docName) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const validationError = validateDocFile(file, docName);
    if (validationError) {
      alert(validationError);
      setError(validationError);
      e.target.value = '';
      setFile(null);
      return;
    }

    setError('');
    setFile(file);
  };

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState(1); // 1 = enter email, 2 = enter OTP & new pass
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Field validation & uppercase states
  const [regFieldErrors, setRegFieldErrors] = useState({});
  const [regTouched, setRegTouched] = useState({});

  const validateRegField = (field, value, customRole = regRole) => {
    let err = '';
    if (field === 'name') {
      const val = (value || '').trim();
      if (!val) err = 'FULL NAME IS REQUIRED.';
      else if (val.length < 2) err = 'FULL NAME MUST BE AT LEAST 2 CHARACTERS.';
      else if (!/^[A-Z\s.]+$/i.test(val)) err = 'FULL NAME CAN ONLY CONTAIN LETTERS, SPACES AND DOTS.';
    } else if (field === 'email') {
      const val = (value || '').trim();
      if (!val) err = 'CAMPUS EMAIL IS REQUIRED.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) err = 'PLEASE ENTER A VALID EMAIL ADDRESS (E.G. NAME@PONDIUNI.AC.IN).';
    } else if (field === 'phone') {
      const val = (value || '').trim();
      if (!val) err = 'PHONE NUMBER IS REQUIRED.';
      else if (!/^[6-9]\d{9}$/.test(val)) err = 'PLEASE ENTER A VALID 10-DIGIT MOBILE NUMBER (STARTING WITH 6, 7, 8, OR 9).';
    } else if (field === 'gender') {
      if (!value) err = 'PLEASE SELECT YOUR GENDER (MALE OR FEMALE).';
    } else if (field === 'password') {
      if (!value) err = 'PASSWORD IS REQUIRED.';
      else if (value.length < 6) err = 'PASSWORD MUST BE AT LEAST 6 CHARACTERS LONG.';
    } else if (field === 'vehicleModel') {
      if (customRole === 'RIDER') {
        const val = (value || '').trim();
        if (!val) err = 'VEHICLE MODEL IS REQUIRED (E.G. HONDA ACTIVA 6G / SPLENDOR).';
        else if (val.length < 2) err = 'VEHICLE MODEL MUST BE AT LEAST 2 CHARACTERS.';
      }
    }
    return err;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setUploadStatus('');

    // Trigger validation on all fields
    const errors = {
      name: validateRegField('name', regName),
      email: validateRegField('email', regEmail),
      phone: validateRegField('phone', regPhone),
      gender: validateRegField('gender', regGender),
      password: validateRegField('password', regPassword),
      vehicleModel: regRole === 'RIDER' ? validateRegField('vehicleModel', regVehicleModel) : ''
    };

    setRegTouched({ name: true, email: true, phone: true, gender: true, password: true, vehicleModel: true });
    setRegFieldErrors(errors);

    const firstError = Object.values(errors).find(Boolean);
    if (firstError) {
      setError(firstError);
      return;
    }

    if (regRole === 'RIDER') {
      if (!regVehicleModel.trim()) {
        setError('PLEASE ENTER YOUR VEHICLE MODEL (E.G. HONDA ACTIVA 6G / HERO SPLENDOR).');
        return;
      }
      if (!collegeIdFile) {
        setError('PLEASE UPLOAD YOUR CAMPUS / COLLEGE ID CARD (PDF OR JPG, MAX 150 KB).');
        return;
      }
      const cidErr = validateDocFile(collegeIdFile, 'Campus ID Card');
      if (cidErr) {
        setError(cidErr);
        return;
      }

      if (!licenseFile) {
        setError('PLEASE UPLOAD YOUR DRIVING LICENCE (DL) (PDF OR JPG, MAX 150 KB).');
        return;
      }
      const dlErr = validateDocFile(licenseFile, 'Driving Licence');
      if (dlErr) {
        setError(dlErr);
        return;
      }

      if (!rcFile) {
        setError('PLEASE UPLOAD YOUR VEHICLE RC DOCUMENT (PDF OR JPG, MAX 150 KB).');
        return;
      }
      const rcErr = validateDocFile(rcFile, 'Vehicle RC Document');
      if (rcErr) {
        setError(rcErr);
        return;
      }
    }

    setLoading(true);
    try {
      let collegeIdDocUrl = null;
      let licenseDocUrl = null;
      let rcDocUrl = null;

      if (regRole === 'RIDER') {
        setUploadStatus('1/3 UPLOADING CAMPUS ID CARD (MAX 150 KB)...');
        const cidRes = await uploadFile(collegeIdFile, null, 150);
        collegeIdDocUrl = cidRes.url || cidRes.relativePath;

        setUploadStatus('2/3 UPLOADING DRIVING LICENCE (MAX 150 KB)...');
        const dlRes = await uploadFile(licenseFile, null, 150);
        licenseDocUrl = dlRes.url || dlRes.relativePath;

        setUploadStatus('3/3 UPLOADING VEHICLE RC DOCUMENT (MAX 150 KB)...');
        const rcRes = await uploadFile(rcFile, null, 150);
        rcDocUrl = rcRes.url || rcRes.relativePath;

        setUploadStatus('SUBMITTING DRIVER REGISTRATION...');
      }

      await register({
        name: regName.trim().toUpperCase(),
        email: regEmail.trim().toLowerCase(),
        phone: regPhone.trim(),
        gender: regGender,
        password: regPassword,
        role: regRole,
        vehicleType: regRole === 'RIDER' ? regVehicleType : undefined,
        vehicleModel: regRole === 'RIDER' ? regVehicleModel.trim().toUpperCase() : undefined,
        vehicleNumber: regRole === 'RIDER' ? (regVehicleNumber.trim().toUpperCase() || undefined) : undefined,
        licenseNumber: regRole === 'RIDER' ? (regLicenseNumber.trim().toUpperCase() || undefined) : undefined,
        collegeIdNumber: regRole === 'RIDER' ? (regCollegeIdNumber.trim().toUpperCase() || undefined) : undefined,
        collegeIdDocUrl: regRole === 'RIDER' ? collegeIdDocUrl : undefined,
        licenseDocUrl: regRole === 'RIDER' ? licenseDocUrl : undefined,
        rcDocUrl: regRole === 'RIDER' ? rcDocUrl : undefined
      });
      setSuccessMsg('ACCOUNT REGISTERED SUCCESSFULLY! LOGGING YOU IN...');
    } catch (err) {
      setError(err.message || 'REGISTRATION FAILED.');
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  };

  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setError('');
    setLoading(true);
    try {
      await forgotPassword(forgotEmail.trim());
      setForgotStep(2);
      setSuccessMsg(`A 6-digit OTP code has been sent to ${forgotEmail}. Please check your email.`);
    } catch (err) {
      setError(err.message || 'Failed to send OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (forgotNewPass.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(forgotEmail.trim(), forgotOtp.trim(), forgotNewPass);
      setSuccessMsg('Password has been reset successfully! Please sign in with your new password.');
      setEmail(forgotEmail);
      setPassword(forgotNewPass);
      setAuthMode('login');
      setForgotStep(1);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Check OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (uEmail, uPass) => {
    setEmail(uEmail);
    setPassword(uPass);
    setAuthMode('login');
    setError('');
  };

  return (
    <div className="theme-orange-beige" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #F5EFEB, #FAF5EE)',
      padding: '24px 16px',
      color: '#271E16'
    }}>
      <div className="auth-card-container" style={{
        background: '#FFFFFF',
        border: '1.5px solid #E8DCCB',
        borderRadius: '20px',
        padding: '36px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 16px 40px rgba(234, 88, 12, 0.08), 0 4px 12px rgba(0,0,0,0.03)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/papidologo.jpeg"
            alt="Papido Logo"
            style={{
              width: '84px',
              height: '84px',
              objectFit: 'contain',
              borderRadius: '20px',
              margin: '0 auto 12px',
              boxShadow: '0 8px 24px rgba(234, 88, 12, 0.25)',
              border: '2px solid #E8DCCB',
              background: '#FFFFFF',
              padding: '4px',
              display: 'block'
            }}
          />
          <h1 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.02em', color: '#271E16' }}>PAPIDO</h1>
          <p style={{ fontSize: '13px', color: '#796D61', marginTop: '4px' }}>
            Pondicherry University Campus Mobility Platform
          </p>
        </div>

        {/* Auth Mode Tabs (Sign In / Register) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: '#F3ECE2',
          border: '1px solid #E8DCCB',
          padding: '4px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setError(''); setSuccessMsg(''); }}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: authMode === 'login' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: authMode === 'login' ? '#FFFFFF' : '#796D61',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: authMode === 'login' ? '0 2px 8px rgba(234, 88, 12, 0.3)' : 'none'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setError(''); setSuccessMsg(''); }}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: authMode === 'register' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: authMode === 'register' ? '#FFFFFF' : '#796D61',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: authMode === 'register' ? '0 2px 8px rgba(234, 88, 12, 0.3)' : 'none'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Alert Banners */}
        {error && (
          <div style={{
            padding: '12px 14px',
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            color: '#B91C1C',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '12px 14px',
            background: '#D1FAE5',
            border: '1px solid #6EE7B7',
            borderRadius: '8px',
            color: '#047857',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {successMsg}
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 1: SIGN IN */}
        {/* ============================================================ */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ color: '#271E16', fontWeight: 700 }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#A39587' }} />
                <input
                  type="email"
                  required
                  className="form-input"
                  style={{ paddingLeft: '38px', width: '100%', background: '#F8F3EC', border: '1.5px solid #E8DCCB', color: '#271E16' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@papido.com"
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0, color: '#271E16', fontWeight: 700 }}>Password</label>
                <button
                  type="button"
                  onClick={() => { setAuthMode('forgot'); setForgotEmail(email); setError(''); setSuccessMsg(''); }}
                  style={{ background: 'none', border: 'none', color: '#EA580C', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#A39587' }} />
                <input
                  type="password"
                  required
                  className="form-input"
                  style={{ paddingLeft: '38px', width: '100%', background: '#F8F3EC', border: '1.5px solid #E8DCCB', color: '#271E16' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '12px', fontWeight: 800, fontSize: '14px', background: 'linear-gradient(135deg, #F97316, #EA580C)', color: '#FFFFFF', border: 'none', borderRadius: '10px', boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)', cursor: 'pointer' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : (
                <>
                  Sign In to Account <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: REGISTER (PASSENGER / DRIVER) */}
        {/* ============================================================ */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ color: '#271E16', fontWeight: 700 }}>I want to join as:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRegRole('CUSTOMER')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: regRole === 'CUSTOMER' ? '2px solid #F97316' : '1.5px solid #E8DCCB',
                    background: regRole === 'CUSTOMER' ? '#FFFFFF' : '#F8F3EC',
                    color: regRole === 'CUSTOMER' ? '#EA580C' : '#796D61',
                    boxShadow: regRole === 'CUSTOMER' ? '0 2px 8px rgba(249, 115, 22, 0.2)' : 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <User size={16} /> Passenger
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole('RIDER')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: regRole === 'RIDER' ? '2px solid #F97316' : '1.5px solid #E8DCCB',
                    background: regRole === 'RIDER' ? '#FFFFFF' : '#F8F3EC',
                    color: regRole === 'RIDER' ? '#EA580C' : '#796D61',
                    boxShadow: regRole === 'RIDER' ? '0 2px 8px rgba(249, 115, 22, 0.2)' : 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Bike size={16} /> Rider (Driver)
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#271E16', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>FULL NAME <span style={{ color: '#EA580C' }}>*</span></span>
                {regTouched.name && !regFieldErrors.name && regName.trim() && (
                  <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Check size={12} /> VALID
                  </span>
                )}
              </label>
              <input
                type="text"
                required
                className="form-input"
                style={{
                  background: '#F8F3EC',
                  border: regTouched.name && regFieldErrors.name ? '1.5px solid #EF4444' : (regTouched.name && regName.trim() ? '1.5px solid #10B981' : '1.5px solid #E8DCCB'),
                  color: '#271E16',
                  textTransform: 'uppercase',
                  fontWeight: 600
                }}
                placeholder="ANANYA SEN"
                value={regName}
                onChange={(e) => {
                  const upper = e.target.value.toUpperCase();
                  setRegName(upper);
                  if (regTouched.name) {
                    setRegFieldErrors(prev => ({ ...prev, name: validateRegField('name', upper) }));
                  }
                }}
                onBlur={() => {
                  setRegTouched(prev => ({ ...prev, name: true }));
                  setRegFieldErrors(prev => ({ ...prev, name: validateRegField('name', regName) }));
                }}
              />
              {regTouched.name && regFieldErrors.name && (
                <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> {regFieldErrors.name}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#271E16', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>CAMPUS EMAIL <span style={{ color: '#EA580C' }}>*</span></span>
                {regTouched.email && !regFieldErrors.email && regEmail.trim() && (
                  <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Check size={12} /> VALID
                  </span>
                )}
              </label>
              <input
                type="email"
                required
                className="form-input"
                style={{
                  background: '#F8F3EC',
                  border: regTouched.email && regFieldErrors.email ? '1.5px solid #EF4444' : (regTouched.email && regEmail.trim() ? '1.5px solid #10B981' : '1.5px solid #E8DCCB'),
                  color: '#271E16'
                }}
                placeholder="student@pondiuni.ac.in"
                value={regEmail}
                onChange={(e) => {
                  const val = e.target.value;
                  setRegEmail(val);
                  if (regTouched.email) {
                    setRegFieldErrors(prev => ({ ...prev, email: validateRegField('email', val) }));
                  }
                }}
                onBlur={() => {
                  setRegTouched(prev => ({ ...prev, email: true }));
                  setRegFieldErrors(prev => ({ ...prev, email: validateRegField('email', regEmail) }));
                }}
              />
              {regTouched.email && regFieldErrors.email && (
                <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> {regFieldErrors.email}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#271E16', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>PHONE NUMBER (10 DIGITS) <span style={{ color: '#EA580C' }}>*</span></span>
                {regTouched.phone && !regFieldErrors.phone && regPhone.trim().length === 10 && (
                  <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Check size={12} /> VALID
                  </span>
                )}
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                className="form-input"
                style={{
                  background: '#F8F3EC',
                  border: regTouched.phone && regFieldErrors.phone ? '1.5px solid #EF4444' : (regTouched.phone && regPhone.trim().length === 10 ? '1.5px solid #10B981' : '1.5px solid #E8DCCB'),
                  color: '#271E16',
                  letterSpacing: '1px',
                  fontWeight: 600
                }}
                placeholder="9876543210"
                value={regPhone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setRegPhone(digits);
                  if (regTouched.phone) {
                    setRegFieldErrors(prev => ({ ...prev, phone: validateRegField('phone', digits) }));
                  }
                }}
                onBlur={() => {
                  setRegTouched(prev => ({ ...prev, phone: true }));
                  setRegFieldErrors(prev => ({ ...prev, phone: validateRegField('phone', regPhone) }));
                }}
              />
              {regTouched.phone && regFieldErrors.phone && (
                <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> {regFieldErrors.phone}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#271E16', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>GENDER <span style={{ color: '#EA580C' }}>*</span></span>
                {regGender && (
                  <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Check size={12} /> {regGender} SELECTED
                  </span>
                )}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setRegGender('MALE');
                    setRegTouched(prev => ({ ...prev, gender: true }));
                    setRegFieldErrors(prev => ({ ...prev, gender: '' }));
                  }}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '8px',
                    border: regGender === 'MALE' ? '2px solid #F97316' : (regTouched.gender && regFieldErrors.gender ? '1.5px solid #EF4444' : '1.5px solid #E8DCCB'),
                    background: regGender === 'MALE' ? '#FFFFFF' : '#F8F3EC',
                    color: regGender === 'MALE' ? '#EA580C' : '#796D61',
                    boxShadow: regGender === 'MALE' ? '0 2px 8px rgba(249, 115, 22, 0.2)' : 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <User size={16} /> MALE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegGender('FEMALE');
                    setRegTouched(prev => ({ ...prev, gender: true }));
                    setRegFieldErrors(prev => ({ ...prev, gender: '' }));
                  }}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '8px',
                    border: regGender === 'FEMALE' ? '2px solid #EC4899' : (regTouched.gender && regFieldErrors.gender ? '1.5px solid #EF4444' : '1.5px solid #E8DCCB'),
                    background: regGender === 'FEMALE' ? '#FFFFFF' : '#F8F3EC',
                    color: regGender === 'FEMALE' ? '#BE185D' : '#796D61',
                    boxShadow: regGender === 'FEMALE' ? '0 2px 8px rgba(236, 72, 153, 0.2)' : 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <ShieldCheck size={16} /> FEMALE
                </button>
              </div>
              {regTouched.gender && regFieldErrors.gender && (
                <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> {regFieldErrors.gender}
                </div>
              )}
            </div>

            {/* Rider Specific Mandatory Verification Details */}
            {regRole === 'RIDER' && (
              <div style={{ background: '#F8F3EC', padding: '16px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1.5px solid #E8DCCB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#EA580C' }}>
                  <ShieldCheck size={16} /> MANDATORY DRIVER VEHICLE & DOCUMENTS
                </div>
                <div style={{ fontSize: '11px', color: '#796D61', marginTop: '-8px' }}>
                  TYPE YOUR VEHICLE MODEL IN CAPITAL AND UPLOAD 3 MANDATORY DOCUMENTS (MAX 150 KB EACH, PDF / JPG).
                </div>

                {/* Vehicle Type & Model */}
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #E8DCCB', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#271E16', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>VEHICLE TYPE & MODEL <span style={{ color: '#EA580C' }}>*</span></span>
                    {regTouched.vehicleModel && !regFieldErrors.vehicleModel && regVehicleModel.trim() && (
                      <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Check size={12} /> VALID
                      </span>
                    )}
                  </label>
                  
                  {/* Two-Wheeler Type */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setRegVehicleType('BIKE')}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: regVehicleType === 'BIKE' ? '2px solid #F97316' : '1px solid #E8DCCB',
                        background: regVehicleType === 'BIKE' ? '#FFF7ED' : '#F8F3EC',
                        color: regVehicleType === 'BIKE' ? '#EA580C' : '#796D61',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 700,
                        fontSize: '12px'
                      }}
                    >
                      <Bike size={14} /> MOTORCYCLE (BIKE)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegVehicleType('SCOOTER')}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: regVehicleType === 'SCOOTER' ? '2px solid #F97316' : '1px solid #E8DCCB',
                        background: regVehicleType === 'SCOOTER' ? '#FFF7ED' : '#F8F3EC',
                        color: regVehicleType === 'SCOOTER' ? '#EA580C' : '#796D61',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 700,
                        fontSize: '12px'
                      }}
                    >
                      <Zap size={14} /> SCOOTER / SCOOTY
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    className="form-input"
                    style={{
                      background: '#F8F3EC',
                      border: regTouched.vehicleModel && regFieldErrors.vehicleModel ? '1.5px solid #EF4444' : (regTouched.vehicleModel && regVehicleModel.trim() ? '1.5px solid #10B981' : '1.5px solid #E8DCCB'),
                      color: '#271E16',
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      fontWeight: 600
                    }}
                    placeholder="E.G. HONDA ACTIVA 6G / HERO SPLENDOR / TVS NTORQ"
                    value={regVehicleModel}
                    onChange={(e) => {
                      const upper = e.target.value.toUpperCase();
                      setRegVehicleModel(upper);
                      if (regTouched.vehicleModel) {
                        setRegFieldErrors(prev => ({ ...prev, vehicleModel: validateRegField('vehicleModel', upper) }));
                      }
                    }}
                    onBlur={() => {
                      setRegTouched(prev => ({ ...prev, vehicleModel: true }));
                      setRegFieldErrors(prev => ({ ...prev, vehicleModel: validateRegField('vehicleModel', regVehicleModel) }));
                    }}
                  />
                  {regTouched.vehicleModel && regFieldErrors.vehicleModel && (
                    <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} /> {regFieldErrors.vehicleModel}
                    </div>
                  )}
                </div>

                {/* 1. College / Campus ID Upload */}
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #E8DCCB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#271E16', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>1. CAMPUS / COLLEGE ID CARD <span style={{ color: '#EA580C' }}>*</span></span>
                    {collegeIdFile ? (
                      <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> {(collegeIdFile.size / 1024).toFixed(1)} KB (READY)
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700 }}>
                        MAX: 150 KB (PDF / JPG)
                      </span>
                    )}
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: collegeIdFile ? '1.5px solid #10B981' : '1.5px dashed #EA580C',
                    background: collegeIdFile ? '#ECFDF5' : '#FFF7ED',
                    color: collegeIdFile ? '#047857' : '#EA580C',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    <Upload size={14} />
                    <span>{collegeIdFile ? collegeIdFile.name.toUpperCase() : 'UPLOAD CAMPUS ID CARD (PDF OR JPG, ≤ 150 KB)'}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      required
                      style={{ display: 'none' }}
                      onChange={(e) => handleDocFileChange(e, setCollegeIdFile, 'Campus ID Card')}
                    />
                  </label>
                </div>

                {/* 2. Driving Licence Upload */}
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #E8DCCB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#271E16', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>2. DRIVING LICENCE (DL) <span style={{ color: '#EA580C' }}>*</span></span>
                    {licenseFile ? (
                      <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> {(licenseFile.size / 1024).toFixed(1)} KB (READY)
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700 }}>
                        MAX: 150 KB (PDF / JPG)
                      </span>
                    )}
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: licenseFile ? '1.5px solid #10B981' : '1.5px dashed #EA580C',
                    background: licenseFile ? '#ECFDF5' : '#FFF7ED',
                    color: licenseFile ? '#047857' : '#EA580C',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    <Upload size={14} />
                    <span>{licenseFile ? licenseFile.name.toUpperCase() : 'UPLOAD DRIVING LICENCE (PDF OR JPG, ≤ 150 KB)'}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      required
                      style={{ display: 'none' }}
                      onChange={(e) => handleDocFileChange(e, setLicenseFile, 'Driving Licence')}
                    />
                  </label>
                </div>

                {/* 3. Vehicle RC Document Upload */}
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #E8DCCB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#271E16', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>3. VEHICLE RC DOCUMENT <span style={{ color: '#EA580C' }}>*</span></span>
                    {rcFile ? (
                      <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> {(rcFile.size / 1024).toFixed(1)} KB (READY)
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700 }}>
                        MAX: 150 KB (PDF / JPG)
                      </span>
                    )}
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: rcFile ? '1.5px solid #10B981' : '1.5px dashed #EA580C',
                    background: rcFile ? '#ECFDF5' : '#FFF7ED',
                    color: rcFile ? '#047857' : '#EA580C',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    <Upload size={14} />
                    <span>{rcFile ? rcFile.name.toUpperCase() : 'UPLOAD VEHICLE RC CARD (PDF OR JPG, ≤ 150 KB)'}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      required
                      style={{ display: 'none' }}
                      onChange={(e) => handleDocFileChange(e, setRcFile, 'Vehicle RC Document')}
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ color: '#271E16', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>PASSWORD (MIN 6 CHARS) <span style={{ color: '#EA580C' }}>*</span></span>
                {regTouched.password && !regFieldErrors.password && regPassword && regPassword.length >= 6 && (
                  <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Check size={12} /> VALID
                  </span>
                )}
              </label>
              <input
                type="password"
                required
                className="form-input"
                style={{
                  background: '#F8F3EC',
                  border: regTouched.password && regFieldErrors.password ? '1.5px solid #EF4444' : (regTouched.password && regPassword && regPassword.length >= 6 ? '1.5px solid #10B981' : '1.5px solid #E8DCCB'),
                  color: '#271E16'
                }}
                placeholder="••••••••"
                value={regPassword}
                onChange={(e) => {
                  const val = e.target.value;
                  setRegPassword(val);
                  if (regTouched.password) {
                    setRegFieldErrors(prev => ({ ...prev, password: validateRegField('password', val) }));
                  }
                }}
                onBlur={() => {
                  setRegTouched(prev => ({ ...prev, password: true }));
                  setRegFieldErrors(prev => ({ ...prev, password: validateRegField('password', regPassword) }));
                }}
              />
              {regTouched.password && regFieldErrors.password && (
                <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> {regFieldErrors.password}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '12px', fontWeight: 800, fontSize: '14px', background: 'linear-gradient(135deg, #F97316, #EA580C)', color: '#FFFFFF', border: 'none', borderRadius: '10px', boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)', cursor: 'pointer' }}
              disabled={loading}
            >
              {loading ? (uploadStatus || 'PROCESSING REGISTRATION...') : (
                <>
                  CREATE ACCOUNT <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: FORGOT PASSWORD (EMAIL OTP) */}
        {/* ============================================================ */}
        {authMode === 'forgot' && (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#271E16' }}>
              <KeyRound size={20} color="#EA580C" /> Reset Account Password
            </h3>
            <p style={{ fontSize: '13px', color: '#796D61', marginBottom: '16px' }}>
              {forgotStep === 1
                ? 'Enter your registered email. We will send a 6-digit verification code.'
                : `Enter the 6-digit verification code sent to ${forgotEmail}.`}
            </p>

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#271E16', fontWeight: 700 }}>Registered Email</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    style={{ background: '#F8F3EC', border: '1.5px solid #E8DCCB', color: '#271E16' }}
                    placeholder="name@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="btn btn-secondary"
                    style={{ flex: 1, background: '#F3ECE2', border: '1px solid #E8DCCB', color: '#796D61' }}
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ flex: 1, fontWeight: 700, background: 'linear-gradient(135deg, #F97316, #EA580C)', color: '#FFFFFF' }}
                  >
                    {loading ? 'Sending...' : 'Send OTP Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#271E16', fontWeight: 700 }}>6-Digit Email OTP</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="form-input"
                    style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '6px', fontWeight: 900, background: '#F8F3EC', border: '1.5px solid #E8DCCB', color: '#271E16' }}
                    placeholder="123456"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#271E16', fontWeight: 700 }}>New Password (min 6 chars)</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    style={{ background: '#F8F3EC', border: '1.5px solid #E8DCCB', color: '#271E16' }}
                    placeholder="••••••••"
                    value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#271E16', fontWeight: 700 }}>Confirm New Password</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    style={{ background: '#F8F3EC', border: '1.5px solid #E8DCCB', color: '#271E16' }}
                    placeholder="••••••••"
                    value={forgotConfirmPass}
                    onChange={(e) => setForgotConfirmPass(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="btn btn-secondary"
                    style={{ flex: 1, background: '#F3ECE2', border: '1px solid #E8DCCB', color: '#796D61' }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ flex: 1, fontWeight: 700, background: 'linear-gradient(135deg, #F97316, #EA580C)', color: '#FFFFFF' }}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 1-Tap Quick Demo Account Switcher for Students & Drivers */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#F8F3EC',
          borderRadius: '12px',
          border: '1px solid #E8DCCB'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#EA580C', letterSpacing: '0.8px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} /> 1-TAP DEMO ACCOUNT TEST
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => quickFill('customer.ananya@papido.com', 'Password@123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', justifyContent: 'flex-start', padding: '8px 10px', border: '1px solid #FBCFE8', background: '#FFFFFF', color: '#BE185D', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ShieldCheck size={14} /> Passenger (Ananya)
            </button>

            <button
              type="button"
              onClick={() => quickFill('customer.rohan@papido.com', 'Password@123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', justifyContent: 'flex-start', padding: '8px 10px', border: '1px solid #E8DCCB', background: '#FFFFFF', color: '#271E16', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <User size={14} /> Passenger (Rohan)
            </button>

            <button
              type="button"
              onClick={() => quickFill('rider.rahul@papido.com', 'Password@123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', justifyContent: 'flex-start', padding: '8px 10px', border: '1px solid #E8DCCB', background: '#FFFFFF', color: '#271E16', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Bike size={14} /> Bike Driver (Rahul)
            </button>

            <button
              type="button"
              onClick={() => quickFill('sanaullak294@gmail.com', 'Password@123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', justifyContent: 'flex-start', padding: '8px 10px', border: '1px solid #E8DCCB', background: '#FFFFFF', color: '#271E16', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Zap size={14} /> Scooter Driver (Sanaulla)
            </button>

            <button
              type="button"
              onClick={() => quickFill('rider.priya@papido.com', 'Password@123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', justifyContent: 'flex-start', padding: '8px 10px', gridColumn: 'span 2', border: '1px solid #FBCFE8', background: '#FFF1F2', color: '#BE185D', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ShieldCheck size={14} /> Lady Driver (Priya)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
