import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api';
import { usePassenger } from '../shared/PassengerContext';
import { PSSwitch } from '../shared/PassengerUI';
import { openCancelWarning, openPenaltyModal } from '../shared/PassengerModals';
import '../shared/PassengerModals.css';
import {
  CAMPUS_HOTSPOTS,
  formatRideDateTime,
  getLocationHint
} from '../shared/passengerConstants';
import {
  Bike, Zap, Compass, MapPin, Clock, Plus, X,
  Users, Shield, CreditCard, Check, Calendar, AlertTriangle, AlertCircle,
  Navigation, ArrowRight, ArrowUpDown, LocateFixed, Eye, VolumeX,
  Search, ChevronDown
} from 'lucide-react';

export function BookingForm({
  user, token,
  onBookingStart, onBookingEnd, bookingLoading,
  onRouteUpdate
}) {
  const {
    activeRide, setActiveRide, scheduledRides, fetchScheduledRides,
    setPendingPenalty, setStatusMessage, standardCampusFare
  } = usePassenger();

  /* ---------- Admin Routes & Stops (Source of Truth) ---------- */
  const [adminRoutes, setAdminRoutes] = useState([]);
  const [adminStops, setAdminStops] = useState([]);

  /* ---------- Pickup / Drop / Via ---------- */
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupSearchQuery, setPickupSearchQuery] = useState('');
  const [pickupMenuOpen, setPickupMenuOpen] = useState(false);
  const [pickupDetail, setPickupDetail] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);

  const [destAddress, setDestAddress] = useState('');
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [destMenuOpen, setDestMenuOpen] = useState(false);
  const [destDetail, setDestDetail] = useState('');
  const [destCoords, setDestCoords] = useState(null);

  const [showViaStop, setShowViaStop] = useState(false);
  const [viaAddress, setViaAddress] = useState('');
  const [viaSearchQuery, setViaSearchQuery] = useState('');
  const [viaMenuOpen, setViaMenuOpen] = useState(false);
  const [viaDetail, setViaDetail] = useState('');
  const [viaCoords, setViaCoords] = useState(null);

  const pickupWrapRef = useRef(null);
  const destWrapRef = useRef(null);
  const viaWrapRef = useRef(null);

  /* ---------- Transit Mode (ANY, BIKE, SCOOTER) + prefs ---------- */
  const [vehicleType, setVehicleType] = useState('ANY');
  const [femaleRiderOnly, setFemaleRiderOnly] = useState(false);
  const [isQuietRide, setIsQuietRide] = useState(false);
  const [isDoubleRide, setIsDoubleRide] = useState(false);

  /* ---------- Preference live availability & modal ---------- */
  const [prefAvailability, setPrefAvailability] = useState(null);
  const [checkingPref, setCheckingPref] = useState(false);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [preferenceModalData, setPreferenceModalData] = useState(null);

  /* ---------- Helpers for local date/time ---------- */
  const getLocalDateString = (d = new Date()) => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(d);
    } catch { return d.toISOString().slice(0, 10); }
  };

  const getInitialScheduleState = () => {
    const future = new Date(Date.now() + 3600000); // 1 hour ahead
    let h = future.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    const hourStr = String(h).padStart(2, '0');
    const m = future.getMinutes();
    const roundedM = m < 15 ? '15' : m < 30 ? '30' : m < 45 ? '45' : '00';
    return {
      date: getLocalDateString(future),
      hour: hourStr,
      minute: roundedM,
      ampm
    };
  };

  /* ---------- Mode + time ---------- */
  const getInitialBookingMode = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'schedule' || params.get('tab') === 'schedule') {
        return 'SCHEDULE';
      }
    } catch (_) {}
    return 'NOW';
  };

  const initialSchedule = getInitialScheduleState();
  const [bookingMode, setBookingMode] = useState(getInitialBookingMode);
  const [rideNowTimeOption, setRideNowTimeOption] = useState('NOW'); // 'NOW', '5MIN', '10MIN', '15MIN'
  const [scheduledDate, setScheduledDate] = useState(initialSchedule.date);
  const [scheduledHour, setScheduledHour] = useState(initialSchedule.hour);
  const [scheduledMinute, setScheduledMinute] = useState(initialSchedule.minute);
  const [scheduledAmPm, setScheduledAmPm] = useState(initialSchedule.ampm);

  /* Listen to browser history / query changes (e.g. navigation from Advance page) */
  useEffect(() => {
    const handleUrlMode = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'schedule' || params.get('tab') === 'schedule') {
          setBookingMode('SCHEDULE');
        } else if (params.get('mode') === 'now') {
          setBookingMode('NOW');
        }
      } catch (_) {}
    };
    handleUrlMode();
    window.addEventListener('popstate', handleUrlMode);
    return () => window.removeEventListener('popstate', handleUrlMode);
  }, []);

  /* ---------- Fare ---------- */
  const [fareEstimate, setFareEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);

  /* Load routes & stops strictly from active Admin configurations */
  const loadAdminRoutes = async () => {
    try {
      const routesRes = await apiRequest('/fares/routes', 'GET', null, token).catch(() => null);
      const active = Array.isArray(routesRes?.data) ? routesRes.data.filter(r => r.is_active) : [];
      setAdminRoutes(active);

      // ONLY stops added by admin in active route_fares must be shown
      const routeStops = Array.from(
        new Set(
          active.flatMap(r => [r.pickup_stop, r.destination_stop])
            .map(s => (s || '').trim())
            .filter(Boolean)
        )
      );
      setAdminStops(routeStops);
    } catch (err) {
      console.warn('Failed to fetch admin routes:', err);
      setAdminRoutes([]);
      setAdminStops([]);
    }
  };

  useEffect(() => {
    loadAdminRoutes();
    const id = setInterval(loadAdminRoutes, 15000);
    return () => clearInterval(id);
  }, [token]);

  /* Close floating dropdown menus when clicking outside */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickupWrapRef.current && !pickupWrapRef.current.contains(e.target)) {
        setPickupMenuOpen(false);
      }
      if (destWrapRef.current && !destWrapRef.current.contains(e.target)) {
        setDestMenuOpen(false);
      }
      if (viaWrapRef.current && !viaWrapRef.current.contains(e.target)) {
        setViaMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const findStopCoords = (name) => {
    if (!name) return { lat: 12.0228681, lng: 79.8509415 };
    const n = name.trim().toLowerCase();

    // Specific campus landmarks coordinates
    if (n.includes('gate 1') || n.includes('main gate')) return { lat: 12.0228681, lng: 79.8509415 };
    if (n.includes('gate 2') || n.includes('ecr')) return { lat: 12.0295, lng: 79.8580 };
    if (n.includes('sjc') || n.includes('silver jubilee')) return { lat: 12.0280, lng: 79.8520 };
    if (n.includes('girl')) return { lat: 12.0215, lng: 79.8565 };
    if (n.includes('boy')) return { lat: 12.0275, lng: 79.8515 };
    if (n.includes('library')) return { lat: 12.0245, lng: 79.8532 };
    if (n.includes('canteen') || n.includes('food')) return { lat: 12.0238, lng: 79.8541 };
    if (n.includes('science') || n.includes('physics')) return { lat: 12.0261, lng: 79.8550 };
    if (n.includes('management') || n.includes('som')) return { lat: 12.0255, lng: 79.8540 };

    const found = CAMPUS_HOTSPOTS.find(s => s.name.toLowerCase() === n);
    if (found) return { lat: found.lat, lng: found.lng };

    const partial = CAMPUS_HOTSPOTS.find(s =>
      s.name.toLowerCase().includes(n) || n.includes(s.name.toLowerCase())
    );
    if (partial) return { lat: partial.lat, lng: partial.lng };

    return { lat: 12.0228681, lng: 79.8509415 };
  };

  /* Find Admin Route between two stops (respecting bidirectionality) */
  const getAdminRouteBetween = (from, to) => {
    if (!from || !to) return null;
    const f = from.trim().toLowerCase();
    const t = to.trim().toLowerCase();
    if (f === t) return null;
    return adminRoutes.find(r =>
      (r.pickup_stop?.trim().toLowerCase() === f && r.destination_stop?.trim().toLowerCase() === t) ||
      (r.is_bidirectional && r.destination_stop?.trim().toLowerCase() === f && r.pickup_stop?.trim().toLowerCase() === t)
    );
  };

  /* Exact Admin Route matching */
  const matchedAdminRoute = getAdminRouteBetween(pickupAddress, destAddress);

  const adminRouteFare = matchedAdminRoute ? parseFloat(matchedAdminRoute.fare_amount) : null;
  const adminRouteDist = matchedAdminRoute ? parseFloat(matchedAdminRoute.distance_km) : null;

  /* Route validation: both selected and distinct */
  const isRouteReady = Boolean(
    pickupAddress &&
    destAddress &&
    pickupAddress.trim().toLowerCase() !== destAddress.trim().toLowerCase()
  );

  /* Synchronized Fare Calculation strictly from Admin route */
  const baseSingleFare = adminRouteFare !== null
    ? adminRouteFare
    : (fareEstimate?.estimatedFare || standardCampusFare || 25);

  const currentFare = isDoubleRide
    ? Math.max(baseSingleFare, (baseSingleFare * 2) - 10)
    : baseSingleFare;

  const displayDistance = adminRouteDist !== null
    ? adminRouteDist
    : (fareEstimate?.distanceKm || 1.8);

  const displayDuration = fareEstimate?.durationMinutes || Math.round((displayDistance / 25) * 60) || 4;

  /* Fare estimate from backend - runs when route is selected */
  useEffect(() => {
    const run = async () => {
      if (!isRouteReady || !pickupCoords || !destCoords) {
        setFareEstimate(null);
        return;
      }
      setEstimating(true);
      try {
        const res = await apiRequest('/fares/estimate', 'POST', {
          pickupLatitude: pickupCoords.lat, pickupLongitude: pickupCoords.lng,
          pickupAddress, destinationAddress: destAddress,
          vehicleType, isDoubleRide
        }, token);
        if (res?.data) {
          setFareEstimate(res.data);
        }
      } catch {
        /* silent - synced admin route fallback active */
      } finally {
        setEstimating(false);
      }
    };
    run();
  }, [isRouteReady, pickupCoords, destCoords, pickupAddress, destAddress, vehicleType, isDoubleRide, token]);

  /* Broadcast real synced route to LiveRadarCard and page */
  useEffect(() => {
    if (typeof onRouteUpdate === 'function') {
      onRouteUpdate({
        pickupAddress: isRouteReady ? pickupAddress : '',
        destAddress: isRouteReady ? destAddress : '',
        distanceKm: isRouteReady ? displayDistance : null,
        etaMins: isRouteReady ? displayDuration : null,
        isRouteReady
      });
    }
  }, [pickupAddress, destAddress, isRouteReady, displayDistance, displayDuration, onRouteUpdate]);

  const isFemaleUser = (user?.gender || '').toUpperCase() === 'FEMALE';
  const effectiveFemaleOnly = isFemaleUser && Boolean(femaleRiderOnly);
  const hasPreferences = (vehicleType && vehicleType !== 'ANY') || effectiveFemaleOnly;

  /* Check real-time driver availability */
  useEffect(() => {
    let isCancelled = false;
    const checkAvailability = async () => {
      if (!hasPreferences || bookingMode !== 'NOW') {
        setPrefAvailability(null);
        return;
      }
      setCheckingPref(true);
      try {
        const res = await apiRequest('/customer/rides/check-availability', 'POST', {
          vehicleType,
          femaleRiderOnly: effectiveFemaleOnly
        }, token);
        if (!isCancelled && res?.data) {
          setPrefAvailability(res.data);
        }
      } catch (err) {
        if (!isCancelled) setPrefAvailability(null);
      } finally {
        if (!isCancelled) setCheckingPref(false);
      }
    };

    checkAvailability();
    const interval = setInterval(checkAvailability, 15000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [vehicleType, effectiveFemaleOnly, hasPreferences, bookingMode, token]);

  /* Execute actual ride request */
  const executeRequestRide = async (overrides = {}) => {
    if (!pickupCoords || !destCoords) return;
    onBookingStart();

    const targetVehicle = overrides.vehicleType !== undefined ? overrides.vehicleType : vehicleType;
    const targetFemaleOnly = overrides.femaleRiderOnly !== undefined
      ? overrides.femaleRiderOnly
      : (isFemaleUser ? femaleRiderOnly : false);

    try {
      let targetScheduledTime = null;
      const isSched = bookingMode === 'SCHEDULE';
      if (isSched) {
        let h24 = parseInt(scheduledHour, 10);
        if (scheduledAmPm === 'PM' && h24 < 12) h24 += 12;
        if (scheduledAmPm === 'AM' && h24 === 12) h24 = 0;
        const timePart = `${String(h24).padStart(2, '0')}:${scheduledMinute}:00`;
        targetScheduledTime = `${scheduledDate} ${timePart}`;

        const targetDateObj = new Date(`${scheduledDate}T${timePart}`);
        if (isNaN(targetDateObj.getTime()) || targetDateObj.getTime() <= Date.now()) {
          setStatusMessage({ text: 'Please choose a future date and time for pre-booking.', type: 'error' });
          onBookingEnd();
          return;
        }
      } else if (rideNowTimeOption && rideNowTimeOption !== 'NOW') {
        const mins = rideNowTimeOption === '5MIN' ? 5 : rideNowTimeOption === '10MIN' ? 10 : 15;
        const d = new Date(Date.now() + mins * 60000);
        targetScheduledTime = `${getLocalDateString(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
      }

      const payload = {
        pickupLatitude: pickupCoords.lat,
        pickupLongitude: pickupCoords.lng,
        pickupAddress: pickupDetail.trim()
          ? `${pickupAddress} (${pickupDetail})` : pickupAddress,
        viaLatitude: showViaStop && viaCoords ? viaCoords.lat : null,
        viaLongitude: showViaStop && viaCoords ? viaCoords.lng : null,
        viaAddress: showViaStop && viaAddress
          ? (viaDetail.trim() ? `${viaAddress} (${viaDetail})` : viaAddress)
          : null,
        destinationLatitude: destCoords.lat,
        destinationLongitude: destCoords.lng,
        destinationAddress: destDetail.trim()
          ? `${destAddress} (${destDetail})` : destAddress,
        vehicleType: targetVehicle,
        femaleRiderOnly: targetFemaleOnly,
        isDoubleRide,
        paymentMethod: 'CASH',
        isScheduled: isSched || Boolean(targetScheduledTime),
        scheduledTime: targetScheduledTime,
        notes: [
          isQuietRide ? 'Quiet Ride requested' : '',
          isDoubleRide ? 'Double Ride (2 Passengers)' : ''
        ].filter(Boolean).join(' · ')
      };

      const res = await apiRequest('/customer/rides', 'POST', payload, token);

      if (isSched) {
        if (typeof fetchScheduledRides === 'function') {
          await fetchScheduledRides();
        }
        setStatusMessage({ text: 'Ride pre-booked successfully! View under the Advance tab.', type: 'success' });
        window.history.pushState({}, '', '/passenger/prebook');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        setActiveRide(res.data);
        setStatusMessage({ text: 'Ride requested! Searching for nearby campus riders...', type: 'info' });
      }
    } catch (err) {
      const penalty = err.data?.penalty || err.penalty;
      if (penalty) {
        setPendingPenalty(penalty);
        openPenaltyModal(penalty);
        setStatusMessage({ text: 'Please clear pending ₹15 driver compensation to book rides.', type: 'error' });
      } else {
        setStatusMessage({ text: err.message || 'Failed to request ride.', type: 'error' });
      }
    } finally {
      onBookingEnd();
    }
  };

  const handleRequestRide = async () => {
    if (!pickupCoords || !destCoords) return;

    if (bookingMode === 'NOW' && hasPreferences && prefAvailability && prefAvailability.isAvailable === false) {
      setPreferenceModalData(prefAvailability);
      setShowPreferenceModal(true);
      return;
    }

    await executeRequestRide();
  };

  const handleSwap = () => {
    const pAddr = pickupAddress;
    const pDet = pickupDetail;
    const pCoord = pickupCoords;
    setPickupAddress(destAddress);
    setPickupSearchQuery(destAddress);
    setPickupDetail(destDetail);
    setPickupCoords(destCoords);
    setDestAddress(pAddr);
    setDestSearchQuery(pAddr);
    setDestDetail(pDet);
    setDestCoords(pCoord);
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPickupCoords(coords);
          setPickupAddress('Current Location');
          setPickupSearchQuery('Current Location');
          setPickupMenuOpen(false);
          setStatusMessage({ text: 'Pickup set to your current GPS position.', type: 'success' });
        },
        () => {
          setStatusMessage({ text: 'Could not access GPS. Please select from campus stops.', type: 'error' });
        }
      );
    }
  };

  /* Flexible word/letter search filter */
  const filterStopsByQuery = (stops, query) => {
    if (!query || !query.trim()) return stops;
    const q = query.trim().toLowerCase();
    const qTokens = q.split(/\s+/).filter(Boolean);

    return stops.filter(stop => {
      const s = stop.toLowerCase();
      // 1. Direct match or substring contains query
      if (s.includes(q)) return true;
      // 2. All tokens match
      if (qTokens.every(token => s.includes(token))) return true;
      // 3. Any token matches
      if (qTokens.some(token => s.includes(token))) return true;
      return false;
    });
  };

  // Available destination stops based strictly on active Admin routes (all admin stops except selected pickup)
  const availableDestStops = useMemo(() => {
    if (!pickupAddress) return adminStops;
    const pTrim = pickupAddress.trim().toLowerCase();
    return adminStops.filter(s => s.toLowerCase() !== pTrim);
  }, [pickupAddress, adminStops]);

  // Available pickup stops based strictly on active Admin routes (all admin stops except selected destination)
  const availablePickupStops = useMemo(() => {
    if (!destAddress) return adminStops;
    const dTrim = destAddress.trim().toLowerCase();
    return adminStops.filter(s => s.toLowerCase() !== dTrim);
  }, [destAddress, adminStops]);

  const filteredPickupStops = filterStopsByQuery(availablePickupStops, pickupSearchQuery);
  const filteredDestStops = filterStopsByQuery(availableDestStops, destSearchQuery);
  const filteredViaStops = filterStopsByQuery(
    adminStops.filter(s => s !== pickupAddress && s !== destAddress),
    viaSearchQuery
  );

  const handleSelectPickup = (stopName) => {
    setPickupAddress(stopName);
    setPickupSearchQuery(stopName);
    setPickupCoords(findStopCoords(stopName));
    setPickupMenuOpen(false);

    // If destination was already selected to the exact same stop, clear destination
    if (destAddress && destAddress.trim().toLowerCase() === stopName.trim().toLowerCase()) {
      setDestAddress('');
      setDestSearchQuery('');
      setDestCoords(null);
    }
  };

  const handleSelectDest = (stopName) => {
    setDestAddress(stopName);
    setDestSearchQuery(stopName);
    setDestCoords(findStopCoords(stopName));
    setDestMenuOpen(false);

    // If pickup was already selected to the exact same stop, clear pickup
    if (pickupAddress && pickupAddress.trim().toLowerCase() === stopName.trim().toLowerCase()) {
      setPickupAddress('');
      setPickupSearchQuery('');
      setPickupCoords(null);
    }
  };

  const handleSelectVia = (stopName) => {
    setViaAddress(stopName);
    setViaSearchQuery(stopName);
    setViaCoords(findStopCoords(stopName));
    setViaMenuOpen(false);
  };

  return (
    <div id="book-form" className="ps-booking-flow">

      {/* Top Mode Switch & Stepper Header (Stitch Design) */}
      <div className="ps-terminal-box ps-fade-up">
        <div className="ps-terminal-head">
          <div>
            <div className="ps-tag-pill-row">
              <span className="ps-tag-pill-accent">Fast Transit</span>
              <span className="ps-tag-pill-sub">Instant PU Dispatch</span>
            </div>
            <h1 className="font-headline-lg ps-terminal-title">Book Campus Transit</h1>
          </div>

          {/* Mode Switch Toggle: Ride Now vs Schedule */}
          <div className="ps-mode-pill-toggle">
            <button
              type="button"
              className={`ps-mode-pill-btn ${bookingMode === 'NOW' ? 'is-active' : ''}`}
              onClick={() => setBookingMode('NOW')}
            >
              <Zap size={16} />
              <span>Ride Now</span>
            </button>
            <button
              type="button"
              className={`ps-mode-pill-btn ${bookingMode === 'SCHEDULE' ? 'is-active' : ''}`}
              onClick={() => setBookingMode('SCHEDULE')}
            >
              <Calendar size={16} />
              <span>Schedule</span>
            </button>
          </div>
        </div>

        {/* Departure Time Selector for Immediate Ride */}
        {bookingMode === 'NOW' && (
          <div className="ps-time-selector-row ps-fade-up">
            <span className="ps-field-label">Departure Time:</span>
            <div className="ps-time-pills-row">
              {[
                { id: 'NOW', label: 'Now' },
                { id: '5MIN', label: '+5 min' },
                { id: '10MIN', label: '+10 min' },
                { id: '15MIN', label: '+15 min' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`ps-time-pill-btn ${rideNowTimeOption === opt.id ? 'is-active' : ''}`}
                  onClick={() => setRideNowTimeOption(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Time Selector Drawer (if Pre-Book is active) */}
        {bookingMode === 'SCHEDULE' && (
          <div className="ps-schedule-drawer ps-fade-up">
            <div className="ps-schedule-row">
              <div className="ps-schedule-field flex-1">
                <label className="font-label-sm ps-field-label">Trip Date</label>
                <input
                  type="date"
                  className="ps-input-pill"
                  value={scheduledDate}
                  min={getLocalDateString()}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div className="ps-schedule-field flex-1">
                <label className="font-label-sm ps-field-label">Time</label>
                <div className="flex gap-2">
                  <select
                    className="ps-input-pill flex-1"
                    value={scheduledHour}
                    onChange={(e) => setScheduledHour(e.target.value)}
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <select
                    className="ps-input-pill flex-1"
                    value={scheduledMinute}
                    onChange={(e) => setScheduledMinute(e.target.value)}
                  >
                    {['00', '15', '30', '45'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    className="ps-input-pill"
                    style={{ width: '70px' }}
                    value={scheduledAmPm}
                    onChange={(e) => setScheduledAmPm(e.target.value)}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Searchable Pickup Location */}
        <div className="ps-flow-step">
          <div className="ps-flow-step-head">
            <label className="font-label-md ps-flow-label">
              <span className="ps-circle-badge">1</span>
              <span>Pickup Location</span>
            </label>
            <button
              type="button"
              className="ps-link-btn"
              onClick={handleCurrentLocation}
            >
              <LocateFixed size={14} /> Current Location
            </button>
          </div>

          <div className="ps-searchable-stop-wrap" ref={pickupWrapRef}>
            <div className="ps-pill-input-wrap">
              <span className="ps-pill-input-icon ps-pill-input-icon--primary">
                <MapPin size={18} />
              </span>
              <input
                type="text"
                className="ps-pill-input"
                placeholder="Type letter or search pickup stop..."
                value={pickupSearchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setPickupSearchQuery(val);
                  setPickupAddress(val);
                  setPickupCoords(findStopCoords(val));
                  setPickupMenuOpen(true);
                }}
                onFocus={() => setPickupMenuOpen(true)}
              />
              {pickupSearchQuery ? (
                <button
                  type="button"
                  className="ps-pill-clear-btn"
                  title="Clear search"
                  onClick={() => {
                    setPickupSearchQuery('');
                    setPickupAddress('');
                    setPickupCoords(null);
                    setPickupMenuOpen(true);
                  }}
                >
                  <X size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  className="ps-pill-clear-btn"
                  title="Browse stops"
                  onClick={() => setPickupMenuOpen(!pickupMenuOpen)}
                >
                  <ChevronDown size={16} />
                </button>
              )}
            </div>

            {/* Floating Suggestions List matching similar letters/words */}
            {pickupMenuOpen && (
              <div className="ps-suggestions-menu ps-fade-up">
                {filteredPickupStops.length > 0 ? (
                  filteredPickupStops.map((stopName) => (
                    <div
                      key={`p-sug-${stopName}`}
                      className={`ps-suggestion-item ${pickupAddress === stopName ? 'is-selected' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectPickup(stopName);
                      }}
                    >
                      <MapPin size={15} className="ps-suggestion-icon" />
                      <span className="ps-suggestion-text">{stopName}</span>
                      {pickupAddress === stopName && <Check size={14} className="ps-suggestion-check" />}
                    </div>
                  ))
                ) : (
                  <div className="ps-suggestion-empty">
                    <Search size={14} />
                    <span>No campus stop matching "{pickupSearchQuery}"</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Specific room/wing detail hint if stop has known hint */}
          {getLocationHint(pickupAddress) && (
            <div className="ps-field-hint-box ps-fade-up">
              <label className="ps-field-label">{getLocationHint(pickupAddress).label}</label>
              <input
                type="text"
                className="ps-pill-input"
                placeholder={getLocationHint(pickupAddress).placeholder}
                value={pickupDetail}
                onChange={(e) => setPickupDetail(e.target.value)}
              />
            </div>
          )}

          {/* Quick Pick stops from Admin routes */}
          {availablePickupStops.length > 0 && (
            <div className="ps-hotspots-bar">
              <span className="font-label-sm ps-hotspots-label">Stops:</span>
              {availablePickupStops.map((stopName) => (
                <button
                  key={`chip-p-${stopName}`}
                  type="button"
                  className={`ps-hotspot-chip ${pickupAddress === stopName ? 'is-active' : ''}`}
                  onClick={() => handleSelectPickup(stopName)}
                >
                  <span>{stopName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ps-flow-divider" />

        {/* STEP 2: Searchable Destination */}
        <div className="ps-flow-step">
          <div className="ps-flow-step-head">
            <label className="font-label-md ps-flow-label">
              <span className={`ps-circle-badge ${pickupAddress ? '' : 'ps-circle-badge--muted'}`}>2</span>
              <span>Drop-off Destination</span>
            </label>
            <button
              type="button"
              className="ps-link-btn ps-link-btn--secondary"
              onClick={() => setShowViaStop(!showViaStop)}
            >
              <Plus size={14} /> {showViaStop ? 'Remove via stop' : 'Add via stop'}
            </button>
          </div>

          <div className="ps-searchable-stop-wrap" ref={destWrapRef}>
            <div className="ps-pill-input-wrap">
              <span className="ps-pill-input-icon ps-pill-input-icon--dest">
                <Navigation size={18} />
              </span>
              <input
                type="text"
                className="ps-pill-input ps-pill-input--with-swap"
                placeholder="Type letter or search drop-off destination..."
                value={destSearchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setDestSearchQuery(val);
                  setDestAddress(val);
                  setDestCoords(findStopCoords(val));
                  setDestMenuOpen(true);
                }}
                onFocus={() => setDestMenuOpen(true)}
              />
              {destSearchQuery ? (
                <button
                  type="button"
                  className="ps-pill-clear-btn ps-pill-clear-btn--with-swap"
                  title="Clear search"
                  onClick={() => {
                    setDestSearchQuery('');
                    setDestAddress('');
                    setDestCoords(null);
                    setDestMenuOpen(true);
                  }}
                >
                  <X size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  className="ps-pill-clear-btn ps-pill-clear-btn--with-swap"
                  title="Browse stops"
                  onClick={() => setDestMenuOpen(!destMenuOpen)}
                >
                  <ChevronDown size={16} />
                </button>
              )}
              <button
                type="button"
                className="ps-pill-swap-btn"
                title="Swap pickup and destination"
                onClick={handleSwap}
              >
                <ArrowUpDown size={16} />
              </button>
            </div>

            {/* Floating Suggestions List matching similar letters/words */}
            {destMenuOpen && (
              <div className="ps-suggestions-menu ps-fade-up">
                {filteredDestStops.length > 0 ? (
                  filteredDestStops.map((stopName) => {
                    const route = getAdminRouteBetween(pickupAddress, stopName);
                    return (
                      <div
                        key={`d-sug-${stopName}`}
                        className={`ps-suggestion-item ${destAddress === stopName ? 'is-selected' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectDest(stopName);
                        }}
                      >
                        <Navigation size={15} className="ps-suggestion-icon" />
                        <span className="ps-suggestion-text">{stopName}</span>
                        {route?.fare_amount && (
                          <span className="ps-route-fare-tag">₹{parseFloat(route.fare_amount)}</span>
                        )}
                        {destAddress === stopName && <Check size={14} className="ps-suggestion-check" />}
                      </div>
                    );
                  })
                ) : (
                  <div className="ps-suggestion-empty">
                    <Search size={14} />
                    <span>No campus stop matching "{destSearchQuery}"</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Specific room/wing detail hint if destination has known hint */}
          {getLocationHint(destAddress) && (
            <div className="ps-field-hint-box ps-fade-up">
              <label className="ps-field-label">{getLocationHint(destAddress).label}</label>
              <input
                type="text"
                className="ps-pill-input"
                placeholder={getLocationHint(destAddress).placeholder}
                value={destDetail}
                onChange={(e) => setDestDetail(e.target.value)}
              />
            </div>
          )}

          {/* Quick Pick destination stops from Admin routes */}
          {availableDestStops.length > 0 && (
            <div className="ps-hotspots-bar">
              <span className="font-label-sm ps-hotspots-label">Destinations:</span>
              {availableDestStops.map((stopName) => {
                const route = getAdminRouteBetween(pickupAddress, stopName);
                return (
                  <button
                    key={`chip-dest-${stopName}`}
                    type="button"
                    className={`ps-hotspot-chip ${destAddress === stopName ? 'is-active' : ''}`}
                    onClick={() => handleSelectDest(stopName)}
                  >
                    <span>{stopName}</span>
                    {route?.fare_amount && (
                      <span className="ps-chip-fare font-mono font-bold text-primary ml-1">
                        ₹{parseFloat(route.fare_amount)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Searchable Via Stop */}
          {showViaStop && (
            <div className="ps-searchable-stop-wrap mt-2 ps-fade-up" ref={viaWrapRef}>
              <div className="ps-pill-input-wrap">
                <span className="ps-pill-input-icon" style={{ color: '#0058BE' }}>
                  <Clock size={16} />
                </span>
                <input
                  type="text"
                  className="ps-pill-input"
                  placeholder="Type letter or search via stop (Optional)..."
                  value={viaSearchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setViaSearchQuery(val);
                    setViaAddress(val);
                    setViaCoords(findStopCoords(val));
                    setViaMenuOpen(true);
                  }}
                  onFocus={() => setViaMenuOpen(true)}
                />
                <button
                  type="button"
                  className="ps-pill-swap-btn"
                  title="Remove via stop"
                  onClick={() => {
                    setShowViaStop(false);
                    setViaAddress('');
                    setViaSearchQuery('');
                    setViaCoords(null);
                    setViaMenuOpen(false);
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              {viaMenuOpen && (
                <div className="ps-suggestions-menu ps-fade-up">
                  {filteredViaStops.length > 0 ? (
                    filteredViaStops.map((stopName) => (
                      <div
                        key={`v-sug-${stopName}`}
                        className={`ps-suggestion-item ${viaAddress === stopName ? 'is-selected' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectVia(stopName);
                        }}
                      >
                        <Clock size={15} className="ps-suggestion-icon" />
                        <span className="ps-suggestion-text">{stopName}</span>
                        {viaAddress === stopName && <Check size={14} className="ps-suggestion-check" />}
                      </div>
                    ))
                  ) : (
                    <div className="ps-suggestion-empty">
                      <Search size={14} />
                      <span>No intermediate stop matching "{viaSearchQuery}"</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CONDITIONAL ROUTE & FARE DISPLAY:
            The route, vehicle modes, and fare amount are ONLY visible when both
            pickup and drop-off locations are selected and distinct! */}
        {!isRouteReady ? (
          <div className="ps-route-pending-box ps-fade-up">
            <div className="ps-route-pending-icon">
              <Compass size={22} color="#EA580C" />
            </div>
            <div className="ps-route-pending-content">
              <h3 className="ps-route-pending-title">
                {!pickupAddress && !destAddress
                  ? 'Select Pickup & Destination'
                  : !pickupAddress
                  ? 'Choose Pickup Stop'
                  : !destAddress
                  ? 'Choose Drop-off Destination'
                  : 'Pickup and Destination Must Differ'}
              </h3>
              <p className="ps-route-pending-desc">
                {!pickupAddress && !destAddress
                  ? 'Search or select from the admin-configured campus stops above to preview route, modes, and synced fare.'
                  : !pickupAddress
                  ? 'Search and select where the driver partner should meet you on campus.'
                  : !destAddress
                  ? 'Search and select your destination campus stop above to calculate distance, travel time, and synced fare.'
                  : 'Pickup and drop-off cannot be the same stop. Please pick a different destination.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="ps-flow-divider" />

            {/* STEP 3: Vehicle Type Grid (Any, Bike, Scooter) */}
            <div className="ps-flow-step ps-fade-up">
              <div className="ps-flow-step-head">
                <label className="font-label-md ps-flow-label">
                  <span className="ps-circle-badge">3</span>
                  <span>Select Transit Mode</span>
                </label>
                <span className="ps-subsidized-badge">
                  <Shield size={13} color="#00855B" /> Subsidized Student Fares
                </span>
              </div>

              <div className="ps-vehicle-card-grid">
                {/* Vehicle 1: Any Transit */}
                <div
                  className={`ps-vehicle-pill-card ${vehicleType === 'ANY' ? 'is-active' : ''}`}
                  onClick={() => setVehicleType('ANY')}
                >
                  <div className="ps-vehicle-pill-top">
                    <div className="ps-vehicle-pill-icon">
                      <Zap size={20} />
                    </div>
                    <span className="ps-vehicle-pill-price">₹{currentFare}</span>
                  </div>
                  <h2 className="ps-vehicle-pill-title">Any Transit</h2>
                  <p className="ps-vehicle-pill-desc">Any vehicle • Fastest instant pickup</p>
                  <span className="ps-vehicle-pill-feature">
                    <Zap size={12} /> Fastest Dispatch
                  </span>
                </div>

                {/* Vehicle 2: Campus Bike */}
                <div
                  className={`ps-vehicle-pill-card ${vehicleType === 'BIKE' ? 'is-active' : ''}`}
                  onClick={() => setVehicleType('BIKE')}
                >
                  <div className="ps-vehicle-pill-top">
                    <div className="ps-vehicle-pill-icon">
                      <Bike size={20} />
                    </div>
                    <span className="ps-vehicle-pill-price">₹{currentFare}</span>
                  </div>
                  <h2 className="ps-vehicle-pill-title">Campus Bike</h2>
                  <p className="ps-vehicle-pill-desc">Standard commute • Single rider</p>
                  <span className="ps-vehicle-pill-feature">
                    <Zap size={12} /> 100% Electric
                  </span>
                </div>

                {/* Vehicle 3: Campus Scooter */}
                <div
                  className={`ps-vehicle-pill-card ${vehicleType === 'SCOOTER' ? 'is-active' : ''}`}
                  onClick={() => setVehicleType('SCOOTER')}
                >
                  <div className="ps-vehicle-pill-top">
                    <div className="ps-vehicle-pill-icon">
                      <Compass size={20} />
                    </div>
                    <span className="ps-vehicle-pill-price">₹{currentFare}</span>
                  </div>
                  <h2 className="ps-vehicle-pill-title">Campus Scooter</h2>
                  <p className="ps-vehicle-pill-desc">Smooth ride • Single rider</p>
                  <span className="ps-vehicle-pill-feature" style={{ color: '#0058BE' }}>
                    Comfort Ride
                  </span>
                </div>
              </div>

              {/* Rider Safety & Experience Toggles */}
              <div className="ps-toggles-bar">
                {/* Double Ride Toggle */}
                <label className="ps-toggle-card">
                  <span className="ps-toggle-card-label">
                    <Users size={16} color="#EA580C" />
                    <span>Double Ride (2 Passengers · Save ₹10)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={isDoubleRide}
                    onChange={(e) => setIsDoubleRide(e.target.checked)}
                    className="ps-checkbox-accent"
                  />
                </label>

                {isFemaleUser && (
                  <label className="ps-toggle-card">
                    <span className="ps-toggle-card-label">
                      <Shield size={16} color="#EA580C" />
                      <span>Women Passenger Preference</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={femaleRiderOnly}
                      onChange={(e) => setFemaleRiderOnly(e.target.checked)}
                      className="ps-checkbox-accent"
                    />
                  </label>
                )}

                <label className="ps-toggle-card">
                  <span className="ps-toggle-card-label">
                    <VolumeX size={16} color="#0058BE" />
                    <span>Quiet Ride Option</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={isQuietRide}
                    onChange={(e) => setIsQuietRide(e.target.checked)}
                    className="ps-checkbox-accent"
                  />
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {/* STEP 4: Fare Summary Card & CTA Dock (Only visible when route is ready) */}
      {isRouteReady && (
        <div className="ps-fare-dock-card ps-fade-up">
          <div className="ps-fare-dock-row">
            <div className="flex items-center gap-4">
              <div className="ps-fare-receipt-icon">
                <CreditCard size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-headline-xl ps-fare-dock-amount">
                    ₹{currentFare}
                  </span>
                  <span className="ps-student-fare-badge">
                    {matchedAdminRoute
                      ? `Admin Route: ${matchedAdminRoute.pickup_stop} ↔ ${matchedAdminRoute.destination_stop}`
                      : 'Admin Fixed Route Fare'}
                    {isDoubleRide ? ' · ₹10 Bundled Discount Applied' : ''}
                  </span>
                </div>
                <p className="font-body-sm ps-fare-dock-meta">
                  <span>Trip Distance: <strong>{displayDistance} km</strong></span>
                  <span>•</span>
                  <span>Estimated Time: <strong>{displayDuration} mins</strong></span>
                </p>
              </div>
            </div>

            {/* Payment Method Pill */}
            <div className="ps-payment-pill">
              <span className="ps-payment-pill-label">Pay with:</span>
              <div className="ps-payment-pill-val">
                <Zap size={14} color="#EA580C" />
                <span>Cash on Drop / UPI</span>
              </div>
            </div>
          </div>

          <div className="ps-fare-dock-action-row">
            <div className="ps-insured-note">
              <Shield size={16} color="#00855B" />
              <span>Insured PU Campus Trip · Direct emergency dispatcher connection enabled</span>
            </div>

            <button
              type="button"
              className="ps-heroic-book-btn"
              disabled={bookingLoading || !pickupAddress || !destAddress}
              onClick={handleRequestRide}
            >
              <span>
                {bookingLoading
                  ? (bookingMode === 'SCHEDULE' ? 'Scheduling...' : 'Dispatching...')
                  : (bookingMode === 'SCHEDULE' ? 'Schedule Campus Ride' : 'Book Campus Ride Now')}
              </span>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Preference Unavailable Intercept Modal */}
      {showPreferenceModal && (
        <div className="ps-modal-overlay">
          <div className="ps-modal ps-modal--md ps-modal-in ps-modal--amber ps-pref-modal">
            <div className="ps-modal-head">
              <div className="ps-modal-head-icon ps-modal-head-icon--amber">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="ps-modal-title">Preferred Ride Unavailable</h3>
                <p className="ps-modal-sub">No matching drivers currently active</p>
              </div>
              <button
                type="button"
                className="ps-modal-close"
                onClick={() => setShowPreferenceModal(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="ps-pref-modal-content">
              <div className="ps-pref-modal-alert">
                <AlertCircle size={20} className="ps-pref-modal-alert-icon" />
                <div>
                  <div className="ps-pref-modal-alert-text">
                    {preferenceModalData?.unavailableMessage || 'No drivers matching your preferences are currently online.'}
                  </div>
                  {preferenceModalData?.totalOnlineCount > 0 && (
                    <div className="ps-pref-modal-alert-sub">
                      There are <strong>{preferenceModalData.totalOnlineCount}</strong> other active approved drivers ready on campus right now.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="ps-pref-modal-actions">
              <button
                type="button"
                className="ps-heroic-book-btn w-full"
                onClick={() => {
                  setShowPreferenceModal(false);
                  setVehicleType('ANY');
                  setFemaleRiderOnly(false);
                  executeRequestRide({ vehicleType: 'ANY', femaleRiderOnly: false });
                }}
              >
                <Zap size={16} /> Opt for Available Ride (Fastest)
              </button>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="flex-1 py-2 rounded-full bg-surface-container font-label-md"
                  onClick={() => {
                    setShowPreferenceModal(false);
                    executeRequestRide();
                  }}
                >
                  Wait with Preference
                </button>
                <button
                  type="button"
                  className="flex-1 py-2 rounded-full bg-surface-container-low font-label-md"
                  onClick={() => setShowPreferenceModal(false)}
                >
                  Adjust Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default BookingForm;
