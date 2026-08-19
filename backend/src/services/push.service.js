const webpush = require('web-push');
const env = require('../config/environment');
const db = require('../config/database');

// Initialize Web Push VAPID configuration
if (env.VAPID && env.VAPID.PUBLIC_KEY && env.VAPID.PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      env.VAPID.SUBJECT,
      env.VAPID.PUBLIC_KEY,
      env.VAPID.PRIVATE_KEY
    );
    console.log('[PushService] Web Push VAPID initialized successfully.');
  } catch (err) {
    console.warn('[PushService Warning] Failed to initialize VAPID details:', err.message);
  }
}

const PushService = {
  getVapidPublicKey() {
    return env.VAPID.PUBLIC_KEY;
  },

  async subscribeUser(userId, subscription) {
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      throw new Error('Invalid push subscription payload.');
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    // Check existing
    const existing = await db.queryOne('SELECT id FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    if (existing) {
      await db.query(
        'UPDATE push_subscriptions SET user_id = ?, p256dh = ?, auth = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId, p256dh, auth, existing.id]
      );
      return { id: existing.id, updated: true };
    }

    const res = await db.query(
      'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)',
      [userId, endpoint, p256dh, auth]
    );
    return { id: res.insertId, created: true };
  },

  async unsubscribeUser(endpoint) {
    if (!endpoint) return false;
    await db.query('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    return true;
  },

  async sendPushToUser(userId, payload) {
    try {
      const subscriptions = await db.query('SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);
      if (!subscriptions || subscriptions.length === 0) return;

      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

      const promises = subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, payloadString);
        } catch (err) {
          // If subscription is expired or gone (410 Gone / 404 Not Found), delete it
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`[PushService] Removing expired push subscription ${sub.id}`);
            await db.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
          } else {
            console.warn(`[PushService Warning] Failed to send push to sub ${sub.id}:`, err.message);
          }
        }
      });

      await Promise.allSettled(promises);
    } catch (err) {
      console.warn('[PushService] sendPushToUser error:', err.message);
    }
  },

  async sendPushToRiders({ nearbyRiders, ride }) {
    try {
      const isFemaleOnly = Boolean(ride.female_rider_only || ride.femaleRiderOnly);
      const reqVehicle = (ride.vehicle_type || ride.vehicleType || 'ANY').toUpperCase();
      const fare = Number(ride.total_fare || ride.final_fare || ride.estimated_fare || 20);

      // Find all eligible riders from database if nearbyRiders not passed
      let targetUserIds = [];
      if (nearbyRiders && nearbyRiders.length > 0) {
        targetUserIds = nearbyRiders
          .filter(r => {
            if (isFemaleOnly && (r.gender || '').toUpperCase() !== 'FEMALE') return false;
            return true;
          })
          .map(r => r.user_id || r.id);
      } else {
        // Query online approved drivers from database
        let sql = `
          SELECT rp.user_id, u.gender, rp.vehicle_type 
          FROM rider_profiles rp
          JOIN users u ON rp.user_id = u.id
          WHERE rp.is_online = 1 AND rp.verification_status = 'APPROVED'
        `;
        const params = [];
        if (isFemaleOnly) {
          sql += " AND u.gender = 'FEMALE'";
        }
        if (reqVehicle !== 'ANY') {
          sql += " AND rp.vehicle_type = ?";
          params.push(reqVehicle);
        }
        const riders = await db.query(sql, params);
        targetUserIds = riders.map(r => r.user_id);
      }

      if (targetUserIds.length === 0) return;

      const payload = {
        title: `🔔 PAPIDO RIDE ALERT (₹${fare})`,
        body: `Pickup: ${ride.pickup_address || ride.pickupAddress} ➔ Drop: ${ride.destination_address || ride.destinationAddress}`,
        rideId: ride.id,
        url: '/rider',
        tag: 'papido-ride-request',
        timestamp: Date.now()
      };

      const sendPromises = targetUserIds.map(userId => this.sendPushToUser(userId, payload));
      await Promise.allSettled(sendPromises);
    } catch (err) {
      console.warn('[PushService] sendPushToRiders error:', err.message);
    }
  }
};

module.exports = PushService;
