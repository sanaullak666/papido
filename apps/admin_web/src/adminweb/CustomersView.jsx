import React, { useState, useEffect } from 'react';
import './CustomersView.css';
import { apiRequest } from '../api';
import {
  Search,
  UserCheck,
  UserX,
  Star,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Edit,
  Check,
  X,
  Save,
  User,
  Eye,
  EyeOff,
  Users,
  Mail,
  Phone,
  History,
  Bike,
  ArrowRight,
  CircleDot,
  Wallet,
  TrendingUp
} from 'lucide-react';

export function CustomersView() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerRides, setCustomerRides] = useState([]);
  const [loadingRides, setLoadingRides] = useState(false);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showCustomerPassword, setShowCustomerPassword] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'OTHER',
    status: 'ACTIVE',
    password: ''
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

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

  const handleOpenEditModal = (customer) => {
    setEditingCustomer(customer);
    setShowCustomerPassword(false);
    setEditFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      gender: customer.gender || 'OTHER',
      status: customer.user_status || 'ACTIVE',
      password: ''
    });
    setEditError(null);
  };

  const handleSaveEditCustomer = async (e) => {
    if (e) e.preventDefault();
    if (!editFormData.name.trim()) { setEditError('Customer name is required.'); return; }
    if (!editFormData.email.trim()) { setEditError('Email address is required.'); return; }
    if (!editFormData.phone.trim()) { setEditError('Phone number is required.'); return; }
    if (editFormData.password && editFormData.password.trim().length > 0 && editFormData.password.trim().length < 6) {
      setEditError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      setEditError(null);
      const payload = {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim(),
        gender: editFormData.gender,
        status: editFormData.status
      };
      if (editFormData.password && editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }
      await apiRequest(`/admin/customers/${editingCustomer.user_id}`, 'PATCH', payload);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err) {
      setEditError(err.message || 'Failed to update customer details.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

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
    <div className="cv-page">
      {/* ============================================================
          DIRECTORY PANEL
          ============================================================ */}
      <div className="cv-panel">
        <div className="cv-panel-head">
          <div>
            <h2 className="cv-panel-title">Customer Directory</h2>
            <p className="cv-panel-sub">
              Manage campus passenger accounts and suspension policies · {total} total
            </p>
          </div>

          <div className="cv-panel-actions">
            <div className="cv-search-wrap">
              <Search size={16} className="cv-search-icon" />
              <input
                type="text"
                placeholder="Search name, phone, email..."
                className="cv-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="cv-icon-btn"
              onClick={fetchCustomers}
              title="Refresh list"
            >
              <RefreshCw size={14} className={loading ? 'cv-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="cv-table-wrap">
          <table className="cv-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Rating</th>
                <th>Total Rides</th>
                <th>Account Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="cv-table-loading">
                    <RefreshCw size={18} className="cv-spin" />
                    <div>Loading customer accounts...</div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="cv-table-empty">
                    <Users size={22} />
                    <div>No customers found matching search.</div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="cv-customer-cell">
                        <img
                          src={c.profile_image || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
                          alt={c.name}
                          className="cv-customer-avatar"
                        />
                        <div className="cv-customer-info">
                          <strong className="cv-customer-name">{c.name}</strong>
                          <div className="cv-customer-id">ID: #{c.user_id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cv-contact-email">{c.email}</div>
                      <div className="cv-contact-phone">{c.phone}</div>
                    </td>
                    <td>
                      <div className="cv-rating-cell">
                        <Star size={14} fill="#FBBF24" />
                        <strong>{parseFloat(c.rating || 5.0).toFixed(1)}</strong>
                      </div>
                    </td>
                    <td>
                      <strong className="cv-trips-value">{c.total_rides || 0}</strong>
                      <span className="cv-trips-label"> trips</span>
                    </td>
                    <td>
                      {c.user_status === 'ACTIVE' ? (
                        <span className="cv-status-pill cv-status-pill--active">ACTIVE</span>
                      ) : c.user_status === 'SUSPENDED' ? (
                        <div className="cv-suspension-cell">
                          <span className="cv-status-pill cv-status-pill--suspended">
                            <ShieldAlert size={12} /> SUSPENDED
                          </span>
                          {c.suspension_reason && (
                            <div className="cv-suspension-reason">
                              "{c.suspension_reason}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="cv-status-pill cv-status-pill--neutral">
                          {c.user_status}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="cv-row-actions">
                        <button
                          type="button"
                          className="cv-icon-btn"
                          onClick={() => handleOpenEditModal(c)}
                          title="Edit Passenger Profile Details"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          type="button"
                          className="cv-icon-btn"
                          onClick={() => viewHistory(c)}
                          title="View Ride History"
                        >
                          <History size={13} />
                        </button>
                        {c.user_status === 'ACTIVE' ? (
                          <button
                            type="button"
                            className="cv-icon-btn cv-icon-btn--danger"
                            onClick={() => handleOpenSuspendModal(c)}
                            title="Suspend Customer Account"
                          >
                            <UserX size={13} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="cv-icon-btn cv-icon-btn--success"
                            onClick={() => handleReactivateUser(c)}
                            title="Reactivate Customer Account"
                          >
                            <UserCheck size={13} />
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

      {/* ============================================================
          SUSPENSION MODAL
          ============================================================ */}
      {suspendingUser && (
        <div className="cv-modal-overlay" role="dialog" aria-modal="true">
          <div className="cv-modal cv-modal-in cv-modal--danger">
            <div className="cv-modal-head">
              <div className="cv-modal-head-icon cv-modal-head-icon--danger">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="cv-modal-title">Suspend Customer Account</h3>
                <p className="cv-modal-sub">
                  User: <strong>{suspendingUser.name}</strong> ({suspendingUser.email})
                </p>
              </div>
            </div>

            <div className="cv-warn-box">
              <AlertTriangle size={15} />
              <span>
                <strong>Important:</strong> The reason you specify below will be <strong>directly displayed to the customer</strong> in their Papido mobile app upon login or attempt to book rides.
              </span>
            </div>

            <div className="cv-modal-body">
              <label className="cv-modal-label">
                Suspension Reason <span className="cv-required">*</span>
              </label>
              <textarea
                className="cv-textarea"
                rows="4"
                placeholder="e.g. Violation of Campus Community Guidelines - Repeated cancellation of booked bike rides and inappropriate conduct."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
              />

              <div className="cv-quick-reasons">
                <div className="cv-quick-reasons-label">Quick preset reasons:</div>
                <div className="cv-quick-reasons-grid">
                  {quickReasons.map((r, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="cv-quick-reason"
                      onClick={() => setSuspensionReason(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="cv-modal-footer">
              <button
                type="button"
                className="cv-btn cv-btn--ghost"
                disabled={isSubmittingSuspension}
                onClick={() => setSuspendingUser(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cv-btn cv-btn--danger"
                disabled={isSubmittingSuspension || !suspensionReason.trim()}
                onClick={handleConfirmSuspension}
              >
                <ShieldAlert size={15} />
                {isSubmittingSuspension ? 'Suspending...' : 'Confirm & Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TRIP HISTORY MODAL
          ============================================================ */}
      {selectedCustomer && (
        <div className="cv-modal-overlay" role="dialog" aria-modal="true">
          <div className="cv-modal cv-modal-in cv-modal--wide">
            <div className="cv-modal-head">
              <div>
                <h3 className="cv-modal-title">
                  {selectedCustomer.name}'s Ride History
                </h3>
                <p className="cv-modal-sub">
                  {selectedCustomer.email} · {selectedCustomer.phone}
                </p>
              </div>
              <button
                type="button"
                className="cv-icon-btn"
                onClick={() => setSelectedCustomer(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="cv-modal-body cv-modal-body--scroll">
              {loadingRides ? (
                <div className="cv-table-loading">
                  <RefreshCw size={18} className="cv-spin" />
                  <div>Loading trips...</div>
                </div>
              ) : customerRides.length === 0 ? (
                <div className="cv-table-empty">
                  <History size={22} />
                  <div>No rides booked yet.</div>
                </div>
              ) : (
                <div className="cv-table-wrap">
                  <table className="cv-table cv-table--compact">
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
                          <td><strong className="cv-table-code">{r.ride_code}</strong></td>
                          <td>
                            <div className="cv-table-route">{r.pickup_address}</div>
                            <div className="cv-table-route-sub">
                              <ArrowRight size={11} /> {r.destination_address}
                            </div>
                          </td>
                          <td>{r.rider_name || 'Unassigned'}</td>
                          <td><strong className="cv-table-fare">₹{parseFloat(r.final_fare || r.estimated_fare).toFixed(2)}</strong></td>
                          <td>
                            <span className={`cv-trip-status cv-trip-status--${r.status === 'COMPLETED' ? 'complete' : 'info'}`}>
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

      {/* ============================================================
          EDIT CUSTOMER MODAL
          ============================================================ */}
      {editingCustomer && (
        <div className="cv-modal-overlay" role="dialog" aria-modal="true">
          <div className="cv-modal cv-modal-in cv-modal--wide">
            <div className="cv-modal-head">
              <div className="cv-modal-head-icon cv-modal-head-icon--amber">
                <User size={18} />
              </div>
              <div>
                <h3 className="cv-modal-title">Edit Passenger Details</h3>
                <p className="cv-modal-sub">Customer ID: #{editingCustomer.user_id}</p>
              </div>
              <button
                type="button"
                className="cv-icon-btn"
                onClick={() => setEditingCustomer(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditCustomer} className="cv-modal-form">
              {editError && (
                <div className="cv-alert cv-alert--error cv-slide-down">
                  <AlertTriangle size={15} /> {editError}
                </div>
              )}

              <div className="cv-field">
                <label className="cv-label">FULL PASSENGER NAME *</label>
                <input
                  type="text"
                  className="cv-input cv-input--block"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>

              <div className="cv-grid-2">
                <div className="cv-field">
                  <label className="cv-label">PHONE NUMBER *</label>
                  <input
                    type="text"
                    className="cv-input cv-input--block"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    required
                  />
                </div>

                <div className="cv-field">
                  <label className="cv-label">GENDER</label>
                  <select
                    className="cv-select"
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other / Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="cv-field">
                <label className="cv-label">EMAIL ADDRESS *</label>
                <input
                  type="email"
                  className="cv-input cv-input--block"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="e.g. student@pondiuni.ac.in"
                  required
                />
              </div>

              <div className="cv-field">
                <label className="cv-label">CHANGE PASSWORD (OPTIONAL)</label>
                <div className="cv-input-wrap">
                  <input
                    type={showCustomerPassword ? 'text' : 'password'}
                    className="cv-input cv-input--block cv-input--with-trail"
                    value={editFormData.password || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    placeholder="Leave blank to keep unchanged (min. 6 chars)"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="cv-input-trail"
                    onClick={() => setShowCustomerPassword(!showCustomerPassword)}
                    aria-label={showCustomerPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCustomerPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="cv-field-note">
                  Admins can reset or set a new password for this customer account.
                </div>
              </div>

              <div className="cv-field">
                <label className="cv-label">ACCOUNT STATUS</label>
                <select
                  className="cv-select"
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE (Normal Access)</option>
                  <option value="SUSPENDED">SUSPENDED (Blocked)</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="cv-modal-footer">
                <button
                  type="button"
                  className="cv-btn cv-btn--ghost"
                  onClick={() => setEditingCustomer(null)}
                  disabled={isSubmittingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cv-btn cv-btn--primary"
                  disabled={isSubmittingEdit}
                >
                  {isSubmittingEdit ? (
                    <><RefreshCw size={14} className="cv-spin" /> Saving Changes...</>
                  ) : (
                    <><Save size={14} /> Save Passenger Details</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default CustomersView;
