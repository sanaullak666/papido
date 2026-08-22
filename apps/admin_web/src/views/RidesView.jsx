import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Search, Navigation, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export function RidesView() {
  const [rides, setRides] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRide, setSelectedRide] = useState(null);

  const fetchRides = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (vehicleFilter) params.append('vehicleType', vehicleFilter);
      if (search) params.append('search', search);

      const res = await apiRequest(`/admin/rides?${params.toString()}`);
      setRides(res.data.items);
      setTotal(res.data.pagination.total);
    } catch (err) {
      console.error('Failed to fetch rides', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides(false);
    const interval = setInterval(() => fetchRides(true), 5000);
    return () => clearInterval(interval);
  }, [statusFilter, vehicleFilter, search]);

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Ride Operations ({total})</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Monitor active and historical campus trips</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search ride code, address..."
                className="form-input"
                style={{ paddingLeft: '36px', width: '100%' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="PENDING_ADMIN_QUOTE">⏳ Pending Admin Quote</option>
              <option value="REQUESTED">Requested</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="RIDER_ARRIVING">Rider Arriving</option>
              <option value="RIDER_REACHED">Rider Reached</option>
              <option value="STARTED">Started</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              className="form-select"
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
            >
              <option value="">All Vehicles</option>
              <option value="BIKE">Bike</option>
              <option value="AUTO">Auto</option>
              <option value="CAB_MINI">Cab Mini</option>
              <option value="CAB_SEDAN">Cab Sedan</option>
            </select>

            <button className="btn btn-secondary btn-sm" onClick={fetchRides}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ride Code</th>
                <th>Vehicle</th>
                <th>Customer</th>
                <th>Rider (Driver)</th>
                <th>Route (Pickup &rarr; Drop)</th>
                <th>Distance & Fare</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading rides...
                  </td>
                </tr>
              ) : rides.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No rides found matching query.
                  </td>
                </tr>
              ) : (
                rides.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: 'var(--primary)', fontFamily: 'monospace', fontSize: '14px' }}>
                          {r.ride_code}
                        </strong>
                        {(r.is_outside === 1 || r.is_outside === true || r.status === 'PENDING_ADMIN_QUOTE') && (
                          <span style={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#60a5fa',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px'
                          }}>
                            🌐 Outside
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>OTP: {r.otp}</div>
                    </td>
                    <td>
                      <span className="badge badge-secondary">{r.vehicle_type}</span>
                    </td>
                    <td>
                      <div>{r.customer_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.customer_phone}</div>
                    </td>
                    <td>
                      {r.rider_name ? (
                        <div>
                          <div>{r.rider_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.vehicle_number}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {r.status === 'PENDING_ADMIN_QUOTE' ? 'Awaiting Quote' : 'Pending match'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.pickup_address}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>&rarr; {r.destination_address}</div>
                    </td>
                    <td>
                      <div><strong>₹{parseFloat(r.final_fare || r.estimated_fare || 0).toFixed(2)}</strong></div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.estimated_distance} km &bull; {r.estimated_duration} min</div>
                    </td>
                    <td>
                      <span className={`badge ${
                        r.status === 'COMPLETED' ? 'badge-success' :
                        r.status === 'CANCELLED' ? 'badge-danger' :
                        r.status === 'PENDING_ADMIN_QUOTE' ? 'badge-info' :
                        r.status === 'REQUESTED' ? 'badge-warning' : 'badge-info'
                      }`}>
                        {r.status === 'PENDING_ADMIN_QUOTE' ? 'Awaiting Quote' : r.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedRide(r)}
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
          zIndex: 100
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            width: '90%',
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px' }}>Ride #{selectedRide.ride_code}</h3>
                <span className={`badge ${selectedRide.status === 'COMPLETED' ? 'badge-success' : 'badge-info'}`}>
                  {selectedRide.status}
                </span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedRide(null)}
              >
                Close
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Route Card */}
              <div style={{ background: 'var(--bg-sidebar)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>ROUTE DETAILS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', marginTop: '5px' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{selectedRide.pickup_address}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lat: {selectedRide.pickup_latitude}, Lng: {selectedRide.pickup_longitude}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F43F5E', marginTop: '5px' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{selectedRide.destination_address}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lat: {selectedRide.destination_latitude}, Lng: {selectedRide.destination_longitude}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parties */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'var(--bg-sidebar)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>PASSENGER (CUSTOMER)</div>
                  <div style={{ fontWeight: 700 }}>{selectedRide.customer_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedRide.customer_phone}</div>
                </div>
                <div style={{ background: 'var(--bg-sidebar)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>DRIVER (RIDER)</div>
                  <div style={{ fontWeight: 700 }}>{selectedRide.rider_name || 'Unassigned'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedRide.vehicle_model} &bull; {selectedRide.vehicle_number}</div>
                </div>
              </div>

              {/* Financials & OTP */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--bg-sidebar)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fare Amount</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{parseFloat(selectedRide.final_fare || selectedRide.estimated_fare).toFixed(2)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-sidebar)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Payment Method</div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{selectedRide.payment_method || 'CASH'}</div>
                </div>
                <div style={{ background: 'var(--bg-sidebar)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Start OTP</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#38BDF8', letterSpacing: '2px' }}>
                    {selectedRide.otp || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Cancellation Reason if cancelled */}
              {selectedRide.status === 'CANCELLED' && (
                <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '12px', borderRadius: '8px', color: '#FB7185', fontSize: '13px' }}>
                  <strong>Cancellation Reason:</strong> {selectedRide.cancellation_reason || 'Not specified'} (By: {selectedRide.cancelled_by_role})
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
