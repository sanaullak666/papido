const db = require('../config/database');

const SettingsModel = {
  /**
   * Fetch all registration-related system settings
   */
  async getRegistrationSettings() {
    try {
      const rows = await db.query(`
        SELECT \`key\`, \`value\`, \`updated_at\` FROM system_settings 
        WHERE \`key\` IN (
          'REGISTRATION_MASTER_ENABLED',
          'PASSENGER_REGISTRATION_ENABLED',
          'RIDER_REGISTRATION_ENABLED',
          'WEB_REGISTRATION_ENABLED',
          'REGISTRATION_BLOCKED_MESSAGE'
        )
      `);

      const map = {};
      let latestUpdated = null;
      if (Array.isArray(rows)) {
        for (const r of rows) {
          map[r.key] = r.value;
          if (r.updated_at && (!latestUpdated || new Date(r.updated_at) > new Date(latestUpdated))) {
            latestUpdated = r.updated_at;
          }
        }
      }

      return {
        masterEnabled: map['REGISTRATION_MASTER_ENABLED'] !== 'false',
        passengerEnabled: map['PASSENGER_REGISTRATION_ENABLED'] !== 'false',
        riderEnabled: map['RIDER_REGISTRATION_ENABLED'] !== 'false',
        webEnabled: map['WEB_REGISTRATION_ENABLED'] !== 'false',
        blockedMessage: map['REGISTRATION_BLOCKED_MESSAGE'] || 'Registrations are temporarily closed by campus administration.',
        updatedAt: latestUpdated || new Date().toISOString()
      };
    } catch (err) {
      console.warn('[SettingsModel] Failed to fetch registration settings, falling back to defaults:', err.message);
      return {
        masterEnabled: true,
        passengerEnabled: true,
        riderEnabled: true,
        webEnabled: true,
        blockedMessage: 'Registrations are temporarily closed by campus administration.',
        updatedAt: new Date().toISOString()
      };
    }
  },

  /**
   * Helper to upsert a system_setting key
   */
  async _upsertSetting(key, value, description) {
    try {
      const existing = await db.query('SELECT `key` FROM system_settings WHERE `key` = ?', [key]);
      if (existing && existing.length > 0) {
        await db.query('UPDATE system_settings SET `value` = ?, description = ? WHERE `key` = ?', [
          String(value),
          description || null,
          key
        ]);
      } else {
        await db.query('INSERT INTO system_settings (`key`, `value`, description) VALUES (?, ?, ?)', [
          key,
          String(value),
          description || null
        ]);
      }
    } catch (err) {
      console.error(`[SettingsModel] Failed to upsert setting ${key}:`, err.message);
      throw err;
    }
  },

  /**
   * Save registration settings
   */
  async saveRegistrationSettings({ masterEnabled, passengerEnabled, riderEnabled, webEnabled, blockedMessage }) {
    if (masterEnabled !== undefined) {
      await this._upsertSetting(
        'REGISTRATION_MASTER_ENABLED',
        Boolean(masterEnabled),
        'Master kill-switch for platform-wide registrations'
      );
    }

    if (passengerEnabled !== undefined) {
      await this._upsertSetting(
        'PASSENGER_REGISTRATION_ENABLED',
        Boolean(passengerEnabled),
        'Controls whether new passenger/customer accounts can register'
      );
    }

    if (riderEnabled !== undefined) {
      await this._upsertSetting(
        'RIDER_REGISTRATION_ENABLED',
        Boolean(riderEnabled),
        'Controls whether new rider/driver accounts can register'
      );
    }

    if (webEnabled !== undefined) {
      await this._upsertSetting(
        'WEB_REGISTRATION_ENABLED',
        Boolean(webEnabled),
        'Controls whether registrations are permitted from the web portal'
      );
    }

    if (blockedMessage !== undefined && typeof blockedMessage === 'string') {
      await this._upsertSetting(
        'REGISTRATION_BLOCKED_MESSAGE',
        blockedMessage.trim() || 'Registrations are temporarily closed by campus administration.',
        'Custom notice message displayed when registrations are disabled'
      );
    }

    return this.getRegistrationSettings();
  },

  /**
   * Check whether registration is allowed for a given role & platform
   */
  async checkRegistrationAllowed({ role, isWeb }) {
    const settings = await this.getRegistrationSettings();

    // 1. Master platform kill-switch
    if (!settings.masterEnabled) {
      return {
        allowed: false,
        reason: 'MASTER_BLOCKED',
        message: settings.blockedMessage || 'Registrations are currently closed by administration.'
      };
    }

    // 2. Role-specific check
    const normalizedRole = (role || '').toUpperCase();
    if (normalizedRole === 'CUSTOMER' && !settings.passengerEnabled) {
      return {
        allowed: false,
        reason: 'PASSENGER_BLOCKED',
        message: settings.blockedMessage || 'Passenger registration is currently closed by administration.'
      };
    }

    if (normalizedRole === 'RIDER' && !settings.riderEnabled) {
      return {
        allowed: false,
        reason: 'RIDER_BLOCKED',
        message: settings.blockedMessage || 'Rider driver registration is currently closed by administration.'
      };
    }

    // 3. Web platform check
    if (isWeb && !settings.webEnabled) {
      return {
        allowed: false,
        reason: 'WEB_BLOCKED',
        message: 'Web registration is currently disabled. Please download or use the Papido mobile app to sign up.'
      };
    }

    return {
      allowed: true,
      settings
    };
  }
};

module.exports = SettingsModel;
