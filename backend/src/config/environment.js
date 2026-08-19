const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

let dbHost = process.env.DB_HOST;
let dbPort = parseInt(process.env.DB_PORT, 10);
let dbUser = process.env.DB_USER;
let dbPassword = process.env.DB_PASSWORD;
let dbName = process.env.DB_NAME || 'papido_db';
let dbSsl = process.env.DB_SSL === 'true';

if (isProduction && (!dbHost || dbHost === '127.0.0.1' || dbHost === 'localhost')) {
  dbHost = 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com';
  dbPort = 4000;
  dbUser = '1cXSFvsybXYvbQr.root';
  dbPassword = 'GjJFGgxEPSBxMW9k';
  dbSsl = true;
} else {
  dbHost = dbHost || '127.0.0.1';
  dbPort = dbPort || 3306;
  dbUser = dbUser || 'root';
  dbPassword = dbPassword || '';
}

const rawDbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.TIDB_URL;
if (rawDbUrl) {
  try {
    // 1. Clean quotes and find the mysql URI substring if extra text was pasted
    let cleaned = String(rawDbUrl).trim().replace(/^['"]|['"]$/g, '');
    const urlMatch = cleaned.match(/mysql:\/\/[^\s"']+/i);
    if (urlMatch) {
      cleaned = urlMatch[0];
    }
    
    // 2. Parse using URL parser
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
    console.log(`[Config] Database configured: ${dbUser}@${dbHost}:${dbPort}/${dbName} (SSL: ${dbSsl})`);
  } catch (e) {
    console.error('Failed to parse database connection URL:', e.message);
  }
} else if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
  console.log(`[Config] Production database configured with TiDB Cloud: ${dbUser}@${dbHost}:${dbPort}/${dbName} (SSL: ${dbSsl})`);
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
