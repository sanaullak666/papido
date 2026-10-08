import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api';
import { usePassenger } from '../shared/PassengerContext';
import { PSSwitch } from '../shared/PassengerUI';
import { openCancelWarning, openPenaltyModal } from '../shared/PassengerModals';
import '../shared/PassengerModals.css';
import {
  CAMPUS_HOTSPOTS, formatRideDateTime, getLocationHint
} from '../shared/passengerConstants';
import {
  Bike, Zap, Compass, MapPin, Clock, Plus, X,
  Users, Shield, CreditCard, Check, Calendar, AlertTriangle, AlertCircle,
  Navigation, ArrowRight, ArrowUpDown, LocateFixed, Eye, VolumeX
} from 'lucide-react';

const HOTSPOTS = [
  { name: 'Gate 1 Main Entrance', icon: 'near_me' },
  { name: 'Silver Jubilee Hostel', icon: 'apartment' },
  { name: 'Library Roundabout', icon: 'local_library' },
  { name: 'Science Block Complex', icon: 'biotech' }
];

export function BookingForm({
  user, token,
  onBookingStart, onBookingEnd, bookingLoading
}) {
  const {
    activeRide, setActiveRide, scheduledRides, fetchScheduledRides,
    setPendingPenalty, setStatusMessage, standardCampusFare
  } = usePassenger();

  /* ---------- Pickup / Drop / Via ---------- */
  const [pickupAddress, setPickupAddress] = useState('Gate 1 Main Entrance');
  const [pickupDetail, setPickupDetail] = useState('');
  const [pickupCoords, setPickupCoords] = useState({ lat: 12.0228681, lng: 79.8509415 });

  const [destAddress, setDestAddress] = useState('Management Studies Dept');
  const [destDetail, setDestDetail] = useState('');
  const [destCoords, setDestCoords] = useState({ lat: 12.0215, lng: 79.8565 });

  const [showViaStop, setShowViaStop] = useState(false);
  const [viaAddress, setViaAddress] = useState('');
  const [viaDetail, setViaDetail] = useState('');
  const [viaCoords, setViaCoords] = useState(null);

  /* ---------- Vehicle + prefs ---------- */
  const [vehicleType, setVehicleType] = useState('BIKE');
  const [femaleRiderOnly, setFemaleRiderOnly] = useState(false);
  const [isQuietRide, setIsQuietRide] = useState(false);
  const [isDoubleRide, setIsDoubleRide] = useState(false);

  /* ---------- Preference live availability & modal ---------- */
  const [prefAvailability, setPrefAvailability] = useState(null);
  const [checkingPref, setCheckingPref] = useState(false);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [preferenceModalData, setPreferenceModalData] = useState(null);

  /* ---------- Mode + time ---------- */
  const [bookingMode, setBookingMode] = useState('NOW');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledHour, setScheduledHour] = useState('09');
  const [scheduledMinute, setScheduledMinute] = useState('00');
  const [scheduledAmPm, setScheduledAmPm] = useState('AM');

  /* ---------- Fare ---------- */
  const [fareEstimate, setFareEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);

  /* ---------- Admin stops ---------- */
  const [adminStops, setAdminStops] = useState([]);

  const getLocalDateString = (d = new Date()) => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(d);
    } catch { return d.toISOString().slice(0, 10); }
  };

  useEffect(() => {
    setScheduledDate(getLocalDateString(new Date(Date.now() + 3600000)));
  }, []);

  /* Load admin routes/stops */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiRequest('/fares/routes', 'GET', null, token);
        if (Array.isArray(res?.data)) {
          const active = res.data.filter(r => r.is_active);
          const stops = Array.from(new Set(
            active.flatMap(r => [r.pickup_stop, r.destination_stop])
              .map(s => (s || '').trim()).filter(Boolean)
          ));
          if (stops.length > 0) {
            setAdminStops(stops);
          } else {
            setAdminStops(CAMPUS_HOTSPOTS.map(s => s.name));
          }
        } else {
          setAdminStops(CAMPUS_HOTSPOTS.map(s => s.name));
        }
      } catch {
        setAdminStops(CAMPUS_HOTSPOTS.map(s => s.name));
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [token]);

  const findStopCoords = (name) => {
    if (!name) return { lat: 12.024, lng: 79.853 };
    const found = CAMPUS_HOTSPOTS.find(s =>
      s.name.toLowerCase() === name.toLowerCase()
    );
    return found ? { lat: found.lat, lng: found.lng } : { lat: 12.024, lng: 79.853 };
  };

  /* Fare estimate */
  useEffect(() => {
    const run = async () => {
      if (!pickupCoords || !destCoords) return;
      setEstimating(true);
      try {
        const res = await apiRequest('/fares/estimate', 'POST', {
          pickupLatitude: pickupCoords.lat, pickupLongitude: pickupCoords.lng,
          pickupAddress, destinationAddress: destAddress,
          vehicleType, isDoubleRide
        }, token);
        setFareEstimate(res.data);
      } catch { /* silent */ } finally { setEstimating(false); }
    };
    run();
  }, [pickupCoords, destCoords, pickupAddress, destAddress, vehicleType, isDoubleRide, token]);

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
      }

      const payload = {
        pickupLatitude: pickupCoords.lat, pickupLongitude: pickupCoords.lng,
        pickupAddress: pickupDetail.trim()
          ? `${pickupAddress} (${pickupDetail})` : pickupAddress,
        viaLatitude: showViaStop && viaCoords ? viaCoords.lat : null,
        viaLongitude: showViaStop && viaCoords ? viaCoords.lng : null,
        viaAddress: showViaStop && viaAddress ? viaAddress : null,
        destinationLatitude: destCoords.lat, destinationLongitude: destCoords.lng,
        destinationAddress: destDetail.trim()
          ? `${destAddress} (${destDetail})` : destAddress,
        vehicleType: targetVehicle,
        femaleRiderOnly: targetFemaleOnly,
        isDoubleRide, paymentMethod: 'CASH',
        isScheduled: isSched,
        scheduledTime: isSched ? targetScheduledTime : null,
        notes: isQuietRide ? 'Quiet Ride requested' : ''
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
        setStatusMessage({ text: 'Searching for a nearby rider...', type: 'info' });
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
    setPickupDetail(destDetail);
    setPickupCoords(destCoords);
    setDestAddress(pAddr);
    setDestDetail(pDet);
    setDestCoords(pCoord);
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPickupCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setPickupAddress('Current Location');
          setStatusMessage({ text: 'Pickup set to your current GPS position.', type: 'success' });
        },
        () => {
          setStatusMessage({ text: 'Could not access GPS. Please select from campus hotspots.', type: 'error' });
        }
      );
    }
  };

  const currentFare = estimating
    ? null
    : (fareEstimate?.estimatedFare ||
       (vehicleType === 'AUTO' ? 40 : vehicleType === 'SHUTTLE' ? 15 : (standardCampusFare || 20)));

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

        {/* STEP 1: Pickup Location */}
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

          <div className="ps-pill-input-wrap">
            <span className="ps-pill-input-icon ps-pill-input-icon--primary">
              <MapPin size={18} />
            </span>
            <input
              type="text"
              className="ps-pill-input"
              value={pickupAddress}
              onChange={(e) => {
                setPickupAddress(e.target.value);
                setPickupCoords(findStopCoords(e.target.value));
              }}
              placeholder="Enter pickup spot or choose below..."
            />
          </div>

          {/* Hotspots chips matching Stitch */}
          <div className="ps-hotspots-bar">
            <span className="font-label-sm ps-hotspots-label">Hotspots:</span>
            {HOTSPOTS.map((spot) => (
              <button
                key={spot.name}
                type="button"
                className={`ps-hotspot-chip ${pickupAddress === spot.name ? 'is-active' : ''}`}
                onClick={() => {
                  setPickupAddress(spot.name);
                  setPickupCoords(findStopCoords(spot.name));
                }}
              >
                <span>{spot.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ps-flow-divider" />

        {/* STEP 2: Destination */}
        <div className="ps-flow-step">
          <div className="ps-flow-step-head">
            <label className="font-label-md ps-flow-label">
              <span className="ps-circle-badge ps-circle-badge--muted">2</span>
              <span>Destination</span>
            </label>
            <button
              type="button"
              className="ps-link-btn ps-link-btn--secondary"
              onClick={() => setShowViaStop(!showViaStop)}
            >
              <Plus size={14} /> {showViaStop ? 'Remove via stop' : 'Add via stop'}
            </button>
          </div>

          <div className="ps-pill-input-wrap">
            <span className="ps-pill-input-icon ps-pill-input-icon--dest">
              <Navigation size={18} />
            </span>
            <input
              type="text"
              className="ps-pill-input"
              value={destAddress}
              onChange={(e) => {
                setDestAddress(e.target.value);
                setDestCoords(findStopCoords(e.target.value));
              }}
              placeholder="Enter campus destination..."
            />
            <button
              type="button"
              className="ps-pill-swap-btn"
              title="Swap pickup and destination"
              onClick={handleSwap}
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          {/* Optional Via Stop row */}
          {showViaStop && (
            <div className="ps-pill-input-wrap mt-2 ps-fade-up">
              <span className="ps-pill-input-icon" style={{ color: '#0058BE' }}>
                <Clock size={16} />
              </span>
              <input
                type="text"
                className="ps-pill-input"
                placeholder="Via Stop: (e.g. Student Canteen #2)"
                value={viaAddress}
                onChange={(e) => {
                  setViaAddress(e.target.value);
                  setViaCoords(findStopCoords(e.target.value));
                }}
              />
              <button
                type="button"
                className="ps-pill-swap-btn"
                onClick={() => {
                  setShowViaStop(false);
                  setViaAddress('');
                }}
              >
                <X size={15} />
              </button>
            </div>
          )}
        </div>

        <div className="ps-flow-divider" />

        {/* STEP 3: Vehicle Type Grid */}
        <div className="ps-flow-step">
          <div className="ps-flow-step-head">
            <label className="font-label-md ps-flow-label">
              <span className="ps-circle-badge ps-circle-badge--muted">3</span>
              <span>Select Transit Mode</span>
            </label>
            <span className="ps-subsidized-badge">
              <Shield size={13} color="#00855B" /> Subsidized Student Fares
            </span>
          </div>

          <div className="ps-vehicle-card-grid">
            {/* Vehicle 1: Bike */}
            <div
              className={`ps-vehicle-pill-card ${vehicleType === 'BIKE' ? 'is-active' : ''}`}
              onClick={() => setVehicleType('BIKE')}
            >
              <div className="ps-vehicle-pill-top">
                <div className="ps-vehicle-pill-icon">
                  <Bike size={20} />
                </div>
                <span className="ps-vehicle-pill-price">₹20</span>
              </div>
              <h2 className="ps-vehicle-pill-title">Papido Bike</h2>
              <p className="ps-vehicle-pill-desc">Single rider • Instant 2 min</p>
              <span className="ps-vehicle-pill-feature">
                <Zap size={12} /> 100% Electric
              </span>
            </div>

            {/* Vehicle 2: Auto */}
            <div
              className={`ps-vehicle-pill-card ${vehicleType === 'AUTO' ? 'is-active' : ''}`}
              onClick={() => setVehicleType('AUTO')}
            >
              <div className="ps-vehicle-pill-top">
                <div className="ps-vehicle-pill-icon">
                  <Users size={20} />
                </div>
                <span className="ps-vehicle-pill-price">₹40</span>
              </div>
              <h2 className="ps-vehicle-pill-title">Papido Auto</h2>
              <p className="ps-vehicle-pill-desc">Up to 3 seats • 4 mins away</p>
              <span className="ps-vehicle-pill-feature" style={{ color: '#5A4138' }}>
                Luggage friendly
              </span>
            </div>

            {/* Vehicle 3: Shuttle */}
            <div
              className={`ps-vehicle-pill-card ${vehicleType === 'SHUTTLE' || vehicleType === 'ANY' ? 'is-active' : ''}`}
              onClick={() => setVehicleType('SHUTTLE')}
            >
              <div className="ps-vehicle-pill-top">
                <div className="ps-vehicle-pill-icon">
                  <Compass size={20} />
                </div>
                <span className="ps-vehicle-pill-price">₹15</span>
              </div>
              <h2 className="ps-vehicle-pill-title">PU Shuttle</h2>
              <p className="ps-vehicle-pill-desc">Campus Fixed Route • 5 mins</p>
              <span className="ps-vehicle-pill-feature" style={{ color: '#00855B' }}>
                Shared Pass
              </span>
            </div>
          </div>

          {/* Rider Safety & Experience Toggles */}
          <div className="ps-toggles-bar">
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
      </div>

      {/* STEP 4: Fare Summary Card & CTA Dock */}
      <div className="ps-fare-dock-card ps-fade-up">
        <div className="ps-fare-dock-row">
          <div className="flex items-center gap-4">
            <div className="ps-fare-receipt-icon">
              <CreditCard size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-xl ps-fare-dock-amount">
                  ₹{currentFare || 20}
                </span>
                <span className="ps-student-fare-badge">Standard Student Fare</span>
              </div>
              <p className="font-body-sm ps-fare-dock-meta">
                <span>Trip Distance: <strong>1.4 km</strong></span>
                <span>•</span>
                <span>Estimated Time: <strong>4 mins</strong></span>
              </p>
            </div>
          </div>

          {/* Payment Method Pill */}
          <div className="ps-payment-pill">
            <span className="ps-payment-pill-label">Pay with:</span>
            <div className="ps-payment-pill-val">
              <Zap size={14} color="#EA580C" />
              <span>UPI / Campus Pass</span>
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
                  setVehicleType('BIKE');
                  setFemaleRiderOnly(false);
                  executeRequestRide({ vehicleType: 'BIKE', femaleRiderOnly: false });
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
