import React, { useState, useEffect } from 'react';
import './RidesView.css';
import { apiRequest } from '../api';
import {
  Search,
  Navigation,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  Calendar,
  DollarSign,
  MapPin,
  Bike,
  Car,
  User,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  CreditCard,
  AlertTriangle,
  ShieldAlert,
  ExternalLink,
  Phone,
  Route,
  CircleDot,
  Gauge,
  ArrowRight,
  Copy,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import StatusBadge from '../components/ui/StatusBadge';
import DataTable from '../components/ui/DataTable';
import Drawer from '../components/ui/Drawer';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import RideCard from '../components/ride/RideCard';
import RideStatusStepper from '../components/ride/RideStatusStepper';
import FareBreakdown from '../components/ride/FareBreakdown';

export function RidesView() {
  const [activeTab, setActiveTab] = useState('rides'); // 'rides' | 'penalties'
  const [rides, setRides] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [penaltiesLoading, setPenaltiesLoading] = useState(false);
  const [penaltyStatusFilter, setPenaltyStatusFilter] = useState('ALL');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [selectedRide, setSelectedRide] = useState(null);
  const [updatingPenaltyId, setUpdatingPenaltyId] = useState(null);
  const [copiedOtp, setCopiedOtp] = useState(false);

  const handleCopyOtp = (otp) => {
    if (!otp) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(String(otp));
      }
    } catch (_) {}
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  const fetchRides = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      if (statusFilter) params.append('status', statusFilter);
      if (vehicleFilter) params.append('vehicleType', vehicleFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await apiRequest(`/admin/rides?${params.toString()}`);
      const items = res.data.items || [];
      setRides(items);
      setTotal(res.data.pagination?.total || 0);

      if (!selectedRide && items.length > 0) {
        setSelectedRide(items[0]);
      } else if (selectedRide) {
        const updated = items.find(r => r.id === selectedRide.id);
        if (updated) setSelectedRide(updated);
      }
    } catch (err) {
      console.error('Failed to fetch rides', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const fetchPenalties = async () => {
    setPenaltiesLoading(true);
    try {
      const params = new URLSearchParams();
      if (penaltyStatusFilter && penaltyStatusFilter !== 'ALL') {
        params.append('status', penaltyStatusFilter);
      }
      const res = await apiRequest(`/admin/penalties?${params.toString()}`);
      setPenalties(res.data || []);
    } catch (err) {
      console.error('Failed to fetch cancellation penalties', err);
    } finally {
      setPenaltiesLoading(false);
    }
  };

  const handleUpdatePenaltyStatus = async (penaltyId, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this ₹15 penalty as ${newStatus}?`)) return;
    setUpdatingPenaltyId(penaltyId);
    try {
      await apiRequest(`/admin/penalties/${penaltyId}/status`, 'PATCH', {
        status: newStatus,
        notes: `Admin marked as ${newStatus}`
      });
      fetchPenalties();
      fetchRides(true);
      if (selectedRide) {
        setSelectedRide(prev => prev ? { ...prev, penalty_status: newStatus } : null);
      }
    } catch (err) {
      alert(err.message || 'Failed to update penalty status.');
    } finally {
      setUpdatingPenaltyId(null);
    }
  };

  useEffect(() => {
    fetchRides(false);
    const interval = setInterval(() => fetchRides(true), 6000);
    return () => clearInterval(interval);
  }, [page, limit, statusFilter, vehicleFilter, search]);

  useEffect(() => {
    if (activeTab === 'penalties') {
      fetchPenalties();
    }
  }, [activeTab, penaltyStatusFilter]);

  const totalPages = Math.ceil(total / limit) || 1;

  const STATUS_CHIPS = [
    { label: 'All Statuses', value: '' },
    { label: 'Requested', value: 'REQUESTED' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'Arriving', value: 'ARRIVING' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' }
  ];

  const penaltyColumns = [
    {
      header: 'Ride Code',
      accessor: (p) => (
        <span className="rv-table-code">
          {p.ride_code || `RIDE-${p.ride_id}`}
        </span>
      )
    },
    {
      header: 'Cancelled At',
      accessor: (p) => (
        <span className="rv-table-time">
          {new Date(p.created_at).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Customer',
      accessor: (p) => (
        <div>
          <div className="rv-table-name">{p.customer_name || 'Passenger'}</div>
          <div className="rv-table-sub">{p.customer_phone || '—'}</div>
        </div>
      )
    },
    {
      header: 'Beneficiary Driver',
      accessor: (p) => (
        <div>
          <div className="rv-table-name rv-table-name--emerald">
            {p.rider_name || p.full_rider_name || 'Driver'}
          </div>
          <div className="rv-table-sub">{p.rider_phone || '—'}</div>
        </div>
      )
    },
    {
      header: 'Fee',
      accessor: (p) => (
        <strong className="rv-table-fee">
          ₹{parseFloat(p.amount || 15).toFixed(2)}
        </strong>
      )
    },
    {
      header: 'Status',
      accessor: (p) => (
        <StatusBadge
          status={p.status === 'PAID' ? 'completed' : p.status === 'UNPAID' ? 'cancelled' : 'requested'}
          label={p.status === 'UNPAID' ? 'UNPAID (Blocked)' : p.status}
          size="sm"
        />
      )
    },
    {
      header: 'Actions',
      accessor: (p) => (
        <div className="rv-penalty-actions">
          {p.status !== 'PAID' && (
            <Button
              size="sm"
              variant="success"
              onClick={() => handleUpdatePenaltyStatus(p.id, 'PAID')}
              disabled={updatingPenaltyId === p.id}
            >
              Mark Paid
            </Button>
          )}
          {p.status !== 'WAIVED' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleUpdatePenaltyStatus(p.id, 'WAIVED')}
              disabled={updatingPenaltyId === p.id}
            >
              Waive
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="rv-page">
      {/* ============================================================
          TAB CONTROLS
          ============================================================ */}
      <div className="rv-tab-bar">
        <div className="rv-tab-switch">
          <button
            type="button"
            onClick={() => setActiveTab('rides')}
            className={`rv-tab-btn ${activeTab === 'rides' ? 'is-active' : ''}`}
          >
            <Navigation size={15} />
            <span>Live Rides &amp; Operations</span>
            <span className="rv-tab-count">{total}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('penalties')}
            className={`rv-tab-btn ${activeTab === 'penalties' ? 'is-active' : ''}`}
          >
            <CreditCard size={15} />
            <span>Cancellation Penalties</span>
            <span className="rv-tab-count rv-tab-count--rose">{penalties.length}</span>
          </button>
        </div>

        <div className="rv-tab-live">
          <span className="rv-tab-live-dot" />
          <span>Auto-refreshing every 6s</span>
        </div>
      </div>

      {/* ============================================================
          PENALTIES TAB
          ============================================================ */}
      {activeTab === 'penalties' && (
        <div className="rv-penalties-wrap rv-fade-up">
          <div className="rv-penalties-head">
            <div>
              <h3 className="rv-panel-title">
                Driver Cancellation Compensation Ledger
              </h3>
              <p className="rv-panel-sub">
                Track ₹15 compensation fees charged to passengers who cancel after driver arrived at pickup
              </p>
            </div>

            <div className="rv-penalties-actions">
              <select
                value={penaltyStatusFilter}
                onChange={(e) => setPenaltyStatusFilter(e.target.value)}
                className="rv-select"
              >
                <option value="ALL">All Statuses</option>
                <option value="UNPAID">UNPAID (Passenger Blocked)</option>
                <option value="PAID">PAID (Settled to Driver)</option>
                <option value="WAIVED">WAIVED (Admin Overridden)</option>
              </select>

              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={fetchPenalties}
                loading={penaltiesLoading}
              >
                Refresh
              </Button>
            </div>
          </div>

          <DataTable
            columns={penaltyColumns}
            data={penalties}
            loading={penaltiesLoading}
            emptyMessage="No cancellation penalties found matching filter."
          />
        </div>
      )}

      {/* ============================================================
          LIVE RIDES TAB
          ============================================================ */}
      {activeTab === 'rides' && (
        <div className="rv-live-wrap">
          {/* Filter Bar */}
          <div className="rv-filter-bar rv-fade-up">
            <div className="rv-filter-row">
              <div className="rv-search-wrap">
                <Input
                  placeholder="Search by ride code, passenger name, driver..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={Search}
                />
              </div>

              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="rv-select"
              >
                <option value="">All Vehicles</option>
                <option value="BIKE">Bike</option>
                <option value="AUTO">Auto</option>
                <option value="CAB">Cab</option>
              </select>

              <Button
                variant="secondary"
                size="md"
                icon={RefreshCw}
                onClick={() => fetchRides(false)}
                loading={loading}
              >
                Refresh
              </Button>
            </div>

            {/* Status Chips */}
            <div className="rv-chip-rail">
              {STATUS_CHIPS.map((chip) => {
                const isActive = statusFilter === chip.value;
                const count = chip.value === '' ? total : undefined;
                return (
                  <button
                    key={chip.value || 'all'}
                    type="button"
                    onClick={() => setStatusFilter(chip.value)}
                    className={`rv-chip ${isActive ? 'is-active' : ''}`}
                  >
                    {chip.label}
                    {count !== undefined && (
                      <span className="rv-chip-count">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split View */}
          <div className="rv-split">
            {/* Left: Cards list */}
            <div className="rv-list-column">
              {loading && rides.length === 0 ? (
                <div className="rv-skeletons">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={`rv-skel-${n}`} className="rv-skeleton-card">
                      <div className="rv-skeleton-line rv-skeleton-line--short" />
                      <div className="rv-skeleton-line" />
                      <div className="rv-skeleton-line rv-skeleton-line--short" />
                    </div>
                  ))}
                </div>
              ) : rides.length === 0 ? (
                <EmptyState
                  icon={Navigation}
                  title="No rides found"
                  description="No rides match your selected search or filter criteria."
                />
              ) : (
                rides.map((ride) => (
                  <RideCard
                    key={ride.id}
                    ride={ride}
                    isSelected={selectedRide?.id === ride.id}
                    onSelect={(r) => setSelectedRide(r)}
                  />
                ))
              )}

              {totalPages > 1 && (
                <div className="rv-pagination">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={ChevronLeft}
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <span className="rv-pagination-info">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    iconRight={ChevronRight}
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            {/* Right: Details pane */}
            <div className="rv-details-pane rv-fade-up">
              {selectedRide ? (
                <>
                  {/* Header */}
                  <div className="rv-details-head">
                    <div>
                      <div className="rv-details-head-code-row">
                        <h3 className="rv-details-code">
                          {selectedRide.ride_code || `#${selectedRide.id}`}
                        </h3>
                        <StatusBadge status={selectedRide.status} />

                        {selectedRide.otp && (
                          <div
                            className={`rv-otp-chip ${['STARTED', 'COMPLETED'].includes(selectedRide.status) ? 'is-verified' : 'is-active'}`}
                            title={['STARTED', 'COMPLETED'].includes(selectedRide.status) ? "Verified Start OTP" : "Active Start OTP for Ride Verification"}
                          >
                            <KeyRound size={12} className="rv-otp-icon" />
                            <span className="rv-otp-label">START OTP</span>
                            <strong className="rv-otp-code">{selectedRide.otp}</strong>
                            <button
                              type="button"
                              className="rv-otp-copy-btn"
                              onClick={() => handleCopyOtp(selectedRide.otp)}
                              title="Copy OTP to clipboard"
                              aria-label="Copy OTP"
                            >
                              {copiedOtp ? (
                                <Check size={12} color="#10B981" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="rv-details-time">
                        Requested on {new Date(selectedRide.created_at || selectedRide.requested_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="rv-details-fare-box">
                      <div className="rv-details-fare">
                        ₹{parseFloat(selectedRide.total_fare || selectedRide.final_fare || selectedRide.fare_amount || 0).toFixed(2)}
                      </div>
                      <div className="rv-details-fare-meta">
                        {selectedRide.payment_method || 'CASH'} · {selectedRide.payment_status || 'PENDING'}
                      </div>
                    </div>
                  </div>

                  {/* Stepper */}
                  <div className="rv-stepper-box">
                    <RideStatusStepper currentStatus={selectedRide.status} />
                  </div>

                  {/* Route card */}
                  <div className="rv-route-box">
                    <div className="rv-route-row">
                      <div className="rv-route-row-icon rv-route-row-icon--green">
                        <MapPin size={14} />
                      </div>
                      <div className="rv-route-row-body">
                        <div className="rv-route-row-label">Pickup</div>
                        <div className="rv-route-row-value">
                          {selectedRide.pickup_address || selectedRide.pickup_stop}
                        </div>
                      </div>
                    </div>

                    <div className="rv-route-divider" />

                    <div className="rv-route-row">
                      <div className="rv-route-row-icon rv-route-row-icon--amber">
                        <Navigation size={14} />
                      </div>
                      <div className="rv-route-row-body">
                        <div className="rv-route-row-label">Destination</div>
                        <div className="rv-route-row-value">
                          {selectedRide.destination_address || selectedRide.destination_stop}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact cards */}
                  <div className="rv-contacts-grid">
                    <div className="rv-contact-card rv-contact-card--passenger">
                      <div className="rv-contact-head-row">
                        <div className="rv-contact-label">Passenger</div>
                        {selectedRide.otp && (
                          <span className="rv-passenger-otp-tag">
                            <KeyRound size={11} />
                            <span>OTP: <strong>{selectedRide.otp}</strong></span>
                          </span>
                        )}
                      </div>
                      <div className="rv-contact-name">
                        {selectedRide.customer_name || 'Passenger'}
                      </div>
                      {selectedRide.customer_phone && (
                        <div className="rv-contact-meta">
                          Phone: {selectedRide.customer_phone}
                        </div>
                      )}

                      {/* Prominent customer ride OTP pass widget */}
                      {selectedRide.otp && (
                        <div className="rv-otp-pass">
                          <div className="rv-otp-pass-top">
                            <div className="rv-otp-pass-title">
                              <ShieldCheck size={13} />
                              <span>Ride Start Verification OTP</span>
                            </div>
                            <span className={`rv-otp-pass-status ${['STARTED', 'COMPLETED'].includes(selectedRide.status) ? 'is-verified' : ''}`}>
                              {['STARTED', 'COMPLETED'].includes(selectedRide.status) ? 'Verified' : 'Active'}
                            </span>
                          </div>
                          <div className="rv-otp-digits-box">
                            {String(selectedRide.otp).split('').map((digit, idx) => (
                              <span key={idx} className="rv-otp-digit">{digit}</span>
                            ))}
                          </div>
                          <div className="rv-otp-pass-foot">
                            <span className="rv-otp-pass-hint">
                              {['STARTED', 'COMPLETED'].includes(selectedRide.status)
                                ? '✓ Verified by rider at pickup location'
                                : 'Share with driver when they arrive to start ride'}
                            </span>
                            <button
                              type="button"
                              className="rv-otp-pass-copy"
                              onClick={() => handleCopyOtp(selectedRide.otp)}
                              title="Copy OTP"
                            >
                              {copiedOtp ? (
                                <>
                                  <Check size={12} color="#10B981" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rv-contact-card">
                      <div className="rv-contact-label">Assigned Driver</div>
                      {selectedRide.rider_name ? (
                        <>
                          <div className="rv-contact-name rv-contact-name--emerald">
                            {selectedRide.rider_name}
                          </div>
                          <div className="rv-contact-meta">
                            {selectedRide.vehicle_model} ({selectedRide.vehicle_number})
                          </div>
                        </>
                      ) : (
                        <div className="rv-contact-unassigned">
                          No driver assigned yet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fare breakdown */}
                  <FareBreakdown
                    customerFare={selectedRide.total_fare || selectedRide.final_fare || selectedRide.fare_amount}
                    paymentStatus={selectedRide.payment_status}
                    paymentMethod={selectedRide.payment_method}
                    settlementStatus={selectedRide.settlement_status || 'PENDING'}
                  />
                </>
              ) : (
                <EmptyState
                  icon={Navigation}
                  title="No Ride Selected"
                  description="Select any ride from the list on the left to inspect route, driver, and commission details."
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default RidesView;
