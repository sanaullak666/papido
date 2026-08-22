import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useSocket } from '../context/SocketContext';
import {
  Bike,
  Car,
  Navigation,
  MapPin,
  CheckCircle,
  Star,
  Power,
  DollarSign,
  AlertCircle,
  Phone,
  ShieldCheck,
  Send,
  Smartphone,
  Globe
} from 'lucide-react';

export function SimulatorView() {
  const { socket } = useSocket();

  // Customer Mobile State
  const [customerToken, setCustomerToken] = useState(null);
  const [customerUser, setCustomerUser] = useState(null);
  const [pickupPlace, setPickupPlace] = useState('University Main Gate');
  const [destPlace, setDestPlace] = useState('Central Library & Admin Block');
  const [isSimulateOutside, setIsSimulateOutside] = useState(false);
  const [vehicleType, setVehicleType] = useState('BIKE');
  const [fareEstimate, setFareEstimate] = useState(null);
  const [customerRide, setCustomerRide] = useState(null);
  const [customerRating, setCustomerRating] = useState(5);
  const [customerReview, setCustomerReview] = useState('');
  const [customerRated, setCustomerRated] = useState(false);

  // Rider Mobile State
  const [riderToken, setRiderToken] = useState(null);
  const [riderUser, setRiderUser] = useState(null);
  const [riderProfile, setRiderProfile] = useState(null);
  const [isRiderOnline, setIsRiderOnline] = useState(true);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [riderActiveRide, setRiderActiveRide] = useState(null);
  const [riderEarnings, setRiderEarnings] = useState({ today: { earnings: 0, rides: 0 } });
  const [declinedRideIds, setDeclinedRideIds] = useState(new Set());
  const [otpInput, setOtpInput] = useState('');
  const [riderActionLoading, setRiderActionLoading] = useState(false);

  // 1. Authenticate simulated sessions
  useEffect(() => {
    async function initSimulators() {
      try {
        // Customer login (Ananya)
        const custRes = await apiRequest('/auth/login', 'POST', {
          email: 'customer.ananya@papido.com',
          password: 'Password@123',
          expectedRole: 'CUSTOMER'
        });
        setCustomerToken(custRes.data.accessToken);
        setCustomerUser(custRes.data.user);

        // Rider login (Rahul)
        const riderRes = await apiRequest('/auth/login', 'POST', {
          email: 'rider.rahul@papido.com',
          password: 'Password@123',
          expectedRole: 'RIDER'
        });
        setRiderToken(riderRes.data.accessToken);
        setRiderUser(riderRes.data.user);
        setRiderProfile(riderRes.data.profile);
        setIsRiderOnline(riderRes.data.profile.is_online);

        // Load rider earnings
        const earningsRes = await apiRequest('/rider/earnings', 'GET', null, riderRes.data.accessToken);
        setRiderEarnings(earningsRes.data.summary);
      } catch (err) {
        console.error('Simulator initialization error', err);
      }
    }
    initSimulators();
  }, []);

  // 2. Estimate fare when places change
  useEffect(() => {
    async function getEstimate() {
      try {
        const res = await apiRequest('/fares/estimate', 'POST', {
          pickupLatitude: 12.971598,
          pickupLongitude: 77.594566,
          destinationLatitude: 12.974500,
          destinationLongitude: 77.598000,
          vehicleType
        });
        setFareEstimate(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    getEstimate();
  }, [vehicleType]);

  // 3. Socket listeners for real-time ride flow
  useEffect(() => {
    if (!socket) return;

    const handleNewRequest = (data) => {
      console.log('[Simulator Socket] Incoming ride request:', data);
      const reqId = Number(data.rideId || data.id);
      if (isRiderOnline && !riderActiveRide && !declinedRideIds.has(reqId)) {
        setIncomingRequest(data);
      }
    };

    const handleStatusChange = (data) => {
      console.log('[Simulator Socket] Status change:', data);
      const ride = data.ride;
      const status = data.status || (ride && ride.status);
      if (status === 'REOPENED' || status === 'REQUESTED') {
        if (customerRide && (customerRide.id === data.rideId || (ride && customerRide.id === ride.id))) {
          setCustomerRide(ride || { ...customerRide, status: 'REQUESTED', rider_id: null, accepted_at: null });
        }
        if (riderActiveRide && (riderActiveRide.id === data.rideId || (ride && riderActiveRide.id === ride.id))) {
          setRiderActiveRide(null);
        }
      } else {
        if (customerRide && customerRide.id === data.rideId) {
          setCustomerRide(ride);
        }
        if (riderActiveRide && riderActiveRide.id === data.rideId) {
          setRiderActiveRide(ride);
        }
      }
    };

    socket.on('ride:new_request', handleNewRequest);
    socket.on('ride:status_change', handleStatusChange);
    socket.on('ride:reopened', handleStatusChange);

    return () => {
      socket.off('ride:new_request', handleNewRequest);
      socket.off('ride:status_change', handleStatusChange);
      socket.off('ride:reopened', handleStatusChange);
    };
  }, [socket, isRiderOnline, riderActiveRide, customerRide, declinedRideIds]);

  const handleRequestRide = async () => {
    if (!customerToken) return;
    try {
      setCustomerRated(false);
      const res = await apiRequest('/customer/rides', 'POST', {
        vehicleType,
        pickupAddress: isSimulateOutside ? `${pickupPlace} (Outside Campus)` : pickupPlace,
        pickupLatitude: 12.971598,
        pickupLongitude: 77.594566,
        destinationAddress: isSimulateOutside ? `${destPlace} (Outside City)` : destPlace,
        destinationLatitude: 12.974500,
        destinationLongitude: 77.598000,
        paymentMethod: 'CASH',
        isOutside: isSimulateOutside
      }, customerToken);
      setCustomerRide(res.data);
    } catch (err) {
      alert(`Booking Error: ${err.message}`);
    }
  };

  const handleCancelCustomerRide = async () => {
    if (!customerRide || !customerToken) return;
    try {
      const res = await apiRequest(`/customer/rides/${customerRide.id}/cancel`, 'POST', {
        reason: 'Customer changed plans'
      }, customerToken);
      setCustomerRide(null);
    } catch (err) {
      alert(`Cancel Error: ${err.message}`);
    }
  };

  const handleSubmitRating = async () => {
    if (!customerRide || !customerToken) return;
    try {
      await apiRequest(`/customer/rides/${customerRide.id}/rating`, 'POST', {
        rating: customerRating,
        review: customerReview
      }, customerToken);
      setCustomerRated(true);
      setTimeout(() => {
        setCustomerRide(null);
      }, 2000);
    } catch (err) {
      alert(`Rating Error: ${err.message}`);
    }
  };

  // Rider actions
  const handleToggleRiderOnline = async () => {
    if (!riderToken) return;
    const newStatus = !isRiderOnline;
    try {
      await apiRequest('/rider/status', 'PATCH', { isOnline: newStatus }, riderToken);
      setIsRiderOnline(newStatus);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAcceptRide = async () => {
    if (!incomingRequest || !riderToken) return;
    try {
      setRiderActionLoading(true);
      const res = await apiRequest(`/rider/rides/${incomingRequest.rideId}/accept`, 'POST', {}, riderToken);
      setRiderActiveRide(res.data);
      setCustomerRide(res.data);
      setIncomingRequest(null);
    } catch (err) {
      alert(`Accept Error: ${err.message}`);
    } finally {
      setRiderActionLoading(false);
    }
  };

  const handleRejectRide = async () => {
    if (!incomingRequest || !riderToken) {
      setIncomingRequest(null);
      return;
    }
    const rideId = incomingRequest.rideId || incomingRequest.id;
    setDeclinedRideIds(prev => new Set(prev).add(Number(rideId)));
    setIncomingRequest(null);
    try {
      await apiRequest(`/rider/rides/${rideId}/decline`, 'POST', {}, riderToken);
    } catch (_) {}
  };

  const handleRiderArriving = async () => {
    if (!riderActiveRide || !riderToken) return;
    try {
      setRiderActionLoading(true);
      const res = await apiRequest(`/rider/rides/${riderActiveRide.id}/arriving`, 'POST', {}, riderToken);
      setRiderActiveRide(res.data);
      setCustomerRide(res.data);
    } catch (err) {
      alert(err.message);
    } finally {
      setRiderActionLoading(false);
    }
  };

  const handleRiderReached = async () => {
    if (!riderActiveRide || !riderToken) return;
    try {
      setRiderActionLoading(true);
      const res = await apiRequest(`/rider/rides/${riderActiveRide.id}/reached`, 'POST', {}, riderToken);
      setRiderActiveRide(res.data);
      setCustomerRide(res.data);
    } catch (err) {
      alert(err.message);
    } finally {
      setRiderActionLoading(false);
    }
  };

  const handleRiderStartRide = async () => {
    if (!riderActiveRide || !riderToken) return;
    if (!otpInput) {
      return alert('Please enter the 4-digit OTP provided by the passenger.');
    }
    try {
      setRiderActionLoading(true);
      const res = await apiRequest(`/rider/rides/${riderActiveRide.id}/start`, 'POST', { otp: otpInput }, riderToken);
      setRiderActiveRide(res.data);
      setCustomerRide(res.data);
      setOtpInput('');
    } catch (err) {
      alert(`OTP Verification Error: ${err.message}`);
    } finally {
      setRiderActionLoading(false);
    }
  };

  const handleRiderCompleteRide = async () => {
    if (!riderActiveRide || !riderToken) return;
    try {
      setRiderActionLoading(true);
      const res = await apiRequest(`/rider/rides/${riderActiveRide.id}/complete`, 'POST', {}, riderToken);
      setRiderActiveRide(res.data.ride);
      setCustomerRide(res.data.ride);

      // Refresh earnings
      const earningsRes = await apiRequest('/rider/earnings', 'GET', null, riderToken);
      setRiderEarnings(earningsRes.data.summary);

      setTimeout(() => {
        setRiderActiveRide(null);
      }, 3000);
    } catch (err) {
      alert(`Complete Error: ${err.message}`);
    } finally {
      setRiderActionLoading(false);
    }
  };

  const handleCancelRiderRide = async () => {
    if (!riderActiveRide || !riderToken) return;
    const rideId = riderActiveRide.id;
    setDeclinedRideIds(prev => new Set(prev).add(Number(rideId)));
    try {
      setRiderActionLoading(true);
      await apiRequest(`/rider/rides/${rideId}/cancel`, 'POST', { reason: 'Driver had emergency' }, riderToken);
      setRiderActiveRide(null);
    } catch (err) {
      alert(`Cancel Error: ${err.message}`);
    } finally {
      setRiderActionLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '18px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '14px 18px', borderRadius: '8px' }}>
        <h3 style={{ color: 'var(--primary)', fontSize: '15px', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Smartphone size={16} /> Real-Time Interactive Multi-App Test Simulator
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Test the live ride lifecycle between <strong>Customer Mobile App (Passenger)</strong> and <strong>Rider Mobile App (Driver)</strong>. 
          Everything runs over real live WebSockets connected to the Papido backend!
        </p>
      </div>

      <div className="simulator-container">
        {/* ========================================================================= */}
        {/* 1. CUSTOMER MOBILE APP SIMULATOR */}
        {/* ========================================================================= */}
        <div className="phone-frame">
          <div className="phone-notch">
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#334155' }} />
            <div style={{ width: '40px', height: '4px', borderRadius: '4px', background: '#334155' }} />
          </div>

          <div className="phone-content">
            {/* Mobile Header */}
            <div style={{ padding: '16px', background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>PAPIDO</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Passenger App</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10B981' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                <span>Online</span>
              </div>
            </div>

            {/* Content Body */}
            <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
              {!customerRide ? (
                /* Booking Mode */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>PICKUP POINT</label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#10B981' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '32px', width: '100%', fontSize: '13px' }}
                        value={pickupPlace}
                        onChange={(e) => setPickupPlace(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>DROP-OFF DESTINATION</label>
                    <div style={{ position: 'relative' }}>
                      <Navigation size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#EF4444' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '32px', width: '100%', fontSize: '13px' }}
                        value={destPlace}
                        onChange={(e) => setDestPlace(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Vehicle Type Selection */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>SELECT RIDE TYPE</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {['BIKE', 'AUTO', 'CAB_MINI', 'CAB_SEDAN'].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVehicleType(v)}
                          style={{
                            padding: '8px 4px',
                            background: vehicleType === v ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-sidebar)',
                            border: `1px solid ${vehicleType === v ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: '8px',
                            color: vehicleType === v ? 'var(--primary)' : 'var(--text-secondary)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {v === 'BIKE' ? <Bike size={16} /> : <Car size={16} />}
                          <span>{v.replace('CAB_', '')}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Outside Trip Toggle */}
                  <div style={{
                    background: isSimulateOutside ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-sidebar)',
                    border: `1px solid ${isSimulateOutside ? '#3b82f6' : 'var(--border)'}`,
                    padding: '10px 14px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: isSimulateOutside ? '#60a5fa' : '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Globe size={13} /> Outside Campus Ride
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Route to Admin Quoting & Dispatch
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSimulateOutside}
                      onChange={(e) => setIsSimulateOutside(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#3b82f6', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Fare Preview */}
                  {isSimulateOutside ? (
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>OUTSIDE RIDE FARE</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#60a5fa' }}>
                          Admin Quoted
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <div>Manual Dispatch</div>
                        <div style={{ color: '#60a5fa', fontWeight: 600 }}>Quoted by Admin</div>
                      </div>
                    </div>
                  ) : fareEstimate ? (
                    <div style={{ background: 'var(--bg-sidebar)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ESTIMATED FARE</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                          ₹{fareEstimate.estimatedFare}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <div>{fareEstimate.distanceKm} km &bull; {fareEstimate.durationMinutes} mins</div>
                        <div style={{ color: '#10B981', fontWeight: 600 }}>Cash / UPI</div>
                      </div>
                    </div>
                  ) : null}

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700 }}
                    onClick={handleRequestRide}
                  >
                    {isSimulateOutside ? 'Request Outside Ride (Admin Quote) →' : 'Book Papido Ride →'}
                  </button>
                </div>
              ) : (
                /* Active Ride View */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ background: 'var(--bg-sidebar)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <span className={`badge ${customerRide.status === 'COMPLETED' ? 'badge-success' : customerRide.status === 'PENDING_ADMIN_QUOTE' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '12px', marginBottom: '8px' }}>
                      {customerRide.status === 'PENDING_ADMIN_QUOTE' ? 'AWAITING ADMIN QUOTE' : customerRide.status}
                    </span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
                      {customerRide.ride_code}
                    </div>

                    {customerRide.status === 'PENDING_ADMIN_QUOTE' && (
                      <div style={{ marginTop: '10px', textAlign: 'left', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', marginBottom: '4px' }}>
                          Awaiting Dispatch Review
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Admin is reviewing your outside route in the <strong>Outside Trips Dispatch</strong> tab to set the custom fare & assign a rider.
                        </div>
                        <button className="btn btn-danger btn-sm" style={{ marginTop: '12px', width: '100%' }} onClick={handleCancelCustomerRide}>
                          Cancel Request
                        </button>
                      </div>
                    )}

                    {customerRide.status === 'REQUESTED' && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Searching nearby drivers...</div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                          <div style={{ width: '20px', height: '20px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        </div>
                        <button className="btn btn-danger btn-sm" style={{ marginTop: '14px' }} onClick={handleCancelCustomerRide}>
                          Cancel Ride
                        </button>
                      </div>
                    )}

                    {['ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED', 'STARTED'].includes(customerRide.status) && (
                      <div style={{ marginTop: '12px', textAlign: 'left', background: 'var(--bg-card)', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>YOUR DRIVER (RIDER)</div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{customerRide.rider_name || 'Rahul Sharma'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--primary)' }}>
                          {customerRide.vehicle_model || 'Honda Activa 6G'} ({customerRide.vehicle_number || 'KA-01-EQ-1024'})
                        </div>

                        <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>Start OTP:</span>
                          <strong style={{ fontSize: '16px', color: '#38BDF8', letterSpacing: '2px' }}>{customerRide.otp}</strong>
                        </div>
                      </div>
                    )}

                    {customerRide.status === 'COMPLETED' && (
                      <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <div style={{ color: '#10B981', fontWeight: 700, fontSize: '15px' }}>Ride Completed!</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>
                          Total Fare: ₹{customerRide.final_fare || customerRide.estimated_fare}
                        </div>

                        {!customerRated ? (
                          <div style={{ marginTop: '12px', background: 'var(--bg-card)', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', marginBottom: '6px' }}>Rate your experience</div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                              {[1, 2, 3, 4, 5].map((num) => (
                                <Star
                                  key={num}
                                  size={20}
                                  fill={num <= customerRating ? '#FBBF24' : 'none'}
                                  color="#FBBF24"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => setCustomerRating(num)}
                                />
                              ))}
                            </div>
                            <input
                              type="text"
                              placeholder="Leave a review..."
                              className="form-input"
                              style={{ width: '100%', padding: '6px', fontSize: '12px', marginBottom: '8px' }}
                              value={customerReview}
                              onChange={(e) => setCustomerReview(e.target.value)}
                            />
                            <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={handleSubmitRating}>
                              Submit Review
                            </button>
                          </div>
                        ) : (
                          <div style={{ color: '#10B981', fontSize: '12px', marginTop: '10px' }}>
                            Thank you for your rating!
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. RIDER (DRIVER) MOBILE APP SIMULATOR */}
        {/* ========================================================================= */}
        <div className="phone-frame">
          <div className="phone-notch">
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#334155' }} />
            <div style={{ width: '40px', height: '4px', borderRadius: '4px', background: '#334155' }} />
          </div>

          <div className="phone-content">
            {/* Rider Header */}
            <div style={{ padding: '16px', background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>PAPIDO DRIVER</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Rider Partner App</div>
              </div>

              {/* Online/Offline Toggle */}
              <button
                onClick={handleToggleRiderOnline}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  border: 'none',
                  background: isRiderOnline ? '#10B981' : '#64748B',
                  color: '#FFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Power size={12} />
                {isRiderOnline ? 'ONLINE' : 'OFFLINE'}
              </button>
            </div>

            {/* Rider Body */}
            <div style={{ padding: '16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Rider Dashboard Earnings Widget */}
              <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TODAY'S EARNINGS</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#10B981' }}>
                  ₹{(riderEarnings?.today?.earnings || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {riderEarnings?.today?.rides || 0} completed rides today
                </div>
              </div>

              {/* Incoming Request Alert Modal */}
              {incomingRequest && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '2px solid var(--primary)',
                  borderRadius: '12px',
                  padding: '16px',
                  animation: 'pulse 1.5s infinite'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge badge-warning">NEW RIDE REQUEST!</span>
                    <strong style={{ fontSize: '18px', color: 'var(--primary)' }}>₹{incomingRequest.estimatedFare}</strong>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>{incomingRequest.vehicleType}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>{incomingRequest.estimatedDistance} km &bull; {incomingRequest.estimatedDuration} mins</div>

                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', flexShrink: 0 }}></span>
                      <span><strong>Pickup:</strong> {incomingRequest.pickupAddress}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }}></span>
                      <span><strong>Drop:</strong> {incomingRequest.destinationAddress}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button className="btn btn-success" onClick={handleAcceptRide} disabled={riderActionLoading}>
                      Accept Ride
                    </button>
                    <button className="btn btn-secondary" onClick={handleRejectRide}>
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Rider Active Ride Execution Flow */}
              {riderActiveRide && (
                <div style={{ background: 'var(--bg-sidebar)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge badge-info">{riderActiveRide.status}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>₹{riderActiveRide.estimated_fare}</span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 700 }}>Passenger: {riderActiveRide.customer_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>Route: {riderActiveRide.pickup_address} &rarr; {riderActiveRide.destination_address}</div>

                  {/* Rider Step Actions */}
                  {riderActiveRide.status === 'ACCEPTED' && (
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleRiderArriving} disabled={riderActionLoading}>
                      1. Start Heading to Pickup (Arriving)
                    </button>
                  )}

                  {riderActiveRide.status === 'RIDER_ARRIVING' && (
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleRiderReached} disabled={riderActionLoading}>
                      2. I Have Reached Pickup Location
                    </button>
                  )}

                  {riderActiveRide.status === 'RIDER_REACHED' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Enter Customer 4-Digit OTP"
                        className="form-input"
                        style={{ textAlign: 'center', fontSize: '16px', letterSpacing: '4px', fontWeight: 800 }}
                        value={otpInput}
                        maxLength={4}
                        onChange={(e) => setOtpInput(e.target.value)}
                      />
                      <button className="btn btn-success" style={{ width: '100%' }} onClick={handleRiderStartRide} disabled={riderActionLoading}>
                        3. Verify OTP & Start Trip
                      </button>
                    </div>
                  )}

                  {riderActiveRide.status === 'STARTED' && (
                    <button className="btn btn-success" style={{ width: '100%' }} onClick={handleRiderCompleteRide} disabled={riderActionLoading}>
                      4. Reached Destination & Complete Trip
                    </button>
                  )}

                  {['ACCEPTED', 'RIDER_ARRIVING', 'RIDER_REACHED'].includes(riderActiveRide.status) && (
                    <button 
                      className="btn btn-danger btn-sm" 
                      style={{ width: '100%', marginTop: '8px' }} 
                      onClick={handleCancelRiderRide} 
                      disabled={riderActionLoading}
                    >
                      Cancel Ride (Driver)
                    </button>
                  )}

                  {riderActiveRide.status === 'COMPLETED' && (
                    <div style={{ textAlign: 'center', color: '#10B981', fontWeight: 700, padding: '10px' }}>
                      Trip settled! Payment recorded.
                    </div>
                  )}
                </div>
              )}

              {!incomingRequest && !riderActiveRide && (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                  <Bike size={36} color="var(--border)" style={{ margin: '0 auto 10px' }} />
                  <div>{isRiderOnline ? 'You are ONLINE and ready for ride requests!' : 'You are OFFLINE. Toggle switch to receive rides.'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
