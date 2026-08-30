import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api';
import { alertManager } from '../utils/alertManager';
import {
  Globe,
  MapPin,
  CheckCircle,
  Clock,
  User,
  Phone,
  Send,
  RefreshCw,
  AlertCircle,
  Bike,
  DollarSign,
  ListFilter,
  History,
  Volume2,
  ExternalLink,
  Radio,
  XCircle
} from 'lucide-react';

export function OutsideTripsView() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  const [pendingRides, setPendingRides] = useState([]);
  const [allOutsideRides, setAllOutsideRides] = useState([]);
  const [activeRiders, setActiveRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const prevPendingCountRef = useRef(null);

  const getMapLink = (address, lat, lng) => {
    if (lat && lng) {
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }
    if (!address) return '#';
    if (address.startsWith('http://') || address.startsWith('https://')) {
      return address;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  // Form states per rideId: { [rideId]: { fare: '', riderId: '' } }
  const [formData, setFormData] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  const fetchData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);
      const [ridesRes, ridersRes] = await Promise.all([
        apiRequest('/admin/outside-rides'),
        apiRequest('/admin/active-riders')
      ]);

      const pending = ridesRes.data?.pending || (Array.isArray(ridesRes.data) ? ridesRes.data : []);
      const all = ridesRes.data?.all || [];

      // If new pending outside rides arrived, sound chime and trigger notification
      if (prevPendingCountRef.current !== null && pending.length > prevPendingCountRef.current) {
        const newest = pending[0];
        alertManager.triggerRideAlert({
          title: `New Outside Campus Request (${pending.length})`,
          body: `Route: ${newest?.pickup_address || 'Pickup'} → ${newest?.destination_address || 'Destination'}. Review & dispatch now.`,
          repeat: false
        });
      }
      prevPendingCountRef.current = pending.length;

      setPendingRides(pending);
      setAllOutsideRides(all);
      setActiveRiders(ridersRes.data || []);

      // Initialize form data for pending items
      const initialForm = {};
      pending.forEach(r => {
        initialForm[r.id] = {
          fare: '',
          riderId: ''
        };
      });
      setFormData(prev => ({ ...initialForm, ...prev }));
    } catch (err) {
      setError(err.message || 'Failed to fetch outside trips queue.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => fetchData(true), 3000);
    return () => clearInterval(interval);
  }, []);

  const handleFareChange = (rideId, val) => {
    setFormData(prev => ({
      ...prev,
      [rideId]: { ...prev[rideId], fare: val }
    }));
  };

  const handleRiderChange = (rideId, riderId) => {
    setFormData(prev => ({
      ...prev,
      [rideId]: { ...prev[rideId], riderId }
    }));
  };

  const handleDispatch = async (rideId) => {
    const data = formData[rideId] || {};
    const fare = parseFloat(data.fare);

    if (!fare || isNaN(fare) || fare <= 0) {
      setError('Please enter a valid positive fare amount in ₹ before dispatching.');
      return;
    }

    try {
      setSubmittingId(rideId);
      setError(null);
      await apiRequest(`/admin/outside-rides/${rideId}/dispatch`, 'POST', {
        fareAmount: fare,
        assignedRiderId: data.riderId ? parseInt(data.riderId, 10) : null
      });

      setSuccessMsg(`Outside ride #${rideId} quoted at ₹${fare} and dispatched successfully!`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to dispatch outside ride.');
    } finally {
      setSubmittingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_ADMIN_QUOTE':
        return <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Awaiting Quote</span>;
      case 'REQUESTED':
        return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Radio size={12} /> Dispatched</span>;
      case 'ACCEPTED':
      case 'RIDER_ARRIVING':
      case 'RIDER_REACHED':
        return <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Bike size={12} /> Rider Assigned</span>;
      case 'STARTED':
        return <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Send size={12} /> On Trip</span>;
      case 'COMPLETED':
        return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12} /> Completed</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Cancelled</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Banner */}
      <div className="panel" style={{
        background: 'linear-gradient(135deg, #131D31 0%, #0F172A 100%)',
        padding: '22px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#3b82f6',
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Globe size={22} />
              </div>
              <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0, color: '#fff' }}>
                Outside Trips Quoting &amp; Dispatch Command Center
              </h2>
              <span className={`badge ${pendingRides.length > 0 ? 'badge-danger' : 'badge-success'}`}>
                {pendingRides.length} Action Needed
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>
              Review passenger-typed outside pickup and destination locations, quote the custom fare (₹), and dispatch to drivers.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchData(false)}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ListFilter size={15} />
          <span>Pending Dispatch Queue ({pendingRides.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <History size={15} />
          <span>All Outside Trips Log ({allOutsideRides.length})</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px'
        }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: PENDING DISPATCH QUEUE */}
      {activeTab === 'pending' && (
        <>
          {pendingRides.length === 0 ? (
            <div className="panel" style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <CheckCircle size={44} style={{ color: '#10b981', marginBottom: '14px', opacity: 0.8 }} />
              <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '6px' }}>No Pending Outside Rides to Dispatch</h3>
              <p style={{ fontSize: '13px', maxWidth: '460px', margin: '0 auto 16px auto', lineHeight: 1.4 }}>
                When a passenger books a trip with custom outside typed locations, it will appear here instantly for you to set the custom fare &amp; assign a rider.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="btn btn-secondary btn-sm"
              >
                View All Outside Trips Log ({allOutsideRides.length})
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              {pendingRides.map((ride) => {
                const currentForm = formData[ride.id] || { fare: '', riderId: '' };
                const isSubmitting = submittingId === ride.id;

                return (
                  <div
                    key={ride.id}
                    className="panel"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: '12px',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          background: '#3b82f6',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          {ride.ride_code || `RIDE #${ride.id}`}
                        </span>
                        <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Globe size={11} /> Outside Campus Trip
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        <Clock size={13} />
                        <span>Requested: {new Date(ride.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '16px'
                    }}>
                      {/* Passenger Info */}
                      <div style={{
                        background: 'var(--bg-sidebar)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px'
                      }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                          PASSENGER DETAILS
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            flexShrink: 0
                          }}>
                            <User size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{ride.customer_name || 'Passenger'}</span>
                              <span style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: ride.customer_gender === 'FEMALE' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                color: ride.customer_gender === 'FEMALE' ? '#f472b6' : '#60a5fa',
                                fontWeight: 700
                              }}>
                                {ride.customer_gender === 'FEMALE' ? 'Female' : 'Male'}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Phone size={12} />
                              <span>{ride.customer_phone || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Route Details */}
                      <div style={{
                        background: 'var(--bg-sidebar)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px'
                      }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                          TYPED ROUTE DETAILS
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              <MapPin size={15} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                              <div>
                                <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>PICKUP LOCATION</div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{ride.pickup_address}</div>
                              </div>
                            </div>
                            <a
                              href={getMapLink(ride.pickup_address, ride.pickup_latitude, ride.pickup_longitude)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '11px', height: '26px' }}
                            >
                              <ExternalLink size={11} /> Maps
                            </a>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              <MapPin size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                              <div>
                                <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>DROP-OFF DESTINATION</div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{ride.destination_address}</div>
                              </div>
                            </div>
                            <a
                              href={getMapLink(ride.destination_address, ride.destination_latitude, ride.destination_longitude)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '11px', height: '26px' }}
                            >
                              <ExternalLink size={11} /> Maps
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Admin Action Bar (Quoting & Dispatch) */}
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: 1 }}>
                        {/* Fare Input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            SET CUSTOM FARE (₹) *
                          </label>
                          <div style={{ position: 'relative', width: '140px' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontWeight: 800 }}>
                              ₹
                            </span>
                            <input
                              type="number"
                              placeholder="e.g. 80"
                              value={currentForm.fare}
                              onChange={(e) => handleFareChange(ride.id, e.target.value)}
                              className="form-input"
                              style={{ paddingLeft: '26px', height: '40px', fontWeight: 700 }}
                            />
                          </div>
                        </div>

                        {/* Rider Selector */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '220px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            ASSIGN TO RIDER (OPTIONAL)
                          </label>
                          <select
                            value={currentForm.riderId}
                            onChange={(e) => handleRiderChange(ride.id, e.target.value)}
                            className="form-select"
                            style={{ height: '40px' }}
                          >
                            <option value="">Broadcast to All Available Online Riders</option>
                            {activeRiders.map((r) => (
                              <option key={r.user_id} value={r.user_id}>
                                {r.name} ({r.is_online ? 'Online' : 'Offline'}) - {r.vehicle_model} ({r.vehicle_number})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Dispatch Button */}
                      <button
                        type="button"
                        onClick={() => handleDispatch(ride.id)}
                        disabled={isSubmitting || !currentForm.fare}
                        className="btn btn-success"
                        style={{
                          height: '40px',
                          padding: '0 20px',
                          alignSelf: 'flex-end',
                          fontWeight: 700
                        }}
                      >
                        <Send size={15} />
                        <span>{isSubmitting ? 'Dispatching...' : 'Approve & Dispatch'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: ALL OUTSIDE TRIPS LOG */}
      {activeTab === 'history' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ride Code</th>
                  <th>Passenger</th>
                  <th>Pickup Location</th>
                  <th>Drop-Off Destination</th>
                  <th>Status</th>
                  <th>Fare (₹)</th>
                  <th>Driver Assigned</th>
                  <th>Requested At</th>
                </tr>
              </thead>
              <tbody>
                {allOutsideRides.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No outside trips recorded yet.
                    </td>
                  </tr>
                ) : (
                  allOutsideRides.map(ride => (
                    <tr key={ride.id}>
                      <td>
                        <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>
                          {ride.ride_code || `#${ride.id}`}
                        </strong>
                      </td>
                      <td>
                        <div>
                          <strong style={{ color: '#fff' }}>{ride.customer_name || 'Passenger'}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ride.customer_phone || 'N/A'}</div>
                        </div>
                      </td>
                      <td style={{ maxWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }} title={ride.pickup_address}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', flexShrink: 0 }}></span>
                            <span>{ride.pickup_address}</span>
                          </span>
                          {ride.pickup_latitude && (
                            <a
                              href={`https://www.google.com/maps?q=${ride.pickup_latitude},${ride.pickup_longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '10px', color: '#38bdf8', textDecoration: 'none', background: 'rgba(56,189,248,0.1)', padding: '2px 5px', borderRadius: '4px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                            >
                              <ExternalLink size={10} /> Maps
                            </a>
                          )}
                        </div>
                      </td>
                      <td style={{ maxWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }} title={ride.destination_address}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }}></span>
                            <span>{ride.destination_address}</span>
                          </span>
                          {ride.destination_latitude && (
                            <a
                              href={`https://www.google.com/maps?q=${ride.destination_latitude},${ride.destination_longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '10px', color: '#f87171', textDecoration: 'none', background: 'rgba(239,68,68,0.1)', padding: '2px 5px', borderRadius: '4px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                            >
                              <ExternalLink size={10} /> Maps
                            </a>
                          )}
                        </div>
                      </td>
                      <td>
                        {getStatusBadge(ride.status)}
                      </td>
                      <td>
                        <strong style={{ color: '#10b981' }}>
                          ₹{ride.final_fare || ride.estimated_fare || '0.00'}
                        </strong>
                      </td>
                      <td>
                        {ride.rider_name ? (
                          <div>
                            <div style={{ fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Bike size={13} />
                              <span>{ride.rider_name}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ride.vehicle_number || ''}</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            {ride.assigned_rider_id ? `Assigned (ID: ${ride.assigned_rider_id})` : 'Broadcast / Unassigned'}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(ride.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default OutsideTripsView;
