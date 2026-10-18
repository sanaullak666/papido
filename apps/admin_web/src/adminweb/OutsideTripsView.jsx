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
  Volume2,
  ChevronRight,
  CircleDot,
  Route,
  ArrowRight,
  Calendar,
  Zap,
  X
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import StatusBadge from '../components/ui/StatusBadge';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';

export function formatScheduledDateTime(val) {
  if (!val) return 'Date/Time not specified';
  try {
    const str = String(val).trim();
    const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(val);
  }
}

export function OutsideTripsView() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  const [pendingRides, setPendingRides] = useState([]);
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [allOutsideRides, setAllOutsideRides] = useState([]);
  const [activeRiders, setActiveRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const prevPendingCountRef = useRef(null);

  const [soundMuted, setSoundMuted] = useState(() => alertManager.isMuted());

  useEffect(() => {
    return alertManager.onMuteChange((enabled) => {
      setSoundMuted(!enabled);
    });
  }, []);

  const handleToggleSound = () => {
    const unmuted = alertManager.toggleMute();
    setSoundMuted(!unmuted);
  };

  const handleSilenceAlert = () => {
    alertManager.stopRingtone();
  };

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

      if (pending.length === 0) {
        alertManager.stopRingtone();
      }

      prevPendingCountRef.current = pending.length;

      setPendingRides(pending);
      setSelectedRideId(prev => {
        if (prev && pending.some(r => r.id === prev)) return prev;
        return pending[0]?.id || null;
      });
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
    return () => {
      clearInterval(interval);
      alertManager.stopRingtone();
    };
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
      alertManager.stopRingtone();
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
        <div>
          <span className="ot-table-code">
            {ride.ride_code || `#${ride.id}`}
          </span>
          {(ride.is_scheduled === 1 || ride.is_scheduled === true || ride.scheduled_time) && (
            <div>
              <span className="ot-table-prebook-tag">Pre-Book</span>
            </div>
          )}
        </div>
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
      header: 'Timing & Schedule',
      accessor: (ride) => (
        <div>
          {ride.scheduled_time ? (
            <div className="ot-table-scheduled-row">
              <Calendar size={12} />
              <span><strong>Pre-Book:</strong> {formatScheduledDateTime(ride.scheduled_time)}</span>
            </div>
          ) : (
            <div className="ot-table-immediate-row">
              <Zap size={11} />
              <span>Immediate Trip</span>
            </div>
          )}
          <div className="ot-table-sub">
            Req: {new Date(ride.created_at || ride.requested_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
          </div>
        </div>
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
                {soundMuted
                  ? 'Audio alerts are currently muted. Click Unmute to hear alerts.'
                  : 'Audio ringtone is active. New outside campus requests alert in real time.'}
              </div>
            </div>
          </div>
          <div className="ot-alert-actions">
            <button
              type="button"
              onClick={handleSilenceAlert}
              className="ot-alert-action-btn"
              title="Stop ringing audio"
            >
              <VolumeX size={13} />
              <span>Silence</span>
            </button>
            <button
              type="button"
              onClick={handleToggleSound}
              className={`ot-alert-action-btn ${soundMuted ? 'is-muted' : ''}`}
              title={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
            >
              {soundMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              <span>{soundMuted ? 'Unmute' : 'Mute'}</span>
            </button>
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
          PENDING TAB (Split Architecture: Queue | Details | Dispatch)
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
            <>
              {/* Desktop 3-Panel Split Layout & Mobile Queue */}
              {(() => {
                const selectedRide = pendingRides.find(r => r.id === selectedRideId) || pendingRides[0];
                const selectedForm = formData[selectedRide?.id] || {};
                const selectedVehicle = selectedRide?.vehicle_type || 'BIKE';
                const selectedMapLink = selectedRide ? getMapLink(selectedRide.destination_address, selectedRide.dest_lat, selectedRide.dest_lng) : '#';
                const selectedIsPreBooked = Boolean(
                  selectedRide?.is_scheduled === 1 || selectedRide?.is_scheduled === true || selectedRide?.scheduled_time
                );

                return (
                  <div className="ot-split-layout">
                    {/* LEFT PANEL: REQUESTS QUEUE */}
                    <div className="ot-panel ot-panel--queue">
                      <div className="ot-panel-head">
                        <div className="ot-panel-title">
                          <Radio size={15} color="#F59E0B" />
                          <span>Incoming Requests ({pendingRides.length})</span>
                        </div>
                      </div>

                      <div className="ot-queue-list">
                        {pendingRides.map((ride) => {
                          const isSelected = selectedRide?.id === ride.id;
                          const rideForm = formData[ride.id] || {};
                          const vType = ride.vehicle_type || 'BIKE';
                          const isPre = Boolean(ride.is_scheduled === 1 || ride.is_scheduled === true || ride.scheduled_time);

                          return (
                            <div
                              key={`queue-item-${ride.id}`}
                              className={`ot-queue-item ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => {
                                setSelectedRideId(ride.id);
                                setMobileDrawerOpen(true);
                              }}
                            >
                              <div className="ot-queue-item-top">
                                <div className="ot-queue-item-code-row">
                                  <span className="ot-pulse-dot" />
                                  <span className="ot-queue-code">{ride.ride_code || `#${ride.id}`}</span>
                                  <span className="ot-queue-vehicle-tag">
                                    {vType === 'AUTO' || vType === 'CAB' ? <Car size={11} /> : <Bike size={11} />}
                                    <span>{vType}</span>
                                  </span>
                                  {isPre && <span className="ot-queue-prebook-tag">Pre-Book</span>}
                                </div>
                                <span className="ot-queue-time">
                                  {new Date(ride.created_at || ride.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <div className="ot-queue-route">
                                <div className="ot-queue-dest truncate">
                                  <strong>To:</strong> {ride.destination_address}
                                </div>
                                <div className="ot-queue-pickup truncate">
                                  From: {ride.pickup_address}
                                </div>
                              </div>

                              <div className="ot-queue-meta-row">
                                <span className="ot-queue-customer">{ride.customer_name || 'Passenger'}</span>
                                <span className="ot-queue-fare">
                                  {rideForm.fare ? `₹${rideForm.fare}` : (ride.estimated_fare ? `Est. ₹${ride.estimated_fare}` : 'Unquoted')}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* CENTER PANEL: SELECTED TRIP DETAILS */}
                    {selectedRide && (
                      <div className="ot-panel ot-panel--details">
                        <div className="ot-panel-head">
                          <div className="ot-panel-title">
                            <Route size={15} color="#06B6D4" />
                            <span>Trip Itinerary &amp; Passenger</span>
                          </div>
                          <span className="ot-card-code">{selectedRide.ride_code || `#${selectedRide.id}`}</span>
                        </div>

                        {selectedIsPreBooked && (
                          <div className="ot-scheduled-banner">
                            <div className="ot-scheduled-banner-left">
                              <Calendar size={16} />
                              <div>
                                <span className="ot-scheduled-banner-tag">Pre-Booked Off-Campus Trip</span>
                                <div className="ot-scheduled-banner-time">
                                  Pickup: <strong>{formatScheduledDateTime(selectedRide.scheduled_time)}</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Passenger Contact Block */}
                        <div className="ot-info-block ot-info-block--passenger" style={{ background: '#18243E', borderRadius: '12px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="ot-info-label ot-info-label--upper">Passenger Information</div>
                            <div className="ot-passenger-name">{selectedRide.customer_name || 'Passenger'}</div>
                            <div className="ot-passenger-phone">{selectedRide.customer_phone || 'No phone recorded'}</div>
                          </div>
                          {selectedRide.customer_phone && (
                            <a
                              href={`tel:${selectedRide.customer_phone}`}
                              className="ot-passenger-call"
                              style={{ minHeight: '40px', padding: '0 14px' }}
                            >
                              <Phone size={13} />
                              <span>Call Passenger</span>
                            </a>
                          )}
                        </div>

                        {/* Route Timeline */}
                        <div className="ot-route-timeline" style={{ background: '#131D31', padding: '16px', borderRadius: '12px', border: '1px solid #23314E' }}>
                          <div className="ot-info-row">
                            <div className="ot-info-icon ot-info-icon--green">
                              <MapPin size={16} />
                            </div>
                            <div className="ot-info-body">
                              <div className="ot-info-label">Pickup Point</div>
                              <div className="ot-info-value" style={{ fontSize: '14px', fontWeight: 700 }}>
                                {selectedRide.pickup_address}
                              </div>
                            </div>
                          </div>

                          {selectedRide.via_address && (
                            <div className="ot-info-row" style={{ marginTop: '12px' }}>
                              <div className="ot-info-icon ot-info-icon--amber">
                                <CircleDot size={16} />
                              </div>
                              <div className="ot-info-body">
                                <div className="ot-info-label">Via / Intermediate Stop</div>
                                <div className="ot-info-value" style={{ fontSize: '14px', fontWeight: 700 }}>
                                  {selectedRide.via_address}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="ot-info-row" style={{ marginTop: '12px' }}>
                            <div className="ot-info-icon ot-info-icon--rose">
                              <Navigation size={16} />
                            </div>
                            <div className="ot-info-body">
                              <div className="ot-info-label">Destination Address</div>
                              <div className="ot-info-value" style={{ fontSize: '14px', fontWeight: 700 }}>
                                {selectedRide.destination_address}
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end' }}>
                            <a
                              href={selectedMapLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ot-info-map-link"
                              style={{ padding: '6px 14px', background: 'rgba(6, 182, 212, 0.15)', color: '#38BDF8', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}
                            >
                              <ExternalLink size={13} />
                              <span>Open Route in Google Maps</span>
                            </a>
                          </div>
                        </div>

                        {/* Notes / Special Instructions if any */}
                        {selectedRide.notes && (
                          <div style={{ background: '#131D31', padding: '12px 16px', borderRadius: '10px', border: '1px solid #23314E' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8' }}>
                              Passenger Special Notes
                            </div>
                            <div style={{ fontSize: '13px', color: '#F8FAFC', marginTop: '4px' }}>
                              {selectedRide.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* RIGHT PANEL: PRICING CALCULATOR & DISPATCH */}
                    {selectedRide && (
                      <div className="ot-panel ot-panel--dispatch">
                        <div className="ot-panel-head">
                          <div className="ot-panel-title">
                            <DollarSign size={15} color="#10B981" />
                            <span>Pricing &amp; Dispatch</span>
                          </div>
                        </div>

                        {/* Fare Breakdown & Estimation Helper */}
                        <div style={{ background: '#131D31', padding: '16px', borderRadius: '12px', border: '1px solid #23314E', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
                            Quotation Builder
                          </span>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94A3B8' }}>
                            <span>Base Rate:</span>
                            <strong style={{ color: '#F8FAFC' }}>₹50.00</strong>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94A3B8' }}>
                            <span>Vehicle Class:</span>
                            <strong style={{ color: '#F59E0B' }}>{selectedVehicle}</strong>
                          </div>

                          {selectedRide.estimated_fare && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94A3B8' }}>
                              <span>Suggested Fare:</span>
                              <strong style={{ color: '#10B981' }}>₹{parseFloat(selectedRide.estimated_fare).toFixed(2)}</strong>
                            </div>
                          )}

                          <div style={{ marginTop: '6px' }}>
                            <Input
                              label="Set Final Quote Fare (₹)"
                              placeholder="e.g. 150"
                              type="number"
                              value={selectedForm.fare}
                              onChange={(e) => handleFareChange(selectedRide.id, e.target.value)}
                              icon={DollarSign}
                            />
                          </div>

                          {/* Quick Preset Buttons */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {[100, 150, 200, 250, 300].map((preset) => (
                              <button
                                key={`preset-${preset}`}
                                type="button"
                                onClick={() => handleFareChange(selectedRide.id, String(preset))}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: selectedForm.fare === String(preset) ? '#F59E0B' : '#1E293B',
                                  color: selectedForm.fare === String(preset) ? '#0F172A' : '#94A3B8',
                                  border: '1px solid #23314E',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                ₹{preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Driver Assignment Dropdown */}
                        <div style={{ background: '#131D31', padding: '16px', borderRadius: '12px', border: '1px solid #23314E', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label className="ot-rider-select-label" style={{ margin: 0, fontWeight: 700 }}>
                            Assign Driver Partner
                          </label>
                          <select
                            value={selectedForm.riderId}
                            onChange={(e) => handleRiderChange(selectedRide.id, e.target.value)}
                            className="ot-rider-select"
                            style={{ minHeight: '44px' }}
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

                        {/* Dispatch CTA Button */}
                        <Button
                          variant="primary"
                          icon={Send}
                          loading={submittingId === selectedRide.id}
                          onClick={() => handleDispatch(selectedRide.id)}
                          style={{ minHeight: '52px', fontSize: '15px', fontWeight: 800 }}
                        >
                          Dispatch to Driver Partner
                        </Button>
                      </div>
                    )}

                    {/* MOBILE FULL-SCREEN DETAIL & DISPATCH DRAWER */}
                    {mobileDrawerOpen && selectedRide && (
                      <div className="ot-mobile-drawer-overlay">
                        <div className="ot-mobile-drawer ps-fade-up">
                          <div className="ot-mobile-drawer-head">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="ot-card-code">{selectedRide.ride_code || `#${selectedRide.id}`}</span>
                              <span className="ot-vehicle-badge">
                                {selectedVehicle === 'AUTO' || selectedVehicle === 'CAB' ? <Car size={12} /> : <Bike size={12} />}
                                <span>{selectedVehicle}</span>
                              </span>
                            </div>
                            <button
                              type="button"
                              className="ot-mobile-drawer-close"
                              onClick={() => setMobileDrawerOpen(false)}
                              aria-label="Close details"
                            >
                              <X size={18} />
                            </button>
                          </div>

                          <div className="ot-mobile-drawer-body">
                            {/* Passenger Details */}
                            <div className="ot-info-block ot-info-block--passenger" style={{ background: '#18243E', borderRadius: '10px' }}>
                              <div>
                                <div className="ot-info-label ot-info-label--upper">Passenger Details</div>
                                <div className="ot-passenger-name">{selectedRide.customer_name || 'Passenger'}</div>
                                <div className="ot-passenger-phone">{selectedRide.customer_phone || 'No phone recorded'}</div>
                              </div>
                              {selectedRide.customer_phone && (
                                <a href={`tel:${selectedRide.customer_phone}`} className="ot-passenger-call">
                                  <Phone size={13} /> Call
                                </a>
                              )}
                            </div>

                            {/* Route Details */}
                            <div style={{ background: '#131D31', padding: '14px', borderRadius: '10px', border: '1px solid #23314E' }}>
                              <div style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>
                                Pickup
                              </div>
                              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                                {selectedRide.pickup_address}
                              </div>
                              <div style={{ fontSize: '11px', fontWeight: 800, color: '#F43F5E', textTransform: 'uppercase' }}>
                                Destination
                              </div>
                              <div style={{ fontWeight: 700, fontSize: '13px' }}>
                                {selectedRide.destination_address}
                              </div>
                            </div>

                            {/* Pricing input */}
                            <Input
                              label="Set Quote Fare (₹)"
                              placeholder="e.g. 150"
                              type="number"
                              value={selectedForm.fare}
                              onChange={(e) => handleFareChange(selectedRide.id, e.target.value)}
                              icon={DollarSign}
                            />

                            {/* Rider assignment */}
                            <div>
                              <label className="ot-rider-select-label">Target Driver</label>
                              <select
                                value={selectedForm.riderId}
                                onChange={(e) => handleRiderChange(selectedRide.id, e.target.value)}
                                className="ot-rider-select"
                                style={{ minHeight: '44px' }}
                              >
                                <option value="">Broadcast to All Online Riders ({activeRiders.length})</option>
                                {activeRiders.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name} — {r.vehicle_model} ({r.vehicle_number})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <Button
                              variant="primary"
                              icon={Send}
                              loading={submittingId === selectedRide.id}
                              onClick={() => handleDispatch(selectedRide.id)}
                              style={{ minHeight: '50px', fontSize: '15px' }}
                            >
                              Dispatch Rider
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
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
