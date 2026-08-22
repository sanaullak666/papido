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
    const smtpUser = env.SMTP?.USER || process.env.SMTP_USER || 'sanaullak294@gmail.com';
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
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #FAF5EE; color: #271E16; padding: 32px 24px; border-radius: 16px; border: 1.5px solid #E8DCCB;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #F97316, #EA580C); color: #FFFFFF; font-size: 28px; font-weight: 900; width: 60px; height: 60px; line-height: 60px; border-radius: 16px; margin-bottom: 12px; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.3);">P</div>
                <h2 style="color: #271E16; margin: 0; font-size: 22px; font-weight: 800;">Password Reset Request</h2>
                <p style="color: #796D61; font-size: 13px; margin-top: 4px;">Pondicherry University Campus Mobility</p>
              </div>

              <div style="background: #FFFFFF; padding: 24px; border-radius: 12px; border: 1px solid #E8DCCB; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                <p style="font-size: 15px; margin-top: 0;">Hi <strong>${user.name || 'Student/Driver'}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.6; color: #4B3F33;">
                  We received a request to reset the password for your Papido account (<strong>${cleanEmail}</strong>).
                </p>
                <p style="font-size: 14px; color: #4B3F33;">Use the 6-digit verification code below to complete the reset:</p>

                <div style="background: #FFF7ED; border: 2px dashed #EA580C; padding: 18px; text-align: center; border-radius: 12px; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #EA580C; margin: 20px 0;">
                  ${otp}
                </div>

                <p style="font-size: 12px; color: #796D61; margin-bottom: 0; line-height: 1.5;">
                  ⏱️ <strong>Note:</strong> This verification code will expire in <strong>15 minutes</strong>. If you did not request this change, you can safely ignore this email.
                </p>
              </div>

              <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #A89B8C;">
                &copy; ${new Date().getFullYear()} Papido Campus Mobility &bull; Secure Account Services
              </div>
            </div>
          `
        });
        logger.info(`✅ [EMAIL SENT] Verification OTP sent successfully via Gmail to: ${cleanEmail}`);
      } catch (mailErr) {
        logger.error(`❌ [EMAIL ERROR] Failed to send email via SMTP: ${mailErr.message}`);
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
}

module.exports = EmailService;
