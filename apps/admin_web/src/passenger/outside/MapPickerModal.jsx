import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api';
import {
  X, Search, MapPin, Compass, RefreshCw, Check, CheckCircle2
} from 'lucide-react';
import { POPULAR_OUTSIDE_SPOTS } from '../shared/passengerConstants';

export function MapPickerModal({ target, initial, token, onClose, onConfirm }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(initial || {
    name: '',
    address: '',
    lat: null,
    lng: null
  });

  /* Debounced place search */
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiRequest(
          `/fares/places?q=${encodeURIComponent(query.trim())}&lat=12.0240&lng=79.8530`
        );
        setResults(res.data || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectPlace = (place) => {
    setSelected({
      name: place.name,
      address: place.address || place.name,
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude)
    });
    setQuery('');
    setResults([]);
  };

  const handleSelectPopular = (spot) => {
    setSelected({
      name: spot.name,
      address: spot.name,
      lat: spot.lat,
      lng: spot.lng
    });
  };

  const handleConfirm = () => {
    if (selected?.name && selected?.lat && selected?.lng) {
      onConfirm(selected);
    }
  };

  const canConfirm = Boolean(selected?.name && selected?.lat && selected?.lng);

  return (
    <div className="ps-modal-overlay">
      <div className="ps-modal ps-modal--lg ps-modal-in">

        {/* HEAD */}
        <div className="ps-map-picker-head">
          <div>
            <h3 className="ps-modal-title">
              <MapPin size={18} color="#EA580C" />
              {target === 'pickup' ? 'Select Pickup' : 'Select Destination'}
            </h3>
            <p className="ps-modal-sub">
              Search a Pondicherry landmark or pick from popular spots.
            </p>
          </div>
          <button
            className="ps-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* SEARCH */}
        <div className="ps-picker-search">
          <div className="ps-input-wrap">
            <Search size={16} className="ps-input-leading" />
            <input
              type="text"
              placeholder="Search place, beach, station, cafe..."
              className="ps-input ps-input--with-leading"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {searching && (
              <div className="ps-input-spinner">
                <RefreshCw size={14} className="ps-spin" />
              </div>
            )}
            {query && !searching && (
              <button
                type="button"
                onClick={() => { setQuery(''); setResults([]); }}
                className="ps-input-trail-btn"
                aria-label="Clear"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {results.length > 0 && (
            <div className="ps-picker-results ps-fade-up">
              {results.map((place, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectPlace(place)}
                  className="ps-picker-result"
                >
                  <MapPin size={15} color="#EA580C" />
                  <div>
                    <div className="ps-picker-result-name">{place.name}</div>
                    {place.address && (
                      <div className="ps-picker-result-addr">{place.address}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* POPULAR CHIPS */}
        <div className="ps-picker-chips">
          <span className="ps-picker-chips-label">
            <Compass size={12} /> Popular:
          </span>
          {POPULAR_OUTSIDE_SPOTS.slice(0, 7).map((spot) => (
            <button
              key={spot.name}
              type="button"
              onClick={() => handleSelectPopular(spot)}
              className={`ps-picker-chip ${
                selected?.name === spot.name ? 'is-active' : ''
              }`}
            >
              {spot.name.split('/')[0].trim()}
            </button>
          ))}
        </div>

        {/* GRID */}
        <div className="ps-picker-grid-wrap">
          <div className="ps-picker-grid-title">Popular Pondicherry Spots</div>
          <div className="ps-picker-grid">
            {POPULAR_OUTSIDE_SPOTS.map((spot, i) => {
              const isSelected = selected?.name === spot.name;
              return (
                <button
                  key={spot.name}
                  type="button"
                  onClick={() => handleSelectPopular(spot)}
                  className={`ps-picker-spot ${isSelected ? 'is-active' : ''}`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className={`ps-picker-spot-icon ${isSelected ? 'is-active' : ''}`}>
                    <MapPin size={16} />
                  </div>
                  <div className="ps-picker-spot-body">
                    <div className="ps-picker-spot-name">{spot.name}</div>
                    <div className="ps-picker-spot-sub">Puducherry</div>
                  </div>
                  {isSelected && <Check size={14} color="#EA580C" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="ps-picker-footer">
          <div className="ps-picker-footer-left">
            <div className="ps-picker-footer-label">
              Selected {target === 'pickup' ? 'Pickup' : 'Destination'}
            </div>
            <div className="ps-picker-footer-name">
              {selected?.name || 'Nothing selected yet'}
            </div>
          </div>

          <div className="ps-picker-footer-actions">
            <button
              type="button"
              onClick={onClose}
              className="ps-btn ps-btn--ghost"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="ps-btn ps-btn--primary"
            >
              <CheckCircle2 size={16} />
              Set as {target === 'pickup' ? 'Pickup' : 'Destination'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default MapPickerModal;
