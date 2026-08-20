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
  ExternalLink
} from 'lucide-react';

const DEFAULT_GROUPED_CAMPUS_STOPS = [
  {
    key: 'GIRLS_HOSTEL',
    label: 'Girls Hostels',
    icon: '👧',
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
    icon: '👦',
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
    icon: '🏛️',
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
    icon: '🚪',
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

export function CustomerPortalView() {
  const { user, token, logout, updateProfile, changePassword } = useAuth();
  const [currentTab, setCurrentTab] = useState('book'); // 'book', 'outside', 'history', 'profile'

  // Booking Form State & Interactive Map Picking
  const [activePinMode, setActivePinMode] = useState('pickup'); // 'pickup' or 'drop'
  const activePinModeRef = useRef('pickup');
  useEffect(() => {
    activePinModeRef.current = activePinMode;
  }, [activePinMode]);

  const [pickupAddress, setPickupAddress] = useState('PU Main Gate (Gate 1)');
  const [pickupCoords, setPickupCoords] = useState({ lat: 12.0228681, lng: 79.8509415 });
  const [destAddress, setDestAddress] = useState('Madame Curie Girls Hostel');
  const [destCoords, setDestCoords] = useState({ lat: 12.0215, lng: 79.8565 });
  const [vehicleType, setVehicleType] = useState('ANY');
  const [femaleRiderOnly, setFemaleRiderOnly] = useState(false);
  const [isDoubleRide, setIsDoubleRide] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

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

  // Ride Rating State
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Outside Trips
  const [outsidePickup, setOutsidePickup] = useState(CAMPUS_HOTSPOTS[0].name);
  const [outsidePickupCoords, setOutsidePickupCoords] = useState({ lat: CAMPUS_HOTSPOTS[0].lat, lng: CAMPUS_HOTSPOTS[0].lng });
  const [outsideDest, setOutsideDest] = useState(POPULAR_OUTSIDE_SPOTS[0].name);
  const [outsideDestCoords, setOutsideDestCoords] = useState({ lat: POPULAR_OUTSIDE_SPOTS[0].lat, lng: POPULAR_OUTSIDE_SPOTS[0].lng });
  const [outsideVehicleType, setOutsideVehicleType] = useState('ANY');
  const [outsideDoubleRide, setOutsideDoubleRide] = useState(false);
  const [outsideTripsList, setOutsideTripsList] = useState([]);
  const [submittingOutside, setSubmittingOutside] = useState(false);

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
        html: `<div style="background: #06B6D4; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; border: 3px solid white; box-shadow: 0 4px 12px rgba(6,182,212,0.6);">🏍️</div>`,
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

  // 4. Fetch Active Ride on Load
  const fetchActiveRide = async () => {
    try {
      setRideLoading(true);
      const res = await apiRequest('/customer/rides/active', 'GET', null, token);
      setActiveRide(res.data || null);
    } catch (err) {
      console.warn('Failed to fetch active ride:', err);
    } finally {
      setRideLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRide();
  }, [token]);

  // 5. Setup Socket.IO for Real-time Updates
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
      fetchActiveRide();
    });

    // Polling fallback every 3s
    const pollInterval = setInterval(() => {
      if (activeRide) {
        fetchActiveRide();
      }
    }, 3000);

    socket.on('ride:status_change', (data) => {
      console.log('Realtime ride status change:', data);
      const rideObj = data?.ride || data;
      if (rideObj) {
        const fare = rideObj.total_fare || rideObj.estimated_fare || rideObj.final_fare || 20;
        setActiveRide(prev => ({
          ...(prev || {}),
          ...rideObj,
          status: data.status || rideObj.status,
          total_fare: fare,
          estimated_fare: fare,
          final_fare: fare
        }));
      }
      fetchActiveRide();

      if (data.status === 'ACCEPTED') {
        setStatusMessage('A campus rider has accepted your trip!');
      } else if (data.status === 'RIDER_ARRIVING') {
        setStatusMessage('Rider is on the way to your pickup location.');
      } else if (data.status === 'RIDER_REACHED') {
        setStatusMessage('Rider has arrived! Share your 4-digit Ride OTP to start.');
      } else if (data.status === 'STARTED') {
        setStatusMessage('Trip started! On the way to destination.');
      } else if (data.status === 'COMPLETED') {
        setStatusMessage('Thank you for booking with Papido! Trip completed successfully.');
      }
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

    socket.on('rider:location_update', (loc) => {
      if (loc && loc.latitude && loc.longitude) {
        setDriverLocation({ lat: loc.latitude, lng: loc.longitude });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // 6. Handle Request Ride
  const handleRequestRide = async () => {
    if (!pickupCoords || !destCoords) {
      alert('Please select valid pickup and destination locations.');
      return;
    }

    setBookingLoading(true);
    const isFemaleCustomer = (user?.gender || '').toUpperCase() === 'FEMALE';
    try {
      const res = await apiRequest('/customer/rides', 'POST', {
        pickupLatitude: pickupCoords.lat,
        pickupLongitude: pickupCoords.lng,
        pickupAddress,
        destinationLatitude: destCoords.lat,
        destinationLongitude: destCoords.lng,
        destinationAddress: destAddress,
        vehicleType,
        femaleRiderOnly: isFemaleCustomer ? Boolean(femaleRiderOnly) : false,
        isDoubleRide,
        paymentMethod
      }, token);

      setActiveRide(res.data);
      setStatusMessage('Searching for available campus riders...');
    } catch (err) {
      alert(err.message || 'Failed to request ride.');
    } finally {
      setBookingLoading(false);
    }
  };

  // 7. Handle Cancel Ride
  const handleCancelRide = async () => {
    if (!activeRide) return;
    if (!window.confirm('Are you sure you want to cancel this ride request?')) return;

    try {
      await apiRequest(`/customer/rides/${activeRide.id}/cancel`, 'POST', {
        reason: 'Cancelled by passenger'
      }, token);
      setActiveRide(null);
      setStatusMessage('Ride cancelled.');
    } catch (err) {
      alert(err.message || 'Failed to cancel ride.');
    }
  };

  // 8. Handle Submit Rating
  const handleSubmitRating = async () => {
    if (!activeRide) return;
    try {
      await apiRequest(`/customer/rides/${activeRide.id}/rating`, 'POST', {
        rating: ratingVal,
        review: ratingReview
      }, token);
      setRatingSubmitted(true);
      setTimeout(() => {
        setActiveRide(null);
        setRatingSubmitted(false);
        setRatingReview('');
      }, 2000);
    } catch (err) {
      alert(err.message || 'Failed to submit rating.');
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
      setPassSuccess('✅ Password changed successfully!');
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
          <button
            onClick={() => setCurrentTab('book')}
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
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Bike size={16} /> Book Ride
          </button>
          <button
            onClick={() => setCurrentTab('outside')}
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
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Compass size={16} /> Outside Trips
          </button>
          <button
            onClick={() => setCurrentTab('history')}
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
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <History size={16} /> My Rides
          </button>
          <button
            onClick={() => setCurrentTab('profile')}
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
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <User size={16} /> Profile & Security
          </button>
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
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            ✕
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
                  </div>

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
                        margin: '6px 0 8px 0',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'rgba(249, 115, 22, 0.12)',
                        border: '1px solid rgba(249, 115, 22, 0.25)',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#EA580C',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>🏷️</span>
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

              {/* If Active Ride Exists: Show Live Status & Tracker */}
              {activeRide && (
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
                    background: activeRide.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    border: activeRide.status === 'COMPLETED' ? '1px solid #10B981' : '1px solid var(--primary)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: activeRide.status === 'COMPLETED' ? '#10B981' : 'var(--primary)', marginBottom: '4px' }}>
                      STATUS: {activeRide.status}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      {activeRide.status === 'PENDING_ADMIN_QUOTE' && <><Clock size={18} /> Submitted to Dispatch — Admin is setting the fare & assigning a rider.</>}
                      {activeRide.status === 'REQUESTED' && <><Search size={18} /> Searching for nearby riders...</>}
                      {activeRide.status === 'ACCEPTED' && <><CheckCircle size={18} /> Rider accepted your trip!</>}
                      {activeRide.status === 'RIDER_ARRIVING' && <><Bike size={18} /> Rider is arriving at your pickup spot.</>}
                      {activeRide.status === 'RIDER_REACHED' && <><MapPin size={18} /> Rider has reached pickup point!</>}
                      {activeRide.status === 'STARTED' && <><Navigation size={18} /> Trip in progress to destination...</>}
                      {activeRide.status === 'COMPLETED' && <><CheckCircle2 size={18} /> Trip Completed! Payment settled.</>}
                    </div>
                  </div>

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
                        ₹{activeRide.total_fare || activeRide.estimated_fare || activeRide.final_fare || 20}
                      </div>
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
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {activeRide.rider_vehicle_model || activeRide.vehicle_model || 'Honda Activa 6G'} • {activeRide.rider_vehicle_number || activeRide.vehicle_number || 'PY 01 AB 1234'}
                            </div>
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

                  {/* Thank you for booking with Papido Greeting Card on Completion */}
                  {activeRide.status === 'COMPLETED' && (
                    <div style={{
                      background: '#FFFFFF',
                      border: '2px solid #10B981',
                      borderRadius: '16px',
                      padding: '24px 20px',
                      textAlign: 'center',
                      boxShadow: '0 8px 30px rgba(16, 185, 129, 0.12)'
                    }}>
                      <div style={{
                        width: '52px',
                        height: '52px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                        color: '#059669'
                      }}>
                        <CheckCircle2 size={30} />
                      </div>

                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1C1917', marginBottom: '4px' }}>
                        Thank you for booking with Papido!
                      </h3>
                      <p style={{ fontSize: '12px', color: '#796D61', marginBottom: '16px' }}>
                        We hope you had a pleasant campus journey. Your feedback helps us keep campus mobility safe and swift.
                      </p>

                      {!ratingSubmitted ? (
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1C1917', marginBottom: '8px' }}>
                            Rate your ride experience:
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={26}
                                onClick={() => setRatingVal(star)}
                                style={{
                                  cursor: 'pointer',
                                  fill: star <= ratingVal ? '#F59E0B' : 'none',
                                  color: '#F59E0B'
                                }}
                              />
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Write brief feedback (optional)..."
                            className="form-input"
                            style={{ width: '100%', marginBottom: '10px', background: '#F8F3EC', border: '1.5px solid #E8DCCB' }}
                            value={ratingReview}
                            onChange={(e) => setRatingReview(e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveRide(null);
                                setRatingSubmitted(false);
                                setRatingReview('');
                              }}
                              className="btn btn-secondary"
                              style={{ flex: 1, padding: '10px', fontWeight: 700 }}
                            >
                              Skip
                            </button>
                            <button
                              type="button"
                              onClick={handleSubmitRating}
                              className="btn btn-primary"
                              style={{ flex: 1, padding: '10px', fontWeight: 800 }}
                            >
                              Submit Rating
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', color: '#059669', fontWeight: 700, fontSize: '13px' }}>
                          Thank you for your rating and feedback!
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setActiveRide(null);
                          setRatingSubmitted(false);
                          setRatingReview('');
                        }}
                        className="btn btn-secondary"
                        style={{ width: '100%', marginTop: '12px', padding: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Bike size={16} /> Book Another Campus Ride
                      </button>
                    </div>
                  )}
                </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="form-label" style={{ color: '#271E16', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <MapPin size={15} color="#10B981" /> Pickup Location or Google Maps Link
                    </label>
                    <a
                      href="https://www.google.com/maps"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <ExternalLink size={11} /> Open Google Maps
                    </a>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type pickup place OR paste Google Maps link (https://maps.app.goo.gl/...)"
                    value={outsidePickup}
                    onChange={(e) => setOutsidePickup(e.target.value)}
                    required
                    style={{ background: '#F8F3EC', border: '1.5px solid #E8DCCB', fontSize: '13px' }}
                  />
                  {outsidePickup && (outsidePickup.includes('maps.app.goo.gl') || outsidePickup.includes('google.com/maps') || outsidePickup.includes('goo.gl/maps')) && (
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} color="#059669" /> Google Maps Pin Link Detected
                    </div>
                  )}
                </div>

                {/* Drop-off Destination or Google Maps Link Input */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="form-label" style={{ color: '#271E16', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <MapPin size={15} color="#EA580C" /> Drop-off Destination or Google Maps Link
                    </label>
                    <a
                      href="https://www.google.com/maps"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: '#EA580C', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <ExternalLink size={11} /> Open Google Maps
                    </a>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type destination OR paste Google Maps link (https://maps.app.goo.gl/...)"
                    value={outsideDest}
                    onChange={(e) => setOutsideDest(e.target.value)}
                    required
                    style={{ background: '#F8F3EC', border: '1.5px solid #E8DCCB', fontSize: '13px' }}
                  />
                  {outsideDest && (outsideDest.includes('maps.app.goo.gl') || outsideDest.includes('google.com/maps') || outsideDest.includes('goo.gl/maps')) && (
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} color="#059669" /> Google Maps Pin Link Detected
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
    </div>
  );
}
