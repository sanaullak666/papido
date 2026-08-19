const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

let dbHost = process.env.DB_HOST || '127.0.0.1';
let dbPort = parseInt(process.env.DB_PORT, 10) || 3306;
let dbUser = process.env.DB_USER || 'root';
let dbPassword = process.env.DB_PASSWORD || '';
let dbName = process.env.DB_NAME || 'papido_db';
let dbSsl = process.env.DB_SSL === 'true';

const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.TIDB_URL;
if (dbUrl) {
  try {
    const parsed = new URL(dbUrl);
    dbHost = parsed.hostname || dbHost;
    dbPort = parseInt(parsed.port, 10) || dbPort;
    dbUser = decodeURIComponent(parsed.username) || dbUser;
    dbPassword = decodeURIComponent(parsed.password) || dbPassword;
    const rawPath = parsed.pathname.replace(/^\//, '');
    if (rawPath && rawPath !== 'sys' && rawPath !== 'mysql' && rawPath !== 'information_schema') {
      dbName = rawPath;
    }
    if (dbHost.includes('tidbcloud.com') || dbHost.includes('aws') || dbUrl.includes('ssl=')) {
      dbSsl = true;
    }
  } catch (e) {
    console.error('Failed to parse database connection URL:', e.message);
  }
}

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_NAME: process.env.APP_NAME || 'Papido',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  DB: {
    HOST: dbHost,
    PORT: dbPort,
    USER: dbUser,
    PASSWORD: dbPassword,
    NAME: dbName,
    SSL: dbSsl,
    CONNECTION_LIMIT: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10
  },

  JWT: {
    SECRET: process.env.JWT_SECRET || 'papido_super_secure_jwt_secret_key_2026_production_ready_xyz987',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'papido_super_secure_refresh_token_secret_2026_abc123',
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 50000
  },

  MAP: {
    PROVIDER: process.env.MAP_PROVIDER || 'osm',
    API_KEY: process.env.MAP_API_KEY || ''
  },

  PAYMENT: {
    GATEWAY: process.env.PAYMENT_GATEWAY || 'mock',
    API_KEY: process.env.PAYMENT_API_KEY || '',
    API_SECRET: process.env.PAYMENT_API_SECRET || ''
  },

  VAPID: {
    PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || 'BGFugS6k-KrKIMVzt5Y6_vXVg-x84AhVBPexrqFMSYq8L2LMUyb6l6yA_dafnffFqvOIT9esp5T3VpfIEPtD00M',
    PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || 'nUJ4aoGkh--wYlmvP9uE1qZi5H69vo1GRJEyZNfzpow',
    SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@papido.com'
  },

  PUSH_NOTIFICATION_KEY: process.env.PUSH_NOTIFICATION_KEY || ''
};
