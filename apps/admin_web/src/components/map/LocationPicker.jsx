import React, { useState, useEffect } from 'react';
import { MapContainer } from './MapContainer';
import { PickupMarker } from './PickupMarker';
import { DestinationMarker } from './DestinationMarker';
import { MapAreaSelector } from './MapAreaSelector';
import { ServiceAreaWarning } from './ServiceAreaWarning';
import { MAP_MODES, PAPIDO_SERVICE_AREAS } from '../../config/serviceAreas';
import { mapService } from '../../services/mapService';
import { MapPin, Locate, Search, X, Check, Loader2 } from 'lucide-react';

export function LocationPicker({
  isOpen = false,
  title = 'Pick Location on Map',
  initialCoords = null,
  initialAddress = '',
  mode = 'pickup', // 'pickup' | 'destination'
  onConfirm,
  onClose,
  className = ''
}) {
  const [selectedCoords, setSelectedCoords] = useState(
    initialCoords || PAPIDO_SERVICE_AREAS.PONDICHERRY_UNIVERSITY.center
  );
  const [address, setAddress] = useState(initialAddress || '');
  const [currentAreaMode, setCurrentAreaMode] = useState(MAP_MODES.CAMPUS_MODE);
  const [mapInstance, setMapInstance] = useState(null);
  const [locating, setLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isOutside, setIsOutside] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (initialCoords && initialCoords.latitude && initialCoords.longitude) {
      setSelectedCoords(initialCoords);
      setAddress(initialAddress || '');
    }
  }, [initialCoords, initialAddress, isOpen]);

  // Reverse geocode when coordinates change
  useEffect(() => {
    if (!selectedCoords || !selectedCoords.latitude || !selectedCoords.longitude) return;

    let isMounted = true;
    setIsGeocoding(true);

    const inside = mapService.isInsideServiceArea(
      selectedCoords.latitude,
      selectedCoords.longitude,
      currentAreaMode === MAP_MODES.CITY_MODE ? 'PONDICHERRY_CITY' : 'PONDICHERRY_UNIVERSITY'
    );
    setIsOutside(!inside && currentAreaMode === MAP_MODES.CAMPUS_MODE);

    mapService.reverseGeocode(selectedCoords.latitude, selectedCoords.longitude)
      .then(res => {
        if (isMounted && res) {
          setAddress(res.name || res.address);
        }
      })
      .finally(() => {
        if (isMounted) setIsGeocoding(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCoords?.latitude, selectedCoords?.longitude, currentAreaMode]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setSearching(true);
      mapService.searchPlaces(
        searchQuery,
        currentAreaMode === MAP_MODES.CITY_MODE ? 'PONDICHERRY_CITY' : 'PONDICHERRY_UNIVERSITY'
      )
        .then(res => setSearchResults(res || []))
        .finally(() => setSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentAreaMode]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const newCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
        setSelectedCoords(newCoords);
        if (mapInstance) {
          mapInstance.flyTo([newCoords.latitude, newCoords.longitude], 16);
        }
      },
      (err) => {
        setLocating(false);
        console.warn('Geolocation error:', err.message);
        alert('Could not access your location. Please check your browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSelectSearchResult = (place) => {
    const newCoords = {
      latitude: place.latitude,
      longitude: place.longitude
    };
    setSelectedCoords(newCoords);
    setAddress(place.name);
    setSearchQuery('');
    setSearchResults([]);
    if (mapInstance) {
      mapInstance.flyTo([newCoords.latitude, newCoords.longitude], 16);
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm({
        address: address || (mode === 'pickup' ? 'Selected Pickup' : 'Selected Drop'),
        latitude: selectedCoords.latitude,
        longitude: selectedCoords.longitude,
        areaType: mapService.classifyLocationArea(selectedCoords.latitude, selectedCoords.longitude)
      });
    }
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const isPickup = mode === 'pickup';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 9999
      }}
      className={`papido-location-picker-overlay ${className}`}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          maxWidth: '560px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FAF5EE'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isPickup ? '#10B981' : '#EA580C',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '13px'
              }}
            >
              {isPickup ? 'P' : 'D'}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>{title}</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Drag pin or tap anywhere on map</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Area Selector Bar */}
        <div style={{ padding: '12px 16px', background: '#FFFFFF', borderBottom: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Search campus gates, hostels, departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#F8FAFC'
                }}
              />
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              {searching && (
                <Loader2 size={16} className="animate-spin" color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              )}
            </div>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              title="Use Device GPS"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 14px',
                borderRadius: '10px',
                border: '1.5px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#0F172A',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {locating ? <Loader2 size={15} className="animate-spin" /> : <Locate size={15} color="#EA580C" />}
              <span>My GPS</span>
            </button>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {searchResults.length > 0 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectSearchResult(item)}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #F1F5F9',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                >
                  <MapPin size={14} color="#EA580C" />
                  <div>
                    <div style={{ fontWeight: 700, color: '#1E293B' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{item.address}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <MapAreaSelector
              currentMode={currentAreaMode}
              onChange={(m) => {
                setCurrentAreaMode(m);
                const c = PAPIDO_SERVICE_AREAS[m === MAP_MODES.CITY_MODE ? 'PONDICHERRY_CITY' : 'PONDICHERRY_UNIVERSITY'].center;
                setSelectedCoords(c);
                if (mapInstance) mapInstance.flyTo([c.latitude, c.longitude], m === MAP_MODES.CITY_MODE ? 12.5 : 15);
              }}
            />
            <span style={{ fontSize: '11px', color: '#64748B' }}>OpenStreetMap Verified</span>
          </div>
        </div>

        {/* Map View */}
        <div style={{ flex: 1, minHeight: '300px', position: 'relative' }}>
          <MapContainer
            mode={currentAreaMode}
            center={selectedCoords}
            onMapReady={setMapInstance}
            onMapClick={(clickPos) => {
              setSelectedCoords({ latitude: clickPos.latitude, longitude: clickPos.longitude });
            }}
            style={{ width: '100%', height: '100%', minHeight: '300px' }}
          >
            {() => (
              <>
                {isPickup ? (
                  <PickupMarker
                    map={mapInstance}
                    position={selectedCoords}
                    label={address}
                    draggable={true}
                    onDragEnd={(pos) => setSelectedCoords({ latitude: pos.latitude, longitude: pos.longitude })}
                  />
                ) : (
                  <DestinationMarker
                    map={mapInstance}
                    position={selectedCoords}
                    label={address}
                    draggable={true}
                    onDragEnd={(pos) => setSelectedCoords({ latitude: pos.latitude, longitude: pos.longitude })}
                  />
                )}
              </>
            )}
          </MapContainer>
        </div>

        {/* Bottom Address Display & Confirm CTA */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #E2E8F0',
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {isOutside && (
            <ServiceAreaWarning />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isPickup ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 88, 12, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin size={16} color={isPickup ? '#10B981' : '#EA580C'} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Selected Coordinates ({selectedCoords?.latitude?.toFixed(4)}, {selectedCoords?.longitude?.toFixed(4)})
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isGeocoding ? 'Detecting address...' : (address || 'Picked Spot')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '12px', fontWeight: 700 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedCoords?.latitude}
              className="btn btn-primary"
              style={{ flex: 2, padding: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Check size={16} /> Confirm {isPickup ? 'Pickup' : 'Drop'} Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LocationPicker;
