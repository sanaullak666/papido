const db = require('../config/database');
const UserModel = require('../models/user.model');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

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
    const expiresAt = Date.now() + 15 * 60 * 1000;

    // Invalidate previous unused OTPs for this email
    await db.query('UPDATE password_resets SET used = 1 WHERE email = ? AND used = 0', [cleanEmail]);

    // Insert new OTP record
    await db.query(
      'INSERT INTO password_resets (email, otp, expires_at, used) VALUES (?, ?, ?, 0)',
      [cleanEmail, otp, expiresAt]
    );

    // Log high-visibility OTP banner for local debugging and zero-setup testing
    logger.info('================================================================');
    logger.info(`📧 [PASSWORD RESET OTP] For: ${cleanEmail}`);
    logger.info(`🔑 Verification OTP Code: >>> ${otp} <<< (Valid for 15 minutes)`);
    logger.info('================================================================');

    // Optional Nodemailer dispatch if SMTP environment variables are present
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const nodemailer = require('nodemailer');
        let transportConfig;
        
        if (process.env.SMTP_HOST && process.env.SMTP_HOST !== 'smtp.gmail.com') {
          transportConfig = {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          };
        } else {
          // Dedicated Gmail service preset for optimal reliability
          transportConfig = {
            service: 'gmail',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS.replace(/\s+/g, '') // remove any accidental spaces in app password
            }
          };
        }

        const transporter = nodemailer.createTransport(transportConfig);

        await transporter.sendMail({
          from: `"papidoapp" <${process.env.SMTP_USER}>`,
          to: cleanEmail,
          subject: 'Your papidoapp Password Reset Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0f172a; color: #ffffff; padding: 24px; border-radius: 12px;">
              <h2 style="color: #f59e0b; margin-top: 0;">papidoapp Password Reset</h2>
              <p>Hi ${user.name || 'there'},</p>
              <p>We received a request to reset your password. Use the following 6-digit verification code to reset your account password:</p>
              <div style="background: #1e293b; padding: 16px; text-align: center; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #f59e0b; margin: 20px 0;">
                ${otp}
              </div>
              <p style="font-size: 12px; color: #94a3b8;">This code is valid for 15 minutes. If you did not request a password reset, please ignore this email.</p>
            </div>
          `
        });
        logger.info(`✅ [EMAIL SENT] Verification OTP sent successfully via Gmail to: ${cleanEmail}`);
      } catch (mailErr) {
        logger.error(`❌ [EMAIL ERROR] Failed to send email via SMTP: ${mailErr.message}`);
      }
    } else {
      logger.warn('⚠️ [EMAIL NOTICE] SMTP_USER / SMTP_PASS not set in backend/.env. Real email not dispatched.');
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

    const expiresAtMs = Number(record.expires_at) || new Date(record.expires_at).getTime();
    if (Date.now() > expiresAtMs) {
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
}

module.exports = EmailService;
