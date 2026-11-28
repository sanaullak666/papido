const env = require('./environment');

const ALLOWED_ORIGINS = [
  'https://www.papido.online',
  'https://papido.online',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000',
  'http://localhost:3000'
];

if (env.CLIENT_URL && !ALLOWED_ORIGINS.includes(env.CLIENT_URL)) {
  ALLOWED_ORIGINS.push(env.CLIENT_URL);
}

/**
 * Validates whether an incoming HTTP or WebSocket origin is permitted
 */
function isOriginAllowed(origin) {
  // Mobile apps (Flutter/Capacitor), Postman, cURL, or server-to-server requests don't supply an Origin header
  if (!origin) return true;
  if (origin === 'null') return false;

  const normalized = origin.trim().replace(/\/+$/, '');
  if (ALLOWED_ORIGINS.includes(normalized)) return true;

  // In non-production environments, allow localhost or loopback on any port
  if (process.env.NODE_ENV !== 'production') {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
      return true;
    }
  }

  return false;
}

const expressCorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    const corsError = new Error(`CORS policy: origin ${origin} is not allowed.`);
    corsError.status = 403;
    return callback(corsError);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
};

module.exports = {
  ALLOWED_ORIGINS,
  isOriginAllowed,
  expressCorsOptions
};
