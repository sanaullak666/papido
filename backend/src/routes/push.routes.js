const express = require('express');
const router = express.Router();
const PushController = require('../controllers/push.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Public route to get VAPID public key
router.get('/vapid-public-key', PushController.getVapidPublicKey);

// Authenticated routes to register / unregister browser push subscriptions
router.post('/subscribe', verifyToken, PushController.subscribe);
router.post('/unsubscribe', verifyToken, PushController.unsubscribe);

module.exports = router;
