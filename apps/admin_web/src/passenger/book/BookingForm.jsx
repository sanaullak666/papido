import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api';
import { usePassenger } from '../shared/PassengerContext';
import { PSButton, PSSwitch } from '../shared/PassengerUI';
import { openCancelWarning, openPenaltyModal } from '../shared/PassengerModals';
import '../shared/PassengerModals.css';
import {
  CAMPUS_HOTSPOTS, getLocationHint
} from '../shared/passengerConstants';
import {
  Bike, Zap, Compass, MapPin, Clock, Plus, X,
  Users, Shield, CreditCard, Check, Calendar, AlertTriangle, AlertCircle,
  Navigation, ChevronRight
} from 'lucide-react';

export function BookingForm({
  user, token,
  onBookingStart, onBookingEnd, bookingLoading
}) {
  const {
    activeRide, setActiveRide, scheduledRides, fetchScheduledRides,
    setPendingPenalty, setStatusMessage, standardCampusFare
  } = usePassenger();

  /* ---------- Pickup / Drop / Via ---------- */
  const [pickupAddress, setPickupAddress] = useState('PU Main Gate (Gate 1)');
  const [pickupDetail, setPickupDetail] = useState('');
  const [pickupCoords, setPickupCoords] = useState({ lat: 12.0228681, lng: 79.8509415 });

  const [destAddress, setDestAddress] = useState('Madame Curie Girls Hostel');
  const [destDetail, setDestDetail] = useState('');
  const [destCoords, setDestCoords] = useState({ lat: 12.0215, lng: 79.8565 });

  const [showViaStop, setShowViaStop] = useState(false);
  const [viaAddress, setViaAddress] = useState('');
  const [viaDetail, setViaDetail] = useState('');
  const [viaCoords, setViaCoords] = useState(null);

  /* ---------- Vehicle + prefs ---------- */
  const [vehicleType, setVehicleType] = useState('ANY');
  const [femaleRiderOnly, setFemaleRiderOnly] = useState(false);
  const [isDoubleRide, setIsDoubleRide] = useState(false);

  /* ---------- Preference live availability & modal ---------- */
  const [prefAvailability, setPrefAvailability] = useState(null);
  const [checkingPref, setCheckingPref] = useState(false);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [preferenceModalData, setPreferenceModalData] = useState(null);

  /* ---------- Mode + time ---------- */
  const [bookingMode, setBookingMode] = useState('NOW');
  const [rideNowTimeOption, setRideNowTimeOption] = useState('NOW');
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
  const getTodayDateStr = () => getLocalDateString(new Date());
  const getTomorrowDateStr = () => getLocalDateString(new Date(Date.now() + 86400000));

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
            setPickupAddress(p => (stops.includes(p) ? p : stops[0]));
            setDestAddress(p => (stops.includes(p) ? p : (stops[1] || stops[0])));
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

  /* Check real-time driver availability when preferences are selected */
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
          vehicleType: vehicleType !== 'ANY' ? vehicleType : null,
          femaleRiderOnly: effectiveFemaleOnly,
          pickupLatitude: pickupCoords?.lat,
          pickupLongitude: pickupCoords?.lng
        }, token);
        if (!isCancelled) {
          setPrefAvailability(res?.data || null);
        }
      } catch {
        if (!isCancelled) setPrefAvailability(null);
      } finally {
        if (!isCancelled) setCheckingPref(false);
      }
    };

    const timer = setTimeout(checkAvailability, 300);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [vehicleType, effectiveFemaleOnly, hasPreferences, bookingMode, pickupCoords, token]);

  /* Build ISO / target time string for scheduled trip */
  const buildScheduledTargetTime = () => {
    if (bookingMode !== 'SCHEDULE') return null;
    let hour = parseInt(scheduledHour, 10);
    if (scheduledAmPm === 'PM' && hour !== 12) hour += 12;
    if (scheduledAmPm === 'AM' && hour === 12) hour = 0;
    const hh = String(hour).padStart(2, '0');
    const mm = String(scheduledMinute).padStart(2, '0');
    return `${scheduledDate || getTodayDateStr()} ${hh}:${mm}:00`;
  };

  /* Execute request */
  const executeRequestRide = async (overridePrefs = null) => {
    if (!pickupAddress || !destAddress) {
      setStatusMessage({ text: 'Please specify pickup and destination stops.', type: 'error' });
      return;
    }
    if (pickupAddress === destAddress) {
      setStatusMessage({ text: 'Pickup and drop-off cannot be the same campus stop.', type: 'error' });
      return;
    }

    onBookingStart();
    try {
      const isSched = bookingMode === 'SCHEDULE';
      const targetVehicle = overridePrefs ? overridePrefs.vehicleType : vehicleType;
      const targetFemaleOnly = overridePrefs ? overridePrefs.femaleRiderOnly : effectiveFemaleOnly;
      const targetScheduledTime = isSched ? buildScheduledTargetTime() : null;

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
        scheduledTime: isSched ? targetScheduledTime : null
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

  /* Intercept request if preferred ride is unavailable */
  const handleRequestRide = async () => {
    if (!pickupCoords || !destCoords) return;

    if (bookingMode === 'NOW' && hasPreferences && prefAvailability && prefAvailability.isAvailable === false) {
      setPreferenceModalData(prefAvailability);
      setShowPreferenceModal(true);
      return;
    }

    await executeRequestRide();
  };

  const currentFare = estimating
    ? null
    : (fareEstimate?.estimatedFare ||
       (isDoubleRide
         ? Math.max(standardCampusFare || 25, (standardCampusFare || 25) * 2 - 10)
         : (standardCampusFare || 25)));

  return (
    <div id="book-form" className="ps-booking-card">

      {/* ── 1. Restrained Mode Selector (Ride Now vs Pre-Book) ── */}
      <div className="ps-mode-switch" role="tablist" aria-label="Ride timing mode">
        <button
          type="button"
          role="tab"
          aria-selected={bookingMode === 'NOW'}
          onClick={() => setBookingMode('NOW')}
          className={`ps-mode-btn ${bookingMode === 'NOW' ? 'is-active' : ''}`}
        >
          <Zap size={14} aria-hidden="true" />
          <span>Ride Now</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={bookingMode === 'SCHEDULE'}
          onClick={() => setBookingMode('SCHEDULE')}
          className={`ps-mode-btn ${bookingMode === 'SCHEDULE' ? 'is-active' : ''}`}
        >
          <Calendar size={14} aria-hidden="true" />
          <span>Pre-Book</span>
        </button>
      </div>

      {/* ── 2. Time Control ── */}
      {bookingMode === 'NOW' ? (
        <div className="ps-time-strip" aria-label="Pickup timing">
          <span className="ps-time-strip-label">
            <Clock size={13} aria-hidden="true" />
            <span>Pickup:</span>
          </span>
          <div className="ps-time-pills">
            {[
              { id: 'NOW', label: 'Now' },
              { id: '5MIN', label: '+5 min' },
              { id: '10MIN', label: '+10 min' },
              { id: '15MIN', label: '+15 min' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setRideNowTimeOption(t.id)}
                className={`ps-time-pill ${rideNowTimeOption === t.id ? 'is-active' : ''}`}
                aria-pressed={rideNowTimeOption === t.id}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="ps-schedule-panel ps-fade-up">
          <div className="ps-schedule-label-row">
            <span className="ps-schedule-panel-title">
              <Calendar size={14} /> Schedule Date & Time
            </span>
          </div>

          <div className="ps-schedule-controls">
            <div className="ps-schedule-date-group">
              <button
                type="button"
                onClick={() => setScheduledDate(getTodayDateStr())}
                className={`ps-schedule-date-btn ${scheduledDate === getTodayDateStr() ? 'is-active' : ''}`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setScheduledDate(getTomorrowDateStr())}
                className={`ps-schedule-date-btn ${scheduledDate === getTomorrowDateStr() ? 'is-active' : ''}`}
              >
                Tomorrow
              </button>
              <input
                type="date"
                min={getTodayDateStr()}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="ps-input ps-input--date"
                aria-label="Select date"
              />
            </div>

            <div className="ps-schedule-time-group">
              <select
                value={scheduledHour}
                onChange={(e) => setScheduledHour(e.target.value)}
                className="ps-select ps-select--time"
                aria-label="Hour"
              >
                {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h =>
                  <option key={h} value={h}>{h}</option>
                )}
              </select>
              <span className="ps-time-colon">:</span>
              <select
                value={scheduledMinute}
                onChange={(e) => setScheduledMinute(e.target.value)}
                className="ps-select ps-select--time"
                aria-label="Minute"
              >
                {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m =>
                  <option key={m} value={m}>{m}</option>
                )}
              </select>
              <div className="ps-period-switch">
                <button
                  type="button"
                  onClick={() => setScheduledAmPm('AM')}
                  className={`ps-period-btn ${scheduledAmPm === 'AM' ? 'is-active' : ''}`}
                >AM</button>
                <button
                  type="button"
                  onClick={() => setScheduledAmPm('PM')}
                  className={`ps-period-btn ${scheduledAmPm === 'PM' ? 'is-active' : ''}`}
                >PM</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Connected Route Block (Pickup & Drop) ── */}
      <div className="ps-route-block" aria-label="Route Selection">
        <div className="ps-route-spine" aria-hidden="true">
          <span className="ps-spine-origin" title="Pickup marker" />
          <span className="ps-spine-line" />
          {showViaStop && (
            <>
              <span className="ps-spine-via" title="Via marker" />
              <span className="ps-spine-line" />
            </>
          )}
          <span className="ps-spine-dest" title="Destination marker" />
        </div>

        <div className="ps-route-fields">
          {/* Pickup Field */}
          <div className="ps-route-field">
            <div className="ps-field-header">
              <label htmlFor="ps-pickup-input" className="ps-route-field-label">
                PICKUP LOCATION
              </label>
            </div>
            <select
              id="ps-pickup-input"
              className="ps-select ps-route-select"
              value={pickupAddress}
              onChange={(e) => {
                setPickupAddress(e.target.value);
                setPickupCoords(findStopCoords(e.target.value));
              }}
              aria-label="Pickup campus stop"
            >
              {adminStops.map((s, i) => (
                <option key={`p-${i}`} value={s}>{s}</option>
              ))}
            </select>

            {getLocationHint(pickupAddress) && (
              <input
                type="text"
                className="ps-input ps-input--detail"
                placeholder={getLocationHint(pickupAddress).placeholder}
                value={pickupDetail}
                onChange={(e) => setPickupDetail(e.target.value)}
                aria-label="Pickup landmark or hostel room detail"
              />
            )}
          </div>

          {/* Optional Via Stop */}
          {!showViaStop ? (
            <div className="ps-via-toggle-row">
              <button
                type="button"
                onClick={() => setShowViaStop(true)}
                className="ps-via-add-btn"
              >
                <Plus size={13} aria-hidden="true" />
                <span>Add Via Stop (Optional)</span>
              </button>
            </div>
          ) : (
            <div className="ps-route-field ps-route-field--via ps-fade-up">
              <div className="ps-field-header">
                <label htmlFor="ps-via-input" className="ps-route-field-label">
                  VIA STOP
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowViaStop(false);
                    setViaAddress(''); setViaDetail(''); setViaCoords(null);
                  }}
                  className="ps-via-remove-btn"
                  aria-label="Remove via stop"
                >
                  <X size={12} aria-hidden="true" />
                  <span>Remove</span>
                </button>
              </div>
              <select
                id="ps-via-input"
                className="ps-select ps-route-select"
                value={viaAddress}
                onChange={(e) => {
                  setViaAddress(e.target.value);
                  setViaCoords(findStopCoords(e.target.value));
                }}
                aria-label="Via campus stop"
              >
                {adminStops.map((s, i) => (
                  <option key={`v-${i}`} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Destination Field */}
          <div className="ps-route-field">
            <div className="ps-field-header">
              <label htmlFor="ps-dest-input" className="ps-route-field-label">
                DROP-OFF DESTINATION
              </label>
            </div>
            <select
              id="ps-dest-input"
              className="ps-select ps-route-select"
              value={destAddress}
              onChange={(e) => {
                setDestAddress(e.target.value);
                setDestCoords(findStopCoords(e.target.value));
              }}
              aria-label="Drop-off campus stop"
            >
              {adminStops.map((s, i) => (
                <option key={`d-${i}`} value={s}>{s}</option>
              ))}
            </select>

            {getLocationHint(destAddress) && (
              <input
                type="text"
                className="ps-input ps-input--detail"
                placeholder={getLocationHint(destAddress).placeholder}
                value={destDetail}
                onChange={(e) => setDestDetail(e.target.value)}
                aria-label="Drop-off landmark or hostel room detail"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Clean Full-Width Vehicle Selectable Rows ── */}
      <div className="ps-vehicle-section">
        <div className="ps-section-eyebrow">
          <span>CHOOSE VEHICLE OPTION</span>
        </div>

        <div className="ps-vehicle-list" role="radiogroup" aria-label="Vehicle type options">
          {[
            {
              id: 'ANY',
              icon: Zap,
              name: 'Any Available Ride',
              capacity: '1 Rider',
              sub: 'Fastest pickup by closest driver'
            },
            {
              id: 'BIKE',
              icon: Bike,
              name: 'Standard Bike',
              capacity: '1 Rider',
              sub: 'Campus motorcycle standard'
            },
            {
              id: 'SCOOTER',
              icon: Compass,
              name: 'Electric / Scooter',
              capacity: '1 Rider',
              sub: 'Smooth step-through ride'
            }
          ].map((v) => {
            const Icon = v.icon;
            const isSelected = vehicleType === v.id;
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setVehicleType(v.id)}
                className={`ps-vehicle-row ${isSelected ? 'is-selected' : ''}`}
              >
                <div className="ps-vehicle-left">
                  {/* Explicit selection indicator */}
                  <div className={`ps-vehicle-radio ${isSelected ? 'is-selected' : ''}`} aria-hidden="true">
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </div>

                  <div className="ps-vehicle-icon-wrap" aria-hidden="true">
                    <Icon size={18} />
                  </div>

                  <div className="ps-vehicle-info">
                    <div className="ps-vehicle-title-row">
                      <span className="ps-vehicle-name">{v.name}</span>
                      <span className="ps-vehicle-capacity">{v.capacity}</span>
                    </div>
                    <span className="ps-vehicle-sub">{v.sub}</span>
                  </div>
                </div>

                <div className="ps-vehicle-right">
                  <span className="ps-vehicle-fare">
                    {currentFare ? `₹${currentFare}` : '₹25'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Preferences: Female Rider & Double Ride */}
        <div className="ps-pref-box">
          {(user?.gender || '').toUpperCase() === 'FEMALE' && (
            <label className="ps-pref-row">
              <div className="ps-pref-left">
                <Shield size={16} color="#DB2777" aria-hidden="true" />
                <span className="ps-pref-title">Female Rider Only</span>
              </div>
              <PSSwitch checked={femaleRiderOnly} onChange={setFemaleRiderOnly} tone="pink" />
            </label>
          )}

          <label className="ps-pref-row">
            <div className="ps-pref-left">
              <Users size={16} color="#EA580C" aria-hidden="true" />
              <div>
                <span className="ps-pref-title">Double Ride</span>
                <span className="ps-pref-badge">Save ₹10</span>
              </div>
            </div>
            <PSSwitch checked={isDoubleRide} onChange={setIsDoubleRide} tone="amber" />
          </label>
        </div>

        {/* Preference Availability Alert */}
        {hasPreferences && bookingMode === 'NOW' && (
          <div className="ps-pref-status-box ps-fade-up">
            {checkingPref && !prefAvailability ? (
              <div className="ps-pref-status ps-pref-status--checking">
                <span className="ps-pref-dot" aria-hidden="true" />
                <span>Checking driver availability for selected preference...</span>
              </div>
            ) : prefAvailability?.isAvailable ? (
              <div className="ps-pref-status ps-pref-status--available">
                <Check size={15} className="ps-pref-status-icon" aria-hidden="true" />
                <div className="ps-pref-status-text">
                  <span className="ps-pref-status-strong">Preference Available</span>
                  <span>{prefAvailability.matchingCount} matching driver{prefAvailability.matchingCount > 1 ? 's' : ''} ready on campus.</span>
                </div>
              </div>
            ) : (
              <div className="ps-pref-status ps-pref-status--unavailable">
                <div className="ps-pref-status-top">
                  <AlertTriangle size={15} className="ps-pref-status-icon" aria-hidden="true" />
                  <div className="ps-pref-status-text">
                    <span className="ps-pref-status-strong">Preference Unavailable</span>
                    <span className="ps-pref-status-desc">
                      {prefAvailability?.unavailableMessage || 'No matching drivers online right now.'}
                    </span>
                  </div>
                </div>
                {prefAvailability?.hasOtherRidersOnline && (
                  <div className="ps-pref-fallback-row">
                    <span className="ps-pref-fallback-note">
                      {prefAvailability.totalOnlineCount} other driver{prefAvailability.totalOnlineCount > 1 ? 's are' : ' is'} online.
                    </span>
                    <button
                      type="button"
                      className="ps-pref-opt-link"
                      onClick={() => {
                        setVehicleType('ANY');
                        setFemaleRiderOnly(false);
                      }}
                    >
                      <Zap size={12} /> Switch to Any Ride (Fastest)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 5. Booking Summary & Primary Action ── */}
      <div className="ps-summary-action-card">
        <div className="ps-summary-fare-row">
          <span className="ps-summary-fare-label">Total Estimated Fare</span>
          <span className="ps-summary-fare-val">
            {currentFare ? `₹${currentFare}` : '₹25'}
          </span>
        </div>

        <div className="ps-payment-method-row">
          <CreditCard size={13} color="#EA580C" aria-hidden="true" />
          <span>Payment: Cash or UPI directly to driver on drop</span>
        </div>

        <PSButton
          variant={bookingMode === 'SCHEDULE' ? 'blue' : 'primary'}
          size="lg"
          block
          disabled={bookingLoading || !pickupAddress || !destAddress}
          onClick={handleRequestRide}
          aria-label={bookingMode === 'SCHEDULE' ? 'Confirm and pre-book ride' : 'Confirm and request ride'}
        >
          {bookingLoading
            ? (bookingMode === 'SCHEDULE' ? 'Pre-Booking Ride...' : 'Requesting Ride...')
            : (bookingMode === 'SCHEDULE'
                ? 'Confirm & Pre-Book'
                : 'Confirm & Request Ride')}
        </PSButton>
      </div>

      {/* ── Preference Modal (Preserved Contract) ── */}
      {showPreferenceModal && (
        <div className="ps-modal-overlay">
          <div className="ps-modal ps-modal--md ps-modal-in ps-pref-modal" role="dialog" aria-modal="true">
            <div className="ps-modal-head">
              <div className="ps-modal-head-icon ps-modal-head-icon--amber">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="ps-modal-title">Preferred Ride Unavailable</h3>
                <p className="ps-modal-sub">No matching drivers currently active</p>
              </div>
              <button
                type="button"
                className="ps-modal-close"
                onClick={() => setShowPreferenceModal(false)}
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="ps-pref-modal-content">
              <div className="ps-pref-modal-alert">
                <AlertCircle size={18} className="ps-pref-modal-alert-icon" />
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

              <div className="ps-pref-summary-card">
                <div className="ps-pref-summary-item">
                  <span className="ps-pref-summary-label">Requested Preference</span>
                  <span className="ps-pref-summary-val ps-pref-summary-val--tag">
                    {vehicleType !== 'ANY' ? vehicleType : 'Any Vehicle'}
                    {effectiveFemaleOnly ? ' · Female Driver' : ''}
                  </span>
                </div>
                <div className="ps-pref-summary-item">
                  <span className="ps-pref-summary-label">Matching Drivers</span>
                  <span className="ps-pref-summary-val ps-pref-summary-val--red">
                    0 Online Nearby
                  </span>
                </div>
              </div>
            </div>

            <div className="ps-pref-modal-actions">
              <button
                type="button"
                className="ps-btn ps-btn--primary ps-btn--lg ps-btn--block"
                onClick={() => {
                  setShowPreferenceModal(false);
                  setVehicleType('ANY');
                  setFemaleRiderOnly(false);
                  executeRequestRide({ vehicleType: 'ANY', femaleRiderOnly: false });
                }}
              >
                <Zap size={15} /> Opt for Available Ride (Fastest)
              </button>

              <div className="ps-pref-secondary-row">
                <button
                  type="button"
                  className="ps-btn ps-btn--secondary ps-btn--block"
                  onClick={() => {
                    setShowPreferenceModal(false);
                    executeRequestRide();
                  }}
                >
                  Wait with Preference
                </button>
                <button
                  type="button"
                  className="ps-btn ps-btn--ghost ps-btn--block"
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
