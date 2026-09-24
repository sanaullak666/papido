import React, { useState, useEffect } from 'react';
import './DashboardView.css';
import { apiRequest } from '../api';
import { useSocket } from '../context/SocketContext';
import {
  Users,
  Bike,
  Navigation,
  DollarSign,
  TrendingUp,
  Clock,
  Zap,
  Radio,
  Sparkles,
  MapPin,
  Calendar,
  Send,
  AlertCircle,
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  Wallet,
  CircleDollarSign
} from 'lucide-react';
import MetricCard from '../components/ui/MetricCard';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

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
      setFlashMsg({ type: 'success', text: 'Flash Free Ride is now LIVE on all passenger screens.' });
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
      <div className="dv-page">
        <div className="dv-kpi-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={`kpi-skel-${n}`} className="dv-skeleton-card">
              <div className="dv-skeleton-line dv-skeleton-line--short" />
              <div className="dv-skeleton-line dv-skeleton-line--lg" />
            </div>
          ))}
        </div>
        <div className="dv-skeleton-table">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={`row-skel-${n}`} className="dv-skeleton-row">
              <div className="dv-skeleton-line" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dv-page">
        <div className="dv-error-banner dv-slide-down">
          <AlertCircle size={20} />
          <div>
            <strong>Failed to load dashboard:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const recentRides = data?.recentRides || [];

  const columns = [
    {
      header: 'Ride Code',
      accessor: (ride) => (
        <span className="dv-table-code">{ride.ride_code}</span>
      )
    },
    {
      header: 'Customer',
      accessor: (ride) => (
        <div>
          <div className="dv-table-name">{ride.customer_name}</div>
          <div className="dv-table-sub">{ride.customer_phone}</div>
        </div>
      )
    },
    {
      header: 'Rider (Driver)',
      accessor: (ride) => (
        ride.rider_name ? (
          <div>
            <div className="dv-table-name dv-table-name--emerald">{ride.rider_name}</div>
            <div className="dv-table-sub">
              {ride.vehicle_model} ({ride.vehicle_number})
            </div>
          </div>
        ) : (
          <span className="dv-table-unassigned">Unassigned</span>
        )
      )
    },
    {
      header: 'Route',
      accessor: (ride) => (
        <div>
          <div className="dv-table-route">{ride.pickup_address}</div>
          <div className="dv-table-route-sub">
            <span className="dv-table-arrow">→</span> {ride.destination_address}
          </div>
        </div>
      )
    },
    {
      header: 'Fare',
      accessor: (ride) => (
        <strong className="dv-table-fare">
          ₹{parseFloat(ride.final_fare || ride.estimated_fare || 0).toFixed(2)}
        </strong>
      )
    },
    {
      header: 'Status',
      accessor: (ride) => <StatusBadge status={ride.status} size="sm" />
    },
    {
      header: 'Time',
      accessor: (ride) => (
        <span className="dv-table-time">
          {new Date(ride.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )
    }
  ];

  return (
    <div className="dv-page">
      {/* ============================================================
          KPI CARDS
          ============================================================ */}
      <div className="dv-kpi-grid">
        <MetricCard
          label="Active Rides"
          value={metrics.inProgressRides ?? metrics.totalRides ?? 0}
          trendText={`${metrics.requestedRides ?? 0} in queue searching`}
          icon={Navigation}
          iconColor="#6366F1"
          iconBg="rgba(99, 102, 241, 0.15)"
        />

        <MetricCard
          label="Online Riders"
          value={metrics.activeRiders ?? 0}
          trendText={`${metrics.totalRiders ?? 0} total registered fleet`}
          icon={Bike}
          iconColor="#10B981"
          iconBg="rgba(16, 185, 129, 0.15)"
        />

        <MetricCard
          label="Pending Outside Quotes"
          value={metrics.pendingOutsideRides ?? 0}
          trendText="Custom route dispatch review"
          icon={Clock}
          iconColor="#F59E0B"
          iconBg="rgba(245, 158, 11, 0.15)"
          badge={metrics.pendingOutsideRides > 0 ? 'NEEDS REVIEW' : undefined}
        />

        <MetricCard
          label="Today's Revenue"
          value={`₹${(metrics.todayCompanyRevenue || metrics.totalCompanyRevenue || 0).toFixed(2)}`}
          trendText={`Gross Vol: ₹${(metrics.totalVolume || 0).toFixed(2)}`}
          icon={DollarSign}
          iconColor="#10B981"
          iconBg="rgba(16, 185, 129, 0.15)"
        />
      </div>

      {/* ============================================================
          FLEET STATUS STRIP
          ============================================================ */}
      <div className="dv-fleet-strip dv-fade-up">
        <div className="dv-fleet-pill">
          <div className="dv-fleet-pill-dot dv-fleet-pill-dot--emerald" />
          <div className="dv-fleet-pill-body">
            <span className="dv-fleet-pill-label">Online Fleet</span>
            <strong className="dv-fleet-pill-value dv-fleet-pill-value--emerald">
              {metrics.activeRiders || 0}
            </strong>
          </div>
        </div>

        <div className="dv-fleet-pill">
          <div className="dv-fleet-pill-dot dv-fleet-pill-dot--cyan" />
          <div className="dv-fleet-pill-body">
            <span className="dv-fleet-pill-label">Pending Quotes</span>
            <strong className="dv-fleet-pill-value dv-fleet-pill-value--cyan">
              {metrics.pendingOutsideRides || 0}
            </strong>
          </div>
        </div>

        <div className="dv-fleet-pill">
          <div className="dv-fleet-pill-dot dv-fleet-pill-dot--amber" />
          <div className="dv-fleet-pill-body">
            <span className="dv-fleet-pill-label">Searching Drivers</span>
            <strong className="dv-fleet-pill-value dv-fleet-pill-value--amber">
              {metrics.requestedRides || 0}
            </strong>
          </div>
        </div>

        <div className="dv-fleet-pill">
          <div className="dv-fleet-pill-dot dv-fleet-pill-dot--indigo" />
          <div className="dv-fleet-pill-body">
            <span className="dv-fleet-pill-label">In-Progress Trips</span>
            <strong className="dv-fleet-pill-value dv-fleet-pill-value--indigo">
              {metrics.inProgressRides || 0}
            </strong>
          </div>
        </div>

        <div className="dv-fleet-pill">
          <div className="dv-fleet-pill-dot dv-fleet-pill-dot--emerald" />
          <div className="dv-fleet-pill-body">
            <span className="dv-fleet-pill-label">Completed Today</span>
            <strong className="dv-fleet-pill-value dv-fleet-pill-value--emerald">
              {metrics.completedRides || 0}
            </strong>
          </div>
        </div>
      </div>

      {/* ============================================================
          FLASH FREE RIDE BROADCASTER
          ============================================================ */}
      <div className={`dv-flash-card dv-fade-up ${flashRide?.status === 'OPEN' ? 'is-live' : ''}`}>
        <div className="dv-flash-head">
          <div className="dv-flash-head-left">
            <div className="dv-flash-head-icon">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="dv-flash-title">
                Flash Free Ride Drop (First-Come, First-Served)
              </h3>
              <p className="dv-flash-sub">
                Broadcast an instant live ₹0 free ride on a specific campus route. First student to claim gets the ride, dispatched exclusively to Core Members.
              </p>
            </div>
          </div>

          {flashRide?.status === 'OPEN' && (
            <span className="dv-flash-live-badge">
              <span className="dv-flash-live-dot" /> FLASH DROP ACTIVE
            </span>
          )}
        </div>

        {flashMsg && (
          <div className={`dv-flash-msg dv-flash-msg--${flashMsg.type} dv-slide-down`}>
            {flashMsg.type === 'success' && <CheckCircle2 size={16} />}
            {flashMsg.type === 'error' && <XCircle size={16} />}
            {flashMsg.type === 'info' && <AlertCircle size={16} />}
            <span>{flashMsg.text}</span>
          </div>
        )}

        {flashRide?.status === 'OPEN' ? (
          <div className="dv-flash-active cp-pulse-soft">
            <div className="dv-flash-active-left">
              <div className="dv-flash-active-route">
                <MapPin size={16} />
                <span>{flashRide.pickup}</span>
                <ArrowUpRight size={14} className="dv-flash-active-arrow" />
                <span>{flashRide.destination}</span>
              </div>
              <div className="dv-flash-active-note">
                Broadcasted live to all campus passenger apps
              </div>
            </div>

            <Button
              variant="danger"
              size="sm"
              onClick={handleCancelFlash}
              loading={flashLoading}
            >
              Cancel Flash Drop
            </Button>
          </div>
        ) : (
          <form onSubmit={handleBroadcastFlash} className="dv-flash-form">
            <div className="dv-flash-form-grid">
              <Input
                label="Pickup Spot"
                placeholder="e.g. SJC Hostel"
                value={flashPickup}
                onChange={(e) => setFlashPickup(e.target.value)}
                icon={MapPin}
                required
              />

              <Input
                label="Destination Spot"
                placeholder="e.g. Main Gate"
                value={flashDest}
                onChange={(e) => setFlashDest(e.target.value)}
                icon={Navigation}
                required
              />

              <div className="dv-flash-form-select-wrap">
                <label className="dv-flash-form-label">
                  Active Window
                </label>
                <select
                  value={flashDuration}
                  onChange={(e) => setFlashDuration(e.target.value)}
                  className="dv-flash-select"
                >
                  <option value="10">10 Minutes</option>
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">60 Minutes</option>
                </select>
              </div>
            </div>

            <div className="dv-flash-form-actions">
              <Button
                type="submit"
                variant="primary"
                loading={flashLoading}
                icon={Zap}
              >
                Broadcast Flash Free Ride Now
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* ============================================================
          RECENT RIDES TABLE
          ============================================================ */}
      <div className="dv-table-card dv-fade-up">
        <div className="dv-table-card-head">
          <div>
            <h3 className="dv-table-card-title">Recent Ride Activity</h3>
            <p className="dv-table-card-sub">Real-time platform dispatch log</p>
          </div>
          <div className="dv-table-card-live">
            <span className="dv-table-card-live-dot" /> Auto-refreshing
          </div>
        </div>

        <DataTable
          columns={columns}
          data={recentRides}
          loading={loading}
          emptyMessage="No recent rides right now."
          emptySubtext="New ride requests will appear here automatically."
        />
      </div>
    </div>
  );
}
export default DashboardView;
