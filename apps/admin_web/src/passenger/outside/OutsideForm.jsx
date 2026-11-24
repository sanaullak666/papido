import React, { useState, useEffect, useRef } from 'react';
import {
  Compass, MapPin, Search, X,
  Luggage, Send, CheckCircle2, ChevronRight, Lock, Tag, ArrowUpDown, RefreshCw,
  ChevronDown, Check, Navigation
} from 'lucide-react';
import { apiRequest } from '../../api';

const ALL_CAMPUS_GATES = [
  { name: 'Campus Gate 1 (Main Entrance)', lat: 12.0228681, lng: 79.8509415 },
  { name: 'Campus Gate 2 (Beach Road Gate / ECR)', lat: 12.0295, lng: 79.8580 },
  { name: 'Silver Jubilee Campus (SJC Gate)', lat: 12.0280, lng: 79.8520 },
  { name: 'University Health Centre Outpost', lat: 12.0240, lng: 79.8530 },
  { name: 'Girls Hostel Complex', lat: 12.0215, lng: 79.8565 },
  { name: 'Boys Hostel Complex', lat: 12.0275, lng: 79.8515 },
  { name: 'Central Library', lat: 12.0245, lng: 79.8532 }
];

const GATES = [
  'Campus Gate 1 (Main Entrance)',
  'Campus Gate 2 (Beach Road Gate / ECR)',
  'Silver Jubilee Campus (SJC Gate)',
  'University Health Centre Outpost'
];

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

export function OutsideForm({
  onSubmit,
  token,
  destination,
  setDestination,
  destinationCoords,
  setDestinationCoords
}) {
  const [pickup, setPickup] = useState(ALL_CAMPUS_GATES[0].name);
  const [pickupCoords, setPickupCoords] = useState({ lat: 12.0228681, lng: 79.8509415 });

  const [adminOutsideStops, setAdminOutsideStops] = useState([]);
  const [matchedFare, setMatchedFare] = useState(null);

  const [departureSchedule, setDepartureSchedule] = useState('immediate'); // 'immediate' or 'scheduled'
  const [scheduledDate, setScheduledDate] = useState(() => getTomorrowDateStr());
  const [scheduledTime, setScheduledTime] = useState('09:30');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Dropdown floating menu states & refs (matching Campus Ride experience)
  const [pickupMenuOpen, setPickupMenuOpen] = useState(false);
  const [destMenuOpen, setDestMenuOpen] = useState(false);
  const pickupWrapRef = useRef(null);
  const destWrapRef = useRef(null);

  // Close floating menus when clicking/touching outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickupWrapRef.current && !pickupWrapRef.current.contains(e.target)) {
        setPickupMenuOpen(false);
      }
      if (destWrapRef.current && !destWrapRef.current.contains(e.target)) {
        setDestMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Fetch admin configured outside destinations
  useEffect(() => {
    let isMounted = true;
    const loadOutsideDestinations = async () => {
      try {
        const res = await apiRequest('/customer/outside-destinations', 'GET', null, token);
        if (isMounted && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setAdminOutsideStops(res.data);
        }
      } catch (err) {
        console.warn('Could not load outside destinations', err);
      }
    };
    loadOutsideDestinations();
    return () => { isMounted = false; };
  }, [token]);

  // Combined stops for suggestions: Campus Gates + Admin Configured Outside Stops
  const allKnownStops = [
    ...ALL_CAMPUS_GATES.map(g => ({ name: g.name, lat: g.lat, lng: g.lng, type: 'CAMPUS' })),
    ...adminOutsideStops.map(s => ({
      name: s.name,
      lat: parseFloat(s.lat || 11.9338),
      lng: parseFloat(s.lng || 79.8359),
      fare: parseFloat(s.fare_amount),
      dist: s.distance_km,
      type: 'OUTSIDE'
    }))
  ];

  const findStopCoords = (name) => {
    if (!name) return null;
    const n = name.trim().toLowerCase();
    const matched = allKnownStops.find(s => s.name.toLowerCase() === n || n.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(n));
    if (matched) return { lat: matched.lat, lng: matched.lng };
    return null;
  };

  // Match route (pickup <-> destination) with pre-approved fare strictly from admin configurations
  useEffect(() => {
    if (!pickup || !destination) {
      setMatchedFare(null);
      return;
    }
    const pLower = pickup.trim().toLowerCase();
    const dLower = destination.trim().toLowerCase();

    const matched = adminOutsideStops.find(s => {
      const sName = (s.name || s.destination_stop || '').toLowerCase();
      // Forward: pickup is campus, destination is outside spot
      // Reverse: pickup is outside spot, destination is campus
      return (dLower.includes(sName) || sName.includes(dLower)) ||
             (pLower.includes(sName) || sName.includes(pLower));
    });

    if (matched) {
      setMatchedFare(parseFloat(matched.fare_amount || matched.fare));
      if (!destinationCoords) {
        const found = findStopCoords(destination);
        if (found) setDestinationCoords(found);
      }
    } else {
      setMatchedFare(null);
    }
  }, [pickup, destination, adminOutsideStops]);

  // One-click Swap Direction for Return Trips
  const handleSwapRoute = () => {
    const currentPickup = pickup;
    const currentPickupCoords = pickupCoords;
    const currentDest = destination;
    const currentDestCoords = destinationCoords;

    if (!currentDest) {
      setDestination(currentPickup);
      setDestinationCoords(currentPickupCoords);
      setPickup('');
      setPickupCoords(null);
      return;
    }

    setPickup(currentDest);
    setPickupCoords(currentDestCoords || findStopCoords(currentDest) || { lat: 11.9338, lng: 79.8359 });
    setDestination(currentPickup);
    setDestinationCoords(currentPickupCoords || findStopCoords(currentPickup) || { lat: 12.0228681, lng: 79.8509415 });
  };

  const handleSelectQuickPick = (item) => {
    setDestination(item.name);
    setDestinationCoords({ lat: item.lat, lng: item.lng });
  };

  // Filter stops by query (matching Campus Ride token-search algorithm)
  const filterStopsByQuery = (stops, query) => {
    if (!query || !query.trim()) return stops;
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    return stops.filter(stop => {
      const s = (typeof stop === 'string' ? stop : stop.name).toLowerCase();
      if (s.includes(q)) return true;
      return tokens.every(t => s.includes(t));
    });
  };

  const filteredPickupStops = filterStopsByQuery(allKnownStops, pickup);
  const filteredDestStops = filterStopsByQuery(allKnownStops, destination);

  const handleSelectPickup = (item) => {
    setPickup(item.name);
    setPickupCoords({ lat: item.lat, lng: item.lng });
    setPickupMenuOpen(false);
  };

  const handleSelectDest = (item) => {
    setDestination(item.name);
    setDestinationCoords({ lat: item.lat, lng: item.lng });
    setDestMenuOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pickup.trim()) {
      setErrorMsg('Please specify or pick an origin pickup point.');
      return;
    }
    if (!destination.trim()) {
      setErrorMsg('Please specify or pick a drop destination.');
      return;
    }
    if (pickup.trim().toLowerCase() === destination.trim().toLowerCase()) {
      setErrorMsg('Pickup and destination cannot be the exact same stop.');
      return;
    }
    setErrorMsg('');

    const isSched = departureSchedule === 'scheduled';
    let targetScheduledTime = null;

    if (isSched) {
      if (!scheduledDate || !scheduledTime) {
        setErrorMsg('Please select a valid date and time slot.');
        return;
      }
      targetScheduledTime = `${scheduledDate} ${scheduledTime}:00`;
      const targetDateObj = new Date(`${scheduledDate}T${scheduledTime}:00`);
      if (isNaN(targetDateObj.getTime()) || targetDateObj.getTime() <= Date.now()) {
        setErrorMsg('Please choose a future departure time slot.');
        return;
      }
    }

    const pCoords = pickupCoords || findStopCoords(pickup) || { lat: 12.0228681, lng: 79.8509415 };
    const dCoords = destinationCoords || findStopCoords(destination) || { lat: 11.9338, lng: 79.8359 };

    setSubmitting(true);
    const ok = await onSubmit({
      pickupAddress: pickup,
      pickupLatitude: pCoords.lat,
      pickupLongitude: pCoords.lng,
      destinationAddress: destination,
      destinationLatitude: dCoords.lat,
      destinationLongitude: dCoords.lng,
      vehicleType: 'ANY',
      isDoubleRide: false,
      isOutside: true,
      isScheduled: isSched,
      scheduledTime: targetScheduledTime,
      passengerNotes: notes.trim() || undefined
    });
    setSubmitting(false);
    if (ok) {
      setDestination('');
      setDestinationCoords(null);
      setNotes('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ps-outside-card-form ps-fade-up">

      {/* STEP 1: Pickup Location (Selectable: Campus Gate or Outside Spot) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="font-label-md uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            Origin (Pickup Point)
          </label>
          <span className="font-label-sm text-on-surface-variant font-semibold text-xs">
            Campus Gate or Outside Landmark
          </span>
        </div>

        <div className="ps-searchable-stop-wrap" ref={pickupWrapRef}>
          <div className="ps-pill-input-wrap">
            <span className="ps-pill-input-icon ps-pill-input-icon--primary">
              <MapPin size={18} />
            </span>
            <input
              type="text"
              className="ps-pill-input"
              placeholder="Search or pick pickup (Gate, Beach, Railway Station...)"
              value={pickup}
              onChange={(e) => {
                const val = e.target.value;
                setPickup(val);
                const found = findStopCoords(val);
                if (found) setPickupCoords(found);
                setPickupMenuOpen(true);
              }}
              onFocus={() => setPickupMenuOpen(true)}
              required
            />
            {pickup ? (
              <button
                type="button"
                className="ps-pill-clear-btn"
                title="Clear pickup"
                onClick={() => {
                  setPickup('');
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

          {/* Floating Suggestions List matching Campus Ride Booking */}
          {pickupMenuOpen && (
            <div className="ps-suggestions-menu ps-fade-up">
              {filteredPickupStops.length > 0 ? (
                filteredPickupStops.map((item) => (
                  <div
                    key={`p-sug-${item.name}`}
                    className={`ps-suggestion-item ${pickup === item.name ? 'is-selected' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectPickup(item);
                    }}
                  >
                    <MapPin size={15} className="ps-suggestion-icon" />
                    <span className="ps-suggestion-text">{item.name}</span>
                    <span className={`ps-suggestion-badge ${item.type === 'CAMPUS' ? 'ps-suggestion-badge--campus' : 'ps-suggestion-badge--outside'}`}>
                      {item.type === 'CAMPUS' ? 'Campus Gate' : 'Outside Spot'}
                    </span>
                    {item.fare && <span className="ps-route-fare-tag">₹{parseFloat(item.fare)}</span>}
                    {pickup === item.name && <Check size={14} className="ps-suggestion-check" />}
                  </div>
                ))
              ) : (
                <div className="ps-suggestion-empty">
                  <Search size={14} />
                  <span>No stop matching "{pickup}"</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick-Pick Campus Gates for fast selection */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-outline font-bold uppercase tracking-wider mr-1">
            Campus Gates:
          </span>
          {ALL_CAMPUS_GATES.slice(0, 4).map((gate) => (
            <button
              key={gate.name}
              type="button"
              className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                pickup === gate.name
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                  : 'bg-surface-container-low text-on-surface-variant border-outline-variant/40 hover:border-emerald-400'
              }`}
              onClick={() => {
                setPickup(gate.name);
                setPickupCoords({ lat: gate.lat, lng: gate.lng });
              }}
            >
              {gate.name.replace('Campus ', '').replace(' (Main Entrance)', ' (Gate 1)')}
            </button>
          ))}
        </div>
      </div>

      {/* ⇄ ROUTE DIRECTION SWAP BUTTON (Return Rides) */}
      <div className="flex justify-center -my-1 z-10">
        <button
          type="button"
          onClick={handleSwapRoute}
          title="Swap Pickup and Drop-off for Return Trips"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: '#FFFFFF',
            border: '1px solid #D6D3D1',
            color: '#EA580C',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'all 150ms ease'
          }}
        >
          <ArrowUpDown size={14} color="#EA580C" />
          <span>⇄ Swap Direction (Return Ride)</span>
        </button>
      </div>

      {/* STEP 2: Drop Destination (Selectable: Outside Spot or Campus Gate) */}
      <div className="flex flex-col gap-2">
        <label className="font-label-md uppercase tracking-wider text-on-surface-variant flex items-center justify-between font-bold">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            Drop Destination
          </span>
          {matchedFare && (
            <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
              Approved Fare: ₹{matchedFare.toFixed(2)}
            </span>
          )}
        </label>

        <div className="ps-searchable-stop-wrap" ref={destWrapRef}>
          <div className="ps-pill-input-wrap">
            <span className="ps-pill-input-icon ps-pill-input-icon--dest">
              <Navigation size={18} />
            </span>
            <input
              type="text"
              className="ps-pill-input"
              placeholder="Search destination, hotel, beach, station, or campus gate..."
              value={destination}
              onChange={(e) => {
                const val = e.target.value;
                setDestination(val);
                const found = findStopCoords(val);
                if (found) setDestinationCoords(found);
                setDestMenuOpen(true);
              }}
              onFocus={() => setDestMenuOpen(true)}
              required
            />
            {destination ? (
              <button
                type="button"
                className="ps-pill-clear-btn"
                title="Clear destination"
                onClick={() => {
                  setDestination('');
                  setDestinationCoords(null);
                  setMatchedFare(null);
                  setDestMenuOpen(true);
                }}
              >
                <X size={15} />
              </button>
            ) : (
              <button
                type="button"
                className="ps-pill-clear-btn"
                title="Browse stops"
                onClick={() => setDestMenuOpen(!destMenuOpen)}
              >
                <ChevronDown size={16} />
              </button>
            )}
          </div>

          {/* Floating Suggestions List matching Campus Ride Booking */}
          {destMenuOpen && (
            <div className="ps-suggestions-menu ps-fade-up">
              {filteredDestStops.length > 0 ? (
                filteredDestStops.map((item) => (
                  <div
                    key={`d-sug-${item.name}`}
                    className={`ps-suggestion-item ${destination === item.name ? 'is-selected' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectDest(item);
                    }}
                  >
                    <Navigation size={15} className="ps-suggestion-icon" />
                    <span className="ps-suggestion-text">{item.name}</span>
                    <span className={`ps-suggestion-badge ${item.type === 'CAMPUS' ? 'ps-suggestion-badge--campus' : 'ps-suggestion-badge--outside'}`}>
                      {item.type === 'CAMPUS' ? 'Campus Gate' : 'Outside Spot'}
                    </span>
                    {item.fare && <span className="ps-route-fare-tag">₹{parseFloat(item.fare)}</span>}
                    {destination === item.name && <Check size={14} className="ps-suggestion-check" />}
                  </div>
                ))
              ) : (
                <div className="ps-suggestion-empty">
                  <Search size={14} />
                  <span>No stop matching "{destination}"</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Display Pre-Approved Price Notification */}
        {matchedFare && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'rgba(4, 120, 87, 0.08)',
            border: '1px solid rgba(4, 120, 87, 0.25)',
            borderRadius: '10px',
            marginTop: '4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#047857" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#065F46' }}>
                Approved Outside Route · Instant Dispatch
              </span>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#047857' }}>
              ₹{matchedFare.toFixed(2)}
            </span>
          </div>
        )}

        {/* Quick-Pick Outside Stops (Loaded strictly from Admin configurations) */}
        <div className="flex flex-col gap-1.5 mt-1">
          <span className="font-label-sm text-outline font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1">
            <Tag size={12} color="#EA580C" />
            Configured Outside Destinations &amp; Approved Fares
          </span>
          {adminOutsideStops.length === 0 ? (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(120, 113, 108, 0.08)',
              fontSize: '12px',
              color: '#78716C',
              fontStyle: 'italic'
            }}>
              No outside routes added by admin yet. Admin will configure outside stops and fixed fares.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {adminOutsideStops.map((item) => {
                const itemName = item.name || item.destination_stop;
                const isSelected = destination.toLowerCase().includes(itemName.toLowerCase()) || itemName.toLowerCase().includes(destination.toLowerCase());
                const fareVal = item.fare_amount || item.fare;
                const itemIcon = item.icon || (itemName.toLowerCase().includes('beach') ? '🌊' : itemName.toLowerCase().includes('station') ? '🚂' : itemName.toLowerCase().includes('hospital') ? '🏥' : itemName.toLowerCase().includes('auroville') ? '🌳' : '🏛️');

                return (
                  <button
                    key={itemName}
                    type="button"
                    className={`ps-quick-chip ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelectQuickPick({
                      name: itemName,
                      lat: parseFloat(item.lat || item.destination_latitude || 11.9338),
                      lng: parseFloat(item.lng || item.destination_longitude || 79.8359),
                      fare: fareVal
                    })}
                  >
                    <span>{itemIcon}</span>
                    <span>{itemName}</span>
                    {fareVal && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: isSelected ? '#FFFFFF' : '#047857',
                        background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(4,120,87,0.12)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        marginLeft: '4px'
                      }}>
                        ₹{parseFloat(fareVal).toFixed(0)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* STEP 3: Trip Schedule Type (Single Custom Radio) */}
      <div className="flex flex-col gap-2">
        <label className="font-label-md uppercase tracking-wider text-on-surface-variant font-bold">
          Departure Preference
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Depart Immediately */}
          <div
            role="radio"
            aria-checked={departureSchedule === 'immediate'}
            tabIndex={0}
            className={`ps-schedule-radio-card ${departureSchedule === 'immediate' ? 'is-selected' : ''}`}
            onClick={() => setDepartureSchedule('immediate')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDepartureSchedule('immediate'); }}
          >
            <div className="ps-radio-circle">
              {departureSchedule === 'immediate' && <div className="ps-radio-inner" />}
            </div>
            <div className="flex flex-col">
              <span className="font-label-lg font-bold text-on-surface">Depart Immediately</span>
              <span className="font-body-sm text-xs text-on-surface-variant">
                Dispatch assigns nearest campus car (~5-8 mins)
              </span>
            </div>
          </div>

          {/* Schedule for Later */}
          <div
            role="radio"
            aria-checked={departureSchedule === 'scheduled'}
            tabIndex={0}
            className={`ps-schedule-radio-card ${departureSchedule === 'scheduled' ? 'is-selected' : ''}`}
            onClick={() => setDepartureSchedule('scheduled')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDepartureSchedule('scheduled'); }}
          >
            <div className="ps-radio-circle">
              {departureSchedule === 'scheduled' && <div className="ps-radio-inner" />}
            </div>
            <div className="flex flex-col">
              <span className="font-label-lg font-bold text-on-surface">Schedule for Later</span>
              <span className="font-body-sm text-xs text-on-surface-variant">
                Reserve dispatch slot up to 48 hours ahead
              </span>
            </div>
          </div>
        </div>

        {/* Schedule Inputs Drawer */}
        {departureSchedule === 'scheduled' && (
          <div className="flex flex-col sm:flex-row gap-3 p-3.5 bg-surface-container rounded-xl mt-1 ps-fade-up">
            <div className="flex-1">
              <label className="font-label-sm text-on-surface-variant block mb-1">Pick Date</label>
              <input
                type="date"
                min={getTodayDateStr()}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-full bg-surface-container-lowest font-body-md text-on-surface text-sm border border-outline-variant/40 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="font-label-sm text-on-surface-variant block mb-1">Preferred Time</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 rounded-full bg-surface-container-lowest font-body-md text-on-surface text-sm border border-outline-variant/40 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* STEP 4: Passenger & Luggage Notes */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="font-label-md uppercase tracking-wider text-on-surface-variant font-bold">
            Passenger &amp; Luggage Notes (Optional)
          </label>
          <span className="font-label-sm text-outline text-[11px]">Max 140 chars</span>
        </div>
        <div className="relative">
          <textarea
            rows="2"
            maxLength={140}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 pr-10 bg-surface-container-low rounded-xl font-body-md text-sm text-on-surface placeholder:text-outline border border-outline-variant/30 outline-none resize-none transition-all focus:bg-surface-container-lowest"
            placeholder="e.g., carrying 1 suitcase, traveling with 2 friends, stopping at SBI ATM first"
          />
          <div className="absolute bottom-3 right-3 text-outline-variant pointer-events-none">
            <Luggage size={16} />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Submission CTA Button */}
      <button
        type="submit"
        disabled={submitting || !destination.trim()}
        className="ps-outside-submit-btn"
      >
        <Send size={18} />
        <span>
          {submitting
            ? 'Contacting Central Campus Dispatch...'
            : departureSchedule === 'scheduled'
            ? 'Pre-Book Outside Campus Ride'
            : 'Submit Outside Campus Request'}
        </span>
      </button>

    </form>
  );
}

export default OutsideForm;
