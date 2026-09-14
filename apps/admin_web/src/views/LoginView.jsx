import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, uploadFile } from '../api';
import {
  Lock,
  Mail,
  Phone,
  ArrowRight,
  KeyRound,
  Bike,
  User,
  Sparkles,
  ShieldCheck,
  Zap,
  Upload,
  CheckCircle2,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';
import { PapidoLoader } from '../components/PapidoLoader';


export function LoginView({
  onGoToAdminPortal,
  onGoToHome,
  initialMode = 'login',
  initialRole = 'CUSTOMER'
}) {
  const {
    login,
    register,
    verifyRegistrationOtp,
    resendRegistrationOtp,
    forgotPassword,
    resetPassword
  } = useAuth();

  const [authMode, setAuthMode] = useState(initialMode); // 'login', 'register', 'verify-otp', 'forgot'

  useEffect(() => {
    if (initialMode) setAuthMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (initialRole) setRegRole(initialRole);
  }, [initialRole]);

  // Password Visibility States
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [showForgotConfirmPass, setShowForgotConfirmPass] = useState(false);

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

  // Registration OTP Verification State
  const [verifyEmail, setVerifyEmail] = useState('');
  const [regOtp, setRegOtp] = useState(['', '', '', '', '', '']);
  const [regOtpCooldown, setRegOtpCooldown] = useState(0);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (regOtpCooldown <= 0) return;
    const timer = setInterval(() => {
      setRegOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [regOtpCooldown]);

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
      if (err.code === 'EMAIL_NOT_VERIFIED' || err.message?.toLowerCase().includes('not verified')) {
        const target = email.trim().toLowerCase();
        setVerifyEmail(target);
        setRegOtp(['', '', '', '', '', '']);
        setRegOtpCooldown(60);
        setAuthMode('verify-otp');
        setError('Please verify your email OTP to activate your account.');
        try {
          await resendRegistrationOtp(target);
        } catch (_) {}
      } else {
        setError(err.message || 'Login failed. Please verify credentials.');
      }
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

      const cleanEmailTarget = regEmail.trim().toLowerCase();

      await register({
        name: regName.trim().toUpperCase(),
        email: cleanEmailTarget,
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

      // Transition to OTP verification screen
      setVerifyEmail(cleanEmailTarget);
      setRegOtp(['', '', '', '', '', '']);
      setRegOtpCooldown(60);
      setAuthMode('verify-otp');
      setSuccessMsg(`Registration submitted! A 6-digit verification code has been sent to ${cleanEmailTarget}.`);
    } catch (err) {
      setError(err.message || 'REGISTRATION FAILED.');
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  };

  // OTP Box Change and Navigation Handlers
  const handleOtpBoxChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...regOtp];
    updated[index] = digit;
    setRegOtp(updated);

    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !regOtp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const updated = [...regOtp];
        updated[index - 1] = '';
        setRegOtp(updated);
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const updated = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        updated[i] = pasted[i];
      }
      setRegOtp(updated);
      const focusIdx = Math.min(pasted.length, 5);
      const target = document.getElementById(`otp-input-${focusIdx}`);
      if (target) target.focus();
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    const fullOtp = regOtp.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await verifyRegistrationOtp(verifyEmail, fullOtp);
      setSuccessMsg('Account verified successfully! Logging you in...');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendRegistrationOtp = async () => {
    if (regOtpCooldown > 0 || !verifyEmail) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await resendRegistrationOtp(verifyEmail);
      setSuccessMsg(`A new verification code has been dispatched to ${verifyEmail}.`);
      setRegOtpCooldown(60);
      setRegOtp(['', '', '', '', '', '']);
      const firstInput = document.getElementById('otp-input-0');
      if (firstInput) firstInput.focus();
    } catch (err) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
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
    setSuccessMsg('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(1000px 700px at 50% 0%, #FFF7ED 0%, #FAF5EE 50%, #F5EFEB 100%)',
        padding: '28px 16px',
        color: '#271E16',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* Fullscreen Papido Loader during login / registration / upload */}
      {loading && (
        <PapidoLoader
          fullScreen
          size="lg"
          text={uploadStatus || (authMode === 'login' ? 'Signing in to Papido...' : 'Processing Campus Verification...')}
          subtext="Verifying credentials with Pondicherry University campus network"
        />
      )}

      <div

        style={{
          background: '#FFFFFF',
          border: '1.5px solid #EFE4D6',
          borderRadius: '28px',
          padding: '36px 32px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 24px 50px -12px rgba(234, 88, 12, 0.12), 0 4px 16px rgba(0, 0, 0, 0.03)',
          position: 'relative'
        }}
      >
        {/* Back to Home Button */}
        {onGoToHome && (
          <button
            type="button"
            onClick={onGoToHome}
            style={{
              position: 'absolute',
              top: '20px',
              left: '22px',
              background: '#FAF5EE',
              border: '1.2px solid #EFE4D6',
              borderRadius: '9999px',
              padding: '6px 13px',
              color: '#57483B',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#EA580C';
              e.currentTarget.style.borderColor = '#FED7AA';
              e.currentTarget.style.background = '#FFF7ED';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#57483B';
              e.currentTarget.style.borderColor = '#EFE4D6';
              e.currentTarget.style.background = '#FAF5EE';
            }}
          >
            <ArrowLeft size={13} />
            <span>Home</span>
          </button>
        )}

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/papidologo.jpeg"
            alt="Papido Logo"
            style={{
              width: '68px',
              height: '68px',
              objectFit: 'contain',
              borderRadius: '18px',
              margin: '0 auto 10px',
              boxShadow: '0 8px 20px rgba(234, 88, 12, 0.2)',
              border: '2px solid #F3ECE2',
              background: '#FFFFFF',
              padding: '3px',
              display: 'block'
            }}
          />
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#1F1A16',
              margin: '0 0 4px 0'
            }}
          >
            {authMode === 'login'
              ? 'Login'
              : authMode === 'register'
              ? 'Register'
              : authMode === 'verify-otp'
              ? 'Verify Email'
              : 'Reset Password'}
          </h2>
          <p style={{ fontSize: '13px', color: '#796D61', margin: 0, fontWeight: 500 }}>
            {authMode === 'login'
              ? 'Sign in to access campus mobility'
              : authMode === 'register'
              ? 'Join as a verified campus passenger or rider'
              : authMode === 'verify-otp'
              ? 'Enter the 6-digit code sent to your email'
              : 'Recover your account password'}
          </p>
        </div>

        {/* Tab Switcher (Sign In / Register) - Hidden in OTP & Forgot modes */}
        {authMode !== 'forgot' && authMode !== 'verify-otp' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: '#F7F2EB',
              border: '1px solid #EBE1D4',
              padding: '4px',
              borderRadius: '9999px',
              marginBottom: '24px'
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError('');
                setSuccessMsg('');
              }}
              style={{
                padding: '9px 12px',
                borderRadius: '9999px',
                border: 'none',
                background: authMode === 'login' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
                color: authMode === 'login' ? '#FFFFFF' : '#796D61',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: authMode === 'login' ? '0 3px 10px rgba(234, 88, 12, 0.3)' : 'none'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError('');
                setSuccessMsg('');
              }}
              style={{
                padding: '9px 12px',
                borderRadius: '9999px',
                border: 'none',
                background: authMode === 'register' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
                color: authMode === 'register' ? '#FFFFFF' : '#796D61',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: authMode === 'register' ? '0 3px 10px rgba(234, 88, 12, 0.3)' : 'none'
              }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Feedback Alert Banners */}
        {error && (
          <div
            style={{
              padding: '12px 14px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '14px',
              color: '#B91C1C',
              fontSize: '12.5px',
              fontWeight: 600,
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '12px 14px',
              background: '#ECFDF5',
              border: '1px solid #6EE7B7',
              borderRadius: '14px',
              color: '#047857',
              fontSize: '12.5px',
              fontWeight: 600,
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 1: SIGN IN (FIGMA STYLE) */}
        {/* ============================================================ */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email input */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#4A3E31',
                  marginBottom: '6px'
                }}
              >
                Enter your Email
              </label>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#FFFFFF',
                  border: '1.5px solid #E5DBD0',
                  borderRadius: '14px',
                  transition: 'border-color 0.2s ease',
                  overflow: 'hidden'
                }}
              >
                <div style={{ paddingLeft: '14px', display: 'flex', alignItems: 'center', color: '#9E8F82' }}>
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@papido.com"
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#271E16'
                  }}
                />
              </div>
            </div>

            {/* Password input with eye toggle & forgot password link */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#4A3E31',
                  marginBottom: '6px'
                }}
              >
                Enter your password
              </label>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#FFFFFF',
                  border: '1.5px solid #E5DBD0',
                  borderRadius: '14px',
                  overflow: 'hidden'
                }}
              >
                <div style={{ paddingLeft: '14px', display: 'flex', alignItems: 'center', color: '#9E8F82' }}>
                  <Lock size={18} />
                </div>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    paddingRight: '40px',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#271E16'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9E8F82',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot');
                    setForgotEmail(email);
                    setError('');
                    setSuccessMsg('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EA580C',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  forget password?
                </button>
              </div>
            </div>

            {/* Pill Action Button (Matches Figma Design) */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '9999px',
                border: 'none',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 22px rgba(234, 88, 12, 0.32)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                marginTop: '4px'
              }}
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  Login <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Figma Switch to Sign Up */}
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#796D61', marginTop: '2px' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setError('');
                  setSuccessMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EA580C',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '13px'
                }}
              >
                Sign Up
              </button>
            </div>

            {/* "or" separator like in Figma */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '8px 0 4px 0',
                gap: '12px'
              }}
            >
              <div style={{ flex: 1, height: '1px', background: '#E8DCCB' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#A39587' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: '#E8DCCB' }} />
            </div>

            {/* 1-Tap Demo Switcher Styled as Figma Pill Buttons */}
            <div>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#EA580C',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={13} /> 1-TAP DEMO TEST ACCOUNTS
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => quickFill('customer.ananya@papido.com', 'Password@123')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: '1.5px solid #FCE7F3',
                    background: '#FFF5F8',
                    color: '#BE185D',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ShieldCheck size={14} /> Passenger (Ananya)
                </button>

                <button
                  type="button"
                  onClick={() => quickFill('customer.rohan@papido.com', 'Password@123')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: '1.5px solid #EBE1D4',
                    background: '#FAFAF8',
                    color: '#271E16',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <User size={14} /> Passenger (Rohan)
                </button>

                <button
                  type="button"
                  onClick={() => quickFill('rider.rahul@papido.com', 'Password@123')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: '1.5px solid #EBE1D4',
                    background: '#FAFAF8',
                    color: '#271E16',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Bike size={14} /> Bike Rider (Rahul)
                </button>

                <button
                  type="button"
                  onClick={() => quickFill('sanaullak294@gmail.com', 'Password@123')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: '1.5px solid #EBE1D4',
                    background: '#FAFAF8',
                    color: '#271E16',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Zap size={14} /> Scooter Rider (Sanaulla)
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: REGISTER (FIGMA STYLE) */}
        {/* ============================================================ */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Join As Role Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A3E31', marginBottom: '6px' }}>
                I want to join as:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRegRole('CUSTOMER')}
                  style={{
                    padding: '10px',
                    borderRadius: '14px',
                    border: regRole === 'CUSTOMER' ? '2px solid #EA580C' : '1.5px solid #E5DBD0',
                    background: regRole === 'CUSTOMER' ? '#FFF7ED' : '#FAFAF8',
                    color: regRole === 'CUSTOMER' ? '#EA580C' : '#796D61',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <User size={16} /> Passenger
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole('RIDER')}
                  style={{
                    padding: '10px',
                    borderRadius: '14px',
                    border: regRole === 'RIDER' ? '2px solid #EA580C' : '1.5px solid #E5DBD0',
                    background: regRole === 'RIDER' ? '#FFF7ED' : '#FAFAF8',
                    color: regRole === 'RIDER' ? '#EA580C' : '#796D61',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Bike size={16} /> Rider (Driver)
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#4A3E31', margin: 0 }}>
                  Enter your Full Name <span style={{ color: '#EA580C' }}>*</span>
                </label>
                {regTouched.name && !regFieldErrors.name && regName.trim() && (
                  <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                    <Check size={12} /> VALID
                  </span>
                )}
              </div>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#FFFFFF',
                  border: regTouched.name && regFieldErrors.name ? '1.5px solid #EF4444' : regTouched.name && regName.trim() ? '1.5px solid #10B981' : '1.5px solid #E5DBD0',
                  borderRadius: '14px',
                  overflow: 'hidden'
                }}
              >
                <div style={{ paddingLeft: '14px', display: 'flex', alignItems: 'center', color: '#9E8F82' }}>
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => {
                    const upper = e.target.value.toUpperCase();
                    setRegName(upper);
                    if (regTouched.name) {
                      setRegFieldErrors((prev) => ({ ...prev, name: validateRegField('name', upper) }));
                    }
                  }}
                  onBlur={() => {
                    setRegTouched((prev) => ({ ...prev, name: true }));
                    setRegFieldErrors((prev) => ({ ...prev, name: validateRegField('name', regName) }));
                  }}
                  placeholder="ANANYA SEN"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: '#271E16',
                    textTransform: 'uppercase'
                  }}
                />
              </div>
              {regTouched.name && regFieldErrors.name && (
                <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> {regFieldErrors.name}
                </div>
              )}
            </div>

            {/* Mobile Number with Country Code (+91 ⌵) Exactly like Figma design */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#4A3E31', margin: 0 }}>
                  Enter your mobile number <span style={{ color: '#EA580C' }}>*</span>
                </label>
                {regTouched.phone && !regFieldErrors.phone && regPhone.trim().length === 10 && (
                  <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                    <Check size={12} /> VALID
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#FFFFFF',
                  border: regTouched.phone && regFieldErrors.phone ? '1.5px solid #EF4444' : regTouched.phone && regPhone.trim().length === 10 ? '1.5px solid #10B981' : '1.5px solid #E5DBD0',
                  borderRadius: '14px',
                  overflow: 'hidden'
                }}
              >
                {/* Figma Country Selector Badge (+91 ⌵) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0 12px 0 14px',
                    background: '#F8F4EE',
                    borderRight: '1px solid #E5DBD0',
                    height: '46px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#3A2E23',
                    userSelect: 'none'
                  }}
                >
                  <span>+91</span>
                  <ChevronDown size={14} color="#796D61" />
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={regPhone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setRegPhone(digits);
                    if (regTouched.phone) {
                      setRegFieldErrors((prev) => ({ ...prev, phone: validateRegField('phone', digits) }));
                    }
                  }}
                  onBlur={() => {
                    setRegTouched((prev) => ({ ...prev, phone: true }));
                    setRegFieldErrors((prev) => ({ ...prev, phone: validateRegField('phone', regPhone) }));
                  }}
                  placeholder="9876543210"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: '#271E16',
                    letterSpacing: '1px'
                  }}
                />
                {regPhone.trim().length === 10 && (
                  <div style={{ paddingRight: '14px', color: '#059669', display: 'flex', alignItems: 'center' }}>
                    <CheckCircle2 size={18} />
                  </div>
                )}
              </div>
              {regTouched.phone && regFieldErrors.phone && (
                <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> {regFieldErrors.phone}
                </div>
              )}
            </div>

            {/* Campus Email */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#4A3E31', margin: 0 }}>
                  Enter your Email <span style={{ color: '#EA580C' }}>*</span>
                </label>
                {regTouched.email && !regFieldErrors.email && regEmail.trim() && (
                  <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                    <Check size={12} /> VALID
                  </span>
                )}
              </div>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#FFFFFF',
                  border: regTouched.email && regFieldErrors.email ? '1.5px solid #EF4444' : regTouched.email && regEmail.trim() ? '1.5px solid #10B981' : '1.5px solid #E5DBD0',
                  borderRadius: '14px',
                  overflow: 'hidden'
                }}
              >
                <div style={{ paddingLeft: '14px', display: 'flex', alignItems: 'center', color: '#9E8F82' }}>
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRegEmail(val);
                    if (regTouched.email) {
                      setRegFieldErrors((prev) => ({ ...prev, email: validateRegField('email', val) }));
                    }
                  }}
                  onBlur={() => {
                    setRegTouched((prev) => ({ ...prev, email: true }));
                    setRegFieldErrors((prev) => ({ ...prev, email: validateRegField('email', regEmail) }));
                  }}
                  placeholder="student@pondiuni.ac.in"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '13.5px',
                    fontWeight: 500,
                    color: '#271E16'
                  }}
                />
              </div>
              {regTouched.email && regFieldErrors.email && (
                <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> {regFieldErrors.email}
                </div>
              )}
            </div>

            {/* Gender Selection */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#4A3E31', margin: 0 }}>
                  Gender <span style={{ color: '#EA580C' }}>*</span>
                </label>
                {regGender && (
                  <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                    <Check size={12} /> {regGender} SELECTED
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setRegGender('MALE');
                    setRegTouched((prev) => ({ ...prev, gender: true }));
                    setRegFieldErrors((prev) => ({ ...prev, gender: '' }));
                  }}
                  style={{
                    padding: '9px',
                    borderRadius: '12px',
                    border: regGender === 'MALE' ? '2px solid #EA580C' : '1.5px solid #E5DBD0',
                    background: regGender === 'MALE' ? '#FFF7ED' : '#FAFAF8',
                    color: regGender === 'MALE' ? '#EA580C' : '#796D61',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <User size={15} /> MALE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegGender('FEMALE');
                    setRegTouched((prev) => ({ ...prev, gender: true }));
                    setRegFieldErrors((prev) => ({ ...prev, gender: '' }));
                  }}
                  style={{
                    padding: '9px',
                    borderRadius: '12px',
                    border: regGender === 'FEMALE' ? '2px solid #EC4899' : '1.5px solid #E5DBD0',
                    background: regGender === 'FEMALE' ? '#FDF2F8' : '#FAFAF8',
                    color: regGender === 'FEMALE' ? '#BE185D' : '#796D61',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <ShieldCheck size={15} /> FEMALE
                </button>
              </div>
              {regTouched.gender && regFieldErrors.gender && (
                <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> {regFieldErrors.gender}
                </div>
              )}
            </div>

            {/* Rider Specific Details & KYC Uploads */}
            {regRole === 'RIDER' && (
              <div
                style={{
                  background: '#FBF8F4',
                  padding: '16px',
                  borderRadius: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: '1.5px solid #EFE4D6'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#EA580C' }}>
                  <ShieldCheck size={16} /> MANDATORY DRIVER VEHICLE & DOCUMENTS
                </div>

                {/* Vehicle Type & Model */}
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #EBE1D4', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                        borderRadius: '8px',
                        border: regVehicleType === 'BIKE' ? '2px solid #EA580C' : '1px solid #E5DBD0',
                        background: regVehicleType === 'BIKE' ? '#FFF7ED' : '#FAFAF8',
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
                        borderRadius: '8px',
                        border: regVehicleType === 'SCOOTER' ? '2px solid #EA580C' : '1px solid #E5DBD0',
                        background: regVehicleType === 'SCOOTER' ? '#FFF7ED' : '#FAFAF8',
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
                    value={regVehicleModel}
                    onChange={(e) => {
                      const upper = e.target.value.toUpperCase();
                      setRegVehicleModel(upper);
                      if (regTouched.vehicleModel) {
                        setRegFieldErrors((prev) => ({ ...prev, vehicleModel: validateRegField('vehicleModel', upper) }));
                      }
                    }}
                    onBlur={() => {
                      setRegTouched((prev) => ({ ...prev, vehicleModel: true }));
                      setRegFieldErrors((prev) => ({ ...prev, vehicleModel: validateRegField('vehicleModel', regVehicleModel) }));
                    }}
                    placeholder="E.G. HONDA ACTIVA 6G / HERO SPLENDOR"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: regTouched.vehicleModel && regFieldErrors.vehicleModel ? '1.5px solid #EF4444' : regTouched.vehicleModel && regVehicleModel.trim() ? '1.5px solid #10B981' : '1.5px solid #E5DBD0',
                      background: '#FAFAF8',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#271E16',
                      outline: 'none',
                      textTransform: 'uppercase'
                    }}
                  />
                  {regTouched.vehicleModel && regFieldErrors.vehicleModel && (
                    <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} /> {regFieldErrors.vehicleModel}
                    </div>
                  )}
                </div>

                {/* 1. College / Campus ID Upload */}
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #EBE1D4', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#271E16', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>1. CAMPUS / COLLEGE ID CARD <span style={{ color: '#EA580C' }}>*</span></span>
                    {collegeIdFile ? (
                      <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> {(collegeIdFile.size / 1024).toFixed(1)} KB
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700 }}>MAX 150 KB</span>
                    )}
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: '10px',
                      border: collegeIdFile ? '1.5px solid #10B981' : '1.5px dashed #EA580C',
                      background: collegeIdFile ? '#ECFDF5' : '#FFF7ED',
                      color: collegeIdFile ? '#047857' : '#EA580C',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    <Upload size={14} />
                    <span>{collegeIdFile ? collegeIdFile.name.toUpperCase() : 'UPLOAD ID CARD (PDF/JPG ≤ 150 KB)'}</span>
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
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #EBE1D4', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#271E16', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>2. DRIVING LICENCE (DL) <span style={{ color: '#EA580C' }}>*</span></span>
                    {licenseFile ? (
                      <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> {(licenseFile.size / 1024).toFixed(1)} KB
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700 }}>MAX 150 KB</span>
                    )}
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: '10px',
                      border: licenseFile ? '1.5px solid #10B981' : '1.5px dashed #EA580C',
                      background: licenseFile ? '#ECFDF5' : '#FFF7ED',
                      color: licenseFile ? '#047857' : '#EA580C',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    <Upload size={14} />
                    <span>{licenseFile ? licenseFile.name.toUpperCase() : 'UPLOAD DRIVING LICENCE (≤ 150 KB)'}</span>
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
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #EBE1D4', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#271E16', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>3. VEHICLE RC DOCUMENT <span style={{ color: '#EA580C' }}>*</span></span>
                    {rcFile ? (
                      <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> {(rcFile.size / 1024).toFixed(1)} KB
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700 }}>MAX 150 KB</span>
                    )}
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: '10px',
                      border: rcFile ? '1.5px solid #10B981' : '1.5px dashed #EA580C',
                      background: rcFile ? '#ECFDF5' : '#FFF7ED',
                      color: rcFile ? '#047857' : '#EA580C',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    <Upload size={14} />
                    <span>{rcFile ? rcFile.name.toUpperCase() : 'UPLOAD RC DOCUMENT (≤ 150 KB)'}</span>
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

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#4A3E31', margin: 0 }}>
                  Enter your password <span style={{ color: '#EA580C' }}>*</span>
                </label>
                {regTouched.password && !regFieldErrors.password && regPassword && regPassword.length >= 6 && (
                  <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                    <Check size={12} /> VALID
                  </span>
                )}
              </div>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#FFFFFF',
                  border: regTouched.password && regFieldErrors.password ? '1.5px solid #EF4444' : regTouched.password && regPassword.length >= 6 ? '1.5px solid #10B981' : '1.5px solid #E5DBD0',
                  borderRadius: '14px',
                  overflow: 'hidden'
                }}
              >
                <div style={{ paddingLeft: '14px', display: 'flex', alignItems: 'center', color: '#9E8F82' }}>
                  <Lock size={18} />
                </div>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRegPassword(val);
                    if (regTouched.password) {
                      setRegFieldErrors((prev) => ({ ...prev, password: validateRegField('password', val) }));
                    }
                  }}
                  onBlur={() => {
                    setRegTouched((prev) => ({ ...prev, password: true }));
                    setRegFieldErrors((prev) => ({ ...prev, password: validateRegField('password', regPassword) }));
                  }}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    paddingRight: '40px',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '13.5px',
                    fontWeight: 500,
                    color: '#271E16'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9E8F82',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={showRegPassword ? 'Hide password' : 'Show password'}
                >
                  {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {regTouched.password && regFieldErrors.password && (
                <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> {regFieldErrors.password}
                </div>
              )}
            </div>

            {/* Pill Action Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '9999px',
                border: 'none',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 22px rgba(234, 88, 12, 0.32)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              {loading ? (
                uploadStatus || 'Sending Verification Code...'
              ) : (
                <>
                  Sign Up <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Switch to Sign In */}
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#796D61', marginTop: '4px' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError('');
                  setSuccessMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EA580C',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '13px'
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: VERIFY REGISTRATION OTP (FIGMA STYLE) */}
        {/* ============================================================ */}
        {authMode === 'verify-otp' && (
          <form onSubmit={handleVerifyOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '13.5px', color: '#57483B', lineHeight: '1.6', margin: '0 0 4px 0' }}>
                We sent a 6-digit verification code to:
              </p>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#EA580C', letterSpacing: '-0.01em' }}>
                {verifyEmail}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setError('');
                  setSuccessMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#796D61',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                Wrong email address? Change details
              </button>
            </div>

            {/* 6-Digit Figma Split Input Boxes */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '6px'
                }}
                onPaste={handleOtpPaste}
              >
                {regOtp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    autoFocus={idx === 0}
                    style={{
                      width: '46px',
                      height: '52px',
                      textAlign: 'center',
                      fontSize: '22px',
                      fontWeight: 800,
                      borderRadius: '14px',
                      border: digit ? '2px solid #EA580C' : '1.5px solid #E5DBD0',
                      background: digit ? '#FFF7ED' : '#FAFAF8',
                      color: '#271E16',
                      outline: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Resend OTP Timer / Button */}
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#796D61' }}>
              Didn't receive the code?{' '}
              {regOtpCooldown > 0 ? (
                <span style={{ fontWeight: 700, color: '#EA580C' }}>
                  Resend in 00:{regOtpCooldown < 10 ? `0${regOtpCooldown}` : regOtpCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendRegistrationOtp}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EA580C',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '13px'
                  }}
                >
                  Resend OTP Code
                </button>
              )}
            </div>

            {/* Pill Action Button */}
            <button
              type="submit"
              disabled={loading || regOtp.join('').length !== 6}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '9999px',
                border: 'none',
                background:
                  regOtp.join('').length === 6
                    ? 'linear-gradient(135deg, #F97316, #EA580C)'
                    : '#E8DFD5',
                color: regOtp.join('').length === 6 ? '#FFFFFF' : '#9E8F82',
                fontSize: '15px',
                fontWeight: 700,
                cursor: regOtp.join('').length === 6 ? 'pointer' : 'not-allowed',
                boxShadow:
                  regOtp.join('').length === 6 ? '0 8px 22px rgba(234, 88, 12, 0.32)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              {loading ? (
                'Verifying Code...'
              ) : (
                <>
                  Verify & Activate Account <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Back to Sign In Link */}
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#796D61', marginTop: '2px' }}>
              Already activated?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError('');
                  setSuccessMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EA580C',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '13px'
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* VIEW 4: FORGOT PASSWORD (FIGMA MATCHING STYLE) */}
        {/* ============================================================ */}
        {authMode === 'forgot' && (
          <div>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 800,
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#271E16'
              }}
            >
              <KeyRound size={20} color="#EA580C" /> Reset Account Password
            </h3>
            <p style={{ fontSize: '13px', color: '#796D61', marginBottom: '18px' }}>
              {forgotStep === 1
                ? 'Enter your registered email. We will send a 6-digit verification code.'
                : `Enter the 6-digit verification code sent to ${forgotEmail}.`}
            </p>

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A3E31', marginBottom: '6px' }}>
                    Enter your Email
                  </label>
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      background: '#FFFFFF',
                      border: '1.5px solid #E5DBD0',
                      borderRadius: '14px',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ paddingLeft: '14px', display: 'flex', alignItems: 'center', color: '#9E8F82' }}>
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@example.com"
                      style={{
                        width: '100%',
                        padding: '13px 14px',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#271E16'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    style={{
                      flex: 1,
                      height: '46px',
                      borderRadius: '9999px',
                      border: '1px solid #E5DBD0',
                      background: '#F8F4EE',
                      color: '#796D61',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1,
                      height: '46px',
                      borderRadius: '9999px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #F97316, #EA580C)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px rgba(234, 88, 12, 0.28)'
                    }}
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A3E31', marginBottom: '6px' }}>
                    6-Digit Email OTP
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="123456"
                    style={{
                      width: '100%',
                      textAlign: 'center',
                      fontSize: '20px',
                      letterSpacing: '6px',
                      fontWeight: 800,
                      padding: '12px',
                      borderRadius: '14px',
                      border: '1.5px solid #E5DBD0',
                      background: '#FFFFFF',
                      color: '#271E16',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A3E31', marginBottom: '6px' }}>
                    Enter new password
                  </label>
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      background: '#FFFFFF',
                      border: '1.5px solid #E5DBD0',
                      borderRadius: '14px',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ paddingLeft: '14px', display: 'flex', alignItems: 'center', color: '#9E8F82' }}>
                      <Lock size={18} />
                    </div>
                    <input
                      type={showForgotNewPass ? 'text' : 'password'}
                      required
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      placeholder="••••••••••••"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        paddingRight: '40px',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        fontSize: '13.5px',
                        fontWeight: 500,
                        color: '#271E16'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPass(!showForgotNewPass)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9E8F82',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showForgotNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A3E31', marginBottom: '6px' }}>
                    Re-Enter your password
                  </label>
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      background: '#FFFFFF',
                      border: '1.5px solid #E5DBD0',
                      borderRadius: '14px',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ paddingLeft: '14px', display: 'flex', alignItems: 'center', color: '#9E8F82' }}>
                      <Lock size={18} />
                    </div>
                    <input
                      type={showForgotConfirmPass ? 'text' : 'password'}
                      required
                      value={forgotConfirmPass}
                      onChange={(e) => setForgotConfirmPass(e.target.value)}
                      placeholder="••••••••••••"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        paddingRight: '40px',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        fontSize: '13.5px',
                        fontWeight: 500,
                        color: '#271E16'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotConfirmPass(!showForgotConfirmPass)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9E8F82',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showForgotConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    style={{
                      flex: 1,
                      height: '46px',
                      borderRadius: '9999px',
                      border: '1px solid #E5DBD0',
                      background: '#F8F4EE',
                      color: '#796D61',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1,
                      height: '46px',
                      borderRadius: '9999px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #F97316, #EA580C)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px rgba(234, 88, 12, 0.28)'
                    }}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer Navigation Links */}
        {(onGoToAdminPortal || onGoToHome) && (
          <div
            style={{
              textAlign: 'center',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #F0E8DD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              flexWrap: 'wrap'
            }}
          >
            {onGoToHome && (
              <button
                type="button"
                onClick={onGoToHome}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8A7B6E',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#EA580C')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#8A7B6E')}
              >
                <ArrowLeft size={13} />
                <span>Return to Home</span>
              </button>
            )}

            {onGoToAdminPortal && (
              <button
                type="button"
                onClick={onGoToAdminPortal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8A7B6E',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#EA580C')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#8A7B6E')}
              >
                <span>Operator & Admin Portal</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
