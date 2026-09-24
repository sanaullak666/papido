import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest, getSocketUrl } from '../../api';
import { io } from 'socket.io-client';

const PassengerContext = createContext(null);

export function PassengerProvider({ children }) {
  const { user, token } = useAuth();
  const socketRef = useRef(null);

  const [statusMessage, setStatusMessage] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [scheduledRides, setScheduledRides] = useState([]);
  const [pendingPenalty, setPendingPenalty] = useState(null);
  const [flashFreeRide, setFlashFreeRide] = useState(null);
  const [pastRides, setPastRides] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [standardCampusFare, setStandardCampusFare] = useState(25);
  const [fareConfigs, setFareConfigs] = useState([]);

  const fetchFareConfigs = async () => {
    try {
      const res = await apiRequest('/fares/types', 'GET', null, token);
      if (Array.isArray(res?.data)) {
        setFareConfigs(res.data);
        const bikeCfg = res.data.find(c => c.vehicle_type === 'BIKE') || res.data[0];
        if (bikeCfg) {
          const fareNum = parseFloat(bikeCfg.minimum_fare || bikeCfg.base_fare || 25);
          if (!isNaN(fareNum) && fareNum > 0) {
            setStandardCampusFare(fareNum);
          }
        }
      }
    } catch (_) {}
  };

  const fetchActiveRide = async (bg = true) => {
    if (!token) return;
    try {
      const res = await apiRequest('/customer/rides/active', 'GET', null, token);
      const ride = res.data || null;
      if (ride) {
        if (ride.status === 'COMPLETED' && sessionStorage.getItem(`skipped_feedback_${ride.id}`)) {
          setActiveRide(null);
          return;
        }
        setActiveRide(ride);
        if (ride.rider_current_lat && ride.rider_current_lng) {
          setDriverLocation({
            latitude: Number(ride.rider_current_lat),
            longitude: Number(ride.rider_current_lng),
            lat: Number(ride.rider_current_lat),
            lng: Number(ride.rider_current_lng),
            staleStatus: 'LIVE'
          });
        }
      } else {
        setActiveRide(prev => (prev && prev.status === 'COMPLETED' ? prev : null));
      }
    } catch (_) {}
  };

  const fetchScheduledRides = async () => {
    if (!token) return;
    try {
      const res = await apiRequest('/customer/rides/scheduled', 'GET', null, token);
      if (res?.data) setScheduledRides(res.data || []);
    } catch (_) {}
  };

  const fetchPendingPenalty = async () => {
    if (!token) return;
    try {
      const res = await apiRequest('/customer/pending-penalty', 'GET', null, token);
      setPendingPenalty(res?.data || null);
    } catch (_) {}
  };

  const fetchFlashFreeRide = async () => {
    if (!token) return;
    try {
      const res = await apiRequest('/customer/flash-free-ride/active', 'GET', null, token);
      setFlashFreeRide(res?.data || null);
    } catch (_) {}
  };

  const fetchRideHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiRequest('/customer/rides/history', 'GET', null, token);
      const items = res.data?.items || res.data?.rides || (Array.isArray(res.data) ? res.data : []);
      setPastRides(items);
    } catch (_) {} finally {
      setLoadingHistory(false);
    }
  };

  /* ---------- Fetch fare configs once on mount ---------- */
  useEffect(() => {
    fetchFareConfigs();
  }, [token]);

  /* ---------- Dynamic fast polling for active ride status (1.8s active, 6s idle) ---------- */
  useEffect(() => {
    if (!token) return;
    fetchActiveRide(false);

    const hasActiveTrip = activeRide && ['PENDING_ADMIN_QUOTE', 'REQUESTED', 'SEARCHING', 'ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED', 'STARTED', 'IN_PROGRESS'].includes(activeRide.status);
    const pollInterval = hasActiveTrip ? 1800 : 6000;

    const interval = setInterval(() => {
      fetchActiveRide(true);
    }, pollInterval);

    return () => clearInterval(interval);
  }, [token, activeRide?.id, activeRide?.status]);

  /* ---------- Auto-refresh active ride and payment on tab focus / app switch ---------- */
  useEffect(() => {
    if (!token) return;
    const handleRefresh = () => {
      fetchActiveRide(true);
    };
    window.addEventListener('focus', handleRefresh);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchActiveRide(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [token]);

  /* ---------- Background polling for secondary data (every 25s) ---------- */
  useEffect(() => {
    if (!token) return;
    fetchScheduledRides();
    fetchPendingPenalty();
    fetchFlashFreeRide();

    const interval = setInterval(() => {
      fetchScheduledRides();
      fetchPendingPenalty();
      fetchFlashFreeRide();
    }, 25000);

    return () => clearInterval(interval);
  }, [token]);

  /* ---------- Socket.IO ---------- */
  useEffect(() => {
    if (!token) return;
    const socket = io(getSocketUrl(), { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('identify', { id: user?.id, role: 'CUSTOMER', name: user?.name });
      fetchActiveRide(true);
      fetchFareConfigs();
    });

    socket.on('flash_free_ride:new', (d) => setFlashFreeRide(d));
    socket.on('flash_free_ride:claimed', () => setFlashFreeRide(null));
    socket.on('flash_free_ride:cancelled', () => setFlashFreeRide(null));
    socket.on('fare:settings_updated', () => fetchFareConfigs());
    socket.on('fare:routes_updated', () => fetchFareConfigs());

    const onStatusChange = (data) => {
      const rideObj = data?.ride || data;
      const newStatus = data.status || rideObj?.status;
      const fare = rideObj?.total_fare || rideObj?.estimated_fare || rideObj?.final_fare || standardCampusFare;
      setActiveRide(prev => ({
        ...(prev || {}),
        ...(rideObj || {}),
        status: newStatus || prev?.status,
        total_fare: fare,
        estimated_fare: fare,
        final_fare: fare
      }));
      fetchActiveRide(true);
    };
    socket.on('ride:status_change', onStatusChange);
    socket.on('ride:completed', onStatusChange);
    socket.on('ride:accepted', onStatusChange);
    socket.on('ride:reopened', onStatusChange);
    socket.on('ride:cancelled', onStatusChange);

    socket.on('ride:waiting_update', (data) => {
      setActiveRide(prev => {
        if (!prev) return prev;
        const waitingFare = parseFloat(data.waitingFare || data.waiting_fare || 0);
        const baseFare = parseFloat(prev.estimated_fare || prev.total_fare || standardCampusFare);
        const totalFare = baseFare + waitingFare;
        return {
          ...prev,
          is_waiting: Boolean(data.isWaiting || data.is_waiting),
          waiting_minutes: parseInt(data.waitingMinutes || data.waiting_minutes || 0, 10),
          waiting_fare: waitingFare,
          total_fare: totalFare,
          final_fare: totalFare
        };
      });
    });

    const onDriverLocation = (loc) => {
      if (!loc) return;
      const lat = Number(loc.latitude ?? loc.lat);
      const lng = Number(loc.longitude ?? loc.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        setDriverLocation({
          latitude: lat, longitude: lng, lat, lng,
          heading: Number(loc.heading || 0),
          speed: Number(loc.speed || 0),
          accuracy: loc.accuracy,
          recordedAt: loc.recordedAt || loc.timestamp || Date.now(),
          staleStatus: loc.staleStatus || 'LIVE'
        });
      }
    };
    socket.on('rider:location_update', onDriverLocation);
    socket.on('ride:location_track', onDriverLocation);

    socket.on('penalty:status_update', (data) => {
      if (data?.status === 'PAID') {
        setPendingPenalty(null);
        fetchActiveRide(true);
      } else if (data?.status === 'UNPAID') {
        setPendingPenalty(prev => prev ? { ...prev, status: 'UNPAID' } : null);
      }
    });

    return () => socket.disconnect();
  }, [token, user?.id, standardCampusFare]);

  /* ---------- Active ride room join ---------- */
  useEffect(() => {
    if (socketRef.current && activeRide?.id) {
      socketRef.current.emit('join_ride', activeRide.id);
      return () => socketRef.current?.emit('leave_ride', activeRide.id);
    }
  }, [activeRide?.id]);

  const value = {
    user, token, socketRef,
    statusMessage, setStatusMessage,
    activeRide, setActiveRide, fetchActiveRide, driverLocation,
    scheduledRides, setScheduledRides, fetchScheduledRides,
    pendingPenalty, setPendingPenalty, fetchPendingPenalty,
    flashFreeRide, setFlashFreeRide, fetchFlashFreeRide,
    pastRides, setPastRides, loadingHistory, fetchRideHistory,
    standardCampusFare, setStandardCampusFare, fareConfigs, fetchFareConfigs
  };

  return <PassengerContext.Provider value={value}>{children}</PassengerContext.Provider>;
}

export function usePassenger() {
  const ctx = useContext(PassengerContext);
  if (!ctx) throw new Error('usePassenger must be inside PassengerProvider');
  return ctx;
}
