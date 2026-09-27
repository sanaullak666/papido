const Redis = require('ioredis');
const env = require('../config/environment');
const logger = require('../utils/logger');

class LiveLocationService {
  constructor() {
    this.redisClient = null;
    this.memoryStore = new Map(); // Fallback when Redis is unavailable
    this.memoryTtl = new Map();   // rideId -> timeoutHandle
    this.TTL_SECONDS = 300;       // 5 minutes TTL for active ride location

    this.initRedis();
  }

  initRedis() {
    if (env.REDIS_URL) {
      try {
        this.redisClient = new Redis(env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          retryStrategy: (times) => {
            if (times > 5) {
              logger.warn('[LiveLocation] Redis max retries reached, falling back to memory store.');
              return null; // Stop retrying
            }
            return Math.min(times * 1000, 3000);
          }
        });

        this.redisClient.on('connect', () => {
          logger.info('[LiveLocation] Connected to Redis for real-time ride tracking.');
        });

        this.redisClient.on('error', (err) => {
          logger.warn(`[LiveLocation] Redis error: ${err.message}. Using in-memory fallback.`);
        });
      } catch (err) {
        logger.warn(`[LiveLocation] Redis initialization failed: ${err.message}. Using in-memory fallback.`);
        this.redisClient = null;
      }
    } else {
      logger.info('[LiveLocation] Operating with in-memory location cache (REDIS_URL not set).');
    }
  }

  getKey(rideId) {
    return `live:ride:${rideId}`;
  }

  /**
   * Save latest live location for an active ride
   */
  async setLiveLocation(rideId, locationData) {
    if (!rideId || !locationData) return false;

    const payload = {
      rideId: Number(rideId),
      driverId: locationData.driverId || locationData.riderId,
      latitude: parseFloat(locationData.latitude),
      longitude: parseFloat(locationData.longitude),
      accuracy: typeof locationData.accuracy === 'number' ? locationData.accuracy : 10,
      speed: typeof locationData.speed === 'number' ? locationData.speed : 0,
      heading: typeof locationData.heading === 'number' ? locationData.heading : 0,
      timestamp: locationData.timestamp || Date.now(),
      updatedAt: new Date().toISOString()
    };

    // 1. Try Redis first
    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        const key = this.getKey(rideId);
        await this.redisClient.set(key, JSON.stringify(payload), 'EX', this.TTL_SECONDS);
        return true;
      } catch (err) {
        logger.warn(`[LiveLocation] Redis set error: ${err.message}`);
      }
    }

    // 2. In-memory fallback
    this.memoryStore.set(Number(rideId), payload);
    if (this.memoryTtl.has(Number(rideId))) {
      clearTimeout(this.memoryTtl.get(Number(rideId)));
    }
    const timer = setTimeout(() => {
      this.memoryStore.delete(Number(rideId));
      this.memoryTtl.delete(Number(rideId));
    }, this.TTL_SECONDS * 1000);
    this.memoryTtl.set(Number(rideId), timer);

    return true;
  }

  /**
   * Get latest live location for a ride
   */
  async getLiveLocation(rideId) {
    if (!rideId) return null;

    // 1. Try Redis
    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        const key = this.getKey(rideId);
        const data = await this.redisClient.get(key);
        if (data) {
          return JSON.parse(data);
        }
      } catch (err) {
        logger.warn(`[LiveLocation] Redis get error: ${err.message}`);
      }
    }

    // 2. Memory fallback
    return this.memoryStore.get(Number(rideId)) || null;
  }

  /**
   * Clear live location when ride completes or is cancelled
   */
  async clearLiveLocation(rideId) {
    if (!rideId) return false;

    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        await this.redisClient.del(this.getKey(rideId));
      } catch (err) {
        logger.warn(`[LiveLocation] Redis del error: ${err.message}`);
      }
    }

    if (this.memoryTtl.has(Number(rideId))) {
      clearTimeout(this.memoryTtl.get(Number(rideId)));
      this.memoryTtl.delete(Number(rideId));
    }
    this.memoryStore.delete(Number(rideId));

    return true;
  }
}

module.exports = new LiveLocationService();
