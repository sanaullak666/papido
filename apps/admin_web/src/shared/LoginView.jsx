import React, { useState, useRef, useEffect, useMemo } from 'react';
import './LoginView.css';
import { useAuth } from '../context/AuthContext';
import { uploadFile } from '../api';
import {
  Lock, Mail, Phone, ArrowRight, Bike, User,
  ShieldCheck, Zap, CheckCircle2, AlertCircle,
  Check, Eye, EyeOff, Loader2, ChevronLeft, Upload
} from 'lucide-react';

/* ============================================================
   SCREENS
   ============================================================ */
const SCREEN = {
  PHONE:      'phone',
  OTP:        'otp',
  PASSWORD:   'password',
  REGISTER:   'register',
  FORGOT:     'forgot'
};

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export function LoginView({ onGoToAdminPortal, onLoginSuccess }) {
  const {
    login,
    register,
    forgotPassword,
    resetPassword,
    sendLoginOtp,
    verifyLoginOtp
  } = useAuth();

  /* ---------- Screen & role ---------- */
  const [screen, setScreen] = useState(SCREEN.PHONE);
  const [role, setRole] = useState('CUSTOMER');
  const [direction, setDirection] = useState('forward'); // for slide transition

  /* ---------- Phone entry ---------- */
  const [phone, setPhone] = useState('');
  const [countryCode] = useState('+91');
  const [maskedEmail, setMaskedEmail] = useState('');

  /* ---------- OTP ---------- */
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);

  /* ---------- Password fallback ---------- */
  const [showPasswordMode, setShowPasswordMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  /* ---------- Register ---------- */
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regVehicleType, setRegVehicleType] = useState('BIKE');
  const [regVehicleModel, setRegVehicleModel] = useState('');
  const [regCollegeIdFile, setRegCollegeIdFile] = useState(null);
  const [regCollegeIdDocUrl, setRegCollegeIdDocUrl] = useState('');
  const [regCollegeIdName, setRegCollegeIdName] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const collegeIdInputRef = useRef(null);
  const [showRegPassword, setShowRegPassword] = useState(false);

  /* Password strength criteria check for registration */
  const regPasswordValidation = useMemo(() => {
    return {
      hasMinLen: regPassword.length >= 8,
      hasUpper: /[A-Z]/.test(regPassword),
      hasNumber: /[0-9]/.test(regPassword),
      hasSpecial: /[^A-Za-z0-9]/.test(regPassword),
      isValid: (
        regPassword.length >= 8 &&
        /[A-Z]/.test(regPassword) &&
        /[0-9]/.test(regPassword) &&
        /[^A-Za-z0-9]/.test(regPassword)
      )
    };
  }, [regPassword]);

  /* ---------- Forgot password ---------- */
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);

  /* ---------- Feedback ---------- */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [shakeKey, setShakeKey] = useState(0);

  /* ============================================================
     HELPERS
     ============================================================ */
  const goTo = (next, dir = 'forward') => {
    setDirection(dir);
    setError('');
    setSuccessMsg('');
    setScreen(next);
  };

  const shake = () => setShakeKey((k) => k + 1);

  const isValidPhone = (p) => /^[6-9]\d{9}$/.test(p);

  const displayPhone = `${countryCode} ${phone.slice(0, 5)}${
    phone.length > 5 ? ' ' + phone.slice(5) : ''
  }`;

  /* Resend countdown */
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  /* Auto-focus first OTP input when entering OTP screen */
  useEffect(() => {
    if (screen === SCREEN.OTP) {
      setTimeout(() => otpRefs.current[0]?.focus(), 120);
    }
  }, [screen]);

  /* ============================================================
     PHONE SUBMIT → SEND OTP TO REGISTERED EMAIL
     ============================================================ */
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    if (!isValidPhone(cleanDigits)) {
      setError('Enter a valid 10-digit mobile number.');
      shake();
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await sendLoginOtp(cleanDigits, role);
      const emailHint = res.maskedEmail || 'your registered email';
      setMaskedEmail(emailHint);
      setSuccessMsg(`Verification code sent to ${emailHint}`);
      setResendTimer(RESEND_SECONDS);
      goTo(SCREEN.OTP, 'forward');
    } catch (err) {
      setError(err.message || 'Failed to send verification code.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     OTP INPUT HANDLERS
     ============================================================ */
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);

    /* Handle paste of full OTP into one box */
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      const next = [...otp];
      digits.forEach((d, i) => {
        if (index + i < OTP_LENGTH) next[index + i] = d;
      });
      setOtp(next);
      const lastFilled = Math.min(index + digits.length, OTP_LENGTH - 1);
      otpRefs.current[lastFilled]?.focus();
      return;
    }

    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData?.getData('text')?.replace(/\D/g, '') || '';
    if (pasted.length >= OTP_LENGTH) {
      e.preventDefault();
      const digits = pasted.slice(0, OTP_LENGTH).split('');
      setOtp(digits);
      otpRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  /* ============================================================
     VERIFY OTP → LOGIN
     ============================================================ */
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Enter the full 6-digit code.');
      shake();
      return;
    }

    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    setLoading(true);
    setError('');
    try {
      const loggedUser = await verifyLoginOtp(cleanDigits, code, role);
      setSuccessMsg('Verification successful! Welcome back.');

      setTimeout(() => {
        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(loggedUser);
        } else {
          const dest = loggedUser?.role === 'RIDER' ? '/rider' : '/passenger';
          window.history.pushState({}, '', dest);
          window.location.href = dest;
        }
      }, 400);
    } catch (err) {
      const msg = err.message || 'Verification failed.';
      const lower = msg.toLowerCase();
      if (lower.includes('pending') || lower.includes('kyc')) {
        setError('Your rider account is under review. Contact campus admin.');
      } else {
        setError(msg);
      }
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    setLoading(true);
    setError('');
    try {
      const res = await sendLoginOtp(cleanDigits, role);
      const emailHint = res.maskedEmail || maskedEmail || 'your registered email';
      setMaskedEmail(emailHint);
      setOtp(Array(OTP_LENGTH).fill(''));
      setResendTimer(RESEND_SECONDS);
      setSuccessMsg(`New code sent to ${emailHint}`);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Failed to resend verification code.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     PASSWORD LOGIN (fallback for email accounts)
     ============================================================ */
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email.');
      shake();
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      shake();
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(trimmedEmail, password);
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(loggedUser);
      } else {
        const dest = loggedUser?.role === 'RIDER' ? '/rider' : '/passenger';
        window.history.pushState({}, '', dest);
        window.location.href = dest;
      }
    } catch (err) {
      const msg = err.message || '';
      const lower = msg.toLowerCase();
      if (
        lower.includes('credential') ||
        lower.includes('invalid') ||
        lower.includes('password') ||
        lower.includes('not found')
      ) {
        setError('Incorrect email or password.');
      } else if (lower.includes('pending') || lower.includes('kyc')) {
        setError('Your rider account is under review.');
      } else {
        setError(msg || 'Authentication failed.');
      }
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleCollegeIdSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type: Image (JPG, PNG, WEBP) or PDF only
    const isImageOrPdf = file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      /\.(jpe?g|png|webp|heic|heif|pdf)$/i.test(file.name);

    if (!isImageOrPdf) {
      setError('Please upload a valid Campus ID document (PDF or Image only).');
      shake();
      if (collegeIdInputRef.current) collegeIdInputRef.current.value = '';
      return;
    }

    // Validate file size: up to 150 KB
    const maxBytes = 150 * 1024;
    if (file.size > maxBytes) {
      const actualKb = (file.size / 1024).toFixed(1);
      setError(`Campus ID file (${actualKb} KB) exceeds the 150 KB limit. Please upload an image or PDF under 150 KB.`);
      shake();
      if (collegeIdInputRef.current) collegeIdInputRef.current.value = '';
      return;
    }

    setRegCollegeIdFile(file);
    const sizeKb = (file.size / 1024).toFixed(0);
    setRegCollegeIdName(`${file.name} (${sizeKb} KB)`);
    setError('');

    setUploadingDoc(true);
    try {
      const uploadRes = await uploadFile(file, null, 150);
      setRegCollegeIdDocUrl(uploadRes.url || uploadRes.dataUri || uploadRes.fileUrl);
    } catch (uploadErr) {
      setError(uploadErr.message || 'Failed to upload Campus ID card. Please try again.');
      shake();
    } finally {
      setUploadingDoc(false);
    }
  };

  /* ============================================================
     REGISTER
     ============================================================ */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    /* Basic validation */
    if (!regName.trim() || regName.trim().length < 2) {
      setError('Full name is required.');
      shake();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      setError('Enter a valid email address.');
      shake();
      return;
    }
    if (!isValidPhone(regPhone)) {
      setError('Enter a valid 10-digit mobile number.');
      shake();
      return;
    }
    if (!regGender) {
      setError('Please select your gender.');
      shake();
      return;
    }
    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      shake();
      return;
    }
    if (!/[A-Z]/.test(regPassword)) {
      setError('Password must contain at least one uppercase letter (A-Z).');
      shake();
      return;
    }
    if (!/[0-9]/.test(regPassword)) {
      setError('Password must contain at least one number (0-9).');
      shake();
      return;
    }
    if (!/[^A-Za-z0-9]/.test(regPassword)) {
      setError('Password must contain at least one special character (e.g. !@#$%^&*).');
      shake();
      return;
    }
    if (role === 'RIDER') {
      if (!regVehicleModel.trim()) {
        setError('Vehicle model is required.');
        shake();
        return;
      }
      if (!regCollegeIdDocUrl && !regCollegeIdFile) {
        setError('Please upload your Campus / College ID Card (PDF or Image, max 150 KB).');
        shake();
        return;
      }
      if (regCollegeIdFile && regCollegeIdFile.size > 150 * 1024) {
        setError('Campus ID file exceeds the 150 KB limit. Please upload a smaller file.');
        shake();
        return;
      }
    }

    setLoading(true);
    try {
      let finalCollegeIdUrl = regCollegeIdDocUrl;
      if (role === 'RIDER' && !finalCollegeIdUrl && regCollegeIdFile) {
        setUploadingDoc(true);
        const uploadRes = await uploadFile(regCollegeIdFile, null, 150);
        finalCollegeIdUrl = uploadRes.url || uploadRes.dataUri || uploadRes.fileUrl;
        setRegCollegeIdDocUrl(finalCollegeIdUrl);
      }

      const regRes = await register({
        name: regName.trim().toUpperCase(),
        email: regEmail.trim().toLowerCase(),
        phone: regPhone.trim(),
        gender: regGender,
        password: regPassword,
        role,
        vehicleType: role === 'RIDER' ? regVehicleType : undefined,
        vehicleModel: role === 'RIDER'
          ? regVehicleModel.trim().toUpperCase()
          : undefined,
        collegeIdDocUrl: role === 'RIDER' ? finalCollegeIdUrl : undefined
      });

      const regUserData = regRes?.data?.user;
      setSuccessMsg('Account created! Signing you in...');
      setTimeout(() => {
        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(regUserData || { role });
        } else {
          const dest = (regUserData?.role || role) === 'RIDER'
            ? '/rider'
            : '/passenger';
          window.location.href = dest;
        }
      }, 700);
    } catch (err) {
      setError(err.message || 'Registration failed.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     FORGOT PASSWORD
     ============================================================ */
  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setError('');
    setLoading(true);
    try {
      await forgotPassword(forgotEmail.trim());
      setForgotStep(2);
      setSuccessMsg(`OTP sent to ${forgotEmail}.`);
    } catch (err) {
      setError(err.message || 'Failed to send OTP.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setError('');
    if (forgotNewPass.length < 6) {
      setError('Password must be at least 6 characters.');
      shake();
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setError('Passwords do not match.');
      shake();
      return;
    }
    setLoading(true);
    try {
      await resetPassword(forgotEmail.trim(), forgotOtp.trim(), forgotNewPass);
      setSuccessMsg('Password reset! Sign in with your new password.');
      setPhone('');
      setForgotStep(1);
      goTo(SCREEN.PHONE, 'back');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     SLIDE TRANSITION CLASS
     ============================================================ */
  const screenClass = useMemo(() => {
    if (direction === 'forward') return 'pap-screen pap-screen--forward';
    return 'pap-screen pap-screen--back';
  }, [direction]);

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="papido-auth-page theme-modern-split">

      {/* Ambient background */}
      <div className="papido-auth-bg" aria-hidden="true">
        <span className="orb orb--primary" />
        <span className="orb orb--amber" />
        <span className="orb orb--emerald" />
        <div className="papido-grid-pattern" />
      </div>

      <div className="papido-auth-container papido-split-container">
        {/* ==================================================
            CENTRAL AUTH CARD (STANDALONE LOGIN PAGE)
           ================================================== */}
        <section className="papido-auth-wrapper">
          <div className="papido-auth-card papido-fade-up">

            {/* Papido Brand Header */}
            <div className="papido-card-brand-header">
              <div className="papido-brand-pill">
                <img
                  src="/papidologo.jpeg"
                  alt="Papido"
                  className="papido-hero-logo"
                />
                <div className="papido-brand-texts">
                  <div className="papido-hero-brand-name">PAPIDO</div>
                  <div className="papido-hero-brand-sub">
                    Pondicherry University Mobility
                  </div>
                </div>
              </div>
            </div>

            {/* Role selector */}
            <div className="papido-role-selector">
              <div className="papido-role-label">PORTAL ACCESS</div>
              <div className="papido-role-track">
                <span
                  className={`papido-role-slider ${
                    role === 'CUSTOMER' ? 'is-left' : 'is-right'
                  }`}
                />
                <button
                  type="button"
                  className={`papido-role-tab ${
                    role === 'CUSTOMER' ? 'is-active' : ''
                  }`}
                  onClick={() => {
                    setRole('CUSTOMER');
                    setError('');
                  }}
                >
                  <User size={15} />
                  <span>Passenger</span>
                </button>
                <button
                  type="button"
                  className={`papido-role-tab ${
                    role === 'RIDER' ? 'is-active' : ''
                  }`}
                  onClick={() => {
                    setRole('RIDER');
                    setError('');
                  }}
                >
                  <Bike size={15} />
                  <span>Rider</span>
                </button>
              </div>
            </div>

            {/* Feedback */}
            {error && (
              <div
                key={`err-${shakeKey}`}
                className="papido-toast papido-toast--error papido-shake"
              >
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="papido-toast papido-toast--success papido-slide-down">
                <CheckCircle2 size={17} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ==================================================
                SCREEN: PHONE ENTRY
               ================================================== */}
            {screen === SCREEN.PHONE && (
              <div className={`${screenClass} pap-screen--phone`}>
                <div className="papido-card-head">
                  <h2>Enter your mobile number</h2>
                  <p>
                    We'll send a 6-digit verification code to your registered email address.
                  </p>
                </div>

                <form onSubmit={handleSendOtp} className="papido-form">

                  <div className="papido-field-group">
                    <label className="papido-input-label">Mobile Number</label>
                    <div className="papido-phone-shell">
                      <div className="papido-country-chip">
                        <span className="papido-flag">🇮🇳</span>
                        <span className="papido-code">+91</span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        autoFocus
                        maxLength={10}
                        className="papido-phone-input"
                        placeholder="98765 43210"
                        value={phone}
                        onChange={(e) => {
                          const digits = e.target.value
                            .replace(/\D/g, '')
                            .slice(0, 10);
                          setPhone(digits);
                          setError('');
                        }}
                      />
                      {phone.length === 10 && (
                        <span className="papido-phone-valid">
                          <Check size={14} />
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="papido-primary-btn"
                    disabled={loading || phone.length !== 10}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="papido-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>

                  <div className="papido-auth-divider">
                    <span>OR</span>
                  </div>

                  <button
                    type="button"
                    className="papido-ghost-btn"
                    onClick={() => {
                      setShowPasswordMode(true);
                      goTo(SCREEN.PASSWORD, 'forward');
                    }}
                  >
                    <Mail size={15} />
                    <span>Sign in with Email &amp; Password</span>
                  </button>
                </form>

                <div className="papido-form-switch-prompt">
                  <button
                    type="button"
                    className="papido-subtle-btn"
                    onClick={() => goTo(SCREEN.REGISTER, 'forward')}
                  >
                    New to Papido? <strong>Create an account</strong>
                  </button>
                </div>
              </div>
            )}

            {/* ==================================================
                SCREEN: OTP VERIFY
               ================================================== */}
            {screen === SCREEN.OTP && (
              <div className={`${screenClass} pap-screen--otp`}>
                <button
                  type="button"
                  className="pap-back-btn"
                  onClick={() => goTo(SCREEN.PHONE, 'back')}
                >
                  <ChevronLeft size={16} />
                  <span>Change number</span>
                </button>

                <div className="papido-card-head">
                  <h2>Enter verification code</h2>
                  <p>
                    Enter the 6-digit code sent to your registered email{' '}
                    <strong className="pap-otp-phone">{maskedEmail || 'inbox'}</strong>{' '}
                    linked with {displayPhone}.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="papido-form">
                  <div className="pap-otp-grid" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (otpRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`pap-otp-box ${digit ? 'is-filled' : ''}`}
                        aria-label={`Digit ${i + 1}`}
                      />
                    ))}
                  </div>

                  <div className="pap-resend-row">
                    {resendTimer > 0 ? (
                      <span className="pap-resend-text">
                        Resend code in{' '}
                        <strong>{resendTimer}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="papido-text-link"
                        onClick={handleResendOtp}
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="papido-primary-btn"
                    disabled={loading || otp.join('').length !== OTP_LENGTH}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="papido-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify &amp; Continue</span>
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ==================================================
                SCREEN: PASSWORD FALLBACK
               ================================================== */}
            {screen === SCREEN.PASSWORD && (
              <div className={`${screenClass} pap-screen--password`}>
                <button
                  type="button"
                  className="pap-back-btn"
                  onClick={() => goTo(SCREEN.PHONE, 'back')}
                >
                  <ChevronLeft size={16} />
                  <span>Back to phone sign in</span>
                </button>

                <div className="papido-card-head">
                  <h2>Sign in with Email</h2>
                  <p>Use your campus email and account password.</p>
                </div>

                <form onSubmit={handlePasswordLogin} className="papido-form">
                  <div className="papido-field-group">
                    <label className="papido-input-label">Email Address</label>
                    <div className="papido-input-shell">
                      <Mail size={16} className="papido-input-lead-icon" />
                      <input
                        type="email"
                        required
                        autoFocus
                        className="papido-form-input"
                        placeholder="student@pondiuni.ac.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="papido-field-group">
                    <div className="papido-label-split">
                      <label className="papido-input-label">Password</label>
                      <button
                        type="button"
                        className="papido-text-link"
                        onClick={() => goTo(SCREEN.FORGOT, 'forward')}
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="papido-input-shell">
                      <Lock size={16} className="papido-input-lead-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="papido-form-input"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="papido-trail-btn"
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="papido-primary-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="papido-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ==================================================
                SCREEN: REGISTER
               ================================================== */}
            {screen === SCREEN.REGISTER && (
              <div className={`${screenClass} pap-screen--register`}>
                <button
                  type="button"
                  className="pap-back-btn"
                  onClick={() => goTo(SCREEN.PHONE, 'back')}
                >
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>

                <div className="papido-card-head">
                  <h2>Create your account</h2>
                </div>

                <form onSubmit={handleRegister} className="papido-form">
                  <div className="papido-field-group">
                    <label className="papido-input-label">I am joining as</label>
                    <div className="papido-segmented-duo">
                      <button
                        type="button"
                        className={`papido-duo-btn ${
                          role === 'CUSTOMER' ? 'is-active' : ''
                        }`}
                        onClick={() => setRole('CUSTOMER')}
                      >
                        <User size={15} /> Passenger
                      </button>
                      <button
                        type="button"
                        className={`papido-duo-btn ${
                          role === 'RIDER' ? 'is-active' : ''
                        }`}
                        onClick={() => setRole('RIDER')}
                      >
                        <Bike size={15} /> Rider
                      </button>
                    </div>
                  </div>

                  <div className="papido-field-group">
                    <label className="papido-input-label">Full Name</label>
                    <div className="papido-input-shell">
                      <User size={16} className="papido-input-lead-icon" />
                      <input
                        type="text"
                        required
                        className="papido-form-input"
                        placeholder="ANANYA SEN"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value.toUpperCase())}
                        style={{ textTransform: 'uppercase', fontWeight: 600 }}
                      />
                    </div>
                  </div>

                  <div className="papido-field-group">
                    <label className="papido-input-label">Email</label>
                    <div className="papido-input-shell">
                      <Mail size={16} className="papido-input-lead-icon" />
                      <input
                        type="email"
                        required
                        className="papido-form-input"
                        placeholder="student@pondiuni.ac.in"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="papido-field-group">
                    <label className="papido-input-label">Mobile Number</label>
                    <div className="papido-phone-shell">
                      <div className="papido-country-chip">
                        <span className="papido-flag">🇮🇳</span>
                        <span className="papido-code">+91</span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        required
                        className="papido-phone-input"
                        placeholder="98765 43210"
                        value={regPhone}
                        onChange={(e) =>
                          setRegPhone(
                            e.target.value.replace(/\D/g, '').slice(0, 10)
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="papido-field-group">
                    <label className="papido-input-label">Gender</label>
                    <div className="papido-segmented-duo">
                      <button
                        type="button"
                        className={`papido-duo-btn ${
                          regGender === 'MALE' ? 'is-active' : ''
                        }`}
                        onClick={() => setRegGender('MALE')}
                      >
                        <User size={15} /> Male
                      </button>
                      <button
                        type="button"
                        className={`papido-duo-btn papido-duo-btn--pink ${
                          regGender === 'FEMALE' ? 'is-active' : ''
                        }`}
                        onClick={() => setRegGender('FEMALE')}
                      >
                        <ShieldCheck size={15} /> Female
                      </button>
                    </div>
                  </div>

                  {role === 'RIDER' && (
                    <div className="papido-kyc-card">
                      <div className="papido-kyc-header">
                        <ShieldCheck size={16} color="#EA580C" />
                        <span>Vehicle Details</span>
                      </div>

                      <div className="papido-segmented-duo">
                        <button
                          type="button"
                          className={`papido-duo-btn ${
                            regVehicleType === 'BIKE' ? 'is-active' : ''
                          }`}
                          onClick={() => setRegVehicleType('BIKE')}
                        >
                          <Bike size={14} /> Motorcycle
                        </button>
                        <button
                          type="button"
                          className={`papido-duo-btn ${
                            regVehicleType === 'SCOOTER' ? 'is-active' : ''
                          }`}
                          onClick={() => setRegVehicleType('SCOOTER')}
                        >
                          <Zap size={14} /> Scooty
                        </button>
                      </div>

                      <input
                        type="text"
                        required
                        className="papido-form-input"
                        placeholder="HONDA ACTIVA 6G"
                        value={regVehicleModel}
                        onChange={(e) =>
                          setRegVehicleModel(e.target.value.toUpperCase())
                        }
                        style={{
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          paddingLeft: 16
                        }}
                      />

                      <div className="papido-kyc-upload-box">
                        <div className="papido-label-split">
                          <label className="papido-input-label" style={{ fontSize: '12px' }}>
                            Campus / College ID Card <span style={{ color: '#EA580C' }}>*</span>
                          </label>
                          <span style={{ fontSize: '11px', color: '#8B8377', fontWeight: 600 }}>
                            PDF or Image (max 150 KB)
                          </span>
                        </div>
                        <input
                          type="file"
                          ref={collegeIdInputRef}
                          style={{ display: 'none' }}
                          accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                          onChange={handleCollegeIdSelect}
                        />
                        <button
                          type="button"
                          className={`papido-upload-btn ${regCollegeIdDocUrl ? 'is-uploaded' : ''}`}
                          onClick={() => collegeIdInputRef.current?.click()}
                          disabled={uploadingDoc}
                        >
                          {uploadingDoc ? (
                            <>
                              <Loader2 size={16} className="papido-spin" />
                              <span>Uploading ID Card...</span>
                            </>
                          ) : regCollegeIdDocUrl ? (
                            <>
                              <CheckCircle2 size={16} color="#059669" />
                              <span className="papido-upload-name">
                                {regCollegeIdName || 'Campus ID Card Attached'}
                              </span>
                              <span className="papido-upload-change">Change</span>
                            </>
                          ) : (
                            <>
                              <Upload size={16} />
                              <span>Upload Campus ID (PDF or Image, max 150 KB)</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="papido-kyc-sub">
                        Only your Campus ID (PDF or image up to 150 KB) is required to register. Vehicle RC and DL can be uploaded after first sign in.
                      </p>
                    </div>
                  )}

                  <div className="papido-field-group">
                    <label className="papido-input-label">
                      Password (min 8 characters)
                    </label>
                    <div className="papido-input-shell">
                      <Lock size={16} className="papido-input-lead-icon" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        className="papido-form-input"
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          setError('');
                        }}
                      />
                      <button
                        type="button"
                        className="papido-trail-btn"
                        onClick={() => setShowRegPassword((v) => !v)}
                        aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>

                    {/* Strong password criteria checklist */}
                    {regPassword.length > 0 && (
                      <div className="papido-pwd-criteria">
                        <span className={`papido-pwd-pill ${regPasswordValidation.hasMinLen ? 'is-met' : ''}`}>
                          <Check size={11} /> 8+ chars
                        </span>
                        <span className={`papido-pwd-pill ${regPasswordValidation.hasUpper ? 'is-met' : ''}`}>
                          <Check size={11} /> Uppercase (A-Z)
                        </span>
                        <span className={`papido-pwd-pill ${regPasswordValidation.hasNumber ? 'is-met' : ''}`}>
                          <Check size={11} /> Number (0-9)
                        </span>
                        <span className={`papido-pwd-pill ${regPasswordValidation.hasSpecial ? 'is-met' : ''}`}>
                          <Check size={11} /> Special char (!@#$)
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="papido-primary-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="papido-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ==================================================
                SCREEN: FORGOT
               ================================================== */}
            {screen === SCREEN.FORGOT && (
              <div className={`${screenClass} pap-screen--forgot`}>
                <button
                  type="button"
                  className="pap-back-btn"
                  onClick={() => goTo(SCREEN.PASSWORD, 'back')}
                >
                  <ChevronLeft size={16} />
                  <span>Back to sign in</span>
                </button>

                <div className="papido-card-head">
                  <h2>Reset password</h2>
                  <p>
                    {forgotStep === 1
                      ? 'We\u2019ll send a 6-digit OTP to your email.'
                      : `Enter the OTP sent to ${forgotEmail}.`}
                  </p>
                </div>

                {forgotStep === 1 ? (
                  <form onSubmit={handleForgotSendOtp} className="papido-form">
                    <div className="papido-field-group">
                      <label className="papido-input-label">Email</label>
                      <div className="papido-input-shell">
                        <Mail size={16} className="papido-input-lead-icon" />
                        <input
                          type="email"
                          required
                          autoFocus
                          className="papido-form-input"
                          placeholder="student@pondiuni.ac.in"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="papido-primary-btn"
                      disabled={loading}
                    >
                      {loading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleForgotReset} className="papido-form">
                    <div className="papido-field-group">
                      <label className="papido-input-label">OTP Code</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        className="papido-form-input papido-otp-box"
                        placeholder="123456"
                        value={forgotOtp}
                        onChange={(e) =>
                          setForgotOtp(
                            e.target.value.replace(/\D/g, '').slice(0, 6)
                          )
                        }
                      />
                    </div>

                    <div className="papido-field-group">
                      <label className="papido-input-label">New Password</label>
                      <div className="papido-input-shell">
                        <Lock size={16} className="papido-input-lead-icon" />
                        <input
                          type={showForgotPass ? 'text' : 'password'}
                          required
                          className="papido-form-input"
                          placeholder="••••••••"
                          value={forgotNewPass}
                          onChange={(e) => setForgotNewPass(e.target.value)}
                        />
                        <button
                          type="button"
                          className="papido-trail-btn"
                          onClick={() => setShowForgotPass((v) => !v)}
                        >
                          {showForgotPass ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    <div className="papido-field-group">
                      <label className="papido-input-label">Confirm</label>
                      <div className="papido-input-shell">
                        <Lock size={16} className="papido-input-lead-icon" />
                        <input
                          type={showForgotPass ? 'text' : 'password'}
                          required
                          className="papido-form-input"
                          placeholder="••••••••"
                          value={forgotConfirmPass}
                          onChange={(e) => setForgotConfirmPass(e.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="papido-primary-btn"
                      disabled={loading}
                    >
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginView;
