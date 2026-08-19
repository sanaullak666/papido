const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { generalLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

// Routes
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const customerRoutes = require('./routes/customer.routes');
const riderRoutes = require('./routes/rider.routes');
const adminRoutes = require('./routes/admin.routes');
const fareRoutes = require('./routes/fare.routes');
const uploadRoutes = require('./routes/upload.routes');
const pushRoutes = require('./routes/push.routes');
const path = require('path');

const app = express();

// Security Headers & CORS
app.use(helmet({
  crossOriginResourcePolicy: false
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static uploaded documents
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply General Rate Limiter
app.use('/api/', generalLimiter);

// Mount API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/fares', fareRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/push', pushRoutes);

const fs = require('fs');
const staticWebPath = path.join(__dirname, '../../apps/admin_web/dist');
if (fs.existsSync(staticWebPath)) {
  app.use(express.static(staticWebPath, {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
  }));
}

// Route to download built APK directly on mobile devices
app.get('/download/app.apk', (req, res) => {
  const apkPath = path.join(__dirname, '../../apps/papido_app/build/app/outputs/flutter-apk/app-debug.apk');
  if (fs.existsSync(apkPath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="papido-app.apk"');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    return res.sendFile(apkPath);
  }
  return res.status(404).send('APK is currently building or not found at ' + apkPath + '. Please refresh in a moment.');
});

// Simple web download page for mobile browser
app.get('/download', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Download Papido Android App</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #111827; color: #f9fafb; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1f2937; border-radius: 20px; padding: 32px 24px; max-width: 400px; width: 100%; text-align: center; border: 1px solid #374151; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .logo { width: 70px; height: 70px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 18px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 38px; font-weight: 900; color: #000; }
          h1 { margin: 0 0 8px; font-size: 24px; font-weight: 800; color: #fff; }
          p { color: #9ca3af; font-size: 14px; margin: 0 0 24px; line-height: 1.5; }
          .btn { display: block; background: #10b981; color: #000; text-decoration: none; font-weight: 700; font-size: 16px; padding: 16px 24px; border-radius: 12px; transition: transform 0.1s ease; }
          .btn:active { transform: scale(0.98); }
          .info { margin-top: 20px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">P</div>
          <h1>Papido Android App</h1>
          <p>Campus Bike-Hailing Platform for Passengers & Drivers</p>
          <a class="btn" href="/download/app.apk">⬇️ Download APK (Direct)</a>
          <div class="info">Connected to Server: ${req.headers.host}</div>
        </div>
      </body>
    </html>
  `);
});

// SPA client-side routing fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/download')) {
    return next();
  }
  const indexHtml = path.join(staticWebPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(indexHtml);
  }
  next();
});

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
