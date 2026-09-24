import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest, getSocketUrl } from '../../api';
import { io } from 'socket.io-client';
import { alertManager } from '../../utils/alertManager';
import {
  getTodayDateString,
  getHaversineDistanceKm,
  formatRideDateTime,
  isScheduledTimeReached,
  calcDriverSplit,
  getRideLocalDay
} from './riderConstants';

const RiderContext = createContext(null);

export function RiderProvider({ children, onNavigateTab }) {
  const { user, token, logout, updateProfile, changePassword } = useAuth();

  /* Status Banner for Glass Pill notification */
  const [statusBanner, setStatusBanner] = useState(null);
  const bannerTimerRef = useRef(null);

  const showStatusBanner = useCallback((banner) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setStatusBanner(typeof banner === 'string' ? { type: 'info', text: banner } : banner);
    bannerTimerRef.current = setTimeout(() => {
      setStatusBanner(null);
    }, 5000);
  }, []);

  const clearStatusBanner = useCallback(() => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setStatusBanner(null);
  }, []);

  /* Online / Offline State */
  const [isOnline, setIsOnline] = useState(
    user?.profile?.verification_status === 'APPROVED' ? Boolean(user?.profile?.is_online) : false
  );

  /* Audio Setting */
  const [soundEnabled, setSoundEnabled] = useState(true);

  /* Requests & Active Trip */
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [activeRideLoading, setActiveRideLoading] = useState(false);
  const [declinedRideIds, setDeclinedRideIds] = useState(() => new Set());
  const [tripCancelledNotice, setTripCancelledNotice] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [acceptingRideId, setAcceptingRideId] = useState(null);
  const [waitingLoading, setWaitingLoading] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState(null);
  const [scheduledSuccessAlert, setScheduledSuccessAlert] = useState(null);

  /* Scheduled Rides */
  const [availableScheduledRides, setAvailableScheduledRides] = useState([]);
  const [reservedScheduledRides, setReservedScheduledRides] = useState([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [scheduledActionLoadingId, setScheduledActionLoadingId] = useState(null);

  /* Earnings & History */
  const [earnings, setEarnings] = useState({
    todayTotal: 0,
    netDriverEarning: 0,
    companyCommission: 0,
    todayTrips: 0,
    trips: []
  });
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [riderRides, setRiderRides] = useState([]);

  /* Settlements */
  const [selectedSettlementDate, setSelectedSettlementDate] = useState(getTodayDateString);
  const [shiftSettlement, setShiftSettlement] = useState(null);
  const [loadingShiftSettlement, setLoadingShiftSettlement] = useState(false);
  const [submittingShiftSettlement, setSubmittingShiftSettlement] = useState(false);
  const [shiftUtrInput, setShiftUtrInput] = useState('');
  const [shiftSuccessMsg, setShiftSuccessMsg] = useState('');

  /* KYC & Vehicle */
  const [vehicleType, setVehicleType] = useState(user?.profile?.vehicle_type || 'BIKE');
  const [vehicleModel, setVehicleModel] = useState(user?.profile?.vehicle_model || '');
  const [vehicleNumber, setVehicleNumber] = useState(user?.profile?.vehicle_number || '');
  const [licenseNumber, setLicenseNumber] = useState(user?.profile?.license_number || '');
  const [upiId, setUpiId] = useState(user?.profile?.upi_id || '');
  const [kycStatus, setKycStatus] = useState(
    user?.profile?.verification_status || user?.profile?.kyc_status || 'PENDING'
  );
  const [profileTotalRides, setProfileTotalRides] = useState(0);
  const [savingKyc, setSavingKyc] = useState(false);

  /* Penalties */
  const [pendingPenaltiesToVerify, setPendingPenaltiesToVerify] = useState([]);

  /* Geolocation & Sockets */
  const [riderLocation, setRiderLocation] = useState(null);
  const locationWatchIdRef = useRef(null);
  const lastLocationEmitRef = useRef({ timestamp: 0, lat: null, lng: null });
  const socketRef = useRef(null);

  useEffect(() => {
    if (user?.profile) {
      const vStatus = user.profile.verification_status || user.profile.kyc_status || 'PENDING';
      setKycStatus(vStatus);
      if (user.profile.vehicle_type) setVehicleType(user.profile.vehicle_type);
      if (user.profile.vehicle_model) setVehicleModel(user.profile.vehicle_model);
      if (user.profile.vehicle_number) setVehicleNumber(user.profile.vehicle_number);
      if (user.profile.license_number) setLicenseNumber(user.profile.license_number);
      if (user.profile.upi_id) setUpiId(user.profile.upi_id);
      if (vStatus !== 'APPROVED') {
        setIsOnline(false);
      }
    }
  }, [user]);

  /* Computed Earnings */
  const completedRidesList = (riderRides || []).filter(
    r => !r.status || r.status === 'COMPLETED' || r.status === 'PAID'
  );
  const todayDateStr = getTodayDateString();
  const todayRidesList = completedRidesList.filter(r => getRideLocalDay(r) === todayDateStr);

  const clientTodayTrips = todayRidesList.length;
  const clientLifetimeTrips = completedRidesList.length;

  const clientTodayNet = todayRidesList.reduce((sum, r) => {
    const fare = Number(r.total_fare || r.final_fare || r.estimated_fare || 20);
    const split = calcDriverSplit(fare);
    return sum + (r.rider_earning !== undefined ? Number(r.rider_earning) : split.rider);
  }, 0);

  const clientTodayPlatformFee = todayRidesList.reduce((sum, r) => {
    const fare = Number(r.total_fare || r.final_fare || r.estimated_fare || 20);
    const split = calcDriverSplit(fare);
    return sum + split.platformFee;
  }, 0);

  const clientLifetimePlatformFee = completedRidesList.reduce((sum, r) => {
    const fare = Number(r.total_fare || r.final_fare || r.estimated_fare || 20);
    const split = calcDriverSplit(fare);
    return sum + split.platformFee;
  }, 0);

  const todayNetEarning = Number(
    earnings?.todayTotal || earnings?.netDriverEarning || earnings?.summary?.today?.earnings || clientTodayNet || 0
  );
  const todayTripsCount = Number(
    earnings?.todayTrips || earnings?.summary?.today?.rides || clientTodayTrips || 0
  );
  const lifetimeTripsCount = Math.max(
    Number(earnings?.lifetimeTrips || earnings?.summary?.lifetime?.rides || 0),
    clientLifetimeTrips,
    profileTotalRides,
    todayTripsCount
  );
  const totalPlatformFee = Number(
    earnings?.totalPlatformFee || earnings?.summary?.lifetime?.platformFee || clientLifetimePlatformFee || (lifetimeTripsCount * 4) || 0
  );
  const todayPlatformFee = Number(
    earnings?.todayPlatformFee || earnings?.companyCommission || earnings?.summary?.today?.platformFee || clientTodayPlatformFee || (todayTripsCount * 4) || 0
  );

  const pendingShiftsList = shiftSettlement?.pendingShifts || (shiftSettlement?.recentShifts || []).filter(
    s => s.status !== 'SETTLED' && Number(s.totalCommissionDue || 0) > 0
  );
  const totalPendingCommissionDues = Number(
    shiftSettlement?.totalPendingDues || pendingShiftsList.reduce((sum, s) => sum + Number(s.totalCommissionDue || 0), 0)
  ).toFixed(2);

  /* API Calls */
  const fetchShiftSettlement = useCallback(async (targetDate) => {
    if (!token) return;
    try {
      setLoadingShiftSettlement(true);
      const queryDate = targetDate || selectedSettlementDate || getTodayDateString();
      const res = await apiRequest(`/rider/shift-settlement?date=${queryDate}`, 'GET', null, token);
      if (res?.data) {
        setShiftSettlement(res.data);
        if (res.data.utrReference) {
          setShiftUtrInput(res.data.utrReference);
        } else {
          setShiftUtrInput('');
        }
      }
    } catch (_) {
    } finally {
      setLoadingShiftSettlement(false);
    }
  }, [token, selectedSettlementDate]);

  const handleSubmitShiftSettlement = async (e) => {
    if (e) e.preventDefault();
    if (!shiftUtrInput || !shiftUtrInput.trim()) {
      showStatusBanner({ type: 'error', text: 'Please enter your 12-digit UPI transaction reference (UTR) number.' });
      return;
    }
    try {
      setSubmittingShiftSettlement(true);
      const targetDate = shiftSettlement?.date || selectedSettlementDate || getTodayDateString();
      const res = await apiRequest('/rider/shift-settlement/submit', 'POST', {
        date: targetDate,
        utrReference: shiftUtrInput.trim()
      }, token);
      if (res?.data) {
        setShiftSettlement(res.data);
      } else {
        await fetchShiftSettlement(targetDate);
      }
      showStatusBanner({ type: 'success', text: `Shift settlement for ${targetDate} submitted to Admin for verification.` });
    } catch (err) {
      showStatusBanner({ type: 'error', text: err.message || 'Failed to submit shift settlement.' });
    } finally {
      setSubmittingShiftSettlement(false);
    }
  };

  const handleToggleOnline = async () => {
    if (!isOnline && kycStatus !== 'APPROVED') {
      showStatusBanner({
        type: 'error',
        text: `Cannot go online. Your driver account is ${kycStatus}. Admin approval of your Driving Licence & RC is required.`
      });
      return;
    }
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    try {
      await apiRequest('/rider/status', 'PATCH', { isOnline: nextStatus }, token);
      if (socketRef.current) {
        socketRef.current.emit('rider:status_change', { isOnline: nextStatus });
      }
      showStatusBanner({
        type: nextStatus ? 'success' : 'info',
        text: nextStatus ? 'You are now ONLINE and visible for campus rides.' : 'You are now OFFLINE.'
      });
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setIsOnline(!nextStatus);
      showStatusBanner({ type: 'error', text: 'Failed to update online status.' });
    }
  };

  const fetchActiveRide = useCallback(async () => {
    if (!token) return;
    try {
      setActiveRideLoading(true);
      const res = await apiRequest('/rider/active-ride', 'GET', null, token);
      if (res?.data) {
        const r = res.data;
        const fare = r.total_fare || r.final_fare || r.estimated_fare || 20;
        const split = calcDriverSplit(fare);
        setActiveRide({
          ...r,
          total_fare: fare,
          estimated_fare: fare,
          final_fare: fare,
          rider_earning: r.rider_earning || split.rider,
          company_earning: r.company_earning || split.company,
          controller_earning: r.controller_earning || split.controller
        });
      } else {
        setActiveRide(null);
      }
    } catch (_) {
      setActiveRide(null);
    } finally {
      setActiveRideLoading(false);
    }
  }, [token]);

  const fetchEarnings = useCallback(async (showLoader = true) => {
    if (!token) return;
    try {
      if (showLoader) setLoadingEarnings(true);
      const [earnRes, ridesRes] = await Promise.all([
        apiRequest('/rider/earnings', 'GET', null, token),
        apiRequest('/rider/rides?limit=50', 'GET', null, token)
      ]);
      if (earnRes?.data) setEarnings(earnRes.data);
      if (ridesRes?.data) {
        const list = Array.isArray(ridesRes.data) ? ridesRes.data : (ridesRes.data.rides || []);
        setRiderRides(list);
      }
    } catch (_) {
    } finally {
      if (showLoader) setLoadingEarnings(false);
    }
  }, [token]);

  const fetchPendingPenalties = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest('/rider/penalties/pending', 'GET', null, token);
      if (res?.data) {
        setPendingPenaltiesToVerify(res.data);
      }
    } catch (_) {}
  }, [token]);

  const handleConfirmPenalty = async (penaltyId, isConfirmed) => {
    try {
      await apiRequest(`/rider/penalties/${penaltyId}/confirm`, 'POST', {
        confirmed: isConfirmed
      }, token);
      setPendingPenaltiesToVerify(prev => prev.filter(p => p.id !== penaltyId));
      showStatusBanner({
        type: isConfirmed ? 'success' : 'info',
        text: isConfirmed ? '₹15 cancellation compensation confirmed.' : 'Marked penalty as not received.'
      });
    } catch (err) {
      showStatusBanner({ type: 'error', text: err.message || 'Failed to update penalty status.' });
    }
  };

  const fetchAvailableRequests = useCallback(async () => {
    if (!token || !isOnline || activeRide) return;
    try {
      const res = await apiRequest('/rider/requests', 'GET', null, token);
      if (res?.data) {
        const valid = res.data.filter(r => {
          const rideId = String(r.id);
          if (declinedRideIds.has(rideId)) return false;

          const isFemaleOnly = Boolean(r.femaleRiderOnly || r.female_rider_only);
          const myGender = (user?.gender || '').toUpperCase();
          if (isFemaleOnly && myGender !== 'FEMALE') return false;

          const reqVehicle = (r.vehicleType || r.vehicle_type || 'ANY').toUpperCase();
          const myVehicle = (user?.profile?.vehicle_type || vehicleType || 'BIKE').toUpperCase();
          if (reqVehicle !== 'ANY' && reqVehicle !== myVehicle) return false;

          return true;
        });

        const mapped = valid.map(r => {
          const fare = Number(r.total_fare || r.totalFare || r.estimatedFare || r.estimated_fare || 20);
          return {
            ...r,
            total_fare: fare,
            estimated_fare: fare,
            is_outside: Boolean(r.isOutside || r.is_outside)
          };
        });
        setIncomingRequests(mapped);
      }
    } catch (_) {}
  }, [token, isOnline, activeRide, declinedRideIds, user, vehicleType]);

  const fetchScheduledRides = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingScheduled(true);
      const [openRes, resRes] = await Promise.all([
        apiRequest('/rider/rides/scheduled/available', 'GET', null, token),
        apiRequest('/rider/rides/scheduled/reserved', 'GET', null, token)
      ]);
      setAvailableScheduledRides(openRes?.data || []);
      setReservedScheduledRides(resRes?.data || []);
    } catch (_) {
    } finally {
      setLoadingScheduled(false);
    }
  }, [token]);

  const handleAcceptScheduledRide = async (rideId) => {
    setScheduledActionLoadingId(rideId);
    try {
      const res = await apiRequest(`/rider/rides/${rideId}/accept-scheduled`, 'POST', {}, token);
      showStatusBanner({
        type: 'success',
        text: `Advance ride #${res.data?.ride_code || rideId} reserved successfully!`
      });
      await fetchScheduledRides();
    } catch (err) {
      showStatusBanner({ type: 'error', text: err.message || 'Failed to reserve scheduled ride.' });
    } finally {
      setScheduledActionLoadingId(null);
    }
  };

  const handleCancelScheduledRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to cancel your reservation for this advance booking?')) return;
    setScheduledActionLoadingId(rideId);
    try {
      await apiRequest(`/rider/rides/${rideId}/cancel-scheduled`, 'POST', {
        reason: 'Rider cancelled advance reservation'
      }, token);
      showStatusBanner({ type: 'info', text: 'Advance reservation cancelled.' });
      await fetchScheduledRides();
    } catch (err) {
      showStatusBanner({ type: 'error', text: err.message || 'Failed to cancel advance reservation.' });
    } finally {
      setScheduledActionLoadingId(null);
    }
  };

  /* Geolocation Tracker */
  useEffect(() => {
    if (!isOnline || !navigator.geolocation) {
      if (locationWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
      return;
    }

    const handlePosition = (position) => {
      const { latitude, longitude, heading, speed, accuracy } = position.coords;
      const now = Date.now();
      const currentLoc = {
        latitude,
        longitude,
        heading: (heading !== null && !isNaN(heading)) ? heading : 0,
        speed: (speed !== null && !isNaN(speed)) ? speed : 0,
        accuracy: accuracy || 10,
        timestamp: now
      };

      setRiderLocation(currentLoc);

      const last = lastLocationEmitRef.current;
      const timeDiff = now - last.timestamp;
      const isMoving = (speed && speed > 1);
      const minInterval = isMoving ? 5000 : 10000;

      let distanceMeters = 0;
      if (last.lat !== null && last.lng !== null) {
        distanceMeters = getHaversineDistanceKm(last.lat, last.lng, latitude, longitude) * 1000;
      }

      if (timeDiff >= minInterval || distanceMeters >= 20 || last.lat === null) {
        lastLocationEmitRef.current = { timestamp: now, lat: latitude, lng: longitude };
        if (socketRef.current) {
          socketRef.current.emit('rider:location_update', {
            riderId: user?.id,
            rideId: activeRide?.id || null,
            latitude,
            longitude,
            heading: currentLoc.heading,
            speed: currentLoc.speed,
            accuracy: currentLoc.accuracy,
            timestamp: now
          });
        }
      }
    };

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => console.warn('Rider geolocation notice:', err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => {
      if (locationWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };
  }, [isOnline, Boolean(activeRide), user?.id, activeRide?.id]);

  /* Socket Setup */
  useEffect(() => {
    if (!token) return;
    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('identify', { id: user?.id, role: 'RIDER', name: user?.name, isOnline });
      socket.emit('rider:identify', { riderId: user?.id, status: isOnline ? 'ONLINE' : 'OFFLINE', isOnline });
      fetchAvailableRequests();
    });

    socket.on('ride:new_request', (ride) => {
      if (!isOnline) return;
      const rideId = ride.id || ride.rideId;
      if (!rideId || declinedRideIds.has(String(rideId))) return;

      const isFemaleOnly = Boolean(ride.femaleRiderOnly || ride.female_rider_only);
      const myGender = (user?.gender || '').toUpperCase();
      if (isFemaleOnly && myGender !== 'FEMALE') return;

      const reqVehicle = (ride.vehicleType || ride.vehicle_type || 'ANY').toUpperCase();
      const myVehicle = (user?.profile?.vehicle_type || vehicleType || 'BIKE').toUpperCase();
      if (reqVehicle !== 'ANY' && reqVehicle !== myVehicle) return;

      if (!activeRide) {
        const fare = Number(ride.total_fare || ride.totalFare || ride.estimatedFare || ride.estimated_fare || 20);
        const newReq = {
          id: rideId,
          pickup_address: ride.pickupAddress || ride.pickup_address,
          destination_address: ride.destinationAddress || ride.destination_address,
          total_fare: fare,
          estimated_fare: fare,
          customer_name: ride.customerName || ride.customer_name || 'Passenger',
          female_rider_only: isFemaleOnly,
          is_double_ride: Boolean(ride.isDoubleRide || ride.is_double_ride),
          is_outside: Boolean(ride.isOutside || ride.is_outside),
          vehicle_type: reqVehicle
        };
        setIncomingRequests(prev => {
          const exists = prev.some(r => String(r.id) === String(rideId));
          if (exists) return prev.map(r => String(r.id) === String(rideId) ? newReq : r);
          return [newReq, ...prev];
        });

        if (soundEnabled) {
          alertManager.triggerRideAlert({
            title: `New Ride Request: ₹${fare}`,
            body: `Pickup: ${newReq.pickup_address} → Drop: ${newReq.destination_address}`,
            repeat: true
          });
        }
      }
    });

    socket.on('ride:status_change', (data) => {
      const rideObj = data?.ride || data;
      const rideId = rideObj?.id || data?.rideId;
      const status = data.status || rideObj?.status;

      if (status === 'CANCELLED') {
        if (activeRide && String(activeRide.id) === String(rideId)) {
          setTripCancelledNotice(`Passenger cancelled Trip #${rideId}. Returning to Radar.`);
          setActiveRide(null);
          setEnteredOtp('');
          if (onNavigateTab) onNavigateTab('radar');
          fetchAvailableRequests();
        }
        setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(rideId)));
        return;
      }

      if (activeRide && String(activeRide.id) === String(rideId)) {
        const fare = rideObj.total_fare || rideObj.estimated_fare || rideObj.final_fare || 20;
        setActiveRide(prev => ({
          ...(prev || {}),
          ...rideObj,
          status: status || prev?.status,
          total_fare: fare,
          estimated_fare: fare,
          final_fare: fare
        }));
      }
    });

    socket.on('ride:claimed', (data) => {
      setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(data.rideId)));
    });

    socket.on('ride:cancelled', (data) => {
      const rideObj = data?.ride || data;
      const rideId = rideObj?.id || data?.rideId || data?.id;
      const status = data?.status || rideObj?.status;
      if (status && status !== 'CANCELLED') return;
      if (activeRide && String(activeRide.id) === String(rideId)) {
        setTripCancelledNotice(`Passenger cancelled Trip #${rideId}. Returning to Radar.`);
        setActiveRide(null);
        setEnteredOtp('');
        if (onNavigateTab) onNavigateTab('radar');
        fetchAvailableRequests();
      }
      setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(rideId)));
    });

    socket.on('ride:waiting_update', (data) => {
      const rideId = data?.rideId || data?.id;
      if (activeRide && String(activeRide.id) === String(rideId)) {
        const waitingFare = parseFloat(data.waitingFare || data.waiting_fare || 0);
        const baseFare = parseFloat(activeRide.estimated_fare || activeRide.total_fare || 20);
        const totalFare = baseFare + waitingFare;
        const split = calcDriverSplit(totalFare);
        setActiveRide(prev => ({
          ...prev,
          is_waiting: Boolean(data.isWaiting || data.is_waiting),
          waiting_minutes: parseInt(data.waitingMinutes || data.waiting_minutes || 0, 10),
          waiting_fare: waitingFare,
          total_fare: totalFare,
          final_fare: totalFare,
          rider_earning: split.rider,
          company_earning: split.company,
          controller_earning: split.controller
        }));
      }
    });

    socket.on('penalty:payment_claimed', (data) => {
      fetchPendingPenalties();
      if (soundEnabled) {
        alertManager.triggerRideAlert({
          title: '₹15 Payment Verification',
          body: `Passenger ${data?.customerName || ''} claims ₹15 paid to your UPI`,
          repeat: false
        });
      }
    });

    socket.on('penalty:status_update', () => {
      fetchPendingPenalties();
    });

    socket.on('rider:shift_settlement_updated', () => {
      fetchShiftSettlement();
      fetchEarnings(false);
    });

    socket.on('ride:new_scheduled_booking', (ride) => {
      fetchScheduledRides();
      if (soundEnabled) {
        alertManager.triggerRideAlert({
          title: `New Advance Pre-Booking: ₹${ride?.estimated_fare || 20}`,
          body: `Pickup: ${ride?.pickup_address || ''} → Drop: ${ride?.destination_address || ''}`,
          repeat: false
        });
      }
    });

    socket.on('ride:scheduled_claimed', (data) => {
      setAvailableScheduledRides(prev => prev.filter(r => String(r.id) !== String(data.rideId)));
      fetchScheduledRides();
    });

    socket.on('ride:scheduled_cancelled', (data) => {
      setAvailableScheduledRides(prev => prev.filter(r => String(r.id) !== String(data.rideId)));
      setReservedScheduledRides(prev => prev.filter(r => String(r.id) !== String(data.rideId)));
    });

    socket.on('ride:scheduled_reopened', () => {
      fetchScheduledRides();
    });

    return () => {
      socket.disconnect();
    };
  }, [token, isOnline, declinedRideIds, activeRide, user, vehicleType, soundEnabled, fetchShiftSettlement, fetchEarnings, fetchPendingPenalties, fetchScheduledRides, fetchAvailableRequests, onNavigateTab]);

  /* Polling loop for active ride / requests */
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      if (activeRide) {
        fetchActiveRide();
      } else {
        fetchAvailableRequests();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isOnline, activeRide, fetchActiveRide, fetchAvailableRequests]);

  /* Stop ringtone if offline or active ride starts */
  useEffect(() => {
    if (!isOnline || incomingRequests.length === 0 || activeRide) {
      alertManager.stopRingtone();
    }
  }, [isOnline, incomingRequests.length, activeRide]);

  /* Initial fetch */
  useEffect(() => {
    if (token) {
      fetchActiveRide();
      fetchEarnings(true);
      fetchPendingPenalties();
      fetchShiftSettlement();
      fetchScheduledRides();
    }
  }, [token, fetchActiveRide, fetchEarnings, fetchPendingPenalties, fetchShiftSettlement, fetchScheduledRides]);

  /* Action Handlers */
  const handleAcceptRequest = async (rideId) => {
    alertManager.stopRingtone();
    setAcceptingRideId(rideId);
    setActionLoading(true);
    setEnteredOtp('');
    setOtpError(null);
    try {
      const res = await apiRequest(`/rider/rides/${rideId}/accept`, 'POST', {}, token);
      const r = res.data;
      const pickupTimeVal = r?.scheduled_time_ist || r?.scheduled_time || r?.scheduledTime;
      const isFutureTime = pickupTimeVal && !isScheduledTimeReached(pickupTimeVal, 10);

      if (isFutureTime) {
        showStatusBanner({
          type: 'success',
          text: `Trip confirmed for ${formatRideDateTime(pickupTimeVal)}! Saved in your upcoming schedule.`
        });
        fetchScheduledRides();
        setIncomingRequests(prev => prev.filter(req => String(req.id) !== String(rideId)));
      } else {
        if (r) {
          const fare = r.total_fare || r.final_fare || r.estimated_fare || 20;
          const split = calcDriverSplit(fare);
          setActiveRide({
            ...r,
            total_fare: fare,
            estimated_fare: fare,
            final_fare: fare,
            rider_earning: r.rider_earning || split.rider,
            company_earning: r.company_earning || split.company,
            controller_earning: r.controller_earning || split.controller
          });
        }
        setIncomingRequests([]);
        if (onNavigateTab) onNavigateTab('active');
        fetchActiveRide();
      }
    } catch (err) {
      showStatusBanner({ type: 'error', text: err.message || 'Failed to accept ride. Claimed by another rider.' });
      setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(rideId)));
    } finally {
      setActionLoading(false);
      setAcceptingRideId(null);
    }
  };

  const handleDeclineRequest = async (rideId) => {
    alertManager.stopRingtone();
    setDeclinedRideIds(prev => new Set([...prev, String(rideId)]));
    setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(rideId)));
    try {
      await apiRequest(`/rider/rides/${rideId}/decline`, 'POST', {}, token);
    } catch (err) {
      console.warn('Decline notice:', err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!activeRide) return;
    setActionLoading(true);
    setOtpError(null);
    try {
      let res;
      if (newStatus === 'RIDER_ARRIVING') {
        res = await apiRequest(`/rider/rides/${activeRide.id}/arriving`, 'POST', {}, token);
      } else if (newStatus === 'RIDER_REACHED') {
        setEnteredOtp('');
        res = await apiRequest(`/rider/rides/${activeRide.id}/reached`, 'POST', {}, token);
      } else if (newStatus === 'STARTED') {
        if (!enteredOtp || enteredOtp.trim().length !== 4) {
          setOtpError('Please enter the 4-digit Ride OTP provided by the passenger.');
          setActionLoading(false);
          return;
        }
        res = await apiRequest(`/rider/rides/${activeRide.id}/start`, 'POST', { otp: enteredOtp.trim() }, token);
        setEnteredOtp('');
      } else if (newStatus === 'COMPLETED') {
        res = await apiRequest(`/rider/rides/${activeRide.id}/complete`, 'POST', {}, token);
        setEnteredOtp('');
        fetchEarnings();
      }

      const rideObj = res.data?.ride || res.data;
      if (rideObj) {
        const fare = rideObj.final_fare || rideObj.total_fare || rideObj.estimated_fare || activeRide.total_fare || 20;
        const split = calcDriverSplit(fare);
        setActiveRide({
          ...activeRide,
          ...rideObj,
          status: newStatus || rideObj.status,
          total_fare: fare,
          estimated_fare: fare,
          final_fare: fare,
          rider_earning: rideObj.rider_earning || res.data?.split?.riderEarning || split.rider,
          company_earning: rideObj.company_earning || res.data?.split?.companyEarning || split.company,
          controller_earning: rideObj.controller_earning || res.data?.split?.controllerEarning || split.controller
        });
      }
    } catch (err) {
      setOtpError(err.message || `Failed to update status to ${newStatus}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleWaiting = async () => {
    if (!activeRide) return;
    setWaitingLoading(true);
    try {
      const nextState = !activeRide.is_waiting;
      const res = await apiRequest(`/rider/rides/${activeRide.id}/waiting`, 'POST', {
        isWaiting: nextState
      }, token);

      const rideObj = res.data?.ride || res.data;
      if (rideObj) {
        const fare = rideObj.final_fare || rideObj.total_fare || rideObj.estimated_fare || activeRide.total_fare || 20;
        const split = calcDriverSplit(fare);
        setActiveRide(prev => ({
          ...prev,
          ...rideObj,
          total_fare: fare,
          estimated_fare: fare,
          final_fare: fare,
          rider_earning: rideObj.rider_earning || split.rider,
          company_earning: rideObj.company_earning || split.company,
          controller_earning: rideObj.controller_earning || split.controller
        }));
      }
    } catch (err) {
      showStatusBanner({ type: 'error', text: err.message || 'Failed to toggle waiting mode.' });
    } finally {
      setWaitingLoading(false);
    }
  };

  const handleCancelActiveTrip = async () => {
    if (!activeRide) return;
    const reason = window.prompt('Enter reason for cancelling this trip (Flat tyre, emergency, etc.):', 'Vehicle issue');
    if (!reason) return;

    setActionLoading(true);
    try {
      await apiRequest(`/rider/rides/${activeRide.id}/cancel`, 'POST', { reason }, token);
      setDeclinedRideIds(prev => new Set([...prev, String(activeRide.id)]));
      setActiveRide(null);
      setEnteredOtp('');
      setOtpError(null);
      showStatusBanner({
        type: 'info',
        text: 'Trip cancelled. It has been re-opened for other drivers.'
      });
      if (onNavigateTab) onNavigateTab('radar');
    } catch (err) {
      showStatusBanner({ type: 'error', text: err.message || 'Failed to cancel trip.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveKyc = async (e) => {
    if (e) e.preventDefault();
    setSavingKyc(true);
    try {
      await apiRequest('/auth/profile', 'PATCH', {
        vehicleType,
        vehicleModel,
        vehicleNumber,
        licenseNumber,
        upiId
      }, token);
      showStatusBanner({ type: 'success', text: 'Vehicle and driver details updated!' });
    } catch (err) {
      showStatusBanner({ type: 'error', text: err.message || 'Failed to save vehicle details.' });
    } finally {
      setSavingKyc(false);
    }
  };

  const value = {
    user,
    token,
    logout,
    updateProfile,
    changePassword,
    isOnline,
    setIsOnline,
    handleToggleOnline,
    soundEnabled,
    setSoundEnabled,
    statusBanner,
    showStatusBanner,
    clearStatusBanner,
    incomingRequests,
    setIncomingRequests,
    activeRide,
    setActiveRide,
    activeRideLoading,
    fetchActiveRide,
    handleAcceptRequest,
    handleDeclineRequest,
    actionLoading,
    acceptingRideId,
    handleStatusChange,
    handleToggleWaiting,
    waitingLoading,
    handleCancelActiveTrip,
    enteredOtp,
    setEnteredOtp,
    otpError,
    setOtpError,
    tripCancelledNotice,
    setTripCancelledNotice,
    scheduledSuccessAlert,
    setScheduledSuccessAlert,
    availableScheduledRides,
    reservedScheduledRides,
    loadingScheduled,
    fetchScheduledRides,
    handleAcceptScheduledRide,
    handleCancelScheduledRide,
    scheduledActionLoadingId,
    earnings,
    riderRides,
    loadingEarnings,
    fetchEarnings,
    todayNetEarning,
    todayTripsCount,
    lifetimeTripsCount,
    totalPlatformFee,
    todayPlatformFee,
    selectedSettlementDate,
    setSelectedSettlementDate,
    shiftSettlement,
    loadingShiftSettlement,
    submittingShiftSettlement,
    shiftUtrInput,
    setShiftUtrInput,
    shiftSuccessMsg,
    setShiftSuccessMsg,
    fetchShiftSettlement,
    handleSubmitShiftSettlement,
    pendingShiftsList,
    totalPendingCommissionDues,
    vehicleType,
    setVehicleType,
    vehicleModel,
    setVehicleModel,
    vehicleNumber,
    setVehicleNumber,
    licenseNumber,
    setLicenseNumber,
    upiId,
    setUpiId,
    kycStatus,
    savingKyc,
    handleSaveKyc,
    pendingPenaltiesToVerify,
    handleConfirmPenalty,
    riderLocation
  };

  return (
    <RiderContext.Provider value={value}>
      {children}
    </RiderContext.Provider>
  );
}

export function useRider() {
  const ctx = useContext(RiderContext);
  if (!ctx) {
    throw new Error('useRider must be used within a RiderProvider');
  }
  return ctx;
}
