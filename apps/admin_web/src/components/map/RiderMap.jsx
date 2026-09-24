import React, { useState, useEffect } from 'react';
import { MapContainer } from './MapContainer';
import { PickupMarker } from './PickupMarker';
import { DestinationMarker } from './DestinationMarker';
import { RiderMarker } from './RiderMarker';
import { RouteLine } from './RouteLine';
import { EtaBadge } from './EtaBadge';
import { MAP_MODES, PAPIDO_SERVICE_AREAS } from '../../config/serviceAreas';
import { mapService } from '../../services/mapService';
import { Navigation, CheckCircle2, ExternalLink, Locate, ShieldCheck } from 'lucide-react';

export function RiderMap({
  riderCoords = null, // { latitude, longitude, heading, speed }
  pickupCoords = null, // { latitude, longitude, address }
  dropCoords = null, // { latitude, longitude, address }
  activeRide = null,
  onMarkArrived = null,
  height = '340px',
  externalMapLink = null,
  className = '',
  style = {}
}) {
  // Normalize point helper
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

  const normRider = normPoint(riderCoords);
  const normPickup = normPoint(pickupCoords);
  const normDrop = normPoint(dropCoords);

  const [mapInstance, setMapInstance] = useState(null);
  const [routeWaypoints, setRouteWaypoints] = useState([]);
  const [proximity, setProximity] = useState(null); // { distanceKm, distanceMeters, isInsideGeofence, etaMinutes }

  // Calculate route from rider to pickup or from pickup to drop
  useEffect(() => {
    let isMounted = true;

    const start = (activeRide?.status === 'STARTED') ? normPickup : (normRider || normPickup);
    const end = (activeRide?.status === 'STARTED') ? normDrop : normPickup;

    if (start && end && start.latitude && end.latitude) {
      mapService.getRoute(start, end, { vehicleType: 'BIKE' })
        .then(route => {
          if (isMounted && route) {
            setRouteWaypoints(route.geometry || []);
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [normRider?.latitude, normPickup?.latitude, normDrop?.latitude, activeRide?.status]);

  // Compute geofence proximity between rider and pickup
  useEffect(() => {
    if (normRider && normPickup && activeRide?.status !== 'STARTED' && activeRide?.status !== 'COMPLETED') {
      const prox = mapService.getRiderPickupProximity(normRider, normPickup, 100);
      setProximity(prox);
    } else {
      setProximity(null);
    }
  }, [normRider?.latitude, normRider?.longitude, normPickup?.latitude, activeRide?.status]);

  // Auto-fit bounds
  useEffect(() => {
    if (!mapInstance) return;
    const points = [];
    if (normRider?.latitude) points.push([normRider.latitude, normRider.longitude]);
    if (normPickup?.latitude) points.push([normPickup.latitude, normPickup.longitude]);
    if (normDrop?.latitude) points.push([normDrop.latitude, normDrop.longitude]);

    if (points.length >= 2) {
      try {
        mapInstance.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
      } catch (_) {}
    }
  }, [mapInstance, normRider?.latitude, normPickup?.latitude, normDrop?.latitude]);

  const handleRecenter = () => {
    if (!mapInstance) return;
    if (normRider?.latitude && normRider?.longitude) {
      mapInstance.flyTo([normRider.latitude, normRider.longitude], 16);
    } else if (normPickup?.latitude) {
      mapInstance.flyTo([normPickup.latitude, normPickup.longitude], 15.5);
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
        border: '1.5px solid #334155',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
        ...style
      }}
      className={`papido-rider-map-container ${className}`}
    >
      <MapContainer
        mode={MAP_MODES.RIDER_NAVIGATION_MODE}
        center={normRider || normPickup || PAPIDO_SERVICE_AREAS.PONDICHERRY_UNIVERSITY.center}
        onMapReady={setMapInstance}
        style={{ height: '100%', width: '100%' }}
      >
        {() => (
          <>
            {/* Pickup Marker */}
            {normPickup && (
              <PickupMarker
                map={mapInstance}
                position={normPickup}
                label={normPickup.address || 'Pickup Point'}
              />
            )}

            {/* Destination Marker */}
            {normDrop && (
              <DestinationMarker
                map={mapInstance}
                position={normDrop}
                label={normDrop.address || 'Drop Point'}
              />
            )}

            {/* Rider Current Position Marker */}
            {normRider && (
              <RiderMarker
                map={mapInstance}
                position={normRider}
                heading={normRider.heading || 0}
                speed={normRider.speed || 0}
                riderName="You"
                vehicleModel="Your Vehicle"
                lastUpdated={Date.now()}
              />
            )}

            {/* Navigation Route Line */}
            {routeWaypoints.length > 1 && (
              <RouteLine
                map={mapInstance}
                waypoints={routeWaypoints}
                color="#F59E0B"
              />
            )}
          </>
        )}
      </MapContainer>

      {/* Recenter Button */}
      <div style={{ position: 'absolute', bottom: '16px', left: '12px', zIndex: 500 }}>
        <button
          type="button"
          onClick={handleRecenter}
          title="Center on My Location"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: '#1E293B',
            color: '#F59E0B',
            border: '1.5px solid #475569',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Locate size={18} />
        </button>
      </div>

      {/* External Navigation Shortcut Button on Top Right */}
      {externalMapLink && (
        <div style={{ position: 'absolute', top: '12px', right: '52px', zIndex: 500 }}>
          <a
            href={externalMapLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              background: '#0F172A',
              color: '#38BDF8',
              border: '1px solid #0284C7',
              fontSize: '11px',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
            }}
          >
            <ExternalLink size={13} /> Open External Maps
          </a>
        </div>
      )}

      {/* Proximity & Arrival Geofence Card on Bottom */}
      {proximity && activeRide?.status === 'RIDER_ARRIVING' && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '58px',
            right: '12px',
            background: proximity.isInsideGeofence ? 'rgba(16, 185, 129, 0.95)' : 'rgba(15, 23, 42, 0.92)',
            color: '#FFFFFF',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
            zIndex: 500,
            backdropFilter: 'blur(6px)'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {proximity.isInsideGeofence ? '✓ Reached Pickup Zone' : 'Approaching Pickup'}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>
              {proximity.isInsideGeofence
                ? 'You are at the pickup location'
                : `You are ${proximity.distanceMeters} meters from pickup (${proximity.etaMinutes} min)`}
            </div>
          </div>

          {proximity.isInsideGeofence && onMarkArrived && (
            <button
              type="button"
              onClick={onMarkArrived}
              className="btn btn-success btn-sm"
              style={{ padding: '6px 14px', fontWeight: 800, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <CheckCircle2 size={14} /> Mark as Arrived
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default RiderMap;
