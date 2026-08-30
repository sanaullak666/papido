import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useSocket } from '../context/SocketContext';
import {
  Users,
  Bike,
  Navigation,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  Clock,
  Zap,
  Send,
  Radio,
  Sparkles,
  Award
} from 'lucide-react';

export function DashboardView() {
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Flash Free Ride State
  const [flashRide, setFlashRide] = useState(null);
  const [flashPickup, setFlashPickup] = useState('');
  const [flashDest, setFlashDest] = useState('');
  const [flashDuration, setFlashDuration] = useState('15');
  const [flashLoading, setFlashLoading] = useState(false);
  const [flashMsg, setFlashMsg] = useState(null);

  const loadActiveFlashRide = async () => {
    try {
      const res = await apiRequest('/admin/flash-free-ride/active');
      setFlashRide(res.data || null);
    } catch (_) {}
  };

  const handleBroadcastFlash = async (e) => {
    e.preventDefault();
    if (!flashPickup.trim() || !flashDest.trim()) {
      setFlashMsg({ type: 'error', text: 'Please enter both Pickup and Destination locations.' });
      return;
    }
    try {
      setFlashLoading(true);
      setFlashMsg(null);
      const res = await apiRequest('/admin/flash-free-ride', 'POST', {
        pickup: flashPickup.trim(),
        destination: flashDest.trim(),
        durationMinutes: parseInt(flashDuration, 10) || 15
      });
      setFlashRide(res.data);
      setFlashPickup('');
      setFlashDest('');
      setFlashMsg({ type: 'success', text: '⚡ Flash Free Ride is now LIVE on all passenger screens!' });
    } catch (err) {
      setFlashMsg({ type: 'error', text: err.message || 'Failed to broadcast flash free ride.' });
    } finally {
      setFlashLoading(false);
    }
  };

  const handleCancelFlash = async () => {
    try {
      setFlashLoading(true);
      await apiRequest('/admin/flash-free-ride/cancel', 'POST', { id: flashRide?.id });
      setFlashRide(null);
      setFlashMsg({ type: 'info', text: 'Flash free ride cancelled.' });
    } catch (err) {
      setFlashMsg({ type: 'error', text: err.message });
    } finally {
      setFlashLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/admin/dashboard');
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadActiveFlashRide();
    const interval = setInterval(() => {
      loadDashboardData();
      loadActiveFlashRide();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Listen to live socket events to update dashboard in real time
  useEffect(() => {
    if (!socket) return;

    const handleRideUpdate = () => {
      loadDashboardData();
      loadActiveFlashRide();
    };

    socket.on('admin:ride_requested', handleRideUpdate);
    socket.on('admin:ride_status_change', handleRideUpdate);
    socket.on('admin:rider_status_changed', handleRideUpdate);
    socket.on('flash_free_ride:new', (data) => setFlashRide(data));
    socket.on('flash_free_ride:claimed', () => loadActiveFlashRide());
    socket.on('flash_free_ride:cancelled', () => setFlashRide(null));

    return () => {
      socket.off('admin:ride_requested', handleRideUpdate);
      socket.off('admin:ride_status_change', handleRideUpdate);
      socket.off('admin:rider_status_changed', handleRideUpdate);
      socket.off('flash_free_ride:new');
      socket.off('flash_free_ride:claimed');
      socket.off('flash_free_ride:cancelled');
    };
  }, [socket]);

  if (loading && !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading real-time overview metrics...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', background: 'rgba(244, 63, 94, 0.1)', color: '#FB7185', borderRadius: '8px' }}>
        Failed to load dashboard: {error}
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const recentRides = data?.recentRides || [];

  return (
    <div>
      {/* KPI Cards Grid */}
      <div className="card-grid">
        {/* Total Customers */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Total Customers</span>
            <div className="stat-card-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4' }}>
              <Users size={22} />
            </div>
          </div>
          <div className="stat-value">{metrics.totalCustomers ?? 0}</div>
          <div className="stat-desc">Registered passengers on campus</div>
        </div>

        {/* Total Riders */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Total Riders</span>
            <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
              <Bike size={22} />
            </div>
          </div>
          <div className="stat-value">{metrics.totalRiders ?? 0}</div>
          <div className="stat-desc">
            <strong style={{ color: '#10B981' }}>{metrics.activeRiders ?? 0}</strong> active online drivers
          </div>
        </div>

        {/* Today's Rides */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Total Rides</span>
            <div className="stat-card-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366F1' }}>
              <Navigation size={22} />
            </div>
          </div>
          <div className="stat-value">{metrics.totalRides ?? 0}</div>
          <div className="stat-desc">
            <span style={{ color: '#10B981' }}>{metrics.completedRides ?? 0} Completed</span> &bull;{' '}
            <span style={{ color: '#F43F5E' }}>{metrics.cancelledRides ?? 0} Cancelled</span>
          </div>
        </div>

        {/* Today's Company Revenue */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Company Revenue</span>
            <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
              <DollarSign size={22} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#10B981' }}>
            ₹{(metrics.totalCompanyRevenue || 0).toFixed(2)}
          </div>
          <div className="stat-desc">
  Today: ₹{(metrics.todayCompanyRevenue || 0).toFixed(2)} (Rider Payouts: ₹{(metrics.totalRiderPayouts || 0).toFixed(2)})
          </div>
        </div>
      </div>

      {/* Flash Free Ride Drop Manager */}
      <div className="panel" style={{ border: flashRide?.status === 'OPEN' ? '2px solid #F59E0B' : '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.04), var(--bg-card))' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} style={{ color: '#F59E0B' }} />
              <h2 className="panel-title" style={{ margin: 0 }}>Flash Free Ride Drop (First-Come, First-Served)</h2>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Broadcast an instant live ₹0 free ride on a specific campus route. First student to tap gets the ride, dispatched exclusively to Core Members.
            </div>
          </div>
          {flashRide?.status === 'OPEN' && (
            <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', fontWeight: 800 }}>
              <Radio size={14} className="pulse" /> LIVE BROADCAST ACTIVE
            </span>
          )}
        </div>

        {flashMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            fontWeight: 700,
            background: flashMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : flashMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            color: flashMsg.type === 'error' ? '#F87171' : flashMsg.type === 'success' ? '#34D399' : '#60A5FA',
            border: `1px solid ${flashMsg.type === 'error' ? '#EF4444' : flashMsg.type === 'success' ? '#10B981' : '#3B82F6'}`
          }}>
            {flashMsg.text}
          </div>
        )}

        {flashRide?.status === 'OPEN' ? (
          <div style={{ background: 'var(--bg-sidebar)', padding: '20px', borderRadius: '12px', border: '1px solid #F59E0B' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Currently Broadcasting to All Passengers
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
                  {flashRide.pickup_location || flashRide.pickup} &rarr; {flashRide.destination_location || flashRide.destination}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Expires at: {new Date(flashRide.expires_at || flashRide.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; Eligible Riders: <strong>Core Members Only</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelFlash}
                disabled={flashLoading}
                className="btn btn-danger"
                style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700 }}
              >
                {flashLoading ? 'Cancelling...' : 'Cancel Flash Drop'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {flashRide?.status === 'CLAIMED' && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', color: '#34D399' }}>
                <strong>Recent Winner:</strong> {flashRide.winner_name || 'Student'} ({flashRide.winner_phone || 'N/A'}) claimed {flashRide.pickup_location} &rarr; {flashRide.destination_location} (Trip: {flashRide.ride_code || 'Assigned'}).
              </div>
            )}

            <form onSubmit={handleBroadcastFlash} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#D6C7B2', marginBottom: '6px', display: 'block' }}>
                    Pickup Source (Where to start) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GATE 1 / CENTRAL LIBRARY / SJC"
                    value={flashPickup}
                    onChange={(e) => setFlashPickup(e.target.value.toUpperCase())}
                    className="form-input"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      textTransform: 'uppercase',
                      height: '44px',
                      background: 'var(--bg-input, #1E293B)',
                      border: '1.5px solid var(--border, #23314E)',
                      color: '#FFF',
                      borderRadius: '8px',
                      padding: '0 14px',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#D6C7B2', marginBottom: '6px', display: 'block' }}>
                    Destination Drop (Where to go) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MADAME CURIE HOSTEL / SOM BLOCK"
                    value={flashDest}
                    onChange={(e) => setFlashDest(e.target.value.toUpperCase())}
                    className="form-input"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      textTransform: 'uppercase',
                      height: '44px',
                      background: 'var(--bg-input, #1E293B)',
                      border: '1.5px solid var(--border, #23314E)',
                      color: '#FFF',
                      borderRadius: '8px',
                      padding: '0 14px',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#D6C7B2', marginBottom: '6px', display: 'block' }}>
                    Offer Expiry Window
                  </label>
                  <select
                    value={flashDuration}
                    onChange={(e) => setFlashDuration(e.target.value)}
                    className="form-input"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      height: '44px',
                      background: 'var(--bg-input, #1E293B)',
                      border: '1.5px solid var(--border, #23314E)',
                      color: '#FFF',
                      borderRadius: '8px',
                      padding: '0 12px',
                      fontSize: '13px'
                    }}
                  >
                    <option value="10">10 Minutes</option>
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">60 Minutes</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button
                  type="submit"
                  disabled={flashLoading}
                  className="btn btn-primary"
                  style={{
                    height: '46px',
                    padding: '0 32px',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#000000',
                    fontWeight: 900,
                    fontSize: '14px',
                    border: 'none',
                    borderRadius: '10px',
                    boxShadow: '0 4px 18px rgba(245, 158, 11, 0.45)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Zap size={16} /> {flashLoading ? 'Broadcasting Live...' : '⚡ Broadcast Flash Free Ride Now'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Real-time Status Breakdown Banner */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Active Fleet & Live Ride Status</h2>
          <span className="badge badge-info">Auto-Synced</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--bg-sidebar)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Online Drivers</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#34D399' }}>{metrics.activeRiders || 0}</div>
          </div>
          <div style={{ background: 'var(--bg-sidebar)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pending Outside Quotes</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#60A5FA' }}>{metrics.pendingOutsideRides || 0}</div>
          </div>
          <div style={{ background: 'var(--bg-sidebar)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ride Requests Searching</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#FBBF24' }}>{metrics.requestedRides || 0}</div>
          </div>
          <div style={{ background: 'var(--bg-sidebar)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>In-Progress Trips</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#38BDF8' }}>{metrics.inProgressRides || 0}</div>
          </div>
          <div style={{ background: 'var(--bg-sidebar)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Gross Volume</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFF' }}>₹{(metrics.totalVolume || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Recent Rides Table */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Recent Ride Requests</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Latest platform activity</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ride Code</th>
                <th>Customer</th>
                <th>Rider (Driver)</th>
                <th>Pickup & Destination</th>
                <th>Est. Fare</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentRides.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No recent rides found.
                  </td>
                </tr>
              ) : (
                recentRides.map((ride) => (
                  <tr key={ride.id}>
                    <td>
                      <strong style={{ color: 'var(--primary)', fontFamily: 'monospace', fontSize: '14px' }}>
                        {ride.ride_code}
                      </strong>
                    </td>
                    <td>
                      <div>{ride.customer_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ride.customer_phone}</div>
                    </td>
                    <td>
                      {ride.rider_name ? (
                        <div>
                          <div>{ride.rider_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {ride.vehicle_model} ({ride.vehicle_number})
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{ride.pickup_address}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>&rarr; {ride.destination_address}</div>
                    </td>
                    <td>
                      <strong>₹{parseFloat(ride.final_fare || ride.estimated_fare).toFixed(2)}</strong>
                    </td>
                    <td>
                      <span className={`badge ${
                        ride.status === 'COMPLETED' ? 'badge-success' :
                        ride.status === 'CANCELLED' ? 'badge-danger' :
                        ride.status === 'REQUESTED' ? 'badge-warning' : 'badge-info'
                      }`}>
                        {ride.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(ride.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
