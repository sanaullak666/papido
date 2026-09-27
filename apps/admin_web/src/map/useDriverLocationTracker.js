import { useState, useEffect, useRef, useCallback } from 'react';
import { getDistanceMeters } from './routingProvider';

/**
 * Custom React Hook for Continuous Driver GPS Location Tracking
 * Complies with Papido real-time tracking specifications:
 * - Accuracy validation (< 80m)
 * - Distance throttling (>= 5 meters)
 * - Time throttling (3 - 5 seconds)
 * - Speed & Heading calculation if unavailable from hardware
 * - Clear active/stopped lifecycle indicators
 */
export function useDriverLocationTracker({
  socket,
  rideId = null,
  driverId = null,
  isTrackingActive = false,
  onLocationUpdate = null
}) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState('IDLE'); // 'IDLE' | 'ACTIVE' | 'STOPPED' | 'DENIED' | 'UNAVAILABLE'
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const watchIdRef = useRef(null);
  const lastEmittedRef = useRef({ lat: null, lng: null, timestamp: 0 });

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingStatus('STOPPED');
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setTrackingStatus('UNAVAILABLE');
      setErrorMessage('Geolocation is not supported by your browser or device.');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setTrackingStatus('STARTING');
    setErrorMessage(null);

    const handleSuccess = (pos) => {
      const { latitude, longitude, accuracy, speed, heading } = pos.coords;
      const now = Date.now();

      // 1. Accuracy Filter: discard wildly erratic pings (> 80m)
      if (accuracy > 80) {
        setGpsAccuracy(Math.round(accuracy));
        console.debug(`[useDriverLocationTracker] Skipped poor GPS accuracy: ${accuracy}m`);
        return;
      }

      setGpsAccuracy(Math.round(accuracy));
      setTrackingStatus('ACTIVE');

      const last = lastEmittedRef.current;
      const timeElapsed = now - last.timestamp;

      let distanceMoved = 0;
      if (last.lat !== null && last.lng !== null) {
        distanceMoved = getDistanceMeters(last.lat, last.lng, latitude, longitude);
      }

      // Compute heading if device returns null (e.g. on stationary or some Android Chrome versions)
      let resolvedHeading = (heading !== null && !isNaN(heading)) ? heading : 0;
      if (resolvedHeading === 0 && last.lat !== null && distanceMoved > 3) {
        const y = Math.sin((longitude - last.lng) * Math.PI / 180) * Math.cos(latitude * Math.PI / 180);
        const x = Math.cos(last.lat * Math.PI / 180) * Math.sin(latitude * Math.PI / 180) -
                  Math.sin(last.lat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.cos((longitude - last.lng) * Math.PI / 180);
        resolvedHeading = Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360);
      }

      const locPayload = {
        driverId: Number(driverId),
        riderId: Number(driverId),
        rideId: rideId ? Number(rideId) : null,
        latitude,
        longitude,
        accuracy: Math.round(accuracy),
        speed: (speed !== null && !isNaN(speed)) ? Math.round(speed * 3.6) : 0, // km/h
        heading: resolvedHeading,
        timestamp: now
      };

      setCurrentLocation(locPayload);
      if (onLocationUpdate) onLocationUpdate(locPayload);

      // Throttling: send update if 5 seconds passed OR moved >= 5 meters OR first position
      const minIntervalMs = 3500;
      if (timeElapsed >= minIntervalMs || distanceMoved >= 5 || last.lat === null) {
        lastEmittedRef.current = { lat: latitude, lng: longitude, timestamp: now };

        if (socket && socket.connected) {
          socket.emit('rider:location_update', locPayload);
        }
      }
    };

    const handleError = (err) => {
      console.warn('[useDriverLocationTracker] Geolocation error:', err.message);
      if (err.code === 1) { // PERMISSION_DENIED
        setTrackingStatus('DENIED');
        setErrorMessage('Location permission was denied. Please allow location access in your browser settings to enable live ride navigation.');
      } else if (err.code === 2) { // POSITION_UNAVAILABLE
        setTrackingStatus('UNAVAILABLE');
        setErrorMessage('Location temporarily unavailable. Please check if your device GPS is turned on.');
      } else if (err.code === 3) { // TIMEOUT
        // Non-fatal timeout, will retry automatically on next interval
        console.debug('GPS timeout, retrying...');
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 3000
      }
    );
  }, [driverId, rideId, socket, onLocationUpdate]);

  useEffect(() => {
    if (isTrackingActive) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isTrackingActive, startTracking, stopTracking]);

  return {
    currentLocation,
    trackingStatus,
    isLive: trackingStatus === 'ACTIVE',
    gpsAccuracy,
    errorMessage,
    startTracking,
    stopTracking
  };
}

export default useDriverLocationTracker;
