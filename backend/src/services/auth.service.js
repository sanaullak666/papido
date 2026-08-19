const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/environment');
const { ROLES, USER_STATUS, VERIFICATION_STATUS } = require('../config/constants');
const UserModel = require('../models/user.model');
const RiderModel = require('../models/rider.model');
const CustomerModel = require('../models/customer.model');
const AuditModel = require('../models/audit.model');

const AuthService = {
  /**
   * Hashes plain-text password using bcrypt
   */
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  },

  /**
   * Compares plain-text password with hash
   */
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  },

  /**
   * Generates JWT Access Token
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        name: user.name,
        gender: user.gender || 'OTHER'
      },
      env.JWT.SECRET,
      { expiresIn: env.JWT.EXPIRES_IN }
    );
  },

  /**
   * Generates JWT Refresh Token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id, role: user.role },
      env.JWT.REFRESH_SECRET,
      { expiresIn: env.JWT.REFRESH_EXPIRES_IN }
    );
  },

  /**
   * Registers a new user with their role-specific profile
   */
  async register({ name, email, phone, gender = 'OTHER', password, role, profileImage = null, profileData = {} }) {
    if (![ROLES.CUSTOMER, ROLES.RIDER, ROLES.ADMIN].includes(role)) {
      throw new Error(`Invalid role '${role}'. Must be CUSTOMER, RIDER, or ADMIN.`);
    }

    // Check existing email
    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail) {
      throw new Error('An account with this email address already exists.');
    }

    // Check existing phone
    const existingPhone = await UserModel.findByPhone(phone);
    if (existingPhone) {
      throw new Error('An account with this phone number already exists.');
    }

    const validGender = ['MALE', 'FEMALE', 'OTHER'].includes((gender || '').toUpperCase())
      ? gender.toUpperCase()
      : 'OTHER';

    const passwordHash = await this.hashPassword(password);
    const userStatus = role === ROLES.RIDER ? USER_STATUS.ACTIVE : USER_STATUS.ACTIVE;

    // Create User record
    const user = await UserModel.create({
      name,
      email,
      phone,
      gender: validGender,
      passwordHash,
      role,
      status: userStatus,
      profileImage: profileImage || profileData.profileImage || null
    });

    // Create specific profile based on role
    let profile = null;
    try {
      if (role === ROLES.RIDER) {
        // Rider means the DRIVER who provides the ride
        profile = await RiderModel.createProfile({
          userId: user.id,
          vehicleType: profileData.vehicleType || 'BIKE',
          vehicleNumber: profileData.vehicleNumber || `KA-01-XX-${Math.floor(1000 + Math.random() * 9000)}`,
          vehicleModel: profileData.vehicleModel || 'Standard Two-Wheeler',
          licenseNumber: profileData.licenseNumber || `DL-${Date.now().toString().slice(-10)}`,
          licenseDocUrl: profileData.licenseDocUrl || null,
          rcDocUrl: profileData.rcDocUrl || null,
          collegeIdDocUrl: profileData.collegeIdDocUrl || null,
          verificationStatus: VERIFICATION_STATUS.PENDING // Requires admin approval
        });
      } else if (role === ROLES.CUSTOMER) {
        // Customer means the PASSENGER who books the ride
        profile = await CustomerModel.createProfile({
          userId: user.id,
          walletBalance: 100.00 // Welcome promotional balance
        });
      }
    } catch (profileErr) {
      // Rollback user creation to prevent orphaned user records
      try {
        await UserModel.delete(user.id);
      } catch (_) {}

      if (profileErr.message.includes('vehicle_number') || profileErr.message.includes('UNIQUE constraint failed: rider_profiles.vehicle_number')) {
        throw new Error('This vehicle registration number is already registered with another driver.');
      }
      if (profileErr.message.includes('license_number') || profileErr.message.includes('UNIQUE constraint failed: rider_profiles.license_number')) {
        throw new Error('This driving license number is already registered with another driver.');
      }
      throw new Error(`Registration profile setup failed: ${profileErr.message}`);
    }

    // Audit log
    await AuditModel.log({
      userId: user.id,
      action: 'USER_REGISTER',
      entityType: 'USER',
      entityId: user.id,
      details: { role, email, gender: validGender }
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender || validGender,
        role: user.role,
        status: user.status,
        profileImage: user.profile_image
      },
      profile,
      accessToken,
      refreshToken
    };
  },

  /**
   * Authenticates user and verifies role
   */
  async login({ email, password, expectedRole = null }) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isMatch = await this.comparePassword(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    if (user.status === USER_STATUS.SUSPENDED) {
      const reasonText = user.suspension_reason && user.suspension_reason.trim().length > 0
        ? user.suspension_reason.trim()
        : 'Administrative action taken by campus administration.';
      const err = new Error(`Your account has been suspended: ${reasonText}`);
      err.code = 'ACCOUNT_SUSPENDED';
      err.statusCode = 403;
      err.suspensionReason = reasonText;
      throw err;
    }

    if (user.status === USER_STATUS.INACTIVE) {
      throw new Error('Your account is inactive. Please contact support.');
    }

    // Role check if expectedRole specified
    if (expectedRole && user.role !== expectedRole) {
      throw new Error(`Unauthorized: Account role is ${user.role}, but ${expectedRole} login was requested.`);
    }

    // Fetch role profile
    let profile = null;
    if (user.role === ROLES.RIDER) {
      profile = await RiderModel.findByUserId(user.id);
    } else if (user.role === ROLES.CUSTOMER) {
      profile = await CustomerModel.findByUserId(user.id);
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    await AuditModel.log({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender || 'OTHER',
        role: user.role,
        status: user.status,
        suspensionReason: user.suspension_reason || null,
        profileImage: user.profile_image
      },
      profile,
      accessToken,
      refreshToken
    };
  },

  async updateProfile(userId, { name, phone, profileImage, vehicleType, vehicleModel, vehicleNumber, licenseNumber }) {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('User not found.');

    const updatedUser = await UserModel.updateProfile(userId, {
      name,
      phone,
      profileImage
    });

    let profile = null;
    if (user.role === ROLES.RIDER) {
      if (vehicleType || vehicleModel || vehicleNumber || licenseNumber) {
        profile = await RiderModel.updateVehicleDetails(userId, {
          vehicleType,
          vehicleModel,
          vehicleNumber,
          licenseNumber
        });
      } else {
        profile = await RiderModel.findByUserId(userId);
      }
    } else if (user.role === ROLES.CUSTOMER) {
      profile = await CustomerModel.findByUserId(userId);
    }

    return {
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.status,
        profileImage: updatedUser.profile_image
      },
      profile
    };
  },

  async changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required.');
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const fullUser = await db.queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!fullUser) throw new Error('User not found.');

    const isMatch = await this.comparePassword(currentPassword, fullUser.password_hash);
    if (!isMatch) {
      throw new Error('Current password is incorrect.');
    }

    const newHash = await this.hashPassword(newPassword);
    await UserModel.updatePassword(userId, newHash);
    return { success: true, message: 'Password changed successfully.' };
  },

  /**
   * Refreshes access token with valid refresh token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT.REFRESH_SECRET);
      const user = await UserModel.findById(decoded.id);
      if (!user || user.status !== USER_STATUS.ACTIVE) {
        throw new Error('Invalid user or account suspended.');
      }
      const newAccessToken = this.generateAccessToken(user);
      return { accessToken: newAccessToken };
    } catch (err) {
      throw new Error('Invalid or expired refresh token.');
    }
  }
};

module.exports = AuthService;
