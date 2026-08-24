import React, { useState, useEffect, useRef } from 'react';
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
  Smartphone
} from 'lucide-react';

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
  if (clean.endsWith('/rides') || clean.endsWith('/history')) return 'history';
  if (clean.endsWith('/profile')) return 'profile';
  return 'book';
};

export function CustomerPortalView() {
  const { user, token, logout, updateProfile, changePassword } = useAuth();
  const [currentTab, setCurrentTab] = useState(() => getCustomerTabFromPath(window.location.pathname));

  // Sync tab with URL on popstate
  useEffect(() => {
    const handleLocationChange = () => {
      if (!window.location.pathname.startsWith('/admin')) {
        setCurrentTab(getCustomerTabFromPath(window.location.pathname));
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Normalize initial path if at root /passenger or /customer
  useEffect(() => {
    if (!window.location.pathname.startsWith('/admin')) {
      const tab = getCustomerTabFromPath(window.location.pathname);
      setCurrentTab(tab);
      const pathMap = {
        book: '/passenger/book',
        outside: '/passenger/outside',
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
        history: '/passenger/rides',
        profile: '/passenger/profile'
      };
      const targetPath = pathMap[tabId] || '/passenger/book';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    }
  };

  // Booking Form State & Interactive Map Picking
  const [activePinMode, setActivePinMode] = useState('pickup'); // 'pickup' or 'drop'
  const activePinModeRef = useRef('pickup');
  useEffect(() => {
    activePinModeRef.current = activePinMode;
  }, [activePinMode]);

  const [pickupAddress, setPickupAddress] = useState('PU Main Gate (Gate 1)');
  const [pickupDetail, setPickupDetail] = useState('');
  const [pickupCoords, setPickupCoords] = useState({ lat: 12.0228681, lng: 79.8509415 });
  
  // Optional Via / Intermediate Stop
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

  // Fare & Estimation
  const [fareEstimate, setFareEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [adminRoutes, setAdminRoutes] = useState([]);
  const [adminStops, setAdminStops] = useState([]);
  const [groupedCampusStops, setGroupedCampusStops] = useState(DEFAULT_GROUPED_CAMPUS_STOPS);

  // Helper to find coordinates for any stop name
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

  // Fetch & Live-Sync Admin-Configured Campus Routes
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
    const interval = setInterval(loadAdminRoutes, 5000);
    return () => clearInterval(interval);
  }, [token, currentTab]);

  // Active Ride State
  const [activeRide, setActiveRide] = useState(null);
  const [rideLoading, setRideLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // Cancellation Penalty & Driver Compensation State
  const [pendingPenalty, setPendingPenalty] = useState(null);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [settlingPenalty, setSettlingPenalty] = useState(false);
  const [showCancelWarningModal, setShowCancelWarningModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [penaltyUtr, setPenaltyUtr] = useState('');
  const [penaltyPayMode, setPenaltyPayMode] = useState('QR'); // 'QR' | 'APPS' | 'UPI_ID'

  // Ride Rating State
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Outside Trips
  const [outsidePickup, setOutsidePickup] = useState(CAMPUS_HOTSPOTS[0].name);
  const [outsidePickupCoords, setOutsidePickupCoords] = useState({ lat: CAMPUS_HOTSPOTS[0].lat, lng: CAMPUS_HOTSPOTS[0].lng });
  const [outsideDest, setOutsideDest] = useState(POPULAR_OUTSIDE_SPOTS[0].name);
  const [outsideDestCoords, setOutsideDestCoords] = useState({ lat: POPULAR_OUTSIDE_SPOTS[0].lat, lng: POPULAR_OUTSIDE_SPOTS[0].lng });
  const [outsideVehicleType, setOutsideVehicleType] = useState('ANY');
  const [outsideDoubleRide, setOutsideDoubleRide] = useState(false);
  const [outsideTripsList, setOutsideTripsList] = useState([]);
  const [submittingOutside, setSubmittingOutside] = useState(false);

  // Map Link Auto-Resolution State
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

        // Center map to resolved coordinates
        if (leafletOutsideMapRef.current && window.L && coords.lat && coords.lng) {
          try {
            leafletOutsideMapRef.current.setView([coords.lat, coords.lng], 14);
          } catch (_) {}
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

  // Interactive Map Location Picker State
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState('dest'); // 'pickup' | 'dest'
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
  const pickerMapContainerRef = useRef(null);
  const pickerLeafletMapRef = useRef(null);
  const pickerMarkerRef = useRef(null);

  // Open Map Picker Modal
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

  // Update Pin and Geocode on Picker Map
  const updatePickerPin = async (lat, lng, knownName = null, knownAddress = null) => {
    if (!lat || !lng) return;

    if (pickerMarkerRef.current) {
      pickerMarkerRef.current.setLatLng([lat, lng]);
    }

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
        name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        address: `Selected Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        lat,
        lng
      });
    } finally {
      setReverseGeocodingPicker(false);
    }
  };

  // Place Search Autocomplete Debounce
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

  // Leaflet Map Initialization for Picker Modal
  useEffect(() => {
    if (!showMapPicker) {
      if (pickerLeafletMapRef.current) {
        try {
          pickerLeafletMapRef.current.remove();
        } catch (_) {}
        pickerLeafletMapRef.current = null;
        pickerMarkerRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!pickerMapContainerRef.current || !window.L) return;

      const initLat = selectedPickerLocation.lat || 11.9338;
      const initLng = selectedPickerLocation.lng || 79.8359;

      const map = window.L.map(pickerMapContainerRef.current).setView([initLat, initLng], 14);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      const pinIcon = window.L.divIcon({
        className: 'custom-picker-pin',
        html: `<div style="width: 36px; height: 36px; background: linear-gradient(135deg, #F97316, #EA580C); border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.5); border: 2px solid #FFFFFF;"><div style="width: 12px; height: 12px; background: #FFFFFF; border-radius: 50%; transform: rotate(45deg);"></div></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      });

      const marker = window.L.marker([initLat, initLng], {
        icon: pinIcon,
        draggable: true
      }).addTo(map);

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        updatePickerPin(pos.lat, pos.lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        updatePickerPin(e.latlng.lat, e.latlng.lng);
      });

      pickerLeafletMapRef.current = map;
      pickerMarkerRef.current = marker;
      map.invalidateSize();
    }, 150);

    return () => clearTimeout(timer);
  }, [showMapPicker]);

  // Confirm and Apply Selected Location from Map Picker
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

    if (leafletOutsideMapRef.current && window.L && selectedPickerLocation.lat && selectedPickerLocation.lng) {
      try {
        leafletOutsideMapRef.current.setView([selectedPickerLocation.lat, selectedPickerLocation.lng], 14);
      } catch (_) {}
    }

    setShowMapPicker(false);
  };

  // History & Profile
  const [pastRides, setPastRides] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileGender, setProfileGender] = useState(user?.gender || 'MALE');
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState(null);

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState(null);
  const [passSuccess, setPassSuccess] = useState(null);
  const [passUpdating, setPassUpdating] = useState(false);

  // Map references (Campus Rides)
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);

  // Map references (Outside Campus Rides)
  const outsideMapRef = useRef(null);
  const leafletOutsideMapRef = useRef(null);
  const outsideMarkersRef = useRef([]);

  // Socket reference
  const socketRef = useRef(null);

  // 1. Initialize Leaflet Map (Campus Booking)
  useEffect(() => {
    if (!mapRef.current) return;
    if (!leafletMapRef.current && window.L) {
      const map = window.L.map(mapRef.current).setView([12.0240, 79.8530], 15);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Interactive Map Click to Pin Pickup or Drop-off Anywhere
      map.on('click', (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        // Check if close to a known hotspot
        const matched = CAMPUS_HOTSPOTS.find(h => {
          const dLat = Math.abs(h.lat - lat);
          const dLng = Math.abs(h.lng - lng);
          return (dLat < 0.0015 && dLng < 0.0015);
        });

        if (activePinModeRef.current === 'pickup') {
          setPickupCoords({ lat, lng });
          if (matched) {
            setPickupAddress(matched.name);
          } else {
            setPickupAddress(`Campus Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          }
          // Automatically cycle to drop-off mode for the next tap
          setActivePinMode('drop');
        } else {
          setDestCoords({ lat, lng });
          if (matched) {
            setDestAddress(matched.name);
          } else {
            setDestAddress(`Campus Destination (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          }
        }
      });

      leafletMapRef.current = map;
    } else {
      setTimeout(() => {
        leafletMapRef.current?.invalidateSize();
      }, 100);
    }
  }, [mapRef]);

  // 2. Update Map Markers & Polyline
  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return;
    const map = leafletMapRef.current;

    // Clear existing markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const bounds = [];

    // Pickup Marker (Green)
    if (pickupCoords) {
      const pickupIcon = window.L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background: #10B981; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">P</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      const m = window.L.marker([pickupCoords.lat, pickupCoords.lng], { icon: pickupIcon })
        .addTo(map)
        .bindPopup(`<b>Pickup:</b> ${pickupAddress}`);
      markersRef.current.push(m);
      bounds.push([pickupCoords.lat, pickupCoords.lng]);
    }

    // Destination Marker (Amber)
    if (destCoords) {
      const destIcon = window.L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background: #F59E0B; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: black; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">D</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      const m = window.L.marker([destCoords.lat, destCoords.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>Drop:</b> ${destAddress}`);
      markersRef.current.push(m);
      bounds.push([destCoords.lat, destCoords.lng]);
    }

    // Driver Marker (Cyan Bike)
    if (driverLocation) {
      const driverIcon = window.L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background: #06B6D4; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 3px solid white; box-shadow: 0 4px 12px rgba(6,182,212,0.6);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      const m = window.L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon })
        .addTo(map)
        .bindPopup('<b>Driver Location</b>');
      markersRef.current.push(m);
      bounds.push([driverLocation.lat, driverLocation.lng]);
    }

    // Polyline Route
    if (pickupCoords && destCoords) {
      const line = window.L.polyline(
        [[pickupCoords.lat, pickupCoords.lng], [destCoords.lat, destCoords.lng]],
        { color: '#F59E0B', weight: 4, opacity: 0.8, dashArray: '8, 8' }
      ).addTo(map);
      markersRef.current.push(line);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [pickupCoords, destCoords, pickupAddress, destAddress, driverLocation]);

  // 2b. Initialize Outside Map
  useEffect(() => {
    if (currentTab !== 'outside') return;
    if (!outsideMapRef.current || !window.L) return;

    if (!leafletOutsideMapRef.current) {
      const map = window.L.map(outsideMapRef.current).setView([11.9750, 79.8250], 12);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Interactive Map Click Handler to pick outside destination
      map.on('click', (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        setOutsideDestCoords({ lat, lng });

        // Match closest popular landmark if within 500m
        const matched = POPULAR_OUTSIDE_SPOTS.find(spot => {
          const dLat = Math.abs(spot.lat - lat);
          const dLng = Math.abs(spot.lng - lng);
          return (dLat < 0.005 && dLng < 0.005);
        });

        if (matched) {
          setOutsideDest(matched.name);
        } else {
          setOutsideDest(`Puducherry Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
      });

      leafletOutsideMapRef.current = map;
    } else {
      setTimeout(() => {
        leafletOutsideMapRef.current?.invalidateSize();
      }, 100);
    }
  }, [currentTab, outsideMapRef]);

  // 2c. Update Outside Map Markers & Polyline
  useEffect(() => {
    if (!leafletOutsideMapRef.current || !window.L) return;
    const map = leafletOutsideMapRef.current;

    // Clear existing markers
    outsideMarkersRef.current.forEach(m => map.removeLayer(m));
    outsideMarkersRef.current = [];

    const bounds = [];

    // Pickup Marker (Green P)
    if (outsidePickupCoords) {
      const pickupIcon = window.L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background: #10B981; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 12px rgba(16,185,129,0.5);">P</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      const m = window.L.marker([outsidePickupCoords.lat, outsidePickupCoords.lng], { icon: pickupIcon })
        .addTo(map)
        .bindPopup(`<b>Pickup:</b> ${outsidePickup}`);
      outsideMarkersRef.current.push(m);
      bounds.push([outsidePickupCoords.lat, outsidePickupCoords.lng]);
    }

    // Destination Marker (Orange D)
    if (outsideDestCoords) {
      const destIcon = window.L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background: #EA580C; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 14px rgba(234,88,12,0.6);">D</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      const m = window.L.marker([outsideDestCoords.lat, outsideDestCoords.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>Destination:</b><br/>${outsideDest}`);
      outsideMarkersRef.current.push(m);
      bounds.push([outsideDestCoords.lat, outsideDestCoords.lng]);
    }

    // Route Polyline
    if (outsidePickupCoords && outsideDestCoords) {
      const line = window.L.polyline(
        [[outsidePickupCoords.lat, outsidePickupCoords.lng], [outsideDestCoords.lat, outsideDestCoords.lng]],
        { color: '#EA580C', weight: 4, opacity: 0.85, dashArray: '8, 8' }
      ).addTo(map);
      outsideMarkersRef.current.push(line);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [outsidePickupCoords, outsideDestCoords, outsidePickup, outsideDest]);

  // 3. Estimate Fare Calculation
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

  // 4. Fetch Active Ride on Load & Periodic Background Polling
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
        // Do not erase activeRide if it is currently waiting for customer feedback
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

  useEffect(() => {
    if (!token) return;
    fetchActiveRide(false);
    const pollInterval = setInterval(() => {
      fetchActiveRide(true);
    }, 2500);
    return () => clearInterval(pollInterval);
  }, [token]);

  // 5. Setup Socket.IO for Real-time Updates (when available)
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
      setStatusMessage('A campus rider has accepted your trip!');
    });

    socket.on('ride:reopened', () => {
      setStatusMessage('Previous rider had to cancel. Re-matching with another rider...');
      fetchActiveRide();
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
        setStatusMessage(`Driver is currently On Waiting (+₹${data.waitingFare || data.waiting_fare || 0} waiting fee)`);
      }
    });

    socket.on('rider:location_update', (loc) => {
      if (loc && loc.latitude && loc.longitude) {
        setDriverLocation({ lat: loc.latitude, lng: loc.longitude });
      }
    });

    socket.on('penalty:status_update', (data) => {
      console.log('Realtime penalty status update:', data);
      const isForMe = !data?.customerId || String(data.customerId) === String(user?.id) || (pendingPenalty && String(pendingPenalty.id) === String(data.penaltyId || data.id));
      if (!isForMe) return;

      if (data.status === 'PAID') {
        setPendingPenalty(null);
        setShowPenaltyModal(false);
        setStatusMessage('Driver confirmed receipt of ₹15! Booking unlocked.');
        fetchActiveRide(true);
        fetchPendingPenalty();
      } else if (data.status === 'UNPAID') {
        setPendingPenalty(prev => prev ? { ...prev, status: 'UNPAID' } : null);
        alert('Driver indicated ₹15 was not received. Please scan the QR code or verify your UPI payment.');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user?.id]);

  // 5b. Fetch Pending Driver Compensation Penalty (if any)
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

  // Live Auto-Poll Listener when waiting for Driver Confirmation (guarantees automatic update without manual refresh)
  useEffect(() => {
    if (!token || !pendingPenalty) return;
    if (pendingPenalty.status === 'PENDING_DRIVER_CONFIRMATION') {
      const interval = setInterval(() => {
        fetchPendingPenalty();
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [token, pendingPenalty?.status]);

  // 6. Handle Request Ride
  const handleRequestRide = async () => {
    if (pendingPenalty) {
      setShowPenaltyModal(true);
      return;
    }
    if (!pickupCoords || !destCoords) {
      alert('Please select valid pickup and destination locations.');
      return;
    }

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
      const res = await apiRequest('/customer/rides', 'POST', {
        pickupLatitude: pickupCoords.lat,
        pickupLongitude: pickupCoords.lng,
        pickupAddress: finalPickup,
        viaLatitude: showViaStop && viaCoords ? viaCoords.lat : null,
        viaLongitude: showViaStop && viaCoords ? viaCoords.lng : null,
        viaAddress: finalVia,
        destinationLatitude: destCoords.lat,
        destinationLongitude: destCoords.lng,
        destinationAddress: finalDest,
        vehicleType,
        femaleRiderOnly: isFemaleCustomer ? Boolean(femaleRiderOnly) : false,
        isDoubleRide,
        paymentMethod
      }, token);

      setActiveRide(res.data);
      setStatusMessage('Searching for available campus riders...');
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

  // 7. Handle Cancel Ride (Warns if driver has already reached pickup)
  const handleCancelRide = () => {
    if (!activeRide) return;
    if (activeRide.status === 'RIDER_REACHED') {
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
    const wasReached = currentActiveRide.status === 'RIDER_REACHED';
    setShowCancelWarningModal(false);

    try {
      const res = await apiRequest(`/customer/rides/${currentActiveRide.id}/cancel`, 'POST', {
        reason: reasonText
      }, token);

      setActiveRide(null);
      
      let penaltyData = res.data?.penalty;
      if (!penaltyData && wasReached) {
        try {
          const penRes = await apiRequest('/customer/pending-penalty', 'GET', null, token);
          if (penRes?.data) {
            penaltyData = penRes.data;
          }
        } catch (_) {}
      }

      if (penaltyData || wasReached) {
        const fallbackUpi = penaltyData?.rider_upi || penaltyData?.rider_upi_id || (currentActiveRide.rider_phone ? `${currentActiveRide.rider_phone}@upi` : 'driver@upi');
        const fallbackName = penaltyData?.rider_name || currentActiveRide.rider_name || 'Driver';
        const fallbackObj = penaltyData || {
          id: currentActiveRide.id,
          ride_id: currentActiveRide.id,
          ride_code: currentActiveRide.ride_code,
          amount: 15.00,
          rider_name: fallbackName,
          rider_upi: fallbackUpi,
          rider_phone: currentActiveRide.rider_phone || '',
          upiPayUrl: `upi://pay?pa=${encodeURIComponent(fallbackUpi)}&pn=${encodeURIComponent(fallbackName)}&am=15.00&tn=Papido_Driver_Compensation_${currentActiveRide.ride_code || 'Trip'}&cu=INR`
        };
        setPendingPenalty(fallbackObj);
        setShowPenaltyModal(true);
      } else {
        setStatusMessage('Ride cancelled.');
      }
    } catch (err) {
      alert(err.message || 'Failed to cancel ride.');
    }
  };

  // 7b. Claim ₹15 Cancellation Fee Paid to Driver
  const handleSettlePenalty = async () => {
    if (!pendingPenalty) return;
    setSettlingPenalty(true);
    try {
      const res = await apiRequest(`/customer/penalties/${pendingPenalty.id}/claim-paid`, 'POST', {
        paymentReference: `CLAIMED_VIA_APP_${Date.now()}`
      }, token);
      setPendingPenalty(prev => ({
        ...prev,
        ...(res.data || {}),
        status: 'PENDING_DRIVER_CONFIRMATION'
      }));
      setStatusMessage('Payment notification sent to driver. Waiting for driver confirmation...');
    } catch (err) {
      alert(err.message || 'Failed to submit payment confirmation to driver.');
    } finally {
      setSettlingPenalty(false);
    }
  };

  // 8. Handle Submit Rating
  // 8. Handle Submit Rating & Skip Rating
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

  // 9. Fetch Ride History
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

  // 10. Handle Outside Campus Trip Submission
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

  // 11. Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileUpdating(true);
    setProfileFeedback(null);
    try {
      await updateProfile({
        name: profileName,
        phone: profilePhone,
        gender: profileGender
      });
      setProfileFeedback({ type: 'success', msg: 'Profile details saved successfully!' });
    } catch (err) {
      setProfileFeedback({ type: 'error', msg: err.message || 'Failed to update profile.' });
    } finally {
      setProfileUpdating(false);
    }
  };

  // 12. Password Change
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

  return (
    <div className="theme-orange-beige" style={{ minHeight: '100vh', background: '#FAF5EE', color: '#271E16', display: 'flex', flexDirection: 'column' }}>
      {/* Top Passenger Web Navigation Header */}
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
            <div style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
              PAPIDO <span style={{ fontSize: '11px', background: 'rgba(249, 115, 22, 0.25)', color: '#FB923C', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(249, 115, 22, 0.4)' }}>PASSENGER WEB</span>
            </div>
            <div style={{ fontSize: '11px', color: '#A8998A' }}>Pondicherry University Campus Mobility</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-scrollable-tabs" style={{ background: '#2D2319', borderColor: '#43362A' }}>
          <a
            href="/passenger/book"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange('book');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'book' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'book' ? '#FFFFFF' : '#D6C7B2',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <Bike size={16} /> Book Ride
          </a>
          <a
            href="/passenger/outside"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange('outside');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'outside' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'outside' ? '#FFFFFF' : '#D6C7B2',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <Compass size={16} /> Outside Trips
          </a>
          <a
            href="/passenger/rides"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange('history');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'history' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'history' ? '#FFFFFF' : '#D6C7B2',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <History size={16} /> My Rides
          </a>
          <a
            href="/passenger/profile"
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
            <User size={16} /> Profile & Security
          </a>
        </div>

        {/* User Chip & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{user?.name || 'Passenger'}</div>
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

      {/* Status Message Banner (if active) */}
      {statusMessage && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
          padding: '8px 24px',
          fontSize: '13px',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>{statusMessage}</div>
          <button
            onClick={() => setStatusMessage(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Body View Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* ============================================================ */}
        {/* TAB 1: BOOK RIDE & LIVE TRIP TRACKING */}
        {/* ============================================================ */}
        {currentTab === 'book' && (
          <div className="portal-split-layout">
            {/* Left Booking / Active Trip Panel */}
            <div className="portal-content-pane">
              {/* If NO Active Ride: Show Booking Engine */}
              {!activeRide && (
                <>
                  {/* Persistent Unpaid Driver Compensation Fee Notice */}
                  {pendingPenalty && (
                    <div style={{
                      background: '#FEF2F2',
                      border: '1.5px solid #FCA5A5',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          background: '#FEE2E2',
                          color: '#DC2626',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <AlertTriangle size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B' }}>
                            Unpaid ₹15 Driver Compensation (Ride #{pendingPenalty.ride_code || 'Cancelled'})
                          </div>
                          <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>
                            Settle directly to driver ({pendingPenalty.rider_name || 'Driver'}) via UPI to unlock new ride requests.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPenaltyModal(true)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        Pay ₹15 Now
                      </button>
                    </div>
                  )}

                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>Book a Campus Ride</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Affordable & instant rides across Pondicherry University</p>
                  </div>

                  {/* Pickup Campus Stop Selection */}
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#271E16', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={15} color="#10B981" /> Pickup Location
                    </label>
                    <select
                      className="form-input form-select"
                      style={{ background: '#F8F3EC', border: '1.5px solid #E8DCCB', fontWeight: 600, color: '#1C1917' }}
                      value={pickupAddress}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPickupAddress(val);
                        const coords = findStopCoords(val);
                        if (coords) {
                          setPickupCoords(coords);
                        }
                      }}
                    >
                      {adminStops && adminStops.length > 0 ? (
                        adminStops.map((stopName, i) => (
                          <option key={`p-stop-${i}`} value={stopName}>
                            {stopName}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No pickup locations added by Admin</option>
                      )}
                    </select>

                    {/* Dynamic specific spot input */}
                    {getLocationHint(pickupAddress) && (
                      <div style={{ marginTop: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#C2410C', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          {getLocationHint(pickupAddress).label}
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ background: '#FFFFFF', border: '1.5px solid #FDBA74', fontSize: '13px', padding: '8px 12px' }}
                          placeholder={getLocationHint(pickupAddress).placeholder}
                          value={pickupDetail}
                          onChange={(e) => setPickupDetail(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Via / Add Stop Button or Stop Selector */}
                  {!showViaStop ? (
                    <div style={{ margin: '-6px 0 10px 0' }}>
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
                        style={{
                          background: '#FFF7ED',
                          border: '1.5px dashed #F97316',
                          color: '#EA580C',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Plus size={14} /> Add Via / Intermediate Stop
                      </button>
                    </div>
                  ) : (
                    <div className="form-group" style={{ background: '#FFF7ED', padding: '12px', borderRadius: '10px', border: '1.5px solid #FDBA74' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="form-label" style={{ color: '#9A3412', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <MapPin size={15} color="#F59E0B" /> Via Stop (Intermediate Stop)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowViaStop(false);
                            setViaAddress('');
                            setViaDetail('');
                            setViaCoords(null);
                          }}
                          style={{
                            background: '#FEE2E2',
                            border: '1px solid #FCA5A5',
                            color: '#DC2626',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <X size={12} /> Remove Stop
                        </button>
                      </div>

                      <select
                        className="form-input form-select"
                        style={{ background: '#FFFFFF', border: '1.5px solid #FDBA74', fontWeight: 600, color: '#1C1917' }}
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
                            <option key={`v-stop-${i}`} value={stopName}>
                              {stopName}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>No locations available</option>
                        )}
                      </select>

                      <div style={{ marginTop: '6px' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ background: '#FFFFFF', border: '1px solid #FED7AA', fontSize: '12px', padding: '6px 10px' }}
                          placeholder="Specific spot / room at via stop (optional)..."
                          value={viaDetail}
                          onChange={(e) => setViaDetail(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Drop-off Campus Destination Selection */}
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#271E16', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={15} color="#EA580C" /> Drop-off Destination
                    </label>
                    <select
                      className="form-input form-select"
                      style={{ background: '#F8F3EC', border: '1.5px solid #E8DCCB', fontWeight: 600, color: '#1C1917' }}
                      value={destAddress}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDestAddress(val);
                        const coords = findStopCoords(val);
                        if (coords) {
                          setDestCoords(coords);
                        }
                      }}
                    >
                      {adminStops && adminStops.length > 0 ? (
                        adminStops.map((stopName, i) => (
                          <option key={`d-stop-${i}`} value={stopName}>
                            {stopName}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No drop-off locations added by Admin</option>
                      )}
                    </select>

                    {/* Dynamic specific spot input */}
                    {getLocationHint(destAddress) && (
                      <div style={{ marginTop: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#C2410C', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          {getLocationHint(destAddress).label}
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ background: '#FFFFFF', border: '1.5px solid #FDBA74', fontSize: '13px', padding: '8px 12px' }}
                          placeholder={getLocationHint(destAddress).placeholder}
                          value={destDetail}
                          onChange={(e) => setDestDetail(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Waiting Policy & Multi-Stop Rules Information Box */}
                  <div style={{
                    background: 'rgba(249, 115, 22, 0.08)',
                    border: '1.5px dashed #FDBA74',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <div style={{
                      background: '#EA580C',
                      color: '#FFFFFF',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      <Clock size={13} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#9A3412', marginBottom: '3px' }}>
                        Waiting & Multi-Stop Rules Policy
                      </div>
                      <div style={{ fontSize: '11px', color: '#796D61', lineHeight: '1.45' }}>
                        • <strong>Waiting Charges:</strong> First 9 minutes are free. ₹10 is automatically added for every 10 full minutes of waiting (e.g. 10 mins = +₹10, 20 mins = +₹20).<br />
                        • <strong>On Waiting:</strong> Rider can activate the live waiting timer after trip start (e.g. at intermediate stops or customer request).
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Type Selection */}
                  <div>
                    <label className="form-label" style={{ color: '#271E16', fontWeight: 700 }}>Vehicle Type Preference</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setVehicleType('ANY')}
                        style={{
                          padding: '10px 6px',
                          borderRadius: '10px',
                          border: vehicleType === 'ANY' ? '2px solid #F97316' : '1.5px solid #E8DCCB',
                          background: vehicleType === 'ANY' ? '#FFFFFF' : '#F8F3EC',
                          color: vehicleType === 'ANY' ? '#EA580C' : '#796D61',
                          boxShadow: vehicleType === 'ANY' ? '0 2px 8px rgba(249, 115, 22, 0.2)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 700,
                          fontSize: '12px',
                          textAlign: 'center'
                        }}
                      >
                        <Zap size={20} />
                        <span>Any (Fastest)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVehicleType('BIKE')}
                        style={{
                          padding: '10px 6px',
                          borderRadius: '10px',
                          border: vehicleType === 'BIKE' ? '2px solid #F97316' : '1.5px solid #E8DCCB',
                          background: vehicleType === 'BIKE' ? '#FFFFFF' : '#F8F3EC',
                          color: vehicleType === 'BIKE' ? '#EA580C' : '#796D61',
                          boxShadow: vehicleType === 'BIKE' ? '0 2px 8px rgba(249, 115, 22, 0.2)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 700,
                          fontSize: '12px',
                          textAlign: 'center'
                        }}
                      >
                        <Bike size={20} />
                        <span>Bike</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVehicleType('SCOOTER')}
                        style={{
                          padding: '10px 6px',
                          borderRadius: '10px',
                          border: vehicleType === 'SCOOTER' ? '2px solid #F97316' : '1.5px solid #E8DCCB',
                          background: vehicleType === 'SCOOTER' ? '#FFFFFF' : '#F8F3EC',
                          color: vehicleType === 'SCOOTER' ? '#EA580C' : '#796D61',
                          boxShadow: vehicleType === 'SCOOTER' ? '0 2px 8px rgba(249, 115, 22, 0.2)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 700,
                          fontSize: '12px',
                          textAlign: 'center'
                        }}
                      >
                        <Compass size={20} />
                        <span>Scooter</span>
                      </button>
                    </div>
                  </div>

                  {/* Safety & Preferences Toggles */}
                  <div style={{ background: '#F8F3EC', border: '1px solid #E8DCCB', padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Female Rider Preference: ONLY visible and accessible to FEMALE customers to prevent misuse */}
                    {(user?.gender || '').toUpperCase() === 'FEMALE' && (
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #E8DCCB', paddingBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Shield size={16} color="#EC4899" />
                          <span style={{ color: '#BE185D', fontWeight: 700 }}>Female Rider Only (Lady Driver)</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={femaleRiderOnly}
                          onChange={(e) => setFemaleRiderOnly(e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: '#EC4899' }}
                        />
                      </label>
                    )}

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '13px', color: '#271E16' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={16} color="#EA580C" />
                        <span style={{ fontWeight: 600 }}>Double Ride (2 Passengers)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isDoubleRide}
                        onChange={(e) => setIsDoubleRide(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#EA580C' }}
                      />
                    </label>
                  </div>

                  {/* Estimated Fare Box */}
                  <div style={{
                    background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)',
                    border: '1.5px solid #FDBA74',
                    borderRadius: '14px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.1)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <span style={{ fontSize: '13px', color: '#796D61', fontWeight: 600 }}>Total Trip Fare:</span>
                        {fareEstimate?.isRouteBased && (
                          <div style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <MapPin size={12} /> {fareEstimate.routeName || 'Configured Campus Route'}
                          </div>
                        )}
                        {isDoubleRide && (
                          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Users size={12} /> Double Ride (₹10 Discount Applied)
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '28px', fontWeight: 900, color: '#EA580C' }}>
                        {estimating ? '...' : `₹${fareEstimate?.estimatedFare || (isDoubleRide ? 30 : 20)}`}
                      </span>
                    </div>

                    {fareEstimate?.appliedRuleDescription && (
                      <div style={{
                        marginTop: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#EA580C',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Tag size={13} color="#EA580C" />
                        <span>{fareEstimate.appliedRuleDescription}</span>
                      </div>
                    )}

                    <div style={{ fontSize: '11px', color: '#796D61', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #FED7AA', paddingTop: '8px', marginTop: '6px' }}>
                      <span>Pricing: {fareEstimate?.isRouteBased ? `Campus Route Fare (₹${fareEstimate.singleFare || fareEstimate.estimatedFare})` : (isDoubleRide ? `(₹${fareEstimate?.singleFare || 20} × 2) - ₹10` : 'Standard Distance Fare')}</span>
                      <span style={{ fontWeight: 700 }}>Cash on Drop</span>
                    </div>
                  </div>

                  {/* Request Button */}
                  <button
                    type="button"
                    disabled={bookingLoading || !pickupAddress || !destAddress}
                    onClick={handleRequestRide}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '14px', fontWeight: 800, fontSize: '15px' }}
                  >
                    {bookingLoading ? 'Requesting Ride...' : 'Request Campus Ride Now'}
                  </button>
                </>
              )}

              {/* If Active Ride Exists: Show Live Status & Tracker OR Thank You & Feedback Form */}
              {activeRide && (
                activeRide.status === 'COMPLETED' ? (
                  /* ======================================================= */
                  /* THANK YOU & DRIVER FEEDBACK SCREEN ON COMPLETION */
                  /* ======================================================= */
                  <div style={{
                    background: '#FFFFFF',
                    border: '2px solid #10B981',
                    borderRadius: '16px',
                    padding: '28px 20px',
                    textAlign: 'center',
                    boxShadow: '0 8px 30px rgba(16, 185, 129, 0.12)',
                    animation: 'fadeIn 0.3s ease-in-out'
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                      color: '#059669'
                    }}>
                      <CheckCircle2 size={32} />
                    </div>

                    <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#1C1917', marginBottom: '6px' }}>
                      Thank you for riding with Papido!
                    </h3>
                    <p style={{ fontSize: '13px', color: '#44403C', lineHeight: '1.5', marginBottom: '16px' }}>
                      We hope you had a pleasant campus journey. Please contact us again or book anytime for your next ride.
                    </p>

                    {/* Driver & Fare Summary Box */}
                    <div style={{
                      background: '#F8F3EC',
                      border: '1px solid #E8DCCB',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      textAlign: 'left',
                      marginBottom: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#796D61', fontWeight: 700, textTransform: 'uppercase' }}>
                          Trip #{activeRide.id || activeRide.ride_code}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917' }}>
                          Driver: {activeRide.rider_name || 'Campus Rider'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#796D61' }}>
                          {activeRide.pickup_address} → {activeRide.destination_address}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#796D61', fontWeight: 700 }}>
                          Fare Paid
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#EA580C' }}>
                          ₹{activeRide.final_fare || activeRide.total_fare || activeRide.estimated_fare || 20}
                        </div>
                      </div>
                    </div>

                    {!ratingSubmitted ? (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1C1917', marginBottom: '8px' }}>
                          Rate your ride experience:
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '6px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={30}
                              onClick={() => setRatingVal(star)}
                              style={{
                                cursor: 'pointer',
                                fill: star <= ratingVal ? '#F59E0B' : 'none',
                                color: '#F59E0B',
                                transition: 'transform 0.15s ease'
                              }}
                            />
                          ))}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#D97706', marginBottom: '14px' }}>
                          {ratingVal === 5 && '5 Stars - Excellent'}
                          {ratingVal === 4 && '4 Stars - Very Good'}
                          {ratingVal === 3 && '3 Stars - Good'}
                          {ratingVal === 2 && '2 Stars - Fair'}
                          {ratingVal === 1 && '1 Star - Poor'}
                        </div>

                        <input
                          type="text"
                          placeholder="Write brief feedback about your driver (optional)..."
                          className="form-input"
                          style={{ width: '100%', marginBottom: '14px', background: '#F8F3EC', border: '1.5px solid #E8DCCB' }}
                          value={ratingReview}
                          onChange={(e) => setRatingReview(e.target.value)}
                        />

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={handleSkipRating}
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '12px', fontWeight: 700 }}
                          >
                            Skip
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmitRating}
                            disabled={submittingRating}
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '12px', fontWeight: 800 }}
                          >
                            {submittingRating ? 'Submitting...' : 'Submit Feedback'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', color: '#059669', fontWeight: 800, fontSize: '13px' }}>
                        Thank you! Your feedback has been recorded for this rider.
                      </div>
                    )}

                    {/* Contact Us / Support Help */}
                    <div style={{
                      marginTop: '18px',
                      paddingTop: '12px',
                      borderTop: '1px solid #E8DCCB',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: '#796D61'
                    }}>
                      <span>Questions or lost items?</span>
                      <a
                        href="tel:9876543210"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 700,
                          color: '#EA580C',
                          textDecoration: 'none'
                        }}
                      >
                        <Phone size={12} /> Contact Dispatch
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={handleSkipRating}
                      className="btn btn-secondary"
                      style={{ width: '100%', marginTop: '12px', padding: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Bike size={16} /> Book Another Campus Ride
                    </button>
                  </div>
                ) : (
                  /* ======================================================= */
                  /* IN-PROGRESS ACTIVE TRIP STATUS & TRACKER */
                  /* ======================================================= */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>Live Trip Status</h2>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Ride ID #{activeRide.id} • {activeRide.pickup_address} → {activeRide.destination_address}
                      </p>
                    </div>

                    {/* Status Banner */}
                    <div style={{
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid var(--primary)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: 'var(--primary)', marginBottom: '4px' }}>
                        STATUS: {activeRide.status}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {activeRide.status === 'PENDING_ADMIN_QUOTE' && <><Clock size={18} /> Submitted to Dispatch — Admin is setting the fare & assigning a rider.</>}
                        {activeRide.status === 'REQUESTED' && <><Search size={18} /> Searching for nearby riders...</>}
                        {activeRide.status === 'ACCEPTED' && <><CheckCircle size={18} /> Rider accepted your trip!</>}
                        {activeRide.status === 'RIDER_ARRIVING' && <><Bike size={18} /> Rider is arriving at your pickup spot.</>}
                        {activeRide.status === 'RIDER_REACHED' && <><MapPin size={18} /> Rider has reached pickup point!</>}
                        {activeRide.status === 'STARTED' && <><Navigation size={18} /> Trip in progress to destination...</>}
                      </div>
                    </div>

                    {/* Live Driver On Waiting Alert Banner */}
                    {Boolean(activeRide.is_waiting) && (
                      <div style={{
                        background: 'rgba(234, 88, 12, 0.12)',
                        border: '1.5px solid #EA580C',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            background: '#EA580C',
                            color: '#FFFFFF',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Clock size={15} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '13px', color: '#EA580C' }}>
                              Driver is Currently On Waiting
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Waiting Duration: <strong>{activeRide.waiting_minutes || 0} mins</strong> (+₹{activeRide.waiting_fare || 0} charge added)
                            </div>
                          </div>
                        </div>
                        <span className="badge badge-warning" style={{ fontWeight: 800, fontSize: '10px' }}>
                          ON WAITING
                        </span>
                      </div>
                    )}

                    {/* Customer Fare Card */}
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
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>FARE TO PAY DRIVER:</div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>
                          ₹{activeRide.total_fare || activeRide.final_fare || activeRide.estimated_fare || 20}
                        </div>
                        {Boolean(activeRide.waiting_fare > 0) && (
                          <div style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700, marginTop: '2px' }}>
                            Includes ₹{activeRide.waiting_fare} waiting charge ({activeRide.waiting_minutes || 0} mins)
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                          {activeRide.payment_method || 'CASH'} ON DROP
                        </span>
                        {activeRide.is_double_ride ? (
                          <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={12} /> Double Ride
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* 4-Digit Ride OTP Highlight (Crucial for passenger when rider reaches) */}
                    {['ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED'].includes(activeRide.status) && (activeRide.otp || activeRide.otp_code) && (
                      <div style={{
                        background: 'var(--bg-sidebar)',
                        border: '2px dashed var(--primary)',
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Share this 4-digit Ride OTP with your driver:
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '8px', color: 'var(--primary)' }}>
                          {activeRide.otp || activeRide.otp_code}
                        </div>
                      </div>
                    )}

                    {/* Assigned Driver Card (If accepted) */}
                    {activeRide.rider_name && (
                      <div style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '44px',
                              height: '44px',
                              background: '#06B6D4',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800
                            }}>
                              <Bike size={22} color="#FFFFFF" />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '15px' }}>{activeRide.rider_name}</div>
                              {!(activeRide.rider_is_core || activeRide.is_core_member) && (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  {activeRide.rider_vehicle_model || activeRide.vehicle_model || 'Honda Activa 6G'} • {activeRide.rider_vehicle_number || activeRide.vehicle_number || 'PY 01 AB 1234'}
                                </div>
                              )}
                            </div>
                          </div>
                          {activeRide.rider_phone && (
                            <a
                              href={`tel:${activeRide.rider_phone}`}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                            >
                              <Phone size={14} /> Call
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Trip Route Details Card */}
                    <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div><strong>Pickup:</strong> {activeRide.pickup_address}</div>
                      {activeRide.via_address && (
                        <div style={{ color: '#EA580C' }}><strong>Via Stop:</strong> {activeRide.via_address}</div>
                      )}
                      <div><strong>Drop:</strong> {activeRide.destination_address}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                        <span>Fare: <strong>₹{activeRide.final_fare || activeRide.total_fare || activeRide.estimated_fare || 20}</strong></span>
                        <span>Payment: <strong>{activeRide.payment_method || 'CASH'}</strong></span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {['REQUESTED', 'ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED'].includes(activeRide.status) && (
                      <button
                        onClick={handleCancelRide}
                        className="btn btn-danger"
                        style={{ width: '100%', padding: '12px', fontWeight: 700 }}
                      >
                        Cancel Trip
                      </button>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Right Interactive Leaflet Campus Map */}
            <div className="portal-map-pane" ref={mapRef} />
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: OUTSIDE CAMPUS TRIPS (DIRECT TYPING) */}
        {/* ============================================================ */}
        {currentTab === 'outside' && (
          <div className="content-body" style={{ maxWidth: '680px', margin: '0 auto', width: '100%', padding: '24px 16px' }}>
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8DCCB', borderRadius: '16px', padding: '28px', boxShadow: '0 10px 30px rgba(234, 88, 12, 0.08)' }}>
              
              {/* Header */}
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1C1917', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={22} color="#EA580C" /> Outside Campus Ride Request
                </h2>
                <p style={{ fontSize: '13px', color: '#796D61', lineHeight: '1.5' }}>
                  Travel anywhere outside campus (e.g., White Town, Rock Beach, Bus Stand, JIPMER, Railway Station, or ECR). Type your pickup and destination below. Campus Admin will assign fair pricing and dispatch a rider.
                </p>
              </div>

              <form onSubmit={handleSubmitOutsideTrip} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Pickup Location or Google Maps Link Input */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                    <label className="form-label" style={{ color: '#271E16', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <MapPin size={15} color="#10B981" /> Pickup Location
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => openMapPicker('pickup')}
                        style={{
                          background: '#ECFDF5',
                          border: '1.5px solid #A7F3D0',
                          color: '#047857',
                          padding: '3px 9px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Compass size={12} color="#047857" /> Pick on Map
                      </button>
                      <a
                        href="https://www.google.com/maps"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        <ExternalLink size={11} /> Google Maps
                      </a>
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
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
                      style={{ background: '#F8F3EC', border: resolvingPickup ? '1.5px solid #F97316' : '1.5px solid #E8DCCB', fontSize: '13px', width: '100%' }}
                    />
                    {resolvingPickup && (
                      <div style={{ position: 'absolute', right: '12px', top: '12px', color: '#F97316', display: 'flex', alignItems: 'center' }}>
                        <RefreshCw size={14} className="animate-spin" />
                      </div>
                    )}
                  </div>

                  {resolvingPickup && (
                    <div style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={12} className="animate-spin" /> Fetching location name from Google Maps link...
                    </div>
                  )}

                  {!resolvingPickup && resolvedPickupBadge && (
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} color="#059669" /> Location Identified: <strong>{resolvedPickupBadge}</strong>
                    </div>
                  )}
                </div>

                {/* Drop-off Destination or Google Maps Link Input */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                    <label className="form-label" style={{ color: '#271E16', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <MapPin size={15} color="#EA580C" /> Drop-off Destination
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => openMapPicker('dest')}
                        style={{
                          background: '#FFF7ED',
                          border: '1.5px solid #FDBA74',
                          color: '#EA580C',
                          padding: '3px 9px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Compass size={12} color="#EA580C" /> Pick on Map
                      </button>
                      <a
                        href="https://www.google.com/maps"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        <ExternalLink size={11} /> Google Maps
                      </a>
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
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
                      style={{ background: '#F8F3EC', border: resolvingDest ? '1.5px solid #F97316' : '1.5px solid #E8DCCB', fontSize: '13px', width: '100%' }}
                    />
                    {resolvingDest && (
                      <div style={{ position: 'absolute', right: '12px', top: '12px', color: '#F97316', display: 'flex', alignItems: 'center' }}>
                        <RefreshCw size={14} className="animate-spin" />
                      </div>
                    )}
                  </div>

                  {resolvingDest && (
                    <div style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={12} className="animate-spin" /> Fetching location name from Google Maps link...
                    </div>
                  )}

                  {!resolvingDest && resolvedDestBadge && (
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} color="#059669" /> Location Identified: <strong>{resolvedDestBadge}</strong>
                    </div>
                  )}
                </div>

                {/* Vehicle Preference */}
                <div>
                  <label className="form-label" style={{ color: '#271E16', fontWeight: 700 }}>Vehicle Preference</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setOutsideVehicleType('ANY')}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '10px',
                        border: outsideVehicleType === 'ANY' ? '2px solid #F97316' : '1.5px solid #E8DCCB',
                        background: outsideVehicleType === 'ANY' ? '#FFFFFF' : '#F8F3EC',
                        color: outsideVehicleType === 'ANY' ? '#EA580C' : '#796D61',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                        fontSize: '13px',
                        boxShadow: outsideVehicleType === 'ANY' ? '0 2px 8px rgba(249, 115, 22, 0.2)' : 'none'
                      }}
                    >
                      <Zap size={20} />
                      <span>Any (Fastest)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutsideVehicleType('BIKE')}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '10px',
                        border: outsideVehicleType === 'BIKE' ? '2px solid #F97316' : '1.5px solid #E8DCCB',
                        background: outsideVehicleType === 'BIKE' ? '#FFFFFF' : '#F8F3EC',
                        color: outsideVehicleType === 'BIKE' ? '#EA580C' : '#796D61',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                        fontSize: '13px',
                        boxShadow: outsideVehicleType === 'BIKE' ? '0 2px 8px rgba(249, 115, 22, 0.2)' : 'none'
                      }}
                    >
                      <Bike size={20} />
                      <span>Bike</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutsideVehicleType('SCOOTER')}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '10px',
                        border: outsideVehicleType === 'SCOOTER' ? '2px solid #F97316' : '1.5px solid #E8DCCB',
                        background: outsideVehicleType === 'SCOOTER' ? '#FFFFFF' : '#F8F3EC',
                        color: outsideVehicleType === 'SCOOTER' ? '#EA580C' : '#796D61',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                        fontSize: '13px',
                        boxShadow: outsideVehicleType === 'SCOOTER' ? '0 2px 8px rgba(249, 115, 22, 0.2)' : 'none'
                      }}
                    >
                      <Compass size={20} />
                      <span>Scooter</span>
                    </button>
                  </div>
                </div>

                {/* Info Note */}
                <div style={{ background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: '12px', padding: '12px 14px', fontSize: '12px', color: '#9A3412', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} />
                  <span>Once submitted, Campus Dispatch sets the fair fare quote based on distance. You can review and confirm before the driver starts.</span>
                </div>

                {/* Submit Request Button */}
                <button
                  type="submit"
                  disabled={submittingOutside || !outsidePickup.trim() || !outsideDest.trim()}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', fontWeight: 800, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
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
        {/* TAB 3: RIDE HISTORY */}
        {/* ============================================================ */}
        {currentTab === 'history' && (
          <div className="content-body" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>My Campus Ride History</h2>
            {loadingHistory ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading past rides...</div>
            ) : pastRides.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                No past rides found. Book your first campus bike ride today!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pastRides.map((r) => (
                  <div key={r.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>{r.pickup_address} → {r.destination_address}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {new Date(r.created_at).toLocaleString()} • Rider: {r.rider_name || 'N/A'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                        ₹{r.total_fare || r.final_fare || r.estimated_fare || 20}
                      </div>
                      <span className={`badge ${r.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: PROFILE & SECURITY */}
        {/* ============================================================ */}
        {currentTab === 'profile' && (
          <div className="content-body" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Passenger Profile Settings</h2>

              {profileFeedback && (
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  background: profileFeedback.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                  color: profileFeedback.type === 'success' ? '#10B981' : '#F43F5E',
                  fontSize: '13px'
                }}>
                  {profileFeedback.msg}
                </div>
              )}

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-input"
                    value={profileGender}
                    onChange={(e) => setProfileGender(e.target.value)}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={profileUpdating}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontWeight: 700 }}
                >
                  {profileUpdating ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>

              <hr style={{ borderColor: 'var(--border)', margin: '24px 0' }} />

              {/* Security & Password Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '15px' }}>Account Password</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Update your secret login password</p>
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
              <Lock size={18} color="var(--primary)" /> Change Account Password
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

      {/* Interactive Map Location Picker Modal */}
      {showMapPicker && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            background: '#FAF5EE',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            border: '1.5px solid #E8DCCB'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1.5px solid #E8DCCB',
              background: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#271E16', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} color="#EA580C" />
                  {mapPickerTarget === 'pickup' ? 'Select Pickup Point on Map' : 'Select Destination on Map'}
                </h3>
                <p style={{ fontSize: '12px', color: '#796D61', margin: '2px 0 0 0' }}>
                  Type in search bar, tap a quick spot, or drag pin anywhere in Pondicherry
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapPicker(false)}
                style={{ background: '#F3ECE2', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#796D61' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Bar & Autocomplete Dropdown */}
            <div style={{ padding: '14px 20px', background: '#FFFFFF', borderBottom: '1px solid #E8DCCB', position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#796D61' }} />
                <input
                  type="text"
                  placeholder="Search place, beach, station, hostel, cafe (e.g. Rock Beach, JIPMER, Auroville)..."
                  className="form-input"
                  style={{
                    paddingLeft: '36px',
                    paddingRight: '36px',
                    width: '100%',
                    background: '#F8F3EC',
                    border: '1.5px solid #E8DCCB',
                    fontSize: '13px',
                    color: '#271E16'
                  }}
                  value={pickerSearchQuery}
                  onChange={(e) => setPickerSearchQuery(e.target.value)}
                />
                {searchingPlaces && (
                  <div style={{ position: 'absolute', right: '12px', top: '12px', color: '#EA580C' }}>
                    <RefreshCw size={14} className="animate-spin" />
                  </div>
                )}
                {pickerSearchQuery && !searchingPlaces && (
                  <button
                    type="button"
                    onClick={() => { setPickerSearchQuery(''); setPickerSearchResults([]); }}
                    style={{ position: 'absolute', right: '10px', top: '10px', background: 'transparent', border: 'none', color: '#796D61', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Autocomplete Search Results Dropdown */}
              {pickerSearchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '20px',
                  right: '20px',
                  background: '#FFFFFF',
                  border: '1.5px solid #E8DCCB',
                  borderRadius: '10px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  zIndex: 99999,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                }}>
                  {pickerSearchResults.map((place, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        if (pickerLeafletMapRef.current && place.latitude && place.longitude) {
                          pickerLeafletMapRef.current.flyTo([place.latitude, place.longitude], 16);
                        }
                        updatePickerPin(place.latitude, place.longitude, place.name, place.address);
                        setPickerSearchQuery('');
                        setPickerSearchResults([]);
                      }}
                      style={{
                        padding: '10px 14px',
                        borderBottom: idx < pickerSearchResults.length - 1 ? '1px solid #F3ECE2' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FFF7ED'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                    >
                      <MapPin size={15} color="#EA580C" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#271E16' }}>{place.name}</div>
                        <div style={{ fontSize: '11px', color: '#796D61' }}>{place.address}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Spot Quick Chips */}
            <div style={{ padding: '8px 20px', background: '#F8F3EC', borderBottom: '1px solid #E8DCCB', display: 'flex', gap: '6px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#796D61', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                <Compass size={12} /> Popular:
              </span>
              {POPULAR_OUTSIDE_SPOTS.slice(0, 7).map((spot) => (
                <button
                  key={spot.name}
                  type="button"
                  onClick={() => {
                    if (pickerLeafletMapRef.current) {
                      pickerLeafletMapRef.current.flyTo([spot.lat, spot.lng], 15);
                    }
                    updatePickerPin(spot.lat, spot.lng, spot.name, spot.name);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '14px',
                    border: '1px solid #E8DCCB',
                    background: '#FFFFFF',
                    color: '#271E16',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#EA580C'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E8DCCB'}
                >
                  {spot.name.split('/')[0].trim()}
                </button>
              ))}
            </div>

            {/* Interactive Leaflet Map Container */}
            <div style={{ position: 'relative', flex: 1, minHeight: '340px' }}>
              <div ref={pickerMapContainerRef} style={{ width: '100%', height: '100%', minHeight: '340px' }} />
              
              {/* Map Helper Overlay */}
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(255, 255, 255, 0.92)',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #E8DCCB',
                fontSize: '11px',
                fontWeight: 700,
                color: '#271E16',
                zIndex: 999,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Navigation size={12} color="#EA580C" />
                <span>Tap or drag pin to position</span>
              </div>
            </div>

            {/* Selected Location Card & Confirm Bar */}
            <div style={{
              padding: '16px 20px',
              background: '#FFFFFF',
              borderTop: '1.5px solid #E8DCCB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap'
            }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ fontSize: '11px', color: '#796D61', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Selected {mapPickerTarget === 'pickup' ? 'Pickup Spot' : 'Destination'}</span>
                  {reverseGeocodingPicker && (
                    <span style={{ color: '#EA580C', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <RefreshCw size={10} className="animate-spin" /> Detecting address...
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#271E16', marginTop: '2px' }}>
                  {selectedPickerLocation.name}
                </div>
                {selectedPickerLocation.address && selectedPickerLocation.address !== selectedPickerLocation.name && (
                  <div style={{ fontSize: '11px', color: '#796D61', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedPickerLocation.address}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(false)}
                  className="btn btn-secondary"
                  style={{ padding: '10px 16px', fontWeight: 700, fontSize: '13px', background: '#F3ECE2', border: '1px solid #E8DCCB', color: '#796D61' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPickerLocation}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 20px',
                    fontWeight: 800,
                    fontSize: '13px',
                    background: 'linear-gradient(135deg, #F97316, #EA580C)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    boxShadow: '0 4px 14px rgba(234, 88, 12, 0.4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Set as {mapPickerTarget === 'pickup' ? 'Pickup' : 'Destination'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: PRE-CANCELLATION WARNING MODAL (When driver has already reached) */}
      {showCancelWarningModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            border: '2px solid #EF4444',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: '#FEE2E2',
                color: '#DC2626',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#1C1917' }}>
                  Driver Has Reached Your Location
                </h3>
                <p style={{ fontSize: '12px', color: '#796D61', margin: '2px 0 0 0' }}>
                  Confirmation required before cancelling
                </p>
              </div>
            </div>

            <div style={{
              background: '#FFF7ED',
              border: '1.5px solid #FDBA74',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '13px',
              color: '#9A3412',
              lineHeight: '1.5'
            }}>
              Your driver has already arrived at the pickup spot. Cancelling this ride now will apply a <strong>₹15 cancellation compensation charge</strong> payable directly to the driver's UPI account to compensate for fuel and waiting time.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowCancelWarningModal(false)}
                className="btn btn-secondary"
                style={{ padding: '12px', fontWeight: 700, fontSize: '13px', background: '#F3ECE2', border: '1px solid #E8DCCB', color: '#271E16' }}
              >
                Keep Ride
              </button>
              <button
                type="button"
                onClick={() => executeCancelRide('Cancelled by passenger after arrival')}
                className="btn btn-danger"
                style={{ padding: '12px', fontWeight: 800, fontSize: '13px', background: '#DC2626', color: '#FFFFFF' }}
              >
                Yes, Cancel (Pay ₹15)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: OUTSTANDING DRIVER COMPENSATION PENALTY PAYMENT MODAL */}
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
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              border: '2px solid #F97316',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    background: '#FFEDD5',
                    color: '#EA580C',
                    borderRadius: '50%',
                    width: '42px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <CreditCard size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#1C1917' }}>
                      Driver Compensation Fee
                    </h3>
                    <p style={{ fontSize: '12px', color: '#796D61', margin: '2px 0 0 0' }}>
                      Pay ₹15 directly to driver to unlock your account
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPenaltyModal(false)}
                  style={{ background: '#F3ECE2', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#796D61' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Amount & Beneficiary Banner */}
              <div style={{
                background: '#FFF7ED',
                border: '1.5px dashed #F97316',
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#796D61', fontWeight: 700, textTransform: 'uppercase' }}>Beneficiary Driver</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#271E16' }}>{riderName}</div>
                  {pendingPenalty.rider_phone && (
                    <div style={{ fontSize: '11px', color: '#796D61' }}>Phone: {pendingPenalty.rider_phone}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#796D61', fontWeight: 700, textTransform: 'uppercase' }}>Amount Due</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#EA580C' }}>₹15.00</div>
                </div>
              </div>

              {/* IF PENDING DRIVER CONFIRMATION: SHOW LIVE WAITING SCREEN */}
              {pendingPenalty.status === 'PENDING_DRIVER_CONFIRMATION' ? (
                <div style={{ textAlign: 'center', padding: '24px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    background: '#FEF3C7',
                    color: '#D97706',
                    borderRadius: '50%',
                    width: '64px',
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.2)'
                  }}>
                    <Clock size={32} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', color: '#92400E' }}>
                      Waiting for Driver Confirmation
                    </h4>
                    <p style={{ fontSize: '13px', color: '#78350F', margin: 0, lineHeight: 1.5, maxWidth: '400px' }}>
                      We have notified driver <strong>{riderName}</strong> on their device. As soon as they confirm receipt of ₹15 in their UPI app, this screen will automatically close and unlock your booking!
                    </p>
                  </div>
                  <div style={{
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#B45309',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <RefreshCw size={13} className="animate-spin" /> Live confirmation listener active
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingPenalty(prev => ({ ...prev, status: 'UNPAID' }))}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px', padding: '8px 16px', marginTop: '6px', background: '#F3ECE2', border: '1px solid #E8DCCB', color: '#271E16', fontWeight: 700 }}
                  >
                    Back to QR / Payment Options
                  </button>
                </div>
              ) : (
                <>
                  {/* Payment Mode Selector Tabs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: '#F3ECE2', padding: '4px', borderRadius: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setPenaltyPayMode('QR')}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: penaltyPayMode === 'QR' ? '#FFFFFF' : 'transparent',
                        color: penaltyPayMode === 'QR' ? '#EA580C' : '#796D61',
                        boxShadow: penaltyPayMode === 'QR' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <QrCode size={14} /> Scan QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setPenaltyPayMode('APPS')}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: penaltyPayMode === 'APPS' ? '#FFFFFF' : 'transparent',
                        color: penaltyPayMode === 'APPS' ? '#EA580C' : '#796D61',
                        boxShadow: penaltyPayMode === 'APPS' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <Smartphone size={14} /> UPI Apps
                    </button>
                    <button
                      type="button"
                      onClick={() => setPenaltyPayMode('UPI_ID')}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: penaltyPayMode === 'UPI_ID' ? '#FFFFFF' : 'transparent',
                        color: penaltyPayMode === 'UPI_ID' ? '#EA580C' : '#796D61',
                        boxShadow: penaltyPayMode === 'UPI_ID' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <CreditCard size={14} /> UPI ID
                    </button>
                  </div>

                  {/* TAB 1: DYNAMIC SCANNABLE QR CODE */}
                  {penaltyPayMode === 'QR' && (
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                      <div style={{ display: 'inline-block', padding: '10px', background: '#FFFFFF', borderRadius: '16px', border: '1.5px solid #E8DCCB', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                        <img
                          src={qrCodeUrl}
                          alt="Scan to Pay ₹15 via UPI"
                          style={{ width: '170px', height: '170px', display: 'block', borderRadius: '8px' }}
                        />
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#271E16', marginTop: '10px' }}>
                        Scan with ANY UPI App (GPay / PhonePe / Paytm / Cred)
                      </div>
                      <div style={{ fontSize: '11px', color: '#796D61', marginTop: '2px' }}>
                        Amount (₹15) and driver details are pre-filled automatically
                      </div>
                    </div>
                  )}

                  {/* TAB 2: 1-CLICK UPI APPS LAUNCH */}
                  {penaltyPayMode === 'APPS' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '6px 0' }}>
                      <a
                        href={upiUri}
                        className="btn btn-primary"
                        style={{
                          padding: '12px',
                          fontWeight: 800,
                          fontSize: '13px',
                          textAlign: 'center',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          background: 'linear-gradient(135deg, #10B981, #059669)',
                          color: '#FFFFFF'
                        }}
                      >
                        <ExternalLink size={16} /> Pay ₹15 with Any Installed UPI App
                      </a>
                      <a
                        href={`gpay://upi/pay?pa=${encodeURIComponent(riderUpi)}&pn=${encodeURIComponent(riderName)}&am=15.00&tn=Papido_Comp&cu=INR`}
                        className="btn btn-secondary"
                        style={{
                          padding: '10px',
                          fontWeight: 700,
                          fontSize: '13px',
                          textAlign: 'center',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          background: '#F3ECE2',
                          border: '1px solid #E8DCCB',
                          color: '#271E16'
                        }}
                      >
                        <Smartphone size={15} color="#2563EB" /> Google Pay
                      </a>
                      <a
                        href={`phonepe://pay?pa=${encodeURIComponent(riderUpi)}&pn=${encodeURIComponent(riderName)}&am=15.00&tn=Papido_Comp&cu=INR`}
                        className="btn btn-secondary"
                        style={{
                          padding: '10px',
                          fontWeight: 700,
                          fontSize: '13px',
                          textAlign: 'center',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          background: '#F3ECE2',
                          border: '1px solid #E8DCCB',
                          color: '#271E16'
                        }}
                      >
                        <Smartphone size={15} color="#7C3AED" /> PhonePe
                      </a>
                    </div>
                  )}

                  {/* TAB 3: COPY UPI ID */}
                  {penaltyPayMode === 'UPI_ID' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '6px 0' }}>
                      <div style={{ background: '#F8F3EC', padding: '14px', borderRadius: '12px', border: '1px solid #E8DCCB' }}>
                        <div style={{ fontSize: '11px', color: '#796D61', fontWeight: 600, marginBottom: '4px' }}>Driver UPI VPA Address:</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '15px', color: '#047857' }}>
                            {riderUpi}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="btn btn-secondary btn-sm"
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: copiedUpi ? '#D1FAE5' : '#FFFFFF',
                              color: copiedUpi ? '#065F46' : '#271E16',
                              border: '1px solid #E8DCCB'
                            }}
                          >
                            {copiedUpi ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                            {copiedUpi ? 'Copied!' : 'Copy UPI'}
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#796D61' }}>
                        Open your payment app, paste the UPI ID above, enter amount <strong>₹15.00</strong>, and complete transfer.
                      </div>
                    </div>
                  )}

                  {/* Confirm Paid & Notify Driver Button */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleSettlePenalty}
                      disabled={settlingPenalty}
                      className="btn btn-primary"
                      style={{
                        padding: '13px',
                        fontWeight: 800,
                        fontSize: '14px',
                        background: 'linear-gradient(135deg, #F97316, #EA580C)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 14px rgba(234, 88, 12, 0.4)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <CheckCircle2 size={18} />
                      {settlingPenalty ? 'Sending Claim to Driver...' : 'I Have Paid ₹15 to Driver'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPenaltyModal(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#796D61',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '6px'
                      }}
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
    </div>
  );
}
