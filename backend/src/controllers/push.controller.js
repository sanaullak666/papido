const PushService = require('../services/push.service');
const { success, error } = require('../utils/response');

const PushController = {
  getVapidPublicKey(req, res, next) {
    try {
      const key = PushService.getVapidPublicKey();
      return success(res, 'VAPID Public Key retrieved.', { publicKey: key });
    } catch (err) {
      next(err);
    }
  },

  async subscribe(req, res, next) {
    try {
      const subscription = req.body.subscription || req.body;
      const result = await PushService.subscribeUser(req.user.id, subscription);
      return success(res, 'Push subscription registered successfully.', result);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async unsubscribe(req, res, next) {
    try {
      const { endpoint } = req.body;
      await PushService.unsubscribeUser(endpoint);
      return success(res, 'Unsubscribed from push notifications.');
    } catch (err) {
      next(err);
    }
  }
};

module.exports = PushController;
