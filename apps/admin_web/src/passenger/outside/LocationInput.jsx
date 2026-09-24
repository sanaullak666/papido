import React, { useState } from 'react';
import { apiRequest } from '../../api';
import { MapPickerModal } from './MapPickerModal';
import { MapPin, Compass, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';

export function LocationInput({
  label,
  accent = 'amber',
  value = '',
  onChange,
  coords,
  onCoordsChange,
  placeholder,
  token,
  target = 'dest',
  required = false
}) {
  const [resolving, setResolving] = useState(false);
  const [resolvedBadge, setResolvedBadge] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  /* Detect Google Maps link or lat,lng pair */
  const isResolvableLink = (text) => {
    if (!text) return false;
    const t = text.trim();
    return (
      t.includes('maps.app.goo.gl') ||
      t.includes('google.com/maps') ||
      t.includes('goo.gl/maps') ||
      t.includes('http://') ||
      t.includes('https://') ||
      /^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(t)
    );
  };

  /* Resolve a Google Maps link → name + coords */
  const handleResolve = async (rawValue) => {
    if (!rawValue || !isResolvableLink(rawValue)) return;
    setResolving(true);
    setResolvedBadge(null);
    try {
      const res = await apiRequest('/fares/resolve-link', 'POST', {
        url: rawValue
      }, token);
      if (res.data?.name) {
        const placeName = res.data.name;
        const newCoords = {
          lat: parseFloat(res.data.latitude) || coords?.lat || 11.9338,
          lng: parseFloat(res.data.longitude) || coords?.lng || 79.8359
        };
        onChange(placeName);
        if (onCoordsChange) onCoordsChange(newCoords);
        setResolvedBadge(placeName);
      }
    } catch {
      /* silent — user can still type freely */
    } finally {
      setResolving(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    setResolvedBadge(null);
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData?.getData('text');
    if (isResolvableLink(pasted)) {
      setTimeout(() => handleResolve(pasted), 50);
    }
  };

  const handleBlur = () => {
    if (isResolvableLink(value)) {
      handleResolve(value);
    }
  };

  const handleMapPick = (place) => {
    onChange(place.name);
    if (onCoordsChange) {
      onCoordsChange({ lat: place.lat, lng: place.lng });
    }
    setResolvedBadge(place.name);
    setShowMapPicker(false);
  };

  const isGreen = accent === 'green';

  return (
    <div className="ps-field">
      <div className="ps-field-head">
        <label className="ps-field-label">
          <MapPin size={15} color={isGreen ? '#10B981' : '#EA580C'} />
          {label}
        </label>
        <div className="ps-field-head-actions">
          <button
            type="button"
            onClick={() => setShowMapPicker(true)}
            className={`ps-mini-pill ps-mini-pill--${isGreen ? 'green' : 'amber'}`}
          >
            <Compass size={12} />
            Pick on Map
          </button>
          <a
            href="https://www.google.com/maps"
            target="_blank"
            rel="noopener noreferrer"
            className="ps-mini-link"
          >
            <ExternalLink size={11} />
            Open Google Maps
          </a>
        </div>
      </div>

      <div className="ps-input-wrap">
        <input
          type="text"
          className={`ps-input ${resolving ? 'is-resolving' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          onBlur={handleBlur}
          required={required}
        />
        {resolving && (
          <div className="ps-input-spinner">
            <RefreshCw size={14} className="ps-spin" />
          </div>
        )}
      </div>

      {resolving && (
        <div className="ps-inline-status ps-inline-status--amber">
          <RefreshCw size={12} className="ps-spin" />
          <span>Fetching location from Google Maps link...</span>
        </div>
      )}

      {!resolving && resolvedBadge && (
        <div className="ps-inline-status ps-inline-status--green ps-fade-up">
          <CheckCircle2 size={12} />
          <span>Location: <strong>{resolvedBadge}</strong></span>
        </div>
      )}

      {showMapPicker && (
        <MapPickerModal
          target={target}
          initial={value ? { name: value, ...(coords || {}) } : null}
          token={token}
          onClose={() => setShowMapPicker(false)}
          onConfirm={handleMapPick}
        />
      )}
    </div>
  );
}

export default LocationInput;
