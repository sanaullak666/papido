import React, { useState, useEffect, useRef } from 'react';
import { MapContainer } from './MapContainer';
import { PickupMarker } from './PickupMarker';
import { DestinationMarker } from './DestinationMarker';
import { RiderMarker } from './RiderMarker';
import { CampusLandmarkMarker } from './CampusLandmarkMarker';
import { RouteLine } from './RouteLine';
import { MapAreaSelector } from './MapAreaSelector';
import { EtaBadge } from './EtaBadge';
import { LastUpdatedLabel } from './LastUpdatedLabel';
import { ConnectionIndicator } from './ConnectionIndicator';
import { ServiceAreaWarning } from './ServiceAreaWarning';
import { MAP_MODES, PAPIDO_SERVICE_AREAS } from '../../config/serviceAreas';
import { mapService } from '../../services/mapService';
import { Compass, Crosshair, Navigation, Locate } from 'lucide-react';

export function CustomerMap({
  mode = MAP_MODES.CAMPUS_MODE,
  pickup = null, // { latitude, longitude, address }
  destination = null, // { latitude, longitude, address }
  via = null,
  riderLocation = null, // { latitude, longitude, heading, speed, lastUpdated }
  assignedRider = null, // { name, vehicleModel, vehicleType, vehicleNumber }
  onPickupChange,
  onDestinationChange,
  onAreaModeChange,
  activeRide = null,
  socketConnected = true,
  height = '360px',
  allowAreaSwitch = true,
  className = '',
  style = {}
}) {
  // Normalize point to support both { latitude, longitude } and { lat, lng }
  const normPoint = (pt) => {
    if (!pt) return null;
    const lat = pt.latitude !== undefined ? Number(pt.latitude) : (pt.lat !== undefined ? Number(pt.lat) : null);
    const lng = pt.longitude !== undefined ? Number(pt.longitude) : (pt.lng !== undefined ? Number(pt.lng) : null);
    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return null;
    return {
      ...pt,
      latitude: lat,
      longitude: lng,
      lat,
      lng,
      address: pt.address || pt.name || ''
    };
  };

  const normPickup = normPoint(pickup);
  const normDest = normPoint(destination);
  const normVia = normPoint(via);
  const normRider = normPoint(riderLocation);

  const [mapInstance, setMapInstance] = useState(null);
  const [currentMode, setCurrentMode] = useState(mode);
  const [routeGeometry, setRouteGeometry] = useState([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);
  const [routeDurationMins, setRouteDurationMins] = useState(null);
  const [isOutsideArea, setIsOutsideArea] = useState(false);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  // Validate service area
  useEffect(() => {
    if (normPickup?.latitude && normPickup?.longitude) {
      const inside = mapService.isInsideServiceArea(
        normPickup.latitude,
        normPickup.longitude,
        currentMode === MAP_MODES.CITY_MODE ? 'PONDICHERRY_CITY' : 'PONDICHERRY_UNIVERSITY'
      );
      setIsOutsideArea(!inside && currentMode === MAP_MODES.CAMPUS_MODE);
    }
  }, [normPickup?.latitude, normPickup?.longitude, currentMode]);

  // Fetch or calculate route when pickup and destination change
  useEffect(() => {
    if (!normPickup?.latitude || !normPickup?.longitude || !normDest?.latitude || !normDest?.longitude) {
      setRouteGeometry([]);
      setRouteDistanceKm(null);
      setRouteDurationMins(null);
      return;
    }

    let isMounted = true;
    mapService.getRoute(normPickup, normDest)
      .then(res => {
        if (isMounted && res) {
          setRouteGeometry(res.geometry || []);
          setRouteDistanceKm(res.distanceKm);
          setRouteDurationMins(res.durationMinutes);
        }
      })
      .catch(err => {
        console.warn('[CustomerMap] Route fetch notice:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [normPickup?.latitude, normPickup?.longitude, normDest?.latitude, normDest?.longitude]);

  // Fit bounds to show both pickup & destination or rider
  useEffect(() => {
    if (!mapInstance) return;

    const points = [];
    if (normPickup?.latitude && normPickup?.longitude) {
      points.push([normPickup.latitude, normPickup.longitude]);
    }
    if (normDest?.latitude && normDest?.longitude) {
      points.push([normDest.latitude, normDest.longitude]);
    }
    if (normRider?.latitude && normRider?.longitude) {
      points.push([normRider.latitude, normRider.longitude]);
    }

    if (points.length >= 2) {
      try {
        mapInstance.fitBounds(points, { padding: [45, 45], maxZoom: 16 });
      } catch (_) {}
    }
  }, [mapInstance, normPickup?.latitude, normDest?.latitude, normRider?.latitude]);

  const handleAreaChange = (newMode) => {
    setCurrentMode(newMode);
    if (onAreaModeChange) onAreaModeChange(newMode);
  };

  const handleRecenter = () => {
    if (!mapInstance) return;
    if (normRider?.latitude && normRider?.longitude) {
      mapInstance.flyTo([normRider.latitude, normRider.longitude], 16);
    } else if (normPickup?.latitude && normPickup?.longitude) {
      mapInstance.flyTo([normPickup.latitude, normPickup.longitude], 15.5);
    } else {
      const c = PAPIDO_SERVICE_AREAS.PONDICHERRY_UNIVERSITY.center;
      mapInstance.flyTo([c.latitude, c.longitude], 15);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: height,
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1.5px solid #E2E8F0',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
        ...style
      }}
      className={`papido-customer-map-container ${className}`}
    >
      <MapContainer
        mode={currentMode}
        center={normPickup || PAPIDO_SERVICE_AREAS.PONDICHERRY_UNIVERSITY.center}
        onMapReady={setMapInstance}
        style={{ height: '100%', width: '100%' }}
      >
        {() => (
          <>
            {/* Campus Landmarks (in Campus mode when not in active tracking) */}
            {currentMode === MAP_MODES.CAMPUS_MODE && !activeRide && (
              PAPIDO_SERVICE_AREAS.PONDICHERRY_UNIVERSITY.landmarks.map(lm => (
                <CampusLandmarkMarker
                  key={lm.id}
                  map={mapInstance}
                  landmark={lm}
                  onSelectAsPickup={(spot) => onPickupChange && onPickupChange({
                    address: spot.name,
                    latitude: spot.latitude,
                    longitude: spot.longitude,
                    areaType: 'PONDICHERRY_UNIVERSITY'
                  })}
                  onSelectAsDrop={(spot) => onDestinationChange && onDestinationChange({
                    address: spot.name,
                    latitude: spot.latitude,
                    longitude: spot.longitude,
                    areaType: 'PONDICHERRY_UNIVERSITY'
                  })}
                />
              ))
            )}

            {/* Pickup Marker */}
            {normPickup && (
              <PickupMarker
                map={mapInstance}
                position={normPickup}
                label={normPickup.address || 'Pickup Point'}
                draggable={!activeRide}
                onDragEnd={(newPos) => {
                  mapService.reverseGeocode(newPos.latitude, newPos.longitude).then(geo => {
                    if (onPickupChange) {
                      onPickupChange({
                        address: geo.name || 'Selected Pickup',
                        latitude: newPos.latitude,
                        longitude: newPos.longitude,
                        areaType: mapService.classifyLocationArea(newPos.latitude, newPos.longitude)
                      });
                    }
                  });
                }}
              />
            )}

            {/* Destination Marker */}
            {normDest && (
              <DestinationMarker
                map={mapInstance}
                position={normDest}
                label={normDest.address || 'Destination Drop'}
                draggable={!activeRide}
                onDragEnd={(newPos) => {
                  mapService.reverseGeocode(newPos.latitude, newPos.longitude).then(geo => {
                    if (onDestinationChange) {
                      onDestinationChange({
                        address: geo.name || 'Selected Drop',
                        latitude: newPos.latitude,
                        longitude: newPos.longitude,
                        areaType: mapService.classifyLocationArea(newPos.latitude, newPos.longitude)
                      });
                    }
                  });
                }}
              />
            )}

            {/* Route Line Preview */}
            {routeGeometry.length > 1 && (
              <RouteLine
                map={mapInstance}
                waypoints={routeGeometry}
                color={activeRide ? '#10B981' : '#EA580C'}
                tooltipText={routeDistanceKm ? `${routeDistanceKm} km (${routeDurationMins} mins)` : null}
              />
            )}

            {/* Live Rider Marker (Active Ride Tracking) */}
            {normRider && (
              <RiderMarker
                map={mapInstance}
                position={normRider}
                heading={normRider.heading || 0}
                speed={normRider.speed || 0}
                riderName={assignedRider?.name || 'Assigned Driver'}
                vehicleModel={assignedRider?.vehicleModel || 'Campus Ride'}
                vehicleType={assignedRider?.vehicleType || 'BIKE'}
                lastUpdated={riderLocation.recordedAt || riderLocation.timestamp}
              />
            )}
          </>
        )}
      </MapContainer>

      {/* Top Floating Controls */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '54px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          zIndex: 500,
          pointerEvents: 'none'
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          {allowAreaSwitch && !activeRide && (
            <MapAreaSelector
              currentMode={currentMode}
              onChange={handleAreaChange}
            />
          )}

          {activeRide && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <ConnectionIndicator connected={socketConnected} />
              {riderLocation && (
                <LastUpdatedLabel
                  lastUpdatedTimestamp={riderLocation.recordedAt || riderLocation.timestamp}
                />
              )}
            </div>
          )}
        </div>

        {/* ETA badge on the top right */}
        {routeDistanceKm !== null && (
          <div style={{ pointerEvents: 'auto' }}>
            <EtaBadge
              distanceKm={routeDistanceKm}
              durationMinutes={routeDurationMins}
            />
          </div>
        )}
      </div>

      {/* Recenter Button on Bottom Left */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '12px',
          zIndex: 500
        }}
      >
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter Map View"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '1.5px solid #CBD5E1',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#1E293B'
          }}
        >
          <Locate size={18} />
        </button>
      </div>

      {/* Service Area Warning Banner */}
      {isOutsideArea && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            zIndex: 600
          }}
        >
          <ServiceAreaWarning
            onResetLocation={() => {
              if (onPickupChange) {
                const g1 = PAPIDO_SERVICE_AREAS.PONDICHERRY_UNIVERSITY.landmarks[0];
                onPickupChange({
                  address: g1.name,
                  latitude: g1.latitude,
                  longitude: g1.longitude,
                  areaType: 'PONDICHERRY_UNIVERSITY'
                });
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

export default CustomerMap;
