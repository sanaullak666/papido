const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/environment');
const { SOCKET_EVENTS, ROLES } = require('../config/constants');
const RiderModel = require('../models/rider.model');
const RideModel = require('../models/ride.model');
const PushService = require('../services/push.service');
const logger = require('../utils/logger');

class SocketManager {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*', // Allow mobile apps, Flutter web, Vite frontend
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
        credentials: true
      },
      pingTimeout: 20000,
      pingInterval: 10000
    });

    this.activeRiderSockets = new Map(); // riderId -> socketId
    this.activeCustomerSockets = new Map(); // customerId -> socketId
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
          // Allow guest connection for live monitoring/simulator or mark as unauthenticated
          socket.user = null;
          return next();
        }

        const decoded = jwt.verify(token, env.JWT.SECRET);
        socket.user = decoded;
        return next();
      } catch (err) {
        logger.warn(`Socket authentication failed: ${err.message}`);
        // Allow connection with unauthenticated tag for public live maps
        socket.user = null;
        return next();
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const user = socket.user;
      const userDesc = user ? `${user.role} (ID: ${user.id}, Name: ${user.name})` : 'Anonymous Simulator/Guest';
      logger.info(`Socket connected: ${socket.id} - ${userDesc}`);

      if (user) {
        // Join personal user room
        socket.join(`user_${user.id}`);
        // Join role room
        socket.join(`role_${user.role}`);

        if (user.role === ROLES.RIDER) {
          this.activeRiderSockets.set(user.id, socket.id);
        } else if (user.role === ROLES.CUSTOMER) {
          this.activeCustomerSockets.set(user.id, socket.id);
        }
      }

      // Explicit authentication / identification for clients that authenticate post-handshake
      socket.on('identify', async (userData) => {
        if (userData && userData.id && userData.role) {
          socket.user = userData;
          socket.join(`user_${userData.id}`);
          socket.join(`role_${userData.role.toUpperCase()}`);
          if (userData.role.toUpperCase() === 'RIDER') {
            socket.join('role_RIDER');
            socket.join(`rider_${userData.id}`);
            this.activeRiderSockets.set(userData.id, socket.id);
            if (userData.isOnline !== undefined) {
              const onlineState = Boolean(userData.isOnline);
              try {
                await RiderModel.updateOnlineStatus(userData.id, onlineState);
                this.io.to('role_ADMIN').emit('admin:rider_status_changed', { riderId: userData.id, isOnline: onlineState });
              } catch (_) {}
            }
          }
          logger.info(`Socket identified: ${socket.id} as ${userData.role} ID ${userData.id}`);
        }
      });

      socket.on('rider:identify', async (data) => {
        const riderId = data?.riderId || data?.id || socket.user?.id;
        if (riderId) {
          socket.user = { ...(socket.user || {}), id: riderId, role: ROLES.RIDER };
          socket.join(`user_${riderId}`);
          socket.join(`rider_${riderId}`);
          socket.join('role_RIDER');
          this.activeRiderSockets.set(riderId, socket.id);
          if (data.isOnline !== undefined || data.status !== undefined) {
            const onlineState = data.isOnline !== undefined ? Boolean(data.isOnline) : (data.status === 'ONLINE');
            try {
              await RiderModel.updateOnlineStatus(riderId, onlineState);
              this.io.to('role_ADMIN').emit('admin:rider_status_changed', { riderId, isOnline: onlineState });
            } catch (_) {}
          }
          logger.info(`Socket identified: ${socket.id} as RIDER ID ${riderId}`);
        }
      });

      // Join a specific ride room for real-time tracking
      socket.on('join_ride', (rideId) => {
        if (rideId) {
          socket.join(`ride_${rideId}`);
          logger.debug(`Socket ${socket.id} joined ride room ride_${rideId}`);
        }
      });

      socket.on('leave_ride', (rideId) => {
        if (rideId) {
          socket.leave(`ride_${rideId}`);
        }
      });

      // Rider live location update (GPS ping)
      socket.on(SOCKET_EVENTS.RIDER_LOCATION_UPDATE, async (data) => {
        try {
          const riderId = socket.user?.id || data.riderId;
          const { latitude, longitude, rideId } = data;

          if (riderId && latitude && longitude) {
            // Update database
            await RiderModel.updateLocation(riderId, latitude, longitude);

            const payload = {
              riderId,
              latitude,
              longitude,
              heading: data.heading || 0,
              speed: data.speed || 0,
              timestamp: new Date().toISOString()
            };

            // Broadcast to Admin
            this.io.to('role_ADMIN').emit('admin:rider_location', payload);

            // Broadcast to Ride room if rider is on an active ride
            if (rideId) {
              this.io.to(`ride_${rideId}`).emit(SOCKET_EVENTS.RIDE_LOCATION_TRACK, payload);
            }
          }
        } catch (err) {
          logger.error('Error in socket rider location update', { error: err.message });
        }
      });

      // Rider online/offline toggle via socket
      socket.on(SOCKET_EVENTS.RIDER_STATUS_TOGGLE, async (data) => {
        try {
          const riderId = socket.user?.id || data.riderId;
          const isOnline = !!data.isOnline;
          if (riderId) {
            await RiderModel.updateOnlineStatus(riderId, isOnline);
            this.io.to('role_ADMIN').emit('admin:rider_status_changed', { riderId, isOnline });
          }
        } catch (err) {
          logger.error('Error toggling rider online status via socket', { error: err.message });
        }
      });

      // Real-time Chat / Quick Preset Message between Passenger and Driver
      socket.on('ride:send_message', async (data) => {
        try {
          const { rideId, message, senderRole, senderName } = data;
          if (rideId && message) {
            const payload = {
              rideId,
              message,
              senderId: socket.user?.id || null,
              senderRole: senderRole || socket.user?.role || 'USER',
              senderName: senderName || socket.user?.name || 'User',
              timestamp: new Date().toISOString()
            };

            this.io.to(`ride_${rideId}`).emit('ride:new_message', payload);

            const ride = await RideModel.findById(rideId);
            if (ride) {
              if (ride.customer_id) this.io.to(`user_${ride.customer_id}`).emit('ride:new_message', payload);
              if (ride.rider_id) this.io.to(`user_${ride.rider_id}`).emit('ride:new_message', payload);
            }
          }
        } catch (err) {
          logger.error('Error broadcasting ride message', { error: err.message });
        }
      });

      socket.on('disconnect', async () => {
        if (socket.user) {
          const role = (socket.user.role || '').toUpperCase();
          if (role === 'RIDER' || role === ROLES.RIDER) {
            const riderId = socket.user.id;
            this.activeRiderSockets.delete(riderId);
            try {
              await RiderModel.updateOnlineStatus(riderId, false);
              this.io.to('role_ADMIN').emit('admin:rider_status_changed', { riderId, isOnline: false });
              logger.info(`Rider ID ${riderId} marked OFFLINE on disconnect`);
            } catch (err) {
              logger.error('Error updating rider offline status on disconnect', { error: err.message });
            }
          } else if (role === 'CUSTOMER' || role === ROLES.CUSTOMER) {
            this.activeCustomerSockets.delete(socket.user.id);
          }
        }
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Broadcasts new ride request to all online nearby riders and admin dashboard
   */
  broadcastNewRideRequest(ride, nearbyRiders = []) {
    const totalFare = Number(ride.estimated_fare || ride.estimatedFare || ride.total_fare || 20);
    const payload = {
      id: ride.id,
      rideId: ride.id,
      rideCode: ride.ride_code || ride.rideCode,
      vehicleType: ride.vehicle_type || ride.vehicleType || 'BIKE',
      pickupAddress: ride.pickup_address || ride.pickupAddress,
      pickup_address: ride.pickup_address || ride.pickupAddress,
      pickupLatitude: ride.pickup_latitude || ride.pickupLatitude,
      pickupLongitude: ride.pickup_longitude || ride.pickupLongitude,
      destinationAddress: ride.destination_address || ride.destinationAddress,
      destination_address: ride.destination_address || ride.destinationAddress,
      destinationLatitude: ride.destination_latitude || ride.destinationLatitude,
      destinationLongitude: ride.destination_longitude || ride.destinationLongitude,
      estimatedDistance: ride.estimated_distance || ride.estimatedDistance,
      estimatedDuration: ride.estimated_duration || ride.estimatedDuration,
      estimatedFare: totalFare,
      estimated_fare: totalFare,
      total_fare: totalFare,
      totalFare: totalFare,
      paymentMethod: ride.payment_method || 'CASH',
      femaleRiderOnly: Boolean(ride.female_rider_only),
      isDoubleRide: Boolean(ride.is_double_ride),
      customerName: ride.customer_name || 'Passenger',
      customer_name: ride.customer_name || 'Passenger',
      customerGender: ride.customer_gender || 'OTHER',
      requestedAt: ride.requested_at || new Date().toISOString()
    };

    const isFemaleOnly = Boolean(ride.female_rider_only || ride.femaleRiderOnly);

    // If specific nearby riders found, emit to their individual rooms (filtered if female only)
    if (nearbyRiders && nearbyRiders.length > 0) {
      const targetRiders = isFemaleOnly
        ? nearbyRiders.filter(r => (r.gender || '').toUpperCase() === 'FEMALE')
        : nearbyRiders;

      targetRiders.forEach(rider => {
        this.io.to(`user_${rider.user_id}`).emit(SOCKET_EVENTS.NEW_RIDE_REQUEST, {
          ...payload,
          distanceToPickup: rider.distance_to_pickup
        });
      });
    }

    // Broadcast to role_RIDER ONLY if not a female-only ride request
    if (!isFemaleOnly) {
      this.io.to('role_RIDER').emit(SOCKET_EVENTS.NEW_RIDE_REQUEST, payload);
    }
    this.io.to('role_ADMIN').emit('admin:ride_requested', payload);

    // Send Lock-Screen Web Push Notifications to Target Drivers (Works even when browser is closed)
    try {
      PushService.sendPushToRiders({ nearbyRiders, ride: payload });
    } catch (pushErr) {
      logger.warn('Push dispatch error', { error: pushErr.message });
    }
  }

  /**
   * Emits ride state transitions (ACCEPTED, RIDER_ARRIVING, RIDER_REACHED, STARTED, COMPLETED, CANCELLED)
   */
  emitRideStatusUpdate(ride, status) {
    const totalFare = Number(ride.final_fare || ride.estimated_fare || ride.total_fare || 20);
    const enrichedRide = {
      ...ride,
      total_fare: totalFare,
      estimated_fare: Number(ride.estimated_fare || totalFare),
      final_fare: Number(ride.final_fare || totalFare)
    };

    const payload = {
      rideId: ride.id,
      id: ride.id,
      rideCode: ride.ride_code,
      status,
      ride: enrichedRide,
      total_fare: totalFare,
      estimated_fare: Number(ride.estimated_fare || totalFare),
      final_fare: Number(ride.final_fare || totalFare),
      timestamp: new Date().toISOString()
    };

    // If accepted by any rider, notify all other riders so it's dismissed from their radar
    // If cancelled, broadcast cancellation to driver, ride room, and all riders
    if (status === 'CANCELLED') {
      this.io.to('role_RIDER').emit('ride:cancelled', payload);
      this.io.to(`ride_${ride.id}`).emit('ride:cancelled', payload);
      if (ride.rider_id) {
        this.io.to(`user_${ride.rider_id}`).emit('ride:cancelled', payload);
      }
      this.io.emit('ride:cancelled', payload);
    }

    // Notify customer
    if (ride.customer_id) {
      this.io.to(`user_${ride.customer_id}`).emit('ride:status_change', payload);
      this.io.to(`user_${ride.customer_id}`).emit(`ride:${status.toLowerCase()}`, payload);

      // Web Push for Passenger updates when backgrounded
      if (status === 'ACCEPTED') {
        PushService.sendPushToUser(ride.customer_id, {
          title: '🏍️ Rider Assigned!',
          body: 'Your driver accepted the booking and is on the way.',
          url: '/customer'
        });
      } else if (status === 'COMPLETED') {
        PushService.sendPushToUser(ride.customer_id, {
          title: '✅ Trip Completed (₹' + totalFare + ')',
          body: 'Thank you for riding with Papido!',
          url: '/customer'
        });
      }
    }

    // Notify rider
    if (ride.rider_id) {
      this.io.to(`user_${ride.rider_id}`).emit('ride:status_change', payload);
      this.io.to(`user_${ride.rider_id}`).emit(`ride:${status.toLowerCase()}`, payload);
    }

    // Notify anyone subscribed to ride room
    this.io.to(`ride_${ride.id}`).emit('ride:status_change', payload);

    // Notify Admin
    this.io.to('role_ADMIN').emit('admin:ride_status_change', payload);
  }
}

module.exports = SocketManager;
