import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, uploadFile } from '../api';
import { Shield, Lock, Mail, ArrowRight, UserPlus, KeyRound, Bike, User, Sparkles, ShieldCheck, Zap, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [regGender, setRegGender] = useState('FEMALE');
  const [regPassword, setRegPassword] = useState('');
  const [regVehicleType, setRegVehicleType] = useState('BIKE'); // 'BIKE' or 'SCOOTER'
  const [regVehicleModel, setRegVehicleModel] = useState('');
  const [regVehicleNumber, setRegVehicleNumber] = useState('');
  const [regLicenseNumber, setRegLicenseNumber] = useState('');
  const [regCollegeIdNumber, setRegCollegeIdNumber] = useState('');

  // Rider KYC Document Files
  const [collegeIdFile, setCollegeIdFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [rcFile, setRcFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setUploadStatus('');

    if (regRole === 'RIDER') {
      if (!regVehicleModel.trim()) {
        setError('Please enter your Vehicle Model (e.g. Honda Activa 6G / Splendor).');
        return;
      }
      if (!collegeIdFile) {
        setError('Please upload your Campus / College ID Card (Photo or PDF).');
        return;
      }
      if (!licenseFile) {
        setError('Please upload your Driving Licence (DL) (Photo or PDF).');
        return;
      }
      if (!rcFile) {
        setError('Please upload your Vehicle RC Document (Photo or PDF).');
        return;
      }
    }

    setLoading(true);
    try {
      let collegeIdDocUrl = null;
      let licenseDocUrl = null;
      let rcDocUrl = null;

      if (regRole === 'RIDER') {
        setUploadStatus('1/3 Uploading Campus ID Card...');
        const cidRes = await uploadFile(collegeIdFile);
        collegeIdDocUrl = cidRes.url || cidRes.relativePath;

        setUploadStatus('2/3 Uploading Driving Licence...');
        const dlRes = await uploadFile(licenseFile);
        licenseDocUrl = dlRes.url || dlRes.relativePath;

        setUploadStatus('3/3 Uploading Vehicle RC Document...');
        const rcRes = await uploadFile(rcFile);
        rcDocUrl = rcRes.url || rcRes.relativePath;

        setUploadStatus('Submitting Driver Registration...');
      }

      await register({
        name: regName,
        email: regEmail,
        phone: regPhone,
        gender: regGender,
        password: regPassword,
        role: regRole,
        vehicleType: regRole === 'RIDER' ? regVehicleType : undefined,
        vehicleModel: regRole === 'RIDER' ? regVehicleModel : undefined,
        vehicleNumber: regRole === 'RIDER' ? regVehicleNumber : undefined,
        licenseNumber: regRole === 'RIDER' ? regLicenseNumber : undefined,
        collegeIdNumber: regRole === 'RIDER' ? regCollegeIdNumber : undefined,
        collegeIdDocUrl: regRole === 'RIDER' ? collegeIdDocUrl : undefined,
        licenseDocUrl: regRole === 'RIDER' ? licenseDocUrl : undefined,
        rcDocUrl: regRole === 'RIDER' ? rcDocUrl : undefined
      });
      setSuccessMsg('Account registered successfully! Logging you in...');
    } catch (err) {
      setError(err.message || 'Registration failed.');
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
      setSuccessMsg('✅ Password has been reset successfully! Please sign in with your new password.');
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
              <label className="form-label" style={{ color: '#271E16', fontWeight: 700 }}>Full Name</label>
              <input
                type="text"
                required
                className="form-input"
                style={{ background: '#F8F3EC', border: '1.5px solid #E8DCCB', color: '#271E16' }}
                placeholder="Ananya Sen"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#271E16', fontWeight: 700 }}>Campus Email</label>
              <input
                type="email"
                required
                className="form-input"
                style={{ background: '#F8F3EC', border: '1.5px solid #E8DCCB', color: '#271E16' }}
                placeholder="student@pondiuni.ac.in"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#271E16', fontWeight: 700 }}>Phone Number</label>
              <input
                type="text"
                required
                className="form-input"
                style={{ background: '#F8F3EC', border: '1.5px solid #E8DCCB', color: '#271E16' }}
                placeholder="9876543210"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#271E16', fontWeight: 700 }}>Gender</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRegGender('MALE')}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '8px',
                    border: regGender === 'MALE' ? '2px solid #F97316' : '1.5px solid #E8DCCB',
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
                  <User size={16} /> Male
                </button>
                <button
                  type="button"
                  onClick={() => setRegGender('FEMALE')}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '8px',
                    border: regGender === 'FEMALE' ? '2px solid #EC4899' : '1.5px solid #E8DCCB',
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
                  <ShieldCheck size={16} /> Female (Lady)
                </button>
              </div>
            </div>

            {/* Rider Specific Mandatory Verification Details */}
            {regRole === 'RIDER' && (
              <div style={{ background: '#F8F3EC', padding: '16px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1.5px solid #E8DCCB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#EA580C' }}>
                  <ShieldCheck size={16} /> MANDATORY DRIVER VEHICLE & DOCUMENTS
                </div>
                <div style={{ fontSize: '11px', color: '#796D61', marginTop: '-8px' }}>
                  Type your vehicle model and upload clear photos or PDF copies of your 3 documents for Admin verification.
                </div>

                {/* Vehicle Type & Model */}
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #E8DCCB', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#271E16', margin: 0 }}>
                    Vehicle Type & Model <span style={{ color: '#EA580C' }}>*</span>
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
                      <Bike size={14} /> Motorcycle (Bike)
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
                      <Zap size={14} /> Scooter / Scooty
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    className="form-input"
                    style={{ background: '#F8F3EC', border: '1.5px solid #E8DCCB', color: '#271E16', fontSize: '13px' }}
                    placeholder="Type Vehicle Model (e.g. Honda Activa 6G / Splendor / Dio)"
                    value={regVehicleModel}
                    onChange={(e) => setRegVehicleModel(e.target.value)}
                  />
                </div>

                {/* 1. College / Campus ID Upload */}
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #E8DCCB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#271E16', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>1. Campus / College ID Card <span style={{ color: '#EA580C' }}>*</span></span>
                    {collegeIdFile && (
                      <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={12} /> Uploaded
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
                    <span>{collegeIdFile ? `✓ ${collegeIdFile.name}` : 'Upload Campus ID Card (Photo / PDF)'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      required
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setCollegeIdFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* 2. Driving Licence Upload */}
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #E8DCCB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#271E16', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>2. Driving Licence (DL) <span style={{ color: '#EA580C' }}>*</span></span>
                    {licenseFile && (
                      <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={12} /> Uploaded
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
                    <span>{licenseFile ? `✓ ${licenseFile.name}` : 'Upload Driving Licence (Photo / PDF)'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      required
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setLicenseFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* 3. Vehicle RC Document Upload */}
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #E8DCCB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#271E16', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>3. Vehicle RC Document <span style={{ color: '#EA580C' }}>*</span></span>
                    {rcFile && (
                      <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={12} /> Uploaded
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
                    <span>{rcFile ? `✓ ${rcFile.name}` : 'Upload Vehicle RC Card (Photo / PDF)'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      required
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setRcFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ color: '#271E16', fontWeight: 700 }}>Password (min 6 chars)</label>
              <input
                type="password"
                required
                className="form-input"
                style={{ background: '#F8F3EC', border: '1.5px solid #E8DCCB', color: '#271E16' }}
                placeholder="••••••••"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '12px', fontWeight: 800, fontSize: '14px', background: 'linear-gradient(135deg, #F97316, #EA580C)', color: '#FFFFFF', border: 'none', borderRadius: '10px', boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)', cursor: 'pointer' }}
              disabled={loading}
            >
              {loading ? (uploadStatus || 'Processing Registration...') : (
                <>
                  Create Account <ArrowRight size={16} />
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

        {/* Discrete Admin Link at bottom */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onGoToAdminPortal}
            style={{
              background: 'none',
              border: 'none',
              color: '#796D61',
              fontSize: '11px',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Lock size={12} /> Campus Administration Portal →
          </button>
        </div>
      </div>
    </div>
  );
}
