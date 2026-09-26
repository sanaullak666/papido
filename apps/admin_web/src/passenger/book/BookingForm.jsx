import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api';
import { usePassenger } from '../shared/PassengerContext';
import { PSButton, PSCard, PSSwitch } from '../shared/PassengerUI';
import { openCancelWarning, openPenaltyModal } from '../shared/PassengerModals';
import '../shared/PassengerModals.css';
import {
  CAMPUS_HOTSPOTS, formatRideDateTime, getLocationHint
} from '../shared/passengerConstants';
import {
  Bike, Zap, Compass, MapPin, Clock, Plus, X,
  Users, Shield, CreditCard, Check, Calendar, AlertTriangle, AlertCircle
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
          vehicleType,
          femaleRiderOnly: effectiveFemaleOnly
        }, token);
        if (!isCancelled && res?.data) {
          setPrefAvailability(res.data);
        }
      } catch (err) {
        if (!isCancelled) {
          setPrefAvailability(null);
        }
      } finally {
        if (!isCancelled) {
          setCheckingPref(false);
        }
      }
    };

    checkAvailability();
    const interval = setInterval(checkAvailability, 15000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [vehicleType, effectiveFemaleOnly, hasPreferences, bookingMode, token]);

  /* Execute actual ride request (supports parameter overrides, e.g. opting for any ride) */
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

        // Validate that pre-booking is for future date/time
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
        scheduledTime: isSched ? targetScheduledTime : null
      };

      const res = await apiRequest('/customer/rides', 'POST', payload, token);

      if (isSched) {
        if (typeof fetchScheduledRides === 'function') {
          await fetchScheduledRides();
        }
        setStatusMessage({ text: 'Ride pre-booked successfully! View under the Advance tab.', type: 'success' });
        // Smoothly navigate to the Advance tab to view the pre-booked trip card
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

  const displayTime =
    rideNowTimeOption === 'NOW' ? 'Now' :
    rideNowTimeOption === '5MIN' ? 'In 5 min' :
    rideNowTimeOption === '10MIN' ? 'In 10 min' :
    rideNowTimeOption === '15MIN' ? 'In 15 min' : 'Custom';

  return (
    <div id="book-form" className="ps-booking-form">

      {/* Mode switch */}
      <div className="ps-mode-switch">
        <button
          type="button"
          onClick={() => setBookingMode('NOW')}
          className={`ps-mode-btn ${bookingMode === 'NOW' ? 'is-active is-amber' : ''}`}
        >
          <Zap size={15} /> Ride Now
        </button>
        <button
          type="button"
          onClick={() => setBookingMode('SCHEDULE')}
          className={`ps-mode-btn ${bookingMode === 'SCHEDULE' ? 'is-active is-blue' : ''}`}
        >
          <Calendar size={15} /> Pre-Book
        </button>
      </div>

      {/* Now time pills */}
      {bookingMode === 'NOW' && (
        <div className="ps-time-card ps-fade-up">
          <div className="ps-time-card-header">
            <div className="ps-time-card-label">
              <Clock size={15} /> Pickup Time
            </div>
            <span className="ps-time-display">{displayTime}</span>
          </div>
          <div className="ps-time-pills">
            {['NOW', '5MIN', '10MIN', '15MIN'].map(id => (
              <button
                key={id}
                type="button"
                onClick={() => setRideNowTimeOption(id)}
                className={`ps-time-pill ${rideNowTimeOption === id ? 'is-active' : ''}`}
              >
                {id === 'NOW' ? 'Now' : `+${id.replace('MIN', '')}m`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schedule date/time */}
      {bookingMode === 'SCHEDULE' && (
        <div className="ps-schedule-card ps-fade-up">
          <div className="ps-schedule-header">
            <div className="ps-schedule-title">
              <Calendar size={18} /> Schedule Trip
            </div>
            <span className="ps-schedule-tag">ADVANCE</span>
          </div>

          <div className="ps-schedule-date-pills">
            <button
              type="button"
              onClick={() => setScheduledDate(getTodayDateStr())}
              className={`ps-schedule-pill ${scheduledDate === getTodayDateStr() ? 'is-active' : ''}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setScheduledDate(getTomorrowDateStr())}
              className={`ps-schedule-pill ${scheduledDate === getTomorrowDateStr() ? 'is-active' : ''}`}
            >
              Tomorrow
            </button>
            <input
              type="date"
              min={getTodayDateStr()}
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="ps-schedule-date-input"
            />
          </div>

          <div className="ps-schedule-time-row">
            <select
              value={scheduledHour}
              onChange={(e) => setScheduledHour(e.target.value)}
              className="ps-select"
            >
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h =>
                <option key={h} value={h}>{h}</option>
              )}
            </select>
            <select
              value={scheduledMinute}
              onChange={(e) => setScheduledMinute(e.target.value)}
              className="ps-select"
            >
              {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m =>
                <option key={m} value={m}>{m}</option>
              )}
            </select>
            <div className="ps-schedule-period">
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
      )}

      {/* STEP 1: Pickup */}
      <PSCard className="ps-step-card ps-fade-up">
        <div className="ps-step-header">
          <div className="ps-step-left">
            <div className="ps-step-num ps-step-num--green">1</div>
            <div>
              <div className="ps-step-title">Pickup Location</div>
              <div className="ps-step-sub">Where should the rider meet you?</div>
            </div>
          </div>
          <span className="ps-step-tag ps-step-tag--green">STEP 1</span>
        </div>

        <select
          className="ps-select"
          value={pickupAddress}
          onChange={(e) => {
            setPickupAddress(e.target.value);
            setPickupCoords(findStopCoords(e.target.value));
          }}
        >
          {adminStops.map((s, i) => (
            <option key={`p-${i}`} value={s}>{s}</option>
          ))}
        </select>

        {getLocationHint(pickupAddress) && (
          <input
            type="text"
            className="ps-input"
            placeholder={getLocationHint(pickupAddress).placeholder}
            value={pickupDetail}
            onChange={(e) => setPickupDetail(e.target.value)}
            style={{ marginTop: 8 }}
          />
        )}

        {!showViaStop ? (
          <button
            type="button"
            onClick={() => setShowViaStop(true)}
            className="ps-via-add"
          >
            <Plus size={14} /> Add Via Stop (Optional)
          </button>
        ) : (
          <div className="ps-via-card ps-fade-up">
            <div className="ps-via-header">
              <label className="ps-via-label">
                <MapPin size={14} color="#F59E0B" /> Via Stop
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowViaStop(false);
                  setViaAddress(''); setViaDetail(''); setViaCoords(null);
                }}
                className="ps-via-remove"
              >
                <X size={12} /> Remove
              </button>
            </div>
            <select
              className="ps-select"
              value={viaAddress}
              onChange={(e) => {
                setViaAddress(e.target.value);
                setViaCoords(findStopCoords(e.target.value));
              }}
            >
              {adminStops.map((s, i) => (
                <option key={`v-${i}`} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </PSCard>

      {/* STEP 2: Destination */}
      <PSCard className="ps-step-card ps-fade-up">
        <div className="ps-step-header">
          <div className="ps-step-left">
            <div className="ps-step-num ps-step-num--amber">2</div>
            <div>
              <div className="ps-step-title">Drop-off Destination</div>
              <div className="ps-step-sub">Your final campus stop</div>
            </div>
          </div>
          <span className="ps-step-tag ps-step-tag--amber">STEP 2</span>
        </div>

        <select
          className="ps-select"
          value={destAddress}
          onChange={(e) => {
            setDestAddress(e.target.value);
            setDestCoords(findStopCoords(e.target.value));
          }}
        >
          {adminStops.map((s, i) => (
            <option key={`d-${i}`} value={s}>{s}</option>
          ))}
        </select>

        {getLocationHint(destAddress) && (
          <input
            type="text"
            className="ps-input"
            placeholder={getLocationHint(destAddress).placeholder}
            value={destDetail}
            onChange={(e) => setDestDetail(e.target.value)}
            style={{ marginTop: 8 }}
          />
        )}
      </PSCard>

      {/* STEP 3: Vehicle */}
      <PSCard className="ps-step-card ps-fade-up">
        <div className="ps-step-header">
          <div className="ps-step-left">
            <div className="ps-step-num ps-step-num--amber">3</div>
            <div>
              <div className="ps-step-title">Vehicle Type</div>
              <div className="ps-step-sub">Choose your ride</div>
            </div>
          </div>
          <span className="ps-step-tag ps-step-tag--amber">STEP 3</span>
        </div>

        <div className="ps-vehicle-grid">
          {[
            { id: 'ANY', icon: Zap, label: 'Any', sub: 'Fastest' },
            { id: 'BIKE', icon: Bike, label: 'Bike', sub: 'Standard' },
            { id: 'SCOOTER', icon: Compass, label: 'Scooter', sub: 'Smooth' }
          ].map((v) => {
            const Icon = v.icon;
            const isActive = vehicleType === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVehicleType(v.id)}
                className={`ps-vehicle-btn ${isActive ? 'is-active' : ''}`}
              >
                {isActive && <span className="ps-vehicle-check"><Check size={11} /></span>}
                <Icon size={22} color={isActive ? '#EA580C' : '#796D61'} />
                <span className="ps-vehicle-label">{v.label}</span>
                <span className="ps-vehicle-sub">{v.sub}</span>
              </button>
            );
          })}
        </div>

        <div className="ps-prefs-box">
          {(user?.gender || '').toUpperCase() === 'FEMALE' && (
            <label className="ps-pref-row ps-pref-row--divider">
              <div className="ps-pref-left">
                <Shield size={16} color="#EC4899" />
                <div>
                  <span className="ps-pref-title">Female Rider Only</span>
                </div>
              </div>
              <PSSwitch checked={femaleRiderOnly} onChange={setFemaleRiderOnly} tone="pink" />
            </label>
          )}
          <label className="ps-pref-row">
            <div className="ps-pref-left">
              <Users size={16} color="#EA580C" />
              <div>
                <span className="ps-pref-title">Double Ride</span>
                <div className="ps-pref-sub ps-pref-sub--green">Save ₹10</div>
              </div>
            </div>
            <PSSwitch checked={isDoubleRide} onChange={setIsDoubleRide} tone="amber" />
          </label>
        </div>

        {/* Preference Availability Indicator */}
        {hasPreferences && bookingMode === 'NOW' && (
          <div className="ps-pref-status-box ps-fade-up">
            {checkingPref && !prefAvailability ? (
              <div className="ps-pref-status ps-pref-status--checking">
                <div className="ps-pref-status-dot ps-pref-status-dot--pulse" />
                <span>Checking driver availability for preferences...</span>
              </div>
            ) : prefAvailability?.isAvailable ? (
              <div className="ps-pref-status ps-pref-status--available">
                <Check size={16} className="ps-pref-status-icon" />
                <div className="ps-pref-status-text">
                  <span className="ps-pref-status-strong">Preference Available!</span>
                  <span>{prefAvailability.matchingCount} matching driver{prefAvailability.matchingCount > 1 ? 's' : ''} ready nearby.</span>
                </div>
              </div>
            ) : (
              <div className="ps-pref-status ps-pref-status--unavailable">
                <div className="ps-pref-status-top">
                  <div className="ps-pref-status-icon-wrap">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="ps-pref-status-text">
                    <span className="ps-pref-status-strong">Preferred Ride Unavailable</span>
                    <span className="ps-pref-status-desc">
                      {prefAvailability?.unavailableMessage || 'No matching drivers online right now.'}
                    </span>
                  </div>
                </div>
                {prefAvailability?.hasOtherRidersOnline && (
                  <div className="ps-pref-fallback-row">
                    <span className="ps-pref-fallback-note">
                      {prefAvailability.totalOnlineCount} other driver{prefAvailability.totalOnlineCount > 1 ? 's are' : ' is'} online now.
                    </span>
                    <button
                      type="button"
                      className="ps-pref-opt-link"
                      onClick={() => {
                        setVehicleType('ANY');
                        setFemaleRiderOnly(false);
                      }}
                    >
                      <Zap size={13} /> Switch to Any Ride (Fastest)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </PSCard>

      {/* STEP 4: Fare */}
      <PSCard className="ps-fare-card ps-fade-up">
        <div className="ps-step-header">
          <div className="ps-step-left">
            <div className="ps-step-num ps-step-num--amber">4</div>
            <div>
              <div className="ps-step-title">Fare & Payment</div>
              <div className="ps-step-sub">Transparent pricing</div>
            </div>
          </div>
          <span className="ps-step-tag ps-step-tag--amber">STEP 4</span>
        </div>

        <div className="ps-fare-total">
          <div className="ps-fare-total-label">Total Fare</div>
          <div className="ps-fare-value">
            {estimating ? '...' : `₹${fareEstimate?.estimatedFare || (isDoubleRide ? Math.max(standardCampusFare || 25, (standardCampusFare || 25) * 2 - 10) : (standardCampusFare || 25))}`}
          </div>
        </div>

        <div className="ps-payment-row">
          <span className="ps-payment-label">Payment:</span>
          <span className="ps-payment-method">
            <CreditCard size={13} color="#EA580C" /> Cash / UPI on Drop
          </span>
        </div>
      </PSCard>

      {/* Confirm */}
      <PSButton
        variant={bookingMode === 'SCHEDULE' ? 'blue' : 'primary'}
        size="lg"
        block
        disabled={bookingLoading || !pickupAddress || !destAddress}
        onClick={handleRequestRide}
      >
        {bookingLoading
          ? (bookingMode === 'SCHEDULE' ? 'Pre-Booking...' : 'Requesting...')
          : (bookingMode === 'SCHEDULE'
              ? 'Confirm & Pre-Book'
              : 'Confirm & Request Ride')}
      </PSButton>

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
                className="ps-btn ps-btn--primary ps-btn--lg ps-btn--block ps-pref-action-btn"
                onClick={() => {
                  setShowPreferenceModal(false);
                  setVehicleType('ANY');
                  setFemaleRiderOnly(false);
                  executeRequestRide({ vehicleType: 'ANY', femaleRiderOnly: false });
                }}
              >
                <Zap size={16} /> Opt for Available Ride (Fastest)
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
