import React, { useState, useEffect, useRef } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { alertManager } from '../utils/alertManager';

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

export function RiderPortalView() {
  const { user, token, logout, updateProfile, changePassword } = useAuth();
  const [currentTab, setCurrentTab] = useState(() => getRiderTabFromPath(window.location.pathname));

  // Sync tab with URL on popstate
  useEffect(() => {
    const handleLocationChange = () => {
      if (!window.location.pathname.startsWith('/admin')) {
        setCurrentTab(getRiderTabFromPath(window.location.pathname));
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Normalize initial path if at root /driver or /rider
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

  // Incoming Requests & Active Ride
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

  // Audio Alerts
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Earnings & Shift Stats
  const [earnings, setEarnings] = useState({
    todayTotal: 0,
    netDriverEarning: 0,
    companyCommission: 0,
    todayTrips: 0,
    trips: []
  });
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [riderRides, setRiderRides] = useState([]);

  // Daily Shift Commission Settlement State
  const [selectedSettlementDate, setSelectedSettlementDate] = useState(getTodayDateString);
  const [shiftSettlement, setShiftSettlement] = useState(null);
  const [loadingShiftSettlement, setLoadingShiftSettlement] = useState(false);
  const [submittingShiftSettlement, setSubmittingShiftSettlement] = useState(false);
  const [shiftUtrInput, setShiftUtrInput] = useState('');
  const [copiedAdminUpi, setCopiedAdminUpi] = useState(false);
  const [showAdminQr, setShowAdminQr] = useState(false);
  const [shiftSuccessMsg, setShiftSuccessMsg] = useState('');

  // KYC & Vehicle
  const [vehicleType, setVehicleType] = useState(user?.profile?.vehicle_type || 'BIKE');
  const [vehicleModel, setVehicleModel] = useState(user?.profile?.vehicle_model || '');
  const [vehicleNumber, setVehicleNumber] = useState(user?.profile?.vehicle_number || '');
  const [licenseNumber, setLicenseNumber] = useState(user?.profile?.license_number || '');
  const [upiId, setUpiId] = useState(user?.profile?.upi_id || '');
  const [kycStatus, setKycStatus] = useState(user?.profile?.verification_status || user?.profile?.kyc_status || 'PENDING');
  const [profileTotalRides, setProfileTotalRides] = useState(0);
  const [savingKyc, setSavingKyc] = useState(false);
  const [pendingPenaltiesToVerify, setPendingPenaltiesToVerify] = useState([]);

  // Advance / Scheduled Bookings State
  const [availableScheduledRides, setAvailableScheduledRides] = useState([]);
  const [reservedScheduledRides, setReservedScheduledRides] = useState([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [scheduledActionLoadingId, setScheduledActionLoadingId] = useState(null);
  const [scheduledSuccessAlert, setScheduledSuccessAlert] = useState(null);

  // Sync profile details when user context loads or updates
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

  // Profile & Password
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState(null);
  const [passSuccess, setPassSuccess] = useState(null);
  const [passUpdating, setPassUpdating] = useState(false);

  // Leaflet Map Ref
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);

  // Socket reference
  const socketRef = useRef(null);
  const prevKnownRideIdsRef = useRef(new Set());

  // Dynamic Fare & Platform Fee Split Policy
  // <= ₹80: Platform Fee = ₹4.00, Rider remainder
  // > ₹80: Platform Fee = 10% + ₹2.00, Rider remainder
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

  // Helper to extract local date string (YYYY-MM-DD) in Asia/Kolkata time
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

  // Client-side fallback aggregation from loaded rides
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

  // Derived Earnings Values (merges API summary with fallback calculations)
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

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current && window.L) {
      const map = window.L.map(mapRef.current).setView([12.0228, 79.8509], 15);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      leafletMapRef.current = map;
    }
  }, [mapRef]);

  // 2. Fetch Active Trip & Earnings
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

      // Check if newly arrived requests need an audible ringtone
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
    try {
      setScheduledActionLoadingId(ride.id);
      setActiveRide(ride);
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

  // Refresh earnings, scheduled bookings and trip history periodically
  useEffect(() => {
    if (!token) return;
    fetchPendingPenalties();
    fetchScheduledRides(true);
    const earningsInterval = setInterval(() => {
      fetchEarnings(true);
      fetchPendingPenalties();
      fetchScheduledRides(true);
    }, 5000);
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

  // Sync online status changes to socket
  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.emit('rider:status_toggle', { isOnline, riderId: user?.id });
    }
  }, [isOnline]);

  // Polling fallback: When online & no active ride, poll available requests. When in active ride, poll active status.
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

  // Stop ringing when queue is empty, driver goes offline, or is in an active ride
  useEffect(() => {
    if (!isOnline || incomingRequests.length === 0 || activeRide) {
      alertManager.stopRingtone();
    }
  }, [isOnline, incomingRequests.length, activeRide]);

  // Reset OTP whenever active ride changes, ends, or is null
  useEffect(() => {
    setEnteredOtp('');
    setOtpError(null);
  }, [activeRide?.id]);

  // 3. Socket.IO Listener for Incoming Requests & Real-time Updates
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
        return; // Skip if female rider is requested and driver is not female
      }

      const reqVehicle = (ride.vehicleType || ride.vehicle_type || 'ANY').toUpperCase();
      const myVehicle = (user?.profile?.vehicle_type || vehicleType || 'BIKE').toUpperCase();
      if (reqVehicle !== 'ANY' && reqVehicle !== myVehicle) {
        return; // Skip if passenger specifically requested another vehicle type
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

        // Trigger Audio Ringtone & Browser Push Notification
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
      // If another rider took this ride, dismiss it from our screen immediately
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

  // 5. Update Map when active trip changes
  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return;
    const map = leafletMapRef.current;

    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const bounds = [];

    // Driver location marker
    const driverIcon = window.L.divIcon({
      className: 'custom-map-pin',
      html: `<div style="background: #06B6D4; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 3px solid white; box-shadow: 0 4px 12px rgba(6,182,212,0.6);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    const driverMarker = window.L.marker([12.0240, 79.8530], { icon: driverIcon }).addTo(map).bindPopup('<b>You (Driver)</b>');
    markersRef.current.push(driverMarker);
    bounds.push([12.0240, 79.8530]);

    if (activeRide) {
      if (activeRide.pickup_latitude && activeRide.pickup_longitude) {
        const pickupIcon = window.L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="background: #10B981; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">P</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });
        const pMarker = window.L.marker([activeRide.pickup_latitude, activeRide.pickup_longitude], { icon: pickupIcon })
          .addTo(map)
          .bindPopup(`<b>Pickup:</b> ${activeRide.pickup_address}`);
        markersRef.current.push(pMarker);
        bounds.push([activeRide.pickup_latitude, activeRide.pickup_longitude]);
      }

      if (activeRide.destination_latitude && activeRide.destination_longitude) {
        const destIcon = window.L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="background: #F59E0B; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: black; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">D</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });
        const dMarker = window.L.marker([activeRide.destination_latitude, activeRide.destination_longitude], { icon: destIcon })
          .addTo(map)
          .bindPopup(`<b>Drop:</b> ${activeRide.destination_address}`);
        markersRef.current.push(dMarker);
        bounds.push([activeRide.destination_latitude, activeRide.destination_longitude]);
      }
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [activeRide]);

  // 6. Handle Accept Ride
  const handleAcceptRequest = async (rideId) => {
    alertManager.stopRingtone();
    setAcceptingRideId(rideId);
    setActionLoading(true);
    setEnteredOtp('');
    setOtpError(null);
    try {
      const res = await apiRequest(`/rider/rides/${rideId}/accept`, 'POST', {}, token);
      const r = res.data;
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
    } catch (err) {
      alert(err.message || 'Failed to accept ride. It may have been claimed by another rider.');
      setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(rideId)));
    } finally {
      setActionLoading(false);
      setAcceptingRideId(null);
    }
  };

  // 7. Handle Decline Ride (Isolation: blacklist so never seen again)
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

  // 8. Trip Progress Steps
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

  // 8b. Toggle Driver Waiting Mode & Charge
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

  // 9. Driver Cancel Trip (Auto Re-pool to other drivers)
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

  // 10. Save Vehicle & KYC details
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

  // 11. Save Profile
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

  // 12. Password Change
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

  return (
    <div className="theme-orange-beige" style={{ minHeight: '100vh', background: '#FAF5EE', color: '#271E16', display: 'flex', flexDirection: 'column' }}>
      {/* Top Driver Navigation Header */}
      <header style={{
        background: '#211A14',
        borderBottom: '1px solid #3A2F25',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        color: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/papidologo.jpeg"
            alt="Papido Logo"
            style={{
              width: '38px',
              height: '38px',
              objectFit: 'contain',
              borderRadius: '10px',
              border: '1px solid #43362A',
              background: '#FFFFFF',
              padding: '2px',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.4)'
            }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
              PAPIDO <span style={{ fontSize: '11px', background: 'rgba(249, 115, 22, 0.25)', color: '#FB923C', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(249, 115, 22, 0.4)' }}>DRIVER WEB</span>
            </div>
            <div style={{ fontSize: '11px', color: '#A8998A' }}>Campus Driver Fleet Operations</div>
          </div>
        </div>

        {/* Online / Offline Toggle & Shift Earnings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Online Toggle */}
          <button
            onClick={handleToggleOnline}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: isOnline ? '1.5px solid #10B981' : '1.5px solid #EF4444',
              background: isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: isOnline ? '#34D399' : '#F87171',
              fontWeight: 800,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#10B981' : '#EF4444' }} />
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </button>

          {/* Today Earnings Chip */}
          <div style={{
            background: '#2D2319',
            border: '1px solid #43362A',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ color: '#A8998A', fontSize: '11px' }}>TODAY:</span>
            <span style={{ color: '#FB923C', fontWeight: 900 }}>₹{todayNetEarning}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-scrollable-tabs" style={{ background: '#2D2319', borderColor: '#43362A' }}>
          <a
            href="/driver/radar"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange('radar');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'radar' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'radar' ? '#FFFFFF' : '#D6C7B2',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <Radio size={16} /> Radar & Requests {incomingRequests.length > 0 && <span style={{ background: '#FFFFFF', color: '#EA580C', padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 900 }}>{incomingRequests.length}</span>}
          </a>
          <a
            href="/driver/active"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange('active');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'active' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'active' ? '#FFFFFF' : '#D6C7B2',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <Bike size={16} /> Active Trip {activeRide && '●'}
          </a>
          <a
            href="/driver/advance"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange('scheduled');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'scheduled' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'scheduled' ? '#FFFFFF' : '#D6C7B2',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <Calendar size={16} /> Advance Bookings {availableScheduledRides.length > 0 && <span style={{ background: '#3B82F6', color: '#FFFFFF', padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 900 }}>{availableScheduledRides.length} OPEN</span>}
          </a>
          <a
            href="/driver/earnings"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange('earnings');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'earnings' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'earnings' ? '#FFFFFF' : '#D6C7B2',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <DollarSign size={16} /> Shift Earnings
          </a>
          <a
            href="/driver/settlements"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange('settlements');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'settlements' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'settlements' ? '#FFFFFF' : '#D6C7B2',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <CreditCard size={16} /> Daily Settlements {pendingShiftsList.length > 0 && <span style={{ background: '#F59E0B', color: '#000000', padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 900 }}>{pendingShiftsList.length} PENDING</span>}
          </a>
          <a
            href="/driver/kyc"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange('kyc');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'kyc' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'kyc' ? '#FFFFFF' : '#D6C7B2',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <FileText size={16} /> KYC & Vehicle
          </a>
          <a
            href="/driver/profile"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange('profile');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'profile' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'profile' ? '#FFFFFF' : '#D6C7B2',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <User size={16} /> Profile
          </a>
        </div>

        {/* User Info & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{user?.name || 'Driver'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="btn btn-secondary btn-sm"
            title="Sign Out"
            style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Driver Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Pending Shift Commission Alert Notice */}
        {pendingShiftsList.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #2D1B00, #451A03)',
            borderBottom: '2px solid #F59E0B',
            color: '#FFFFFF',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '280px' }}>
              <div style={{
                background: '#F59E0B',
                color: '#000000',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: '#FDE68A' }}>
                  Pending Platform Fees Notice - Total Due: Rs. {totalPendingCommissionDues}
                </div>
                <div style={{ fontSize: '12px', color: '#FEF3C7', marginTop: '3px', lineHeight: 1.4 }}>
                  You have pending shift commission on the following date(s):
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                    {pendingShiftsList.map((ps) => (
                      <span
                        key={`pending-pill-${ps.date}`}
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid #D97706',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#FDE68A'
                        }}
                      >
                        {ps.date}: Rs. {Number(ps.totalCommissionDue || 0).toFixed(2)} ({ps.status === 'PENDING_APPROVAL' ? 'In Verification' : ps.status === 'REJECTED' ? 'Rejected' : 'Unsettled'})
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', color: '#D1D5DB', display: 'block', marginTop: '4px' }}>
                    You can continue driving and take rides freely. You may pay anytime via UPI in the Daily Settlements tab.
                  </span>
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
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 800, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CreditCard size={14} /> View &amp; Settle Dues
            </button>
          </div>
        )}

        {/* Driver ₹15 Compensation Payment Verification Alerts */}
        {pendingPenaltiesToVerify && pendingPenaltiesToVerify.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #451A03, #78350F)',
            borderBottom: '2px solid #F59E0B',
            color: '#FFFFFF',
            padding: '14px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            {pendingPenaltiesToVerify.map(p => (
              <div key={`pen-ver-${p.id}`} style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid #D97706',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: '#F59E0B',
                    color: '#451A03',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <DollarSign size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#FEF3C7' }}>
                      ₹15 Cancellation Compensation Verification Needed
                    </div>
                    <div style={{ fontSize: '12px', color: '#FDE68A', marginTop: '2px' }}>
                      Passenger <strong>{p.customer_name || 'Passenger'}</strong> {p.customer_phone ? `(${p.customer_phone})` : ''} claims to have paid ₹15 to your UPI for cancelled Ride <strong>#{p.ride_code || ''}</strong>.
                    </div>
                    <div style={{ fontSize: '11px', color: '#FCD34D', marginTop: '2px', fontWeight: 600 }}>
                      Did you receive ₹15 in your UPI/Bank app?
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleConfirmPenalty(p.id, true)}
                    className="btn btn-primary btn-sm"
                    style={{
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '13px',
                      padding: '9px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <CheckCircle2 size={16} /> Confirm ₹15 Received
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmPenalty(p.id, false)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid #EF4444',
                      color: '#FCA5A5',
                      fontWeight: 700,
                      fontSize: '13px',
                      padding: '9px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <XCircle size={16} /> Not Received
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Passenger Cancellation Alert Banner */}
        {tripCancelledNotice && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#F87171',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{tripCancelledNotice}</span>
            <button
              type="button"
              onClick={() => setTripCancelledNotice(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#F87171',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: RADAR & INCOMING RIDE REQUESTS */}
        {/* ============================================================ */}
        {currentTab === 'radar' && (
          <div className="content-body" style={{ maxWidth: '680px', margin: '0 auto', width: '100%', padding: '24px 16px' }}>
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8DCCB', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 30px rgba(234, 88, 12, 0.08)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* KYC Status Notice Banner */}
              {kycStatus !== 'APPROVED' && (
                <div style={{
                  background: kycStatus === 'PENDING' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: kycStatus === 'PENDING' ? '1.5px solid rgba(245, 158, 11, 0.4)' : '1.5px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: kycStatus === 'PENDING' ? '#FCD34D' : '#FCA5A5'
                }}>
                  <ShieldAlert size={26} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>
                      {kycStatus === 'PENDING' ? 'KYC Verification Pending Review' : 'KYC Verification Rejected'}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.95, marginTop: '2px', lineHeight: 1.4 }}>
                      {kycStatus === 'PENDING'
                        ? 'Your uploaded documents (Campus ID, Driving Licence, and RC) are under review by Campus Admin. You will be able to go online and accept rides once approved.'
                        : 'Your driver documents were not approved by the admin. Please check the Vehicle & KYC tab.'}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>Driver Dispatch Radar</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {isOnline ? 'You are ONLINE and listening for nearby student requests.' : 'You are OFFLINE. Toggle switch above to receive rides.'}
                </p>
              </div>

              {/* Sound Alert Status Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                background: soundEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${soundEnabled ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                padding: '12px 14px',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: soundEnabled ? '#34D399' : 'var(--text-muted)' }}>
                  {soundEnabled ? <Volume2 size={18} color="#34D399" /> : <VolumeX size={18} color="var(--text-muted)" />}
                  <span>{soundEnabled ? 'Ride Sound & Chime Alerts: ACTIVE' : 'Ride Sounds Muted'}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => alertManager.playOneShot()}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px', padding: '6px 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Volume2 size={14} /> Test Sound
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) {
                         alertManager.stopRingtone();
                      }
                      setSoundEnabled(!soundEnabled);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px', padding: '6px 14px', fontWeight: 700 }}
                  >
                    {soundEnabled ? 'Mute' : 'Unmute'}
                  </button>
                </div>
              </div>

              {/* Incoming Requests Queue (Multiple Bookings Supported & Persistent until declined) */}
              {!activeRide && incomingRequests.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={14} /> AVAILABLE REQUESTS ({incomingRequests.length})
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Select a ride to accept
                    </span>
                  </div>

                  {incomingRequests.map((req) => {
                    const split = calcDriverSplit(req.total_fare);
                    return (
                      <div
                        key={req.id}
                        style={{
                          background: '#FFFFFF',
                          border: '2px solid #F97316',
                          borderRadius: '16px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: '0 6px 20px rgba(249, 115, 22, 0.15)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '16px', color: '#271E16' }}>{req.customer_name || 'Passenger'}</div>
                            <div style={{ fontSize: '12px', color: '#796D61', marginTop: '2px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>{req.vehicle_type || 'BIKE'}</span>
                              {Boolean(req.is_outside) && <span style={{ background: '#E0E7FF', color: '#3730A3', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700 }}>OUTSIDE CAMPUS</span>}
                              {Boolean(req.is_double_ride) && <span style={{ background: '#FED7AA', color: '#9A3412', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Users size={11} /> Double Ride</span>}
                              {Boolean(req.is_scheduled || req.scheduled_time) && <span style={{ background: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Calendar size={11} /> PRE-BOOKED TRIP</span>}
                              {Boolean(req.female_rider_only) && <span style={{ background: '#FCE7F3', color: '#9D174D', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={11} /> Female Rider Only</span>}
                              {Boolean(req.is_core_only || req.is_free_ride) && <span style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Zap size={11} /> CORE FLASH FREE TRIP</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '26px', fontWeight: 900, color: '#EA580C' }}>
                              ₹{req.total_fare}
                            </div>
                            <div style={{ fontSize: '12px', color: '#059669', fontWeight: 800 }}>
                              Your Net: ₹{split.rider}
                            </div>
                          </div>
                        </div>

                        <div style={{ background: '#F8F3EC', border: '1px solid #E8DCCB', padding: '12px', borderRadius: '10px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#271E16' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                            <div>
                              <span style={{ color: '#059669' }}>●</span> <strong>Pickup:</strong> {req.pickup_address}
                            </div>
                            <a
                              href={getMapLink(req.pickup_address, req.pickup_latitude, req.pickup_longitude)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '6px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontSize: '11px', fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={11} /> Maps
                            </a>
                          </div>

                          {req.via_address && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                              <div>
                                <span style={{ color: '#F59E0B' }}>●</span> <strong>Via Stop:</strong> {req.via_address}
                              </div>
                              <a
                                href={getMapLink(req.via_address, req.via_latitude, req.via_longitude)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '6px', background: '#FEF3C7', border: '1px solid #FCD34D', color: '#B45309', fontSize: '11px', fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={11} /> Maps
                              </a>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                            <div>
                              <span style={{ color: '#EA580C' }}>●</span> <strong>Drop:</strong> {req.destination_address}
                            </div>
                            <a
                              href={getMapLink(req.destination_address, req.destination_latitude, req.destination_longitude)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '6px', background: '#FFF7ED', border: '1px solid #FDBA74', color: '#EA580C', fontSize: '11px', fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={11} /> Maps
                            </a>
                          </div>

                          <div style={{ borderTop: '1px solid #E8DCCB', paddingTop: '6px', marginTop: '2px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#796D61' }}>
                            <span>Collect Cash: ₹{req.total_fare}</span>
                            <span>Platform Fee: ₹{Number(split.platformFee ?? (split.company + split.controller) ?? 4).toFixed(2)}</span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginTop: '4px' }}>
                          <button
                            onClick={() => handleDeclineRequest(req.id)}
                            className="btn btn-secondary"
                            style={{ padding: '10px', fontWeight: 700, background: '#F3ECE2', border: '1px solid #E8DCCB', color: '#796D61' }}
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            disabled={acceptingRideId !== null || actionLoading}
                            style={{
                              padding: '10px',
                              fontWeight: 800,
                              fontSize: '14px',
                              background: 'linear-gradient(135deg, #F97316, #EA580C)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '10px',
                              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                              cursor: (acceptingRideId !== null || actionLoading) ? 'not-allowed' : 'pointer',
                              opacity: (acceptingRideId !== null && acceptingRideId !== req.id) ? 0.6 : 1
                            }}
                          >
                            {acceptingRideId === req.id ? 'Accepting...' : 'Accept Ride Now'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* If Active Ride Exists */}
              {activeRide && (
                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', marginBottom: '6px' }}>
                    ACTIVE TRIP IN PROGRESS:
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '8px' }}>
                    {activeRide.pickup_address} → {activeRide.destination_address}
                  </div>
                  <button
                    onClick={() => setCurrentTab('active')}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%' }}
                  >
                    Open Active Trip Workflow
                  </button>
                </div>
              )}

              {!activeRide && incomingRequests.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                  <Bike size={44} color="var(--border)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {isOnline ? 'Radar Active & Scanning...' : 'Driver is Offline'}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    {isOnline ? 'New ride requests within Pondicherry University will appear here in real-time.' : 'Turn toggle online to receive rides.'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: ACTIVE TRIP WORKFLOW */}
        {/* ============================================================ */}
        {currentTab === 'active' && (
          <div className="content-body" style={{ maxWidth: '650px', margin: '0 auto', width: '100%' }}>
            {!activeRide ? (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
                <Bike size={48} color="var(--border)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>No Active Trip</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '20px' }}>
                  You do not have an ongoing trip right now. Go to Radar to accept new ride requests.
                </p>
                <button onClick={() => setCurrentTab('radar')} className="btn btn-primary">
                  Go to Dispatch Radar
                </button>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{
                  background: 'var(--bg-sidebar)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>CASH TO COLLECT AT DROP:</div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--primary)' }}>
                      ₹{activeRide.total_fare || activeRide.final_fare || activeRide.estimated_fare || 20}
                    </div>
                    {Boolean(activeRide.waiting_fare > 0) && (
                      <div style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700, marginTop: '2px' }}>
                        Includes ₹{activeRide.waiting_fare} waiting charge ({activeRide.waiting_minutes || 0} mins)
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#10B981' }}>
                      Net Pay: ₹{activeRide.rider_earning || calcDriverSplit(activeRide.total_fare).rider}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Platform Fee: ₹{activeRide.company_earning || calcDriverSplit(activeRide.total_fare).company}
                      {calcDriverSplit(activeRide.total_fare).controller > 0 && ` + ₹${calcDriverSplit(activeRide.total_fare).controller} Ctrl`}
                    </div>
                  </div>
                </div>

                {/* Passenger Info Card */}
                <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '16px' }}>{activeRide.customer_name || 'Passenger'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Passenger</div>
                  </div>
                  {activeRide.customer_phone && (
                    <a
                      href={`tel:${activeRide.customer_phone}`}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                    >
                      <Phone size={14} /> Call Passenger
                    </a>
                  )}
                </div>

                {/* Driver Waiting Timer & Control Action Card (Only available AFTER trip has STARTED) */}
                {activeRide.status === 'STARTED' && (
                  <div style={{
                    background: activeRide.is_waiting ? 'rgba(234, 88, 12, 0.12)' : '#F8F3EC',
                    border: activeRide.is_waiting ? '2px solid #EA580C' : '1.5px dashed #E8DCCB',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          background: activeRide.is_waiting ? '#EA580C' : '#796D61',
                          color: '#FFFFFF',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Clock size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '14px', color: activeRide.is_waiting ? '#EA580C' : '#271E16' }}>
                            {activeRide.is_waiting ? 'DRIVER ON WAITING MODE' : 'Trip Waiting Controls'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#796D61' }}>
                            Policy: 0–9 mins free, ₹10 added for every 10 full minutes of waiting
                          </div>
                        </div>
                      </div>

                      {Boolean(activeRide.is_waiting) && (
                        <span className="badge badge-warning" style={{ fontSize: '11px', fontWeight: 900 }}>
                          ON WAITING
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E8DCCB' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#796D61', fontWeight: 600 }}>Total Waiting Recorded:</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#EA580C' }}>
                          {activeRide.waiting_minutes || 0} mins (+₹{activeRide.waiting_fare || 0} added)
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleWaiting}
                        disabled={waitingLoading}
                        style={{
                          padding: '9px 18px',
                          borderRadius: '8px',
                          border: 'none',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: 'pointer',
                          background: activeRide.is_waiting ? '#DC2626' : '#EA580C',
                          color: '#FFFFFF',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(234, 88, 12, 0.3)'
                        }}
                      >
                        <Clock size={14} />
                        {waitingLoading ? 'Updating...' : activeRide.is_waiting ? 'Stop / End Waiting' : 'Start Waiting Timer'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Trip Route Details & Live Maps Navigation */}
                <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div>
                      <span style={{ color: '#10B981' }}>●</span> <strong>Pickup:</strong> {activeRide.pickup_address}
                    </div>
                    <a
                      href={getMapLink(activeRide.pickup_address, activeRide.pickup_latitude, activeRide.pickup_longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 800, textDecoration: 'none', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', flexShrink: 0 }}
                    >
                      <ExternalLink size={12} /> Navigate Pickup
                    </a>
                  </div>

                  {activeRide.via_address && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div>
                        <span style={{ color: '#F59E0B' }}>●</span> <strong>Via Stop:</strong> {activeRide.via_address}
                      </div>
                      <a
                        href={getMapLink(activeRide.via_address, activeRide.via_latitude, activeRide.via_longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 800, textDecoration: 'none', background: '#FEF3C7', border: '1px solid #FCD34D', color: '#B45309', flexShrink: 0 }}
                      >
                        <ExternalLink size={12} /> Navigate Via Stop
                      </a>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div>
                      <span style={{ color: '#EA580C' }}>●</span> <strong>Drop:</strong> {activeRide.destination_address}
                    </div>
                    <a
                      href={getMapLink(activeRide.destination_address, activeRide.destination_latitude, activeRide.destination_longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 800, textDecoration: 'none', background: '#FFF7ED', border: '1px solid #FDBA74', color: '#EA580C', flexShrink: 0 }}
                    >
                      <ExternalLink size={12} /> Navigate Drop
                    </a>
                  </div>
                </div>

                {/* Error Banner */}
                {otpError && (
                  <div style={{ padding: '10px', background: 'rgba(244,63,94,0.15)', border: '1px solid #F43F5E', color: '#F43F5E', borderRadius: '8px', fontSize: '12px' }}>
                    {otpError}
                  </div>
                )}

                {/* Step-by-Step Action Progression */}
                {activeRide.status === 'ACCEPTED' && (
                  <button
                    onClick={() => handleStatusChange('RIDER_ARRIVING')}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '14px', fontWeight: 800, fontSize: '15px' }}
                  >
                    {actionLoading ? 'Updating...' : '1. I am On The Way (Arriving)'}
                  </button>
                )}

                {activeRide.status === 'RIDER_ARRIVING' && (
                  <button
                    onClick={() => handleStatusChange('RIDER_REACHED')}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '14px', fontWeight: 800, fontSize: '15px' }}
                  >
                    {actionLoading ? 'Updating...' : '2. Reached Pickup Location'}
                  </button>
                )}

                {activeRide.status === 'RIDER_REACHED' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Ask Passenger for 4-Digit Ride OTP:
                    </label>
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
                      className="form-input"
                      style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 900 }}
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                    <button
                      onClick={() => handleStatusChange('STARTED')}
                      disabled={actionLoading || enteredOtp.length !== 4}
                      className="btn btn-success"
                      style={{ width: '100%', padding: '14px', fontWeight: 800, fontSize: '15px' }}
                    >
                      {actionLoading ? 'Verifying...' : '3. Verify OTP & Start Trip'}
                    </button>
                  </div>
                )}

                {activeRide.status === 'STARTED' && (
                  <button
                    onClick={() => handleStatusChange('COMPLETED')}
                    disabled={actionLoading}
                    className="btn btn-success"
                    style={{ width: '100%', padding: '14px', fontWeight: 800, fontSize: '15px' }}
                  >
                    {actionLoading ? 'Completing...' : '4. Reached Destination & Complete Trip'}
                  </button>
                )}

                {activeRide.status === 'COMPLETED' && (
                  <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(16,185,129,0.15)', border: '1px solid #10B981', borderRadius: '16px' }}>
                    <CheckCircle size={44} color="#10B981" style={{ margin: '0 auto 10px' }} />
                    <h3 style={{ color: '#10B981', fontWeight: 800, fontSize: '20px' }}>Trip Completed & Settled!</h3>
                    
                    <div style={{ margin: '16px 0', padding: '14px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>CASH TO COLLECT FROM PASSENGER:</div>
                      <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--primary)', margin: '4px 0' }}>
                        ₹{activeRide.final_fare || activeRide.total_fare || activeRide.estimated_fare || 20}
                      </div>
                      <div style={{ fontSize: '13px', color: '#10B981', fontWeight: 700, marginTop: '6px' }}>
                        Your Net Take-Home: ₹{activeRide.rider_earning || calcDriverSplit(activeRide.final_fare || activeRide.total_fare || 20).rider}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActiveRide(null);
                        setEnteredOtp('');
                        setCurrentTab('radar');
                      }}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px', fontWeight: 800 }}
                    >
                      Return to Radar for Next Trip
                    </button>
                  </div>
                )}

                {/* Cancel Trip Button (Before ride starts) */}
                {['ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED'].includes(activeRide.status) && (
                  <button
                    onClick={handleCancelActiveTrip}
                    disabled={actionLoading}
                    className="btn btn-danger btn-sm"
                    style={{ width: '100%', padding: '10px' }}
                  >
                    Cancel Trip (Driver Emergency)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2B: ADVANCE / PRE-BOOKED SCHEDULED TRIPS */}
        {/* ============================================================ */}
        {currentTab === 'scheduled' && (
          <div className="content-body" style={{ maxWidth: '960px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={24} color="#EA580C" /> Advance Campus Pre-Bookings
                </h2>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Browse and claim passenger pre-booked trips hours or days in advance.
                </div>
              </div>
              <button
                type="button"
                onClick={fetchScheduledRides}
                disabled={loadingScheduled}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontWeight: 700 }}
              >
                <RefreshCw size={14} className={loadingScheduled ? 'spin' : ''} />
                <span>{loadingScheduled ? 'Refreshing...' : 'Refresh List'}</span>
              </button>
            </div>

            {scheduledSuccessAlert && (
              <div style={{
                background: '#D1FAE5',
                border: '1px solid #6EE7B7',
                color: '#065F46',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '13px'
              }}>
                <CheckCircle2 size={18} color="#059669" />
                <span>{scheduledSuccessAlert}</span>
              </div>
            )}

            {/* Quick Metrics Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px 20px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  MY RESERVED SCHEDULE
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>
                  {reservedScheduledRides.length} <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Trips Confirmed</span>
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px 20px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  OPEN PRE-BOOKINGS
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#EA580C', marginTop: '4px' }}>
                  {availableScheduledRides.length} <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Available to Claim</span>
                </div>
              </div>
            </div>

            {/* SECTION 1: MY RESERVED SCHEDULE */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <ShieldCheck size={20} color="#10B981" />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  My Confirmed Advance Schedule ({reservedScheduledRides.length})
                </h3>
              </div>

              {reservedScheduledRides.length === 0 ? (
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px dashed var(--border)',
                  borderRadius: '14px',
                  padding: '32px 20px',
                  textAlign: 'center',
                  color: 'var(--text-muted)'
                }}>
                  <Calendar size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>No advance trips reserved yet</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    Claim an open campus pre-booking below to lock in guaranteed trips for your schedule.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {reservedScheduledRides.map((sr) => (
                    <div
                      key={`res-${sr.id}`}
                      style={{
                        background: 'var(--bg-card)',
                        border: '2px solid #10B981',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ background: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                              CONFIRMED TO YOU
                            </span>
                            <span style={{ background: 'var(--bg-sidebar)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                              #{sr.ride_code || sr.id}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--primary)' }}>
                              {sr.scheduled_time_ist || sr.scheduled_time}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>YOUR NET PAYOUT:</div>
                          <div style={{ fontSize: '22px', fontWeight: 900, color: '#10B981' }}>
                            ₹{sr.rider_earning || Number(sr.total_fare || 20).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Route Details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' }}>
                          <span style={{ color: '#10B981', fontWeight: 900 }}>●</span>
                          <div><strong>Pickup:</strong> {sr.pickup_address}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' }}>
                          <span style={{ color: '#EA580C', fontWeight: 900 }}>●</span>
                          <div><strong>Drop:</strong> {sr.destination_address}</div>
                        </div>
                      </div>

                      {/* Passenger Details & Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-sidebar)', padding: '12px 14px', borderRadius: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>PASSENGER</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {sr.customer_name || 'Campus Passenger'}
                          </div>
                          {sr.customer_phone && (
                            <a
                              href={`tel:${sr.customer_phone}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', marginTop: '2px' }}
                            >
                              <Phone size={12} /> Call Passenger ({sr.customer_phone})
                            </a>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleCancelScheduledRide(sr.id)}
                            disabled={scheduledActionLoadingId === sr.id}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700, color: '#DC2626', borderColor: '#FECACA' }}
                          >
                            Release Booking
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartScheduledTrip(sr)}
                            disabled={scheduledActionLoadingId === sr.id}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 800, background: 'linear-gradient(135deg, #10B981, #059669)', color: '#FFFFFF', border: 'none' }}
                          >
                            Open Active Trip View <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: OPEN CAMPUS PRE-BOOKINGS AVAILABLE FOR CLAIMING */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Radio size={20} color="#EA580C" />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Open Campus Pre-Bookings ({availableScheduledRides.length})
                </h3>
              </div>

              {availableScheduledRides.length === 0 ? (
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  color: 'var(--text-muted)'
                }}>
                  <CheckCircle2 size={32} color="#10B981" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>No open pre-booked trips right now</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    When students pre-book rides for upcoming hours or tomorrow, they will appear here instantly for you to claim.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {availableScheduledRides.map((sr) => (
                    <div
                      key={`avail-${sr.id}`}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1.5px solid #FDBA74',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        boxShadow: '0 4px 16px rgba(249, 115, 22, 0.08)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ background: '#FFF7ED', color: '#C2410C', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, border: '1px solid #FFEDD5' }}>
                              PRE-BOOKED TRIP
                            </span>
                            <span style={{ background: 'var(--bg-sidebar)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                              #{sr.ride_code || sr.id}
                            </span>
                            {sr.female_rider_only && (
                              <span style={{ background: '#FCE7F3', color: '#BE185D', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                                Female Rider Only
                              </span>
                            )}
                            {sr.is_double_ride && (
                              <span style={{ background: '#E0E7FF', color: '#3730A3', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                                Double Ride
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: 900, color: '#EA580C', marginTop: '6px' }}>
                            Pickup Scheduled: {sr.scheduled_time_ist || sr.scheduled_time}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>ESTIMATED FARE:</div>
                          <div style={{ fontSize: '24px', fontWeight: 900, color: '#EA580C' }}>
                            ₹{Number(sr.total_fare || sr.estimated_fare || 20).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Route Details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' }}>
                          <span style={{ color: '#10B981', fontWeight: 900 }}>●</span>
                          <div><strong>Pickup:</strong> {sr.pickup_address}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' }}>
                          <span style={{ color: '#EA580C', fontWeight: 900 }}>●</span>
                          <div><strong>Drop:</strong> {sr.destination_address}</div>
                        </div>
                      </div>

                      {/* Claim Button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Passenger: <strong>{sr.customer_name || 'Campus Passenger'}</strong> • Vehicle: <strong>{sr.vehicle_type || 'BIKE'}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAcceptScheduledRide(sr.id)}
                          disabled={scheduledActionLoadingId === sr.id}
                          className="btn btn-primary"
                          style={{
                            padding: '10px 24px',
                            fontWeight: 900,
                            fontSize: '14px',
                            background: 'linear-gradient(135deg, #F97316, #EA580C)',
                            color: '#FFFFFF',
                            borderRadius: '10px',
                            boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <CheckCircle2 size={16} />
                          <span>{scheduledActionLoadingId === sr.id ? 'Claiming...' : 'ACCEPT & CONFIRM PRE-BOOKING'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: EARNINGS & TRIP RECEIPTS */}
        {/* ============================================================ */}
        {currentTab === 'earnings' && (
          <div className="content-body" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>Driver Shift Earnings &amp; Trip Ledger</h2>

            {/* Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>TODAY'S NET EARNINGS</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--primary)' }}>₹{Number(todayNetEarning).toFixed(2)}</div>
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>TODAY'S COMPLETED TRIPS</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#10B981' }}>{todayTripsCount}</div>
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>TOTAL TRIPS COMPLETED (ALL-TIME)</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#8B5CF6' }}>{lifetimeTripsCount}</div>
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>PLATFORM FEE</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#06B6D4' }}>₹{Number(totalPlatformFee).toFixed(2)}</div>
              </div>
            </div>

            {/* Completed Rides Table */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 800 }}>
                Trip Settlements &amp; Receipts
              </div>
              {loadingEarnings ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading earnings ledger...</div>
              ) : riderRides.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No completed rides in this shift yet.</div>
              ) : (
                <div className="table-container" style={{ border: 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-sidebar)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 16px' }}>Ride ID</th>
                        <th style={{ padding: '12px 16px' }}>Route</th>
                        <th style={{ padding: '12px 16px' }}>Gross Fare</th>
                        <th style={{ padding: '12px 16px' }}>Your Net</th>
                        <th style={{ padding: '12px 16px' }}>Platform Fee</th>
                        <th style={{ padding: '12px 16px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riderRides.map((r) => {
                        const fare = Number(r.total_fare || r.final_fare || r.estimated_fare || 20);
                        const fee = fare <= 80 ? 4.0 : Number((fare * 0.10 + 2.0).toFixed(2));
                        const net = r.rider_earning !== undefined ? Number(r.rider_earning) : Math.max(0, fare - fee);
                        return (
                          <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 700 }}>#{r.id}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <div>{r.pickup_address} → {r.destination_address}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {formatRideDateTime(r.requested_at || r.created_at || r.accepted_at || r.completed_at)}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>₹{fare.toFixed(2)}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--primary)' }}>
                              ₹{net.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#06B6D4' }}>
                              ₹{fee.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span className={`badge ${r.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
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

        {/* ============================================================ */}
        {/* TAB 4: DAY-WISE PLATFORM COMMISSION SETTLEMENT */}
        {/* ============================================================ */}
        {currentTab === 'settlements' && (
          <div className="content-body" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0' }}>Day-Wise Commission Settlement</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Settle daily platform commission shift-by-shift to clear your account for upcoming rides.
                </div>
              </div>

              {/* Date Selector Filter Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = getTodayDateString();
                    setSelectedSettlementDate(todayStr);
                    fetchShiftSettlement(todayStr);
                  }}
                  className={`btn btn-sm ${selectedSettlementDate === getTodayDateString() ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '12px', fontWeight: 700, padding: '6px 12px' }}
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
                  className={`btn btn-sm ${selectedSettlementDate === getYesterdayDateString() ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '12px', fontWeight: 700, padding: '6px 12px' }}
                >
                  Yesterday
                </button>
                <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 10px', gap: '6px' }}>
                  <Calendar size={14} color="var(--text-muted)" />
                  <input
                    type="date"
                    value={selectedSettlementDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setSelectedSettlementDate(newDate);
                      fetchShiftSettlement(newDate);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchShiftSettlement(selectedSettlementDate)}
                  disabled={loadingShiftSettlement}
                  className="btn btn-secondary btn-sm"
                  title="Refresh Settlement Data"
                  style={{ padding: '7px 10px' }}
                >
                  <RefreshCw size={13} className={loadingShiftSettlement ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Selected Day Shift Settlement Card */}
            <div style={{
              background: 'var(--bg-card)',
              border: (shiftSettlement?.status === 'REJECTED') ? '2px solid #EF4444' : '1.5px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      Shift Commission: {shiftSettlement?.date || selectedSettlementDate}
                    </h3>
                    {selectedSettlementDate === getTodayDateString() && (
                      <span style={{ fontSize: '11px', background: 'rgba(249, 115, 22, 0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                        TODAY'S SHIFT
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Trips Completed on this date: <strong>{shiftSettlement?.totalTrips || 0}</strong>
                  </div>
                </div>

                <div>
                  {shiftSettlement?.status === 'SETTLED' ? (
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '5px 12px' }}>
                      <CheckCircle2 size={14} /> Approved &amp; Cleared
                    </span>
                  ) : shiftSettlement?.status === 'PENDING_APPROVAL' ? (
                    <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '5px 12px' }}>
                      <Clock size={14} /> Verification In Progress
                    </span>
                  ) : shiftSettlement?.status === 'REJECTED' ? (
                    <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '5px 12px' }}>
                      <AlertTriangle size={14} /> Settlement Rejected (Please Resubmit)
                    </span>
                  ) : Number(shiftSettlement?.totalCommissionDue || 0) === 0 ? (
                    <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '5px 12px' }}>
                      <Check size={14} /> No Due (₹0)
                    </span>
                  ) : selectedSettlementDate === getTodayDateString() ? (
                    <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '5px 12px', background: 'rgba(249, 115, 22, 0.15)', color: '#F97316', border: '1px solid rgba(249, 115, 22, 0.4)', borderRadius: '6px', fontWeight: 800 }}>
                      <Clock size={14} /> Today's Active Shift
                    </span>
                  ) : (
                    <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '5px 12px' }}>
                      <AlertTriangle size={14} /> Past Shift Due (Unsettled)
                    </span>
                  )}
                </div>
              </div>

              {selectedSettlementDate === getTodayDateString() && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '10px',
                  color: '#60A5FA',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Clock size={15} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Today's Shift:</strong> Rides accumulate during your active day up to 12:00 midnight. You can take rides freely. Any unsettled commission becomes due for payment tomorrow.
                  </span>
                </div>
              )}

              {shiftSuccessMsg && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '10px',
                  color: '#34D399',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} />
                  <span>{shiftSuccessMsg}</span>
                </div>
              )}

              {shiftSettlement?.status === 'REJECTED' && shiftSettlement?.rejectionReason && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '10px',
                  color: '#F87171',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={16} />
                  <span><strong>Rejection Reason:</strong> {shiftSettlement.rejectionReason}. Please re-transfer or verify UTR reference.</span>
                </div>
              )}

              {/* Commission Dues Breakdown Box */}
              <div style={{
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>GROSS COLLECTED:</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    ₹{Number(shiftSettlement?.grossFare ?? 0).toFixed(2)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>YOUR NET TAKE-HOME:</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981' }}>
                    ₹{Number(shiftSettlement?.riderNetEarnings ?? 0).toFixed(2)}
                  </div>
                </div>

                <div style={{ borderLeft: '2px dashed var(--border)', paddingLeft: '16px' }}>
                  <div style={{ fontSize: '11px', color: selectedSettlementDate === getTodayDateString() ? '#F59E0B' : '#EF4444', fontWeight: 800 }}>
                    {selectedSettlementDate === getTodayDateString() ? 'ACCUMULATING PLATFORM FEE:' : 'PLATFORM FEE DUE:'}
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: selectedSettlementDate === getTodayDateString() ? '#F59E0B' : '#EF4444' }}>
                    ₹{Number(shiftSettlement?.totalCommissionDue ?? 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {selectedSettlementDate === getTodayDateString() 
                      ? 'Accumulates during today\'s shift • Due after 12:00 AM midnight'
                      : 'Standard: ₹4 / ride (Fare ≤ ₹80) | Long Trips: 10% + ₹2 (Fare > ₹80)'}
                  </div>
                </div>
              </div>

              {shiftSettlement?.status === 'SETTLED' ? (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#10B981'
                }}>
                  <CheckCircle2 size={22} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>Shift Commission Cleared &amp; Approved</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Admin has verified UTR <strong>{shiftSettlement.utrReference || 'N/A'}</strong>. This shift settlement is complete.
                    </div>
                  </div>
                </div>
              ) : Number(shiftSettlement?.totalCommissionDue || 0) === 0 ? (
                <div style={{
                  background: 'var(--bg-sidebar)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '13px'
                }}>
                  No completed rides or commission dues on {shiftSettlement?.date || selectedSettlementDate}.
                </div>
              ) : selectedSettlementDate === getTodayDateString() ? (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  color: '#93C5FD'
                }}>
                  <Clock size={24} style={{ color: '#60A5FA', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#BFDBFE' }}>
                      Today's Shift is Currently Active
                    </div>
                    <div style={{ fontSize: '12px', color: '#93C5FD', marginTop: '3px', lineHeight: 1.5 }}>
                      Your rides accumulate throughout today. The final shift settlement amount will be closed and payable <strong>after 12:00 AM midnight</strong>. You can drive freely anytime!
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Admin Payment Options */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <a
                      href={shiftSettlement?.adminUpi?.upiPayUrl || `upi://pay?pa=${encodeURIComponent(shiftSettlement?.adminUpi?.upiId || 'papido.admin@okaxis')}&pn=${encodeURIComponent(shiftSettlement?.adminUpi?.receiverName || 'Papido Admin')}&am=${Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2)}&tn=Papido_Shift_${shiftSettlement?.date || selectedSettlementDate}&cu=INR`}
                      style={{
                        background: 'linear-gradient(135deg, #0F9D58, #0B8043)',
                        color: '#FFFFFF',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '13px',
                        textAlign: 'center',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Smartphone size={15} /> 1-Tap Google Pay (₹{Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2)})
                    </a>

                    <a
                      href={shiftSettlement?.adminUpi?.upiPayUrl || `upi://pay?pa=${encodeURIComponent(shiftSettlement?.adminUpi?.upiId || 'papido.admin@okaxis')}&pn=${encodeURIComponent(shiftSettlement?.adminUpi?.receiverName || 'Papido Admin')}&am=${Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2)}&tn=Papido_Shift_${shiftSettlement?.date || selectedSettlementDate}&cu=INR`}
                      style={{
                        background: 'linear-gradient(135deg, #5F259F, #4A1D7A)',
                        color: '#FFFFFF',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '13px',
                        textAlign: 'center',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Zap size={15} /> 1-Tap PhonePe / Any UPI
                    </a>
                  </div>

                  {/* Admin UPI Copy Box */}
                  <div style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Admin Settlement UPI ID ({shiftSettlement?.adminUpi?.receiverName || 'Papido Operations'})
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
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
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700 }}
                    >
                      {copiedAdminUpi ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                      <span>{copiedAdminUpi ? 'Copied' : 'Copy UPI'}</span>
                    </button>
                  </div>

                  {/* QR Code Toggle */}
                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setShowAdminQr(!showAdminQr)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <QrCode size={14} />
                      <span>{showAdminQr ? 'Hide Admin Settlement QR Code' : 'Show Admin Settlement QR Code'}</span>
                    </button>

                    {showAdminQr && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', display: 'inline-block' }}>
                          <img
                            src={shiftSettlement?.adminUpi?.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(shiftSettlement?.adminUpi?.upiPayUrl || 'upi://pay?pa=papido.admin@okaxis')}`}
                            alt="Admin Settlement QR"
                            style={{ width: '180px', height: '180px', display: 'block' }}
                          />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                          Scan to pay exact ₹{Number(shiftSettlement?.totalCommissionDue || 0).toFixed(2)} for {shiftSettlement?.date || selectedSettlementDate}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* UTR Submission Form */}
                  <form onSubmit={handleSubmitShiftSettlement} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                        UPI Transaction Reference / UTR Number (12 Digits) for {shiftSettlement?.date || selectedSettlementDate} *
                      </label>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 428192849102"
                          value={shiftUtrInput}
                          onChange={(e) => setShiftUtrInput(e.target.value)}
                          style={{ flex: 1, minWidth: '220px', fontSize: '13px', fontFamily: 'monospace' }}
                          required
                        />
                        <button
                          type="submit"
                          disabled={submittingShiftSettlement || !shiftUtrInput.trim()}
                          className="btn btn-primary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', fontWeight: 800 }}
                        >
                          <Send size={14} />
                          <span>{submittingShiftSettlement ? 'Submitting...' : `Submit Settlement for ${shiftSettlement?.date || selectedSettlementDate}`}</span>
                        </button>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Admin verifies this payment and clears your shift so you can accept rides tomorrow.
                      </div>
                    </div>
                  </form>
                </>
              )}
            </div>

            {/* Multi-Day Settlement History Ledger Table */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '15px' }}>Past 14 Days Shift Settlements Ledger</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click any day to view or settle</span>
              </div>

              {loadingShiftSettlement && !shiftSettlement?.recentShifts ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading shift history...</div>
              ) : !shiftSettlement?.recentShifts || shiftSettlement.recentShifts.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No completed shifts found in the past 14 days.</div>
              ) : (
                <div className="table-container" style={{ border: 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-sidebar)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 16px' }}>Shift Date</th>
                        <th style={{ padding: '12px 16px' }}>Trips</th>
                        <th style={{ padding: '12px 16px' }}>Gross Volume</th>
                        <th style={{ padding: '12px 16px' }}>Commission Due</th>
                        <th style={{ padding: '12px 16px' }}>Your Net</th>
                        <th style={{ padding: '12px 16px' }}>Status</th>
                        <th style={{ padding: '12px 16px' }}>Submitted UTR</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shiftSettlement.recentShifts.map((s) => {
                        const isSelected = selectedSettlementDate === s.date;
                        return (
                          <tr key={s.date} style={{ borderBottom: '1px solid var(--border-light)', background: isSelected ? 'rgba(249, 115, 22, 0.08)' : 'transparent' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 800 }}>
                              {s.date}
                              {s.date === getTodayDateString() && (
                                <span style={{ marginLeft: '6px', fontSize: '10px', background: 'rgba(249, 115, 22, 0.2)', color: 'var(--primary)', padding: '1px 5px', borderRadius: '3px' }}>
                                  TODAY
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px' }}>{s.totalTrips}</td>
                            <td style={{ padding: '12px 16px' }}>₹{s.grossFare.toFixed(2)}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 800, color: s.totalCommissionDue > 0 ? '#EF4444' : 'var(--text-muted)' }}>
                              ₹{s.totalCommissionDue.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#10B981' }}>
                              ₹{s.riderNetEarnings.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {s.status === 'SETTLED' ? (
                                <span className="badge badge-success" style={{ fontSize: '11px' }}>SETTLED</span>
                              ) : s.status === 'PENDING_APPROVAL' ? (
                                <span className="badge badge-warning" style={{ fontSize: '11px' }}>VERIFYING</span>
                              ) : s.status === 'REJECTED' ? (
                                <span className="badge badge-danger" style={{ fontSize: '11px' }}>REJECTED</span>
                              ) : (
                                <span className="badge badge-danger" style={{ fontSize: '11px' }}>DUE</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>
                              {s.utrReference || '-'}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSettlementDate(s.date);
                                  fetchShiftSettlement(s.date);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ fontSize: '11px', padding: '4px 10px', fontWeight: 700 }}
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
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: KYC & VEHICLE DETAILS */}
        {/* ============================================================ */}
        {currentTab === 'kyc' && (
          <div className="content-body" style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Vehicle & KYC Documents</h2>
                <span className={`badge ${kycStatus === 'APPROVED' ? 'badge-success' : kycStatus === 'PENDING' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '12px', fontWeight: 800, padding: '4px 10px' }}>
                  {kycStatus === 'APPROVED' ? 'APPROVED BY ADMIN' : kycStatus === 'PENDING' ? 'PENDING ADMIN VERIFICATION' : 'REJECTED'}
                </span>
              </div>

              {/* Status Explanation Card */}
              {kycStatus !== 'APPROVED' ? (
                <div style={{
                  background: kycStatus === 'PENDING' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: kycStatus === 'PENDING' ? '1.5px solid rgba(245, 158, 11, 0.35)' : '1.5px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: kycStatus === 'PENDING' ? '#FCD34D' : '#FCA5A5'
                }}>
                  <ShieldAlert size={22} style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '13px', lineHeight: 1.4 }}>
                    <strong>{kycStatus === 'PENDING' ? 'Document Verification in Progress:' : 'Verification Rejected:'}</strong>{' '}
                    {kycStatus === 'PENDING'
                      ? 'Your Campus ID Card, Driving Licence, and Vehicle RC have been submitted and are currently waiting for approval from the Campus Administrator. You will be able to turn Online and accept rides once approved.'
                      : 'Your documents were rejected. Please review or update your credentials below.'}
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1.5px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#34D399',
                  fontSize: '13px'
                }}>
                  <ShieldCheck size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Verified Driver Account:</strong> All your documents have been verified and approved by Campus Admin. You can go online anytime to accept student rides.
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveKyc} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Vehicle Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setVehicleType('BIKE')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: vehicleType === 'BIKE' ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: vehicleType === 'BIKE' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-input)',
                        color: vehicleType === 'BIKE' ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 700,
                        fontSize: '13px'
                      }}
                    >
                      <Bike size={18} /> Bike (Motorcycle)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleType('SCOOTER')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: vehicleType === 'SCOOTER' ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: vehicleType === 'SCOOTER' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-input)',
                        color: vehicleType === 'SCOOTER' ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 700,
                        fontSize: '13px'
                      }}
                    >
                      <Zap size={18} /> Scooter / Scooty
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Vehicle Model</label>
                  <input
                    type="text"
                    className="form-input"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Vehicle Registration Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Driving License Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Driver UPI ID (For Direct Cancellation Compensation & Online Payments)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 9876543210@paytm / driver@okaxis"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '3px', display: 'block' }}>
                    If a passenger cancels after you reach their pickup spot, their ₹15 compensation fee will be directed to this UPI ID.
                  </small>
                </div>

                <button type="submit" disabled={savingKyc} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: 700 }}>
                  {savingKyc ? 'Updating Documents...' : 'Save & Submit KYC Details'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: PROFILE & SECURITY */}
        {/* ============================================================ */}
        {currentTab === 'profile' && (
          <div className="content-body" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Driver Profile & Security</h2>

              {profileMsg && (
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  background: profileMsg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                  color: profileMsg.type === 'success' ? '#10B981' : '#F43F5E',
                  fontSize: '13px'
                }}>
                  {profileMsg.text}
                </div>
              )}

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontWeight: 700 }}
                >
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>

              <hr style={{ borderColor: 'var(--border)', margin: '24px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '15px' }}>Account Password</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Update your secret driver password</p>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
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
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="var(--primary)" /> Change Driver Password
            </h3>

            {passError && (
              <div style={{ padding: '10px', background: 'rgba(244,63,94,0.15)', border: '1px solid #F43F5E', color: '#F43F5E', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>
                {passError}
              </div>
            )}
            {passSuccess && (
              <div style={{ padding: '10px', background: 'rgba(16,185,129,0.15)', border: '1px solid #10B981', color: '#10B981', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>
                {passSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password (min 6 chars)</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passUpdating}
                  className="btn btn-primary"
                  style={{ flex: 1, fontWeight: 700 }}
                >
                  {passUpdating ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
