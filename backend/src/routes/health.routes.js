const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const dbEngine = db.getEngine();
    return res.status(200).json({
      status: 'OK',
      app: 'Papido Ride-Hailing Platform API',
      version: '1.0.0',
      uptime: process.uptime(),
      database: {
        status: 'Connected',
        engine: dbEngine
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      status: 'ERROR',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
