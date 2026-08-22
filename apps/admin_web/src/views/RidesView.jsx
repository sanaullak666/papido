import React, { useState, useEffect } from 'react';
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
  FileText
} from 'lucide-react';

export function RidesView() {
  const [rides, setRides] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [selectedRide, setSelectedRide] = useState(null);

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
      setRides(res.data.items || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch rides', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides(false);
    const interval = setInterval(() => fetchRides(true), 6000);
    return () => clearInterval(interval);
  }, [page, limit, statusFilter, vehicleFilter, search]);

  const totalPages = Math.ceil(total / limit) || 1;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return dateStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="panel">
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation size={20} color="var(--primary)" />
              All Ride Operations &amp; Booking History ({total})
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Complete live ride monitor and past booked trip records
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search ride code, address, driver..."
                className="form-input"
                style={{ paddingLeft: '32px', width: '100%', fontSize: '13px' }}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Status Filter */}
            <select
              className="form-select"
              style={{ fontSize: '13px' }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="PENDING_ADMIN_QUOTE">Pending Admin Quote</option>
              <option value="REQUESTED">Requested / Dispatching</option>
              <option value="ACCEPTED">Accepted by Driver</option>
              <option value="RIDER_ARRIVING">Driver Arriving</option>
              <option value="RIDER_REACHED">Driver Reached</option>
              <option value="STARTED">Trip In Progress (Started)</option>
              <option value="COMPLETED">Completed Trips</option>
              <option value="CANCELLED">Cancelled Trips</option>
            </select>

            {/* Vehicle Type Filter */}
            <select
              className="form-select"
              style={{ fontSize: '13px' }}
              value={vehicleFilter}
              onChange={(e) => {
                setVehicleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Vehicle Types</option>
              <option value="BIKE">Motorcycle / Bike</option>
              <option value="AUTO">Auto</option>
              <option value="CAB_MINI">Cab Mini</option>
              <option value="CAB_SEDAN">Cab Sedan</option>
            </select>

            {/* Rows Per Page */}
            <select
              className="form-select"
              style={{ fontSize: '13px', width: '110px' }}
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
            >
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
              <option value="200">200 / page</option>
              <option value="500">500 / page</option>
            </select>

            {/* Refresh Button */}
            <button className="btn btn-secondary btn-sm" onClick={() => fetchRides(false)} title="Refresh list">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          {[
            { label: 'All Trips', value: '' },
            { label: 'Completed', value: 'COMPLETED' },
            { label: 'In Progress (Started)', value: 'STARTED' },
            { label: 'Pending Quote', value: 'PENDING_ADMIN_QUOTE' },
            { label: 'Requested', value: 'REQUESTED' },
            { label: 'Accepted', value: 'ACCEPTED' },
            { label: 'Cancelled', value: 'CANCELLED' }
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              className={`btn btn-sm ${statusFilter === tab.value ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px' }}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Rides Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ride Code</th>
                <th>Booked At</th>
                <th>Vehicle</th>
                <th>Customer</th>
                <th>Driver (Rider)</th>
                <th>Route (Pickup &rarr; Drop)</th>
                <th>Fare</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading rides and booking history...
                  </td>
                </tr>
              ) : rides.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No rides found matching query or filters.
                  </td>
                </tr>
              ) : (
                rides.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: 'var(--primary)', fontFamily: 'monospace', fontSize: '13px' }}>
                          {r.ride_code}
                        </strong>
                        {(r.is_outside === 1 || r.is_outside === true || r.status === 'PENDING_ADMIN_QUOTE') && (
                          <span style={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#60a5fa',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Globe size={10} /> Outside
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>OTP: {r.otp || 'N/A'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>{formatDate(r.created_at)}</div>
                      {r.completed_at && (
                        <div style={{ fontSize: '10px', color: '#10B981' }}>
                          Done: {new Date(r.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-secondary" style={{ fontSize: '11px' }}>{r.vehicle_type}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.customer_name || 'Passenger'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.customer_phone || '-'}</div>
                    </td>
                    <td>
                      {r.rider_name ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>{r.rider_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {r.vehicle_model} {r.vehicle_number ? `(${r.vehicle_number})` : ''}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>
                          {r.status === 'PENDING_ADMIN_QUOTE' ? 'Awaiting Quote' : 'Unassigned'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', fontWeight: 600, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.pickup_address}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        &rarr; {r.destination_address}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>
                        Rs. {parseFloat(r.final_fare || r.estimated_fare || 0).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {r.estimated_distance || r.actual_distance_km ? `${r.actual_distance_km || r.estimated_distance} km` : ''}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        r.status === 'COMPLETED' ? 'badge-success' :
                        r.status === 'CANCELLED' ? 'badge-danger' :
                        r.status === 'STARTED' ? 'badge-primary' :
                        r.status === 'PENDING_ADMIN_QUOTE' ? 'badge-info' :
                        r.status === 'REQUESTED' ? 'badge-warning' : 'badge-info'
                      }`} style={{ fontSize: '11px' }}>
                        {r.status === 'PENDING_ADMIN_QUOTE' ? 'Awaiting Quote' : r.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedRide(r)}
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border)',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing {rides.length > 0 ? (page - 1) * limit + 1 : 0} &ndash; {Math.min(page * limit, total)} of {total} total booked trips
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '0 6px' }}>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Ride Details Modal */}
      {selectedRide && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Navigation size={18} color="var(--primary)" />
                  Ride #{selectedRide.ride_code}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Booked: {formatDate(selectedRide.created_at)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${
                  selectedRide.status === 'COMPLETED' ? 'badge-success' :
                  selectedRide.status === 'CANCELLED' ? 'badge-danger' :
                  selectedRide.status === 'STARTED' ? 'badge-primary' : 'badge-info'
                }`}>
                  {selectedRide.status}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedRide(null)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Route Card */}
              <div style={{ background: 'var(--bg-sidebar)', padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                  Route Details
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', marginTop: '4px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{selectedRide.pickup_address}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pickup Point</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F43F5E', marginTop: '4px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{selectedRide.destination_address}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Destination Drop</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passenger & Driver */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ background: 'var(--bg-sidebar)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                    Passenger (Customer)
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{selectedRide.customer_name || 'Passenger'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Phone: {selectedRide.customer_phone || '-'}</div>
                </div>

                <div style={{ background: 'var(--bg-sidebar)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                    Driver (Rider)
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{selectedRide.rider_name || 'Unassigned'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {selectedRide.vehicle_model} {selectedRide.vehicle_number ? `(${selectedRide.vehicle_number})` : ''}
                  </div>
                  {selectedRide.rider_phone && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Phone: {selectedRide.rider_phone}</div>
                  )}
                </div>
              </div>

              {/* Financials & OTP */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'var(--bg-sidebar)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fare Amount</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                    Rs. {parseFloat(selectedRide.final_fare || selectedRide.estimated_fare || 0).toFixed(2)}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-sidebar)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vehicle Type</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>
                    {selectedRide.vehicle_type}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-sidebar)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Payment Method</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>
                    {selectedRide.payment_method || 'CASH'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-sidebar)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Start OTP</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#38BDF8', letterSpacing: '2px' }}>
                    {selectedRide.otp || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Cancellation Details */}
              {selectedRide.status === 'CANCELLED' && (
                <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '12px', borderRadius: '8px', color: '#FB7185', fontSize: '13px' }}>
                  <strong>Cancellation Reason:</strong> {selectedRide.cancellation_reason || 'Not specified'} (By: {selectedRide.cancelled_by_role || 'User'})
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
