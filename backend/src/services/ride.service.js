const { RIDE_STATUS, ROLES } = require('../config/constants');
const RideModel = require('../models/ride.model');
const RiderModel = require('../models/rider.model');
const CustomerModel = require('../models/customer.model');
const FareService = require('./fare.service');
const PaymentModel = require('../models/payment.model');
const EarningModel = require('../models/earning.model');
const NotificationModel = require('../models/notification.model');
const AuditModel = require('../models/audit.model');

let socketManager = null;
const setSocketManager = (sm) => { socketManager = sm; };

const RideService = {
  setSocketManager,

  /**
   * Generates a human-friendly unique Ride Code (e.g. PAP-9281)
   */
  generateRideCode() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `PAP-${randomNum}`;
  },

  /**
   * Generates 4-digit OTP for ride start verification
   */
  generateOTP() {
    const crypto = require('crypto');
    return crypto.randomInt(1000, 10000).toString();
  },

  /**
   * Step 1: Customer creates a new ride request
   */
  async requestRide({
    customerId,
    vehicleType = 'BIKE',
    pickupAddress,
    pickupLatitude,
    pickupLongitude,
    viaAddress = null,
    viaLatitude = null,
    viaLongitude = null,
    destinationAddress,
    destinationLatitude,
    destinationLongitude,
    paymentMethod = 'CASH',
    femaleRiderOnly = false,
    isDoubleRide = false,
    isOutside = false,
    isScheduled = false,
    scheduledTime = null
  }) {
    const isScheduledTrip = isScheduled === true || isScheduled === 'true' || isScheduled === 1;

    // Check if customer already has an active ride in progress (only for instant rides)
    if (!isScheduledTrip) {
      const existingActive = await RideModel.getActiveRideForCustomer(customerId);
      if (existingActive && ['PENDING_ADMIN_QUOTE', 'REQUESTED', 'ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED', 'STARTED'].includes(existingActive.status)) {
        throw new Error(`You already have an active ride (${existingActive.ride_code}) in progress.`);
      }
    }

    // Check if customer has any unpaid cancellation penalty
    const PenaltyModel = require('../models/penalty.model');
    const pendingPenalty = await PenaltyModel.getPendingPenaltyForCustomer(customerId);
    if (pendingPenalty) {
      const riderUpi = pendingPenalty.rider_upi_id || pendingPenalty.profile_upi_id || `${pendingPenalty.rider_phone}@upi`;
      const riderName = pendingPenalty.rider_name || pendingPenalty.rider_name_full || 'Driver';
      const upiPayUrl = `upi://pay?pa=${encodeURIComponent(riderUpi)}&pn=${encodeURIComponent(riderName)}&am=15.00&tn=Papido_Driver_Comp_${pendingPenalty.ride_code || 'Fee'}&cu=INR`;
      const err = new Error(`You have an unpaid ₹15 driver compensation fee for cancelled Ride #${pendingPenalty.ride_code || ''} to driver ${riderName}. Please settle via UPI to unlock new bookings.`);
      err.penalty = {
        ...pendingPenalty,
        riderUpi,
        riderName,
        upiPayUrl
      };
      err.code = 'UNPAID_CANCELLATION_PENALTY';
      throw err;
    }

    const isOutsideRide = Boolean(isOutside);

    // If outside ride, it will go to admin for custom quoting & dispatch
    if (isOutsideRide) {
      const rideCode = this.generateRideCode();
      const otp = this.generateOTP();

      const ride = await RideModel.create({
        rideCode,
        customerId,
        vehicleType,
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        viaAddress,
        viaLatitude,
        viaLongitude,
        destinationAddress,
        destinationLatitude,
        destinationLongitude,
        estimatedDistance: 0,
        estimatedDuration: 0,
        estimatedFare: 0,
        otp,
        status: 'PENDING_ADMIN_QUOTE',
        paymentMethod,
        femaleRiderOnly,
        isDoubleRide: false,
        isOutside: true
      });

      // Notify customer
      await NotificationModel.create({
        userId: customerId,
        title: 'Outside Ride Submitted',
        message: `Your outside ride ${rideCode} has been sent to Dispatch. Admin will review the route to set the fare & dispatch.`,
        type: 'OUTSIDE_RIDE_PENDING_QUOTE',
        data: { rideId: ride.id, rideCode, isOutside: true }
      });

      // Notify Admin via Socket.IO
      if (socketManager) {
        const UserModel = require('../models/user.model');
        const customer = await UserModel.findById(customerId);
        socketManager.io.to('role_ADMIN').emit('admin:outside_ride_requested', {
          rideId: ride.id,
          id: ride.id,
          rideCode: ride.ride_code,
          customerName: customer?.name || 'Passenger',
          customerGender: customer?.gender || 'OTHER',
          customerPhone: customer?.phone || '',
          pickupAddress: ride.pickup_address,
          destinationAddress: ride.destination_address,
          requestedAt: ride.requested_at || new Date().toISOString()
        });
      }

      await AuditModel.log({
        userId: customerId,
        action: 'OUTSIDE_RIDE_REQUESTED',
        entityType: 'RIDE',
        entityId: ride.id,
        details: { rideCode, isOutside: true }
      });

      return ride;
    }

    // Backend is the source of truth for fare calculation - checks Admin Route Fares and applies Double Ride policy
    const fareEstimate = await FareService.getRideEstimates(
      pickupLatitude,
      pickupLongitude,
      destinationLatitude,
      destinationLongitude,
      vehicleType,
      pickupAddress,
      destinationAddress,
      isDoubleRide
    );

    const rideCode = this.generateRideCode();
    const otp = this.generateOTP();

    // Check if this is a pre-booked scheduled trip
    if (isScheduledTrip && scheduledTime) {
      const ride = await RideModel.create({
        rideCode,
        customerId,
        vehicleType,
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        viaAddress,
        viaLatitude,
        viaLongitude,
        destinationAddress,
        destinationLatitude,
        destinationLongitude,
        estimatedDistance: fareEstimate.distanceKm,
        estimatedDuration: fareEstimate.durationMinutes,
        estimatedFare: fareEstimate.estimatedFare,
        otp,
        status: 'SCHEDULED',
        paymentMethod,
        femaleRiderOnly,
        isDoubleRide: Boolean(fareEstimate.isDoubleRide),
        isOutside: false,
        isScheduled: true,
        scheduledTime
      });

      // Notify customer
      await NotificationModel.create({
        userId: customerId,
        title: 'Ride Pre-Booked',
        message: `Your ride ${rideCode} has been scheduled for ${scheduledTime}. Nearby riders will be matched 15 minutes before departure.`,
        type: 'RIDE_SCHEDULED',
        data: { rideId: ride.id, rideCode, scheduledTime, femaleRiderOnly, isDoubleRide }
      });

      await AuditModel.log({
        userId: customerId,
        action: 'RIDE_SCHEDULED',
        entityType: 'RIDE',
        entityId: ride.id,
        details: { rideCode, scheduledTime, estimatedFare: fareEstimate.estimatedFare, isDoubleRide }
      });

      return ride;
    }

    const ride = await RideModel.create({
      rideCode,
      customerId,
      vehicleType,
      pickupAddress,
      pickupLatitude,
      pickupLongitude,
      viaAddress,
      viaLatitude,
      viaLongitude,
      destinationAddress,
      destinationLatitude,
      destinationLongitude,
      estimatedDistance: fareEstimate.distanceKm,
      estimatedDuration: fareEstimate.durationMinutes,
      estimatedFare: fareEstimate.estimatedFare,
      otp,
      status: 'REQUESTED',
      paymentMethod,
      femaleRiderOnly,
      isDoubleRide: Boolean(fareEstimate.isDoubleRide),
      isOutside: false
    });

    // Notify customer
    await NotificationModel.create({
      userId: customerId,
      title: 'Ride Requested',
      message: femaleRiderOnly
        ? `Searching for nearby female riders for your ride ${rideCode}.`
        : isDoubleRide
          ? `Searching for nearby ${vehicleType.toLowerCase()} riders for your double ride ${rideCode}.`
          : `Searching for nearby ${vehicleType.toLowerCase()} riders for your ride ${rideCode}.`,
      type: 'RIDE_REQUESTED',
      data: { rideId: ride.id, rideCode, femaleRiderOnly, isDoubleRide }
    });

    // Broadcast ride request to nearby online riders via socket (filtered if female only)
    if (socketManager) {
      let nearbyRiders = await RiderModel.findNearbyOnlineRiders(pickupLatitude, pickupLongitude, vehicleType, 10.0);
      if (femaleRiderOnly) {
        nearbyRiders = nearbyRiders.filter(r => r.gender === 'FEMALE');
      }
      socketManager.broadcastNewRideRequest(ride, nearbyRiders);
    }

    await AuditModel.log({
      userId: customerId,
      action: 'RIDE_REQUESTED',
      entityType: 'RIDE',
      entityId: ride.id,
      details: { rideCode, estimatedFare: fareEstimate.estimatedFare, isDoubleRide }
    });

    return ride;
  },

  /**
   * Dispatches scheduled rides whose pickup time is within 15 minutes
   */
  async dispatchScheduledRides(dispatchWindowMinutes = 15) {
    const dueRides = await RideModel.findDueScheduledRides(dispatchWindowMinutes);
    if (!dueRides || dueRides.length === 0) return 0;

    for (const ride of dueRides) {
      try {
        const updatedRide = await RideModel.markScheduledDispatched(ride.id);
        if (!updatedRide) continue;

        // Notify customer
        await NotificationModel.create({
          userId: ride.customer_id,
          title: 'Scheduled Ride Dispatching',
          message: `Your pre-booked ride ${ride.ride_code} is now searching for nearby riders.`,
          type: 'SCHEDULED_RIDE_DISPATCHING',
          data: { rideId: ride.id, rideCode: ride.ride_code }
        });

        if (socketManager) {
          // Notify customer in real-time
          socketManager.io.to(`user_${ride.customer_id}`).emit('ride:status_change', {
            rideId: updatedRide.id,
            rideCode: updatedRide.ride_code,
            status: 'REQUESTED',
            ride: updatedRide,
            timestamp: new Date().toISOString()
          });

          // Broadcast to online riders
          let nearbyRiders = await RiderModel.findNearbyOnlineRiders(
            updatedRide.pickup_latitude,
            updatedRide.pickup_longitude,
            updatedRide.vehicle_type,
            10.0
          );
          if (updatedRide.female_rider_only) {
            nearbyRiders = nearbyRiders.filter(r => r.gender === 'FEMALE');
          }
          socketManager.broadcastNewRideRequest(updatedRide, nearbyRiders);
        }
      } catch (err) {
        console.warn(`Error dispatching scheduled ride #${ride.id}:`, err.message);
      }
    }
    return dueRides.length;
  },

  async getScheduledRides(customerId) {
    return RideModel.getScheduledRidesForCustomer(customerId);
  },

  async cancelScheduledRide(rideId, customerId, reason) {
    const success = await RideModel.cancelScheduledRide(rideId, customerId, reason || 'Cancelled by passenger before dispatch');
    if (!success) {
      throw new Error('Scheduled ride not found or could not be cancelled.');
    }
    return { success: true, rideId };
  },

  /**
   * Admin quotes the fare and dispatches an outside trip
   */
  async adminQuoteAndDispatch(rideId, fareAmount, assignedRiderId = null) {
    const ride = await RideModel.findById(rideId);
    if (!ride) throw new Error('Ride not found.');
    if (ride.status !== 'PENDING_ADMIN_QUOTE') {
      throw new Error(`Ride is not pending admin quote (current status: ${ride.status}).`);
    }

    const updatedRide = await RideModel.adminQuoteAndDispatch(rideId, fareAmount, assignedRiderId);

    // Notify customer
    await NotificationModel.create({
      userId: ride.customer_id,
      title: 'Outside Fare Quoted!',
      message: `Admin has approved your outside trip with a fare of ₹${fareAmount}.`,
      type: 'OUTSIDE_RIDE_QUOTED',
      data: { rideId, fareAmount, assignedRiderId }
    });

    if (socketManager) {
      // Notify customer of fare update and transition to REQUESTED
      socketManager.io.to(`user_${ride.customer_id}`).emit('ride:status_change', {
        rideId: updatedRide.id,
        rideCode: updatedRide.ride_code,
        status: 'REQUESTED',
        ride: updatedRide,
        timestamp: new Date().toISOString()
      });

      // If directly assigned to a specific rider
      if (assignedRiderId) {
        socketManager.io.to(`user_${assignedRiderId}`).emit('ride:new_request', {
          rideId: updatedRide.id,
          rideCode: updatedRide.ride_code,
          vehicleType: updatedRide.vehicle_type,
          pickupAddress: updatedRide.pickup_address,
          destinationAddress: updatedRide.destination_address,
          estimatedFare: fareAmount,
          customerName: updatedRide.customer_name,
          customerGender: updatedRide.customer_gender,
          isDirectAssignment: true,
          isOutside: true
        });
      } else {
        // Broadcast to all eligible online riders
        let nearbyRiders = await RiderModel.findNearbyOnlineRiders(
          updatedRide.pickup_latitude,
          updatedRide.pickup_longitude,
          updatedRide.vehicle_type,
          25.0
        );
        if (updatedRide.female_rider_only) {
          nearbyRiders = nearbyRiders.filter(r => r.gender === 'FEMALE');
        }
        socketManager.broadcastNewRideRequest(updatedRide, nearbyRiders);
      }
    }

    return updatedRide;
  },

  /**
   * Step 2: Rider accepts the ride
   */
  async acceptRide(rideId, riderId) {
    const ride = await RideModel.findById(rideId);
    if (!ride) {
      throw new Error('Ride not found.');
    }

    if (ride.status !== RIDE_STATUS.REQUESTED) {
      throw new Error(`Ride is no longer available (current status: ${ride.status}).`);
    }

    // Verify rider is approved & active
    const rider = await RiderModel.findByUserId(riderId);
    if (!rider || rider.verification_status !== 'APPROVED' || rider.user_status !== 'ACTIVE') {
      throw new Error('Rider is not verified or approved to accept rides.');
    }

    // Check if rider is already on another active ride
    const riderActiveRide = await RideModel.getActiveRideForRider(riderId);
    if (riderActiveRide) {
      throw new Error('You already have another active ride in progress.');
    }

    // Verify core rider exclusivity if ride is core only
    if (ride.is_core_only && !rider.is_core_member && rider.role !== 'CORE_MEMBER') {
      throw new Error('This is an official Papido Flash Free Ride reserved exclusively for Core Team riders.');
    }

    const updatedRide = await RideModel.assignRider(rideId, riderId);

    // Notify customer & rider
    const isCore = Boolean(rider.is_core_member || updatedRide.rider_is_core);
    const riderMsg = isCore
      ? `${rider.name} has accepted your ride request.`
      : `${rider.name} (${rider.vehicle_model} - ${rider.vehicle_number}) has accepted your ride request.`;

    await NotificationModel.create({
      userId: ride.customer_id,
      title: 'Rider Assigned!',
      message: riderMsg,
      type: 'RIDE_ACCEPTED',
      data: { rideId: ride.id, riderId }
    });

    if (socketManager) {
      socketManager.emitRideStatusUpdate(updatedRide, RIDE_STATUS.ACCEPTED);
    }

    await AuditModel.log({
      userId: riderId,
      action: 'RIDE_ACCEPTED',
      entityType: 'RIDE',
      entityId: rideId
    });

    return updatedRide;
  },

  /**
   * Rider explicitly declines a requested ride
   */
  async declineRide(rideId, riderId) {
    await RideModel.recordDecline(rideId, riderId);
    return { success: true, rideId: Number(rideId), riderId: Number(riderId), message: 'Ride request declined.' };
  },

  /**
   * Step 3: Rider signals they are arriving at pickup point
   */
  async setRiderArriving(rideId, riderId) {
    const ride = await RideModel.findById(rideId);
    if (!ride) throw new Error('Ride not found.');
    if (ride.rider_id !== riderId) throw new Error('Unauthorized rider.');
    if (ride.status !== RIDE_STATUS.ACCEPTED) {
      throw new Error(`Cannot transition from ${ride.status} to RIDER_ARRIVING.`);
    }

    const updatedRide = await RideModel.updateStatus(rideId, RIDE_STATUS.RIDER_ARRIVING);

    if (socketManager) {
      socketManager.emitRideStatusUpdate(updatedRide, RIDE_STATUS.RIDER_ARRIVING);
    }

    return updatedRide;
  },

  /**
   * Step 4: Rider reached pickup location
   */
  async setRiderReached(rideId, riderId) {
    const ride = await RideModel.findById(rideId);
    if (!ride) throw new Error('Ride not found.');
    if (ride.rider_id !== riderId) throw new Error('Unauthorized rider.');
    if (![RIDE_STATUS.ACCEPTED, RIDE_STATUS.RIDER_ARRIVING].includes(ride.status)) {
      throw new Error(`Cannot transition from ${ride.status} to RIDER_REACHED.`);
    }

    const updatedRide = await RideModel.updateStatus(rideId, RIDE_STATUS.RIDER_REACHED);

    await NotificationModel.create({
      userId: ride.customer_id,
      title: 'Rider Reached!',
      message: 'Your rider has arrived at the pickup location. Please share your OTP to begin the trip.',
      type: 'RIDER_REACHED',
      data: { rideId, otp: ride.otp }
    });

    if (socketManager) {
      socketManager.emitRideStatusUpdate(updatedRide, RIDE_STATUS.RIDER_REACHED);
    }

    return updatedRide;
  },

  /**
   * Step 5: Rider enters OTP and starts the ride
   */
  async startRide(rideId, riderId, enteredOtp) {
    const ride = await RideModel.findById(rideId);
    if (!ride) throw new Error('Ride not found.');
    if (ride.rider_id !== riderId) throw new Error('Unauthorized rider.');
    if (![RIDE_STATUS.ACCEPTED, RIDE_STATUS.RIDER_ARRIVING, RIDE_STATUS.RIDER_REACHED].includes(ride.status)) {
      throw new Error(`Cannot start ride with status ${ride.status}.`);
    }

    // Verify OTP if required
    if (enteredOtp && ride.otp && ride.otp !== enteredOtp.toString().trim()) {
      throw new Error('Invalid OTP provided. Please ask the customer for the correct 4-digit code.');
    }

    const updatedRide = await RideModel.updateStatus(rideId, RIDE_STATUS.STARTED);

    await NotificationModel.create({
      userId: ride.customer_id,
      title: 'Ride Started',
      message: 'Your trip to destination has begun. Have a safe journey!',
      type: 'RIDE_STARTED',
      data: { rideId }
    });

    if (socketManager) {
      socketManager.emitRideStatusUpdate(updatedRide, RIDE_STATUS.STARTED);
    }

    await AuditModel.log({
      userId: riderId,
      action: 'RIDE_STARTED',
      entityType: 'RIDE',
      entityId: rideId
    });

    return updatedRide;
  },

  /**
   * Toggle / update Waiting state by Rider on any active ride
   */
  async toggleWaiting(rideId, riderId, isWaiting, manualWaitingMinutes = null) {
    const ride = await RideModel.findById(rideId);
    if (!ride) throw new Error('Ride not found.');
    if (ride.status !== RIDE_STATUS.STARTED) {
      throw new Error(`Waiting timer can only be started after the trip is STARTED with OTP verification (Current status: ${ride.status}).`);
    }

    let updatedRide;
    if (manualWaitingMinutes !== null && manualWaitingMinutes !== undefined) {
      updatedRide = await RideModel.updateWaitingDuration(rideId, manualWaitingMinutes);
    } else {
      updatedRide = await RideModel.toggleWaiting(rideId, Boolean(isWaiting));
    }

    if (socketManager) {
      socketManager.emitWaitingStatusUpdate(
        updatedRide,
        updatedRide.is_waiting,
        updatedRide.waiting_minutes,
        updatedRide.waiting_fare
      );
    }

    return updatedRide;
  },

  /**
   * Step 6: Rider completes ride at destination
   * Triggers split calculation, payment ledger record, and earnings update
   */
  async completeRide(rideId, riderId, customFinalFare = null) {
    const ride = await RideModel.findById(rideId);
    if (!ride) throw new Error('Ride not found.');
    if (ride.rider_id !== riderId) throw new Error('Unauthorized rider.');
    if (ride.status !== RIDE_STATUS.STARTED) {
      throw new Error(`Cannot complete ride with status ${ride.status}. Must be STARTED first.`);
    }

    // If driver was still on waiting, finalize waiting timer before completing
    let currentRide = ride;
    if (ride.is_waiting) {
      currentRide = await RideModel.toggleWaiting(rideId, false);
    }

    const waitingFare = parseFloat(currentRide.waiting_fare || 0);
    const baseEstimatedFare = parseFloat(currentRide.estimated_fare || 20);
    const calculatedTotal = baseEstimatedFare + waitingFare;
    const finalFare = customFinalFare ? parseFloat(customFinalFare) : calculatedTotal;

    // 1. Calculate dynamic split rules
    const split = await FareService.calculateFareSplit(finalFare);

    // 2. Mark ride completed in database
    const updatedRide = await RideModel.updateStatus(rideId, RIDE_STATUS.COMPLETED, {
      finalFare,
      paymentStatus: 'PAID'
    });

    // 3. Record payment ledger entry
    const payment = await PaymentModel.create({
      rideId,
      customerId: ride.customer_id,
      amount: finalFare,
      paymentMethod: ride.payment_method || 'CASH',
      paymentStatus: 'COMPLETED',
      transactionReference: `TXN-${Date.now()}-${ride.ride_code}`
    });

    // 4. Record rider earnings ledger entry
    const earning = await EarningModel.recordEarning({
      riderId,
      rideId,
      totalFare: finalFare,
      riderEarning: split.riderEarning,
      companyEarning: split.companyEarning,
      controllerEarning: split.controllerEarning,
      appliedRuleDescription: split.appliedRuleDescription
    });

    // 5. Update user statistics
    await Promise.all([
      RiderModel.incrementRideCount(riderId),
      CustomerModel.incrementRideCount(ride.customer_id)
    ]);

    // 6. Send notifications
    await NotificationModel.create({
      userId: ride.customer_id,
      title: 'Ride Completed!',
      message: `You have arrived at your destination. Total fare: ₹${finalFare}. Please rate your experience!`,
      type: 'RIDE_COMPLETED',
      data: { rideId, finalFare }
    });

    await NotificationModel.create({
      userId: riderId,
      title: 'Ride Completed & Earnings Added',
      message: `Trip completed. Net earnings: ₹${split.riderEarning} (Company fee: ₹${split.companyEarning}).`,
      type: 'EARNING_RECORDED',
      data: { rideId, riderEarning: split.riderEarning, companyEarning: split.companyEarning }
    });

    if (socketManager) {
      socketManager.emitRideStatusUpdate(
        { ...updatedRide, split, payment },
        RIDE_STATUS.COMPLETED
      );
    }

    await AuditModel.log({
      userId: riderId,
      action: 'RIDE_COMPLETED',
      entityType: 'RIDE',
      entityId: rideId,
      details: { finalFare, split }
    });

    return {
      ride: updatedRide,
      split,
      payment,
      earning
    };
  },

  /**
   * Cancellation flow
   */
  async cancelRide(rideId, cancelledByUserId, cancelledByRole, cancellationReason = 'Customer requested cancellation') {
    const ride = await RideModel.findById(rideId);
    if (!ride) throw new Error('Ride not found.');

    if ([RIDE_STATUS.COMPLETED, RIDE_STATUS.CANCELLED].includes(ride.status)) {
      throw new Error(`Ride is already ${ride.status.toLowerCase()}.`);
    }

    // Role security check
    if (cancelledByRole === ROLES.CUSTOMER && ride.customer_id !== cancelledByUserId) {
      throw new Error('Unauthorized: You can only cancel your own rides.');
    }
    if (cancelledByRole === ROLES.RIDER && ride.rider_id !== cancelledByUserId) {
      throw new Error('Unauthorized: You can only cancel rides assigned to you.');
    }

    // When a RIDER cancels an accepted ride, do not cancel the whole booking for the customer.
    // Instead:
    // 1. Blacklist this specific rider from this ride via ride_declines
    // 2. Re-open the ride back to REQUESTED status so other nearby riders can accept it
    // 3. Keep the customer in searching state and broadcast to remaining online drivers
    if (cancelledByRole === ROLES.RIDER) {
      await RideModel.recordDecline(rideId, cancelledByUserId);
      const reopenedRide = await RideModel.reopenForSearch(rideId);

      // Notify customer that their driver cancelled but system is re-matching
      await NotificationModel.create({
        userId: ride.customer_id,
        title: 'Driver Re-matching',
        message: `Your previous driver had to cancel (${cancellationReason}). We are searching for another nearby driver for you.`,
        type: 'RIDE_REOPENED',
        data: { rideId, previousRiderId: cancelledByUserId }
      });

      if (socketManager) {
        socketManager.emitRideStatusUpdate(reopenedRide, 'REOPENED');

        // Broadcast to remaining online drivers
        let nearbyRiders = await RiderModel.findNearbyOnlineRiders(
          reopenedRide.pickup_latitude,
          reopenedRide.pickup_longitude,
          reopenedRide.vehicle_type,
          10.0
        );
        if (reopenedRide.female_rider_only) {
          nearbyRiders = nearbyRiders.filter(r => r.gender === 'FEMALE');
        }
        nearbyRiders = nearbyRiders.filter(r => r.user_id !== cancelledByUserId);
        socketManager.broadcastNewRideRequest(reopenedRide, nearbyRiders);
      }

      await AuditModel.log({
        userId: cancelledByUserId,
        action: 'RIDE_CANCELLED_BY_RIDER_REOPENED',
        entityType: 'RIDE',
        entityId: rideId,
        details: { cancelledByRole, cancellationReason }
      });

      return reopenedRide;
    }

    let penalty = null;
    const isCustomerRole = String(cancelledByRole || '').toUpperCase() === 'CUSTOMER' || String(cancelledByUserId) === String(ride.customer_id);
    const isStatusReached = String(ride.status || '').toUpperCase() === 'RIDER_REACHED';
    const effectiveRiderId = ride.rider_id || ride.assigned_rider_id;
    const isFreeRide = Boolean(ride.is_free_ride || ride.is_core_only || parseFloat(ride.estimated_fare || 0) === 0 || parseFloat(ride.final_fare || 0) === 0);

    // If Customer cancels AFTER the driver has already REACHED pickup location:
    // Apply ₹15 driver compensation fee directed to driver's UPI
    // STRICT EXCEPTION: If this is a FREE RIDE, passenger is NEVER charged any cancellation penalty!
    if (isCustomerRole && isStatusReached && effectiveRiderId && !isFreeRide) {
      try {
        const PenaltyModel = require('../models/penalty.model');
        const UserModel = require('../models/user.model');
        const RiderModel = require('../models/rider.model');
        
        let riderUser = null;
        try {
          riderUser = await UserModel.findById(effectiveRiderId);
        } catch (_) {}

        let riderProfile = null;
        try {
          riderProfile = await RiderModel.getProfile(effectiveRiderId);
        } catch (_) {}
        
        const riderUpi = (riderProfile?.upi_id || '').trim() || (riderUser?.phone ? `${riderUser.phone}@upi` : 'driver@upi');
        const riderName = riderUser?.name || 'Campus Driver';
        
        const createdPenalty = await PenaltyModel.create({
          rideId: ride.id,
          customerId: ride.customer_id,
          riderId: effectiveRiderId,
          amount: 15.00,
          riderUpiId: riderUpi,
          riderName: riderName,
          notes: `Customer cancelled after driver arrived at pickup location. Reason: ${cancellationReason || 'Direct cancellation'}`
        });

        const upiPayUrl = `upi://pay?pa=${encodeURIComponent(riderUpi)}&pn=${encodeURIComponent(riderName)}&am=15.00&tn=Papido_Driver_Comp_${ride.ride_code}&cu=INR`;
        
        penalty = {
          ...(createdPenalty || {}),
          id: createdPenalty?.id || Date.now(),
          ride_id: ride.id,
          ride_code: ride.ride_code,
          amount: 15.00,
          rider_name: riderName,
          rider_upi: riderUpi,
          rider_upi_id: riderUpi,
          rider_phone: riderUser?.phone || '',
          upiPayUrl
        };

        // Special notification for Driver
        try {
          await NotificationModel.create({
            userId: effectiveRiderId,
            title: 'Trip Cancelled — ₹15 Compensation Applied',
            message: `Passenger cancelled trip ${ride.ride_code} after you reached pickup point. ₹15 compensation has been charged to passenger and directed to your UPI (${riderUpi}).`,
            type: 'RIDER_COMPENSATION_PENALTY',
            data: { rideId, penaltyId: penalty.id, amount: 15.00, riderUpi }
          });
        } catch (_) {}
      } catch (penErr) {
        console.warn('Failed to record cancellation penalty:', penErr);
      }
    }

    const updatedRide = await RideModel.updateStatus(rideId, RIDE_STATUS.CANCELLED, {
      cancellationReason,
      cancelledByRole
    });

    // Notify other party
    const targetUserId = cancelledByRole === ROLES.CUSTOMER ? ride.rider_id : ride.customer_id;
    if (targetUserId) {
      await NotificationModel.create({
        userId: targetUserId,
        title: 'Ride Cancelled',
        message: penalty
          ? `Ride ${ride.ride_code} was cancelled after arrival. A ₹15 driver compensation fee applies.`
          : `Ride ${ride.ride_code} was cancelled by ${cancelledByRole.toLowerCase()}. Reason: ${cancellationReason}`,
        type: 'RIDE_CANCELLED',
        data: { rideId, reason: cancellationReason, penalty }
      });
    }

    if (socketManager) {
      socketManager.emitRideStatusUpdate({ ...updatedRide, penalty }, RIDE_STATUS.CANCELLED);
    }

    await AuditModel.log({
      userId: cancelledByUserId,
      action: penalty ? 'RIDE_CANCELLED_WITH_COMPENSATION_PENALTY' : 'RIDE_CANCELLED',
      entityType: 'RIDE',
      entityId: rideId,
      details: { cancelledByRole, cancellationReason, penalty }
    });

    return { ...updatedRide, penalty };
  },

  /**
   * Settle pending cancellation penalty by customer
   */
  async settlePenalty(penaltyId, customerId, paymentReference = null) {
    const PenaltyModel = require('../models/penalty.model');
    const UserModel = require('../models/user.model');
    const db = require('../config/database');

    let penalty = null;
    if (penaltyId && !['latest', 'null', 'undefined'].includes(String(penaltyId))) {
      try {
        penalty = await PenaltyModel.findById(penaltyId);
      } catch (_) {}
      if (!penalty) {
        try {
          penalty = await PenaltyModel.findByRideId(penaltyId);
        } catch (_) {}
      }
    }
    if (!penalty) {
      try {
        penalty = await PenaltyModel.getPendingPenaltyForCustomer(customerId);
      } catch (_) {}
    }
    if (!penalty) {
      try {
        penalty = await db.queryOne(
          `SELECT * FROM cancellation_penalties WHERE customer_id = ? ORDER BY id DESC LIMIT 1`,
          [customerId]
        );
      } catch (_) {}
    }

    if (!penalty) {
      return {
        id: null,
        status: 'PAID',
        message: 'No pending driver compensation due. Your account is clear to book rides.'
      };
    }

    const updated = await PenaltyModel.markAsPaid(penalty.id, paymentReference || `UPI-TXN-${Date.now()}`);
    
    // Notify customer
    try {
      await NotificationModel.create({
        userId: customerId,
        title: 'Compensation Settled',
        message: `Your ₹15 cancellation fee for Ride #${penalty.ride_code || 'Trip'} has been settled. You can now book rides!`,
        type: 'PENALTY_SETTLED',
        data: { penaltyId: penalty.id }
      });
    } catch (_) {}

    return updated;
  },

  /**
   * Customer claims they have paid ₹15 to Driver's UPI
   */
  async claimPenaltyPaid(penaltyId, customerId, paymentReference = null) {
    const PenaltyModel = require('../models/penalty.model');
    const UserModel = require('../models/user.model');
    const RiderModel = require('../models/rider.model');
    const db = require('../config/database');

    let penalty = null;
    if (penaltyId && !['latest', 'null', 'undefined'].includes(String(penaltyId))) {
      try {
        penalty = await PenaltyModel.findById(penaltyId);
      } catch (_) {}
      if (!penalty) {
        try {
          penalty = await PenaltyModel.findByRideId(penaltyId);
        } catch (_) {}
      }
    }
    if (!penalty) {
      try {
        penalty = await PenaltyModel.getPendingPenaltyForCustomer(customerId);
      } catch (_) {}
    }
    if (!penalty) {
      try {
        penalty = await db.queryOne(
          `SELECT * FROM cancellation_penalties WHERE customer_id = ? ORDER BY id DESC LIMIT 1`,
          [customerId]
        );
      } catch (_) {}
    }

    if (!penalty) {
      // Find the most recent ride cancelled with a driver assigned
      try {
        const ride = await db.queryOne(
          `SELECT * FROM rides WHERE customer_id = ? AND rider_id IS NOT NULL AND status = 'CANCELLED' ORDER BY id DESC LIMIT 1`,
          [customerId]
        );
        if (ride && ride.rider_id) {
          const rider = await UserModel.findById(ride.rider_id);
          const riderProfile = await RiderModel.getProfile(ride.rider_id);
          const riderUpi = (riderProfile?.upi_id || '').trim() || (rider?.phone ? `${rider.phone}@upi` : 'driver@upi');
          penalty = await PenaltyModel.create({
            rideId: ride.id,
            customerId: customerId,
            riderId: ride.rider_id,
            amount: 15.00,
            riderUpiId: riderUpi,
            riderName: rider?.name || 'Campus Driver',
            notes: 'Cancellation fee claimed as paid directly by passenger'
          });
        }
      } catch (_) {}
    }

    // If there is truly no penalty in the database, clear any block and return success
    if (!penalty) {
      return {
        id: null,
        status: 'SETTLED',
        message: 'No pending driver compensation found. Your account is clear to book rides.'
      };
    }

    const updated = await PenaltyModel.claimPaid(penalty.id, paymentReference || `CLAIMED_AT_${Date.now()}`);

    // Notify Rider in real-time
    if (socketManager) {
      socketManager.emitPenaltyPaymentClaimed(updated);
      socketManager.emitPenaltyStatusUpdate(updated);
    }

    try {
      await NotificationModel.create({
        userId: penalty.rider_id,
        title: '₹15 Payment Verification Needed',
        message: `Passenger ${penalty.customer_name || 'Customer'} marked ₹15 compensation as paid to your UPI for Ride #${penalty.ride_code || ''}. Please confirm receipt.`,
        type: 'PENALTY_CONFIRMATION_REQUESTED',
        data: { penaltyId: penalty.id, rideId: penalty.ride_id, amount: 15.00 }
      });
    } catch (_) {}

    return updated;
  },

  /**
   * Driver confirms or rejects ₹15 compensation payment receipt
   */
  async confirmPenaltyPayment(penaltyId, riderId, isConfirmed, notes = null) {
    const PenaltyModel = require('../models/penalty.model');
    const penalty = await PenaltyModel.findById(penaltyId);
    if (!penalty) throw new Error('Penalty record not found.');
    if (penalty.rider_id !== riderId) throw new Error('Unauthorized driver.');

    const updated = await PenaltyModel.confirmByRider(penaltyId, Boolean(isConfirmed), notes);

    // Notify Customer and broadcast status update
    if (socketManager) {
      socketManager.emitPenaltyStatusUpdate(updated);
    }

    if (isConfirmed) {
      await NotificationModel.create({
        userId: penalty.customer_id,
        title: 'Payment Confirmed by Driver',
        message: `Driver ${penalty.rider_name || 'Driver'} confirmed receipt of your ₹15 compensation for Ride #${penalty.ride_code}. Booking unlocked!`,
        type: 'PENALTY_CONFIRMED',
        data: { penaltyId, status: 'PAID' }
      });
    } else {
      await NotificationModel.create({
        userId: penalty.customer_id,
        title: 'Payment Not Received by Driver',
        message: `Driver indicated ₹15 was not received for Ride #${penalty.ride_code}. Please verify your UPI transaction.`,
        type: 'PENALTY_REJECTED',
        data: { penaltyId, status: 'UNPAID' }
      });
    }

    return updated;
  },

  /**
   * Admin Waive or Mark Paid Penalty
   */
  async updatePenaltyStatus(penaltyId, status, adminId, notes = null) {
    const PenaltyModel = require('../models/penalty.model');
    const penalty = await PenaltyModel.findById(penaltyId);
    if (!penalty) throw new Error('Penalty record not found.');

    let updated;
    if (status === 'PAID') {
      updated = await PenaltyModel.markAsPaid(penaltyId, `ADMIN-VERIFIED-${Date.now()}`);
    } else if (status === 'WAIVED') {
      updated = await PenaltyModel.waivePenalty(penaltyId, adminId, notes || 'Waived by Admin');
    } else {
      throw new Error(`Invalid status: ${status}`);
    }

    if (socketManager) {
      socketManager.emitPenaltyStatusUpdate(updated);
    }

    return updated;
  },

  /**
   * Submit Rating and Review
   */
  async submitRating({ rideId, customerId, rating, review }) {
    const ride = await RideModel.findById(rideId);
    if (!ride) throw new Error('Ride not found.');
    if (String(ride.customer_id) !== String(customerId)) throw new Error('Unauthorized.');
    if (ride.status !== RIDE_STATUS.COMPLETED) {
      throw new Error('Can only rate completed rides.');
    }

    const numRating = Math.min(5, Math.max(1, parseFloat(rating) || 5));
    const targetRiderId = ride.rider_id || ride.assigned_rider_id;

    const db = require('../config/database');
    const existing = await db.queryOne('SELECT id FROM ratings WHERE ride_id = ?', [rideId]);
    if (existing) {
      await db.query('UPDATE ratings SET rating = ?, review = ? WHERE ride_id = ?', [numRating, review || null, rideId]);
    } else {
      await db.query(
        'INSERT INTO ratings (ride_id, customer_id, rider_id, rating, review) VALUES (?, ?, ?, ?, ?)',
        [rideId, customerId, targetRiderId || customerId, numRating, review || null]
      );
    }

    if (targetRiderId) {
      try {
        await RiderModel.updateRating(targetRiderId, numRating);
      } catch (rateErr) {
        console.warn('Could not update rider profile rating:', rateErr.message);
      }
    }

    return { rideId, rating: numRating, review };
  }
};

module.exports = RideService;
