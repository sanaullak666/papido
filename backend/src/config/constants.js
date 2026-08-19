/**
 * Papido Platform Constants
 */

const ROLES = {
  ADMIN: 'ADMIN',
  RIDER: 'RIDER',       // Rider means the DRIVER who provides the ride
  CUSTOMER: 'CUSTOMER'  // Customer means the PASSENGER who books the ride
};

const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION'
};

const VERIFICATION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

const VEHICLE_TYPES = {
  BIKE: 'BIKE',
  SCOOTER: 'SCOOTER',
  AUTO: 'AUTO',
  CAB_MINI: 'CAB_MINI',
  CAB_SEDAN: 'CAB_SEDAN'
};

const RIDE_STATUS = {
  PENDING_ADMIN_QUOTE: 'PENDING_ADMIN_QUOTE',
  REQUESTED: 'REQUESTED',
  ACCEPTED: 'ACCEPTED',
  RIDER_ARRIVING: 'RIDER_ARRIVING',
  RIDER_REACHED: 'RIDER_REACHED',
  STARTED: 'STARTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

const PAYMENT_METHODS = {
  CASH: 'CASH',
  WALLET: 'WALLET',
  UPI: 'UPI',
  CARD: 'CARD'
};

const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  AUTHENTICATE: 'authenticate',
  
  // Rider Live Updates
  RIDER_STATUS_TOGGLE: 'rider:status_toggle',
  RIDER_LOCATION_UPDATE: 'rider:location_update',
  
  // Ride Lifecycle
  NEW_RIDE_REQUEST: 'ride:new_request',
  RIDE_ACCEPTED: 'ride:accepted',
  RIDE_REJECTED: 'ride:rejected',
  RIDER_ARRIVING: 'ride:rider_arriving',
  RIDER_REACHED: 'ride:rider_reached',
  RIDE_STARTED: 'ride:started',
  RIDE_COMPLETED: 'ride:completed',
  RIDE_CANCELLED: 'ride:cancelled',
  
  // Tracking & Telemetry
  RIDE_LOCATION_TRACK: 'ride:location_track',
  NOTIFICATION: 'notification:new'
};

module.exports = {
  ROLES,
  USER_STATUS,
  VERIFICATION_STATUS,
  VEHICLE_TYPES,
  RIDE_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  SOCKET_EVENTS
};
