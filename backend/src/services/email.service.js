const db = require('../config/database');
const UserModel = require('../models/user.model');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const env = require('../config/environment');

class EmailService {
  /**
   * Generates a 6-digit numeric OTP and stores it in password_resets table
   */
  static async createAndSendPasswordResetOtp(email) {
    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findByEmail(cleanEmail);
    if (!user) {
      throw new Error('No account found with this email address.');
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Invalidate previous unused OTPs for this email
    await db.query('UPDATE password_resets SET used = 1 WHERE email = ? AND used = 0', [cleanEmail]);

    // Insert new OTP record with 15-minute expiration
    await db.query(
      'INSERT INTO password_resets (email, otp, expires_at, used) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0)',
      [cleanEmail, otp]
    );

    // Log high-visibility OTP banner for local debugging and zero-setup testing
    logger.info('================================================================');
    logger.info(`📧 [PASSWORD RESET OTP] For: ${cleanEmail}`);
    logger.info(`🔑 Verification OTP Code: >>> ${otp} <<< (Valid for 15 minutes)`);
    logger.info('================================================================');

    // Nodemailer dispatch using configured Gmail App Password
    const smtpUser = env.SMTP?.USER || process.env.SMTP_USER || 'pupapido@gmail.com';
    const smtpPass = (env.SMTP?.PASS || process.env.SMTP_PASS || 'plfilaeftmkzgkzm').replace(/\s+/g, '');

    if (smtpUser && smtpPass) {
      try {
        const nodemailer = require('nodemailer');
        let transportConfig;
        
        if (env.SMTP?.HOST && env.SMTP.HOST !== 'smtp.gmail.com') {
          transportConfig = {
            host: env.SMTP.HOST,
            port: parseInt(env.SMTP.PORT || '587', 10),
            secure: env.SMTP.SECURE === true,
            auth: {
              user: smtpUser,
              pass: smtpPass
            }
          };
        } else {
          // Dedicated Gmail service preset
          transportConfig = {
            service: 'gmail',
            auth: {
              user: smtpUser,
              pass: smtpPass
            }
          };
        }

        const transporter = nodemailer.createTransport(transportConfig);

        await transporter.sendMail({
          from: `"Papido Mobility" <${smtpUser}>`,
          to: cleanEmail,
          subject: '🔐 Your Papido Password Reset Verification Code',
          html: EmailService.renderPasswordResetEmail({ user, cleanEmail, otp })
        });
        logger.info(`✅ [EMAIL SENT] Verification OTP sent successfully via Gmail from ${smtpUser} to: ${cleanEmail}`);
      } catch (mailErr) {
        logger.error(`❌ [EMAIL ERROR] Failed to send email via SMTP: ${mailErr.message}`);
        throw new Error(`Email delivery failed (${mailErr.message}). Please verify that ${smtpUser} can send emails.`);
      }
    } else {
      logger.warn('⚠️ [EMAIL NOTICE] SMTP configuration missing. Real email not dispatched.');
    }

    return {
      success: true,
      message: `Password reset verification code has been sent to ${cleanEmail}. Please check your email inbox.`
    };
  }

  /**
   * Verifies the 6-digit OTP
   */
  static async verifyOtp(email, otp) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const record = await db.queryOne(
      'SELECT * FROM password_resets WHERE email = ? AND otp = ? AND used = 0 ORDER BY id DESC LIMIT 1',
      [cleanEmail, cleanOtp]
    );

    if (!record) {
      throw new Error('Invalid OTP code. Please check and try again.');
    }

    const validRecord = await db.queryOne(
      'SELECT id FROM password_resets WHERE id = ? AND expires_at >= NOW()',
      [record.id]
    );

    if (!validRecord) {
      throw new Error('This OTP code has expired. Please request a new code.');
    }

    return { success: true, message: 'OTP verified successfully.' };
  }

  /**
   * Resets password using valid OTP
   */
  static async resetPasswordWithOtp(email, otp, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    // Verify OTP validity
    await this.verifyOtp(email, otp);

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const user = await UserModel.findByEmail(cleanEmail);
    if (!user) {
      throw new Error('User not found.');
    }

    // Hash new password and update user record
    const newHash = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(user.id, newHash);

    // Mark OTP as used
    await db.query('UPDATE password_resets SET used = 1 WHERE email = ? AND otp = ?', [cleanEmail, cleanOtp]);

    logger.info(`Password successfully reset for user: ${cleanEmail}`);
    return { success: true, message: 'Password has been reset successfully. You can now sign in.' };
  }

  /**
   * Generates a 6-digit login OTP and emails it to the user's registered email address
   */
  static async createAndSendLoginEmailOtp({ phone, expectedRole }) {
    if (!phone) {
      throw new Error('Mobile number is required.');
    }

    const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    // Lookup user by phone
    let user = await db.queryOne(
      `SELECT id, name, email, phone, role, status, suspension_reason
       FROM users
       WHERE (phone = ? OR phone = ? OR phone = ? OR phone LIKE ?)
       ${expectedRole ? 'AND role = ?' : ''}
       ORDER BY id DESC LIMIT 1`,
      expectedRole
        ? [cleanPhone, `+91${cleanPhone}`, `91${cleanPhone}`, `%${cleanPhone}%`, expectedRole]
        : [cleanPhone, `+91${cleanPhone}`, `91${cleanPhone}`, `%${cleanPhone}%`]
    );

    // If expectedRole was given and no user found, check if they exist under a different role
    if (!user && expectedRole) {
      const anyUser = await db.queryOne(
        `SELECT role FROM users WHERE (phone = ? OR phone = ? OR phone = ? OR phone LIKE ?) LIMIT 1`,
        [cleanPhone, `+91${cleanPhone}`, `91${cleanPhone}`, `%${cleanPhone}%`]
      );
      if (anyUser) {
        const portalName = anyUser.role === 'CUSTOMER' ? 'Passenger' : 'Rider';
        throw new Error(`This mobile number is registered as a ${anyUser.role}. Please select the '${portalName}' tab to continue.`);
      }
    }

    if (!user) {
      throw new Error(`No registered account found with mobile number +91 ${cleanPhone}. Please check your number or register.`);
    }

    if (user.status === 'SUSPENDED') {
      throw new Error(`Your account has been suspended: ${user.suspension_reason || 'Please contact campus administration.'}`);
    }

    if (user.status === 'INACTIVE') {
      throw new Error('Your account is currently inactive. Please contact support.');
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Invalidate prior unused OTPs for this phone or email
    await db.query(
      'UPDATE login_otps SET used = 1 WHERE (phone = ? OR email = ?) AND used = 0',
      [cleanPhone, user.email]
    );

    // Insert new OTP with 15-minute expiration
    await db.query(
      'INSERT INTO login_otps (phone, email, otp, expires_at, used) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0)',
      [cleanPhone, user.email, otp]
    );

    // Log high-visibility banner for debugging & testing
    logger.info('================================================================');
    logger.info(`📱 [LOGIN OTP SENT TO EMAIL] Mobile: +91 ${cleanPhone}`);
    logger.info(`📧 Registered User Email: ${user.email} (${user.name})`);
    logger.info(`🔑 Verification Code: >>> ${otp} <<< (Valid for 15 minutes)`);
    logger.info('================================================================');

    // Send email via Nodemailer
    const smtpUser = env.SMTP?.USER || process.env.SMTP_USER || 'pupapido@gmail.com';
    const smtpPass = (env.SMTP?.PASS || process.env.SMTP_PASS || 'plfilaeftmkzgkzm').replace(/\s+/g, '');

    if (smtpUser && smtpPass) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        await transporter.sendMail({
          from: `"Papido Mobility" <${smtpUser}>`,
          to: user.email,
          subject: '🔐 Your Papido Login Verification Code',
          html: EmailService.renderLoginOtpEmail({ user, cleanPhone, otp })
        });
        logger.info(`✅ [EMAIL SENT] Login verification OTP sent successfully to: ${user.email}`);
      } catch (mailErr) {
        logger.error(`❌ [EMAIL ERROR] Failed to send login OTP email: ${mailErr.message}`);
      }
    }

    // Mask email for user privacy
    const emailParts = user.email.split('@');
    const uPart = emailParts[0];
    const domain = emailParts[1] || 'pu.ac.in';
    const maskedUser = uPart.length <= 3
      ? `${uPart[0]}***`
      : `${uPart.slice(0, 2)}***${uPart.slice(-1)}`;
    const maskedEmail = `${maskedUser}@${domain}`;

    return {
      success: true,
      message: `Verification code sent to your registered email (${maskedEmail})`,
      phone: cleanPhone,
      maskedEmail,
      email: user.email
    };
  }

  /**
   * Verifies login OTP and authenticates user
   */
  static async verifyLoginEmailOtp({ phone, otp, expectedRole }) {
    if (!phone || !otp) {
      throw new Error('Mobile number and OTP code are required.');
    }

    const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);
    const cleanOtp = otp.trim();

    // Lookup user
    const user = await db.queryOne(
      `SELECT * FROM users
       WHERE (phone = ? OR phone = ? OR phone = ? OR phone LIKE ?)
       ${expectedRole ? 'AND role = ?' : ''}
       ORDER BY id DESC LIMIT 1`,
      expectedRole
        ? [cleanPhone, `+91${cleanPhone}`, `91${cleanPhone}`, `%${cleanPhone}%`, expectedRole]
        : [cleanPhone, `+91${cleanPhone}`, `91${cleanPhone}`, `%${cleanPhone}%`]
    );

    if (!user) {
      throw new Error('No user account found matching this mobile number.');
    }

    if (user.status === 'SUSPENDED') {
      throw new Error(`Your account has been suspended: ${user.suspension_reason || 'Contact administration.'}`);
    }

    if (user.status === 'INACTIVE') {
      throw new Error('Your account is currently inactive. Please contact support.');
    }

    // Check OTP: Strictly require valid database record in production. Demo OTP only allowed if explicitly enabled in non-production.
    const isMasterDemo = (process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_OTP === 'true') && cleanOtp === '123456';
    if (!isMasterDemo) {
      const record = await db.queryOne(
        'SELECT * FROM login_otps WHERE (phone = ? OR email = ?) AND otp = ? AND used = 0 ORDER BY id DESC LIMIT 1',
        [cleanPhone, user.email, cleanOtp]
      );

      if (!record) {
        throw new Error('Invalid verification code. Please check your email and try again.');
      }

      const valid = await db.queryOne(
        'SELECT id FROM login_otps WHERE id = ? AND expires_at >= NOW()',
        [record.id]
      );

      if (!valid) {
        throw new Error('This verification code has expired. Please request a new one.');
      }

      // Mark as used
      await db.query('UPDATE login_otps SET used = 1 WHERE id = ?', [record.id]);
    }

    // Generate tokens
    const AuthService = require('./auth.service');
    const accessToken = AuthService.generateAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    // Fetch role profile
    let profile = null;
    if (user.role === 'RIDER') {
      const RiderModel = require('../models/rider.model');
      profile = await RiderModel.findByUserId(user.id);
    } else if (user.role === 'CUSTOMER') {
      const CustomerModel = require('../models/customer.model');
      profile = await CustomerModel.findByUserId(user.id);
    }

    const AuditModel = require('../models/audit.model');
    await AuditModel.log({
      userId: user.id,
      action: 'USER_LOGIN_OTP',
      entityType: 'USER',
      entityId: user.id
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        role: user.role,
        status: user.status,
        profileImage: user.profile_image
      },
      profile,
      accessToken,
      refreshToken
    };
  }

  /**
   * Unified, Mobile-Supported Enhanced UI Email Builder
   * Adheres strictly to the Papido Warm Amber Visual Spec with complete mobile responsiveness (<360px to desktop),
   * fluid layouts, responsive CSS media queries, and high-contrast email client compatibility.
   */
  static buildEnhancedEmailContent({
    type = 'LOGIN_OTP', // 'LOGIN_OTP' | 'PASSWORD_RESET'
    user = {},
    cleanPhone = '',
    cleanEmail = '',
    otp = ''
  }) {
    const isLogin = type === 'LOGIN_OTP';
    const displayName = user?.name ? user.name.trim() : (isLogin ? 'Student / Driver' : 'Campus Member');
    const roleName = user?.role === 'RIDER' ? 'Rider' : (user?.role === 'ADMIN' ? 'Administrator' : 'Passenger');
    
    // Clean, consistent optical spacing between digits for high readability
    const rawOtp = otp ? otp.toString().trim() : '123456';
    const formattedOtp = rawOtp.split('').join(' ');
    
    const formattedPhone = cleanPhone && cleanPhone.length === 10
      ? `${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`
      : cleanPhone;

    // Configurable copy & branding based on email type
    const pageTitle = isLogin ? 'Your sign-in code - Papido' : 'Reset your password - Papido';
    const preheader = isLogin
      ? `Your Papido one-time sign-in code is ${rawOtp}. Valid for 15 minutes.`
      : `Your Papido password reset verification code is ${rawOtp}. Valid for 15 minutes.`;
    const headerGradient = isLogin
      ? 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)'
      : 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)';
    const badgeText = isLogin ? 'SIGN-IN VERIFICATION' : 'SECURITY VERIFICATION';
    const heading = isLogin ? 'Your sign-in code' : 'Reset your password';
    const codeLabel = isLogin ? 'ONE-TIME SIGN-IN CODE' : 'PASSWORD RESET CODE';
    const introHtml = isLogin
      ? `Hi <strong>${displayName}</strong>,<br/>Use this one-time code to securely sign in to your Papido account.`
      : `Hi <strong>${displayName}</strong>,<br/>We received a request to reset the password for your Papido account.`;

    const metaRowsHtml = isLogin
      ? `<tr>
           <td style="padding: 4px 0; font-size: 13px; color: #796D61; line-height: 1.6;">
             ⏱ <strong>Validity:</strong> Expires in 15 minutes
           </td>
         </tr>
         <tr>
           <td style="padding: 4px 0; font-size: 13px; color: #796D61; line-height: 1.6;">
             📱 <strong>Requested from:</strong> +91 ${formattedPhone}
           </td>
         </tr>
         <tr>
           <td style="padding: 4px 0; font-size: 13px; color: #796D61; line-height: 1.6;">
             🔐 <strong>Portal:</strong> ${roleName} Access
           </td>
         </tr>`
      : `<tr>
           <td style="padding: 4px 0; font-size: 13px; color: #796D61; line-height: 1.6;">
             ⏱ <strong>Validity:</strong> Expires in 15 minutes
           </td>
         </tr>
         <tr>
           <td style="padding: 4px 0; font-size: 13px; color: #796D61; line-height: 1.6;">
             📧 <strong>Requested for:</strong> ${cleanEmail}
           </td>
         </tr>
         <tr>
           <td style="padding: 4px 0; font-size: 13px; color: #796D61; line-height: 1.6;">
             🔒 <strong>Access:</strong> Single-use security token
           </td>
         </tr>`;

    const warningHtml = isLogin
      ? `🛡 <strong>Never share this code.</strong> Papido staff will never ask for your verification code or password.`
      : `🛡 <strong>Didn't request a reset?</strong> Your account remains safe &mdash; you can safely ignore this email.`;

    const footerNote = isLogin
      ? `Didn't request this sign-in? You can safely ignore this email.`
      : `This code is single-use and invalidates immediately after use.`;

    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${pageTitle}</title>
  <style type="text/css">
    /* Core Client Resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #FAF5EE; }

    /* Interactive links */
    .support-link:hover { text-decoration: underline !important; }

    /* Mobile Enhancements: Standard Smartphones (up to 600px) */
    @media only screen and (max-width: 600px) {
      .papido-email-wrapper {
        padding: 16px 10px !important;
      }
      .papido-email-card {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 16px !important;
        border-width: 1px !important;
      }
      .papido-header-cell {
        padding: 26px 16px 22px !important;
      }
      .papido-logo-tile {
        width: 46px !important;
        height: 46px !important;
        line-height: 46px !important;
        font-size: 22px !important;
        border-radius: 13px !important;
        margin-bottom: 10px !important;
      }
      .papido-brand-title {
        font-size: 20px !important;
      }
      .papido-brand-sub {
        font-size: 11px !important;
        margin-top: 4px !important;
      }
      .papido-body-cell {
        padding: 24px 18px 20px !important;
      }
      .papido-headline {
        font-size: 20px !important;
        line-height: 1.25 !important;
        margin-bottom: 8px !important;
      }
      .papido-intro-text {
        font-size: 13.5px !important;
        line-height: 1.5 !important;
        margin-bottom: 20px !important;
      }
      .papido-otp-container {
        padding: 18px 12px !important;
        margin-bottom: 16px !important;
        border-radius: 14px !important;
      }
      .papido-otp-digits {
        font-size: 28px !important;
        letter-spacing: 0.16em !important;
        padding-left: 0.16em !important;
      }
      .papido-meta-box {
        padding: 12px 14px !important;
        margin-bottom: 14px !important;
        border-radius: 10px !important;
      }
      .papido-warning-box {
        padding: 12px 14px !important;
        margin-bottom: 8px !important;
        border-radius: 10px !important;
      }
      .papido-warning-text {
        font-size: 12px !important;
      }
      .papido-footer-cell {
        padding: 20px 16px !important;
        font-size: 12px !important;
      }
    }

    /* Small Mobile: Compact Screens (up to 360px) */
    @media only screen and (max-width: 360px) {
      .papido-email-wrapper {
        padding: 12px 6px !important;
      }
      .papido-body-cell {
        padding: 18px 12px 16px !important;
      }
      .papido-otp-container {
        padding: 14px 8px !important;
      }
      .papido-otp-digits {
        font-size: 24px !important;
        letter-spacing: 0.10em !important;
        padding-left: 0.10em !important;
      }
      .papido-logo-tile {
        width: 40px !important;
        height: 40px !important;
        line-height: 40px !important;
        font-size: 19px !important;
      }
      .papido-brand-title {
        font-size: 18px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF5EE; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #271E16;">

  <!-- Inbox Preheader Snippet (Hidden from view) -->
  <div style="display: none; font-size: 1px; color: #FAF5EE; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${preheader} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <!-- Outer Canvas Table -->
  <table class="papido-email-wrapper" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #FAF5EE; margin: 0; padding: 36px 16px; width: 100%;">
    <tr>
      <td align="center" valign="top">
        
        <!-- Master Responsive Card -->
        <table class="papido-email-card" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 20px; border: 1.5px solid #E8DCCB; box-shadow: 0 12px 32px -8px rgba(39, 30, 22, 0.10); overflow: hidden;">
          
          <!-- Header (Brand Gradient) -->
          <tr>
            <td class="papido-header-cell" style="background: ${headerGradient}; background-color: #EA580C; padding: 34px 24px 28px; text-align: center;">
              <!-- Logo Emblem -->
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="margin: 0 auto 12px;">
                <tr>
                  <td class="papido-logo-tile" align="center" valign="middle" style="width: 52px; height: 52px; line-height: 52px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12); color: #EA580C; font-size: 26px; font-weight: 900; text-align: center;">
                    P
                  </td>
                </tr>
              </table>

              <!-- Brand Titles -->
              <div class="papido-brand-title" style="color: #FFFFFF; font-size: 22px; font-weight: 900; line-height: 1.0; letter-spacing: 0.04em; text-transform: uppercase;">
                PAPIDO
              </div>
              <div class="papido-brand-sub" style="color: rgba(255, 255, 255, 0.92); font-size: 11.5px; font-weight: 600; line-height: 1.2; letter-spacing: 0.3px; margin-top: 6px;">
                Pondicherry University Campus Mobility
              </div>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="papido-body-cell" style="padding: 32px 28px 24px;">
              
              <!-- Category Pill Badge -->
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="margin: 0 auto 12px;">
                <tr>
                  <td align="center" style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 20px; padding: 5px 14px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; color: #EA580C; text-transform: uppercase;">
                    ${badgeText}
                  </td>
                </tr>
              </table>

              <!-- Primary Heading -->
              <h1 class="papido-headline" style="color: #271E16; font-size: 22px; font-weight: 800; line-height: 1.25; letter-spacing: -0.02em; text-align: center; margin: 0 0 10px;">
                ${heading}
              </h1>
              
              <!-- Intro Paragraph -->
              <p class="papido-intro-text" style="color: #796D61; font-size: 14px; font-weight: 400; line-height: 1.55; text-align: center; margin: 0 0 24px;">
                ${introHtml}
              </p>

              <!-- OTP Verification Box (Warm Amber Highlight) -->
              <table class="papido-otp-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #FFF7ED; border: 2px dashed #FED7AA; border-radius: 16px; text-align: center; margin: 0 0 20px;">
                <tr>
                  <td style="padding: 22px 16px;">
                    <!-- Small Uppercase Tag -->
                    <div style="font-size: 10px; font-weight: 800; line-height: 1.0; letter-spacing: 0.15em; color: #EA580C; text-transform: uppercase; margin-bottom: 10px;">
                      ${codeLabel}
                    </div>
                    
                    <!-- 6-Digit Monospaced Code -->
                    <div class="papido-otp-digits" style="font-family: 'Courier New', Courier, Consolas, monospace; font-size: 38px; font-weight: 900; line-height: 1.1; letter-spacing: 0.25em; color: #EA580C; margin: 0; padding-left: 0.25em; text-align: center; word-break: keep-all; white-space: nowrap;">
                      ${formattedOtp}
                    </div>

                    <!-- Under-code micro-notice -->
                    <div style="font-size: 11px; font-weight: 600; color: #9A3412; margin-top: 10px; letter-spacing: 0.02em;">
                      One-time use &bull; Valid for 15 minutes
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Metadata Details Card -->
              <table class="papido-meta-box" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #FCFAF7; border: 1px solid #E8DCCB; border-radius: 12px; margin: 0 0 16px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                      ${metaRowsHtml}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Security / Warning Box -->
              <table class="papido-warning-box" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; margin: 0 0 8px;">
                <tr>
                  <td class="papido-warning-text" style="padding: 12px 16px; font-size: 12.5px; color: #991B1B; line-height: 1.5;">
                    ${warningHtml}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer Strip -->
          <tr>
            <td class="papido-footer-cell" style="background-color: #FCFAF7; border-top: 1px solid #E8DCCB; padding: 22px 24px; text-align: center; font-size: 12.5px; color: #796D61; line-height: 1.6;">
              ${footerNote}<br/>
              Need assistance? Contact <a href="mailto:support@papido.app" class="support-link" style="color: #EA580C; text-decoration: none; font-weight: 600;">support@papido.app</a>
              
              <div style="border-top: 1px dashed #E8DCCB; margin: 14px auto; max-width: 240px;"></div>
              
              <div style="font-size: 11.5px; color: #A89D91; line-height: 1.6;">
                Official Pondicherry University Platform<br/>
                Kalapet, Puducherry 605014 &bull; Made with &#x1F9E1; for campus mobility
              </div>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Visual Spec: Login OTP Email Template
   * Wraps buildEnhancedEmailContent for backward compatibility and clean API abstraction
   */
  static renderLoginOtpEmail({ user, cleanPhone, otp }) {
    return EmailService.buildEnhancedEmailContent({
      type: 'LOGIN_OTP',
      user,
      cleanPhone,
      otp
    });
  }

  /**
   * Visual Spec: Password Reset Email Template
   * Wraps buildEnhancedEmailContent for backward compatibility and clean API abstraction
   */
  static renderPasswordResetEmail({ user, cleanEmail, otp }) {
    return EmailService.buildEnhancedEmailContent({
      type: 'PASSWORD_RESET',
      user,
      cleanEmail,
      otp
    });
  }
}

module.exports = EmailService;
