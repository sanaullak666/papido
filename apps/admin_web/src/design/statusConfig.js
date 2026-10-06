import {
  Clock,
  UserCheck,
  Navigation,
  MapPin,
  ShieldCheck,
  Compass,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

export const RIDE_STATUSES = {
  requested: {
    key: 'requested',
    label: 'Ride requested',
    tone: 'warning',
    icon: Clock,
    badgeClass: 'badge-warning',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    description: 'Waiting for available driver assignment'
  },
  assigned: {
    key: 'assigned',
    label: 'Driver assigned',
    tone: 'info',
    icon: UserCheck,
    badgeClass: 'badge-info',
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
    description: 'Driver matched and preparing to proceed'
  },
  arriving: {
    key: 'arriving',
    label: 'Driver arriving',
    tone: 'info',
    icon: Navigation,
    badgeClass: 'badge-info',
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
    description: 'Driver en route to pickup location'
  },
  reached: {
    key: 'reached',
    label: 'Driver reached',
    tone: 'success',
    icon: MapPin,
    badgeClass: 'badge-success',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    description: 'Driver waiting at pickup point'
  },
  otp_verified: {
    key: 'otp_verified',
    label: 'OTP verified',
    tone: 'success',
    icon: ShieldCheck,
    badgeClass: 'badge-success',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    description: 'Passenger PIN verified, ride commencing'
  },
  in_progress: {
    key: 'in_progress',
    label: 'Ride in progress',
    tone: 'primary',
    icon: Compass,
    badgeClass: 'badge-primary',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
    description: 'En route to destination'
  },
  completed: {
    key: 'completed',
    label: 'Completed',
    tone: 'success',
    icon: CheckCircle2,
    badgeClass: 'badge-success',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    description: 'Ride concluded successfully'
  },
  cancelled: {
    key: 'cancelled',
    label: 'Cancelled',
    tone: 'danger',
    icon: XCircle,
    badgeClass: 'badge-danger',
    color: '#F43F5E',
    bgColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
    description: 'Trip cancelled by customer or rider'
  }
};

/**
 * Normalizes any backend or legacy status string into canonical status config
 * e.g. 'DRIVER_ASSIGNED' -> RIDE_STATUSES.assigned
 */
export function getRideStatus(rawStatus) {
  if (!rawStatus) return RIDE_STATUSES.requested;
  const s = String(rawStatus).toLowerCase().trim().replace(/[\s-]+/g, '_');

  if (s === 'requested' || s === 'pending' || s === 'searching' || s === 'driver_requested') {
    return RIDE_STATUSES.requested;
  }
  if (s === 'assigned' || s === 'driver_assigned' || s === 'accepted') {
    return RIDE_STATUSES.assigned;
  }
  if (s === 'arriving' || s === 'driver_arriving' || s === 'on_the_way') {
    return RIDE_STATUSES.arriving;
  }
  if (s === 'reached' || s === 'driver_reached' || s === 'arrived') {
    return RIDE_STATUSES.reached;
  }
  if (s === 'otp_verified' || s === 'verified' || s === 'boarded') {
    return RIDE_STATUSES.otp_verified;
  }
  if (s === 'in_progress' || s === 'ongoing' || s === 'active' || s === 'started') {
    return RIDE_STATUSES.in_progress;
  }
  if (s === 'completed' || s === 'finished' || s === 'ended' || s === 'done') {
    return RIDE_STATUSES.completed;
  }
  if (s === 'cancelled' || s === 'canceled' || s === 'aborted' || s === 'rejected') {
    return RIDE_STATUSES.cancelled;
  }

  // Fallback
  return {
    key: s,
    label: rawStatus.replace(/_/g, ' '),
    tone: 'warning',
    icon: AlertCircle,
    badgeClass: 'badge-warning',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    description: rawStatus
  };
}

export const RIDE_PROGRESSION_ORDER = [
  'requested',
  'assigned',
  'arriving',
  'reached',
  'otp_verified',
  'in_progress',
  'completed'
];
