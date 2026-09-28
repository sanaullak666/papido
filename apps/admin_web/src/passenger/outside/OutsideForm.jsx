import React, { useState } from 'react';
import { PSButton } from '../shared/PassengerUI';
import { LocationInput } from './LocationInput';
import { PopularSpots } from './PopularSpots';
import { POPULAR_OUTSIDE_SPOTS } from '../shared/passengerConstants';
import { usePassenger } from '../shared/PassengerContext';
import {
  Bike, Zap, Compass, Clock, Send, Check, History, ArrowRight
} from 'lucide-react';

const VEHICLE_OPTIONS = [
  { id: 'ANY',     icon: Zap,     label: 'Any',     sub: 'Fastest' },
  { id: 'BIKE',    icon: Bike,    label: 'Bike',    sub: 'Standard' },
  { id: 'SCOOTER', icon: Compass, label: 'Scooter', sub: 'Smooth' }
];

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

  /* Recent outside trips (auto-derived from history) */
  const recentDestinations = useRecentDestinations();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dest.trim()) return;

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
      isOutside: true
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

  return (
    <form onSubmit={handleSubmit} className="ps-outside-form">

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
          'Submitting Request...'
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
