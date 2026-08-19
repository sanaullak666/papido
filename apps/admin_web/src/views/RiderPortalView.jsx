import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, getSocketUrl } from '../api';
import { io } from 'socket.io-client';
import {
  Bike,
  Navigation,
  CheckCircle,
  XCircle,
  Phone,
  DollarSign,
  TrendingUp,
  FileText,
  User,
  Lock,
  Radio,
  Clock,
  Shield,
  LogOut,
  ArrowRight,
  AlertTriangle,
  Upload,
  Volume2,
  VolumeX,
  Bell,
  Zap,
  Users,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  MapPin
} from 'lucide-react';
import { alertManager } from '../utils/alertManager';

export function RiderPortalView() {
  const { user, token, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState('radar'); // 'radar', 'active', 'earnings', 'kyc', 'profile'
  const [isOnline, setIsOnline] = useState(user?.profile?.verification_status === 'APPROVED' ? Boolean(user?.profile?.is_online) : false);

  // Incoming Requests & Active Ride
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [activeRideLoading, setActiveRideLoading] = useState(false);
  const [declinedRideIds, setDeclinedRideIds] = useState(() => new Set());
  const [tripCancelledNotice, setTripCancelledNotice] = useState(null);

  // Audio Alerts
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Earnings & Shift Stats
  const [earnings, setEarnings] = useState({
    todayTotal: 0,
    netDriverEarning: 0,
    companyCommission: 0,
    todayTrips: 0,
    trips: []
  });
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [riderRides, setRiderRides] = useState([]);

  // KYC & Vehicle
  const [vehicleType, setVehicleType] = useState(user?.profile?.vehicle_type || 'BIKE');
  const [vehicleModel, setVehicleModel] = useState(user?.profile?.vehicle_model || '');
  const [vehicleNumber, setVehicleNumber] = useState(user?.profile?.vehicle_number || '');
  const [licenseNumber, setLicenseNumber] = useState(user?.profile?.license_number || '');
  const [kycStatus, setKycStatus] = useState(user?.profile?.verification_status || user?.profile?.kyc_status || 'PENDING');
  const [savingKyc, setSavingKyc] = useState(false);

  // Sync profile details when user context loads or updates
  useEffect(() => {
    if (user?.profile) {
      const vStatus = user.profile.verification_status || user.profile.kyc_status || 'PENDING';
      setKycStatus(vStatus);
      if (user.profile.vehicle_type) setVehicleType(user.profile.vehicle_type);
      if (user.profile.vehicle_model) setVehicleModel(user.profile.vehicle_model);
      if (user.profile.vehicle_number) setVehicleNumber(user.profile.vehicle_number);
      if (user.profile.license_number) setLicenseNumber(user.profile.license_number);
      if (vStatus !== 'APPROVED') {
        setIsOnline(false);
      }
    }
  }, [user]);

  // Profile & Password
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState(null);
  const [passSuccess, setPassSuccess] = useState(null);
  const [passUpdating, setPassUpdating] = useState(false);

  // Leaflet Map Ref
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);

  // Socket reference
  const socketRef = useRef(null);

  // Dynamic Company & Rider Fare Split Policy
  // < 80 Rs => Company ₹4, Controller ₹0, Rider remainder
  // >= 80 Rs => Company 10%, Controller ₹2, Rider remainder
  const calcDriverSplit = (rawFare) => {
    const f = parseFloat(rawFare) || 0;
    if (f < 80) {
      const comp = Math.min(f, 4.0);
      const ctrl = 0.0;
      const rider = Math.max(0, f - comp);
      return { rider, company: comp, controller: ctrl };
    } else {
      const comp = Number((f * 0.10).toFixed(2));
      const ctrl = 2.0;
      const rider = Number(Math.max(0, f - comp - ctrl).toFixed(2));
      return { rider, company: comp, controller: ctrl };
    }
  };

  // Derived Earnings Values
  const todayNetEarning = earnings?.netDriverEarning ?? earnings?.summary?.today?.earnings ?? earnings?.todayTotal ?? 0;
  const todayTripsCount = earnings?.todayTrips ?? earnings?.summary?.today?.rides ?? (riderRides ? riderRides.length : 0);
  const platformCommission = earnings?.companyCommission ?? earnings?.summary?.today?.companyDeduction ?? 0;

  const handleToggleOnline = async () => {
    if (!isOnline && kycStatus !== 'APPROVED') {
      alert(`Cannot go online. Your driver account is ${kycStatus}. Admin approval of your Campus ID, Driving Licence, and RC is required before you can accept rides.`);
      return;
    }
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    if (socketRef.current) {
      socketRef.current.emit('rider:status_toggle', { isOnline: nextStatus, riderId: user?.id });
    }
    try {
      await apiRequest('/rider/status', 'PATCH', { isOnline: nextStatus }, token);
    } catch (err) {
      console.warn('Status toggle warning:', err);
      setIsOnline(!nextStatus);
      alert(err.message || 'Failed to update online status.');
    }
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current && window.L) {
      const map = window.L.map(mapRef.current).setView([12.0228, 79.8509], 15);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      leafletMapRef.current = map;
    }
  }, [mapRef]);

  // 2. Fetch Active Trip & Earnings
  const fetchActiveRide = async () => {
    try {
      setActiveRideLoading(true);
      const res = await apiRequest('/rider/active-ride', 'GET', null, token);
      if (res.data) {
        const r = res.data;
        if (r.status === 'CANCELLED') {
          if (activeRide) {
            setTripCancelledNotice(`⚠️ Passenger cancelled Trip #${r.id}. Returning to Radar.`);
          }
          setActiveRide(null);
          setCurrentTab('radar');
          fetchAvailableRequests();
          return;
        }
        const fare = r.total_fare || r.final_fare || r.estimated_fare || 20;
        const split = calcDriverSplit(fare);
        setActiveRide({
          ...r,
          total_fare: fare,
          estimated_fare: fare,
          rider_earning: r.rider_earning || split.rider,
          company_earning: r.company_earning || split.company,
          controller_earning: r.controller_earning || split.controller
        });
      } else {
        if (activeRide) {
          setTripCancelledNotice('⚠️ Current trip was cancelled or closed.');
          setCurrentTab('radar');
        }
        setActiveRide(null);
      }
    } catch (err) {
      console.warn('Failed to fetch active ride:', err);
    } finally {
      setActiveRideLoading(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      setLoadingEarnings(true);
      const [earningsRes, ridesRes] = await Promise.all([
        apiRequest('/rider/earnings', 'GET', null, token),
        apiRequest('/rider/rides/history', 'GET', null, token)
      ]);
      if (earningsRes.data) {
        setEarnings(earningsRes.data);
      }
      const pastItems = ridesRes.data?.items || ridesRes.data?.rides || (Array.isArray(ridesRes.data) ? ridesRes.data : []);
      setRiderRides(pastItems);
    } catch (err) {
      console.warn('Failed to fetch rider earnings:', err);
    } finally {
      setLoadingEarnings(false);
    }
  };

  const fetchAvailableRequests = async () => {
    if (!isOnline || activeRide) return;
    try {
      const res = await apiRequest('/rider/requests', 'GET', null, token);
      const list = res.data || [];
      const myGender = (user?.gender || '').toUpperCase();
      const available = list
        .filter(r => !declinedRideIds.has(String(r.id)))
        .filter(r => {
          const isFemaleOnly = Boolean(r.female_rider_only || r.femaleRiderOnly);
          if (isFemaleOnly && myGender !== 'FEMALE') return false;
          return true;
        })
        .map(r => {
          const fare = Number(r.total_fare || r.final_fare || r.estimated_fare || 20);
          return {
            ...r,
            id: r.id,
            pickup_address: r.pickup_address || r.pickupAddress,
            destination_address: r.destination_address || r.destinationAddress,
            total_fare: fare,
            estimated_fare: fare,
            customer_name: r.customer_name || r.customerName || 'Passenger',
            female_rider_only: Boolean(r.female_rider_only || r.femaleRiderOnly),
            is_double_ride: Boolean(r.is_double_ride || r.isDoubleRide),
            is_outside: Boolean(r.is_outside || r.isOutside),
            vehicle_type: r.vehicle_type || r.vehicleType || 'BIKE'
          };
        });
      setIncomingRequests(available);
    } catch (err) {
      console.warn('Failed to poll available requests:', err);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiRequest('/rider/profile', 'GET', null, token);
        if (res?.data) {
          const p = res.data;
          const vStatus = p.verification_status || 'PENDING';
          setKycStatus(vStatus);
          if (p.vehicle_type) setVehicleType(p.vehicle_type);
          if (p.vehicle_model) setVehicleModel(p.vehicle_model);
          if (p.vehicle_number) setVehicleNumber(p.vehicle_number);
          if (p.license_number) setLicenseNumber(p.license_number);
          if (vStatus !== 'APPROVED') {
            setIsOnline(false);
          } else if (p.is_online !== undefined) {
            setIsOnline(Boolean(p.is_online));
          }
        }
      } catch (_) {}
    };

    fetchProfile();
    fetchActiveRide();
    fetchEarnings();
    fetchAvailableRequests();
    if (token) {
      alertManager.subscribeToPushNotifications(token);
    }
  }, [token]);

  // Sync online status changes to socket
  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.emit('rider:status_toggle', { isOnline, riderId: user?.id });
    }
  }, [isOnline]);

  // Polling fallback: When online & no active ride, poll available requests. When in active ride, poll active status.
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      if (activeRide) {
        fetchActiveRide();
      } else {
        fetchAvailableRequests();
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [isOnline, activeRide, declinedRideIds]);

  // Stop ringing when queue is empty, driver goes offline, or is in an active ride
  useEffect(() => {
    if (!isOnline || incomingRequests.length === 0 || activeRide) {
      alertManager.stopRingtone();
    }
  }, [isOnline, incomingRequests.length, activeRide]);

  // 3. Socket.IO Listener for Incoming Requests & Real-time Updates
  useEffect(() => {
    if (!token) return;
    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Rider Socket connected:', socket.id);
      socket.emit('identify', { id: user?.id, role: 'RIDER', name: user?.name, isOnline });
      socket.emit('rider:identify', { riderId: user?.id, status: isOnline ? 'ONLINE' : 'OFFLINE', isOnline });
      fetchAvailableRequests();
    });

    socket.on('ride:new_request', (ride) => {
      console.log('Incoming ride request:', ride);
      if (!isOnline) return;
      const rideId = ride.id || ride.rideId;
      if (!rideId || declinedRideIds.has(String(rideId))) return;

      const isFemaleOnly = Boolean(ride.femaleRiderOnly || ride.female_rider_only);
      const myGender = (user?.gender || '').toUpperCase();
      if (isFemaleOnly && myGender !== 'FEMALE') {
        return; // Skip if female rider is requested and driver is not female
      }

      const reqVehicle = (ride.vehicleType || ride.vehicle_type || 'ANY').toUpperCase();
      const myVehicle = (user?.profile?.vehicle_type || vehicleType || 'BIKE').toUpperCase();
      if (reqVehicle !== 'ANY' && reqVehicle !== myVehicle) {
        return; // Skip if passenger specifically requested another vehicle type
      }

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
          if (exists) {
            return prev.map(r => String(r.id) === String(rideId) ? newReq : r);
          }
          return [newReq, ...prev];
        });

        // Trigger Audio Ringtone & Browser Push Notification
        if (soundEnabled) {
          alertManager.triggerRideAlert({
            title: `🔔 New Ride Request: ₹${fare}`,
            body: `Pickup: ${newReq.pickup_address} ➔ Drop: ${newReq.destination_address}`,
            repeat: true
          });
        }
      }
    });

    socket.on('ride:reopened', (ride) => {
      console.log('Ride reopened by passenger:', ride);
      if (!isOnline) return;
      const rideId = ride.id || ride.rideId;
      if (!rideId || declinedRideIds.has(String(rideId))) return;

      const isFemaleOnly = Boolean(ride.femaleRiderOnly || ride.female_rider_only);
      const myGender = (user?.gender || '').toUpperCase();
      if (isFemaleOnly && myGender !== 'FEMALE') {
        return;
      }

      const reqVehicle = (ride.vehicleType || ride.vehicle_type || 'ANY').toUpperCase();
      const myVehicle = (user?.profile?.vehicle_type || vehicleType || 'BIKE').toUpperCase();
      if (reqVehicle !== 'ANY' && reqVehicle !== myVehicle) {
        return;
      }

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
          if (exists) {
            return prev.map(r => String(r.id) === String(rideId) ? newReq : r);
          }
          return [newReq, ...prev];
        });

        if (soundEnabled) {
          alertManager.triggerRideAlert({
            title: `⚠️ Ride Re-opened: ₹${fare}`,
            body: `Pickup: ${newReq.pickup_address} ➔ Drop: ${newReq.destination_address}`,
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
          setTripCancelledNotice(`⚠️ Passenger cancelled Trip #${rideId}. Returning to Radar.`);
          setActiveRide(null);
          setEnteredOtp('');
          setCurrentTab('radar');
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
      // If another rider took this ride, dismiss it from our screen immediately
      setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(data.rideId)));
    });

    socket.on('ride:cancelled', (data) => {
      const rideObj = data?.ride || data;
      const rideId = rideObj?.id || data?.rideId || data?.id;
      const status = data?.status || rideObj?.status;
      if (status && status !== 'CANCELLED') {
        return;
      }
      if (activeRide && String(activeRide.id) === String(rideId)) {
        setTripCancelledNotice(`⚠️ Passenger cancelled Trip #${rideId}. Returning to Radar.`);
        setActiveRide(null);
        setEnteredOtp('');
        setCurrentTab('radar');
        fetchAvailableRequests();
      }
      setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(rideId)));
    });

    return () => {
      socket.disconnect();
    };
  }, [token, isOnline, declinedRideIds, activeRide, user]);

  // 5. Update Map when active trip changes
  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return;
    const map = leafletMapRef.current;

    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const bounds = [];

    // Driver location marker
    const driverIcon = window.L.divIcon({
      className: 'custom-map-pin',
      html: `<div style="background: #06B6D4; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; border: 3px solid white; box-shadow: 0 4px 12px rgba(6,182,212,0.6);">🏍️</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    const driverMarker = window.L.marker([12.0240, 79.8530], { icon: driverIcon }).addTo(map).bindPopup('<b>You (Driver)</b>');
    markersRef.current.push(driverMarker);
    bounds.push([12.0240, 79.8530]);

    if (activeRide) {
      if (activeRide.pickup_latitude && activeRide.pickup_longitude) {
        const pickupIcon = window.L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="background: #10B981; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">P</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });
        const pMarker = window.L.marker([activeRide.pickup_latitude, activeRide.pickup_longitude], { icon: pickupIcon })
          .addTo(map)
          .bindPopup(`<b>Pickup:</b> ${activeRide.pickup_address}`);
        markersRef.current.push(pMarker);
        bounds.push([activeRide.pickup_latitude, activeRide.pickup_longitude]);
      }

      if (activeRide.destination_latitude && activeRide.destination_longitude) {
        const destIcon = window.L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="background: #F59E0B; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: black; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">D</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });
        const dMarker = window.L.marker([activeRide.destination_latitude, activeRide.destination_longitude], { icon: destIcon })
          .addTo(map)
          .bindPopup(`<b>Drop:</b> ${activeRide.destination_address}`);
        markersRef.current.push(dMarker);
        bounds.push([activeRide.destination_latitude, activeRide.destination_longitude]);
      }
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [activeRide]);

  // 6. Handle Accept Ride
  const handleAcceptRequest = async (rideId) => {
    alertManager.stopRingtone();
    setActionLoading(true);
    try {
      const res = await apiRequest(`/rider/rides/${rideId}/accept`, 'POST', {}, token);
      const r = res.data;
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
      setCurrentTab('active');
      fetchActiveRide();
    } catch (err) {
      alert(err.message || 'Failed to accept ride. It may have been claimed by another rider.');
      setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(rideId)));
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Handle Decline Ride (Isolation: blacklist so never seen again)
  const handleDeclineRequest = async (rideId) => {
    alertManager.stopRingtone();
    setDeclinedRideIds(prev => new Set([...prev, String(rideId)]));
    setIncomingRequests(prev => prev.filter(r => String(r.id) !== String(rideId)));
    try {
      await apiRequest(`/rider/rides/${rideId}/decline`, 'POST', {}, token);
    } catch (err) {
      console.warn('Decline error:', err);
    }
  };

  // 8. Trip Progress Steps
  const handleStatusChange = async (newStatus) => {
    if (!activeRide) return;
    setActionLoading(true);
    setOtpError(null);
    try {
      let res;
      if (newStatus === 'RIDER_ARRIVING') {
        res = await apiRequest(`/rider/rides/${activeRide.id}/arriving`, 'POST', {}, token);
      } else if (newStatus === 'RIDER_REACHED') {
        res = await apiRequest(`/rider/rides/${activeRide.id}/reached`, 'POST', {}, token);
      } else if (newStatus === 'STARTED') {
        if (!enteredOtp || enteredOtp.trim().length !== 4) {
          setOtpError('Please enter the 4-digit Ride OTP provided by the passenger.');
          setActionLoading(false);
          return;
        }
        res = await apiRequest(`/rider/rides/${activeRide.id}/start`, 'POST', { otp: enteredOtp.trim() }, token);
      } else if (newStatus === 'COMPLETED') {
        res = await apiRequest(`/rider/rides/${activeRide.id}/complete`, 'POST', {}, token);
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

  // 9. Driver Cancel Trip (Auto Re-pool to other drivers)
  const handleCancelActiveTrip = async () => {
    if (!activeRide) return;
    const reason = window.prompt('Enter reason for cancelling this trip (Flat tyre, emergency, etc.):', 'Vehicle issue');
    if (!reason) return;

    setActionLoading(true);
    try {
      await apiRequest(`/rider/rides/${activeRide.id}/cancel`, 'POST', {
        reason
      }, token);
      setDeclinedRideIds(prev => new Set([...prev, String(activeRide.id)]));
      setActiveRide(null);
      alert('Trip cancelled. It has been re-opened for other drivers and will not appear on your radar again.');
      setCurrentTab('radar');
    } catch (err) {
      alert(err.message || 'Failed to cancel trip.');
    } finally {
      setActionLoading(false);
    }
  };

  // 10. Save Vehicle & KYC details
  const handleSaveKyc = async (e) => {
    e.preventDefault();
    setSavingKyc(true);
    try {
      await apiRequest('/auth/profile', 'PATCH', {
        vehicleType,
        vehicleModel,
        vehicleNumber,
        licenseNumber
      }, token);
      alert('✅ Vehicle and driver details updated!');
    } catch (err) {
      alert(err.message || 'Failed to save vehicle details.');
    } finally {
      setSavingKyc(false);
    }
  };

  // 11. Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateProfile({ name, phone });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // 12. Password Change
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPass.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('New passwords do not match.');
      return;
    }

    setPassUpdating(true);
    try {
      await changePassword(currentPass, newPass);
      setPassSuccess('✅ Password changed successfully!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setShowPasswordModal(false), 2000);
    } catch (err) {
      setPassError(err.message || 'Failed to change password. Check current password.');
    } finally {
      setPassUpdating(false);
    }
  };

  const getMapLink = (address) => {
    if (!address) return '#';
    if (address.startsWith('http://') || address.startsWith('https://')) {
      return address;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  return (
    <div className="theme-orange-beige" style={{ minHeight: '100vh', background: '#FAF5EE', color: '#271E16', display: 'flex', flexDirection: 'column' }}>
      {/* Top Driver Navigation Header */}
      <header style={{
        background: '#211A14',
        borderBottom: '1px solid #3A2F25',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        color: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/papidologo.jpeg"
            alt="Papido Logo"
            style={{
              width: '38px',
              height: '38px',
              objectFit: 'contain',
              borderRadius: '10px',
              border: '1px solid #43362A',
              background: '#FFFFFF',
              padding: '2px',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.4)'
            }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
              PAPIDO <span style={{ fontSize: '11px', background: 'rgba(249, 115, 22, 0.25)', color: '#FB923C', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(249, 115, 22, 0.4)' }}>DRIVER WEB</span>
            </div>
            <div style={{ fontSize: '11px', color: '#A8998A' }}>Campus Driver Fleet Operations</div>
          </div>
        </div>

        {/* Online / Offline Toggle & Shift Earnings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Online Toggle */}
          <button
            onClick={handleToggleOnline}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: isOnline ? '1.5px solid #10B981' : '1.5px solid #EF4444',
              background: isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: isOnline ? '#34D399' : '#F87171',
              fontWeight: 800,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#10B981' : '#EF4444' }} />
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </button>

          {/* Today Earnings Chip */}
          <div style={{
            background: '#2D2319',
            border: '1px solid #43362A',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ color: '#A8998A', fontSize: '11px' }}>TODAY:</span>
            <span style={{ color: '#FB923C', fontWeight: 900 }}>₹{todayNetEarning}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-scrollable-tabs" style={{ background: '#2D2319', borderColor: '#43362A' }}>
          <button
            onClick={() => setCurrentTab('radar')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'radar' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'radar' ? '#FFFFFF' : '#D6C7B2',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Radio size={16} /> Radar & Requests {incomingRequests.length > 0 && <span style={{ background: '#FFFFFF', color: '#EA580C', padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 900 }}>{incomingRequests.length}</span>}
          </button>
          <button
            onClick={() => setCurrentTab('active')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'active' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'active' ? '#FFFFFF' : '#D6C7B2',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Bike size={16} /> Active Trip {activeRide && '●'}
          </button>
          <button
            onClick={() => setCurrentTab('earnings')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'earnings' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'earnings' ? '#FFFFFF' : '#D6C7B2',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <DollarSign size={16} /> Shift Earnings
          </button>
          <button
            onClick={() => setCurrentTab('kyc')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'kyc' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'kyc' ? '#FFFFFF' : '#D6C7B2',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <FileText size={16} /> KYC & Vehicle
          </button>
          <button
            onClick={() => setCurrentTab('profile')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'profile' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: currentTab === 'profile' ? '#FFFFFF' : '#D6C7B2',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <User size={16} /> Profile
          </button>
        </div>

        {/* User Info & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{user?.name || 'Driver'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="btn btn-secondary btn-sm"
            title="Sign Out"
            style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Driver Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Passenger Cancellation Alert Banner */}
        {tripCancelledNotice && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#F87171',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{tripCancelledNotice}</span>
            <button
              onClick={() => setTripCancelledNotice(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#F87171',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: RADAR & INCOMING RIDE REQUESTS */}
        {/* ============================================================ */}
        {currentTab === 'radar' && (
          <div className="portal-split-layout">
            {/* Left Radar Panel */}
            <div className="portal-content-pane">
              {/* KYC Status Notice Banner */}
              {kycStatus !== 'APPROVED' && (
                <div style={{
                  background: kycStatus === 'PENDING' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: kycStatus === 'PENDING' ? '1.5px solid rgba(245, 158, 11, 0.4)' : '1.5px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: kycStatus === 'PENDING' ? '#FCD34D' : '#FCA5A5'
                }}>
                  <ShieldAlert size={26} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>
                      {kycStatus === 'PENDING' ? '⏳ KYC Verification Pending Review' : '❌ KYC Verification Rejected'}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.95, marginTop: '2px', lineHeight: 1.4 }}>
                      {kycStatus === 'PENDING'
                        ? 'Your uploaded documents (Campus ID, Driving Licence, and RC) are under review by Campus Admin. You will be able to go online and accept rides once approved.'
                        : 'Your driver documents were not approved by the admin. Please check the Vehicle & KYC tab.'}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>Driver Dispatch Radar</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {isOnline ? '🟢 You are ONLINE and listening for nearby student requests.' : '🔴 You are OFFLINE. Toggle switch above to receive rides.'}
                </p>
              </div>

              {/* Sound Alert Status Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                background: soundEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${soundEnabled ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                padding: '12px 14px',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: soundEnabled ? '#34D399' : 'var(--text-muted)' }}>
                  {soundEnabled ? <Volume2 size={18} color="#34D399" /> : <VolumeX size={18} color="var(--text-muted)" />}
                  <span>{soundEnabled ? 'Ride Sound & Chime Alerts: ACTIVE' : 'Ride Sounds Muted'}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => alertManager.playOneShot()}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px', padding: '6px 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Volume2 size={14} /> Test Sound
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) {
                         alertManager.stopRingtone();
                      }
                      setSoundEnabled(!soundEnabled);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px', padding: '6px 14px', fontWeight: 700 }}
                  >
                    {soundEnabled ? 'Mute' : 'Unmute'}
                  </button>
                </div>
              </div>

              {/* Incoming Requests Queue (Multiple Bookings Supported & Persistent until declined) */}
              {!activeRide && incomingRequests.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={14} /> AVAILABLE REQUESTS ({incomingRequests.length})
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Select a ride to accept
                    </span>
                  </div>

                  {incomingRequests.map((req) => {
                    const split = calcDriverSplit(req.total_fare);
                    return (
                      <div
                        key={req.id}
                        style={{
                          background: '#FFFFFF',
                          border: '2px solid #F97316',
                          borderRadius: '16px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: '0 6px 20px rgba(249, 115, 22, 0.15)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '16px', color: '#271E16' }}>{req.customer_name || 'Passenger'}</div>
                            <div style={{ fontSize: '12px', color: '#796D61', marginTop: '2px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>{req.vehicle_type || 'BIKE'}</span>
                              {req.is_outside && <span style={{ background: '#E0E7FF', color: '#3730A3', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700 }}>OUTSIDE CAMPUS</span>}
                              {req.is_double_ride && <span style={{ background: '#FED7AA', color: '#9A3412', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Users size={11} /> Double Ride</span>}
                              {req.female_rider_only && <span style={{ background: '#FCE7F3', color: '#9D174D', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={11} /> Lady Driver Only</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '26px', fontWeight: 900, color: '#EA580C' }}>
                              ₹{req.total_fare}
                            </div>
                            <div style={{ fontSize: '12px', color: '#059669', fontWeight: 800 }}>
                              Your Net: ₹{split.rider}
                            </div>
                          </div>
                        </div>

                        <div style={{ background: '#F8F3EC', border: '1px solid #E8DCCB', padding: '12px', borderRadius: '10px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#271E16' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                            <div>
                              <span style={{ color: '#059669' }}>●</span> <strong>Pickup:</strong> {req.pickup_address}
                            </div>
                            <a
                              href={getMapLink(req.pickup_address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '6px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontSize: '11px', fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={11} /> Maps
                            </a>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                            <div>
                              <span style={{ color: '#EA580C' }}>●</span> <strong>Drop:</strong> {req.destination_address}
                            </div>
                            <a
                              href={getMapLink(req.destination_address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '6px', background: '#FFF7ED', border: '1px solid #FDBA74', color: '#EA580C', fontSize: '11px', fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={11} /> Maps
                            </a>
                          </div>

                          <div style={{ borderTop: '1px solid #E8DCCB', paddingTop: '6px', marginTop: '2px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#796D61' }}>
                            <span>Collect Cash: ₹{req.total_fare}</span>
                            <span>Platform: ₹{split.company}{split.controller > 0 ? ` + ₹${split.controller} Ctrl` : ''}</span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginTop: '4px' }}>
                          <button
                            onClick={() => handleDeclineRequest(req.id)}
                            className="btn btn-secondary"
                            style={{ padding: '10px', fontWeight: 700, background: '#F3ECE2', border: '1px solid #E8DCCB', color: '#796D61' }}
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            disabled={actionLoading}
                            style={{
                              padding: '10px',
                              fontWeight: 800,
                              fontSize: '14px',
                              background: 'linear-gradient(135deg, #F97316, #EA580C)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '10px',
                              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                              cursor: 'pointer'
                            }}
                          >
                            {actionLoading ? 'Accepting...' : 'Accept Ride Now'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* If Active Ride Exists */}
              {activeRide && (
                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', marginBottom: '6px' }}>
                    ACTIVE TRIP IN PROGRESS:
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '8px' }}>
                    {activeRide.pickup_address} → {activeRide.destination_address}
                  </div>
                  <button
                    onClick={() => setCurrentTab('active')}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%' }}
                  >
                    Open Active Trip Workflow
                  </button>
                </div>
              )}

              {!activeRide && incomingRequests.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                  <Bike size={44} color="var(--border)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {isOnline ? 'Radar Active & Scanning...' : 'Driver is Offline'}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    {isOnline ? 'New ride requests within Pondicherry University will appear here in real-time.' : 'Turn toggle online to receive rides.'}
                  </div>
                </div>
              )}
            </div>

            {/* Right Leaflet Map */}
            <div className="portal-map-pane" ref={mapRef} />
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: ACTIVE TRIP WORKFLOW */}
        {/* ============================================================ */}
        {currentTab === 'active' && (
          <div className="content-body" style={{ maxWidth: '650px', margin: '0 auto', width: '100%' }}>
            {!activeRide ? (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
                <Bike size={48} color="var(--border)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>No Active Trip</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '20px' }}>
                  You do not have an ongoing trip right now. Go to Radar to accept new ride requests.
                </p>
                <button onClick={() => setCurrentTab('radar')} className="btn btn-primary">
                  Go to Dispatch Radar
                </button>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{
                  background: 'var(--bg-sidebar)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>CASH TO COLLECT AT DROP:</div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--primary)' }}>
                      ₹{activeRide.total_fare}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#10B981' }}>
                      Net Pay: ₹{activeRide.rider_earning || calcDriverSplit(activeRide.total_fare).rider}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Platform Fee: ₹{activeRide.company_earning || calcDriverSplit(activeRide.total_fare).company}
                      {calcDriverSplit(activeRide.total_fare).controller > 0 && ` + ₹${calcDriverSplit(activeRide.total_fare).controller} Ctrl`}
                    </div>
                  </div>
                </div>

                {/* Passenger Info Card */}
                <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '16px' }}>{activeRide.customer_name || 'Passenger'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Passenger</div>
                  </div>
                  {activeRide.customer_phone && (
                    <a
                      href={`tel:${activeRide.customer_phone}`}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                    >
                      <Phone size={14} /> Call Passenger
                    </a>
                  )}
                </div>

                {/* Trip Route Details & Live Maps Navigation */}
                <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div>
                      <span style={{ color: '#10B981' }}>●</span> <strong>Pickup:</strong> {activeRide.pickup_address}
                    </div>
                    <a
                      href={getMapLink(activeRide.pickup_address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 800, textDecoration: 'none', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', flexShrink: 0 }}
                    >
                      <ExternalLink size={12} /> Navigate Pickup
                    </a>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div>
                      <span style={{ color: '#EA580C' }}>●</span> <strong>Drop:</strong> {activeRide.destination_address}
                    </div>
                    <a
                      href={getMapLink(activeRide.destination_address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 800, textDecoration: 'none', background: '#FFF7ED', border: '1px solid #FDBA74', color: '#EA580C', flexShrink: 0 }}
                    >
                      <ExternalLink size={12} /> Navigate Drop
                    </a>
                  </div>
                </div>

                {/* Error Banner */}
                {otpError && (
                  <div style={{ padding: '10px', background: 'rgba(244,63,94,0.15)', border: '1px solid #F43F5E', color: '#F43F5E', borderRadius: '8px', fontSize: '12px' }}>
                    {otpError}
                  </div>
                )}

                {/* Step-by-Step Action Progression */}
                {activeRide.status === 'ACCEPTED' && (
                  <button
                    onClick={() => handleStatusChange('RIDER_ARRIVING')}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '14px', fontWeight: 800, fontSize: '15px' }}
                  >
                    {actionLoading ? 'Updating...' : '1. I am On The Way (Arriving)'}
                  </button>
                )}

                {activeRide.status === 'RIDER_ARRIVING' && (
                  <button
                    onClick={() => handleStatusChange('RIDER_REACHED')}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '14px', fontWeight: 800, fontSize: '15px' }}
                  >
                    {actionLoading ? 'Updating...' : '2. Reached Pickup Location'}
                  </button>
                )}

                {activeRide.status === 'RIDER_REACHED' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Ask Passenger for 4-Digit Ride OTP:
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 1234"
                      className="form-input"
                      style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 900 }}
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                    />
                    <button
                      onClick={() => handleStatusChange('STARTED')}
                      disabled={actionLoading}
                      className="btn btn-success"
                      style={{ width: '100%', padding: '14px', fontWeight: 800, fontSize: '15px' }}
                    >
                      {actionLoading ? 'Verifying...' : '3. Verify OTP & Start Trip'}
                    </button>
                  </div>
                )}

                {activeRide.status === 'STARTED' && (
                  <button
                    onClick={() => handleStatusChange('COMPLETED')}
                    disabled={actionLoading}
                    className="btn btn-success"
                    style={{ width: '100%', padding: '14px', fontWeight: 800, fontSize: '15px' }}
                  >
                    {actionLoading ? 'Completing...' : '4. Reached Destination & Complete Trip'}
                  </button>
                )}

                {activeRide.status === 'COMPLETED' && (
                  <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(16,185,129,0.15)', border: '1px solid #10B981', borderRadius: '16px' }}>
                    <CheckCircle size={44} color="#10B981" style={{ margin: '0 auto 10px' }} />
                    <h3 style={{ color: '#10B981', fontWeight: 800, fontSize: '20px' }}>Trip Completed & Settled!</h3>
                    
                    <div style={{ margin: '16px 0', padding: '14px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>CASH TO COLLECT FROM PASSENGER:</div>
                      <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--primary)', margin: '4px 0' }}>
                        ₹{activeRide.final_fare || activeRide.total_fare || activeRide.estimated_fare || 20}
                      </div>
                      <div style={{ fontSize: '13px', color: '#10B981', fontWeight: 700, marginTop: '6px' }}>
                        Your Net Take-Home: ₹{activeRide.rider_earning || calcDriverSplit(activeRide.final_fare || activeRide.total_fare || 20).rider}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActiveRide(null);
                        setEnteredOtp('');
                        setCurrentTab('radar');
                      }}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px', fontWeight: 800 }}
                    >
                      Return to Radar for Next Trip
                    </button>
                  </div>
                )}

                {/* Cancel Trip Button (Before ride starts) */}
                {['ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED'].includes(activeRide.status) && (
                  <button
                    onClick={handleCancelActiveTrip}
                    disabled={actionLoading}
                    className="btn btn-danger btn-sm"
                    style={{ width: '100%', padding: '10px' }}
                  >
                    Cancel Trip (Driver Emergency)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: EARNINGS & LEDGER */}
        {/* ============================================================ */}
        {currentTab === 'earnings' && (
          <div className="content-body" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>Driver Earnings & Settlement Ledger</h2>

            {/* Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>TODAY'S NET EARNINGS</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--primary)' }}>₹{todayNetEarning}</div>
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>TOTAL TRIPS COMPLETED</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#10B981' }}>{todayTripsCount}</div>
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>PLATFORM COMMISSION</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#06B6D4' }}>₹{platformCommission}</div>
              </div>
            </div>

            {/* Completed Rides Table */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 800 }}>
                Trip Settlements & Receipts
              </div>
              {loadingEarnings ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading earnings ledger...</div>
              ) : riderRides.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No completed rides in this shift yet.</div>
              ) : (
                <div className="table-container" style={{ border: 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-sidebar)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 16px' }}>Ride ID</th>
                        <th style={{ padding: '12px 16px' }}>Route</th>
                        <th style={{ padding: '12px 16px' }}>Gross Fare</th>
                        <th style={{ padding: '12px 16px' }}>Your Net</th>
                        <th style={{ padding: '12px 16px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riderRides.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700 }}>#{r.id}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div>{r.pickup_address} → {r.destination_address}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {new Date(r.created_at || r.requested_at).toLocaleString()}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>₹{r.total_fare || r.final_fare || r.estimated_fare || 20}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--primary)' }}>
                            ₹{r.rider_earning || calcDriverSplit(r.total_fare || r.final_fare || r.estimated_fare || 20).rider}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className={`badge ${r.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                              {r.status || 'COMPLETED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: KYC & VEHICLE DETAILS */}
        {/* ============================================================ */}
        {currentTab === 'kyc' && (
          <div className="content-body" style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Vehicle & KYC Documents</h2>
                <span className={`badge ${kycStatus === 'APPROVED' ? 'badge-success' : kycStatus === 'PENDING' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '12px', fontWeight: 800, padding: '4px 10px' }}>
                  {kycStatus === 'APPROVED' ? '✓ APPROVED BY ADMIN' : kycStatus === 'PENDING' ? '⏳ PENDING ADMIN VERIFICATION' : '❌ REJECTED'}
                </span>
              </div>

              {/* Status Explanation Card */}
              {kycStatus !== 'APPROVED' ? (
                <div style={{
                  background: kycStatus === 'PENDING' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: kycStatus === 'PENDING' ? '1.5px solid rgba(245, 158, 11, 0.35)' : '1.5px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: kycStatus === 'PENDING' ? '#FCD34D' : '#FCA5A5'
                }}>
                  <ShieldAlert size={22} style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '13px', lineHeight: 1.4 }}>
                    <strong>{kycStatus === 'PENDING' ? 'Document Verification in Progress:' : 'Verification Rejected:'}</strong>{' '}
                    {kycStatus === 'PENDING'
                      ? 'Your Campus ID Card, Driving Licence, and Vehicle RC have been submitted and are currently waiting for approval from the Campus Administrator. You will be able to turn Online and accept rides once approved.'
                      : 'Your documents were rejected. Please review or update your credentials below.'}
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1.5px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#34D399',
                  fontSize: '13px'
                }}>
                  <ShieldCheck size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Verified Driver Account:</strong> All your documents have been verified and approved by Campus Admin. You can go online anytime to accept student rides.
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveKyc} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Vehicle Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setVehicleType('BIKE')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: vehicleType === 'BIKE' ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: vehicleType === 'BIKE' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-input)',
                        color: vehicleType === 'BIKE' ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 700,
                        fontSize: '13px'
                      }}
                    >
                      <Bike size={18} /> Bike (Motorcycle)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleType('SCOOTER')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: vehicleType === 'SCOOTER' ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: vehicleType === 'SCOOTER' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-input)',
                        color: vehicleType === 'SCOOTER' ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 700,
                        fontSize: '13px'
                      }}
                    >
                      <Zap size={18} /> Scooter / Scooty
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Vehicle Model</label>
                  <input
                    type="text"
                    className="form-input"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Vehicle Registration Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Driving License Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" disabled={savingKyc} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: 700 }}>
                  {savingKyc ? 'Updating Documents...' : 'Save & Submit KYC Details'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: PROFILE & SECURITY */}
        {/* ============================================================ */}
        {currentTab === 'profile' && (
          <div className="content-body" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Driver Profile & Security</h2>

              {profileMsg && (
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  background: profileMsg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                  color: profileMsg.type === 'success' ? '#10B981' : '#F43F5E',
                  fontSize: '13px'
                }}>
                  {profileMsg.text}
                </div>
              )}

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontWeight: 700 }}
                >
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>

              <hr style={{ borderColor: 'var(--border)', margin: '24px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '15px' }}>Account Password</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Update your secret driver password</p>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Lock size={14} /> Change Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="var(--primary)" /> Change Driver Password
            </h3>

            {passError && (
              <div style={{ padding: '10px', background: 'rgba(244,63,94,0.15)', border: '1px solid #F43F5E', color: '#F43F5E', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>
                {passError}
              </div>
            )}
            {passSuccess && (
              <div style={{ padding: '10px', background: 'rgba(16,185,129,0.15)', border: '1px solid #10B981', color: '#10B981', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>
                {passSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password (min 6 chars)</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passUpdating}
                  className="btn btn-primary"
                  style={{ flex: 1, fontWeight: 700 }}
                >
                  {passUpdating ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
