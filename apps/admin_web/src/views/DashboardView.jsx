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
  Clock
} from 'lucide-react';

export function DashboardView() {
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  }, []);

  // Listen to live socket events to update dashboard in real time
  useEffect(() => {
    if (!socket) return;

    const handleRideUpdate = () => {
      loadDashboardData();
    };

    socket.on('admin:ride_requested', handleRideUpdate);
    socket.on('admin:ride_status_change', handleRideUpdate);
    socket.on('admin:rider_status_changed', handleRideUpdate);

    return () => {
      socket.off('admin:ride_requested', handleRideUpdate);
      socket.off('admin:ride_status_change', handleRideUpdate);
      socket.off('admin:rider_status_changed', handleRideUpdate);
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
                    No recent rides found. Use the Live Multi-App Simulator to generate live rides!
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
