import React, { useState, useEffect, useRef } from 'react';
import './RiderPortalView.css';
import { useAuth } from '../context/AuthContext';
import { apiRequest, getSocketUrl } from '../api';
import { io } from 'socket.io-client';
import {
  Bike,
  Navigation,
  CheckCircle,
  XCircle,
  Phone,
  DollarSign,
  TrendingUp,
  FileText,
  User,
  Lock,
  Radio,
  Clock,
  Shield,
  LogOut,
  ArrowRight,
  AlertTriangle,
  Upload,
  Volume2,
  VolumeX,
  Bell,
  Zap,
  Users,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  MapPin,
  X,
  QrCode,
  CreditCard,
  Smartphone,
  Send,
  Copy,
  Check,
  Calendar,
  RefreshCw,
  Power,
  Volume1,
  Volume,
  Activity,
  Gauge,
  Wallet,
  Coins,
  FileCheck2,
  Car
} from 'lucide-react';
import { alertManager } from '../utils/alertManager';
import { RiderOnlineToggle } from '../components/rider/RiderOnlineToggle';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { RideStatusStepper } from '../components/ride/RideStatusStepper';

const getTodayDateString = () => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch (_) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

const getYesterdayDateString = () => {
  try {
    const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch (_) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

const getHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getRiderTabFromPath = (path) => {
  const clean = (path || window.location.pathname || '').toLowerCase().replace(/\/+$/, '');
  if (clean.endsWith('/active') || clean.endsWith('/trip')) return 'active';
  if (clean.endsWith('/advance') || clean.endsWith('/scheduled') || clean.endsWith('/prebook')) return 'scheduled';
  if (clean.endsWith('/settlement') || clean.endsWith('/settlements')) return 'settlements';
  if (clean.endsWith('/earnings')) return 'earnings';
  if (clean.endsWith('/kyc') || clean.endsWith('/vehicle')) return 'kyc';
  if (clean.endsWith('/profile')) return 'profile';
  return 'radar';
};

const formatRideDateTime = (dateVal) => {
  if (!dateVal) return 'Recent';
  try {
    const str = String(dateVal).trim();
    const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
    if (isNaN(d.getTime())) return 'Recent';
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (_) {
    return 'Recent';
  }
};

const isScheduledTimeReached = (dateVal, bufferMinutes = 10) => {
  if (!dateVal) return true;
  try {
    const str = String(dateVal).trim();
    const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
    if (isNaN(d.getTime())) return true;
    return Date.now() >= (d.getTime() - bufferMinutes * 60 * 1000);
  } catch (_) {
    return true;
  }
};

const getScheduleGapConflict = (candidateTimeVal, reservedList) => {
  if (!candidateTimeVal || !reservedList || reservedList.length === 0) return null;
  try {
    const targetStr = String(candidateTimeVal).trim();
    const targetMs = new Date(targetStr.includes('T') ? targetStr : targetStr.replace(' ', 'T')).getTime();
    if (isNaN(targetMs)) return null;

    for (const res of reservedList) {
      const existTime = res.scheduled_time_ist || res.scheduled_time;
      if (!existTime) continue;
      const resStr = String(existTime).trim();
      const resMs = new Date(resStr.includes('T') ? resStr : resStr.replace(' ', 'T')).getTime();
      if (isNaN(resMs)) continue;

      const diffMin = Math.abs(targetMs - resMs) / (1000 * 60);
      if (diffMin < 15) {
        return {
          conflictingRideCode: res.ride_code || res.id,
          conflictingTime: existTime,
          diffMinutes: Math.round(diffMin)
        };
      }
    }
  } catch (_) {}
  return null;
};

export function RiderPortalView() {
  const { user, token, logout, updateProfile, changePassword } = useAuth();
  const [currentTab, setCurrentTab] = useState(() => getRiderTabFromPath(window.location.pathname));

  useEffect(() => {
    const handleLocationChange = () => {
      if (!window.location.pathname.startsWith('/admin')) {
        setCurrentTab(getRiderTabFromPath(window.location.pathname));
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    if (!window.location.pathname.startsWith('/admin')) {
      const tab = getRiderTabFromPath(window.location.pathname);
      setCurrentTab(tab);
      const pathMap = {
        radar: '/driver/radar',
        active: '/driver/active',
        scheduled: '/driver/advance',
        earnings: '/driver/earnings',
        settlements: '/driver/settlements',
        kyc: '/driver/kyc',
        profile: '/driver/profile'
      };
      const cleanPath = window.location.pathname.replace(/\/+$/, '');
      if (cleanPath === '/driver' || cleanPath === '/rider' || cleanPath === '' || cleanPath === '/') {
        window.history.replaceState({}, '', pathMap[tab]);
      }
    }
  }, []);

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
    if (!window.location.pathname.startsWith('/admin')) {
      const pathMap = {
        radar: '/driver/radar',
        active: '/driver/active',
        scheduled: '/driver/advance',
        earnings: '/driver/earnings',
        settlements: '/driver/settlements',
        kyc: '/driver/kyc',
        profile: '/driver/profile'
      };
      const targetPath = pathMap[tabId] || '/driver/radar';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    }
  };

  const [isOnline, setIsOnline] = useState(user?.profile?.verification_status === 'APPROVED' ? Boolean(user?.profile?.is_online) : false);

  const [incomingRequests, setIncomingRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [activeRideLoading, setActiveRideLoading] = useState(false);
  const [declinedRideIds, setDeclinedRideIds] = useState(() => new Set());
  const [tripCancelledNotice, setTripCancelledNotice] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [acceptingRideId, setAcceptingRideId] = useState(null);
  const [waitingLoading, setWaitingLoading] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState(null);

  const [soundEnabled, setSoundEnabled] = useState(true);

  const [earnings, setEarnings] = useState({
    todayTotal: 0,
    netDriverEarning: 0,
    companyCommission: 0,
    todayTrips: 0,
    trips: []
  });
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [riderRides, setRiderRides] = useState([]);

  const [selectedSettlementDate, setSelectedSettlementDate] = useState(getTodayDateString);
  const [shiftSettlement, setShiftSettlement] = useState(null);
  const [loadingShiftSettlement, setLoadingShiftSettlement] = useState(false);
  const [submittingShiftSettlement, setSubmittingShiftSettlement] = useState(false);
  const [shiftUtrInput, setShiftUtrInput] = useState('');
  const [copiedAdminUpi, setCopiedAdminUpi] = useState(false);
  const [showAdminQr, setShowAdminQr] = useState(false);
  const [shiftSuccessMsg, setShiftSuccessMsg] = useState('');

  const [vehicleType, setVehicleType] = useState(user?.profile?.vehicle_type || 'BIKE');
  const [vehicleModel, setVehicleModel] = useState(user?.profile?.vehicle_model || '');
  const [vehicleNumber, setVehicleNumber] = useState(user?.profile?.vehicle_number || '');
  const [licenseNumber, setLicenseNumber] = useState(user?.profile?.license_number || '');
  const [upiId, setUpiId] = useState(user?.profile?.upi_id || '');
  const [kycStatus, setKycStatus] = useState(user?.profile?.verification_status || user?.profile?.kyc_status || 'PENDING');
  const [profileTotalRides, setProfileTotalRides] = useState(0);
  const [savingKyc, setSavingKyc] = useState(false);
  const [pendingPenaltiesToVerify, setPendingPenaltiesToVerify] = useState([]);

  const [availableScheduledRides, setAvailableScheduledRides] = useState([]);
  const [reservedScheduledRides, setReservedScheduledRides] = useState([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [scheduledActionLoadingId, setScheduledActionLoadingId] = useState(null);
  const [scheduledSuccessAlert, setScheduledSuccessAlert] = useState(null);

  useEffect(() => {
    if (user?.profile) {
      const vStatus = user.profile.verification_status || user.profile.kyc_status || 'PENDING';
      setKycStatus(vStatus);
      if (user.profile.vehicle_type) setVehicleType(user.profile.vehicle_type);
      if (user.profile.vehicle_model) setVehicleModel(user.profile.vehicle_model);
      if (user.profile.vehicle_number) setVehicleNumber(user.profile.vehicle_number);
      if (user.profile.license_number) setLicenseNumber(user.profile.license_number);
      if (user.profile.upi_id) setUpiId(user.profile.upi_id);
      if (vStatus !== 'APPROVED') {
        setIsOnline(false);
      }
    }
  }, [user]);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState(null);
  const [passSuccess, setPassSuccess] = useState(null);
  const [passUpdating, setPassUpdating] = useState(false);

  const [riderLocation, setRiderLocation] = useState(null);
  const locationWatchIdRef = useRef(null);
  const lastLocationEmitRef = useRef({ timestamp: 0, lat: null, lng: null });

  const socketRef = useRef(null);
  const prevKnownRideIdsRef = useRef(new Set());

  const calcDriverSplit = (rawFare) => {
    const f = parseFloat(rawFare) || 0;
    if (f <= 80) {
      const fee = Math.min(f, 4.0);
      const rider = Math.max(0, f - fee);
      return { rider, company: 2.0, controller: 2.0, platformFee: fee };
    } else {
      const comp = Number((f * 0.10).toFixed(2));
      const ctrl = 2.0;
      const fee = Number((comp + ctrl).toFixed(2));
      const rider = Number(Math.max(0, f - fee).toFixed(2));
      return { rider, company: comp, controller: ctrl, platformFee: fee };
    }
  };

  const getRideLocalDay = (ride) => {
    const raw = ride?.completed_at || ride?.created_at || ride?.requested_at;
    if (!raw) return '';
    try {
      const str = String(raw).trim();
      const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
      if (isNaN(d.getTime())) return String(raw).slice(0, 10);
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d);
    } catch (_) {
      return String(raw).slice(0, 10);
    }
  };

  const completedRidesList = (riderRides || []).filter(r =>
    !r.status || r.status === 'COMPLETED' || r.status === 'PAID'
  );

  const todayDateStr = getTodayDateString();
  const todayRidesList = completedRidesList.filter(r => {
    const rideDay = getRideLocalDay(r);
    return rideDay === todayDateStr;
  });

  const clientTodayTrips = todayRidesList.length;
  const clientLifetimeTrips = completedRidesList.length;

  const clientTodayNet = todayRidesList.reduce((sum, r) => {
    const fare = Number(r.total_fare || r.final_fare || r.estimated_fare || 20);
    const split = calcDriverSplit(fare);
    return sum + (r.rider_earning !== undefined ? Number(r.rider_earning) : split.rider);
  }, 0);

  const clientTodayPlatformFee = todayRidesList.reduce((sum, r) => {
    const fare = Number(r.total_fare || r.final_fare || r.estimated_fare || 20);
    const split = calcDriverSplit(fare);
    return sum + split.platformFee;
  }, 0);

  const clientLifetimePlatformFee = completedRidesList.reduce((sum, r) => {
    const fare = Number(r.total_fare || r.final_fare || r.estimated_fare || 20);
    const split = calcDriverSplit(fare);
    return sum + split.platformFee;
  }, 0);

  const clientLifetimeNet = completedRidesList.reduce((sum, r) => {
    const fare = Number(r.total_fare || r.final_fare || r.estimated_fare || 20);
    const split = calcDriverSplit(fare);
    return sum + (r.rider_earning !== undefined ? Number(r.rider_earning) : split.rider);
  }, 0);

  const todayNetEarning = Number(
    earnings?.todayTotal || earnings?.netDriverEarning || earnings?.summary?.today?.earnings || clientTodayNet || 0
  );
  const todayTripsCount = Number(
    earnings?.todayTrips || earnings?.summary?.today?.rides || clientTodayTrips || 0
  );
  const lifetimeTripsCount = Math.max(
    Number(earnings?.lifetimeTrips || earnings?.summary?.lifetime?.rides || 0),
    clientLifetimeTrips,
    profileTotalRides,
    todayTripsCount
  );
  const totalPlatformFee = Number(
    earnings?.totalPlatformFee || earnings?.summary?.lifetime?.platformFee || clientLifetimePlatformFee || (lifetimeTripsCount * 4) || 0
  );
  const todayPlatformFee = Number(
    earnings?.todayPlatformFee || earnings?.companyCommission || earnings?.summary?.today?.platformFee || clientTodayPlatformFee || (todayTripsCount * 4) || 0
  );

  const pendingShiftsList = shiftSettlement?.pendingShifts || (shiftSettlement?.recentShifts || []).filter(
    s => s.status !== 'SETTLED' && Number(s.totalCommissionDue || 0) > 0
  );
  const totalPendingCommissionDues = Number(
    shiftSettlement?.totalPendingDues || pendingShiftsList.reduce((sum, s) => sum + Number(s.totalCommissionDue || 0), 0)
  ).toFixed(2);

  const fetchShiftSettlement = async (targetDate) => {
    try {
      setLoadingShiftSettlement(true);
      const queryDate = targetDate || selectedSettlementDate || getTodayDateString();
      const res = await apiRequest(`/rider/shift-settlement?date=${queryDate}`, 'GET', null, token);
      if (res?.data) {
        setShiftSettlement(res.data);
        if (res.data.utrReference) {
          setShiftUtrInput(res.data.utrReference);
        } else {
          setShiftUtrInput('');
        }
      }
    } catch (_) {}
    finally {
      setLoadingShiftSettlement(false);
    }
  };

  const handleSubmitShiftSettlement = async (e) => {
    if (e) e.preventDefault();
    if (!shiftUtrInput || !shiftUtrInput.trim()) {
      alert('Please enter your 12-digit UPI transaction reference (UTR) number.');
      return;
    }
    try {
      setSubmittingShiftSettlement(true);
      const targetDate = shiftSettlement?.date || selectedSettlementDate || getTodayDateString();
      const res = await apiRequest('/rider/shift-settlement/submit', 'POST', {
        date: targetDate,
        utrReference: shiftUtrInput.trim()
      }, token);
      if (res?.data) {
        setShiftSettlement(res.data);
      } else {
        await fetchShiftSettlement(targetDate);
      }
      setShiftSuccessMsg(`Shift settlement for ${targetDate} submitted to Admin for verification.`);
      setTimeout(() => setShiftSuccessMsg(''), 6000);
    } catch (err) {
      alert(err.message || 'Failed to submit shift settlement.');
    } finally {
      setSubmittingShiftSettlement(false);
    }
  };

  const handleToggleOnline = async () => {
    if (!isOnline && kycStatus !== 'APPROVED') {
      alert(`Cannot go online. Your driver account is ${kycStatus}. Admin approval of your Campus ID, Driving Licence, and RC is required before you can accept rides.`);
      return;
    }

    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    if (socketRef.current) {
      socketRef.current.emit('rider:status_toggle', { isOnline: nextStatus, riderId: user?.id });
    }
    try {
      await apiRequest('/rider/status', 'PATCH', { isOnline: nextStatus }, token);
    } catch (err) {
      console.warn('Status toggle warning:', err);
      setIsOnline(!nextStatus);
      alert(err.message || 'Failed to update online status.');
    }
  };

  const fetchActiveRide = async () => {
    try {
      setActiveRideLoading(true);
      const res = await apiRequest('/rider/active-ride', 'GET', null, token);
      if (res.data) {
        const r = res.data;
        if (r.status === 'CANCELLED') {
          if (activeRide) {
            setTripCancelledNotice(`Passenger cancelled Trip #${r.id}. Returning to Radar.`);
          }
          setActiveRide(null);
          setCurrentTab('radar');
          fetchAvailableRequests();
          return;
        }
        const fare = r.total_fare || r.final_fare || r.estimated_fare || 20;
        const split = calcDriverSplit(fare);
        setActiveRide({
          ...r,
          total_fare: fare,
          estimated_fare: fare,
          final_fare: fare
        });
      } else {
        setActiveRide(null);
      }
    } catch (err) {
      console.warn('Failed to fetch active rider trip:', err);
    } finally {
      setActiveRideLoading(false);
    }
  };

  const fetchEarnings = async (isBackground = false) => {
    try {
      if (!isBackground) setLoadingEarnings(true);
      const [earningsRes, ridesRes] = await Promise.all([
        apiRequest('/rider/earnings', 'GET', null, token),
        apiRequest('/rider/rides?limit=50', 'GET', null, token)
      ]);
      if (earningsRes.data) {
        setEarnings(earningsRes.data);
      }
      const pastItems = ridesRes.data?.items || ridesRes.data?.rides || (Array.isArray(ridesRes.data) ? ridesRes.data : []);
      setRiderRides(pastItems);
    } catch (err) {
      console.warn('Failed to fetch rider earnings:', err);
    } finally {
      if (!isBackground) setLoadingEarnings(false);
    }
  };

  const fetchPendingPenalties = async () => {
    if (!token) return;
    try {
      const res = await apiRequest('/rider/penalties/pending', 'GET', null, token);
      setPendingPenaltiesToVerify(res?.data || []);
    } catch (err) {
      console.warn('Failed to fetch pending penalties:', err);
    }
  };

  const handleConfirmPenalty = async (penaltyId, isConfirmed) => {
    try {
      await apiRequest(`/rider/penalties/${penaltyId}/confirm`, 'POST', {
        isConfirmed
      }, token);
      if (isConfirmed) {
        alert('₹15 Payment receipt confirmed! Passenger has been unlocked.');
      } else {
        alert('Payment marked as not received. Passenger remains blocked.');
      }
      fetchPendingPenalties();
      fetchEarnings(true);
    } catch (err) {
      alert(err.message || 'Failed to update payment confirmation.');
    }
  };

  const fetchAvailableRequests = async () => {
    if (!isOnline || activeRide) {
      return;
    }
    try {
      const res = await apiRequest('/rider/requests', 'GET', null, token);
      const list = res.data || [];
      const myGender = (user?.gender || '').toUpperCase();
      const myVehicle = (user?.profile?.vehicle_type || vehicleType || 'BIKE').toUpperCase();
      const available = list
        .filter(r => !declinedRideIds.has(String(r.id)))
        .filter(r => {
          const isFemaleOnly = Boolean(r.female_rider_only || r.femaleRiderOnly);
          if (isFemaleOnly && myGender !== 'FEMALE') return false;

          const reqVehicle = (r.vehicle_type || r.vehicleType || 'ANY').toUpperCase();
          if (reqVehicle !== 'ANY' && reqVehicle !== myVehicle) return false;

          return true;
        })
        .map(r => {
          const fare = Number(r.total_fare || r.final_fare || r.estimated_fare || 20);
          return {
            ...r,
            id: r.id,
            pickup_address: r.pickup_address || r.pickupAddress,
            destination_address: r.destination_address || r.destinationAddress,
            total_fare: fare,
            estimated_fare: fare,
            customer_name: r.customer_name || r.customerName || 'Passenger',
            female_rider_only: Boolean(r.female_rider_only || r.femaleRiderOnly),
            is_double_ride: Boolean(r.is_double_ride || r.isDoubleRide),
            is_outside: Boolean(r.is_outside || r.isOutside),
            vehicle_type: r.vehicle_type || r.vehicleType || 'BIKE'
          };
        });

      const hasNewRequest = available.some(r => !prevKnownRideIdsRef.current.has(String(r.id)));

      if (hasNewRequest && available.length > 0 && !activeRide && soundEnabled) {
        const topReq = available[0];
        alertManager.triggerRideAlert({
          title: `New Ride Request: ₹${topReq.total_fare || 20}`,
          body: `Pickup: ${topReq.pickup_address} → Drop: ${topReq.destination_address}`,
          repeat: true
        });
      }

      prevKnownRideIdsRef.current = new Set(available.map(r => String(r.id)));
      setIncomingRequests(available);
    } catch (err) {
      console.warn('Failed to poll available requests:', err);
    }
  };

  const fetchScheduledRides = async (isBackground = false) => {
    if (!token) return;
    try {
      if (!isBackground) setLoadingScheduled(true);
      const [openRes, resRes] = await Promise.all([
        apiRequest('/rider/rides/scheduled/available', 'GET', null, token),
        apiRequest('/rider/rides/scheduled/reserved', 'GET', null, token)
      ]);
      setAvailableScheduledRides(openRes.data || []);
      setReservedScheduledRides(resRes.data || []);
    } catch (err) {
      console.warn('Failed to fetch scheduled rides:', err);
    } finally {
      if (!isBackground) setLoadingScheduled(false);
    }
  };

  const handleAcceptScheduledRide = async (rideId) => {
    try {
      setScheduledActionLoadingId(rideId);
      const res = await apiRequest(`/rider/rides/${rideId}/accept-scheduled`, 'POST', {}, token);
      setScheduledSuccessAlert('Pre-booked ride claimed! Confirmed in your Advance Schedule.');
      await fetchScheduledRides();
      setTimeout(() => setScheduledSuccessAlert(null), 4000);
    } catch (err) {
      alert(err.message || 'Failed to claim scheduled ride.');
    } finally {
      setScheduledActionLoadingId(null);
    }
  };

  const handleCancelScheduledRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to release this advance pre-booking? It will be reopened for other campus riders.')) {
      return;
    }
    try {
      setScheduledActionLoadingId(rideId);
      await apiRequest(`/rider/rides/${rideId}/cancel-scheduled`, 'POST', { reason: 'Rider cancelled advance reservation' }, token);
      setScheduledSuccessAlert('Reservation released. Reopened for other campus riders.');
      await fetchScheduledRides();
      setTimeout(() => setScheduledSuccessAlert(null), 4000);
    } catch (err) {
      alert(err.message || 'Failed to cancel scheduled ride.');
    } finally {
      setScheduledActionLoadingId(null);
    }
  };

  const handleStartScheduledTrip = async (ride) => {
    const schedTime = ride.scheduled_time_ist || ride.scheduled_time;
    if (!isScheduledTimeReached(schedTime, 15)) {
      alert(`This booking is scheduled for ${formatRideDateTime(schedTime)}. Active trip view will be enabled 15 minutes before the booked pickup time.`);
      return;
    }
    try {
      setScheduledActionLoadingId(ride.id);
      const fare = ride.total_fare || ride.final_fare || ride.estimated_fare || 20;
      const split = calcDriverSplit(fare);
      setActiveRide({
        ...ride,
        total_fare: fare,
        estimated_fare: fare,
        final_fare: fare,
        rider_earning: ride.rider_earning || split.rider,
        company_earning: ride.company_earning || split.company,
        controller_earning: ride.controller_earning || split.controller
      });
      setCurrentTab('active');
      handleTabChange('active');
    } catch (err) {
      alert(err.message || 'Failed to start scheduled trip.');
    } finally {
      setScheduledActionLoadingId(null);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiRequest('/rider/profile', 'GET', null, token);
        if (res?.data) {
          const p = res.data;
          const vStatus = p.verification_status || 'PENDING';
          setKycStatus(vStatus);
          if (p.vehicle_type) setVehicleType(p.vehicle_type);
          if (p.vehicle_model) setVehicleModel(p.vehicle_model);
          if (p.vehicle_number) setVehicleNumber(p.vehicle_number);
          if (p.license_number) setLicenseNumber(p.license_number);
          if (p.total_rides !== undefined || p.totalRides !== undefined) {
            setProfileTotalRides(Number(p.total_rides || p.totalRides || 0));
          }
          if (vStatus !== 'APPROVED') {
            setIsOnline(false);
          } else if (p.is_online !== undefined) {
            setIsOnline(Boolean(p.is_online));
          }
        }
      } catch (_) {}
    };

    fetchProfile();
    fetchActiveRide();
    fetchEarnings();
    fetchAvailableRequests();
    fetchShiftSettlement();
    fetchScheduledRides(false);
    if (token) {
      alertManager.subscribeToPushNotifications(token);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchPendingPenalties();
    fetchScheduledRides(true);
    const earningsInterval = setInterval(() => {
      fetchEarnings(true);
      fetchPendingPenalties();
      fetchScheduledRides(true);
    }, 15000);
    return () => clearInterval(earningsInterval);
  }, [token]);

  useEffect(() => {
    if (currentTab === 'earnings') {
      fetchEarnings(false);
      fetchShiftSettlement();
    } else if (currentTab === 'scheduled') {
      fetchScheduledRides(false);
    }
    fetchPendingPenalties();
  }, [currentTab]);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.emit('rider:status_toggle', { isOnline, riderId: user?.id });
    }
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline && !activeRide) {
      if (locationWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      console.warn('Geolocation API is not supported by this browser.');
      return;
    }

    const handlePosition = (position) => {
      const { latitude, longitude, heading, speed, accuracy } = position.coords;
      const now = Date.now();
      const currentLoc = {
        latitude,
        longitude,
        heading: (heading !== null && !isNaN(heading)) ? heading : 0,
        speed: (speed !== null && !isNaN(speed)) ? speed : 0,
        accuracy: accuracy || 10,
        timestamp: now
      };

      setRiderLocation(currentLoc);

      const last = lastLocationEmitRef.current;
      const timeDiff = now - last.timestamp;
      const isMoving = (speed && speed > 1);
      const minInterval = isMoving ? 5000 : 10000;

      let distanceMeters = 0;
      if (last.lat !== null && last.lng !== null) {
        distanceMeters = getHaversineDistanceKm(last.lat, last.lng, latitude, longitude) * 1000;
      }

      if (timeDiff >= minInterval || distanceMeters >= 20 || last.lat === null) {
        lastLocationEmitRef.current = { timestamp: now, lat: latitude, lng: longitude };
        if (socketRef.current) {
          socketRef.current.emit('rider:location_update', {
            riderId: user?.id,
            rideId: activeRide?.id || null,
            latitude,
            longitude,
            heading: currentLoc.heading,
            speed: currentLoc.speed,
            accuracy: currentLoc.accuracy,
            timestamp: now
          });
        }
      }
    };

    const handleError = (err) => {
      console.warn('Rider geolocation watch notice:', err.message);
    };

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      }
    );

    return () => {
      if (locationWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };
  }, [isOnline, Boolean(activeRide), user?.id, activeRide?.id]);

  useEffect(() => {
    if (socketRef.current && activeRide?.id) {
      socketRef.current.emit('join_ride', activeRide.id);
      return () => {
        socketRef.current?.emit('leave_ride', activeRide.id);
      };
    }
  }, [activeRide?.id]);

  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      if (activeRide) {
        fetchActiveRide();
      } else {
        fetchAvailableRequests();
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [isOnline, activeRide, declinedRideIds]);

  useEffect(() => {
    if (!isOnline || incomingRequests.length === 0 || activeRide) {
      alertManager.stopRingtone();
    }
  }, [isOnline, incomingRequests.length, activeRide]);

  useEffect(() => {
    setEnteredOtp('');
    setOtpError(null);
  }, [activeRide?.id]);

  useEffect(() => {
    if (!token) return;
    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Rider Socket connected:', socket.id);
      socket.emit('identify', { id: user?.id, role: 'RIDER', name: user?.name, isOnline });
      socket.emit('rider:identify', { riderId: user?.id, status: isOnline ? 'ONLINE' : 'OFFLINE', isOnline });
      fetchAvailableRequests();
    });

    socket.on('ride:new_request', (ride) => {
      console.log('Incoming ride request:', ride);
      if (!isOnline) return;
      const rideId = ride.id || ride.rideId;
      if (!rideId || declinedRideIds.has(String(rideId))) return;

      const isFemaleOnly = Boolean(ride.femaleRiderOnly || ride.female_rider_only);
      const myGender = (user?.gender || '').toUpperCase();
      if (isFemaleOnly && myGender !== 'FEMALE') {
        return;
      }

      const reqVehicle = (ride.vehicleType || ride.vehicle_type || 'ANY').toUpperCase();
      const myVehicle = (user?.profile?.vehicle_type || vehicleType || 'BIKE').toUpperCase();
      if (reqVehicle !== 'ANY' && reqVehicle !== myVehicle) {
        return;
      }

      if (!activeRide) {
        const fare = Number(ride.total_fare || ride.totalFare || ride.estimatedFare || ride.estimated_fare || 20);
        const newReq = {
          id: rideId,
          pickup_address: ride.pickupAddress || ride.pickup_address,
          destination_address: ride.destinationAddress || ride.destination_address,
          total_fare: fare,
          estimated_fare: fare,
          customer_name: ride.customerName || ride.customer_name || 'Passenger',
          female_rider_only: isFemaleOnly,
          is_double_ride: Boolean(ride.isDoubleRide || ride.is_double_ride),
          is_outside: Boolean(ride.isOutside || ride.is_outside),
          vehicle_type: reqVehicle
        };
        setIncomingRequests(prev => {
          const exists = prev.some(r => String(r.id) === String(rideId));
          if (exists) {
            return prev.map(r => String(r.id) === String(rideId) ? newReq : r);
          }
          return [newReq, ...prev];
        });

        if (soundEnabled) {
          alertManager.triggerRideAlert({
            title: `New Ride Request: ₹${fare}`,
            body: `Pickup: ${newReq.pickup_address} → Drop: ${newReq.destination_address}`,
            repeat: true
          });
        }
      }
    });

    socket.on('ride:reopened', (ride) => {
      console.log('Ride reopened by passenger:', ride);
      if (!isOnline) return;
      const rideId = ride.id || ride.rideId;
      if (!rideId || declinedRideIds.has(String(rideId))) return;

      const isFemaleOnly = Boolean(ride.femaleRiderOnly || ride.female_rider_only);
      const myGender = (user?.gender || '').toUpperCase();
      if (isFemaleOnly && myGender !== 'FEMALE') {
        return;
      }

      const reqVehicle = (ride.vehicleType || ride.vehicle_type || 'ANY').toUpperCase();
      const myVehicle = (user?.profile?.vehicle_type || vehicleType || 'BIKE').toUpperCase();
      if (reqVehicle !== 'ANY' && reqVehicle !== myVehicle) {
        return;
      }

      if (!activeRide) {
        const fare = Number(ride.total_fare || ride.totalFare || ride.estimatedFare || ride.estimated_fare || 20);
        const newReq = {
          id: rideId,
          pickup_address: ride.pickupAddress || ride.pickup_address,
          destination_address: ride.destinationAddress || ride.destination_address,
          total_fare: fare,
          estimated_fare: fare,
          customer_name: ride.customerName || ride.customer_name || 'Passenger',
          female_rider_only: isFemaleOnly,
          is_double_ride: Boolean(ride.isDoubleRide || ride.is_double_ride),
          is_outside: Boolean(ride.isOutside || ride.is_outside),
          vehicle_type: reqVehicle
        };
        setIncomingRequests(prev => {
          const exists = prev.some(r => String(r.id) === String(rideId));
          if (exists) {
            return prev.map(r => String(r.id) === String(rideId) ? newReq : r);
          }
          return [newReq, ...prev];
        });

        if (soundEnabled) {
          alertManager.triggerRideAlert({
            title: `Ride Re-opened: ₹${fare}`,
            body: `Pickup: ${newReq.pickup_address} → Drop: ${newReq.destination_address}`,
            repeat: true
          });
        }
      }
    });

    socket.on('ride:status_change', (data) => {
      const rideObj = data?.ride || data;
      const rideId = rideObj?.id || data?.rideId;
      const status = data.status || rideObj?.status;

      if (status === 'CANCELLED') {
        if (activeRide && String(activeRide.id) === String(rideId)) {
          setTripCancelledNotice(`Passenger cancelled Trip #${rideId}. Returning to Radar.`);
          setActiveRide(null);
          setEnteredOtp('');
          setCurrentTab('radar');
          fetchAvailableRequests();
        }
        setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(rideId)));
        return;
      }

      if (activeRide && String(activeRide.id) === String(rideId)) {
        const fare = rideObj.total_fare || rideObj.estimated_fare || rideObj.final_fare || 20;
        setActiveRide(prev => ({
          ...(prev || {}),
          ...rideObj,
          status: status || prev?.status,
          total_fare: fare,
          estimated_fare: fare,
          final_fare: fare
        }));
      }
    });

    socket.on('ride:claimed', (data) => {
      setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(data.rideId)));
    });

    socket.on('ride:cancelled', (data) => {
      const rideObj = data?.ride || data;
      const rideId = rideObj?.id || data?.rideId || data?.id;
      const status = data?.status || rideObj?.status;
      if (status && status !== 'CANCELLED') {
        return;
      }
      if (activeRide && String(activeRide.id) === String(rideId)) {
        setTripCancelledNotice(`Passenger cancelled Trip #${rideId}. Returning to Radar.`);
        setActiveRide(null);
        setEnteredOtp('');
        setCurrentTab('radar');
        fetchAvailableRequests();
      }
      setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(rideId)));
    });

    socket.on('ride:waiting_update', (data) => {
      const rideId = data?.rideId || data?.id;
      if (activeRide && String(activeRide.id) === String(rideId)) {
        const waitingFare = parseFloat(data.waitingFare || data.waiting_fare || 0);
        const baseFare = parseFloat(activeRide.estimated_fare || activeRide.total_fare || 20);
        const totalFare = baseFare + waitingFare;
        const split = calcDriverSplit(totalFare);
        setActiveRide(prev => ({
          ...prev,
          is_waiting: Boolean(data.isWaiting || data.is_waiting),
          waiting_minutes: parseInt(data.waitingMinutes || data.waiting_minutes || 0, 10),
          waiting_fare: waitingFare,
          total_fare: totalFare,
          final_fare: totalFare,
          rider_earning: split.rider,
          company_earning: split.company,
          controller_earning: split.controller
        }));
      }
    });

    socket.on('penalty:payment_claimed', (data) => {
      console.log('Realtime penalty payment claimed by passenger:', data);
      fetchPendingPenalties();
      if (soundEnabled) {
        alertManager.triggerRideAlert({
          title: '₹15 Payment Verification',
          body: `Passenger ${data?.customerName || ''} claims ₹15 paid to your UPI`,
          repeat: false
        });
      }
    });

    socket.on('penalty:status_update', (data) => {
      console.log('Realtime penalty status update:', data);
      fetchPendingPenalties();
    });

    socket.on('rider:shift_settlement_updated', () => {
      fetchShiftSettlement();
      fetchEarnings(false);
    });

    socket.on('ride:new_scheduled_booking', (ride) => {
      fetchScheduledRides();
      if (soundEnabled) {
        alertManager.triggerRideAlert({
          title: `New Advance Pre-Booking: ₹${ride?.estimated_fare || 20}`,
          body: `Pickup: ${ride?.pickup_address || ''} → Drop: ${ride?.destination_address || ''}`,
          repeat: false
        });
      }
    });

    socket.on('ride:scheduled_claimed', (data) => {
      setAvailableScheduledRides(prev => prev.filter(r => String(r.id) !== String(data.rideId)));
      fetchScheduledRides();
    });

    socket.on('ride:scheduled_cancelled', (data) => {
      setAvailableScheduledRides(prev => prev.filter(r => String(r.id) !== String(data.rideId)));
      setReservedScheduledRides(prev => prev.filter(r => String(r.id) !== String(data.rideId)));
    });

    socket.on('ride:scheduled_reopened', () => {
      fetchScheduledRides();
    });

    return () => {
      socket.disconnect();
    };
  }, [token, isOnline, declinedRideIds, activeRide, user]);

  const handleAcceptRequest = async (rideId) => {
    alertManager.stopRingtone();
    setAcceptingRideId(rideId);
    setActionLoading(true);
    setEnteredOtp('');
    setOtpError(null);
    try {
      const res = await apiRequest(`/rider/rides/${rideId}/accept`, 'POST', {}, token);
      const r = res.data;
      const pickupTimeVal = r?.scheduled_time_ist || r?.scheduled_time || r?.scheduledTime;
      const isFutureTime = pickupTimeVal && !isScheduledTimeReached(pickupTimeVal, 10);

      if (isFutureTime) {
        setScheduledSuccessAlert(`Trip confirmed for ${formatRideDateTime(pickupTimeVal)}! It is saved in your upcoming schedule so you can continue taking other rides on Radar.`);
        fetchScheduledRides();
        setIncomingRequests(prev => prev.filter(req => String(req.id) !== String(rideId)));
        setTimeout(() => setScheduledSuccessAlert(null), 5000);
      } else {
        if (r) {
          const fare = r.total_fare || r.final_fare || r.estimated_fare || 20;
          const split = calcDriverSplit(fare);
          setActiveRide({
            ...r,
            total_fare: fare,
            estimated_fare: fare,
            final_fare: fare,
            rider_earning: r.rider_earning || split.rider,
            company_earning: r.company_earning || split.company,
            controller_earning: r.controller_earning || split.controller
          });
        }
        setIncomingRequests([]);
        setCurrentTab('active');
        fetchActiveRide();
      }
    } catch (err) {
      alert(err.message || 'Failed to accept ride. It may have been claimed by another rider.');
      setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(rideId)));
    } finally {
      setActionLoading(false);
      setAcceptingRideId(null);
    }
  };

  const handleDeclineRequest = async (rideId) => {
    alertManager.stopRingtone();
    setDeclinedRideIds(prev => new Set([...prev, String(rideId)]));
    setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(rideId)));
    try {
      await apiRequest(`/rider/rides/${rideId}/decline`, 'POST', {}, token);
    } catch (err) {
      console.warn('Decline error:', err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!activeRide) return;
    setActionLoading(true);
    setOtpError(null);
    try {
      let res;
      if (newStatus === 'RIDER_ARRIVING') {
        res = await apiRequest(`/rider/rides/${activeRide.id}/arriving`, 'POST', {}, token);
      } else if (newStatus === 'RIDER_REACHED') {
        setEnteredOtp('');
        res = await apiRequest(`/rider/rides/${activeRide.id}/reached`, 'POST', {}, token);
      } else if (newStatus === 'STARTED') {
        if (!enteredOtp || enteredOtp.trim().length !== 4) {
          setOtpError('Please enter the 4-digit Ride OTP provided by the passenger.');
          setActionLoading(false);
          return;
        }
        res = await apiRequest(`/rider/rides/${activeRide.id}/start`, 'POST', { otp: enteredOtp.trim() }, token);
        setEnteredOtp('');
      } else if (newStatus === 'COMPLETED') {
        res = await apiRequest(`/rider/rides/${activeRide.id}/complete`, 'POST', {}, token);
        setEnteredOtp('');
        fetchEarnings();
      }

      const rideObj = res.data?.ride || res.data;
      if (rideObj) {
        const fare = rideObj.final_fare || rideObj.total_fare || rideObj.estimated_fare || activeRide.total_fare || 20;
        const split = calcDriverSplit(fare);
        setActiveRide({
          ...activeRide,
          ...rideObj,
          status: newStatus || rideObj.status,
          total_fare: fare,
          estimated_fare: fare,
          final_fare: fare,
          rider_earning: rideObj.rider_earning || res.data?.split?.riderEarning || split.rider,
          company_earning: rideObj.company_earning || res.data?.split?.companyEarning || split.company,
          controller_earning: rideObj.controller_earning || res.data?.split?.controllerEarning || split.controller
        });
      }
    } catch (err) {
      setOtpError(err.message || `Failed to update status to ${newStatus}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleWaiting = async () => {
    if (!activeRide) return;
    setWaitingLoading(true);
    try {
      const nextState = !activeRide.is_waiting;
      const res = await apiRequest(`/rider/rides/${activeRide.id}/waiting`, 'POST', {
        isWaiting: nextState
      }, token);

      const rideObj = res.data?.ride || res.data;
      if (rideObj) {
        const fare = rideObj.final_fare || rideObj.total_fare || rideObj.estimated_fare || activeRide.total_fare || 20;
        const split = calcDriverSplit(fare);
        setActiveRide(prev => ({
          ...prev,
          ...rideObj,
          total_fare: fare,
          estimated_fare: fare,
          final_fare: fare,
          rider_earning: rideObj.rider_earning || split.rider,
          company_earning: rideObj.company_earning || split.company,
          controller_earning: rideObj.controller_earning || split.controller
        }));
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle waiting mode.');
    } finally {
      setWaitingLoading(false);
    }
  };

  const handleCancelActiveTrip = async () => {
    if (!activeRide) return;
    const reason = window.prompt('Enter reason for cancelling this trip (Flat tyre, emergency, etc.):', 'Vehicle issue');
    if (!reason) return;

    setActionLoading(true);
    try {
      await apiRequest(`/rider/rides/${activeRide.id}/cancel`, 'POST', {
        reason
      }, token);
      setDeclinedRideIds(prev => new Set([...prev, String(activeRide.id)]));
      setActiveRide(null);
      setEnteredOtp('');
      setOtpError(null);
      alert('Trip cancelled. It has been re-opened for other drivers and will not appear on your radar again.');
      setCurrentTab('radar');
    } catch (err) {
      alert(err.message || 'Failed to cancel trip.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveKyc = async (e) => {
    e.preventDefault();
    setSavingKyc(true);
    try {
      await apiRequest('/auth/profile', 'PATCH', {
        vehicleType,
        vehicleModel,
        vehicleNumber,
        licenseNumber,
        upiId
      }, token);
      alert('Vehicle, UPI and driver details updated!');
    } catch (err) {
      alert(err.message || 'Failed to save vehicle details.');
    } finally {
      setSavingKyc(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateProfile({ name, phone });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPass.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('New passwords do not match.');
      return;
    }

    setPassUpdating(true);
    try {
      await changePassword(currentPass, newPass);
      setPassSuccess('Password changed successfully!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setShowPasswordModal(false), 2000);
    } catch (err) {
      setPassError(err.message || 'Failed to change password. Check current password.');
    } finally {
      setPassUpdating(false);
    }
  };

  const getMapLink = (address, lat = null, lng = null) => {
    if (lat && lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    if (!address) return '#';
    if (address.startsWith('http://') || address.startsWith('https://')) {
      return address;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const riderNavItems = [
    { id: 'radar', label: 'Radar', icon: Radio, badge: incomingRequests.length > 0 ? incomingRequests.length : null },
    { id: 'active', label: 'Active', icon: Bike, badge: activeRide ? 'dot' : null },
    { id: 'scheduled', label: 'Advance', icon: Calendar, badge: availableScheduledRides.length > 0 ? availableScheduledRides.length : null },
    { id: 'settlements', label: 'Settlements', icon: CreditCard, badge: pendingShiftsList.length > 0 ? pendingShiftsList.length : null },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <div className="rp-page theme-orange-beige has-bottom-nav">
      {/* Header */}
      <header className="rp-header">
        <div className="rp-header-brand">
          <img src="/papidologo.jpeg" alt="Papido Logo" className="rp-header-logo" />
          <div>
            <div className="rp-header-name">
              PAPIDO <span className="rp-header-tag">DRIVER WEB</span>
            </div>
            <div className="rp-header-sub">Campus Driver Operations Console</div>
          </div>
        </div>

        {/* Online / Offline Toggle & Today's Earnings */}
        <div className="rp-header-center">
          <button
            onClick={handleToggleOnline}
            className={`rp-duty-pill ${isOnline ? 'is-online' : 'is-offline'}`}
          >
            <span className="rp-duty-dot" />
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </button>

          <div className="rp-earn-chip">
            <span className="rp-earn-chip-label">TODAY:</span>
            <span className="rp-earn-chip-value">₹{todayNetEarning}</span>
          </div>
        </div>

        {/* Nav Tabs (desktop) */}
        <nav className="rp-nav-tabs nav-scrollable-tabs">
          {[
            { id: 'radar', label: 'Radar & Requests', icon: Radio, badge: incomingRequests.length > 0 ? incomingRequests.length : null },
            { id: 'active', label: 'Active Trip', icon: Bike, badge: activeRide ? 'dot' : null },
            { id: 'scheduled', label: 'Advance Bookings', icon: Calendar, badge: availableScheduledRides.length > 0 ? `${availableScheduledRides.length} OPEN` : null },
            { id: 'earnings', label: 'Shift Earnings', icon: DollarSign },
            { id: 'settlements', label: 'Daily Settlements', icon: CreditCard, badge: pendingShiftsList.length > 0 ? `${pendingShiftsList.length} PENDING` : null },
            { id: 'kyc', label: 'KYC & Vehicle', icon: FileText },
            { id: 'profile', label: 'Profile', icon: User }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <a
                key={item.id}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleTabChange(item.id);
                }}
                className={`rp-nav-tab ${isActive ? 'is-active' : ''}`}
              >
                <Icon size={16} /> {item.label}
                {item.badge ? <span className="rp-nav-badge">{item.badge}</span> : null}
              </a>
            );
          })}
        </nav>

        {/* User chip */}
        <div className="rp-user-chip">
          <div className="rp-user-chip-text">
            <div className="rp-user-chip-name">{user?.name || 'Driver'}</div>
            <div className="rp-user-chip-email">{user?.email}</div>
          </div>
          <button onClick={logout} className="rp-logout-btn" title="Sign Out" aria-label="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="rp-body">
        {/* Pending Commission Warning */}
        {pendingShiftsList && pendingShiftsList.length > 0 && (
          <div className="rp-commission-banner cp-fade-up">
            <div className="rp-commission-left">
              <div className="rp-commission-icon">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="rp-commission-title">
                  Pending Platform Fees Notice — Total Due: Rs. {totalPendingCommissionDues}
                </div>
                <div className="rp-commission-sub">
                  You have pending shift commission on the following date(s):
                </div>
                <div className="rp-commission-pills">
                  {pendingShiftsList.map((ps) => (
                    <span key={`pending-pill-${ps.date}`} className="rp-commission-pill">
                      {ps.date}: Rs. {Number(ps.totalCommissionDue || 0).toFixed(2)} ({ps.status === 'PENDING_APPROVAL' ? 'In Verification' : ps.status === 'REJECTED' ? 'Rejected' : 'Unsettled'})
                    </span>
                  ))}
                </div>
                <div className="rp-commission-note">
                  You can continue driving and take rides freely. You may pay anytime via UPI in the Daily Settlements tab.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (pendingShiftsList[0]?.date) {
                  setSelectedSettlementDate(pendingShiftsList[0].date);
                }
                setCurrentTab('settlements');
              }}
              className="rp-btn rp-btn--primary rp-btn--sm"
            >
              <CreditCard size={14} /> View &amp; Settle Dues
            </button>
          </div>
        )}

        {/* Penalty verification alerts */}
        {pendingPenaltiesToVerify && pendingPenaltiesToVerify.length > 0 && (
          <div className="rp-penalty-banner-group">
            {pendingPenaltiesToVerify.map(p => (
              <div key={`pen-ver-${p.id}`} className="rp-penalty-banner cp-fade-up">
                <div className="rp-penalty-banner-left">
                  <div className="rp-penalty-banner-icon">
                    <DollarSign size={22} />
                  </div>
                  <div>
                    <div className="rp-penalty-banner-title">
                      ₹15 Cancellation Compensation Verification Needed
                    </div>
                    <div className="rp-penalty-banner-sub">
                      Passenger <strong>{p.customer_name || 'Passenger'}</strong>{' '}
                      {p.customer_phone ? `(${p.customer_phone})` : ''} claims to have paid ₹15 to your UPI for cancelled Ride <strong>#{p.ride_code || ''}</strong>.
                    </div>
                    <div className="rp-penalty-banner-question">
                      Did you receive ₹15 in your UPI/Bank app?
                    </div>
                  </div>
                </div>
                <div className="rp-penalty-banner-actions">
                  <button
                    type="button"
                    onClick={() => handleConfirmPenalty(p.id, true)}
                    className="rp-btn rp-btn--success rp-btn--sm"
                  >
                    <CheckCircle2 size={16} /> Confirm ₹15 Received
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmPenalty(p.id, false)}
                    className="rp-btn rp-btn--danger-soft rp-btn--sm"
                  >
                    <XCircle size={16} /> Not Received
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trip cancelled notice */}
        {tripCancelledNotice && (
          <div className="rp-cancel-notice cp-slide-down">
            <span>{tripCancelledNotice}</span>
            <button
              type="button"
              onClick={() => setTripCancelledNotice(null)}
              className="rp-cancel-notice-close"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ============================================================
            TAB 1: RADAR
            ============================================================ */}
        {currentTab === 'radar' && (
          <div className="rp-content rp-content--narrow">
            <div className="rp-surface">
              {activeRide && (
                <div className="rp-active-quick cp-fade-up">
                  <div className="rp-active-quick-left">
                    <div className="rp-active-quick-icon">
                      <Bike size={24} />
                    </div>
                    <div>
                      <div className="rp-active-quick-label">ACTIVE TRIP IN PROGRESS</div>
                      <div className="rp-active-quick-title">
                        {activeRide.pickup_address} → {activeRide.destination_address}
                      </div>
                      <div className="rp-active-quick-sub">
                        Passenger: <strong>{activeRide.customer_name || 'Passenger'}</strong> · Collect Fare:{' '}
                        <strong>₹{activeRide.total_fare || activeRide.final_fare || 20}</strong>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTabChange('active')}
                    className="rp-btn rp-btn--primary rp-btn--sm"
                  >
                    Open Active Trip <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {kycStatus !== 'APPROVED' && (
                <div className={`rp-kyc-warning ${kycStatus === 'PENDING' ? 'is-pending' : 'is-rejected'} cp-fade-up`}>
                  <ShieldAlert size={26} />
                  <div>
                    <div className="rp-kyc-warning-title">
                      {kycStatus === 'PENDING' ? 'KYC Verification Pending Review' : 'KYC Verification Rejected'}
                    </div>
                    <div className="rp-kyc-warning-sub">
                      {kycStatus === 'PENDING'
                        ? 'Your uploaded documents (Campus ID, Driving Licence, and RC) are under review by Campus Admin. You will be able to go online and accept rides once approved.'
                        : 'Your driver documents were not approved by the admin. Please check the Vehicle & KYC tab.'}
                    </div>
                  </div>
                </div>
              )}

              <RiderOnlineToggle isOnline={isOnline} onToggle={handleToggleOnline} />

              <div className="rp-heading-block">
                <h2 className="rp-heading">Driver Dispatch Radar</h2>
                <p className="rp-subheading">
                  {isOnline
                    ? 'You are ONLINE and listening for nearby student requests across campus.'
                    : 'You are OFFLINE. Toggle switch above to receive rides.'}
                </p>
              </div>

              {/* Sound Alerts */}
              <div className={`rp-sound-bar ${soundEnabled ? 'is-on' : 'is-off'}`}>
                <div className="rp-sound-bar-left">
                  {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  <span>{soundEnabled ? 'Ride Sound & Chime Alerts: ACTIVE' : 'Ride Sounds Muted'}</span>
                </div>
                <div className="rp-sound-bar-actions">
                  <button
                    type="button"
                    onClick={() => alertManager.playOneShot()}
                    className="rp-btn rp-btn--ghost rp-btn--sm"
                  >
                    <Volume2 size={14} /> Test Chime
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="rp-btn rp-btn--ghost rp-btn--sm"
                  >
                    {soundEnabled ? 'Mute' : 'Unmute'}
                  </button>
                </div>
              </div>

              {/* Reserved Trips Quick peek */}
              {!activeRide && reservedScheduledRides && reservedScheduledRides.length > 0 && (
                <div className="rp-reserved-card cp-fade-up">
                  <div className="rp-reserved-header">
                    <div className="rp-reserved-title">
                      <Calendar size={16} /> UPCOMING CONFIRMED TRIPS ({reservedScheduledRides.length})
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTabChange('scheduled')}
                      className="rp-text-link"
                    >
                      View All <ArrowRight size={12} />
                    </button>
                  </div>

                  {reservedScheduledRides.slice(0, 2).map((sr) => {
                    const isTimeReady = isScheduledTimeReached(sr.scheduled_time_ist || sr.scheduled_time, 15);
                    return (
                      <div key={`radar-sr-${sr.id}`} className="rp-reserved-row">
                        <div className="rp-reserved-row-head">
                          <div className="rp-reserved-row-code-row">
                            <span className="rp-ride-code">{sr.ride_code || `PAP-${sr.id}`}</span>
                            <span className="rp-reserved-time">
                              Pickup: {formatRideDateTime(sr.scheduled_time_ist || sr.scheduled_time)}
                            </span>
                          </div>
                          <span className="rp-reserved-fare">₹{sr.total_fare || 20}</span>
                        </div>
                        <div className="rp-reserved-route">
                          <strong>{sr.pickup_address}</strong> → {sr.destination_address}
                        </div>
                        <div className="rp-reserved-row-foot">
                          <span className="rp-reserved-passenger">
                            Passenger: {sr.customer_name || 'Passenger'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartScheduledTrip(sr)}
                            className={`rp-btn rp-btn--sm ${isTimeReady ? 'rp-btn--success' : 'rp-btn--ghost'}`}
                            disabled={!isTimeReady}
                          >
                            {isTimeReady ? 'Start Trip Now' : 'Opens at Booked Time'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Incoming requests */}
              {!activeRide && incomingRequests.length > 0 && (
                <div className="rp-requests-stack">
                  <div className="rp-requests-stack-head">
                    <span className="rp-requests-stack-label">
                      <Zap size={14} /> AVAILABLE REQUESTS ({incomingRequests.length})
                    </span>
                    <span className="rp-requests-stack-hint">Select a ride to accept</span>
                  </div>

                  {incomingRequests.map((req) => {
                    const split = calcDriverSplit(req.total_fare);
                    const pickupTimeVal = req.scheduled_time_ist || req.scheduled_time || req.scheduledTime;
                    const conflict = getScheduleGapConflict(pickupTimeVal, reservedScheduledRides);
                    return (
                      <div
                        key={req.id}
                        className={`rp-request-card cp-fade-up ${conflict ? 'has-conflict' : ''}`}
                      >
                        <div className="rp-request-head">
                          <div>
                            <div className="rp-request-name">
                              {req.customer_name || 'Passenger'}
                            </div>
                            <div className="rp-request-tags">
                              <span className="rp-tag rp-tag--amber">{req.vehicle_type || 'BIKE'}</span>
                              {Boolean(req.is_outside) && <span className="rp-tag rp-tag--indigo">OUTSIDE CAMPUS</span>}
                              {Boolean(req.is_double_ride) && (
                                <span className="rp-tag rp-tag--amber-soft">
                                  <Users size={11} /> Double Ride
                                </span>
                              )}
                              {Boolean(req.is_scheduled) && (
                                <span className="rp-tag rp-tag--blue">
                                  <Calendar size={11} /> PRE-BOOKED TRIP
                                </span>
                              )}
                              {Boolean(pickupTimeVal) && (
                                <span className="rp-tag rp-tag--amber-border">
                                  <Clock size={11} /> PICKUP: {formatRideDateTime(pickupTimeVal)}
                                </span>
                              )}
                              {Boolean(conflict) && (
                                <span className="rp-tag rp-tag--rose">
                                  <AlertTriangle size={11} /> Conflict with {conflict.conflictingRideCode} at {formatRideDateTime(conflict.conflictingTime)}
                                </span>
                              )}
                              {Boolean(req.female_rider_only) && (
                                <span className="rp-tag rp-tag--pink">
                                  <ShieldCheck size={11} /> Female Rider Only
                                </span>
                              )}
                              {Boolean(req.is_core_only || req.is_free_ride) && (
                                <span className="rp-tag rp-tag--core">
                                  <Zap size={11} /> CORE FLASH FREE TRIP
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="rp-request-fare-block">
                            <div className="rp-request-fare-value">₹{req.total_fare}</div>
                            <div className="rp-request-fare-net">Your Net: ₹{split.rider}</div>
                          </div>
                        </div>

                        <div className="rp-request-route">
                          {Boolean(pickupTimeVal) && (
                            <div className="rp-request-time-callout">
                              <Clock size={13} />
                              <span>Requested Pickup Time: <strong>{formatRideDateTime(pickupTimeVal)}</strong></span>
                            </div>
                          )}

                          <div className="rp-request-route-row">
                            <div><span className="rp-dot rp-dot--green" /> <strong>Pickup:</strong> {req.pickup_address}</div>
                            <a
                              href={getMapLink(req.pickup_address, req.pickup_latitude, req.pickup_longitude)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rp-map-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={11} /> Maps
                            </a>
                          </div>

                          {req.via_address && (
                            <div className="rp-request-route-row">
                              <div><span className="rp-dot rp-dot--amber" /> <strong>Via Stop:</strong> {req.via_address}</div>
                              <a
                                href={getMapLink(req.via_address, req.via_latitude, req.via_longitude)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rp-map-link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={11} /> Maps
                              </a>
                            </div>
                          )}

                          <div className="rp-request-route-row">
                            <div><span className="rp-dot rp-dot--rose" /> <strong>Drop:</strong> {req.destination_address}</div>
                            <a
                              href={getMapLink(req.destination_address, req.destination_latitude, req.destination_longitude)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rp-map-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={11} /> Maps
                            </a>
                          </div>

                          <div className="rp-request-route-footer">
                            <span>Collect Cash at Drop: <strong>₹{req.total_fare}</strong></span>
                            <span>Platform Fee: ₹{Number(split.platformFee ?? (split.company + split.controller) ?? 4).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="rp-request-actions">
                          <button
                            type="button"
                            onClick={() => handleDeclineRequest(req.id)}
                            className="rp-btn rp-btn--danger-soft"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAcceptRequest(req.id)}
                            disabled={acceptingRideId !== null || actionLoading || Boolean(conflict)}
                            title={conflict ? `Schedule conflict with your confirmed ride ${conflict.conflictingRideCode} at ${formatRideDateTime(conflict.conflictingTime)}. Please maintain at least a 15-minute gap.` : 'Accept Ride'}
                            className={`rp-btn rp-btn--lg ${conflict ? 'rp-btn--ghost' : 'rp-btn--success'}`}
                            style={{ flex: 2 }}
                          >
                            {acceptingRideId === req.id ? 'Accepting...' : conflict ? 'Time Conflict' : 'Accept Ride Now'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Active ride on radar tab */}
              {activeRide && (
                <div className="rp-active-peek cp-fade-up">
                  <div className="rp-active-peek-label">ACTIVE TRIP IN PROGRESS:</div>
                  <div className="rp-active-peek-route">
                    {activeRide.pickup_address} → {activeRide.destination_address}
                  </div>
                  {Boolean(activeRide.scheduled_time || activeRide.scheduled_time_ist || activeRide.scheduledTime) && (
                    <div className="rp-active-peek-time">
                      <Clock size={13} /> Pickup Time: {formatRideDateTime(activeRide.scheduled_time_ist || activeRide.scheduled_time || activeRide.scheduledTime)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('active')}
                    className="rp-btn rp-btn--primary rp-btn--block"
                  >
                    Open Active Trip Workflow
                  </button>
                </div>
              )}

              {/* Radar empty state */}
              {!activeRide && incomingRequests.length === 0 && (
                <div className="rp-radar-empty cp-fade-up">
                  {isOnline ? (
                    <>
                      <div className="rp-radar-empty-icon is-live">
                        <Radio size={32} className="rp-radar-pulse" />
                      </div>
                      <div className="rp-radar-empty-title">
                        Dispatch Radar Active &amp; Scanning...
                      </div>
                      <div className="rp-radar-empty-sub">
                        Listening for student ride requests across Pondicherry University campus in real-time. Keep this screen active.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rp-radar-empty-icon is-off">
                        <Power size={30} />
                      </div>
                      <div className="rp-radar-empty-title">
                        You Are Currently Offline
                      </div>
                      <div className="rp-radar-empty-sub">
                        Toggle your status online to start receiving campus ride requests and earn with Papido.
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleOnline}
                        className="rp-btn rp-btn--primary rp-btn--lg"
                      >
                        <Power size={16} /> Go Online Now
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2: ACTIVE TRIP
            ============================================================ */}
        {currentTab === 'active' && (
          <div className="rp-content rp-content--narrow">
            {!activeRide ? (
              <div className="rp-empty cp-fade-up">
                <div className="rp-empty-icon">
                  <Bike size={32} />
                </div>
                <h3 className="rp-empty-title">No Active Trip In Progress</h3>
                <p className="rp-empty-sub">
                  You do not have an ongoing trip right now. Go to the Dispatch Radar to view and accept incoming ride requests.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentTab('radar')}
                  className="rp-btn rp-btn--primary rp-btn--lg"
                >
                  <Radio size={16} /> Go to Dispatch Radar
                </button>
              </div>
            ) : (
              <div className="rp-surface rp-surface--trip">
                {/* Trip Code & Status Bar */}
                <div className="rp-trip-code-bar">
                  <div className="rp-trip-code-left">
                    <span className="rp-trip-code-label">TRIP CODE</span>
                    <span className="rp-trip-code-val">#{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}</span>
                  </div>
                  <span className="rp-trip-status-tag">{String(activeRide.status || '').replace('_', ' ')}</span>
                </div>

                {/* Cash to collect */}
                <div className="rp-cash-card cp-fade-up">
                  <div>
                    <div className="rp-cash-label">CASH TO COLLECT AT DROP:</div>
                    <div className="rp-cash-value">
                      ₹{activeRide.total_fare || activeRide.final_fare || activeRide.estimated_fare || 20}
                    </div>
                    {Boolean(activeRide.waiting_fare > 0) && (
                      <div className="rp-cash-waiting">
                        Includes ₹{activeRide.waiting_fare} waiting charge ({activeRide.waiting_minutes || 0} mins)
                      </div>
                    )}
                  </div>
                  <div className="rp-cash-right">
                    <div className="rp-cash-net">
                      Net Pay: ₹{activeRide.rider_earning || calcDriverSplit(activeRide.total_fare).rider}
                    </div>
                    <div className="rp-cash-fee">
                      Platform Fee: ₹{activeRide.company_earning || calcDriverSplit(activeRide.total_fare).company}
                      {calcDriverSplit(activeRide.total_fare).controller > 0 && ` + ₹${calcDriverSplit(activeRide.total_fare).controller} Ctrl`}
                    </div>
                  </div>
                </div>

                {/* Passenger info */}
                <div className="rp-passenger-card">
                  <div>
                    <div className="rp-passenger-name">
                      {activeRide.customer_name || 'Passenger'}
                    </div>
                    <div className="rp-passenger-sub">Campus Passenger</div>
                  </div>
                  {activeRide.customer_phone && (
                    <a href={`tel:${activeRide.customer_phone}`} className="rp-btn rp-btn--success rp-btn--sm">
                      <Phone size={14} /> Call Passenger
                    </a>
                  )}
                </div>

                {/* Waiting control */}
                {activeRide.status === 'STARTED' && (
                  <div className={`rp-waiting-card ${activeRide.is_waiting ? 'is-active' : ''}`}>
                    <div className="rp-waiting-card-head">
                      <div className="rp-waiting-card-left">
                        <div className={`rp-waiting-card-icon ${activeRide.is_waiting ? 'is-active' : ''}`}>
                          <Clock size={16} />
                        </div>
                        <div>
                          <div className="rp-waiting-card-title">
                            {activeRide.is_waiting ? 'DRIVER ON WAITING MODE' : 'Trip Waiting Controls'}
                          </div>
                          <div className="rp-waiting-card-sub">
                            Policy: 0–9 mins free, ₹10 added for every 10 full minutes of waiting
                          </div>
                        </div>
                      </div>
                      {Boolean(activeRide.is_waiting) && (
                        <span className="rp-waiting-tag">ON WAITING</span>
                      )}
                    </div>

                    <div className="rp-waiting-card-body">
                      <div>
                        <div className="rp-waiting-recorded-label">Total Waiting Recorded:</div>
                        <div className="rp-waiting-recorded-value">
                          {activeRide.waiting_minutes || 0} mins (+₹{activeRide.waiting_fare || 0} added)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleWaiting}
                        disabled={waitingLoading}
                        className={`rp-btn rp-btn--sm ${activeRide.is_waiting ? 'rp-btn--danger' : 'rp-btn--primary'}`}
                      >
                        <Clock size={14} />
                        {waitingLoading ? 'Updating...' : activeRide.is_waiting ? 'Stop / End Waiting' : 'Start Waiting Timer'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Route card */}
                <div className="rp-route-card">
                  {Boolean(activeRide.scheduled_time || activeRide.scheduled_time_ist || activeRide.scheduledTime) && (
                    <div className="rp-route-time-callout">
                      <Clock size={14} />
                      <span>Requested Pickup Time: <strong>{formatRideDateTime(activeRide.scheduled_time_ist || activeRide.scheduled_time || activeRide.scheduledTime)}</strong></span>
                    </div>
                  )}

                  <div className="rp-route-row">
                    <div><span className="rp-dot rp-dot--green" /> <strong>Pickup:</strong> {activeRide.pickup_address}</div>
                    <a
                      href={getMapLink(activeRide.pickup_address, activeRide.pickup_latitude, activeRide.pickup_longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rp-map-link rp-map-link--lg"
                    >
                      <ExternalLink size={12} /> Navigate Pickup
                    </a>
                  </div>

                  {activeRide.via_address && (
                    <div className="rp-route-row">
                      <div><span className="rp-dot rp-dot--amber" /> <strong>Via Stop:</strong> {activeRide.via_address}</div>
                      <a
                        href={getMapLink(activeRide.via_address, activeRide.via_latitude, activeRide.via_longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rp-map-link rp-map-link--lg"
                      >
                        <ExternalLink size={12} /> Navigate Via Stop
                      </a>
                    </div>
                  )}

                  <div className="rp-route-row">
                    <div><span className="rp-dot rp-dot--rose" /> <strong>Drop:</strong> {activeRide.destination_address}</div>
                    <a
                      href={getMapLink(activeRide.destination_address, activeRide.destination_latitude, activeRide.destination_longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rp-map-link rp-map-link--lg"
                    >
                      <ExternalLink size={12} /> Navigate Drop
                    </a>
                  </div>
                </div>

                {otpError && (
                  <div className="rp-alert rp-alert--error cp-slide-down">
                    <AlertCircle size={16} /> {otpError}
                  </div>
                )}

                {/* Stepper */}
                <div className="rp-stepper-card">
                  <div className="rp-stepper-card-label">Trip Progression</div>
                  <RideStatusStepper currentStatus={activeRide.status} />
                </div>

                {/* Step-by-step actions */}
                {activeRide.status === 'ACCEPTED' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('RIDER_ARRIVING')}
                    disabled={actionLoading}
                    className="rp-btn rp-btn--primary rp-btn--lg rp-btn--block cp-btn-ripple"
                  >
                    <Bike size={18} />
                    <span>{actionLoading ? 'Updating Status...' : '1. I am On The Way (Arriving)'}</span>
                  </button>
                )}

                {activeRide.status === 'RIDER_ARRIVING' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('RIDER_REACHED')}
                    disabled={actionLoading}
                    className="rp-btn rp-btn--primary rp-btn--lg rp-btn--block cp-btn-ripple"
                  >
                    <MapPin size={18} />
                    <span>{actionLoading ? 'Updating Status...' : '2. Reached Pickup Location'}</span>
                  </button>
                )}

                {activeRide.status === 'RIDER_REACHED' && (
                  <div className="rp-otp-verify cp-fade-up">
                    <div className="rp-otp-verify-head">
                      <div className="rp-otp-verify-label">Verify Passenger to Start Trip</div>
                      <div className="rp-otp-verify-sub">
                        Ask passenger for their 4-digit Ride OTP:
                      </div>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      name={`ride_otp_${activeRide.id}`}
                      id={`ride_otp_${activeRide.id}`}
                      placeholder="••••"
                      className={`rp-otp-input ${otpError ? 'cp-shake' : ''}`}
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                    <button
                      type="button"
                      onClick={() => handleStatusChange('STARTED')}
                      disabled={actionLoading || enteredOtp.length !== 4}
                      className={`rp-btn rp-btn--lg rp-btn--block ${(enteredOtp.length === 4 && !actionLoading) ? 'rp-btn--success' : 'rp-btn--ghost'}`}
                    >
                      <CheckCircle2 size={18} />
                      <span>{actionLoading ? 'Verifying...' : '3. Verify OTP & Start Trip'}</span>
                    </button>
                  </div>
                )}

                {activeRide.status === 'STARTED' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('COMPLETED')}
                    disabled={actionLoading}
                    className="rp-btn rp-btn--success rp-btn--lg rp-btn--block"
                  >
                    <CheckCircle size={18} />
                    <span>{actionLoading ? 'Completing...' : '4. Reached Destination & Complete Trip'}</span>
                  </button>
                )}

                {activeRide.status === 'COMPLETED' && (
                  <div className="rp-trip-complete cp-fade-up">
                    <CheckCircle size={48} color="#10B981" className="rp-trip-complete-icon" />
                    <h3 className="rp-trip-complete-title">Trip Completed &amp; Settled!</h3>
                    <div className="rp-trip-code-val" style={{ margin: '4px 0 12px', display: 'inline-block' }}>
                      #{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}
                    </div>

                    <div className="rp-trip-complete-summary">
                      <div className="rp-trip-complete-label">CASH TO COLLECT FROM PASSENGER:</div>
                      <div className="rp-trip-complete-value">
                        ₹{activeRide.final_fare || activeRide.total_fare || activeRide.estimated_fare || 20}
                      </div>
                      <div className="rp-trip-complete-net">
                        Your Net Take-Home: ₹{activeRide.rider_earning || calcDriverSplit(activeRide.final_fare || activeRide.total_fare || 20).rider}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveRide(null);
                        setEnteredOtp('');
                        setCurrentTab('radar');
                      }}
                      className="rp-btn rp-btn--primary rp-btn--lg rp-btn--block"
                    >
                      Return to Radar for Next Trip
                    </button>
                  </div>
                )}

                {['ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED'].includes(activeRide.status) && (
                  <button
                    type="button"
                    onClick={handleCancelActiveTrip}
                    disabled={actionLoading}
                    className="rp-btn rp-btn--danger-soft rp-btn--block"
                  >
                    Cancel Trip (Driver Emergency)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 3: SCHEDULED / ADVANCE
            ============================================================ */}
        {currentTab === 'scheduled' && (
          <div className="rp-content rp-content--wide">
            <div className="rp-tab-header rp-tab-header--no-surface">
              <div>
                <h2 className="rp-heading rp-heading--icon">
                  <Calendar size={24} color="#EA580C" /> Advance Campus Pre-Bookings
                </h2>
                <div className="rp-subheading">
                  Browse and claim passenger pre-booked trips hours or days in advance.
                </div>
              </div>
              <button
                type="button"
                onClick={fetchScheduledRides}
                disabled={loadingScheduled}
                className="rp-btn rp-btn--ghost rp-btn--sm"
              >
                <RefreshCw size={14} className={loadingScheduled ? 'rp-spin' : ''} />
                <span>{loadingScheduled ? 'Refreshing...' : 'Refresh List'}</span>
              </button>
            </div>

            {scheduledSuccessAlert && (
              <div className="rp-success-banner cp-slide-down">
                <CheckCircle2 size={18} color="#059669" />
                <span>{scheduledSuccessAlert}</span>
              </div>
            )}

            <div className="rp-metrics-row">
              <div className="rp-metric-tile">
                <div className="rp-metric-tile-label">MY RESERVED SCHEDULE</div>
                <div className="rp-metric-tile-value rp-metric-tile-value--emerald">
                  {reservedScheduledRides.length} <span>Trips Confirmed</span>
                </div>
              </div>

              <div className="rp-metric-tile">
                <div className="rp-metric-tile-label">OPEN PRE-BOOKINGS</div>
                <div className="rp-metric-tile-value rp-metric-tile-value--amber">
                  {availableScheduledRides.length} <span>Available to Claim</span>
                </div>
              </div>
            </div>

            {/* Reserved */}
            <div className="rp-section">
              <div className="rp-section-head">
                <ShieldCheck size={20} color="#10B981" />
                <h3 className="rp-section-title">
                  My Confirmed Advance Schedule ({reservedScheduledRides.length})
                </h3>
              </div>

              {reservedScheduledRides.length === 0 ? (
                <div className="rp-empty-flat">
                  <Calendar size={32} />
                  <div className="rp-empty-flat-title">No advance trips reserved yet</div>
                  <div className="rp-empty-flat-sub">
                    Claim an open campus pre-booking below to lock in guaranteed trips for your schedule.
                  </div>
                </div>
              ) : (
                <div className="rp-list">
                  {reservedScheduledRides.map((sr, idx) => (
                    <div
                      key={`res-${sr.id}`}
                      className="rp-scheduled-card rp-scheduled-card--confirmed cp-fade-up"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="rp-scheduled-card-head">
                        <div>
                          <div className="rp-scheduled-card-tags">
                            <span className="rp-tag rp-tag--emerald">CONFIRMED TO YOU</span>
                            <span className="rp-tag rp-tag--neutral">{sr.ride_code || `PAP-${sr.id}`}</span>
                            <span className="rp-scheduled-card-time">
                              {formatRideDateTime(sr.scheduled_time_ist || sr.scheduled_time)}
                            </span>
                          </div>
                        </div>
                        <div className="rp-scheduled-card-payout">
                          <div className="rp-scheduled-card-payout-label">YOUR NET PAYOUT:</div>
                          <div className="rp-scheduled-card-payout-value">
                            ₹{sr.rider_earning || Number(sr.total_fare || 20).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="rp-scheduled-route">
                        <div className="rp-scheduled-route-row">
                          <span className="rp-dot rp-dot--green" />
                          <div><strong>Pickup:</strong> {sr.pickup_address}</div>
                        </div>
                        <div className="rp-scheduled-route-row">
                          <span className="rp-dot rp-dot--amber" />
                          <div><strong>Drop:</strong> {sr.destination_address}</div>
                        </div>
                      </div>

                      <div className="rp-scheduled-foot">
                        <div>
                          <div className="rp-scheduled-foot-label">PASSENGER</div>
                          <div className="rp-scheduled-foot-name">
                            {sr.customer_name || 'Campus Passenger'}
                          </div>
                          {sr.customer_phone && (
                            <a href={`tel:${sr.customer_phone}`} className="rp-text-link rp-text-link--amber">
                              <Phone size={12} /> Call Passenger ({sr.customer_phone})
                            </a>
                          )}
                        </div>

                        <div className="rp-scheduled-foot-actions">
                          <button
                            type="button"
                            onClick={() => handleCancelScheduledRide(sr.id)}
                            disabled={scheduledActionLoadingId === sr.id}
                            className="rp-btn rp-btn--danger-soft rp-btn--sm"
                          >
                            Release Booking
                          </button>
                          {(() => {
                            const isTimeReady = isScheduledTimeReached(sr.scheduled_time_ist || sr.scheduled_time);
                            return (
                              <button
                                type="button"
                                onClick={() => handleStartScheduledTrip(sr)}
                                disabled={scheduledActionLoadingId === sr.id || !isTimeReady}
                                className={`rp-btn rp-btn--sm ${isTimeReady ? 'rp-btn--success' : 'rp-btn--ghost'}`}
                                title={isTimeReady ? 'Open active trip view' : `Enabled at scheduled pickup time (${formatRideDateTime(sr.scheduled_time_ist || sr.scheduled_time)})`}
                              >
                                <span>{isTimeReady ? 'Open Active Trip View' : `Opens at Booked Time (${formatRideDateTime(sr.scheduled_time_ist || sr.scheduled_time)})`}</span>
                                {isTimeReady && <ArrowRight size={14} />}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Open board */}
            <div className="rp-section">
              <div className="rp-section-head">
                <Radio size={20} color="#EA580C" />
                <h3 className="rp-section-title">
                  Open Campus Pre-Bookings ({availableScheduledRides.length})
                </h3>
              </div>

              {availableScheduledRides.length === 0 ? (
                <div className="rp-empty-flat">
                  <CheckCircle2 size={32} color="#10B981" />
                  <div className="rp-empty-flat-title">No open pre-booked trips right now</div>
                  <div className="rp-empty-flat-sub">
                    When students pre-book rides for upcoming hours or tomorrow, they will appear here instantly for you to claim.
                  </div>
                </div>
              ) : (
                <div className="rp-list">
                  {availableScheduledRides.map((sr, idx) => {
                    const conflict = getScheduleGapConflict(sr.scheduled_time_ist || sr.scheduled_time, reservedScheduledRides);
                    return (
                      <div
                        key={`avail-${sr.id}`}
                        className={`rp-scheduled-card cp-fade-up ${conflict ? 'has-conflict' : ''}`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="rp-scheduled-card-head">
                          <div>
                            <div className="rp-scheduled-card-tags">
                              <span className="rp-tag rp-tag--amber-border">PRE-BOOKED TRIP</span>
                              <span className="rp-tag rp-tag--neutral">{sr.ride_code || `PAP-${sr.id}`}</span>
                              {Boolean(sr.female_rider_only) && (
                                <span className="rp-tag rp-tag--pink">Female Rider Only</span>
                              )}
                              {Boolean(sr.is_double_ride) && (
                                <span className="rp-tag rp-tag--indigo">Double Ride</span>
                              )}
                              {conflict && (
                                <span className="rp-tag rp-tag--rose">
                                  Time Conflict (&lt; 15 min gap with {conflict.conflictingRideCode})
                                </span>
                              )}
                            </div>
                            <div className="rp-scheduled-card-time rp-scheduled-card-time--amber">
                              Pickup Scheduled: {formatRideDateTime(sr.scheduled_time_ist || sr.scheduled_time)}
                            </div>
                          </div>
                          <div className="rp-scheduled-card-payout">
                            <div className="rp-scheduled-card-payout-label">ESTIMATED FARE:</div>
                            <div className="rp-scheduled-card-payout-value rp-scheduled-card-payout-value--amber">
                              ₹{Number(sr.total_fare || sr.estimated_fare || 20).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="rp-scheduled-route">
                          <div className="rp-scheduled-route-row">
                            <span className="rp-dot rp-dot--green" />
                            <div><strong>Pickup:</strong> {sr.pickup_address}</div>
                          </div>
                          <div className="rp-scheduled-route-row">
                            <span className="rp-dot rp-dot--amber" />
                            <div><strong>Drop:</strong> {sr.destination_address}</div>
                          </div>
                        </div>

                        <div className="rp-scheduled-foot">
                          <div className="rp-scheduled-foot-meta">
                            Passenger: <strong>{sr.customer_name || 'Campus Passenger'}</strong> · Vehicle:{' '}
                            <strong>{sr.vehicle_type || 'BIKE'}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAcceptScheduledRide(sr.id)}
                            disabled={scheduledActionLoadingId === sr.id || Boolean(conflict)}
                            className={`rp-btn ${conflict ? 'rp-btn--ghost' : 'rp-btn--primary'}`}
                            title={conflict ? `Schedule conflict with your confirmed ride ${conflict.conflictingRideCode} at ${formatRideDateTime(conflict.conflictingTime)}. Please maintain at least a 15-minute gap.` : 'Claim this pre-booking for your shift'}
                          >
                            <CheckCircle2 size={16} />
                            <span>
                              {scheduledActionLoadingId === sr.id
                                ? 'Claiming...'
                                : conflict
                                  ? `Unavailable (Conflicts with ${conflict.conflictingRideCode})`
                                  : 'ACCEPT & CONFIRM PRE-BOOKING'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 4: EARNINGS
            ============================================================ */}
        {currentTab === 'earnings' && (
          <div className="rp-content rp-content--wide">
            <h2 className="rp-heading rp-heading--icon" style={{ marginBottom: 20 }}>
              <TrendingUp size={22} color="#EA580C" /> Driver Shift Earnings &amp; Trip Ledger
            </h2>

            <div className="rp-metrics-row rp-metrics-row--4">
              <div className="rp-metric-tile">
                <div className="rp-metric-tile-label">TODAY'S NET EARNINGS</div>
                <div className="rp-metric-tile-value rp-metric-tile-value--amber">
                  ₹{Number(todayNetEarning).toFixed(2)}
                </div>
              </div>
              <div className="rp-metric-tile">
                <div className="rp-metric-tile-label">TODAY'S COMPLETED TRIPS</div>
                <div className="rp-metric-tile-value rp-metric-tile-value--emerald">
                  {todayTripsCount}
                </div>
              </div>
              <div className="rp-metric-tile">
                <div className="rp-metric-tile-label">TOTAL TRIPS (ALL-TIME)</div>
                <div className="rp-metric-tile-value" style={{ color: '#8B5CF6' }}>
                  {lifetimeTripsCount}
                </div>
              </div>
              <div className="rp-metric-tile">
                <div className="rp-metric-tile-label">PLATFORM FEE</div>
                <div className="rp-metric-tile-value" style={{ color: '#06B6D4' }}>
                  ₹{Number(totalPlatformFee).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="rp-panel">
              <div className="rp-panel-head">
                <h3 className="rp-panel-title">Trip Settlements &amp; Receipts</h3>
              </div>

              {loadingEarnings ? (
                <div className="rp-skeletons">
                  {[1, 2, 3].map((n) => (
                    <div key={`earn-skel-${n}`} className="rp-skeleton-row">
                      <div className="rp-skeleton-line rp-skeleton-line--short" />
                      <div className="rp-skeleton-line" />
                    </div>
                  ))}
                </div>
              ) : riderRides.length === 0 ? (
                <div className="rp-empty-flat">
                  <TrendingUp size={32} />
                  <div className="rp-empty-flat-title">No completed rides in this shift yet.</div>
                </div>
              ) : (
                <div className="rp-table-wrap">
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th>Ride Code</th>
                        <th>Route</th>
                        <th>Gross Fare</th>
                        <th>Your Net</th>
                        <th>Platform Fee</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riderRides.map((r) => {
                        const fare = Number(r.total_fare || r.final_fare || r.estimated_fare || 20);
                        const fee = fare <= 80 ? 4.0 : Number((fare * 0.10 + 2.0).toFixed(2));
                        const net = r.rider_earning !== undefined ? Number(r.rider_earning) : Math.max(0, fare - fee);
                        const isPrebooked = Boolean(r.is_scheduled || r.isScheduled || r.scheduled_time);
                        return (
                          <tr key={r.id}>
                            <td className="rp-table-code">{r.ride_code || `PAP-${r.id}`}</td>
                            <td>
                              <div className="rp-table-route">
                                {r.pickup_address} → {r.destination_address}
                                {isPrebooked && <span className="rp-tag rp-tag--amber-soft">PRE-BOOKED</span>}
                              </div>
                              <div className="rp-table-route-sub">
                                {isPrebooked && r.scheduled_time ? (
                                  <>
                                    <span className="rp-table-amber">Pickup Scheduled: {formatRideDateTime(r.scheduled_time)}</span>
                                    <span> · </span>
                                    <span>Completed: {formatRideDateTime(r.completed_at || r.settled_at || r.created_at)}</span>
                                  </>
                                ) : (
                                  formatRideDateTime(r.completed_at || r.requested_at || r.created_at || r.accepted_at)
                                )}
                              </div>
                            </td>
                            <td>₹{fare.toFixed(2)}</td>
                            <td className="rp-table-amber">₹{net.toFixed(2)}</td>
                            <td className="rp-table-cyan">₹{fee.toFixed(2)}</td>
                            <td>
                              <span className={`rp-status-chip ${r.status === 'COMPLETED' ? 'rp-status-chip--emerald' : 'rp-status-chip--amber'}`}>
                                {r.status || 'COMPLETED'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 5: SETTLEMENTS
            ============================================================ */}
        {currentTab === 'settlements' && (
          <div className="rp-content rp-content--wide">
            <div className="rp-tab-header rp-tab-header--no-surface">
              <div>
                <h2 className="rp-heading">Day-Wise Commission Settlement</h2>
                <div className="rp-subheading">
                  Settle daily platform commission shift-by-shift to clear your account for upcoming rides.
                </div>
              </div>

              <div className="rp-settle-date-bar">
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = getTodayDateString();
                    setSelectedSettlementDate(todayStr);
                    fetchShiftSettlement(todayStr);
                  }}
                  className={`rp-btn rp-btn--sm ${selectedSettlementDate === getTodayDateString() ? 'rp-btn--primary' : 'rp-btn--ghost'}`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const yestStr = getYesterdayDateString();
                    setSelectedSettlementDate(yestStr);
                    fetchShiftSettlement(yestStr);
                  }}
                  className={`rp-btn rp-btn--sm ${selectedSettlementDate === getYesterdayDateString() ? 'rp-btn--primary' : 'rp-btn--ghost'}`}
                >
                  Yesterday
                </button>
                <div className="rp-settle-date-input">
                  <Calendar size={14} />
                  <input
                    type="date"
                    value={selectedSettlementDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setSelectedSettlementDate(newDate);
                      fetchShiftSettlement(newDate);
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchShiftSettlement(selectedSettlementDate)}
                  disabled={loadingShiftSettlement}
                  className="rp-btn rp-btn--ghost rp-btn--sm"
                  title="Refresh Settlement Data"
                >
                  <RefreshCw size={13} className={loadingShiftSettlement ? 'rp-spin' : ''} />
                </button>
              </div>
            </div>

            {shiftSettlement && (
              <div className={`rp-settle-card cp-fade-up ${shiftSettlement.status === 'REJECTED' ? 'is-rejected' : ''}`}>
                <div className="rp-settle-card-head">
                  <div>
                    <div className="rp-settle-card-title-row">
                      <h3 className="rp-settle-card-title">
                        Shift Commission: {shiftSettlement?.date || selectedSettlementDate}
                      </h3>
                      {selectedSettlementDate === getTodayDateString() && (
                        <span className="rp-tag rp-tag--amber-soft">TODAY'S SHIFT</span>
                      )}
                    </div>
                    <div className="rp-settle-card-sub">
                      Trips Completed on this date: <strong>{shiftSettlement?.totalTrips || 0}</strong>
                    </div>
                  </div>

                  <div>
                    {shiftSettlement?.status === 'SETTLED' ? (
                      <span className="rp-status-chip rp-status-chip--emerald rp-status-chip--lg">
                        <CheckCircle2 size={14} /> Approved &amp; Cleared
                      </span>
                    ) : shiftSettlement?.status === 'PENDING_APPROVAL' ? (
                      <span className="rp-status-chip rp-status-chip--amber rp-status-chip--lg">
                        <Clock size={14} /> Verification In Progress
                      </span>
                    ) : shiftSettlement?.status === 'REJECTED' ? (
                      <span className="rp-status-chip rp-status-chip--rose rp-status-chip--lg">
                        <AlertTriangle size={14} /> Settlement Rejected
                      </span>
                    ) : Number(shiftSettlement?.totalCommissionDue || 0) === 0 ? (
                      <span className="rp-status-chip rp-status-chip--neutral rp-status-chip--lg">
                        <Check size={14} /> No Due (₹0)
                      </span>
                    ) : selectedSettlementDate === getTodayDateString() ? (
                      <span className="rp-status-chip rp-status-chip--amber-soft rp-status-chip--lg">
                        <Clock size={14} /> Today's Active Shift
                      </span>
                    ) : (
                      <span className="rp-status-chip rp-status-chip--rose rp-status-chip--lg">
                        <AlertTriangle size={14} /> Past Shift Due (Unsettled)
                      </span>
                    )}
                  </div>
                </div>

                {selectedSettlementDate === getTodayDateString() && (
                  <div className="rp-settle-info rp-settle-info--blue">
                    <Clock size={16} color="#2563EB" />
                    <span>
                      <strong>Today's Shift:</strong> Rides accumulate during your active day up to 12:00 midnight. You can take rides freely. Any unsettled commission becomes due for payment tomorrow.
                    </span>
                  </div>
                )}

                {shiftSuccessMsg && (
                  <div className="rp-settle-info rp-settle-info--green cp-slide-down">
                    <CheckCircle2 size={16} color="#059669" />
                    <span>{shiftSuccessMsg}</span>
                  </div>
                )}

                {shiftSettlement?.status === 'REJECTED' && shiftSettlement?.rejectionReason && (
                  <div className="rp-settle-info rp-settle-info--rose">
                    <AlertTriangle size={16} color="#DC2626" />
                    <span>
                      <strong>Rejection Reason:</strong> {shiftSettlement.rejectionReason}. Please re-transfer or verify UTR reference.
                    </span>
                  </div>
                )}

                {/* Dues breakdown */}
                <div className="rp-settle-breakdown">
                  <div>
                    <div className="rp-settle-breakdown-label">GROSS COLLECTED:</div>
                    <div className="rp-settle-breakdown-value">
                      ₹{Number(shiftSettlement?.grossFare ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="rp-settle-breakdown-label">YOUR NET TAKE-HOME:</div>
                    <div className="rp-settle-breakdown-value rp-settle-breakdown-value--emerald">
                      ₹{Number(shiftSettlement?.riderNetEarnings ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="rp-settle-breakdown-due">
                    <div className="rp-settle-breakdown-due-label">
                      {selectedSettlementDate === getTodayDateString() ? 'ACCUMULATING PLATFORM FEE:' : 'PLATFORM FEE DUE:'}
                    </div>
                    <div className="rp-settle-breakdown-due-value">
                      ₹{Number(shiftSettlement?.totalCommissionDue ?? 0).toFixed(2)}
                    </div>
                    <div className="rp-settle-breakdown-due-note">
                      {selectedSettlementDate === getTodayDateString()
                        ? "Accumulates during today's shift · Due after 12:00 AM midnight"
                        : 'Standard: ₹4 / ride (Fare ≤ ₹80) · Long Trips: 10% + ₹2 (Fare > ₹80)'}
                    </div>
                  </div>
                </div>

                {shiftSettlement?.status === 'SETTLED' ? (
                  <div className="rp-settle-info rp-settle-info--green">
                    <CheckCircle2 size={22} color="#059669" />
                    <div>
                      <div className="rp-settle-info-title">Shift Commission Cleared &amp; Approved</div>
                      <div className="rp-settle-info-sub">
                        Admin has verified UTR <strong>{shiftSettlement.utrReference || 'N/A'}</strong>. This shift settlement is complete.
                      </div>
                    </div>
                  </div>
                ) : Number(shiftSettlement?.totalCommissionDue || 0) === 0 ? (
                  <div className="rp-settle-info rp-settle-info--neutral">
                    No completed rides or commission dues on {shiftSettlement?.date || selectedSettlementDate}.
                  </div>
                ) : selectedSettlementDate === getTodayDateString() ? (
                  <div className="rp-settle-info rp-settle-info--blue">
                    <Clock size={24} color="#2563EB" />
                    <div>
                      <div className="rp-settle-info-title">Today's Shift is Currently Active</div>
                      <div className="rp-settle-info-sub">
                        Your rides accumulate throughout today. The final shift settlement amount will be closed and payable <strong>after 12:00 AM midnight</strong>. You can drive freely anytime!
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rp-settle-pay-btns">
                      <a
                        href={shiftSettlement?.adminUpi?.upiPayUrl || `upi://pay?pa=${encodeURIComponent(shiftSettlement?.adminUpi?.upiId || 'papido.admin@okaxis')}&pn=${encodeURIComponent(shiftSettlement?.adminUpi?.receiverName || 'Papido Admin')}&am=${Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2)}&cu=INR`}
                        className="rp-btn rp-btn--block rp-btn--success"
                      >
                        <Smartphone size={15} /> 1-Tap Google Pay (₹{Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2)})
                      </a>
                      <a
                        href={shiftSettlement?.adminUpi?.upiPayUrl || `upi://pay?pa=${encodeURIComponent(shiftSettlement?.adminUpi?.upiId || 'papido.admin@okaxis')}&pn=${encodeURIComponent(shiftSettlement?.adminUpi?.receiverName || 'Papido Admin')}&am=${Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2)}&cu=INR`}
                        className="rp-btn rp-btn--block rp-btn--phonepe"
                      >
                        <Zap size={15} /> 1-Tap PhonePe / Any UPI
                      </a>
                    </div>

                    <div className="rp-upi-copy-row">
                      <div>
                        <div className="rp-upi-copy-label">
                          Admin Settlement UPI ID ({shiftSettlement?.adminUpi?.receiverName || 'Papido Operations'})
                        </div>
                        <div className="rp-upi-copy-value">
                          {shiftSettlement?.adminUpi?.upiId || 'papido.admin@okaxis'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const targetUpi = shiftSettlement?.adminUpi?.upiId || 'papido.admin@okaxis';
                          navigator.clipboard?.writeText(targetUpi);
                          setCopiedAdminUpi(true);
                          setTimeout(() => setCopiedAdminUpi(false), 2500);
                        }}
                        className={`rp-upi-copy-btn ${copiedAdminUpi ? 'is-copied' : ''}`}
                      >
                        {copiedAdminUpi ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                        <span>{copiedAdminUpi ? 'Copied' : 'Copy UPI'}</span>
                      </button>
                    </div>

                    <div className="rp-qr-toggle-wrap">
                      <button
                        type="button"
                        onClick={() => setShowAdminQr(!showAdminQr)}
                        className="rp-qr-toggle"
                      >
                        <QrCode size={14} />
                        <span>{showAdminQr ? 'Hide Admin Settlement QR Code' : 'Show Admin Settlement QR Code'}</span>
                      </button>

                      {showAdminQr && (
                        <div className="rp-qr-box cp-fade-up">
                          <div className="rp-qr-inner">
                            <img
                              src={shiftSettlement?.adminUpi?.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(shiftSettlement?.adminUpi?.upiPayUrl || 'upi://pay?pa=papido.admin@okaxis')}`}
                              alt="Admin Settlement QR"
                              className="rp-qr-img"
                            />
                          </div>
                          <div className="rp-qr-note">
                            Scan to pay exact ₹{Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2)} for {shiftSettlement?.date || selectedSettlementDate}
                          </div>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSubmitShiftSettlement} className="rp-utr-form">
                      <label className="rp-utr-label">
                        UPI Transaction Reference / UTR Number (12 Digits) for {shiftSettlement?.date || selectedSettlementDate} *
                      </label>
                      <div className="rp-utr-input-row">
                        <input
                          type="text"
                          className="rp-input rp-input--mono"
                          placeholder="e.g. 428192849102"
                          value={shiftUtrInput}
                          onChange={(e) => setShiftUtrInput(e.target.value)}
                          required
                        />
                        <button
                          type="submit"
                          disabled={submittingShiftSettlement || !shiftUtrInput.trim()}
                          className="rp-btn rp-btn--primary"
                        >
                          <Send size={14} />
                          <span>{submittingShiftSettlement ? 'Submitting...' : `Submit Settlement`}</span>
                        </button>
                      </div>
                      <div className="rp-utr-note">
                        Admin verifies this payment and clears your shift so you can accept rides tomorrow.
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}

            {/* History ledger */}
            {shiftSettlement?.recentShifts && shiftSettlement.recentShifts.length > 0 && (
              <div className="rp-panel">
                <div className="rp-panel-head">
                  <h3 className="rp-panel-title">Past 14 Days Shift Settlements Ledger</h3>
                  <span className="rp-panel-sub">Click any day to view or settle</span>
                </div>
                <div className="rp-table-wrap">
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th>Shift Date</th>
                        <th>Trips</th>
                        <th>Gross Volume</th>
                        <th>Commission Due</th>
                        <th>Your Net</th>
                        <th>Status</th>
                        <th>Submitted UTR</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shiftSettlement.recentShifts.map((s) => {
                        const isSelected = selectedSettlementDate === s.date;
                        return (
                          <tr key={s.date} className={isSelected ? 'is-selected' : ''}>
                            <td className="rp-table-code">
                              {s.date}
                              {s.date === getTodayDateString() && (
                                <span className="rp-tag rp-tag--amber-soft">TODAY</span>
                              )}
                            </td>
                            <td>{s.totalTrips}</td>
                            <td>₹{Number(s.grossFare || 0).toFixed(2)}</td>
                            <td className={Number(s.totalCommissionDue || 0) > 0 ? 'rp-table-rose' : 'rp-table-muted'}>
                              ₹{Number(s.totalCommissionDue || 0).toFixed(2)}
                            </td>
                            <td className="rp-table-emerald">₹{Number(s.riderNetEarnings || 0).toFixed(2)}</td>
                            <td>
                              {s.status === 'SETTLED' ? (
                                <span className="rp-status-chip rp-status-chip--emerald">SETTLED</span>
                              ) : s.status === 'PENDING_APPROVAL' ? (
                                <span className="rp-status-chip rp-status-chip--amber">VERIFYING</span>
                              ) : s.status === 'REJECTED' ? (
                                <span className="rp-status-chip rp-status-chip--rose">REJECTED</span>
                              ) : (
                                <span className="rp-status-chip rp-status-chip--rose">DUE</span>
                              )}
                            </td>
                            <td className="rp-table-mono">{s.utrReference || '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSettlementDate(s.date);
                                  fetchShiftSettlement(s.date);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`rp-btn rp-btn--sm ${isSelected ? 'rp-btn--primary' : 'rp-btn--ghost'}`}
                              >
                                {isSelected ? 'Viewing' : 'Select Day'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 6: KYC
            ============================================================ */}
        {currentTab === 'kyc' && (
          <div className="rp-content rp-content--narrow">
            <div className="rp-surface">
              <div className="rp-kyc-head">
                <h2 className="rp-heading">Vehicle &amp; KYC Documents</h2>
                <span className={`rp-status-chip rp-status-chip--lg ${kycStatus === 'APPROVED' ? 'rp-status-chip--emerald' : kycStatus === 'PENDING' ? 'rp-status-chip--amber' : 'rp-status-chip--rose'}`}>
                  {kycStatus === 'APPROVED' ? 'APPROVED BY ADMIN' : kycStatus === 'PENDING' ? 'PENDING ADMIN VERIFICATION' : 'REJECTED'}
                </span>
              </div>

              {kycStatus !== 'APPROVED' ? (
                <div className={`rp-kyc-warning cp-fade-up ${kycStatus === 'PENDING' ? 'is-pending' : 'is-rejected'}`}>
                  <ShieldAlert size={22} />
                  <div className="rp-kyc-warning-body">
                    <strong>{kycStatus === 'PENDING' ? 'Document Verification in Progress:' : 'Verification Rejected:'}</strong>{' '}
                    {kycStatus === 'PENDING'
                      ? 'Your Campus ID Card, Driving Licence, and Vehicle RC have been submitted and are currently waiting for approval from the Campus Administrator. You will be able to turn Online and accept rides once approved.'
                      : 'Your documents were rejected. Please review or update your credentials below.'}
                  </div>
                </div>
              ) : (
                <div className="rp-kyc-approved cp-fade-up">
                  <ShieldCheck size={20} color="#059669" />
                  <div>
                    <strong>Verified Driver Account:</strong> All your documents have been verified and approved by Campus Admin. You can go online anytime to accept student rides.
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveKyc} className="rp-form">
                <div className="rp-field">
                  <label className="rp-label">Vehicle Type</label>
                  <div className="rp-seg-2">
                    <button
                      type="button"
                      onClick={() => setVehicleType('BIKE')}
                      className={`rp-seg-btn ${vehicleType === 'BIKE' ? 'is-active' : ''}`}
                    >
                      <Bike size={18} /> Bike (Motorcycle)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleType('SCOOTER')}
                      className={`rp-seg-btn ${vehicleType === 'SCOOTER' ? 'is-active' : ''}`}
                    >
                      <Zap size={18} /> Scooter / Scooty
                    </button>
                  </div>
                </div>

                <div className="rp-field">
                  <label className="rp-label">Vehicle Model</label>
                  <input
                    type="text"
                    className="rp-input"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    required
                  />
                </div>

                <div className="rp-field">
                  <label className="rp-label">Vehicle Registration Number</label>
                  <input
                    type="text"
                    className="rp-input"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="rp-field">
                  <label className="rp-label">Driving License Number</label>
                  <input
                    type="text"
                    className="rp-input"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="rp-field">
                  <label className="rp-label">
                    Driver UPI ID (For Direct Cancellation Compensation &amp; Online Payments)
                  </label>
                  <input
                    type="text"
                    className="rp-input"
                    placeholder="e.g. 9876543210@paytm / driver@okaxis"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                  <small className="rp-field-note">
                    If a passenger cancels after you reach their pickup spot, their ₹15 compensation fee will be directed to this UPI ID.
                  </small>
                </div>

                <button
                  type="submit"
                  disabled={savingKyc}
                  className="rp-btn rp-btn--primary rp-btn--block rp-btn--lg"
                >
                  {savingKyc ? 'Updating Documents...' : 'Save & Submit KYC Details'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 7: PROFILE
            ============================================================ */}
        {currentTab === 'profile' && (
          <div className="rp-content rp-content--narrow">
            <div className="rp-surface">
              <h2 className="rp-heading">Driver Profile &amp; Security</h2>

              {profileMsg && (
                <div className={`rp-alert ${profileMsg.type === 'success' ? 'rp-alert--success' : 'rp-alert--error'} cp-slide-down`}>
                  {profileMsg.text}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="rp-form">
                <div className="rp-field">
                  <label className="rp-label">Full Name</label>
                  <input
                    type="text"
                    className="rp-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="rp-field">
                  <label className="rp-label">Phone Number</label>
                  <input
                    type="text"
                    className="rp-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rp-btn rp-btn--primary rp-btn--block rp-btn--lg"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>

              <hr className="rp-hr" />

              <div className="rp-security-card">
                <div>
                  <h4 className="rp-security-title">Account Password</h4>
                  <p className="rp-security-sub">Update your secret driver password</p>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="rp-btn rp-btn--ghost rp-btn--sm"
                >
                  <Lock size={14} /> Change Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="rp-modal-overlay" role="dialog" aria-modal="true" aria-label="Change password">
          <div className="rp-modal rp-modal--sm rp-modal-in">
            <h3 className="rp-modal-title">
              <Lock size={18} color="#EA580C" /> Change Driver Password
            </h3>

            {passError && (
              <div className="rp-alert rp-alert--error cp-slide-down">
                <AlertCircle size={16} /> {passError}
              </div>
            )}
            {passSuccess && (
              <div className="rp-alert rp-alert--success cp-slide-down">
                <CheckCircle2 size={16} /> {passSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="rp-form">
              <div className="rp-field">
                <label className="rp-label">Current Password</label>
                <input
                  type="password"
                  className="rp-input"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  required
                />
              </div>

              <div className="rp-field">
                <label className="rp-label">New Password (min 6 chars)</label>
                <input
                  type="password"
                  className="rp-input"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                />
              </div>

              <div className="rp-field">
                <label className="rp-label">Confirm New Password</label>
                <input
                  type="password"
                  className="rp-input"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  required
                />
              </div>

              <div className="rp-row-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rp-btn rp-btn--ghost rp-btn--block"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passUpdating}
                  className="rp-btn rp-btn--primary rp-btn--block"
                >
                  {passUpdating ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNavigation
        items={riderNavItems}
        activeId={currentTab}
        onChange={handleTabChange}
        theme="passenger"
      />
    </div>
  );
}