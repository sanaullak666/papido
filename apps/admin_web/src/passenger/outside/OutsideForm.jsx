import React, { useState } from 'react';
import { PSButton } from '../shared/PassengerUI';
import { LocationInput } from './LocationInput';
import { PopularSpots } from './PopularSpots';
import { POPULAR_OUTSIDE_SPOTS } from '../shared/passengerConstants';
import { usePassenger } from '../shared/PassengerContext';
import {
  Bike, Zap, Compass, Clock, Send, Check, History, ArrowRight, Calendar
} from 'lucide-react';

const VEHICLE_OPTIONS = [
  { id: 'ANY',     icon: Zap,     label: 'Any',     sub: 'Fastest' },
  { id: 'BIKE',    icon: Bike,    label: 'Bike',    sub: 'Standard' },
  { id: 'SCOOTER', icon: Compass, label: 'Scooter', sub: 'Smooth' }
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

/**
 * Extract a compact "recent outside trips" list from ride history.
 * Filters only outside trips (destination not in campus hotspots)
 * and dedupes by destination.
 */
function useRecentDestinations() {
  const { pastRides = [] } = usePassenger();

  return React.useMemo(() => {
    const safeRides = Array.isArray(pastRides) ? pastRides : [];
    const seen = new Set();
    const list = [];

    for (const r of safeRides) {
      const dest = (r?.destination_address || '').trim();
      if (!dest) continue;
      const key = dest.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({
        name: dest,
        lat: parseFloat(r.destination_latitude) || null,
        lng: parseFloat(r.destination_longitude) || null
      });
      if (list.length >= 3) break;
    }

    return list;
  }, [pastRides]);
}

export function OutsideForm({ onSubmit, token }) {
  const [pickup, setPickup] = useState('PU Main Gate (Gate 1)');
  const [pickupCoords, setPickupCoords] = useState({
    lat: 12.0228681, lng: 79.8509415
  });

  const [dest, setDest] = useState('');
  const [destCoords, setDestCoords] = useState(null);

  const [vehicleType, setVehicleType] = useState('ANY');
  const [submitting, setSubmitting] = useState(false);

  /* Mode and Date/Time for pre-booking */
  const [bookingMode, setBookingMode] = useState('NOW'); // 'NOW' or 'SCHEDULE'
  const [scheduledDate, setScheduledDate] = useState(() => getLocalDateString(new Date(Date.now() + 3600000)));
  const [scheduledHour, setScheduledHour] = useState('09');
  const [scheduledMinute, setScheduledMinute] = useState('00');
  const [scheduledAmPm, setScheduledAmPm] = useState('AM');
  const [dateError, setDateError] = useState('');

  /* Recent outside trips (auto-derived from history) */
  const recentDestinations = useRecentDestinations();

  const formatScheduledPreview = () => {
    let h24 = parseInt(scheduledHour, 10);
    if (scheduledAmPm === 'PM' && h24 < 12) h24 += 12;
    if (scheduledAmPm === 'AM' && h24 === 12) h24 = 0;
    const timePart = `${String(h24).padStart(2, '0')}:${scheduledMinute}:00`;
    try {
      const d = new Date(`${scheduledDate}T${timePart}`);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dest.trim()) return;

    const isSched = bookingMode === 'SCHEDULE';
    let targetScheduledTime = null;

    if (isSched) {
      let h24 = parseInt(scheduledHour, 10);
      if (scheduledAmPm === 'PM' && h24 < 12) h24 += 12;
      if (scheduledAmPm === 'AM' && h24 === 12) h24 = 0;
      const timePart = `${String(h24).padStart(2, '0')}:${scheduledMinute}:00`;
      targetScheduledTime = `${scheduledDate} ${timePart}`;

      const targetDateObj = new Date(`${scheduledDate}T${timePart}`);
      if (isNaN(targetDateObj.getTime()) || targetDateObj.getTime() <= Date.now()) {
        setDateError('Please choose a future date and time for pre-booking.');
        return;
      }
      setDateError('');
    }

    setSubmitting(true);
    const ok = await onSubmit({
      pickupAddress: pickup,
      pickupLatitude: pickupCoords.lat,
      pickupLongitude: pickupCoords.lng,
      destinationAddress: dest,
      destinationLatitude: destCoords?.lat ?? 11.9338,
      destinationLongitude: destCoords?.lng ?? 79.8359,
      vehicleType,
      isDoubleRide: false,
      isOutside: true,
      isScheduled: isSched,
      scheduledTime: targetScheduledTime
    });
    setSubmitting(false);
    if (ok) {
      setDest('');
      setDestCoords(null);
    }
  };

  const handleSelectPopular = (spot) => {
    setDest(spot.name);
    setDestCoords({ lat: spot.lat, lng: spot.lng });
  };

  const handleSelectRecent = (spot) => {
    setDest(spot.name);
    if (spot.lat && spot.lng) {
      setDestCoords({ lat: spot.lat, lng: spot.lng });
    }
  };

  const scheduledPreviewText = formatScheduledPreview();

  return (
    <form onSubmit={handleSubmit} className="ps-outside-form">

      {/* ── BOOKING MODE TOGGLE (NOW vs PRE-BOOK) ── */}
      <div className="ps-mode-pills ps-fade-up">
        <button
          type="button"
          onClick={() => { setBookingMode('NOW'); setDateError(''); }}
          className={`ps-mode-pill ${bookingMode === 'NOW' ? 'is-active' : ''}`}
        >
          <Zap size={14} /> Leave Now
        </button>
        <button
          type="button"
          onClick={() => setBookingMode('SCHEDULE')}
          className={`ps-mode-pill ${bookingMode === 'SCHEDULE' ? 'is-active' : ''}`}
        >
          <Calendar size={14} /> Pre-Book / Advance
        </button>
      </div>

      {/* ── SCHEDULE DATE & TIME (ACTIVE WHEN PRE-BOOK) ── */}
      {bookingMode === 'SCHEDULE' && (
        <div className="ps-schedule-card ps-fade-up">
          <div className="ps-schedule-header">
            <div className="ps-schedule-title">
              <Calendar size={18} color="#EA580C" /> Schedule Outside Trip
            </div>
            <span className="ps-schedule-tag">ADVANCE DISPATCH</span>
          </div>

          <div className="ps-schedule-date-pills">
            <button
              type="button"
              onClick={() => { setScheduledDate(getTodayDateStr()); setDateError(''); }}
              className={`ps-schedule-pill ${scheduledDate === getTodayDateStr() ? 'is-active' : ''}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => { setScheduledDate(getTomorrowDateStr()); setDateError(''); }}
              className={`ps-schedule-pill ${scheduledDate === getTomorrowDateStr() ? 'is-active' : ''}`}
            >
              Tomorrow
            </button>
            <input
              type="date"
              min={getTodayDateStr()}
              value={scheduledDate}
              onChange={(e) => { setScheduledDate(e.target.value); setDateError(''); }}
              className="ps-schedule-date-input"
              title="Select custom date"
            />
          </div>

          <div className="ps-schedule-time-row">
            <select
              value={scheduledHour}
              onChange={(e) => { setScheduledHour(e.target.value); setDateError(''); }}
              className="ps-select"
              title="Select hour"
            >
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h =>
                <option key={h} value={h}>{h}</option>
              )}
            </select>
            <select
              value={scheduledMinute}
              onChange={(e) => { setScheduledMinute(e.target.value); setDateError(''); }}
              className="ps-select"
              title="Select minute"
            >
              {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m =>
                <option key={m} value={m}>{m}</option>
              )}
            </select>
            <div className="ps-schedule-period">
              <button
                type="button"
                onClick={() => { setScheduledAmPm('AM'); setDateError(''); }}
                className={`ps-period-btn ${scheduledAmPm === 'AM' ? 'is-active' : ''}`}
              >AM</button>
              <button
                type="button"
                onClick={() => { setScheduledAmPm('PM'); setDateError(''); }}
                className={`ps-period-btn ${scheduledAmPm === 'PM' ? 'is-active' : ''}`}
              >PM</button>
            </div>
          </div>

          {scheduledPreviewText && (
            <div className="ps-schedule-preview">
              <Clock size={13} />
              <span>Pickup on: <strong>{scheduledPreviewText}</strong></span>
            </div>
          )}

          {dateError && (
            <div className="ps-schedule-error">
              {dateError}
            </div>
          )}
        </div>
      )}

      {/* PICKUP */}
      <LocationInput
        label="Pickup Location"
        accent="green"
        value={pickup}
        onChange={setPickup}
        coords={pickupCoords}
        onCoordsChange={setPickupCoords}
        placeholder="Type campus gate, hostel, or paste Google Maps link..."
        token={token}
        target="pickup"
      />

      {/* DESTINATION */}
      <LocationInput
        label="Drop-off Destination"
        accent="amber"
        value={dest}
        onChange={setDest}
        coords={destCoords}
        onCoordsChange={setDestCoords}
        placeholder="Type destination, choose on map, or paste link..."
        token={token}
        target="dest"
        required
      />

      {/* ── RECENT DESTINATIONS (NEW) ── */}
      {recentDestinations.length > 0 && (
        <div className="ps-recent-wrap ps-fade-up">
          <div className="ps-recent-header">
            <History size={12} />
            <span className="ps-recent-title">Recent trips</span>
            <span className="ps-recent-hint">1-tap refill</span>
          </div>
          <div className="ps-recent-grid">
            {recentDestinations.map((spot) => {
              const isActive = dest === spot.name;
              return (
                <button
                  key={spot.name}
                  type="button"
                  onClick={() => handleSelectRecent(spot)}
                  className={`ps-recent-pill ${isActive ? 'is-active' : ''}`}
                  title={spot.name}
                >
                  <ArrowRight size={10} />
                  <span className="ps-recent-pill-text">{spot.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* POPULAR SPOTS */}
      <PopularSpots
        spots={POPULAR_OUTSIDE_SPOTS}
        activeName={dest}
        onSelect={handleSelectPopular}
      />

      {/* VEHICLE */}
      <div className="ps-field">
        <label className="ps-field-label">Vehicle Preference</label>
        <div className="ps-vehicle-grid">
          {VEHICLE_OPTIONS.map((v) => {
            const Icon = v.icon;
            const isActive = vehicleType === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVehicleType(v.id)}
                className={`ps-vehicle-btn ${isActive ? 'is-active' : ''}`}
              >
                {isActive && (
                  <span className="ps-vehicle-check">
                    <Check size={11} />
                  </span>
                )}
                <Icon size={20} color={isActive ? '#EA580C' : '#796D61'} />
                <span className="ps-vehicle-label">{v.label}</span>
                <span className="ps-vehicle-sub">{v.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* INFO */}
      <div className="ps-info-box ps-fade-up">
        <Clock size={16} color="#EA580C" />
        <span>
          Dispatch will calculate an official distance-based fare. Review the
          quote on your live trip card before payment.
        </span>
      </div>

      {/* SUBMIT */}
      <PSButton
        type="submit"
        variant="primary"
        size="lg"
        block
        disabled={submitting || !pickup.trim() || !dest.trim()}
      >
        {submitting ? (
          bookingMode === 'SCHEDULE' ? 'Submitting Pre-Booking...' : 'Submitting Request...'
        ) : bookingMode === 'SCHEDULE' ? (
          <>
            Pre-Book for Dispatch Quote
            <Calendar size={15} />
          </>
        ) : (
          <>
            Submit for Dispatch Quote
            <Send size={15} />
          </>
        )}
      </PSButton>
    </form>
  );
}

export default OutsideForm;
