const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Insecure default secrets that MUST be rejected
const INSECURE_DEFAULT_SECRETS = new Set([
  'papido_super_secure_jwt_secret_key_2026_production_ready_xyz987',
  'papido_super_secure_refresh_token_secret_2026_abc123',
  'secret',
  'jwt_secret',
  'changeme',
  'password',
  '12345678',
  'admin',
  'generate_with_openssl_rand_hex_32'
]);

// Database configuration resolution
let dbHost = process.env.DB_HOST || (isProduction ? '' : '127.0.0.1');
let dbPort = parseInt(process.env.DB_PORT, 10) || 4000;
let dbUser = process.env.DB_USER || (isProduction ? '' : 'root');
let dbPassword = process.env.DB_PASSWORD || '';
let dbName = process.env.DB_NAME || 'papido_db';
let dbSsl = process.env.DB_SSL === 'true' || Boolean(process.env.DB_HOST && (process.env.DB_HOST.includes('tidbcloud.com') || process.env.DB_HOST.includes('aws.')));

const rawDbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.TIDB_URL;
if (rawDbUrl) {
  try {
    let cleaned = String(rawDbUrl).trim().replace(/^['"]|['"]$/g, '');
    const urlMatch = cleaned.match(/mysql:\/\/[^\s"']+/i);
    if (urlMatch) {
      cleaned = urlMatch[0];
    }
    const parsed = new URL(cleaned.startsWith('mysql://') ? cleaned : `mysql://${cleaned}`);
    dbHost = parsed.hostname || dbHost;
    dbPort = parsed.port ? parseInt(parsed.port, 10) : (dbHost.includes('tidbcloud.com') ? 4000 : dbPort);
    dbUser = decodeURIComponent(parsed.username) || dbUser;
    dbPassword = decodeURIComponent(parsed.password) || dbPassword;
    const rawPath = parsed.pathname.replace(/^\//, '').split('?')[0];
    if (rawPath && rawPath !== 'sys' && rawPath !== 'mysql' && rawPath !== 'information_schema') {
      dbName = rawPath;
    }
    if (dbHost.includes('tidbcloud.com') || dbHost.includes('aws') || cleaned.includes('ssl=')) {
      dbSsl = true;
    }
  } catch (e) {
    console.error('Failed to parse database connection URL:', e.message);
  }
}

// JWT secret validation and fallback handling
let jwtSecret = process.env.JWT_SECRET;
let jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

if (jwtSecret && INSECURE_DEFAULT_SECRETS.has(jwtSecret.trim())) {
  throw new Error('[FATAL] Insecure/known default JWT_SECRET detected. Please set a secure, unique JWT_SECRET.');
}
if (jwtRefreshSecret && INSECURE_DEFAULT_SECRETS.has(jwtRefreshSecret.trim())) {
  throw new Error('[FATAL] Insecure/known default JWT_REFRESH_SECRET detected. Please set a secure, unique JWT_REFRESH_SECRET.');
}

if (isProduction) {
  const missing = [];
  if (!dbHost) missing.push('DB_HOST / DATABASE_URL');
  if (!dbUser) missing.push('DB_USER');
  if (!dbPassword) missing.push('DB_PASSWORD');
  if (!jwtSecret) missing.push('JWT_SECRET');
  if (!jwtRefreshSecret) missing.push('JWT_REFRESH_SECRET');

  if (missing.length > 0) {
    throw new Error(`[FATAL] Missing required production configuration: ${missing.join(', ')}`);
  }

  if (jwtSecret.length < 32) {
    throw new Error('[FATAL] JWT_SECRET must be at least 32 characters in production.');
  }
  if (jwtRefreshSecret.length < 32) {
    throw new Error('[FATAL] JWT_REFRESH_SECRET must be at least 32 characters in production.');
  }
} else {
  // Safe ephemeral fallback for development / test environments if not provided
  if (!jwtSecret) {
    console.warn('[SECURITY NOTICE] JWT_SECRET not provided in environment. Using ephemeral process secret for development.');
    jwtSecret = crypto.randomBytes(32).toString('hex');
  }
  if (!jwtRefreshSecret) {
    console.warn('[SECURITY NOTICE] JWT_REFRESH_SECRET not provided in environment. Using ephemeral process secret for development.');
    jwtRefreshSecret = crypto.randomBytes(32).toString('hex');
  }
}

console.log(`[Config] Database configured: ${dbUser}@${dbHost}:${dbPort}/${dbName} (SSL: ${dbSsl})`);

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
    CONNECTION_LIMIT: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 20
  },

  JWT: {
    SECRET: jwtSecret,
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    REFRESH_SECRET: jwtRefreshSecret,
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000
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
    PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
    PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
    SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@papido.online'
  },

  PUSH_NOTIFICATION_KEY: process.env.PUSH_NOTIFICATION_KEY || '',

  SMTP: {
    HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
    SECURE: process.env.SMTP_SECURE === 'true',
    USER: process.env.SMTP_USER || '',
    PASS: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
    FROM: process.env.SMTP_FROM || '"Papido" <no-reply@papido.online>'
  },

  REDIS_URL: process.env.REDIS_URL || '',
  CORE_INVITE_CODE: (process.env.CORE_INVITE_CODE || '').trim(),
  MASTER_ADMIN: {
    EMAIL: (process.env.MASTER_ADMIN_EMAIL || '').trim().toLowerCase(),
    PASSWORD: process.env.MASTER_ADMIN_PASSWORD || ''
  },

  STORAGE: {
    PROVIDER: process.env.STORAGE_PROVIDER || (process.env.R2_ACCESS_KEY_ID ? 'r2' : (process.env.AWS_ACCESS_KEY_ID ? 's3' : 'local')),
    R2: {
      ACCOUNT_ID: process.env.R2_ACCOUNT_ID || '',
      ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
      SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
      BUCKET_NAME: process.env.R2_BUCKET_NAME || 'papido-uploads',
      PUBLIC_URL: process.env.R2_PUBLIC_URL || '',
      ENDPOINT: process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '')
    },
    S3: {
      REGION: process.env.AWS_REGION || 'us-east-1',
      ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
      SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
      BUCKET_NAME: process.env.AWS_BUCKET_NAME || 'papido-uploads',
      PUBLIC_URL: process.env.AWS_PUBLIC_URL || ''
    }
  }
};
