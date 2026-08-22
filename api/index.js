const app = require('../backend/src/app');

module.exports = (req, res) => {
  // Ensure req.url retains the /api prefix for Express routing on Vercel
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};
