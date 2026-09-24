import React, { useState, useEffect, useRef } from 'react';
import './CustomerPortalView.css';
import { useAuth } from '../context/AuthContext';
import { apiRequest, getSocketUrl } from '../api';
import { io } from 'socket.io-client';
import {
  MapPin,
  Navigation,
  Bike,
  Zap,
  Shield,
  Phone,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  RotateCcw,
  User,
  Lock,
  History,
  Send,
  Compass,
  ArrowRight,
  LogOut,
  Search,
  Users,
  CheckCircle2,
  ExternalLink,
  Tag,
  RefreshCw,
  X,
  Plus,
  CreditCard,
  AlertTriangle,
  QrCode,
  Copy,
  Check,
  Smartphone,
  Award,
  Sparkles,
  ShieldCheck,
  ThumbsUp,
  Calendar,
  MapPinned,
  Hourglass
} from 'lucide-react';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { RatingControl } from '../components/passenger/RatingControl';
import { RideStatusStepper } from '../components/ride/RideStatusStepper';

const DEFAULT_GROUPED_CAMPUS_STOPS = [
  {
    key: 'GIRLS_HOSTEL',
    label: 'Girls Hostels',
    stops: [
      { id: 'gh-1', name: 'Madame Curie Girls Hostel', lat: 12.0215, lng: 79.8565 },
      { id: 'gh-2', name: 'Mother Teresa Girls Hostel', lat: 12.0218, lng: 79.8570 },
      { id: 'gh-3', name: 'Ganga Girls Hostel', lat: 12.0222, lng: 79.8575 },
      { id: 'gh-4', name: 'Yamuna Girls Hostel', lat: 12.0225, lng: 79.8572 },
      { id: 'gh-5', name: 'Sarojini Naidu Girls Hostel', lat: 12.0212, lng: 79.8560 },
      { id: 'gh-6', name: 'Cauvery Girls Hostel', lat: 12.0220, lng: 79.8580 },
      { id: 'gh-7', name: 'Saraswathi Girls Hostel', lat: 12.0216, lng: 79.8568 }
    ]
  },
  {
    key: 'BOYS_HOSTEL',
    label: 'Boys Hostels',
    stops: [
      { id: 'bh-1', name: 'Silver Jubilee Hostel (SJC)', lat: 12.0280, lng: 79.8520 },
      { id: 'bh-2', name: 'Bharathidasan Boys Hostel', lat: 12.0275, lng: 79.8515 },
      { id: 'bh-3', name: 'Kabilar Boys Hostel', lat: 12.0270, lng: 79.8510 },
      { id: 'bh-4', name: 'Subramania Bharathi Boys Hostel', lat: 12.0285, lng: 79.8525 },
      { id: 'bh-5', name: 'Kalidas Boys Hostel', lat: 12.0268, lng: 79.8530 },
      { id: 'bh-6', name: 'Valmiki Boys Hostel', lat: 12.0272, lng: 79.8535 },
      { id: 'bh-7', name: 'Foreign Students Hostel', lat: 12.0288, lng: 79.8540 }
    ]
  },
  {
    key: 'DEPARTMENT',
    label: 'Departments & School Blocks',
    stops: [
      { id: 'dp-1', name: 'Science Complex / Physics Dept', lat: 12.0261, lng: 79.8550 },
      { id: 'dp-2', name: 'School of Management (SOM)', lat: 12.0255, lng: 79.8540 },
      { id: 'dp-3', name: 'Ramanujan Math & Computer Science Block', lat: 12.0265, lng: 79.8560 },
      { id: 'dp-4', name: 'School of Humanities & Social Sciences', lat: 12.0248, lng: 79.8535 },
      { id: 'dp-5', name: 'School of Life Sciences & Biotech', lat: 12.0258, lng: 79.8565 },
      { id: 'dp-6', name: 'School of Engineering & Technology', lat: 12.0270, lng: 79.8570 },
      { id: 'dp-7', name: 'School of Media & Communication', lat: 12.0250, lng: 79.8545 }
    ]
  },
  {
    key: 'GATE_HUB',
    label: 'Gates & Campus Hubs',
    stops: [
      { id: 'gt-1', name: 'PU Main Gate (Gate 1)', lat: 12.0228681, lng: 79.8509415 },
      { id: 'gt-2', name: 'Gate 2 (East Coast Road)', lat: 12.0295, lng: 79.8580 },
      { id: 'gt-3', name: 'Central Library', lat: 12.0245, lng: 79.8532 },
      { id: 'gt-4', name: 'University Canteen & Food Court', lat: 12.0238, lng: 79.8541 },
      { id: 'gt-5', name: 'Admin Block & Exam Wing', lat: 12.0252, lng: 79.8515 },
      { id: 'gt-6', name: 'Shopping Complex / Co-op Stores', lat: 12.0240, lng: 79.8538 },
      { id: 'gt-7', name: 'Rajiv Gandhi Sports Stadium', lat: 12.0290, lng: 79.8555 }
    ]
  }
];

const CAMPUS_HOTSPOTS = DEFAULT_GROUPED_CAMPUS_STOPS.flatMap(g => g.stops);

const POPULAR_OUTSIDE_SPOTS = [
  { name: 'White Town / Rock Beach', lat: 11.9338, lng: 79.8359 },
  { name: 'Pondicherry New Bus Stand', lat: 11.9350, lng: 79.8150 },
  { name: 'Pondicherry Railway Station', lat: 11.9280, lng: 79.8290 },
  { name: 'JIPMER Hospital & Campus', lat: 11.9560, lng: 79.7990 },
  { name: 'Auroville Visitor Centre', lat: 12.0070, lng: 79.8110 },
  { name: 'Puducherry Airport (Lawspet)', lat: 11.9680, lng: 79.8120 },
  { name: 'Sri Aurobindo Ashram', lat: 11.9360, lng: 79.8340 },
  { name: 'Mahatma Gandhi Statue (Beach)', lat: 11.9310, lng: 79.8365 },
  { name: 'ECR Toll Plaza (Kalapet)', lat: 12.0360, lng: 79.8620 }
];

const getCustomerTabFromPath = (path) => {
  const clean = (path || window.location.pathname || '').toLowerCase().replace(/\/+$/, '');
  if (clean.endsWith('/outside')) return 'outside';
  if (clean.endsWith('/prebook') || clean.endsWith('/scheduled') || clean.endsWith('/advance')) return 'scheduled';
  if (clean.endsWith('/rides') || clean.endsWith('/history')) return 'history';
  if (clean.endsWith('/profile')) return 'profile';
  return 'book';
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

export function CustomerPortalView() {
  const { user, token, logout, updateProfile, changePassword } = useAuth();
  const [currentTab, setCurrentTab] = useState(() => getCustomerTabFromPath(window.location.pathname));

  useEffect(() => {
    const handleLocationChange = () => {
      if (!window.location.pathname.startsWith('/admin')) {
        setCurrentTab(getCustomerTabFromPath(window.location.pathname));
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    if (!window.location.pathname.startsWith('/admin')) {
      const tab = getCustomerTabFromPath(window.location.pathname);
      setCurrentTab(tab);
      const pathMap = {
        book: '/passenger/book',
        outside: '/passenger/outside',
        scheduled: '/passenger/prebook',
        history: '/passenger/rides',
        profile: '/passenger/profile'
      };
      const cleanPath = window.location.pathname.replace(/\/+$/, '');
      if (cleanPath === '/passenger' || cleanPath === '/customer' || cleanPath === '' || cleanPath === '/') {
        window.history.replaceState({}, '', pathMap[tab]);
      }
    }
  }, []);

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
    if (!window.location.pathname.startsWith('/admin')) {
      const pathMap = {
        book: '/passenger/book',
        outside: '/passenger/outside',
        scheduled: '/passenger/prebook',
        history: '/passenger/rides',
        profile: '/passenger/profile'
      };
      const targetPath = pathMap[tabId] || '/passenger/book';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    }
  };

  const [activePinMode, setActivePinMode] = useState('pickup');
  const activePinModeRef = useRef('pickup');
  useEffect(() => {
    activePinModeRef.current = activePinMode;
  }, [activePinMode]);

  const [pickupAddress, setPickupAddress] = useState('PU Main Gate (Gate 1)');
  const [pickupDetail, setPickupDetail] = useState('');
  const [pickupCoords, setPickupCoords] = useState({ lat: 12.0228681, lng: 79.8509415 });

  const [showViaStop, setShowViaStop] = useState(false);
  const [viaAddress, setViaAddress] = useState('');
  const [viaDetail, setViaDetail] = useState('');
  const [viaCoords, setViaCoords] = useState(null);

  const [destAddress, setDestAddress] = useState('Madame Curie Girls Hostel');
  const [destDetail, setDestDetail] = useState('');
  const [destCoords, setDestCoords] = useState({ lat: 12.0215, lng: 79.8565 });
  const [vehicleType, setVehicleType] = useState('ANY');
  const [femaleRiderOnly, setFemaleRiderOnly] = useState(false);
  const [isDoubleRide, setIsDoubleRide] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const [bookingMode, setBookingMode] = useState('NOW');
  const [schedDateOption, setSchedDateOption] = useState('TODAY');

  const [rideNowTimeOption, setRideNowTimeOption] = useState('NOW');
  const [rideNowCustomHour, setRideNowCustomHour] = useState(() => {
    const d = new Date(Date.now() + 10 * 60 * 1000);
    let h = d.getHours() % 12;
    if (h === 0) h = 12;
    return String(h).padStart(2, '0');
  });
  const [rideNowCustomMinute, setRideNowCustomMinute] = useState(() => {
    const d = new Date(Date.now() + 10 * 60 * 1000);
    const m = Math.ceil(d.getMinutes() / 5) * 5 % 60;
    return String(m).padStart(2, '0');
  });
  const [rideNowCustomAmPm, setRideNowCustomAmPm] = useState(() => {
    const d = new Date(Date.now() + 10 * 60 * 1000);
    return d.getHours() >= 12 ? 'PM' : 'AM';
  });

  const getLocalDateString = (dateObj = new Date()) => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(dateObj);
    } catch (_) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  };

  const getTodayDateStr = () => getLocalDateString(new Date());
  const getTomorrowDateStr = () => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return getLocalDateString(d);
  };

  const [scheduledDate, setScheduledDate] = useState(() => {
    const now = new Date(Date.now() + 60 * 60 * 1000);
    return getLocalDateString(now);
  });
  const [scheduledHour, setScheduledHour] = useState(() => {
    const now = new Date(Date.now() + 60 * 60 * 1000);
    let h = now.getHours() % 12;
    if (h === 0) h = 12;
    return String(h).padStart(2, '0');
  });
  const [scheduledMinute, setScheduledMinute] = useState(() => {
    const now = new Date(Date.now() + 60 * 60 * 1000);
    const m = Math.floor(now.getMinutes() / 5) * 5;
    return String(m).padStart(2, '0');
  });
  const [scheduledAmPm, setScheduledAmPm] = useState(() => {
    const now = new Date(Date.now() + 60 * 60 * 1000);
    return now.getHours() >= 12 ? 'PM' : 'AM';
  });
  const [scheduledRides, setScheduledRides] = useState([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [scheduledSuccessMsg, setScheduledSuccessMsg] = useState(null);

  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [reschedDateOption, setReschedDateOption] = useState('TODAY');
  const [reschedDate, setReschedDate] = useState(() => getLocalDateString(new Date()));
  const [reschedHour, setReschedHour] = useState('09');
  const [reschedMinute, setReschedMinute] = useState('00');
  const [reschedAmPm, setReschedAmPm] = useState('AM');
  const [reschedulingLoading, setReschedulingLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState(null);

  const getComputedRideNowScheduledTime = () => {
    if (rideNowTimeOption === 'NOW') return null;
    const now = new Date();
    if (rideNowTimeOption === '5MIN') {
      const d = new Date(now.getTime() + 5 * 60 * 1000);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
    }
    if (rideNowTimeOption === '10MIN') {
      const d = new Date(now.getTime() + 10 * 60 * 1000);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
    }
    if (rideNowTimeOption === '15MIN') {
      const d = new Date(now.getTime() + 15 * 60 * 1000);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
    }
    if (rideNowTimeOption === 'CUSTOM') {
      let h = parseInt(rideNowCustomHour, 10) || 12;
      if (rideNowCustomAmPm === 'PM' && h < 12) h += 12;
      if (rideNowCustomAmPm === 'AM' && h === 12) h = 0;
      const today = getTodayDateStr();
      return `${today} ${String(h).padStart(2, '0')}:${String(rideNowCustomMinute).padStart(2, '0')}:00`;
    }
    return null;
  };

  const getRideNowDisplayTime = () => {
    if (rideNowTimeOption === 'NOW') return 'Immediate (Leave Now)';
    if (rideNowTimeOption === '5MIN') return 'In ~5 minutes';
    if (rideNowTimeOption === '10MIN') return 'In ~10 minutes';
    if (rideNowTimeOption === '15MIN') return 'In ~15 minutes';
    if (rideNowTimeOption === 'CUSTOM') return `Today at ${rideNowCustomHour}:${rideNowCustomMinute} ${rideNowCustomAmPm}`;
    return 'Immediate';
  };

  const getComputedScheduled24Time = () => {
    let h = parseInt(scheduledHour, 10) || 12;
    if (scheduledAmPm === 'PM' && h < 12) h += 12;
    if (scheduledAmPm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(scheduledMinute).padStart(2, '0')}`;
  };

  const getComputedResched24Time = () => {
    let h = parseInt(reschedHour, 10) || 12;
    if (reschedAmPm === 'PM' && h < 12) h += 12;
    if (reschedAmPm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(reschedMinute).padStart(2, '0')}`;
  };

  const openRescheduleModal = (ride) => {
    setRescheduleTarget(ride);
    setRescheduleError(null);
    try {
      if (ride.scheduled_time) {
        const str = String(ride.scheduled_time).trim();
        const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
        if (!isNaN(d.getTime())) {
          const dateStr = getLocalDateString(d);
          const todayStr = getTodayDateStr();
          const tomorrowStr = getTomorrowDateStr();
          if (dateStr === todayStr) {
            setReschedDateOption('TODAY');
          } else if (dateStr === tomorrowStr) {
            setReschedDateOption('TOMORROW');
          } else {
            setReschedDateOption('CUSTOM');
          }
          setReschedDate(dateStr);

          let h = d.getHours() % 12;
          if (h === 0) h = 12;
          setReschedHour(String(h).padStart(2, '0'));
          setReschedMinute(String(Math.floor(d.getMinutes() / 5) * 5).padStart(2, '0'));
          setReschedAmPm(d.getHours() >= 12 ? 'PM' : 'AM');
          return;
        }
      }
    } catch (_) {}
    setReschedDateOption('TODAY');
    setReschedDate(getTodayDateStr());
    setReschedHour('09');
    setReschedMinute('00');
    setReschedAmPm('AM');
  };

  const handleRescheduleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!rescheduleTarget) return;

    const time24 = getComputedResched24Time();
    if (!reschedDate || !time24) {
      setRescheduleError('Please choose a valid date and time.');
      return;
    }

    const chosenDateTime = new Date(`${reschedDate}T${time24}:00`);
    const minDateTime = new Date(Date.now() + 5 * 60 * 1000);
    if (isNaN(chosenDateTime.getTime()) || chosenDateTime <= minDateTime) {
      setRescheduleError('Scheduled pickup time must be in the future (at least 5 minutes ahead).');
      return;
    }

    setReschedulingLoading(true);
    setRescheduleError(null);
    try {
      const finalDateTime = `${reschedDate} ${time24}:00`;
      await apiRequest(`/customer/rides/${rescheduleTarget.id}/reschedule`, 'POST', { scheduledTime: finalDateTime }, token);
      setScheduledSuccessMsg(`Schedule updated to ${formatRideDateTime(finalDateTime)}!`);
      setRescheduleTarget(null);
      fetchScheduledRides(false);
      setTimeout(() => setScheduledSuccessMsg(null), 4000);
    } catch (err) {
      setRescheduleError(err.message || 'Failed to reschedule ride.');
    } finally {
      setReschedulingLoading(false);
    }
  };

  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [preferenceModalData, setPreferenceModalData] = useState(null);

  const [flashFreeRide, setFlashFreeRide] = useState(null);
  const [claimingFlash, setClaimingFlash] = useState(false);
  const [flashClaimMsg, setFlashClaimMsg] = useState(null);

  const [showTripQr, setShowTripQr] = useState(false);

  const getLocationHint = (stopName) => {
    if (!stopName) return null;
    const s = stopName.toLowerCase();
    if (s.includes('sjc') || s.includes('silver') || s.includes('jubilee')) {
      return {
        label: 'Specific location in SJC (e.g. SOM Building, Kalidas Hostel, Mess)',
        placeholder: 'e.g. SOM Block, Kalidas Hostel Room 12'
      };
    }
    if (s.includes('girl')) {
      return {
        label: 'Specific Girls Hostel (e.g. Madame Curie, Mother Teresa, Ganga, Yamuna)',
        placeholder: 'e.g. Madame Curie Girls Hostel'
      };
    }
    if (s.includes('boy')) {
      return {
        label: 'Specific Boys Hostel (e.g. Bharathidasan, Kabilar, Subramania, Kalidas)',
        placeholder: 'e.g. Bharathidasan Boys Hostel'
      };
    }
    if (s.includes('science') || s.includes('department') || s.includes('block') || s.includes('dept')) {
      return {
        label: 'Specific Department / Block (e.g. Physics, Math, Biotech, SOM)',
        placeholder: 'e.g. Science Complex / Physics Dept'
      };
    }
    return {
      label: `Specific spot / Gate entry for ${stopName} (Optional)`,
      placeholder: 'e.g. Near main security cabin / bus shelter'
    };
  };

  const [fareEstimate, setFareEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [adminRoutes, setAdminRoutes] = useState([]);
  const [adminStops, setAdminStops] = useState([]);
  const [groupedCampusStops, setGroupedCampusStops] = useState(DEFAULT_GROUPED_CAMPUS_STOPS);

  const findStopCoords = (stopName) => {
    if (!stopName) return null;
    const nameLower = stopName.trim().toLowerCase();
    for (const grp of groupedCampusStops || []) {
      for (const stop of grp.stops || []) {
        if (stop.name && (stop.name.toLowerCase() === nameLower || stop.name.toLowerCase().includes(nameLower) || nameLower.includes(stop.name.toLowerCase()))) {
          if (stop.lat && stop.lng) return { lat: parseFloat(stop.lat || stop.latitude), lng: parseFloat(stop.lng || stop.longitude) };
          if (stop.latitude && stop.longitude) return { lat: parseFloat(stop.latitude), lng: parseFloat(stop.longitude) };
        }
      }
    }
    const hotspot = CAMPUS_HOTSPOTS.find(h => h.name.toLowerCase() === nameLower || h.name.toLowerCase().includes(nameLower));
    if (hotspot) return { lat: hotspot.lat, lng: hotspot.lng };
    return { lat: 12.0240, lng: 79.8530 };
  };

  const loadAdminRoutes = async () => {
    try {
      const res = await apiRequest('/fares/routes', 'GET', null, token);
      if (res && res.data && Array.isArray(res.data)) {
        const active = res.data.filter(r => r.is_active);
        setAdminRoutes(active);

        const stops = Array.from(
          new Set(
            active
              .flatMap(r => [r.pickup_stop, r.destination_stop])
              .map(s => (s || '').trim())
              .filter(Boolean)
          )
        );
        setAdminStops(stops);

        if (stops.length > 0) {
          setPickupAddress(prev => (stops.includes(prev) ? prev : stops[0]));
          setDestAddress(prev => (stops.includes(prev) ? prev : (stops[1] || stops[0])));
        }
      }
    } catch (err) {
      console.warn('Failed to load admin routes:', err);
    }
  };

  useEffect(() => {
    loadAdminRoutes();
    const interval = setInterval(loadAdminRoutes, 30000);
    return () => clearInterval(interval);
  }, [token, currentTab]);

  const [activeRide, setActiveRide] = useState(null);
  const [rideLoading, setRideLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [mapAreaMode, setMapAreaMode] = useState('CAMPUS_MODE');

  const [pendingPenalty, setPendingPenalty] = useState(null);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [settlingPenalty, setSettlingPenalty] = useState(false);
  const [showCancelWarningModal, setShowCancelWarningModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [penaltyUtr, setPenaltyUtr] = useState('');
  const [penaltyPayMode, setPenaltyPayMode] = useState('QR');

  const [ratingVal, setRatingVal] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  const [outsidePickup, setOutsidePickup] = useState(CAMPUS_HOTSPOTS[0].name);
  const [outsidePickupCoords, setOutsidePickupCoords] = useState({ lat: CAMPUS_HOTSPOTS[0].lat, lng: CAMPUS_HOTSPOTS[0].lng });
  const [outsideDest, setOutsideDest] = useState(POPULAR_OUTSIDE_SPOTS[0].name);
  const [outsideDestCoords, setOutsideDestCoords] = useState({ lat: POPULAR_OUTSIDE_SPOTS[0].lat, lng: POPULAR_OUTSIDE_SPOTS[0].lng });
  const [outsideVehicleType, setOutsideVehicleType] = useState('ANY');
  const [outsideDoubleRide, setOutsideDoubleRide] = useState(false);
  const [outsideTripsList, setOutsideTripsList] = useState([]);
  const [submittingOutside, setSubmittingOutside] = useState(false);

  const [resolvingPickup, setResolvingPickup] = useState(false);
  const [resolvingDest, setResolvingDest] = useState(false);
  const [resolvedPickupBadge, setResolvedPickupBadge] = useState('');
  const [resolvedDestBadge, setResolvedDestBadge] = useState('');

  const handleResolveMapInput = async (rawValue, fieldType) => {
    if (!rawValue) return;
    const trimmed = rawValue.trim();
    const isUrl = trimmed.includes('http://') || trimmed.includes('https://') || trimmed.includes('maps.app.goo.gl') || trimmed.includes('google.com/maps') || trimmed.includes('goo.gl/maps') || /^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(trimmed);
    if (!isUrl) return;

    if (fieldType === 'pickup') {
      setResolvingPickup(true);
      setResolvedPickupBadge('');
    } else {
      setResolvingDest(true);
      setResolvedDestBadge('');
    }

    try {
      const res = await apiRequest('/fares/resolve-link', 'POST', { url: trimmed });
      if (res.data && res.data.name) {
        const placeName = res.data.name;
        const coords = { lat: parseFloat(res.data.latitude) || 11.9350, lng: parseFloat(res.data.longitude) || 79.8300 };

        if (fieldType === 'pickup') {
          setOutsidePickup(placeName);
          setOutsidePickupCoords(coords);
          setResolvedPickupBadge(placeName);
        } else {
          setOutsideDest(placeName);
          setOutsideDestCoords(coords);
          setResolvedDestBadge(placeName);
        }
      }
    } catch (err) {
      console.warn('Map link resolution failed:', err);
    } finally {
      if (fieldType === 'pickup') {
        setResolvingPickup(false);
      } else {
        setResolvingDest(false);
      }
    }
  };

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState('dest');
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [pickerSearchResults, setPickerSearchResults] = useState([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [selectedPickerLocation, setSelectedPickerLocation] = useState({
    name: POPULAR_OUTSIDE_SPOTS[0].name,
    address: POPULAR_OUTSIDE_SPOTS[0].name,
    lat: POPULAR_OUTSIDE_SPOTS[0].lat,
    lng: POPULAR_OUTSIDE_SPOTS[0].lng
  });
  const [reverseGeocodingPicker, setReverseGeocodingPicker] = useState(false);

  const openMapPicker = (target) => {
    setMapPickerTarget(target);
    setPickerSearchQuery('');
    setPickerSearchResults([]);

    const initial = target === 'pickup'
      ? { name: outsidePickup, address: outsidePickup, lat: outsidePickupCoords.lat || 12.0240, lng: outsidePickupCoords.lng || 79.8530 }
      : { name: outsideDest, address: outsideDest, lat: outsideDestCoords.lat || 11.9338, lng: outsideDestCoords.lng || 79.8359 };

    setSelectedPickerLocation(initial);
    setShowMapPicker(true);
  };

  const updatePickerPin = async (lat, lng, knownName = null, knownAddress = null) => {
    if (!lat || !lng) return;

    if (knownName) {
      setSelectedPickerLocation({
        name: knownName,
        address: knownAddress || knownName,
        lat,
        lng
      });
      return;
    }

    setReverseGeocodingPicker(true);
    try {
      const res = await apiRequest(`/fares/reverse?lat=${lat}&lng=${lng}`);
      if (res.data && res.data.name) {
        setSelectedPickerLocation({
          name: res.data.name,
          address: res.data.address || res.data.name,
          lat,
          lng
        });
      }
    } catch (_) {
      setSelectedPickerLocation({
        name: `Location (${Number(lat || 0).toFixed(4)}, ${Number(lng || 0).toFixed(4)})`,
        address: `Selected Pin (${Number(lat || 0).toFixed(4)}, ${Number(lng || 0).toFixed(4)})`,
        lat,
        lng
      });
    } finally {
      setReverseGeocodingPicker(false);
    }
  };

  useEffect(() => {
    if (!pickerSearchQuery.trim() || pickerSearchQuery.trim().length < 2) {
      setPickerSearchResults([]);
      setSearchingPlaces(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingPlaces(true);
      try {
        const res = await apiRequest(`/fares/places?q=${encodeURIComponent(pickerSearchQuery.trim())}&lat=12.0240&lng=79.8530`);
        setPickerSearchResults(res.data || []);
      } catch (err) {
        console.warn('Place search notice:', err);
      } finally {
        setSearchingPlaces(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [pickerSearchQuery]);

  const handleConfirmPickerLocation = () => {
    if (mapPickerTarget === 'pickup') {
      setOutsidePickup(selectedPickerLocation.name);
      setOutsidePickupCoords({ lat: selectedPickerLocation.lat, lng: selectedPickerLocation.lng });
      setResolvedPickupBadge(selectedPickerLocation.name);
    } else {
      setOutsideDest(selectedPickerLocation.name);
      setOutsideDestCoords({ lat: selectedPickerLocation.lat, lng: selectedPickerLocation.lng });
      setResolvedDestBadge(selectedPickerLocation.name);
    }

    setShowMapPicker(false);
  };

  const [pastRides, setPastRides] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileGender, setProfileGender] = useState(user?.gender || 'MALE');
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState(null);
  const [passSuccess, setPassSuccess] = useState(null);
  const [passUpdating, setPassUpdating] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    async function calculateFare() {
      if (!pickupCoords || !destCoords) return;
      setEstimating(true);
      try {
        const res = await apiRequest('/fares/estimate', 'POST', {
          pickupLatitude: pickupCoords.lat,
          pickupLongitude: pickupCoords.lng,
          destinationLatitude: destCoords.lat,
          destinationLongitude: destCoords.lng,
          pickupAddress,
          destinationAddress: destAddress,
          vehicleType,
          isDoubleRide
        }, token);
        setFareEstimate(res.data);
      } catch (err) {
        console.warn('Fare estimate error:', err);
      } finally {
        setEstimating(false);
      }
    }
    calculateFare();
  }, [pickupCoords, destCoords, pickupAddress, destAddress, vehicleType, isDoubleRide]);

  const fetchActiveRide = async (isBackground = true) => {
    if (!token) return;
    try {
      if (!isBackground) setRideLoading(true);
      const res = await apiRequest('/customer/rides/active', 'GET', null, token);
      const ride = res.data || null;
      if (ride) {
        if (ride.status === 'COMPLETED' && sessionStorage.getItem(`skipped_feedback_${ride.id}`)) {
          setActiveRide(null);
          return;
        }
        setActiveRide(ride);
        if (ride.rider_current_lat && ride.rider_current_lng) {
          setDriverLocation(prev => ({
            ...(prev || {}),
            latitude: Number(ride.rider_current_lat),
            longitude: Number(ride.rider_current_lng),
            lat: Number(ride.rider_current_lat),
            lng: Number(ride.rider_current_lng),
            heading: prev?.heading || 0,
            speed: prev?.speed || 0,
            recordedAt: prev?.recordedAt || Date.now(),
            staleStatus: prev?.staleStatus || 'LIVE'
          }));
        }
        if (ride.status === 'PENDING_ADMIN_QUOTE') {
          setStatusMessage('Submitted to Dispatch — Admin is setting the fare & assigning a rider.');
        } else if (ride.status === 'REQUESTED') {
          setStatusMessage('Searching for nearby campus riders...');
        } else if (ride.status === 'ACCEPTED') {
          setStatusMessage('A campus rider has accepted your trip!');
        } else if (ride.status === 'RIDER_ARRIVING') {
          setStatusMessage('Rider is on the way to your pickup location.');
        } else if (ride.status === 'RIDER_REACHED') {
          setStatusMessage('Rider has arrived! Share your 4-digit Ride OTP to start.');
        } else if (ride.status === 'STARTED') {
          setStatusMessage('Trip started! On the way to destination.');
        } else if (ride.status === 'COMPLETED') {
          setStatusMessage('Thank you for riding with Papido! Trip completed successfully.');
        }
      } else {
        setActiveRide(prev => {
          if (prev && prev.status === 'COMPLETED') return prev;
          return null;
        });
      }
    } catch (err) {
      console.warn('Failed to fetch active ride:', err);
    } finally {
      if (!isBackground) setRideLoading(false);
    }
  };

  const fetchFlashFreeRide = async () => {
    if (!token) return;
    try {
      const res = await apiRequest('/customer/flash-free-ride/active', 'GET', null, token);
      setFlashFreeRide(res.data || null);
    } catch (_) {}
  };

  const handleClaimFlashFreeRide = async () => {
    if (!flashFreeRide || claimingFlash) return;
    try {
      setClaimingFlash(true);
      setFlashClaimMsg(null);
      const res = await apiRequest('/customer/flash-free-ride/claim', 'POST', { flashId: flashFreeRide.id }, token);
      setFlashFreeRide(null);
      if (res.data) {
        setActiveRide(res.data);
        setStatusMessage('Congratulations! You claimed the Flash Free Ride! Searching for an official Core Rider...');
      }
    } catch (err) {
      setFlashClaimMsg(err.message || 'Sorry, this free ride was just claimed by another student!');
      fetchFlashFreeRide();
    } finally {
      setClaimingFlash(false);
    }
  };

  const fetchScheduledRides = async (isBackground = false) => {
    if (!token) return;
    try {
      if (!isBackground) setScheduledLoading(true);
      const res = await apiRequest('/customer/rides/scheduled', 'GET', null, token);
      if (res && res.data) {
        setScheduledRides(res.data || []);
      }
    } catch (_) {
    } finally {
      if (!isBackground) setScheduledLoading(false);
    }
  };

  const handleCancelScheduledRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to cancel this pre-booked ride? Zero cancellation fee applies.')) return;
    try {
      await apiRequest(`/customer/rides/${rideId}/cancel-scheduled`, 'POST', {}, token);
      fetchScheduledRides(true);
      setStatusMessage('Pre-booked ride cancelled successfully with zero charge.');
    } catch (err) {
      alert(err.message || 'Failed to cancel pre-booked ride.');
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchActiveRide(false);
    fetchFlashFreeRide();
    fetchScheduledRides(false);
    const pollInterval = setInterval(() => {
      fetchActiveRide(true);
      fetchFlashFreeRide();
      fetchScheduledRides(true);
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Customer Socket connected:', socket.id);
      socket.emit('identify', { id: user?.id, role: 'CUSTOMER', name: user?.name });
      fetchActiveRide(true);
      fetchFlashFreeRide();
    });

    socket.on('flash_free_ride:new', (data) => {
      setFlashFreeRide(data);
    });

    socket.on('flash_free_ride:claimed', () => {
      setFlashFreeRide(null);
    });

    socket.on('flash_free_ride:cancelled', () => {
      setFlashFreeRide(null);
    });

    socket.on('ride:status_change', (data) => {
      console.log('Realtime ride status change:', data);
      const rideObj = data?.ride || data;
      const newStatus = data.status || rideObj?.status;
      if (rideObj || newStatus) {
        const fare = rideObj?.total_fare || rideObj?.estimated_fare || rideObj?.final_fare || 20;
        setActiveRide(prev => ({
          ...(prev || {}),
          ...(rideObj || {}),
          status: newStatus || prev?.status,
          total_fare: fare,
          estimated_fare: fare,
          final_fare: fare
        }));
      }

      if (newStatus === 'ACCEPTED') {
        setStatusMessage('A campus rider has accepted your trip!');
      } else if (newStatus === 'RIDER_ARRIVING') {
        setStatusMessage('Rider is on the way to your pickup location.');
      } else if (newStatus === 'RIDER_REACHED') {
        setStatusMessage('Rider has arrived! Share your 4-digit Ride OTP to start.');
      } else if (newStatus === 'STARTED') {
        setStatusMessage('Trip started! On the way to destination.');
      } else if (newStatus === 'COMPLETED') {
        setStatusMessage('Thank you for riding with Papido! Trip completed successfully.');
      }

      fetchActiveRide(true);
    });

    socket.on('ride:completed', (data) => {
      console.log('Realtime ride completed event received:', data);
      const rideObj = data?.ride || data;
      const fare = rideObj?.total_fare || rideObj?.estimated_fare || rideObj?.final_fare || 20;
      setActiveRide(prev => ({
        ...(prev || {}),
        ...(rideObj || {}),
        status: 'COMPLETED',
        total_fare: fare,
        estimated_fare: fare,
        final_fare: fare
      }));
      setStatusMessage('Thank you for riding with Papido! Trip completed successfully.');
      fetchActiveRide(true);
    });

    socket.on('ride:accepted', (data) => {
      console.log('Realtime ride accepted:', data);
      const rideObj = data?.ride || data;
      if (rideObj) {
        const fare = rideObj.total_fare || rideObj.estimated_fare || rideObj.final_fare || 20;
        setActiveRide(prev => ({
          ...(prev || {}),
          ...rideObj,
          status: 'ACCEPTED',
          total_fare: fare,
          estimated_fare: fare
        }));
      }
      fetchActiveRide();
      const schedTime = rideObj?.scheduled_time || rideObj?.scheduled_time_ist;
      if (schedTime) {
        setStatusMessage(`Great news! A campus rider has accepted and confirmed your ride for ${formatRideDateTime(schedTime)}.`);
      } else {
        setStatusMessage('A campus rider has accepted your trip!');
      }
    });

    socket.on('ride:reopened', () => {
      setStatusMessage('Previous rider had to cancel. Re-matching with another rider...');
      fetchActiveRide();
    });

    socket.on('ride:scheduled_confirmed', (data) => {
      fetchScheduledRides();
      setStatusMessage(`Great news! Rider ${data?.rider?.name || 'assigned'} has confirmed your pre-booked ride for ${data?.scheduledTime || 'your trip'}.`);
    });

    socket.on('ride:scheduled_reopened', () => {
      fetchScheduledRides();
      setStatusMessage('Assigned rider changed for your scheduled trip. Searching for a replacement rider.');
    });

    socket.on('ride:waiting_update', (data) => {
      console.log('Realtime ride waiting update:', data);
      setActiveRide(prev => {
        if (!prev) return prev;
        const waitingFare = parseFloat(data.waitingFare || data.waiting_fare || 0);
        const baseFare = parseFloat(prev.estimated_fare || prev.total_fare || 20);
        const totalFare = baseFare + waitingFare;
        return {
          ...prev,
          is_waiting: Boolean(data.isWaiting || data.is_waiting),
          waiting_minutes: parseInt(data.waitingMinutes || data.waiting_minutes || 0, 10),
          waiting_fare: waitingFare,
          total_fare: totalFare,
          final_fare: totalFare
        };
      });
      if (data.isWaiting || data.is_waiting) {
        setStatusMessage(`Rider is currently On Waiting (+₹${data.waitingFare || data.waiting_fare || 0} waiting fee)`);
      }
    });

    const handleDriverLocationUpdate = (loc) => {
      if (!loc) return;
      const lat = loc.latitude !== undefined ? Number(loc.latitude) : (loc.lat !== undefined ? Number(loc.lat) : null);
      const lng = loc.longitude !== undefined ? Number(loc.longitude) : (loc.lng !== undefined ? Number(loc.lng) : null);
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        setDriverLocation({
          latitude: lat,
          longitude: lng,
          lat,
          lng,
          heading: Number(loc.heading || 0),
          speed: Number(loc.speed || 0),
          accuracy: loc.accuracy,
          recordedAt: loc.recordedAt || loc.timestamp || Date.now(),
          staleStatus: loc.staleStatus || 'LIVE'
        });
      }
    };

    socket.on('rider:location_update', handleDriverLocationUpdate);
    socket.on('ride:location_track', handleDriverLocationUpdate);

    socket.on('penalty:status_update', (data) => {
      console.log('Realtime penalty status update:', data);
      const isForMe = !data?.customerId || String(data.customerId) === String(user?.id) || (pendingPenalty && String(pendingPenalty.id) === String(data.penaltyId || data.id));
      if (!isForMe) return;

      if (data.status === 'PAID') {
        setPendingPenalty(null);
        setShowPenaltyModal(false);
        setStatusMessage('Rider confirmed receipt of ₹15! Booking unlocked.');
        fetchActiveRide(true);
        fetchPendingPenalty();
      } else if (data.status === 'UNPAID') {
        setPendingPenalty(prev => prev ? { ...prev, status: 'UNPAID' } : null);
        alert('Rider indicated ₹15 was not received. Please scan the QR code or verify your UPI payment.');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user?.id]);

  useEffect(() => {
    if (socketRef.current && activeRide?.id) {
      socketRef.current.emit('join_ride', activeRide.id);
      return () => {
        socketRef.current?.emit('leave_ride', activeRide.id);
      };
    }
  }, [activeRide?.id]);

  const fetchPendingPenalty = async () => {
    if (!token) return;
    try {
      const res = await apiRequest('/customer/pending-penalty', 'GET', null, token);
      if (res && res.data) {
        setPendingPenalty(res.data);
      } else {
        setPendingPenalty(prev => {
          if (prev && prev.status === 'PENDING_DRIVER_CONFIRMATION') {
            setShowPenaltyModal(false);
            setStatusMessage('Driver confirmed receipt of ₹15! Booking unlocked.');
          }
          return null;
        });
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchPendingPenalty();
  }, [token, currentTab]);

  useEffect(() => {
    if (!token || !pendingPenalty) return;
    if (pendingPenalty.status === 'PENDING_DRIVER_CONFIRMATION') {
      const interval = setInterval(() => {
        fetchPendingPenalty();
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [token, pendingPenalty?.status]);

  const executeRequestRide = async (overrides = {}) => {
    const finalVehicleType = overrides.vehicleType !== undefined ? overrides.vehicleType : vehicleType;
    const finalFemaleOnly = overrides.femaleRiderOnly !== undefined ? overrides.femaleRiderOnly : femaleRiderOnly;
    const isSched = overrides.isScheduled !== undefined ? overrides.isScheduled : (bookingMode === 'SCHEDULE');
    const schedDate = overrides.scheduledDate !== undefined ? overrides.scheduledDate : scheduledDate;
    const time24 = getComputedScheduled24Time();
    const schedDateTime = overrides.scheduledDateTime !== undefined ? overrides.scheduledDateTime : `${schedDate} ${time24}:00`;
    const formattedDisplayTime = `${schedDate} at ${scheduledHour}:${scheduledMinute} ${scheduledAmPm}`;

    setBookingLoading(true);
    const isFemaleCustomer = (user?.gender || '').toUpperCase() === 'FEMALE';
    const finalPickup = pickupDetail.trim()
      ? `${pickupAddress} (${pickupDetail.trim()})`
      : pickupAddress;
    const finalVia = showViaStop && viaAddress.trim()
      ? (viaDetail.trim() ? `${viaAddress} (${viaDetail.trim()})` : viaAddress)
      : null;
    const finalDest = destDetail.trim()
      ? `${destAddress} (${destDetail.trim()})`
      : destAddress;

    try {
      const payload = {
        pickupLatitude: pickupCoords.lat,
        pickupLongitude: pickupCoords.lng,
        pickupAddress: finalPickup,
        viaLatitude: showViaStop && viaCoords ? viaCoords.lat : null,
        viaLongitude: showViaStop && viaCoords ? viaCoords.lng : null,
        viaAddress: finalVia,
        destinationLatitude: destCoords.lat,
        destinationLongitude: destCoords.lng,
        destinationAddress: finalDest,
        vehicleType: finalVehicleType,
        femaleRiderOnly: isFemaleCustomer ? Boolean(finalFemaleOnly) : false,
        isDoubleRide,
        paymentMethod
      };

      if (isSched) {
        payload.isScheduled = true;
        payload.scheduledTime = schedDateTime;
      } else {
        const rideNowSched = overrides.scheduledTime !== undefined ? overrides.scheduledTime : getComputedRideNowScheduledTime();
        if (rideNowSched) {
          payload.scheduledTime = rideNowSched;
        }
      }

      const res = await apiRequest('/customer/rides', 'POST', payload, token);

      if (isSched) {
        setScheduledSuccessMsg(`Your ride has been pre-booked for ${formattedDisplayTime}! View details under the Pre-Booked Trips tab.`);
        setStatusMessage(`Ride pre-booked for ${formattedDisplayTime}.`);
        fetchScheduledRides();
        handleTabChange('scheduled');
      } else {
        setActiveRide(res.data);
        const schedTimeChosen = overrides.scheduledTime !== undefined ? overrides.scheduledTime : getComputedRideNowScheduledTime();
        setStatusMessage(schedTimeChosen ? `Ride requested (${getRideNowDisplayTime()}). Searching for available campus riders...` : 'Searching for available campus riders...');
      }
      setShowPreferenceModal(false);
    } catch (err) {
      if (err.hasPendingPenalty || err.penalty) {
        setPendingPenalty(err.penalty);
        setShowPenaltyModal(true);
      } else {
        alert(err.message || 'Failed to request ride.');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const handleRequestRide = async () => {
    if (pendingPenalty) {
      setShowPenaltyModal(true);
      return;
    }
    if (!pickupCoords || !destCoords) {
      alert('Please select valid pickup and destination locations.');
      return;
    }

    if (bookingMode === 'SCHEDULE') {
      const time24 = getComputedScheduled24Time();
      if (!scheduledDate || !time24) {
        alert('Please select a valid date and pickup time for pre-booking.');
        return;
      }
      const chosenDateTime = new Date(`${scheduledDate}T${time24}:00`);
      const minDateTime = new Date(Date.now() + 5 * 60 * 1000);
      if (isNaN(chosenDateTime.getTime()) || chosenDateTime <= minDateTime) {
        alert('Pre-booking pickup time must be in the future (at least 5-10 minutes ahead). For an immediate trip, please switch to the "Ride Now" option.');
        return;
      }
      executeRequestRide({ isScheduled: true, scheduledDateTime: `${scheduledDate} ${time24}:00` });
      return;
    }

    const isFemaleCustomer = (user?.gender || '').toUpperCase() === 'FEMALE';
    const isFemalePreference = isFemaleCustomer && Boolean(femaleRiderOnly);
    const isVehiclePreference = vehicleType && vehicleType !== 'ANY';

    if (isFemalePreference || isVehiclePreference) {
      try {
        setBookingLoading(true);
        const res = await apiRequest('/customer/rides/check-availability', 'POST', {
          vehicleType,
          femaleRiderOnly: isFemalePreference
        }, token);

        if (res?.data && res.data.isAvailable === false) {
          setPreferenceModalData({
            isFemalePreference,
            isVehiclePreference,
            vehicleType,
            unavailableReason: res.data.unavailableReason,
            unavailableMessage: res.data.unavailableMessage || 'The selected preferred rider is not available.',
            totalOnlineCount: res.data.totalOnlineCount || 0,
            hasOtherRidersOnline: res.data.hasOtherRidersOnline
          });
          setShowPreferenceModal(true);
          setBookingLoading(false);
          return;
        }
      } catch (checkErr) {
        console.warn('Availability check notice:', checkErr);
      } finally {
        setBookingLoading(false);
      }
    }

    executeRequestRide();
  };

  const handleCancelRide = () => {
    if (!activeRide) return;
    const isFreeRide = Boolean(activeRide.is_free_ride || activeRide.is_core_only || parseFloat(activeRide.total_fare || activeRide.estimated_fare || 0) === 0);
    if (activeRide.status === 'RIDER_REACHED' && !isFreeRide) {
      setShowCancelWarningModal(true);
    } else {
      if (window.confirm('Are you sure you want to cancel this ride request?')) {
        executeCancelRide('Cancelled by passenger');
      }
    }
  };

  const executeCancelRide = async (reasonText) => {
    if (!activeRide) return;
    const currentActiveRide = { ...activeRide };
    const isFreeRide = Boolean(currentActiveRide.is_free_ride || currentActiveRide.is_core_only || parseFloat(currentActiveRide.total_fare || currentActiveRide.estimated_fare || 0) === 0);
    const wasReached = currentActiveRide.status === 'RIDER_REACHED';
    setShowCancelWarningModal(false);

    try {
      const res = await apiRequest(`/customer/rides/${currentActiveRide.id}/cancel`, 'POST', {
        reason: reasonText
      }, token);

      setActiveRide(null);

      let penaltyData = res.data?.penalty;
      if (!isFreeRide && !penaltyData && wasReached) {
        try {
          const penRes = await apiRequest('/customer/pending-penalty', 'GET', null, token);
          if (penRes?.data && (!penRes.data.ride_id || String(penRes.data.ride_id) === String(currentActiveRide.id))) {
            penaltyData = penRes.data;
          }
        } catch (_) {}
      }

      if (!isFreeRide && (penaltyData || wasReached)) {
        const fallbackUpi = penaltyData?.rider_upi || penaltyData?.rider_upi_id || currentActiveRide.rider_upi_id || (currentActiveRide.rider_phone ? `${currentActiveRide.rider_phone}@upi` : 'driver@upi');
        const fallbackName = penaltyData?.rider_name || currentActiveRide.rider_name || 'Campus Driver';
        const fallbackObj = penaltyData || {
          id: penaltyData?.id || currentActiveRide.id,
          ride_id: currentActiveRide.id,
          ride_code: currentActiveRide.ride_code,
          amount: 15.00,
          rider_name: fallbackName,
          rider_upi: fallbackUpi,
          rider_phone: currentActiveRide.rider_phone || '',
          upiPayUrl: `upi://pay?pa=${encodeURIComponent(fallbackUpi)}&pn=${encodeURIComponent(fallbackName)}&am=15.00&tn=Papido_Rider_Compensation_${currentActiveRide.ride_code || 'Trip'}&cu=INR`
        };
        setPendingPenalty(fallbackObj);
        setShowPenaltyModal(true);
      } else {
        setStatusMessage(isFreeRide ? 'Free ride cancelled with zero charge.' : 'Ride cancelled.');
      }
    } catch (err) {
      alert(err.message || 'Failed to cancel ride.');
    }
  };

  const handleSettlePenalty = async () => {
    if (!pendingPenalty) return;
    setSettlingPenalty(true);
    try {
      const targetId = pendingPenalty.id || pendingPenalty.penalty_id || pendingPenalty.ride_id;
      const res = await apiRequest(`/customer/penalties/${targetId}/claim-paid`, 'POST', {
        paymentReference: `CLAIMED_VIA_APP_${Date.now()}`
      }, token);

      if (res.data?.status === 'SETTLED' || res.data?.status === 'PAID' || !res.data?.id) {
        setPendingPenalty(null);
        setShowPenaltyModal(false);
        setStatusMessage('No penalty due! Your account is clear to book rides.');
      } else {
        setPendingPenalty(prev => ({
          ...prev,
          ...(res.data || {}),
          rider_name: res.data?.rider_name || res.data?.rider_name_full || prev?.rider_name || 'Campus Driver',
          rider_upi: res.data?.rider_upi || res.data?.rider_upi_id || res.data?.profile_upi_id || prev?.rider_upi,
          status: 'PENDING_DRIVER_CONFIRMATION'
        }));
        setStatusMessage('Payment notification sent to rider. Waiting for rider confirmation...');
      }
    } catch (err) {
      alert(err.message || 'Failed to submit payment confirmation to rider.');
    } finally {
      setSettlingPenalty(false);
    }
  };

  const handleSkipRating = () => {
    if (activeRide?.id) {
      sessionStorage.setItem(`skipped_feedback_${activeRide.id}`, 'true');
    }
    setActiveRide(null);
    setRatingSubmitted(false);
    setRatingReview('');
  };

  const handleSubmitRating = async () => {
    if (!activeRide) return;
    setSubmittingRating(true);
    try {
      await apiRequest(`/customer/rides/${activeRide.id}/rating`, 'POST', {
        rating: ratingVal,
        review: ratingReview
      }, token);
      if (activeRide.id) {
        sessionStorage.setItem(`skipped_feedback_${activeRide.id}`, 'true');
      }
      setRatingSubmitted(true);
      fetchRideHistory();
      setTimeout(() => {
        setActiveRide(null);
        setRatingSubmitted(false);
        setRatingReview('');
      }, 2200);
    } catch (err) {
      alert(err.message || 'Failed to submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const fetchRideHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiRequest('/customer/rides/history', 'GET', null, token);
      const items = res.data?.items || res.data?.rides || (Array.isArray(res.data) ? res.data : []);
      setPastRides(items);
    } catch (err) {
      console.warn('Failed to load ride history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (currentTab === 'history') {
      fetchRideHistory();
    }
  }, [currentTab]);

  const handleSubmitOutsideTrip = async (e) => {
    e.preventDefault();
    if (!outsideDest.trim()) {
      alert('Please enter or select a destination on the map.');
      return;
    }

    setSubmittingOutside(true);
    try {
      const res = await apiRequest('/customer/outside-rides', 'POST', {
        pickupAddress: outsidePickup,
        pickupLatitude: outsidePickupCoords.lat,
        pickupLongitude: outsidePickupCoords.lng,
        destinationAddress: outsideDest,
        destinationLatitude: outsideDestCoords.lat,
        destinationLongitude: outsideDestCoords.lng,
        vehicleType: outsideVehicleType,
        isDoubleRide: false,
        isOutside: true
      }, token);
      setActiveRide(res.data);
      setCurrentTab('book');
      setStatusMessage('Outside campus request submitted to Admin Dispatch! Admin will set fare.');
    } catch (err) {
      alert(err.message || 'Failed to submit outside ride request.');
    } finally {
      setSubmittingOutside(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileUpdating(true);
    setProfileFeedback(null);
    try {
      await updateProfile({
        name: profileName,
        phone: profilePhone
      });
      setProfileFeedback({ type: 'success', msg: 'Profile details saved successfully!' });
    } catch (err) {
      setProfileFeedback({ type: 'error', msg: err.message || 'Failed to update profile.' });
    } finally {
      setProfileUpdating(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPass.length < 6) {
      setPassError('New password must be at least 6 characters long.');
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

  const customerNavItems = [
    { id: 'book', label: 'Book', icon: Bike, badge: activeRide ? 'dot' : null },
    { id: 'scheduled', label: 'Advance', icon: Calendar, badge: scheduledRides && scheduledRides.length > 0 ? scheduledRides.length : null },
    { id: 'outside', label: 'Outside', icon: Compass },
    { id: 'history', label: 'Rides', icon: History },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <div className="theme-orange-beige has-bottom-nav cp-page">
      {/* Top Passenger Web Navigation Header */}
      <header className="cp-header">
        <div className="cp-header-brand">
          <img
            src="/papidologo.jpeg"
            alt="Papido Logo"
            className="cp-header-logo"
          />
          <div>
            <div className="cp-header-name">
              PAPIDO <span className="cp-header-tag">PASSENGER WEB</span>
            </div>
            <div className="cp-header-sub">Pondicherry University Campus Mobility</div>
          </div>
        </div>

        {/* Navigation Tabs (desktop) */}
        <nav className="cp-nav-tabs nav-scrollable-tabs">
          {[
            { id: 'book', label: 'Book Ride', icon: Bike },
            { id: 'scheduled', label: 'Pre-Booked Trips', icon: Calendar, badge: scheduledRides && scheduledRides.length > 0 ? scheduledRides.length : null },
            { id: 'outside', label: 'Outside Trips', icon: Compass },
            { id: 'history', label: 'My Rides', icon: History },
            { id: 'profile', label: 'Profile & Security', icon: User }
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
                className={`cp-nav-tab ${isActive ? 'is-active' : ''}`}
              >
                <Icon size={16} /> {item.label}
                {item.badge ? <span className="cp-nav-badge">{item.badge}</span> : null}
              </a>
            );
          })}
        </nav>

        {/* User Chip & Logout */}
        <div className="cp-user-chip">
          <div className="cp-user-chip-text">
            <div className="cp-user-chip-name">{user?.name || 'Passenger'}</div>
            <div className="cp-user-chip-email">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="cp-logout-btn"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Status Message Banner */}
      {statusMessage && (
        <div className="cp-status-banner cp-slide-down">
          <div className="cp-status-banner-text">{statusMessage}</div>
          <button
            onClick={() => setStatusMessage(null)}
            className="cp-status-banner-close"
            aria-label="Dismiss status"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Body View Container */}
      <div className="cp-main">
        {/* ============================================================ */}
        {/* TAB 1: BOOK RIDE & LIVE TRIP TRACKING */}
        {/* ============================================================ */}
        {currentTab === 'book' && (
          <div className="cp-content cp-content--narrow">
            <div className="cp-surface">
              {!activeRide && (
                <>
                  {pendingPenalty && (
                    <div className="cp-penalty-banner cp-fade-up">
                      <div className="cp-penalty-banner-left">
                        <div className="cp-penalty-banner-icon">
                          <AlertTriangle size={18} />
                        </div>
                        <div>
                          <div className="cp-penalty-banner-title">
                            Unpaid ₹15 Driver Compensation (Ride #{pendingPenalty.ride_code || 'Cancelled'})
                          </div>
                          <div className="cp-penalty-banner-sub">
                            Settle directly to driver ({pendingPenalty.rider_name || 'Driver'}) via UPI to unlock new ride requests.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPenaltyModal(true)}
                        className="cp-btn cp-btn--danger cp-btn--sm"
                      >
                        Pay ₹15 Now
                      </button>
                    </div>
                  )}

                  {flashFreeRide && flashFreeRide.status === 'OPEN' && (
                    <div className="cp-flash-banner cp-fade-up">
                      <div className="cp-flash-banner-top">
                        <span className="cp-flash-badge">
                          <Zap size={11} /> FLASH FREE RIDE (₹0.00)
                        </span>
                        <span className="cp-flash-hint">FASTEST FINGER FIRST — 1 WINNER</span>
                      </div>
                      <div className="cp-flash-route">
                        {flashFreeRide.pickup_location || flashFreeRide.pickup} <ArrowRight size={14} /> {flashFreeRide.destination_location || flashFreeRide.destination}
                      </div>
                      <div className="cp-flash-note">
                        Official Papido Core Campus Mobility Ride · 100% Free
                      </div>
                      <button
                        type="button"
                        onClick={handleClaimFlashFreeRide}
                        disabled={claimingFlash}
                        className="cp-flash-cta"
                      >
                        {claimingFlash ? 'CLAIMING FREE RIDE...' : 'CLAIM THIS FREE RIDE NOW (₹0)'}
                      </button>
                      {flashClaimMsg && (
                        <div className="cp-flash-error">{flashClaimMsg}</div>
                      )}
                    </div>
                  )}

                  <div className="cp-heading-block">
                    <h2 className="cp-heading">Book a Campus Ride</h2>
                    <p className="cp-subheading">Affordable &amp; instant rides across Pondicherry University</p>
                  </div>

                  {/* Booking Mode Switch */}
                  <div className="cp-mode-switch">
                    <button
                      type="button"
                      onClick={() => setBookingMode('NOW')}
                      className={`cp-mode-btn ${bookingMode === 'NOW' ? 'is-active is-amber' : ''}`}
                    >
                      <Zap size={15} /> Ride Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingMode('SCHEDULE')}
                      className={`cp-mode-btn ${bookingMode === 'SCHEDULE' ? 'is-active is-blue' : ''}`}
                    >
                      <Calendar size={15} /> Pre-Book for Later
                    </button>
                  </div>

                  {/* Ride Now Pickup Time Selector */}
                  {bookingMode === 'NOW' && (
                    <div className="cp-time-card cp-fade-up">
                      <div className="cp-time-card-header">
                        <div className="cp-time-card-label">
                          <Clock size={15} /> Select Pickup Time:
                        </div>
                        <span className="cp-time-display">{getRideNowDisplayTime()}</span>
                      </div>

                      <div className="cp-time-pills">
                        {[
                          { id: 'NOW', label: 'Now', icon: Zap },
                          { id: '5MIN', label: '+5 min' },
                          { id: '10MIN', label: '+10 min' },
                          { id: '15MIN', label: '+15 min' },
                          { id: 'CUSTOM', label: 'Set', icon: Clock }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setRideNowTimeOption(opt.id)}
                            className={`cp-time-pill ${rideNowTimeOption === opt.id ? 'is-active' : ''}`}
                          >
                            {opt.icon ? <opt.icon size={12} /> : null} {opt.label}
                          </button>
                        ))}
                      </div>

                      {rideNowTimeOption === 'CUSTOM' && (
                        <div className="cp-time-custom cp-fade-up">
                          <div>
                            <label className="cp-time-custom-label">Hour</label>
                            <select
                              value={rideNowCustomHour}
                              onChange={(e) => setRideNowCustomHour(e.target.value)}
                              className="cp-time-select"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="cp-time-custom-label">Minute</label>
                            <select
                              value={rideNowCustomMinute}
                              onChange={(e) => setRideNowCustomMinute(e.target.value)}
                              className="cp-time-select"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')).map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="cp-time-custom-label">AM / PM</label>
                            <div className="cp-time-ampm">
                              <button
                                type="button"
                                onClick={() => setRideNowCustomAmPm('AM')}
                                className={`cp-ampm-btn ${rideNowCustomAmPm === 'AM' ? 'is-active' : ''}`}
                              >
                                AM
                              </button>
                              <button
                                type="button"
                                onClick={() => setRideNowCustomAmPm('PM')}
                                className={`cp-ampm-btn ${rideNowCustomAmPm === 'PM' ? 'is-active' : ''}`}
                              >
                                PM
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pre-Booking Date & Time Selector */}
                  {bookingMode === 'SCHEDULE' && (
                    <div className="cp-schedule-card cp-fade-up">
                      <div className="cp-schedule-header">
                        <div className="cp-schedule-title">
                          <Calendar size={18} /> Schedule Trip Date &amp; Pickup Time
                        </div>
                        <span className="cp-schedule-tag">ADVANCE BOOKING</span>
                      </div>

                      <div>
                        <label className="cp-schedule-label">1. Select Trip Date</label>
                        <div className="cp-schedule-date-pills">
                          <button
                            type="button"
                            onClick={() => { setSchedDateOption('TODAY'); setScheduledDate(getTodayDateStr()); }}
                            className={`cp-schedule-pill ${schedDateOption === 'TODAY' ? 'is-active' : ''}`}
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSchedDateOption('TOMORROW'); setScheduledDate(getTomorrowDateStr()); }}
                            className={`cp-schedule-pill ${schedDateOption === 'TOMORROW' ? 'is-active' : ''}`}
                          >
                            Tomorrow
                          </button>
                          <button
                            type="button"
                            onClick={() => setSchedDateOption('CUSTOM')}
                            className={`cp-schedule-pill ${schedDateOption === 'CUSTOM' ? 'is-active' : ''}`}
                          >
                            Pick Date
                          </button>
                        </div>

                        {schedDateOption === 'CUSTOM' && (
                          <input
                            type="date"
                            min={getTodayDateStr()}
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="cp-schedule-date-input"
                          />
                        )}
                      </div>

                      <div>
                        <label className="cp-schedule-label">2. Select Pickup Time (12-Hour)</label>
                        <div className="cp-schedule-time-row">
                          <div>
                            <div className="cp-schedule-time-label">Hour</div>
                            <select
                              value={scheduledHour}
                              onChange={(e) => setScheduledHour(e.target.value)}
                              className="cp-schedule-select"
                            >
                              {['01','02','03','04','05','06','07','08','09','10','11','12'].map((h) => (
                                <option key={`h-${h}`} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div className="cp-schedule-time-label">Minute</div>
                            <select
                              value={scheduledMinute}
                              onChange={(e) => setScheduledMinute(e.target.value)}
                              className="cp-schedule-select"
                            >
                              {['00','05','10','15','20','25','30','35','40','45','50','55'].map((m) => (
                                <option key={`m-${m}`} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div className="cp-schedule-time-label">Period</div>
                            <div className="cp-schedule-period">
                              <button
                                type="button"
                                onClick={() => setScheduledAmPm('AM')}
                                className={`cp-period-btn ${scheduledAmPm === 'AM' ? 'is-active' : ''}`}
                              >
                                AM
                              </button>
                              <button
                                type="button"
                                onClick={() => setScheduledAmPm('PM')}
                                className={`cp-period-btn ${scheduledAmPm === 'PM' ? 'is-active' : ''}`}
                              >
                                PM
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="cp-schedule-summary">
                        <div className="cp-schedule-summary-left">
                          <Clock size={16} color="#2563EB" />
                          <span>Pickup Schedule:</span>
                        </div>
                        <span className="cp-schedule-summary-time">
                          {scheduledDate} at {scheduledHour}:{scheduledMinute} {scheduledAmPm}
                        </span>
                      </div>

                      <div className="cp-schedule-note">
                        We will automatically dispatch your ride to nearby active riders 15 minutes before your scheduled pickup time. Free cancellation anytime before dispatch.
                      </div>
                    </div>
                  )}

                  {scheduledSuccessMsg && (
                    <div className="cp-success-inline cp-slide-down">
                      <span>{scheduledSuccessMsg}</span>
                      <button
                        type="button"
                        onClick={() => setScheduledSuccessMsg(null)}
                        className="cp-success-inline-close"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* STEP 1: PICKUP */}
                  <div className="cp-step-card cp-fade-up" style={{ animationDelay: '40ms' }}>
                    <div className="cp-step-header">
                      <div className="cp-step-left">
                        <div className="cp-step-num cp-step-num--green">1</div>
                        <div>
                          <div className="cp-step-title">Pickup Location</div>
                          <div className="cp-step-sub">Where should the rider meet you on campus?</div>
                        </div>
                      </div>
                      <span className="cp-step-tag cp-step-tag--green">STEP 1</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label cp-form-label">
                        <MapPin size={14} color="#10B981" /> Select Campus Stop or Gate
                      </label>
                      <select
                        className="form-input form-select cp-select"
                        value={pickupAddress}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPickupAddress(val);
                          const coords = findStopCoords(val);
                          if (coords) setPickupCoords(coords);
                        }}
                      >
                        {adminStops && adminStops.length > 0 ? (
                          adminStops.map((stopName, i) => (
                            <option key={`p-stop-${i}`} value={stopName}>{stopName}</option>
                          ))
                        ) : (
                          <option value="" disabled>No pickup locations added by Admin</option>
                        )}
                      </select>

                      {getLocationHint(pickupAddress) && (
                        <div className="cp-field-detail cp-fade-up">
                          <label className="cp-detail-label">{getLocationHint(pickupAddress).label}</label>
                          <input
                            type="text"
                            className="form-input cp-input-detail"
                            placeholder={getLocationHint(pickupAddress).placeholder}
                            value={pickupDetail}
                            onChange={(e) => setPickupDetail(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    {!showViaStop ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowViaStop(true);
                          if (!viaAddress && adminStops && adminStops.length > 0) {
                            setViaAddress(adminStops[2] || adminStops[0]);
                            const c = findStopCoords(adminStops[2] || adminStops[0]);
                            if (c) setViaCoords(c);
                          }
                        }}
                        className="cp-via-add"
                      >
                        <Plus size={14} /> Add Intermediate / Via Stop (Optional)
                      </button>
                    ) : (
                      <div className="cp-via-card cp-fade-up">
                        <div className="cp-via-header">
                          <label className="cp-via-label">
                            <MapPin size={14} color="#F59E0B" /> Intermediate Stop
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setShowViaStop(false);
                              setViaAddress('');
                              setViaDetail('');
                              setViaCoords(null);
                            }}
                            className="cp-via-remove"
                          >
                            <X size={12} /> Remove Stop
                          </button>
                        </div>

                        <select
                          className="form-input form-select cp-select cp-select--via"
                          value={viaAddress}
                          onChange={(e) => {
                            const val = e.target.value;
                            setViaAddress(val);
                            const coords = findStopCoords(val);
                            if (coords) setViaCoords(coords);
                          }}
                        >
                          {adminStops && adminStops.length > 0 ? (
                            adminStops.map((stopName, i) => (
                              <option key={`v-stop-${i}`} value={stopName}>{stopName}</option>
                            ))
                          ) : (
                            <option value="" disabled>No locations available</option>
                          )}
                        </select>

                        <input
                          type="text"
                          className="form-input cp-input-detail"
                          placeholder="Specific spot / department at via stop (optional)..."
                          value={viaDetail}
                          onChange={(e) => setViaDetail(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* STEP 2: DESTINATION */}
                  <div className="cp-step-card cp-fade-up" style={{ animationDelay: '80ms' }}>
                    <div className="cp-step-header">
                      <div className="cp-step-left">
                        <div className="cp-step-num cp-step-num--amber">2</div>
                        <div>
                          <div className="cp-step-title">Drop-off Destination</div>
                          <div className="cp-step-sub">Where is your final campus stop?</div>
                        </div>
                      </div>
                      <span className="cp-step-tag cp-step-tag--amber">STEP 2</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label cp-form-label">
                        <MapPin size={14} color="#EA580C" /> Select Campus Stop or Department
                      </label>
                      <select
                        className="form-input form-select cp-select"
                        value={destAddress}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDestAddress(val);
                          const coords = findStopCoords(val);
                          if (coords) setDestCoords(coords);
                        }}
                      >
                        {adminStops && adminStops.length > 0 ? (
                          adminStops.map((stopName, i) => (
                            <option key={`d-stop-${i}`} value={stopName}>{stopName}</option>
                          ))
                        ) : (
                          <option value="" disabled>No drop-off locations added by Admin</option>
                        )}
                      </select>

                      {getLocationHint(destAddress) && (
                        <div className="cp-field-detail cp-fade-up">
                          <label className="cp-detail-label">{getLocationHint(destAddress).label}</label>
                          <input
                            type="text"
                            className="form-input cp-input-detail"
                            placeholder={getLocationHint(destAddress).placeholder}
                            value={destDetail}
                            onChange={(e) => setDestDetail(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STEP 3: VEHICLE */}
                  <div className="cp-step-card cp-fade-up" style={{ animationDelay: '120ms' }}>
                    <div className="cp-step-header">
                      <div className="cp-step-left">
                        <div className="cp-step-num cp-step-num--amber">3</div>
                        <div>
                          <div className="cp-step-title">Select Vehicle Type</div>
                          <div className="cp-step-sub">Choose your preferred ride type</div>
                        </div>
                      </div>
                      <span className="cp-step-tag cp-step-tag--amber">STEP 3</span>
                    </div>

                    <div className="cp-vehicle-grid">
                      {[
                        { id: 'ANY', icon: Zap, label: 'Any', sub: 'Fastest Pickup' },
                        { id: 'BIKE', icon: Bike, label: 'Bike', sub: 'Standard Commute' },
                        { id: 'SCOOTER', icon: Compass, label: 'Scooter', sub: 'Smooth Ride' }
                      ].map((v) => {
                        const Icon = v.icon;
                        const isActive = vehicleType === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setVehicleType(v.id)}
                            className={`cp-vehicle-btn ${isActive ? 'is-active' : ''}`}
                          >
                            {isActive && <span className="cp-vehicle-check"><Check size={11} /></span>}
                            <Icon size={22} color={isActive ? '#EA580C' : '#796D61'} />
                            <span className="cp-vehicle-label">{v.label}</span>
                            <span className="cp-vehicle-sub">{v.sub}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="cp-prefs-box">
                      {(user?.gender || '').toUpperCase() === 'FEMALE' && (
                        <label className="cp-pref-row cp-pref-row--divider">
                          <div className="cp-pref-left">
                            <Shield size={16} color="#EC4899" />
                            <div>
                              <span className="cp-pref-title cp-pref-title--pink">Female Rider Only</span>
                              <div className="cp-pref-sub cp-pref-sub--pink">Match only verified female driver partners</div>
                            </div>
                          </div>
                          <span className={`cp-switch ${femaleRiderOnly ? 'is-on is-pink' : ''}`}>
                            <input
                              type="checkbox"
                              checked={femaleRiderOnly}
                              onChange={(e) => setFemaleRiderOnly(e.target.checked)}
                              className="cp-switch-input"
                            />
                            <span className="cp-switch-thumb" />
                          </span>
                        </label>
                      )}

                      <label className="cp-pref-row">
                        <div className="cp-pref-left">
                          <Users size={16} color="#EA580C" />
                          <div>
                            <span className="cp-pref-title">Double Ride (2 Passengers)</span>
                            <div className="cp-pref-sub cp-pref-sub--green">Save ₹10 with bundled fare</div>
                          </div>
                        </div>
                        <span className={`cp-switch ${isDoubleRide ? 'is-on' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isDoubleRide}
                            onChange={(e) => setIsDoubleRide(e.target.checked)}
                            className="cp-switch-input"
                          />
                          <span className="cp-switch-thumb" />
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* STEP 4: FARE */}
                  <div className="cp-fare-card cp-fade-up" style={{ animationDelay: '160ms' }}>
                    <div className="cp-step-header">
                      <div className="cp-step-left">
                        <div className="cp-step-num cp-step-num--amber">4</div>
                        <div>
                          <div className="cp-step-title">Fare Summary &amp; Payment</div>
                          <div className="cp-step-sub">Official transparent campus pricing</div>
                        </div>
                      </div>
                      <span className="cp-step-tag cp-step-tag--amber">STEP 4</span>
                    </div>

                    <div className="cp-fare-total">
                      <div>
                        <div className="cp-fare-total-label">Total Trip Fare:</div>
                        {fareEstimate?.isRouteBased && (
                          <div className="cp-fare-tag cp-fare-tag--amber">
                            <MapPinned size={12} /> {fareEstimate.routeName || 'Configured Campus Route'}
                          </div>
                        )}
                        {isDoubleRide && (
                          <div className="cp-fare-tag cp-fare-tag--green">
                            <Users size={12} /> Double Ride (₹10 Discount Applied)
                          </div>
                        )}
                      </div>
                      <div className="cp-fare-value">
                        {estimating ? <span className="cp-fare-loading">...</span> : `₹${fareEstimate?.estimatedFare || (isDoubleRide ? 30 : 20)}`}
                      </div>
                    </div>

                    <div className="cp-payment-row">
                      <span className="cp-payment-label">Payment Method:</span>
                      <span className="cp-payment-method">
                        <CreditCard size={13} color="#EA580C" /> Cash on Drop / UPI
                      </span>
                    </div>

                    <div className="cp-fare-note">
                      Pay the driver directly via Cash, Google Pay, or PhonePe upon reaching your destination.
                    </div>
                  </div>

                  {/* Waiting Policy */}
                  <div className="cp-info-box cp-fade-up">
                    <div className="cp-info-box-icon">
                      <Clock size={13} />
                    </div>
                    <div>
                      <div className="cp-info-box-title">Waiting Policy</div>
                      <div className="cp-info-box-sub">
                        First 9 minutes are free. ₹10 is added for every 10 full minutes of waiting (e.g. at intermediate stops).
                      </div>
                    </div>
                  </div>

                  {/* STEP 5: CONFIRM */}
                  <div>
                    <button
                      type="button"
                      disabled={bookingLoading || !pickupAddress || !destAddress}
                      onClick={handleRequestRide}
                      className={`cp-btn cp-btn--primary cp-btn--lg cp-btn--block cp-btn--ripple ${bookingMode === 'SCHEDULE' ? 'cp-btn--blue' : ''}`}
                    >
                      {bookingLoading
                        ? (bookingMode === 'SCHEDULE' ? 'Pre-Booking Ride...' : 'Requesting Ride...')
                        : (bookingMode === 'SCHEDULE' ? 'Confirm & Pre-Book Campus Ride' : 'Confirm & Request Campus Ride Now')}
                    </button>

                    {(!pickupAddress || !destAddress) && (
                      <div className="cp-hint-center">
                        Please select both pickup and destination locations above to book.
                      </div>
                    )}
                  </div>

                  {/* Pre-Booked Trips Shortcut */}
                  {scheduledRides && scheduledRides.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleTabChange('scheduled')}
                      className="cp-shortcut-pill"
                    >
                      <div className="cp-shortcut-left">
                        <Calendar size={16} />
                        <span>You have {scheduledRides.length} pre-booked {scheduledRides.length === 1 ? 'trip' : 'trips'} scheduled</span>
                      </div>
                      <span className="cp-shortcut-right">
                        View in Pre-Booked Tab <ArrowRight size={13} />
                      </span>
                    </button>
                  )}
                </>
              )}

              {/* Active Ride */}
              {activeRide && (
                activeRide.status === 'COMPLETED' ? (
                  <div className="cp-thanks-card cp-fade-up">
                    <div className="cp-thanks-icon">
                      <CheckCircle2 size={32} />
                    </div>

                    <h3 className="cp-thanks-title">Thank you for riding with Papido!</h3>
                    <p className="cp-thanks-sub">
                      We hope you had a pleasant campus journey. Please contact us again or book anytime for your next ride.
                    </p>

                    <div className="cp-thanks-summary">
                      <div>
                        <div className="cp-thanks-summary-label">
                          Trip #{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}
                        </div>
                        <div className="cp-thanks-summary-name">
                          Rider: {activeRide.rider_name || 'Campus Rider'}
                        </div>
                        {activeRide.rider_upi_id && (
                          <div className="cp-thanks-summary-upi">
                            Rider UPI: {activeRide.rider_upi_id}
                          </div>
                        )}
                        <div className="cp-thanks-summary-route">
                          {activeRide.pickup_address} → {activeRide.destination_address}
                        </div>
                      </div>
                      <div className="cp-thanks-summary-right">
                        <div className="cp-thanks-summary-fare-label">Fare Paid</div>
                        <div className="cp-thanks-summary-fare">
                          ₹{activeRide.final_fare || activeRide.total_fare || activeRide.estimated_fare || 20}
                        </div>
                      </div>
                    </div>

                    {!ratingSubmitted ? (
                      <div>
                        <div className="cp-rating-head">Rate your ride experience:</div>
                        <div className="cp-rating-control">
                          <RatingControl value={ratingVal} onChange={setRatingVal} size={32} />
                        </div>
                        <div className="cp-rating-message">
                          {ratingVal === 5 && '5 Stars - Excellent'}
                          {ratingVal === 4 && '4 Stars - Very Good'}
                          {ratingVal === 3 && '3 Stars - Good'}
                          {ratingVal === 2 && '2 Stars - Fair'}
                          {ratingVal === 1 && '1 Star - Poor'}
                        </div>

                        <input
                          type="text"
                          placeholder="Write brief feedback about your rider (optional)..."
                          className="form-input cp-feedback-input"
                          value={ratingReview}
                          onChange={(e) => setRatingReview(e.target.value)}
                        />

                        <div className="cp-row-2">
                          <button type="button" onClick={handleSkipRating} className="cp-btn cp-btn--ghost">
                            Skip
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmitRating}
                            disabled={submittingRating}
                            className="cp-btn cp-btn--primary"
                          >
                            {submittingRating ? 'Submitting...' : 'Submit Feedback'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="cp-rating-thanks">
                        Thank you! Your feedback has been recorded for this rider.
                      </div>
                    )}

                    <div className="cp-thanks-footer">
                      <span>Questions or lost items?</span>
                      <a href="tel:9876543210" className="cp-thanks-footer-link">
                        <Phone size={12} /> Contact Dispatch
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={handleSkipRating}
                      className="cp-btn cp-btn--ghost cp-btn--block"
                    >
                      <Bike size={16} /> Book Another Campus Ride
                    </button>
                  </div>
                ) : (
                  <div className="cp-live-trip cp-fade-up">
                    <div>
                      <h2 className="cp-heading">Live Trip Status</h2>
                      <p className="cp-subheading">
                        Ride #{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`} · {activeRide.pickup_address} → {activeRide.destination_address}
                      </p>
                    </div>

                    <div className={`cp-status-badge-card ${activeRide.status === 'ACCEPTED' ? 'is-emerald' : 'is-amber'}`}>
                      <div className="cp-status-badge-card-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>STATUS: {activeRide.status}</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#EA580C', background: '#FFF7ED', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(234, 88, 12, 0.25)' }}>
                          #{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}
                        </span>
                      </div>
                      <div className="cp-status-badge-card-text">
                        {activeRide.status === 'PENDING_ADMIN_QUOTE' && <><Clock size={18} /> Submitted to Dispatch — Admin is setting the fare &amp; assigning a rider.</>}
                        {activeRide.status === 'REQUESTED' && <><Search size={18} /> Searching for nearby riders...</>}
                        {activeRide.status === 'ACCEPTED' && (
                          activeRide.scheduled_time ? (
                            <><CheckCircle size={18} color="#059669" /> Rider accepted! Confirmed for {formatRideDateTime(activeRide.scheduled_time)}</>
                          ) : (
                            <><CheckCircle size={18} color="#059669" /> Rider accepted your trip!</>
                          )
                        )}
                        {activeRide.status === 'RIDER_ARRIVING' && <><Bike size={18} /> Rider is arriving at your pickup spot.</>}
                        {activeRide.status === 'RIDER_REACHED' && <><MapPin size={18} /> Rider has reached pickup point!</>}
                        {activeRide.status === 'STARTED' && <><Navigation size={18} /> Trip in progress to destination...</>}
                      </div>
                    </div>

                    <div className="cp-stepper-card">
                      <div className="cp-stepper-card-label">Ride Progression</div>
                      <RideStatusStepper currentStatus={activeRide.status} />
                    </div>

                    <div className="cp-route-card">
                      <div className="cp-route-card-header">
                        <div className="cp-route-card-live">
                          <span className={`cp-live-dot ${socketRef.current?.connected ? 'is-live' : 'is-pending'}`} />
                          <span>Live Route Details</span>
                        </div>
                        {activeRide.pickup_address && activeRide.destination_address && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeRide.pickup_address)}&destination=${encodeURIComponent(activeRide.destination_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cp-route-open-link"
                          >
                            <ExternalLink size={12} />
                            <span>Open Navigation</span>
                          </a>
                        )}
                      </div>

                      <div className="cp-route-timeline">
                        <div className="cp-route-stop">
                          <div className="cp-route-marker cp-route-marker--pickup">P</div>
                          <div className="cp-route-stop-body">
                            <div className="cp-route-stop-label">Pickup Location</div>
                            <div className="cp-route-stop-value">{activeRide.pickup_address || pickupAddress || 'Campus Pickup'}</div>
                          </div>
                        </div>

                        {Boolean(activeRide.via_address || viaAddress) && (
                          <div className="cp-route-stop">
                            <div className="cp-route-marker cp-route-marker--via">V</div>
                            <div className="cp-route-stop-body">
                              <div className="cp-route-stop-label">Intermediate Stop</div>
                              <div className="cp-route-stop-value">{activeRide.via_address || viaAddress}</div>
                            </div>
                          </div>
                        )}

                        <div className="cp-route-stop">
                          <div className="cp-route-marker cp-route-marker--drop">D</div>
                          <div className="cp-route-stop-body">
                            <div className="cp-route-stop-label">Drop-off Destination</div>
                            <div className="cp-route-stop-value">{activeRide.destination_address || destAddress || 'Campus Destination'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {activeRide.status === 'ACCEPTED' && Boolean(activeRide.scheduled_time) && (
                      <div className="cp-confirmed-banner cp-fade-up">
                        <div className="cp-confirmed-left">
                          <div className="cp-confirmed-icon">
                            <Calendar size={16} />
                          </div>
                          <div>
                            <div className="cp-confirmed-title">Rider Confirmed for Your Selected Time</div>
                            <div className="cp-confirmed-sub">
                              Pickup Scheduled: <strong>{formatRideDateTime(activeRide.scheduled_time)}</strong>
                            </div>
                          </div>
                        </div>
                        <span className="cp-confirmed-tag">CONFIRMED</span>
                      </div>
                    )}

                    {Boolean(activeRide.is_waiting) && (
                      <div className="cp-waiting-banner cp-pulse-soft">
                        <div className="cp-waiting-left">
                          <div className="cp-waiting-icon"><Clock size={15} /></div>
                          <div>
                            <div className="cp-waiting-title">Rider is Currently On Waiting</div>
                            <div className="cp-waiting-sub">
                              Waiting Duration: <strong>{activeRide.waiting_minutes || 0} mins</strong> (+₹{activeRide.waiting_fare || 0} charge added)
                            </div>
                          </div>
                        </div>
                        <span className="cp-waiting-tag">ON WAITING</span>
                      </div>
                    )}

                    <div className="cp-fare-pay-card">
                      <div>
                        <div className="cp-fare-pay-label">FARE TO PAY RIDER:</div>
                        <div className="cp-fare-pay-value">
                          ₹{activeRide.total_fare || activeRide.final_fare || activeRide.estimated_fare || 20}
                        </div>
                        {Boolean(activeRide.waiting_fare > 0) && (
                          <div className="cp-fare-pay-waiting">
                            Includes ₹{activeRide.waiting_fare} waiting charge ({activeRide.waiting_minutes || 0} mins)
                          </div>
                        )}
                      </div>
                      <div className="cp-fare-pay-right">
                        <span className="cp-fare-pay-method">
                          {activeRide.payment_method || 'CASH'} ON DROP
                        </span>
                        {activeRide.is_double_ride ? (
                          <div className="cp-fare-pay-double">
                            <Users size={13} /> Double Ride (Discounted)
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {['ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED'].includes(activeRide.status) && (activeRide.otp || activeRide.otp_code) && (
                      <div className="cp-otp-card cp-fade-up">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span className="cp-otp-label">Share this 4-Digit Ride OTP:</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, background: '#FDE68A', color: '#92400E', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                            #{activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id}`}
                          </span>
                        </div>
                        <div className="cp-otp-value">
                          {activeRide.otp || activeRide.otp_code}
                        </div>
                        <div className="cp-otp-note">
                          Rider verifies this OTP to start the trip. Do not share before meeting rider.
                        </div>
                      </div>
                    )}

                    {activeRide.rider_name && (
                      <div className="cp-rider-card cp-fade-up">
                        <div className="cp-rider-card-head">
                          <div className="cp-rider-card-head-left">
                            <div className="cp-rider-avatar">
                              <Bike size={22} color="#FFFFFF" />
                            </div>
                            <div>
                              <div className="cp-rider-name-row">
                                <div className="cp-rider-name">{activeRide.rider_name}</div>
                                {Boolean(activeRide.rider_rating) && (
                                  <span className="cp-rider-rating-pill">
                                    <Star size={11} fill="#D97706" color="#D97706" />
                                    {Number(activeRide.rider_rating).toFixed(1)}
                                    {Boolean(activeRide.rider_total_ratings_count && Number(activeRide.rider_total_ratings_count) > 0) && (
                                      <span className="cp-rider-rating-count">({activeRide.rider_total_ratings_count})</span>
                                    )}
                                  </span>
                                )}
                              </div>
                              {!(activeRide.rider_is_core || activeRide.is_core_member) && (
                                <div className="cp-rider-vehicle">
                                  {activeRide.rider_vehicle_model || activeRide.vehicle_model || 'Honda Activa 6G'} • {activeRide.rider_vehicle_number || activeRide.vehicle_number || 'PY 01 AB 1234'}
                                </div>
                              )}
                            </div>
                          </div>
                          {activeRide.rider_phone && (
                            <a href={`tel:${activeRide.rider_phone}`} className="cp-btn cp-btn--ghost cp-btn--sm cp-rider-call">
                              <Phone size={14} /> Call
                            </a>
                          )}
                        </div>

                        {(Number(activeRide.rider_total_rides) >= 15 && Number(activeRide.rider_rating || 5.0) >= 4.6) ? (
                          <div className="cp-top-badge cp-top-badge--amber">
                            <div className="cp-top-badge-icon cp-top-badge-icon--amber">
                              <Award size={18} />
                            </div>
                            <div className="cp-top-badge-body">
                              <div className="cp-top-badge-head">
                                <span className="cp-top-badge-title cp-top-badge-title--amber">Most Chosen Rider</span>
                                <span className="cp-top-badge-chip cp-top-badge-chip--amber">
                                  <Sparkles size={10} /> Top Rated
                                </span>
                              </div>
                              <div className="cp-top-badge-sub">
                                Consistently chosen by passengers with a {Number(activeRide.rider_rating || 5.0).toFixed(1)} rating
                                {Boolean(activeRide.rider_total_rides && Number(activeRide.rider_total_rides) > 0) && (
                                  <span> and {activeRide.rider_total_rides}+ completed trips</span>
                                )}.
                              </div>
                            </div>
                          </div>
                        ) : (Number(activeRide.rider_rating || 5.0) >= 4.7) ? (
                          <div className="cp-top-badge cp-top-badge--emerald">
                            <div className="cp-top-badge-icon cp-top-badge-icon--emerald">
                              <ShieldCheck size={18} />
                            </div>
                            <div className="cp-top-badge-body">
                              <div className="cp-top-badge-head">
                                <span className="cp-top-badge-title cp-top-badge-title--emerald">Top Rated Campus Rider</span>
                                <span className="cp-top-badge-chip cp-top-badge-chip--emerald">
                                  <ThumbsUp size={9} /> High Satisfaction
                                </span>
                              </div>
                              <div className="cp-top-badge-sub">
                                Verified trusted rider with excellent passenger feedback ({Number(activeRide.rider_rating || 5.0).toFixed(1)} rating).
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {activeRide.rider_name && !activeRide.is_free_ride && !activeRide.is_core_only && parseFloat(activeRide.final_fare || activeRide.total_fare || activeRide.estimated_fare || 20) > 0 && (
                      (() => {
                        const driverFare = parseFloat(activeRide.final_fare || activeRide.total_fare || activeRide.estimated_fare || 20).toFixed(2);
                        const driverUpi = (activeRide.rider_upi_id || '').trim() || (activeRide.rider_phone ? `${activeRide.rider_phone}@upi` : 'driver@upi');
                        const driverName = activeRide.rider_name || 'Campus Driver';
                        const txRef = String(activeRide.ride_code || activeRide.rideCode || `PAP-${activeRide.id || Date.now()}`).trim();
                        const txNote = `Papido_${txRef}`;

                        const gpayUrl = `gpay://upi/pay?pa=${encodeURIComponent(driverUpi)}&pn=${encodeURIComponent(driverName)}&tr=${encodeURIComponent(txRef)}&am=${driverFare}&tn=${encodeURIComponent(txNote)}&cu=INR`;
                        const phonepeUrl = `phonepe://pay?pa=${encodeURIComponent(driverUpi)}&pn=${encodeURIComponent(driverName)}&tr=${encodeURIComponent(txRef)}&am=${driverFare}&tn=${encodeURIComponent(txNote)}&cu=INR`;
                        const upiPayUrl = `upi://pay?pa=${encodeURIComponent(driverUpi)}&pn=${encodeURIComponent(driverName)}&tr=${encodeURIComponent(txRef)}&am=${driverFare}&tn=${encodeURIComponent(txNote)}&cu=INR`;
                        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiPayUrl)}`;

                        return (
                          <div className="cp-upi-card cp-fade-up">
                            <div className="cp-upi-header">
                              <div className="cp-upi-header-left">
                                <div className="cp-upi-icon"><CreditCard size={18} /></div>
                                <div>
                                  <div className="cp-upi-title">Pay Driver via UPI / GPay</div>
                                  <div className="cp-upi-sub">Direct payment to {driverName}'s verified KYC UPI</div>
                                </div>
                              </div>
                              <div className="cp-upi-fare-right">
                                <div className="cp-upi-fare-label">Fare:</div>
                                <div className="cp-upi-fare-value">₹{driverFare}</div>
                              </div>
                            </div>

                            <div className="cp-upi-actions">
                              <a href={gpayUrl} className="cp-upi-action cp-upi-action--gpay" rel="noopener noreferrer">
                                <Smartphone size={15} /> GPay
                              </a>
                              <a href={phonepeUrl} className="cp-upi-action cp-upi-action--phonepe" rel="noopener noreferrer">
                                <Zap size={15} /> PhonePe
                              </a>
                              <a href={upiPayUrl} className="cp-upi-action cp-upi-action--generic" rel="noopener noreferrer">
                                <ExternalLink size={14} /> Any UPI
                              </a>
                            </div>

                            <div className="cp-upi-copy-row">
                              <div>
                                <div className="cp-upi-copy-label">Driver UPI ID (KYC Verified)</div>
                                <div className="cp-upi-copy-value">{driverUpi}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(driverUpi);
                                  setCopiedUpi(true);
                                  setTimeout(() => setCopiedUpi(false), 3000);
                                }}
                                className={`cp-upi-copy-btn ${copiedUpi ? 'is-copied' : ''}`}
                              >
                                {copiedUpi ? <Check size={12} /> : <Copy size={12} />}
                                {copiedUpi ? 'Copied' : 'Copy'}
                              </button>
                            </div>

                            <div className="cp-qr-toggle-wrap">
                              <button
                                type="button"
                                onClick={() => setShowTripQr(!showTripQr)}
                                className="cp-qr-toggle"
                              >
                                <QrCode size={14} /> {showTripQr ? 'Hide Driver Payment QR Code' : 'Show Driver Payment QR Code (Scan to Pay)'}
                              </button>
                              {showTripQr && (
                                <div className="cp-qr-box cp-fade-up">
                                  <div className="cp-qr-inner">
                                    <img src={qrCodeUrl} alt="Driver Payment QR" className="cp-qr-img" />
                                  </div>
                                  <div className="cp-qr-note">
                                    Scan using Google Pay, PhonePe, Paytm, or BHIM
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    )}

                    <div className="cp-trip-route-card">
                      <div className="cp-trip-route-row">
                        <span className="cp-dot cp-dot--green" />
                        <div><strong className="cp-trip-route-label">Pickup:</strong> <span className="cp-trip-route-value">{activeRide.pickup_address}</span></div>
                      </div>
                      {activeRide.via_address && (
                        <div className="cp-trip-route-row">
                          <span className="cp-dot cp-dot--amber" />
                          <div><strong className="cp-trip-route-label">Via Stop:</strong> <span className="cp-trip-route-value cp-trip-route-value--amber">{activeRide.via_address}</span></div>
                        </div>
                      )}
                      <div className="cp-trip-route-row">
                        <span className="cp-dot cp-dot--amber" />
                        <div><strong className="cp-trip-route-label">Drop:</strong> <span className="cp-trip-route-value">{activeRide.destination_address}</span></div>
                      </div>
                      <div className="cp-trip-route-footer">
                        <span>Fare: <strong className="cp-trip-route-fare">₹{activeRide.final_fare || activeRide.total_fare || activeRide.estimated_fare || 20}</strong></span>
                        <span>Payment: <strong className="cp-trip-route-payment">{activeRide.payment_method || 'CASH'}</strong></span>
                      </div>
                    </div>

                    {['REQUESTED', 'ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED'].includes(activeRide.status) && (
                      <button
                        type="button"
                        onClick={handleCancelRide}
                        className="cp-btn cp-btn--danger cp-btn--block cp-btn--lg"
                      >
                        Cancel Trip Request
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: SCHEDULED */}
        {/* ============================================================ */}
        {currentTab === 'scheduled' && (
          <div className="cp-content cp-content--wide">
            <div className="cp-surface">
              <div className="cp-tab-header">
                <div>
                  <h2 className="cp-heading cp-heading--icon">
                    <Calendar size={22} color="#EA580C" /> My Pre-Booked Campus Rides
                  </h2>
                  <p className="cp-subheading">Track, manage, and view rider assignments for your advance bookings.</p>
                </div>
                <div className="cp-tab-header-actions">
                  <button
                    type="button"
                    onClick={fetchScheduledRides}
                    disabled={scheduledLoading}
                    className="cp-btn cp-btn--ghost cp-btn--sm"
                  >
                    <RefreshCw size={13} className={scheduledLoading ? 'cp-spin' : ''} />
                    <span>{scheduledLoading ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBookingMode('SCHEDULE'); handleTabChange('book'); }}
                    className="cp-btn cp-btn--primary cp-btn--sm"
                  >
                    <Clock size={13} />
                    <span>Pre-Book New Ride</span>
                  </button>
                </div>
              </div>

              {scheduledSuccessMsg && (
                <div className="cp-success-inline cp-slide-down">
                  <CheckCircle2 size={16} color="#059669" />
                  <span>{scheduledSuccessMsg}</span>
                </div>
              )}

              {scheduledLoading && scheduledRides.length === 0 ? (
                <div className="cp-skeletons">
                  {[1, 2, 3].map((n) => (
                    <div key={`sched-skel-${n}`} className="cp-skeleton-card">
                      <div className="cp-skeleton-line cp-skeleton-line--short" />
                      <div className="cp-skeleton-line" />
                    </div>
                  ))}
                </div>
              ) : scheduledRides.length === 0 ? (
                <div className="cp-empty cp-fade-up">
                  <div className="cp-empty-icon">
                    <Calendar size={36} color="#EA580C" />
                  </div>
                  <div className="cp-empty-title">No upcoming pre-booked rides</div>
                  <div className="cp-empty-sub">
                    Need to travel tomorrow morning, catch a bus, or head across campus later? Pre-book in advance to guarantee a rider.
                  </div>
                  <button
                    type="button"
                    onClick={() => { setBookingMode('SCHEDULE'); handleTabChange('book'); }}
                    className="cp-btn cp-btn--primary"
                  >
                    Pre-Book a Ride Now
                  </button>
                </div>
              ) : (
                <div className="cp-list">
                  {scheduledRides.map((sr, idx) => {
                    const isRiderAssigned = Boolean(sr.rider_name || sr.rider_id || sr.status === 'ACCEPTED');
                    return (
                      <div
                        key={`tab-sch-${sr.id}`}
                        className={`cp-schedule-card cp-fade-up ${isRiderAssigned ? 'is-confirmed' : 'is-pending'}`}
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        <div className="cp-schedule-card-head">
                          <div className="cp-schedule-card-head-left">
                            <span className="cp-ride-code">{sr.ride_code || `PAP-${sr.id}`}</span>
                            <span className="cp-schedule-time">{formatRideDateTime(sr.scheduled_time_ist || sr.scheduled_time)}</span>
                            {isRiderAssigned ? (
                              <span className="cp-status-chip cp-status-chip--emerald">
                                <CheckCircle2 size={13} /> CONFIRMED WITH RIDER
                              </span>
                            ) : (
                              <span className="cp-status-chip cp-status-chip--amber">
                                PENDING RIDER ACCEPTANCE
                              </span>
                            )}
                          </div>
                          <div className="cp-schedule-fare">
                            <div className="cp-schedule-fare-label">ESTIMATED FARE:</div>
                            <div className="cp-schedule-fare-value">₹{sr.total_fare || sr.estimated_fare || 20}</div>
                          </div>
                        </div>

                        <div className="cp-schedule-route">
                          <div className="cp-schedule-route-row">
                            <span className="cp-dot cp-dot--green" />
                            <div><strong>Pickup:</strong> {sr.pickup_address}</div>
                          </div>
                          <div className="cp-schedule-route-row">
                            <span className="cp-dot cp-dot--amber" />
                            <div><strong>Drop:</strong> {sr.destination_address}</div>
                          </div>
                          <div className="cp-schedule-route-meta">
                            Vehicle: <strong>{sr.vehicle_type || 'BIKE'}</strong> • Payment: <strong>{sr.payment_method || 'CASH'} ON DROP</strong>
                          </div>
                        </div>

                        {isRiderAssigned ? (
                          <div className="cp-schedule-rider cp-fade-up">
                            <div>
                              <div className="cp-schedule-rider-label">ASSIGNED CAMPUS RIDER</div>
                              <div className="cp-schedule-rider-name">{sr.rider_name || 'Campus Rider'}</div>
                              <div className="cp-schedule-rider-vehicle">
                                {sr.rider_vehicle_model || 'Two-Wheeler'} {sr.rider_vehicle_number ? `(${sr.rider_vehicle_number})` : ''}
                              </div>
                              <div className="cp-schedule-rider-note">
                                Rider has confirmed and will arrive at your pickup spot at {formatRideDateTime(sr.scheduled_time_ist || sr.scheduled_time)}.
                              </div>
                            </div>
                            <div className="cp-schedule-rider-actions">
                              {sr.rider_phone && (
                                <a href={`tel:${sr.rider_phone}`} className="cp-btn cp-btn--success cp-btn--sm">
                                  <Phone size={13} /> Call Rider
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => openRescheduleModal(sr)}
                                className="cp-btn cp-btn--ghost cp-btn--sm cp-btn--ghost-blue"
                              >
                                <Clock size={13} /> Change Date &amp; Time
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelScheduledRide(sr.id)}
                                className="cp-btn cp-btn--ghost cp-btn--sm cp-btn--ghost-danger"
                              >
                                Cancel Booking
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="cp-schedule-pending cp-fade-up">
                            <div className="cp-schedule-pending-note">
                              Listed on advance board. Campus riders can claim your schedule.
                            </div>
                            <div className="cp-schedule-pending-actions">
                              <button
                                type="button"
                                onClick={() => openRescheduleModal(sr)}
                                className="cp-btn cp-btn--ghost cp-btn--sm cp-btn--ghost-blue"
                              >
                                <Clock size={13} /> Change Date &amp; Time
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelScheduledRide(sr.id)}
                                className="cp-btn cp-btn--ghost cp-btn--sm cp-btn--ghost-danger"
                              >
                                Cancel Booking
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: OUTSIDE */}
        {/* ============================================================ */}
        {currentTab === 'outside' && (
          <div className="cp-content cp-content--narrow">
            <div className="cp-surface">
              <div className="cp-heading-block">
                <h2 className="cp-heading cp-heading--icon">
                  <Compass size={22} color="#EA580C" /> Outside Campus Ride Request
                </h2>
                <p className="cp-subheading cp-subheading--multiline">
                  Travel anywhere outside campus (e.g., White Town, Rock Beach, Bus Stand, JIPMER, Railway Station, or ECR). Type your pickup and destination below. Campus Admin will assign fair pricing and dispatch a rider.
                </p>
              </div>

              <form onSubmit={handleSubmitOutsideTrip} className="cp-form">
                <div className="form-group">
                  <div className="cp-field-row-head">
                    <label className="form-label cp-form-label">
                      <MapPin size={15} color="#10B981" /> Pickup Location
                    </label>
                    <div className="cp-field-head-actions">
                      <button type="button" onClick={() => openMapPicker('pickup')} className="cp-mini-pill cp-mini-pill--green">
                        <Compass size={12} /> Pick on Map
                      </button>
                      <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="cp-mini-link">
                        <ExternalLink size={11} /> Google Maps
                      </a>
                    </div>
                  </div>
                  <div className="cp-input-wrap">
                    <input
                      type="text"
                      className={`form-input cp-input ${resolvingPickup ? 'is-resolving' : ''}`}
                      placeholder="Type pickup place, choose on map, or paste link..."
                      value={outsidePickup}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOutsidePickup(val);
                        if (val.includes('maps.app.goo.gl') || val.includes('google.com/maps') || val.includes('goo.gl/maps')) {
                          handleResolveMapInput(val, 'pickup');
                        }
                      }}
                      onPaste={(e) => {
                        const pasted = e.clipboardData?.getData('text');
                        if (pasted && (pasted.includes('maps.app.goo.gl') || pasted.includes('google.com/maps') || pasted.includes('goo.gl/maps') || pasted.includes('http') || /^-?\d+\.\d+/.test(pasted.trim()))) {
                          setTimeout(() => handleResolveMapInput(pasted, 'pickup'), 50);
                        }
                      }}
                      onBlur={() => {
                        if (outsidePickup && (outsidePickup.includes('maps.app.goo.gl') || outsidePickup.includes('google.com/maps') || outsidePickup.includes('http'))) {
                          handleResolveMapInput(outsidePickup, 'pickup');
                        }
                      }}
                      required
                    />
                    {resolvingPickup && (
                      <div className="cp-input-spinner"><RefreshCw size={14} className="cp-spin" /></div>
                    )}
                  </div>

                  {resolvingPickup && (
                    <div className="cp-inline-status cp-inline-status--amber">
                      <RefreshCw size={12} className="cp-spin" /> Fetching location name from Google Maps link...
                    </div>
                  )}

                  {!resolvingPickup && resolvedPickupBadge && (
                    <div className="cp-inline-status cp-inline-status--green cp-fade-up">
                      <CheckCircle2 size={12} /> Location Identified: <strong>{resolvedPickupBadge}</strong>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <div className="cp-field-row-head">
                    <label className="form-label cp-form-label">
                      <MapPin size={15} color="#EA580C" /> Drop-off Destination
                    </label>
                    <div className="cp-field-head-actions">
                      <button type="button" onClick={() => openMapPicker('dest')} className="cp-mini-pill cp-mini-pill--amber">
                        <Compass size={12} /> Pick on Map
                      </button>
                      <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="cp-mini-link">
                        <ExternalLink size={11} /> Google Maps
                      </a>
                    </div>
                  </div>
                  <div className="cp-input-wrap">
                    <input
                      type="text"
                      className={`form-input cp-input ${resolvingDest ? 'is-resolving' : ''}`}
                      placeholder="Type destination, choose on map, or paste link..."
                      value={outsideDest}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOutsideDest(val);
                        if (val.includes('maps.app.goo.gl') || val.includes('google.com/maps') || val.includes('goo.gl/maps')) {
                          handleResolveMapInput(val, 'dest');
                        }
                      }}
                      onPaste={(e) => {
                        const pasted = e.clipboardData?.getData('text');
                        if (pasted && (pasted.includes('maps.app.goo.gl') || pasted.includes('google.com/maps') || pasted.includes('goo.gl/maps') || pasted.includes('http') || /^-?\d+\.\d+/.test(pasted.trim()))) {
                          setTimeout(() => handleResolveMapInput(pasted, 'dest'), 50);
                        }
                      }}
                      onBlur={() => {
                        if (outsideDest && (outsideDest.includes('maps.app.goo.gl') || outsideDest.includes('google.com/maps') || outsideDest.includes('http'))) {
                          handleResolveMapInput(outsideDest, 'dest');
                        }
                      }}
                      required
                    />
                    {resolvingDest && (
                      <div className="cp-input-spinner"><RefreshCw size={14} className="cp-spin" /></div>
                    )}
                  </div>

                  {resolvingDest && (
                    <div className="cp-inline-status cp-inline-status--amber">
                      <RefreshCw size={12} className="cp-spin" /> Fetching location name from Google Maps link...
                    </div>
                  )}

                  {!resolvingDest && resolvedDestBadge && (
                    <div className="cp-inline-status cp-inline-status--green cp-fade-up">
                      <CheckCircle2 size={12} /> Location Identified: <strong>{resolvedDestBadge}</strong>
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label cp-form-label">Vehicle Preference</label>
                  <div className="cp-vehicle-grid">
                    {[
                      { id: 'ANY', icon: Zap, label: 'Any (Fastest)' },
                      { id: 'BIKE', icon: Bike, label: 'Bike' },
                      { id: 'SCOOTER', icon: Compass, label: 'Scooter' }
                    ].map((v) => {
                      const Icon = v.icon;
                      const isActive = outsideVehicleType === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setOutsideVehicleType(v.id)}
                          className={`cp-vehicle-btn ${isActive ? 'is-active' : ''}`}
                        >
                          <Icon size={20} color={isActive ? '#EA580C' : '#796D61'} />
                          <span className="cp-vehicle-label">{v.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="cp-info-box cp-fade-up">
                  <Clock size={16} />
                  <span>Once submitted, Campus Dispatch sets the fair fare quote based on distance. You can review and confirm before the driver starts.</span>
                </div>

                <button
                  type="submit"
                  disabled={submittingOutside || !outsidePickup.trim() || !outsideDest.trim()}
                  className="cp-btn cp-btn--primary cp-btn--lg cp-btn--block cp-btn--ripple"
                >
                  {submittingOutside ? 'Submitting Request...' : (
                    <>
                      <span>Submit Outside Trip for Dispatch Quote</span>
                      <Send size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: HISTORY */}
        {/* ============================================================ */}
        {currentTab === 'history' && (
          <div className="cp-content cp-content--wide">
            <div className="cp-tab-header cp-tab-header--no-surface">
              <div>
                <h2 className="cp-heading cp-heading--icon">
                  <Clock size={22} color="#EA580C" /> My Campus Ride History
                </h2>
                <p className="cp-subheading">Review all your completed campus rides, receipts, and pre-booked trip records.</p>
              </div>
              <button
                type="button"
                onClick={fetchRideHistory}
                disabled={loadingHistory}
                className="cp-btn cp-btn--ghost cp-btn--sm"
              >
                <RefreshCw size={13} className={loadingHistory ? 'cp-spin' : ''} />
                <span>{loadingHistory ? 'Refreshing...' : 'Refresh History'}</span>
              </button>
            </div>

            {loadingHistory ? (
              <div className="cp-skeletons">
                {[1, 2, 3].map((n) => (
                  <div key={`hist-skel-${n}`} className="cp-skeleton-card">
                    <div className="cp-skeleton-line cp-skeleton-line--short" />
                    <div className="cp-skeleton-line" />
                    <div className="cp-skeleton-line cp-skeleton-line--short" />
                  </div>
                ))}
              </div>
            ) : pastRides.length === 0 ? (
              <div className="cp-empty cp-fade-up">
                <div className="cp-empty-icon">
                  <Clock size={28} />
                </div>
                <div className="cp-empty-title">No Past Rides Found</div>
                <div className="cp-empty-sub">
                  Your completed and past campus trips will appear here with detailed receipts and payment history.
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange('book')}
                  className="cp-btn cp-btn--primary"
                >
                  <Bike size={16} /> Book Your First Ride Now
                </button>
              </div>
            ) : (
              <div className="cp-list">
                {pastRides.map((r, idx) => {
                  const isPrebooked = Boolean(r.is_scheduled || r.isScheduled || r.scheduled_time);
                  const isCompleted = r.status === 'COMPLETED';
                  return (
                    <div
                      key={r.id}
                      className={`cp-history-card cp-fade-up ${isPrebooked ? 'is-prebooked' : ''}`}
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <div className="cp-history-body">
                        <div className="cp-history-code-row">
                          <span className="cp-ride-code">{r.ride_code || `PAP-${r.id}`}</span>
                          {isPrebooked && (
                            <span className="cp-prebooked-tag">PRE-BOOKED TRIP</span>
                          )}
                        </div>

                        <div className="cp-history-route">
                          <div className="cp-history-route-row">
                            <span className="cp-dot cp-dot--green" />
                            <span>{r.pickup_address}</span>
                          </div>
                          <div className="cp-history-route-row">
                            <span className="cp-dot cp-dot--amber" />
                            <span>{r.destination_address}</span>
                          </div>
                        </div>

                        <div className="cp-history-meta">
                          {isPrebooked && r.scheduled_time ? (
                            <>
                              <span className="cp-history-meta-strong">Pickup Scheduled: {formatRideDateTime(r.scheduled_time)}</span>
                              <span className="cp-history-dot">•</span>
                              <span>Booked: {formatRideDateTime(r.requested_at || r.created_at)}</span>
                            </>
                          ) : (
                            <span>{formatRideDateTime(r.requested_at || r.created_at || r.accepted_at || r.completed_at)}</span>
                          )}
                          <span className="cp-history-dot">•</span>
                          <span>Rider: <strong>{r.rider_name || 'Campus Rider'}</strong></span>
                        </div>
                      </div>

                      <div className="cp-history-right">
                        <div className="cp-history-fare">
                          ₹{r.total_fare || r.final_fare || r.estimated_fare || 20}
                        </div>
                        <span className={`cp-history-status ${isCompleted ? 'is-complete' : 'is-cancelled'}`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: PROFILE */}
        {/* ============================================================ */}
        {currentTab === 'profile' && (
          <div className="cp-content cp-content--narrow">
            <div className="cp-surface cp-surface--profile">
              <h2 className="cp-heading">Passenger Profile Settings</h2>
              <p className="cp-subheading">Manage your personal contact information and password credentials.</p>

              {profileFeedback && (
                <div className={`cp-alert ${profileFeedback.type === 'success' ? 'cp-alert--success' : 'cp-alert--error'} cp-slide-down`}>
                  {profileFeedback.type === 'success' ? <CheckCircle2 size={16} color="#059669" /> : <AlertCircle size={16} color="#DC2626" />}
                  <span>{profileFeedback.msg}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="cp-form">
                <div className="form-group">
                  <label className="form-label cp-form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input cp-input"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label cp-form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input cp-input"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label cp-form-label">
                    Gender <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#64748B' }}>Locked</span>
                  </label>
                  <input
                    type="text"
                    className="form-input cp-input"
                    value={
                      (user?.gender || '').toUpperCase() === 'FEMALE' ? 'Female' :
                      (user?.gender || '').toUpperCase() === 'MALE'   ? 'Male' :
                      (user?.gender || '').toUpperCase() === 'OTHER'  ? 'Other' :
                      'Not Specified'
                    }
                    readOnly
                    style={{ background: '#F8FAFC', color: '#64748B', cursor: 'not-allowed' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileUpdating}
                  className="cp-btn cp-btn--primary cp-btn--lg cp-btn--block"
                >
                  {profileUpdating ? 'Saving Profile...' : 'Save Profile Changes'}
                </button>
              </form>

              <hr className="cp-hr" />

              <div className="cp-security-card">
                <div>
                  <h4 className="cp-security-title">Account Password</h4>
                  <p className="cp-security-sub">Update your secret login password anytime</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="cp-btn cp-btn--ghost cp-btn--sm"
                >
                  <Lock size={14} /> Change Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL: Change Password */}
      {/* ============================================================ */}
      {showPasswordModal && (
        <div className="cp-modal-overlay" role="dialog" aria-modal="true" aria-label="Change account password">
          <div className="cp-modal cp-modal--sm cp-modal-in">
            <h3 className="cp-modal-title">
              <Lock size={18} color="#EA580C" /> Change Account Password
            </h3>

            {passError && (
              <div className="cp-alert cp-alert--error cp-slide-down">
                <AlertCircle size={16} /> {passError}
              </div>
            )}
            {passSuccess && (
              <div className="cp-alert cp-alert--success cp-slide-down">
                <CheckCircle2 size={16} /> {passSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="cp-form">
              <div className="form-group">
                <label className="form-label cp-form-label">Current Password</label>
                <input
                  type="password"
                  className="form-input cp-input"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label cp-form-label">New Password (min 6 chars)</label>
                <input
                  type="password"
                  className="form-input cp-input"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label cp-form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input cp-input"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  required
                />
              </div>

              <div className="cp-row-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="cp-btn cp-btn--ghost cp-btn--block"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passUpdating}
                  className="cp-btn cp-btn--primary cp-btn--block"
                >
                  {passUpdating ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: Interactive Map Location Picker */}
      {/* ============================================================ */}
      {showMapPicker && (
        <div className="cp-modal-overlay" role="dialog" aria-modal="true" aria-label="Pick location on map">
          <div className="cp-modal cp-modal--lg cp-modal-in">
            <div className="cp-map-picker-head">
              <div>
                <h3 className="cp-modal-title">
                  <MapPin size={18} color="#EA580C" />
                  {mapPickerTarget === 'pickup' ? 'Select Pickup Location' : 'Select Destination'}
                </h3>
                <p className="cp-modal-sub">Search any Pondicherry landmark or select from popular spots below</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapPicker(false)}
                className="cp-icon-btn"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="cp-picker-search">
              <div className="cp-input-wrap">
                <Search size={16} className="cp-input-leading" />
                <input
                  type="text"
                  placeholder="Search place, beach, station, hostel, cafe (e.g. Rock Beach, JIPMER, Auroville)..."
                  className="form-input cp-input cp-input--with-leading cp-input--with-trail"
                  value={pickerSearchQuery}
                  onChange={(e) => setPickerSearchQuery(e.target.value)}
                />
                {searchingPlaces && (
                  <div className="cp-input-trail"><RefreshCw size={14} className="cp-spin" /></div>
                )}
                {pickerSearchQuery && !searchingPlaces && (
                  <button
                    type="button"
                    onClick={() => { setPickerSearchQuery(''); setPickerSearchResults([]); }}
                    className="cp-input-trail cp-input-trail--btn"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {pickerSearchResults.length > 0 && (
                <div className="cp-picker-results cp-fade-up">
                  {pickerSearchResults.map((place, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        updatePickerPin(place.latitude, place.longitude, place.name, place.address);
                        setPickerSearchQuery('');
                        setPickerSearchResults([]);
                      }}
                      className="cp-picker-result"
                    >
                      <MapPin size={15} color="#EA580C" />
                      <div>
                        <div className="cp-picker-result-name">{place.name}</div>
                        <div className="cp-picker-result-addr">{place.address}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="cp-picker-chips">
              <span className="cp-picker-chips-label">
                <Compass size={12} /> Popular:
              </span>
              {POPULAR_OUTSIDE_SPOTS.slice(0, 7).map((spot) => {
                const isSelected = selectedPickerLocation.name === spot.name;
                return (
                  <button
                    key={spot.name}
                    type="button"
                    onClick={() => updatePickerPin(spot.lat, spot.lng, spot.name, spot.name)}
                    className={`cp-picker-chip ${isSelected ? 'is-active' : ''}`}
                  >
                    {spot.name.split('/')[0].trim()}
                  </button>
                );
              })}
            </div>

            <div className="cp-picker-grid-wrap">
              <div className="cp-picker-grid-title">Popular Pondicherry Spots</div>
              <div className="cp-picker-grid">
                {POPULAR_OUTSIDE_SPOTS.map((spot) => {
                  const isSelected = selectedPickerLocation.name === spot.name;
                  return (
                    <button
                      key={spot.name}
                      type="button"
                      onClick={() => updatePickerPin(spot.lat, spot.lng, spot.name, spot.name)}
                      className={`cp-picker-spot ${isSelected ? 'is-active' : ''}`}
                    >
                      <div className={`cp-picker-spot-icon ${isSelected ? 'is-active' : ''}`}>
                        <MapPin size={16} />
                      </div>
                      <div className="cp-picker-spot-body">
                        <div className="cp-picker-spot-name">{spot.name}</div>
                        <div className="cp-picker-spot-sub">Puducherry</div>
                      </div>
                      {isSelected && <Check size={14} color="#EA580C" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="cp-picker-footer">
              <div className="cp-picker-footer-left">
                <div className="cp-picker-footer-label">
                  <span>Selected {mapPickerTarget === 'pickup' ? 'Pickup Spot' : 'Destination'}</span>
                  {reverseGeocodingPicker && (
                    <span className="cp-picker-detecting">
                      <RefreshCw size={10} className="cp-spin" /> Detecting address...
                    </span>
                  )}
                </div>
                <div className="cp-picker-footer-name">{selectedPickerLocation.name}</div>
                {selectedPickerLocation.address && selectedPickerLocation.address !== selectedPickerLocation.name && (
                  <div className="cp-picker-footer-addr">{selectedPickerLocation.address}</div>
                )}
              </div>

              <div className="cp-picker-footer-actions">
                <button
                  type="button"
                  onClick={() => setShowMapPicker(false)}
                  className="cp-btn cp-btn--ghost"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPickerLocation}
                  className="cp-btn cp-btn--primary"
                >
                  <CheckCircle2 size={16} />
                  Set as {mapPickerTarget === 'pickup' ? 'Pickup' : 'Destination'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: Cancel Warning */}
      {/* ============================================================ */}
      {showCancelWarningModal && (
        <div className="cp-modal-overlay" role="dialog" aria-modal="true" aria-label="Cancel ride confirmation">
          <div className="cp-modal cp-modal--sm cp-modal--danger cp-modal-in cp-shake">
            <div className="cp-modal-head">
              <div className="cp-modal-head-icon cp-modal-head-icon--danger">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="cp-modal-title">Driver Has Reached Your Location</h3>
                <p className="cp-modal-sub">Confirmation required before cancelling</p>
              </div>
            </div>

            <div className="cp-warn-box">
              Your driver has already arrived at the pickup spot. Cancelling this ride now will apply a <strong>₹15 cancellation compensation charge</strong> payable directly to the driver's UPI account to compensate for fuel and waiting time.
            </div>

            <div className="cp-row-2">
              <button
                type="button"
                onClick={() => setShowCancelWarningModal(false)}
                className="cp-btn cp-btn--ghost cp-btn--block"
              >
                Keep Ride
              </button>
              <button
                type="button"
                onClick={() => executeCancelRide('Cancelled by passenger after arrival')}
                className="cp-btn cp-btn--danger cp-btn--block"
              >
                Yes, Cancel (Pay ₹15)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: Penalty Payment */}
      {/* ============================================================ */}
      {showPenaltyModal && pendingPenalty && (() => {
        const riderUpi = pendingPenalty.rider_upi || pendingPenalty.rider_upi_id || `${pendingPenalty.rider_phone || 'driver'}@upi`;
        const riderName = pendingPenalty.rider_name || pendingPenalty.rider_name_full || 'Driver';
        const upiUri = pendingPenalty.upiPayUrl || `upi://pay?pa=${encodeURIComponent(riderUpi)}&pn=${encodeURIComponent(riderName)}&am=15.00&tn=Papido_Driver_Compensation_${pendingPenalty.ride_code || 'Trip'}&cu=INR`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(upiUri)}`;

        const handleCopyUpi = () => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(riderUpi);
            setCopiedUpi(true);
            setTimeout(() => setCopiedUpi(false), 2500);
          }
        };

        return (
          <div className="cp-modal-overlay" role="dialog" aria-modal="true" aria-label="Driver compensation payment">
            <div className="cp-modal cp-modal--md cp-modal-in cp-modal--amber">
              <div className="cp-modal-head">
                <div className="cp-modal-head-icon cp-modal-head-icon--amber">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h3 className="cp-modal-title">Driver Compensation Fee</h3>
                  <p className="cp-modal-sub">Pay ₹15 directly to driver to unlock your account</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPenaltyModal(false)}
                  className="cp-icon-btn"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="cp-penalty-amount">
                <div>
                  <div className="cp-penalty-amount-label">Beneficiary Driver</div>
                  <div className="cp-penalty-amount-name">{riderName}</div>
                  {pendingPenalty.rider_phone && (
                    <div className="cp-penalty-amount-phone">Phone: {pendingPenalty.rider_phone}</div>
                  )}
                </div>
                <div className="cp-penalty-amount-right">
                  <div className="cp-penalty-amount-label">Amount Due</div>
                  <div className="cp-penalty-amount-value">₹15.00</div>
                </div>
              </div>

              {pendingPenalty.status === 'PENDING_DRIVER_CONFIRMATION' ? (
                <div className="cp-penalty-wait cp-fade-up">
                  <div className="cp-penalty-wait-icon"><Clock size={32} /></div>
                  <h4 className="cp-penalty-wait-title">Waiting for Driver Confirmation</h4>
                  <p className="cp-penalty-wait-sub">
                    We have notified driver <strong>{riderName}</strong> on their device. As soon as they confirm receipt of ₹15 in their UPI app, this screen will automatically close and unlock your booking!
                  </p>
                  <div className="cp-penalty-wait-live">
                    <RefreshCw size={13} className="cp-spin" /> Live confirmation listener active
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingPenalty(prev => ({ ...prev, status: 'UNPAID' }))}
                    className="cp-btn cp-btn--ghost cp-btn--sm"
                  >
                    Back to QR / Payment Options
                  </button>
                </div>
              ) : (
                <>
                  <div className="cp-pay-tabs">
                    {[
                      { id: 'QR', label: 'Scan QR', icon: QrCode },
                      { id: 'APPS', label: 'UPI Apps', icon: Smartphone },
                      { id: 'UPI_ID', label: 'UPI ID', icon: CreditCard }
                    ].map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setPenaltyPayMode(t.id)}
                          className={`cp-pay-tab ${penaltyPayMode === t.id ? 'is-active' : ''}`}
                        >
                          <Icon size={14} /> {t.label}
                        </button>
                      );
                    })}
                  </div>

                  {penaltyPayMode === 'QR' && (
                    <div className="cp-pay-qr cp-fade-up">
                      <div className="cp-pay-qr-box">
                        <img src={qrCodeUrl} alt="Scan to Pay ₹15 via UPI" className="cp-pay-qr-img" />
                      </div>
                      <div className="cp-pay-qr-title">Scan with ANY UPI App (GPay / PhonePe / Paytm / Cred)</div>
                      <div className="cp-pay-qr-sub">Amount (₹15) and rider details are pre-filled automatically</div>
                    </div>
                  )}

                  {penaltyPayMode === 'APPS' && (
                    <div className="cp-pay-apps cp-fade-up">
                      <a href={upiUri} className="cp-upi-action cp-upi-action--green">
                        <ExternalLink size={16} /> Pay ₹15 with Any Installed UPI App
                      </a>
                      <a href={`gpay://upi/pay?pa=${encodeURIComponent(riderUpi)}&pn=${encodeURIComponent(riderName)}&am=15.00&tn=Papido_Comp&cu=INR`} className="cp-upi-action cp-upi-action--ghost">
                        <Smartphone size={15} color="#2563EB" /> Google Pay
                      </a>
                      <a href={`phonepe://pay?pa=${encodeURIComponent(riderUpi)}&pn=${encodeURIComponent(riderName)}&am=15.00&tn=Papido_Comp&cu=INR`} className="cp-upi-action cp-upi-action--ghost">
                        <Smartphone size={15} color="#7C3AED" /> PhonePe
                      </a>
                    </div>
                  )}

                  {penaltyPayMode === 'UPI_ID' && (
                    <div className="cp-pay-upiid cp-fade-up">
                      <div className="cp-pay-upiid-box">
                        <div className="cp-pay-upiid-label">Rider UPI VPA Address:</div>
                        <div className="cp-pay-upiid-row">
                          <span className="cp-pay-upiid-value">{riderUpi}</span>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className={`cp-upi-copy-btn ${copiedUpi ? 'is-copied' : ''}`}
                          >
                            {copiedUpi ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                            {copiedUpi ? 'Copied!' : 'Copy UPI'}
                          </button>
                        </div>
                      </div>
                      <div className="cp-pay-upiid-note">
                        Open your payment app, paste the UPI ID above, enter amount <strong>₹15.00</strong>, and complete transfer.
                      </div>
                    </div>
                  )}

                  <div className="cp-pay-actions">
                    <button
                      type="button"
                      onClick={handleSettlePenalty}
                      disabled={settlingPenalty}
                      className="cp-btn cp-btn--primary cp-btn--lg cp-btn--block"
                    >
                      <CheckCircle2 size={18} />
                      {settlingPenalty ? 'Sending Claim to Rider...' : 'I Have Paid ₹15 to Rider'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPenaltyModal(false)}
                      className="cp-text-link"
                    >
                      Pay Later (Trip stays cancelled &amp; booking locked)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ============================================================ */}
      {/* MODAL: Preference Unavailable */}
      {/* ============================================================ */}
      {showPreferenceModal && preferenceModalData && (
        <div className="cp-modal-overlay" role="dialog" aria-modal="true" aria-label="Preferred rider not available">
          <div className="cp-modal cp-modal--sm cp-modal-in cp-modal--amber">
            <div className="cp-modal-head">
              <div className="cp-modal-head-icon cp-modal-head-icon--amber">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="cp-modal-title">Preferred Rider Not Available</h3>
                <p className="cp-modal-sub">The selected preferred rider is not available.</p>
              </div>
            </div>

            <div className="cp-pref-info">
              <div className="cp-pref-info-title">Selected Preference:</div>
              <div className="cp-pref-info-list">
                {preferenceModalData.isFemalePreference && (
                  <div>• <strong>Preference:</strong> Female Rider Only</div>
                )}
                {preferenceModalData.isVehiclePreference && (
                  <div>• <strong>Vehicle Type:</strong> {preferenceModalData.vehicleType}</div>
                )}
                <div className="cp-pref-info-error">{preferenceModalData.unavailableMessage}</div>
              </div>

              {preferenceModalData.totalOnlineCount > 0 ? (
                <div className="cp-pref-info-note cp-pref-info-note--green">
                  There are {preferenceModalData.totalOnlineCount} other campus riders currently online.
                </div>
              ) : (
                <div className="cp-pref-info-note">
                  Campus riders are currently busy or offline. You may still request a ride with any available rider.
                </div>
              )}
            </div>

            <div className="cp-pref-question">
              Would you like to continue with other preferences (Any Rider / Any Vehicle)?
            </div>

            <div className="cp-pref-actions">
              <button
                type="button"
                disabled={bookingLoading}
                onClick={() => {
                  setVehicleType('ANY');
                  setFemaleRiderOnly(false);
                  executeRequestRide({ vehicleType: 'ANY', femaleRiderOnly: false });
                }}
                className="cp-btn cp-btn--primary cp-btn--lg cp-btn--block"
              >
                {bookingLoading ? 'Requesting Ride...' : 'Continue with Other Preferences (Any Available)'}
              </button>

              <button
                type="button"
                disabled={bookingLoading}
                onClick={() => setShowPreferenceModal(false)}
                className="cp-btn cp-btn--ghost cp-btn--block"
              >
                Adjust My Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: Reschedule */}
      {/* ============================================================ */}
      {rescheduleTarget && (
        <div className="cp-modal-overlay" role="dialog" aria-modal="true" aria-label="Reschedule pre-booked ride">
          <div className="cp-modal cp-modal--sm cp-modal-in">
            <div className="cp-modal-head">
              <div>
                <h3 className="cp-modal-title">
                  <Calendar size={20} color="#EA580C" /> Change Date &amp; Time
                </h3>
                <p className="cp-modal-sub">
                  Trip #{rescheduleTarget.ride_code || rescheduleTarget.id} • {rescheduleTarget.pickup_address} → {rescheduleTarget.destination_address}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="cp-icon-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {rescheduleError && (
              <div className="cp-alert cp-alert--error cp-slide-down">
                <AlertCircle size={16} /> {rescheduleError}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="cp-form">
              <div>
                <label className="form-label cp-form-label">Pickup Date:</label>
                <div className="cp-resched-pills">
                  <button
                    type="button"
                    onClick={() => { setReschedDateOption('TODAY'); setReschedDate(getTodayDateStr()); }}
                    className={`cp-resched-pill ${reschedDateOption === 'TODAY' ? 'is-active' : ''}`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => { setReschedDateOption('TOMORROW'); setReschedDate(getTomorrowDateStr()); }}
                    className={`cp-resched-pill ${reschedDateOption === 'TOMORROW' ? 'is-active' : ''}`}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setReschedDateOption('CUSTOM')}
                    className={`cp-resched-pill ${reschedDateOption === 'CUSTOM' ? 'is-active' : ''}`}
                  >
                    Custom Date
                  </button>
                </div>

                {reschedDateOption === 'CUSTOM' && (
                  <input
                    type="date"
                    min={getTodayDateStr()}
                    value={reschedDate}
                    onChange={(e) => setReschedDate(e.target.value)}
                    className="form-input cp-input"
                    required
                  />
                )}
              </div>

              <div>
                <label className="form-label cp-form-label">Pickup Time:</label>
                <div className="cp-resched-time">
                  <select
                    value={reschedHour}
                    onChange={(e) => setReschedHour(e.target.value)}
                    className="form-input cp-input cp-input--mini"
                  >
                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="cp-resched-colon">:</span>
                  <select
                    value={reschedMinute}
                    onChange={(e) => setReschedMinute(e.target.value)}
                    className="form-input cp-input cp-input--mini"
                  >
                    {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={reschedAmPm}
                    onChange={(e) => setReschedAmPm(e.target.value)}
                    className="form-input cp-input cp-input--mini"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div className="cp-row-2">
                <button
                  type="button"
                  disabled={reschedulingLoading}
                  onClick={() => setRescheduleTarget(null)}
                  className="cp-btn cp-btn--ghost cp-btn--block"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reschedulingLoading}
                  className="cp-btn cp-btn--primary cp-btn--block"
                >
                  {reschedulingLoading ? 'Updating...' : 'Update Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <BottomNavigation
        items={customerNavItems}
        activeId={currentTab}
        onChange={handleTabChange}
        theme="passenger"
      />
    </div>
  );
}