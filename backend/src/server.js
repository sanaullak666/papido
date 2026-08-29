const http = require('http');
const app = require('./app');
const env = require('./config/environment');
const { initializeDatabase } = require('./config/database');
const SocketManager = require('./sockets/socketManager');
const RideService = require('./services/ride.service');
const logger = require('./utils/logger');

async function startServer() {
  try {
    // 1. Initialize Database
    logger.info('Initializing database...');
    const dbInfo = await initializeDatabase();
    logger.info(`Database ready [Engine: ${dbInfo.engine}]`);

    // 2. Create HTTP Server
    const server = http.createServer(app);

    // 3. Initialize Real-Time WebSockets
    const socketManager = new SocketManager(server);
    RideService.setSocketManager(socketManager);
    logger.info('Real-time Socket.IO subsystem attached.');

    // 4. Start Listening
    server.listen(env.PORT, () => {
      logger.info(`========================================================`);
      logger.info(`  PAPIDO BACKEND SERVER RUNNING ON PORT ${env.PORT}     `);
      logger.info(`  Environment: ${env.NODE_ENV}                            `);
      logger.info(`  Health Check: http://localhost:${env.PORT}/api/health   `);
      logger.info(`========================================================`);
    });

    // 5. Scheduled Rides Periodic Background Dispatcher (Every 30s)
    setInterval(async () => {
      try {
        await RideService.dispatchScheduledRides(15);
      } catch (schErr) {
        logger.warn(`Scheduled ride dispatch notice: ${schErr.message}`);
      }
    }, 30000);

    // Graceful Shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return { server, socketManager };
  } catch (err) {
    logger.error(`Failed to start Papido backend: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
