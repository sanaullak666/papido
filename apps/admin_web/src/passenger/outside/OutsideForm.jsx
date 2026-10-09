import React, { useState } from 'react';
import {
  Compass, MapPin, Search, X, Calendar, Clock,
  Luggage, Info, Send, CheckCircle2, ChevronRight, Lock
} from 'lucide-react';

const QUICK_PICK_DESTS = [
  { name: 'White Town (Heritage)', lat: 11.9333, lng: 79.8333, icon: '🏛️' },
  { name: 'Rock Beach / Promenade', lat: 11.9338, lng: 79.8359, icon: '🌊' },
  { name: 'JIPMER Hospital', lat: 11.9546, lng: 79.7997, icon: '🏥' },
  { name: 'Puducherry Railway Station', lat: 11.9288, lng: 79.8286, icon: '🚂' },
  { name: 'Auroville Visitors Centre', lat: 12.0069, lng: 79.8105, icon: '🌳' },
  { name: 'ECR Bus Stop', lat: 12.0235, lng: 79.8512, icon: '🚌' }
];

const GATES = [
  'Campus Gate 1 (Main Entrance)',
  'Campus Gate 2 (Beach Road Gate)',
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
  const [pickup, setPickup] = useState(GATES[0]);
  const [pickupCoords, setPickupCoords] = useState({ lat: 12.0228681, lng: 79.8509415 });
  const [gateIndex, setGateIndex] = useState(0);

  const [departureSchedule, setDepartureSchedule] = useState('immediate'); // 'immediate' or 'scheduled'
  const [scheduledDate, setScheduledDate] = useState(() => getTomorrowDateStr());
  const [scheduledTime, setScheduledTime] = useState('09:30');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const cycleGate = () => {
    const nextIdx = (gateIndex + 1) % GATES.length;
    setGateIndex(nextIdx);
    setPickup(GATES[nextIdx]);
  };

  const handleSelectQuickPick = (item) => {
    setDestination(item.name);
    setDestinationCoords({ lat: item.lat, lng: item.lng });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destination.trim()) {
      setErrorMsg('Please specify or pick a drop destination.');
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

    setSubmitting(true);
    const ok = await onSubmit({
      pickupAddress: pickup,
      pickupLatitude: pickupCoords.lat,
      pickupLongitude: pickupCoords.lng,
      destinationAddress: destination,
      destinationLatitude: destinationCoords?.lat ?? 11.9338,
      destinationLongitude: destinationCoords?.lng ?? 79.8359,
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

      {/* STEP 1: Pickup Location */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="font-label-md uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
            Origin (Pickup Point)
          </label>
          <button
            type="button"
            className="font-label-sm text-primary hover:text-primary-container font-semibold transition-colors flex items-center gap-1 bg-transparent border-0 cursor-pointer"
            onClick={cycleGate}
          >
            <MapPin size={14} />
            <span>Switch Campus Gate</span>
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
              <Compass size={20} color="#EA580C" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-label-lg font-bold text-on-surface">{pickup}</span>
                <span className="bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold">
                  Default
                </span>
              </div>
              <span className="font-body-sm text-xs text-on-surface-variant">
                Pondicherry University · Kalapet, ECR Highway
              </span>
            </div>
          </div>
          <Lock size={16} className="text-outline-variant hidden sm:block" />
        </div>
      </div>

      {/* STEP 2: Drop Destination */}
      <div className="flex flex-col gap-2">
        <label className="font-label-md uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5 font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
          Drop Destination
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-primary">
            <Search size={18} color="#EA580C" />
          </div>
          <input
            type="text"
            className="ps-outside-dest-input"
            placeholder="Search destination, hotel, beach, station, or landmark..."
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setDestinationCoords(null);
            }}
            required
          />
          {destination && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-on-surface bg-transparent border-0 cursor-pointer"
              onClick={() => {
                setDestination('');
                setDestinationCoords(null);
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Quick-Pick Chips */}
        <div className="flex flex-col gap-1.5 mt-1">
          <span className="font-label-sm text-outline font-semibold uppercase tracking-wider text-[11px]">
            Popular destinations outside campus
          </span>
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_PICK_DESTS.map((item) => {
              const isSelected = destination === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  className={`ps-quick-chip ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleSelectQuickPick(item)}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* STEP 3: Trip Schedule Type */}
      <div className="flex flex-col gap-2">
        <label className="font-label-md uppercase tracking-wider text-on-surface-variant font-bold">
          Departure Preference
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Depart Immediately */}
          <label
            className={`ps-schedule-radio-card ${departureSchedule === 'immediate' ? 'is-selected' : ''}`}
            onClick={() => setDepartureSchedule('immediate')}
          >
            <input
              type="radio"
              name="departure_schedule"
              value="immediate"
              checked={departureSchedule === 'immediate'}
              onChange={() => setDepartureSchedule('immediate')}
              className="sr-only"
            />
            <div className="ps-radio-circle">
              {departureSchedule === 'immediate' && <div className="ps-radio-inner" />}
            </div>
            <div className="flex flex-col">
              <span className="font-label-lg font-bold text-on-surface">Depart Immediately</span>
              <span className="font-body-sm text-xs text-on-surface-variant">
                Dispatch assigns nearest campus car (~5-8 mins)
              </span>
            </div>
          </label>

          {/* Schedule for Later */}
          <label
            className={`ps-schedule-radio-card ${departureSchedule === 'scheduled' ? 'is-selected' : ''}`}
            onClick={() => setDepartureSchedule('scheduled')}
          >
            <input
              type="radio"
              name="departure_schedule"
              value="scheduled"
              checked={departureSchedule === 'scheduled'}
              onChange={() => setDepartureSchedule('scheduled')}
              className="sr-only"
            />
            <div className="ps-radio-circle">
              {departureSchedule === 'scheduled' && <div className="ps-radio-inner" />}
            </div>
            <div className="flex flex-col">
              <span className="font-label-lg font-bold text-on-surface">Schedule for Later</span>
              <span className="font-body-sm text-xs text-on-surface-variant">
                Reserve dispatch slot up to 48 hours ahead
              </span>
            </div>
          </label>
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

      {/* Pricing Policy Callout Notice */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/40">
        <Info size={20} color="#EA580C" className="shrink-0 mt-0.5" />
        <div className="flex flex-col">
          <span className="font-label-md font-bold text-on-surface">Transparent Fare Policy</span>
          <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed mt-0.5">
            Dispatch calculates standard fare @ ₹12/km with zero surge. You'll receive instant driver confirmation and quote. Driver will present the university transit meter breakdown upon arrival.
          </p>
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
