import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Search, UserCheck, UserX, Star, RefreshCw, AlertTriangle, ShieldAlert, X } from 'lucide-react';

export function CustomersView() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerRides, setCustomerRides] = useState([]);
  const [loadingRides, setLoadingRides] = useState(false);

  // Suspension Modal State
  const [suspendingUser, setSuspendingUser] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [isSubmittingSuspension, setIsSubmittingSuspension] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await apiRequest(`/admin/customers${query}`);
      setCustomers(res.data.items);
      setTotal(res.data.pagination.total);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleOpenSuspendModal = (customer) => {
    setSuspendingUser(customer);
    setSuspensionReason('');
  };

  const handleConfirmSuspension = async () => {
    if (!suspensionReason.trim()) {
      alert('Please enter a valid reason for suspending this user.');
      return;
    }

    try {
      setIsSubmittingSuspension(true);
      await apiRequest(`/admin/users/${suspendingUser.user_id}/status`, 'PATCH', {
        status: 'SUSPENDED',
        reason: suspensionReason.trim()
      });
      setSuspendingUser(null);
      setSuspensionReason('');
      fetchCustomers();
    } catch (err) {
      alert(`Error suspending user: ${err.message}`);
    } finally {
      setIsSubmittingSuspension(false);
    }
  };

  const handleReactivateUser = async (customer) => {
    if (!confirm(`Are you sure you want to reactivate ${customer.name}'s account and restore their access?`)) return;
    try {
      await apiRequest(`/admin/users/${customer.user_id}/status`, 'PATCH', { status: 'ACTIVE' });
      fetchCustomers();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const viewHistory = async (customer) => {
    setSelectedCustomer(customer);
    try {
      setLoadingRides(true);
      const res = await apiRequest(`/admin/rides?customerId=${customer.user_id}`);
      setCustomerRides(res.data.items);
    } catch (err) {
      console.error('Failed to fetch customer rides', err);
    } finally {
      setLoadingRides(false);
    }
  };

  const quickReasons = [
    'Violation of Campus Community Safety Guidelines',
    'Repeated fake ride requests & abusive cancellations',
    'Unacceptable behavior towards campus drivers',
    'Payment disputes and fraudulent activity',
    'Account shared or unauthorized use'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Customer Directory ({total})</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage campus passenger accounts and suspension policies</p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search name, phone, email..."
                className="form-input"
                style={{ paddingLeft: '36px', height: '40px', fontSize: '13.5px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchCustomers}
              title="Refresh list"
              aria-label="Refresh list"
              style={{ height: '40px', padding: '0 14px' }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Rating</th>
                <th>Total Rides</th>
                <th>Account Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    <div>Loading customer accounts...</div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No customers found matching search.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={c.profile_image || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
                          alt={c.name}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <strong>{c.name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: #{c.user_id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{c.email}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.phone}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FBBF24' }}>
                        <Star size={14} fill="#FBBF24" />
                        <strong>{parseFloat(c.rating || 5.0).toFixed(1)}</strong>
                      </div>
                    </td>
                    <td>
                      <strong>{c.total_rides || 0}</strong> trips
                    </td>
                    <td>
                      {c.user_status === 'ACTIVE' ? (
                        <span className="badge badge-success">ACTIVE</span>
                      ) : c.user_status === 'SUSPENDED' ? (
                        <div>
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldAlert size={12} /> SUSPENDED
                          </span>
                          {c.suspension_reason && (
                            <div style={{
                              fontSize: '11px',
                              color: '#F87171',
                              marginTop: '4px',
                              maxWidth: '200px',
                              lineHeight: '1.3',
                              fontStyle: 'italic'
                            }}>
                              "{c.suspension_reason}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="badge badge-secondary">{c.user_status}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => viewHistory(c)}
                        >
                          Trips
                        </button>
                        {c.user_status === 'ACTIVE' ? (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleOpenSuspendModal(c)}
                            title="Suspend Customer Account"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <UserX size={13} /> Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => handleReactivateUser(c)}
                            title="Reactivate Customer Account"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <UserCheck size={13} /> Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspension Reason Dialog Modal */}
      {suspendingUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ border: '1px solid #EF4444', padding: 0 }}>
            <div style={{
              padding: '18px 24px',
              background: 'rgba(239, 68, 68, 0.12)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: '#EF4444',
                  color: '#fff',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#F87171', margin: 0 }}>Suspend Customer Account</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    User: <strong>{suspendingUser.name}</strong> ({suspendingUser.email})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSuspendingUser(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#FCD34D',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={15} color="#F59E0B" style={{ flexShrink: 0 }} />
                <span><strong>Important:</strong> The reason you specify below will be <strong>directly displayed to the customer</strong> in their Papido mobile app upon login or attempt to book rides.</span>
              </div>

              <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                Suspension Reason <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                className="form-input"
                rows="4"
                style={{ width: '100%', resize: 'vertical', fontSize: '13px', lineHeight: '1.4' }}
                placeholder="e.g. Violation of Campus Community Guidelines - Repeated cancellation of booked bike rides and inappropriate conduct."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
              />

              {/* Quick Preset Buttons */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Quick preset reasons:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {quickReasons.map((r, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSuspensionReason(r)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      + {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              background: 'rgba(0, 0, 0, 0.2)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isSubmittingSuspension}
                onClick={() => setSuspendingUser(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={isSubmittingSuspension || !suspensionReason.trim()}
                onClick={handleConfirmSuspension}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ShieldAlert size={15} />
                {isSubmittingSuspension ? 'Suspending...' : 'Confirm & Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Trip History Modal */}
      {selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px', padding: 0 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', margin: 0 }}>{selectedCustomer.name}'s Ride History</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{selectedCustomer.email} &bull; {selectedCustomer.phone}</div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedCustomer(null)}
              >
                Close
              </button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: '60vh' }}>
              {loadingRides ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading trips...</div>
              ) : customerRides.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No rides booked yet.</div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Route</th>
                        <th>Rider</th>
                        <th>Fare</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerRides.map(r => (
                        <tr key={r.id}>
                          <td><strong style={{ color: 'var(--primary)' }}>{r.ride_code}</strong></td>
                          <td>
                            <div style={{ fontSize: '12px' }}>{r.pickup_address}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>&rarr; {r.destination_address}</div>
                          </td>
                          <td>{r.rider_name || 'Unassigned'}</td>
                          <td><strong>₹{parseFloat(r.final_fare || r.estimated_fare).toFixed(2)}</strong></td>
                          <td>
                            <span className={`badge ${r.status === 'COMPLETED' ? 'badge-success' : 'badge-info'}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomersView;
