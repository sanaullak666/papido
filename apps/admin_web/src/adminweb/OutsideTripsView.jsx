import React, { useState, useEffect, useRef } from 'react';
import './OutsideTripsView.css';
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
  History,
  ExternalLink,
  Navigation,
  Car,
  AlertTriangle,
  Radio,
  BellRing,
  VolumeX,
  ChevronRight,
  CircleDot,
  Route,
  ArrowRight
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import StatusBadge from '../components/ui/StatusBadge';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';

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

      const initialForm = {};
      pending.forEach(r => {
        initialForm[r.id] = {
          fare: r.estimated_fare || '',
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

  const historyColumns = [
    {
      header: 'Ride Code',
      accessor: (ride) => (
        <span className="ot-table-code">
          {ride.ride_code || `#${ride.id}`}
        </span>
      )
    },
    {
      header: 'Customer',
      accessor: (ride) => (
        <div>
          <div className="ot-table-name">{ride.customer_name}</div>
          <div className="ot-table-sub">{ride.customer_phone}</div>
        </div>
      )
    },
    {
      header: 'Rider Assigned',
      accessor: (ride) => (
        ride.rider_name ? (
          <span className="ot-table-name ot-table-name--emerald">{ride.rider_name}</span>
        ) : (
          <span className="ot-table-unassigned">Unassigned</span>
        )
      )
    },
    {
      header: 'Route Details',
      accessor: (ride) => (
        <div>
          <div className="ot-table-route">{ride.pickup_address}</div>
          <div className="ot-table-route-sub">
            <ArrowRight size={11} /> {ride.destination_address}
          </div>
        </div>
      )
    },
    {
      header: 'Fare',
      accessor: (ride) => (
        <strong className="ot-table-fare">
          ₹{parseFloat(ride.fare_amount || ride.estimated_fare || 0).toFixed(2)}
        </strong>
      )
    },
    {
      header: 'Status',
      accessor: (ride) => <StatusBadge status={ride.status} size="sm" />
    },
    {
      header: 'Requested At',
      accessor: (ride) => (
        <span className="ot-table-time">
          {new Date(ride.created_at).toLocaleString()}
        </span>
      )
    }
  ];

  return (
    <div className="ot-page">
      {/* ============================================================
          ALERT BAR
          ============================================================ */}
      {pendingRides.length > 0 && (
        <div className="ot-alert-bar ot-pulse-soft">
          <div className="ot-alert-left">
            <div className="ot-alert-icon">
              <BellRing size={16} />
            </div>
            <div>
              <div className="ot-alert-title">
                {pendingRides.length} pending dispatch {pendingRides.length === 1 ? 'request' : 'requests'}
              </div>
              <div className="ot-alert-sub">
                Audio ringtone is active. New outside campus requests arrive in real time.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          HEADER + TABS
          ============================================================ */}
      <div className="ot-header">
        <div className="ot-tab-switch">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`ot-tab-btn ${activeTab === 'pending' ? 'is-active' : ''}`}
          >
            <Globe size={15} />
            <span>Dispatch Queue</span>
            <span className="ot-tab-count">{pendingRides.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`ot-tab-btn ${activeTab === 'history' ? 'is-active ot-tab-btn--cyan' : ''}`}
          >
            <History size={15} />
            <span>All Outside Trips</span>
            <span className="ot-tab-count">{allOutsideRides.length}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => fetchData(false)}
          className="ot-refresh-btn"
        >
          <RefreshCw size={14} className={loading ? 'ot-spin' : ''} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="ot-alert ot-alert--error ot-slide-down">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Success banner */}
      {successMsg && (
        <div className="ot-alert ot-alert--success ot-slide-down">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ============================================================
          PENDING TAB
          ============================================================ */}
      {activeTab === 'pending' && (
        <div className="ot-pending-wrap">
          {loading && pendingRides.length === 0 ? (
            <div className="ot-skeletons">
              {[1, 2, 3].map((n) => (
                <div key={`ot-skel-${n}`} className="ot-skeleton-card">
                  <div className="ot-skeleton-line ot-skeleton-line--short" />
                  <div className="ot-skeleton-line" />
                  <div className="ot-skeleton-line ot-skeleton-line--short" />
                </div>
              ))}
            </div>
          ) : pendingRides.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No Pending Dispatch Requests"
              description="Outside campus ride requests will appear here in real-time with customer custom routes and suggested pricing."
            />
          ) : (
            pendingRides.map((ride, idx) => {
              const currentForm = formData[ride.id] || {};
              const vehicleType = ride.vehicle_type || 'BIKE';
              const mapLink = getMapLink(ride.destination_address, ride.dest_lat, ride.dest_lng);

              return (
                <div
                  key={ride.id}
                  className="ot-card ot-fade-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Card head: code, vehicle badge, status, time */}
                  <div className="ot-card-head">
                    <div className="ot-card-head-left">
                      <span className="ot-card-code">
                        {ride.ride_code || `#${ride.id}`}
                      </span>
                      <span className="ot-vehicle-badge">
                        {vehicleType === 'AUTO' || vehicleType === 'CAB' ? <Car size={12} /> : <Bike size={12} />}
                        <span>{vehicleType}</span>
                      </span>
                      <StatusBadge status={ride.status || 'requested'} size="sm" />
                    </div>

                    <div className="ot-card-head-time">
                      <Clock size={13} />
                      <span>
                        Requested {new Date(ride.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Info grid: route + passenger */}
                  <div className="ot-card-info-grid">
                    {/* Route details */}
                    <div className="ot-info-block">
                      <div className="ot-info-row">
                        <div className="ot-info-icon ot-info-icon--green">
                          <MapPin size={15} />
                        </div>
                        <div className="ot-info-body">
                          <div className="ot-info-label">Pickup</div>
                          <div className="ot-info-value">{ride.pickup_address}</div>
                        </div>
                      </div>

                      <div className="ot-info-row">
                        <div className="ot-info-icon ot-info-icon--amber">
                          <Navigation size={15} />
                        </div>
                        <div className="ot-info-body">
                          <div className="ot-info-label">Destination</div>
                          <div className="ot-info-value">{ride.destination_address}</div>
                        </div>
                        <a
                          href={mapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ot-info-map-link"
                        >
                          <span>Route Map</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>

                    {/* Passenger info */}
                    <div className="ot-info-block ot-info-block--passenger">
                      <div>
                        <div className="ot-info-label ot-info-label--upper">Passenger Details</div>
                        <div className="ot-passenger-name">
                          {ride.customer_name || 'Passenger'}
                        </div>
                        <div className="ot-passenger-phone">
                          {ride.customer_phone || 'No phone recorded'}
                        </div>
                      </div>

                      {ride.customer_phone && (
                        <a
                          href={`tel:${ride.customer_phone}`}
                          className="ot-passenger-call"
                        >
                          <Phone size={13} />
                          <span>Call Passenger</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Dispatch controls */}
                  <div className="ot-dispatch-controls">
                    <div className="ot-fare-input-wrap">
                      <Input
                        label="Set Quote Fare (₹)"
                        placeholder="e.g. 150"
                        type="number"
                        value={currentForm.fare}
                        onChange={(e) => handleFareChange(ride.id, e.target.value)}
                        icon={DollarSign}
                      />
                    </div>

                    <div className="ot-rider-select-wrap">
                      <label className="ot-rider-select-label">
                        Target Rider (Optional Broadcast)
                      </label>
                      <select
                        value={currentForm.riderId}
                        onChange={(e) => handleRiderChange(ride.id, e.target.value)}
                        className="ot-rider-select"
                      >
                        <option value="">
                          Broadcast to All Online Riders ({activeRiders.length})
                        </option>
                        {activeRiders.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} — {r.vehicle_model} ({r.vehicle_number})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ot-dispatch-action">
                      <Button
                        variant="primary"
                        icon={Send}
                        loading={submittingId === ride.id}
                        onClick={() => handleDispatch(ride.id)}
                      >
                        Dispatch Rider
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================
          HISTORY TAB
          ============================================================ */}
      {activeTab === 'history' && (
        <div className="ot-history-wrap ot-fade-up">
          <DataTable
            columns={historyColumns}
            data={allOutsideRides}
            loading={loading}
            emptyMessage="No outside trips history found."
          />
        </div>
      )}
    </div>
  );
}
export default OutsideTripsView;
