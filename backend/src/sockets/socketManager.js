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
        try {
          if (!userData) return;
          let verifiedUser = socket.user;

          // If not already verified via handshake, verify incoming token
          if (!verifiedUser) {
            const token = userData.token || userData.accessToken;
            if (!token) {
              logger.warn(`Unauthenticated identify rejected for socket ${socket.id}`);
              return socket.emit('error', { message: 'Authentication token required' });
            }
            verifiedUser = jwt.verify(token, env.JWT.SECRET);
            socket.user = verifiedUser;
          }

          // Enforce that caller cannot spoof identity or escalate role
          if (userData.id && parseInt(userData.id, 10) !== parseInt(verifiedUser.id, 10)) {
            logger.warn(`User ${verifiedUser.id} attempted to spoof user ID ${userData.id}`);
            return;
          }

          const role = verifiedUser.role ? verifiedUser.role.toUpperCase() : 'CUSTOMER';
          socket.join(`user_${verifiedUser.id}`);
          socket.join(`role_${role}`);

          if (role === 'RIDER') {
            socket.join('role_RIDER');
            socket.join(`rider_${verifiedUser.id}`);
            this.activeRiderSockets.set(verifiedUser.id, socket.id);
            if (userData.isOnline !== undefined) {
              const onlineState = Boolean(userData.isOnline);
              try {
                await RiderModel.updateOnlineStatus(verifiedUser.id, onlineState);
                this.io.to('role_ADMIN').emit('admin:rider_status_changed', { riderId: verifiedUser.id, isOnline: onlineState });
              } catch (_) {}
            }
          }
          logger.info(`Socket verified and identified: ${socket.id} as ${role} ID ${verifiedUser.id}`);
        } catch (err) {
          logger.warn(`Socket identify error: ${err.message}`);
        }
      });

      socket.on('rider:identify', async (data) => {
        try {
          if (!data) return;
          let verifiedUser = socket.user;

          if (!verifiedUser) {
            const token = data.token || data.accessToken;
            if (!token) {
              logger.warn(`Unauthenticated rider:identify rejected for socket ${socket.id}`);
              return socket.emit('error', { message: 'Authentication token required' });
            }
            verifiedUser = jwt.verify(token, env.JWT.SECRET);
            socket.user = verifiedUser;
          }

          if (verifiedUser.role !== ROLES.RIDER && verifiedUser.role !== 'RIDER') {
            logger.warn(`Non-rider user ${verifiedUser.id} attempted rider:identify`);
            return;
          }

          const riderId = verifiedUser.id;
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
          logger.info(`Socket verified and identified: ${socket.id} as RIDER ID ${riderId}`);
        } catch (err) {
          logger.warn(`Socket rider:identify error: ${err.message}`);
        }
      });

      // Join a specific ride room for real-time tracking with security validation
      socket.on('join_ride', async (rideId) => {
        if (!rideId) return;
        try {
          // If socket is authenticated, enforce strict room authorization
          if (socket.user) {
            const userRole = (socket.user.role || '').toUpperCase();
            if (userRole === 'ADMIN' || userRole === ROLES.ADMIN) {
              socket.join(`ride_${rideId}`);
              logger.debug(`Admin ${socket.user.id} joined ride room ride_${rideId}`);
              return;
            }

            const ride = await RideModel.findById(rideId);
            if (!ride) {
              socket.emit('error', { message: 'Ride not found' });
              return;
            }

            const isCustomer = Number(ride.customer_id) === Number(socket.user.id);
            const isAssignedRider = Number(ride.rider_id) === Number(socket.user.id);

            if (isCustomer || isAssignedRider) {
              socket.join(`ride_${rideId}`);
              logger.debug(`User ${socket.user.id} (${socket.user.role}) joined ride room ride_${rideId}`);
            } else {
              logger.warn(`Unauthorized attempt to join ride room ride_${rideId} by user ${socket.user.id}`);
              socket.emit('error', { message: 'Unauthorized ride room access' });
            }
          } else {
            // Guest or simulator fallback
            socket.join(`ride_${rideId}`);
          }
        } catch (err) {
          logger.error('Error in join_ride authorization', { error: err.message, rideId });
        }
      });

      socket.on('leave_ride', (rideId) => {
        if (rideId) {
          socket.leave(`ride_${rideId}`);
        }
      });

      // Rider live location update (GPS ping) with coordinate and role validation
      socket.on(SOCKET_EVENTS.RIDER_LOCATION_UPDATE, async (data) => {
        try {
          const riderId = socket.user?.id || data.riderId;
          const lat = parseFloat(data.latitude);
          const lng = parseFloat(data.longitude);
          const rideId = data.rideId;

          // Coordinate boundary validation (-90 to 90 lat, -180 to 180 lng)
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            logger.warn(`Rejected invalid coordinates from rider ${riderId}: (${data.latitude}, ${data.longitude})`);
            return;
          }

          // Verify rider role if authenticated
          if (socket.user && socket.user.role && socket.user.role !== 'RIDER') {
            logger.warn(`Non-rider user ${socket.user.id} attempted to publish rider location`);
            return;
          }

          if (riderId) {
            // Update database coordinates
            await RiderModel.updateLocation(riderId, lat, lng);

            const payload = {
              riderId,
              rideId: rideId || null,
              latitude: lat,
              longitude: lng,
              heading: typeof data.heading === 'number' ? data.heading : 0,
              speed: typeof data.speed === 'number' ? data.speed : 0,
              accuracy: typeof data.accuracy === 'number' ? data.accuracy : 10,
              recordedAt: data.recordedAt || new Date().toISOString(),
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
      ride_code: ride.ride_code || ride.rideCode,
      vehicleType: ride.vehicle_type || ride.vehicleType || 'BIKE',
      pickupAddress: ride.pickup_address || ride.pickupAddress,
      pickup_address: ride.pickup_address || ride.pickupAddress,
      pickupLatitude: ride.pickup_latitude || ride.pickupLatitude,
      pickupLongitude: ride.pickup_longitude || ride.pickupLongitude,
      viaAddress: ride.via_address || ride.viaAddress || null,
      via_address: ride.via_address || ride.viaAddress || null,
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
      is_scheduled: Boolean(ride.is_scheduled || ride.isScheduled),
      isScheduled: Boolean(ride.is_scheduled || ride.isScheduled),
      scheduled_time: ride.scheduled_time || ride.scheduledTime || null,
      scheduledTime: ride.scheduled_time || ride.scheduledTime || null,
      requestedAt: ride.requested_at || new Date().toISOString()
    };

    const isFemaleOnly = Boolean(ride.female_rider_only || ride.femaleRiderOnly);
    const vehicleType = (ride.vehicle_type || ride.vehicleType || 'ANY').toUpperCase();
    const hasVehiclePref = vehicleType !== 'ANY';
    const hasStrictPreference = isFemaleOnly || hasVehiclePref;

    // Filter target riders strictly matching user's preferences
    let targetRiders = Array.isArray(nearbyRiders) ? [...nearbyRiders] : [];
    if (isFemaleOnly) {
      targetRiders = targetRiders.filter(r => (r.gender || '').toUpperCase() === 'FEMALE');
    }
    if (hasVehiclePref) {
      targetRiders = targetRiders.filter(r => (r.vehicle_type || r.vehicleType || 'BIKE').toUpperCase() === vehicleType);
    }

    // If specific matching riders found, emit strictly to their individual private socket rooms
    if (targetRiders.length > 0) {
      targetRiders.forEach(rider => {
        this.io.to(`user_${rider.user_id}`).emit(SOCKET_EVENTS.NEW_RIDE_REQUEST, {
          ...payload,
          distanceToPickup: rider.distance_to_pickup
        });
      });
    }

    // Only broadcast to general role_RIDER room if NO strict preference was requested
    // If preference is given (e.g. female-only or specific vehicle), it MUST go to matching riders only!
    if (!hasStrictPreference) {
      this.io.to('role_RIDER').emit(SOCKET_EVENTS.NEW_RIDE_REQUEST, payload);
    }

    // Broadcast to admin dashboard for real-time ride tracking
    this.io.to('role_ADMIN').emit('admin:ride_requested', payload);

    // Send Lock-Screen Web Push Notifications strictly to matching drivers
    try {
      PushService.sendPushToRiders({ nearbyRiders: targetRiders, ride: payload });
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
      rideCode: ride.ride_code || ride.rideCode,
      ride_code: ride.ride_code || ride.rideCode,
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

    // Notify Ride Room & Active Listeners
    if (ride.id) {
      this.io.to(`ride_${ride.id}`).emit('ride:status_change', payload);
      this.io.to(`ride_${ride.id}`).emit(`ride:${status.toLowerCase()}`, payload);
    }

    // Notify customer
    if (ride.customer_id) {
      this.io.to(`user_${ride.customer_id}`).emit('ride:status_change', payload);
      this.io.to(`user_${ride.customer_id}`).emit(`ride:${status.toLowerCase()}`, payload);

      // Web Push for Passenger updates when backgrounded
      if (status === 'ACCEPTED') {
        PushService.sendPushToUser(ride.customer_id, {
          title: 'Rider Assigned!',
          body: 'Your driver accepted the booking and is on the way.',
          url: '/customer'
        });
      } else if (status === 'COMPLETED') {
        PushService.sendPushToUser(ride.customer_id, {
          title: 'Trip Completed (₹' + totalFare + ')',
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

    // Notify Admin
    this.io.to('role_ADMIN').emit('admin:ride_status_change', payload);
  }

  /**
   * Emits live driver waiting state and charges
   */
  emitWaitingStatusUpdate(ride, isWaiting, waitingMinutes, waitingFare) {
    const baseFare = parseFloat(ride.estimated_fare || ride.total_fare || 20);
    const wFare = parseFloat(waitingFare || 0);
    const totalFare = baseFare + wFare;

    const payload = {
      rideId: ride.id,
      id: ride.id,
      rideCode: ride.ride_code,
      isWaiting: Boolean(isWaiting),
      is_waiting: Boolean(isWaiting),
      waitingMinutes: parseInt(waitingMinutes || 0, 10),
      waiting_minutes: parseInt(waitingMinutes || 0, 10),
      waitingFare: wFare,
      waiting_fare: wFare,
      estimatedFare: baseFare,
      estimated_fare: baseFare,
      finalFare: totalFare,
      final_fare: totalFare,
      totalFare: totalFare,
      total_fare: totalFare,
      timestamp: new Date().toISOString()
    };

    if (ride.customer_id) {
      this.io.to(`user_${ride.customer_id}`).emit('ride:waiting_update', payload);
    }
    if (ride.rider_id) {
      this.io.to(`user_${ride.rider_id}`).emit('ride:waiting_update', payload);
      this.io.to(`rider_${ride.rider_id}`).emit('ride:waiting_update', payload);
    }
    this.io.to(`ride_${ride.id}`).emit('ride:waiting_update', payload);
    this.io.to('role_ADMIN').emit('admin:ride_waiting_update', payload);
  }

  /**
   * Emits notification to Driver that Passenger has marked ₹15 compensation as paid
   */
  emitPenaltyPaymentClaimed(penalty) {
    if (!this.io || !penalty) return;
    const payload = {
      penaltyId: penalty.id,
      id: penalty.id,
      rideId: penalty.ride_id,
      rideCode: penalty.ride_code,
      amount: penalty.amount,
      customerId: penalty.customer_id,
      customerName: penalty.customer_name,
      customerPhone: penalty.customer_phone,
      riderId: penalty.rider_id,
      status: penalty.status,
      timestamp: new Date().toISOString()
    };

    if (penalty.rider_id) {
      this.io.to(`user_${penalty.rider_id}`).emit('penalty:payment_claimed', payload);
      this.io.to(`rider_${penalty.rider_id}`).emit('penalty:payment_claimed', payload);
    }
    this.io.to('role_RIDER').emit('penalty:payment_claimed', payload);
    this.io.to('role_ADMIN').emit('admin:penalty_claimed', payload);
  }

  /**
   * Emits status update when Driver or Admin confirms or rejects penalty
   */
  emitPenaltyStatusUpdate(penalty) {
    if (!this.io || !penalty) return;
    const payload = {
      penaltyId: penalty.id,
      id: penalty.id,
      rideId: penalty.ride_id,
      rideCode: penalty.ride_code,
      amount: penalty.amount,
      customerId: penalty.customer_id,
      riderId: penalty.rider_id,
      status: penalty.status,
      timestamp: new Date().toISOString()
    };

    if (penalty.customer_id) {
      this.io.to(`user_${penalty.customer_id}`).emit('penalty:status_update', payload);
      this.io.to(`customer_${penalty.customer_id}`).emit('penalty:status_update', payload);
    }
    if (penalty.rider_id) {
      this.io.to(`user_${penalty.rider_id}`).emit('penalty:status_update', payload);
      this.io.to(`rider_${penalty.rider_id}`).emit('penalty:status_update', payload);
    }
    this.io.to('role_CUSTOMER').emit('penalty:status_update', payload);
    this.io.to('role_ADMIN').emit('admin:penalty_status_update', payload);
    this.io.emit('penalty:status_update', payload);
  }
}

module.exports = SocketManager;
