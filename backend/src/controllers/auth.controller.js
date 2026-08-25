const AuthService = require('../services/auth.service');
const { success, error } = require('../utils/response');

const AuthController = {
  async register(req, res, next) {
    try {
      const {
        name,
        email,
        phone,
        gender,
        password,
        role,
        profileImage,
        profileData,
        vehicleType,
        vehicleModel,
        vehicleNumber,
        licenseNumber,
        collegeIdNumber,
        licenseDocUrl,
        rcDocUrl,
        collegeIdDocUrl
      } = req.body;

      if (!name || !email || !phone || !password || !role) {
        return error(res, 'Name, email, phone, password, and role are required fields.', 400);
      }

      const cleanName = name.trim().toUpperCase();
      if (cleanName.length < 2) {
        return error(res, 'Full Name must be at least 2 characters.', 400);
      }

      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return error(res, 'Please provide a valid email address.', 400);
      }

      const cleanPhone = phone.trim().replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return error(res, 'Please provide a valid 10-digit mobile number.', 400);
      }

      if (password.length < 6) {
        return error(res, 'Password must be at least 6 characters.', 400);
      }

      const validGender = ['MALE', 'FEMALE', 'OTHER'].includes((gender || '').toUpperCase())
        ? gender.toUpperCase()
        : 'OTHER';

      const uniqueSuffix = Date.now().toString().slice(-6);
      const mergedProfileData = {
        ...(profileData || {}),
        profileImage: profileImage || (profileData && profileData.profileImage) || null,
        vehicleType: vehicleType || (profileData && profileData.vehicleType) || 'BIKE',
        vehicleModel: (vehicleModel || (profileData && profileData.vehicleModel) || '').trim().toUpperCase(),
        vehicleNumber: (vehicleNumber || (profileData && profileData.vehicleNumber) || `RC-DOC-${uniqueSuffix}`).trim().toUpperCase(),
        licenseNumber: (licenseNumber || (profileData && profileData.licenseNumber) || `DL-DOC-${uniqueSuffix}`).trim().toUpperCase(),
        collegeIdNumber: (collegeIdNumber || (profileData && profileData.collegeIdNumber) || `ID-DOC-${uniqueSuffix}`).trim().toUpperCase(),
        licenseDocUrl: licenseDocUrl || (profileData && profileData.licenseDocUrl) || null,
        rcDocUrl: rcDocUrl || (profileData && profileData.rcDocUrl) || null,
        collegeIdDocUrl: collegeIdDocUrl || (profileData && profileData.collegeIdDocUrl) || null
      };

      // If registering as Rider, validate Vehicle Model + 3 mandatory Document Uploads (bypassed for Core Members)
      if (role === 'RIDER' && !req.body.isCoreMember) {
        const missing = [];
        if (!mergedProfileData.vehicleModel) {
          missing.push('Vehicle Model (e.g. Honda Activa 6G / Splendor)');
        }
        if (!mergedProfileData.collegeIdDocUrl) missing.push('Campus / College ID Card (Upload)');
        if (!mergedProfileData.licenseDocUrl) missing.push('Driving Licence (Upload)');
        if (!mergedProfileData.rcDocUrl) missing.push('Vehicle RC Document (Upload)');

        if (missing.length > 0) {
          return error(res, `Mandatory Driver Requirements Missing: ${missing.join(', ')}. Please enter your Vehicle Model and upload all 3 documents.`, 400);
        }
      }

      const result = await AuthService.register({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        gender: validGender,
        password,
        role,
        isCoreMember: Boolean(req.body.isCoreMember),
        profileImage: mergedProfileData.profileImage,
        profileData: mergedProfileData
      });

      return success(res, 'Account registered successfully.', result, 201);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async registerCore(req, res, next) {
    try {
      const { name, email, phone, gender, password } = req.body;

      if (!name || !email || !phone || !password) {
        return error(res, 'Name, email, phone, and password are required to register as a Core Team member.', 400);
      }

      const validGender = ['MALE', 'FEMALE', 'OTHER'].includes((gender || '').toUpperCase())
        ? gender.toUpperCase()
        : 'OTHER';

      const result = await AuthService.register({
        name,
        email,
        phone,
        gender: validGender,
        password,
        role: 'RIDER',
        isCoreMember: true,
        profileData: {
          vehicleType: 'BIKE',
          vehicleModel: 'Papido Campus Bike',
          verificationStatus: 'APPROVED'
        }
      });

      return success(res, 'Welcome to Papido Core Team! Your driver account has been activated with fleet privileges.', result, 201);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password, expectedRole } = req.body;

      if (!email || !password) {
        return error(res, 'Email and password are required.', 400);
      }

      const result = await AuthService.login({
        email,
        password,
        expectedRole: expectedRole || null
      });

      return success(res, 'Login successful.', result, 200);
    } catch (err) {
      if (err.code === 'ACCOUNT_SUSPENDED') {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_SUSPENDED',
          message: err.message,
          suspensionReason: err.suspensionReason || 'Administrative action taken by campus administration.',
          statusCode: 403
        });
      }
      return error(res, err.message, 401);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return error(res, 'Refresh token is required.', 400);
      }

      const result = await AuthService.refreshToken(refreshToken);
      return success(res, 'Token refreshed successfully.', result, 200);
    } catch (err) {
      return error(res, err.message, 401);
    }
  },

  async getMe(req, res, next) {
    try {
      const user = req.user;
      let profile = null;

      if (user.role === 'RIDER') {
        const RiderModel = require('../models/rider.model');
        profile = await RiderModel.findByUserId(user.id);
      } else if (user.role === 'CUSTOMER') {
        const CustomerModel = require('../models/customer.model');
        profile = await CustomerModel.findByUserId(user.id);
      }

      return success(res, 'User profile fetched successfully.', { user, profile }, 200);
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const { name, phone, profileImage, vehicleType, vehicleModel, vehicleNumber, licenseNumber, upiId, upi_id } = req.body;
      const result = await AuthService.updateProfile(req.user.id, {
        name,
        phone,
        profileImage,
        vehicleType,
        vehicleModel,
        vehicleNumber,
        licenseNumber,
        upiId: upiId !== undefined ? upiId : upi_id
      });
      return success(res, 'Profile updated successfully.', result, 200);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword);
      return success(res, 'Password changed successfully.', result, 200);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) {
        return error(res, 'Email is required.', 400);
      }
      const EmailService = require('../services/email.service');
      const result = await EmailService.createAndSendPasswordResetOtp(email);
      return success(res, result.message, result, 200);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async verifyOtp(req, res, next) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return error(res, 'Email and OTP are required.', 400);
      }
      const EmailService = require('../services/email.service');
      const result = await EmailService.verifyOtp(email, otp);
      return success(res, result.message, result, 200);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return error(res, 'Email, OTP, and new password are required.', 400);
      }
      const EmailService = require('../services/email.service');
      const result = await EmailService.resetPasswordWithOtp(email, otp, newPassword);
      return success(res, result.message, result, 200);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async logout(req, res, next) {
    return success(res, 'Logged out successfully.', null, 200);
  }
};

module.exports = AuthController;
