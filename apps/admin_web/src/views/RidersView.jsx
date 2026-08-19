import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useSocket } from '../context/SocketContext';
import { Search, Check, X, Star, ShieldCheck, ShieldAlert, Bike, Car, RefreshCw } from 'lucide-react';

export function RidersView() {
  const { socket } = useSocket() || {};
  const [riders, setRiders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderEarnings, setRiderEarnings] = useState(null);

  // Suspension Modal State
  const [suspendingRider, setSuspendingRider] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [isSubmittingSuspension, setIsSubmittingSuspension] = useState(false);

  const fetchRiders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (verificationFilter) params.append('verificationStatus', verificationFilter);
      if (vehicleFilter) params.append('vehicleType', vehicleFilter);

      const res = await apiRequest(`/admin/riders?${params.toString()}`);
      setRiders(res.data.items);
      setTotal(res.data.pagination.total);
    } catch (err) {
      console.error('Failed to fetch riders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSuspension = async () => {
    if (!suspensionReason.trim()) {
      alert('Please enter a valid suspension reason.');
      return;
    }

    try {
      setIsSubmittingSuspension(true);
      await apiRequest(`/admin/users/${suspendingRider.user_id}/status`, 'PATCH', {
        status: 'SUSPENDED',
        reason: suspensionReason.trim()
      });
      setSuspendingRider(null);
      setSuspensionReason('');
      fetchRiders();
    } catch (err) {
      alert(`Error suspending driver: ${err.message}`);
    } finally {
      setIsSubmittingSuspension(false);
    }
  };

  const handleReactivateDriver = async (rider) => {
    if (!confirm(`Are you sure you want to reactivate ${rider.name}'s driver account?`)) return;
    try {
      await apiRequest(`/admin/users/${rider.user_id}/status`, 'PATCH', { status: 'ACTIVE' });
      fetchRiders();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, [search, verificationFilter, vehicleFilter]);

  // Real-time socket listener for rider online/offline status changes
  useEffect(() => {
    if (!socket) return;

    const handleRiderStatusChanged = (payload) => {
      console.log('[Admin RidersView] Real-time rider status update received:', payload);
      setRiders(prev => prev.map(r => {
        if (r.user_id === payload.riderId || r.id === payload.riderId) {
          return { ...r, is_online: payload.isOnline ? 1 : 0 };
        }
        return r;
      }));
      fetchRiders();
    };

    socket.on('admin:rider_status_changed', handleRiderStatusChanged);

    return () => {
      socket.off('admin:rider_status_changed', handleRiderStatusChanged);
    };
  }, [socket]);

  const handleVerify = async (rider, newStatus) => {
    if (!confirm(`Are you sure you want to change KYC status of ${rider.name} to ${newStatus}?`)) return;
    try {
      await apiRequest(`/admin/riders/${rider.user_id}/verify`, 'PATCH', { status: newStatus });
      fetchRiders();
    } catch (err) {
      alert(`Error updating verification: ${err.message}`);
    }
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Riders & Driver Fleet ({total})</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Rider means the driver who provides the ride. Manage KYC verification and fleet status.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search rider, phone, plate..."
                className="form-input"
                style={{ paddingLeft: '36px', width: '100%' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="form-select"
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
            >
              <option value="">All Verification</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending KYC</option>
              <option value="REJECTED">Rejected</option>
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

            <button className="btn btn-secondary btn-sm" onClick={fetchRiders}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rider (Driver)</th>
                <th>Vehicle & License</th>
                <th>Live Status</th>
                <th>KYC Verification</th>
                <th>Rating</th>
                <th>Total Rides</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading riders...
                  </td>
                </tr>
              ) : riders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No riders found matching filter criteria.
                  </td>
                </tr>
              ) : (
                riders.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={r.profile_image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                          alt={r.name}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <strong>{r.name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {r.vehicle_type === 'BIKE' ? <Bike size={15} color="var(--primary)" /> : <Car size={15} color="#38BDF8" />}
                        <strong style={{ fontSize: '13px' }}>{r.vehicle_model}</strong>
                      </div>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        Plate: {r.vehicle_number} &bull; DL: {r.license_number}
                      </div>
                    </td>
                    <td>
                      {r.is_online ? (
                        <span className="badge badge-success" style={{ gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399' }} />
                          ONLINE
                        </span>
                      ) : (
                        <span className="badge badge-secondary">OFFLINE</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${
                        r.verification_status === 'APPROVED' ? 'badge-success' :
                        r.verification_status === 'PENDING' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {r.verification_status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FBBF24' }}>
                        <Star size={14} fill="#FBBF24" />
                        <strong>{parseFloat(r.rating || 5.0).toFixed(1)}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({r.total_ratings_count || 0})</span>
                      </div>
                    </td>
                    <td>
                      <strong>{r.total_rides || 0}</strong> rides
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedRider(r)}
                          title="Inspect KYC Documents"
                        >
                          View Docs
                        </button>
                        {r.verification_status !== 'APPROVED' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleVerify(r, 'APPROVED')}
                            title="Approve Driver KYC"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        {r.verification_status !== 'REJECTED' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleVerify(r, 'REJECTED')}
                            title="Reject Driver KYC"
                          >
                            <X size={14} />
                          </button>
                        )}
                        {r.user_status === 'ACTIVE' ? (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              setSuspendingRider(r);
                              setSuspensionReason('');
                            }}
                            title="Suspend Driver Account"
                            style={{ padding: '6px 8px' }}
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleReactivateDriver(r)}
                            title="Reactivate Driver Account"
                            style={{ padding: '6px 8px' }}
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                      {r.user_status === 'SUSPENDED' && (
                        <div style={{ marginTop: '4px' }}>
                          <span className="badge badge-danger" style={{ fontSize: '10px' }}>SUSPENDED</span>
                          {r.suspension_reason && (
                            <div style={{ fontSize: '10px', color: '#F87171', fontStyle: 'italic', marginTop: '2px', maxWidth: '160px' }}>
                              "{r.suspension_reason}"
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver Suspension Modal */}
      {suspendingRider && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid #EF4444',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px',
              background: 'rgba(239, 68, 68, 0.12)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                background: '#EF4444',
                color: '#fff',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#F87171', margin: 0 }}>Suspend Driver Account</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Driver: <strong>{suspendingRider.name}</strong> ({suspendingRider.vehicle_model} &bull; {suspendingRider.vehicle_number})
                </div>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#FCD34D'
              }}>
                ⚠️ The suspension reason you enter will be <strong>directly displayed to the driver</strong> in the mobile app.
              </div>

              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Suspension Reason <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                className="form-input"
                rows="4"
                style={{ width: '100%', resize: 'vertical', fontSize: '13px', lineHeight: '1.4' }}
                placeholder="e.g. Speeding on campus, rider complaints regarding safety, or expired document compliance."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
              />
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
                onClick={() => setSuspendingRider(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={isSubmittingSuspension || !suspensionReason.trim()}
                onClick={handleConfirmSuspension}
              >
                {isSubmittingSuspension ? 'Suspending...' : 'Confirm Driver Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KYC Document Inspection Modal */}
      {selectedRider && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card, #1e293b)',
            borderRadius: '16px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--border, rgba(255,255,255,0.1))'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                  Driver KYC & Credentials: {selectedRider.name}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Phone: {selectedRider.phone} &bull; Plate: {selectedRider.vehicle_number} &bull; Model: {selectedRider.vehicle_model}
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedRider(null)}
                style={{ padding: '6px 12px' }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {/* Driver Profile Photo */}
              <div style={{ background: 'var(--bg-sidebar, #0f172a)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--primary, #38bdf8)' }}>
                  📸 Driver Profile Photo
                </h4>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Face ID: <strong>{selectedRider.name}</strong>
                </div>
                {selectedRider.profile_image ? (
                  <a href={selectedRider.profile_image} target="_blank" rel="noreferrer">
                    <img
                      src={selectedRider.profile_image}
                      alt={selectedRider.name}
                      style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                    />
                  </a>
                ) : (
                  <div style={{ height: '140px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No Photo Uploaded
                  </div>
                )}
              </div>

              {/* Driving License */}
              <div style={{ background: 'var(--bg-sidebar, #0f172a)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--primary, #38bdf8)' }}>
                  1. Driving License (DL)
                </h4>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  No: <strong>{selectedRider.license_number}</strong>
                </div>
                {selectedRider.license_doc_url ? (
                  selectedRider.license_doc_url.toLowerCase().endsWith('.pdf') ? (
                    <div style={{ height: '140px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                      <div style={{ fontSize: '28px' }}>📄</div>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>PDF Document</span>
                      <a href={selectedRider.license_doc_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '11px' }}>
                        Open PDF
                      </a>
                    </div>
                  ) : (
                    <a href={selectedRider.license_doc_url} target="_blank" rel="noreferrer">
                      <img
                        src={selectedRider.license_doc_url}
                        alt="Driving License"
                        style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                      />
                    </a>
                  )
                ) : (
                  <div style={{ height: '140px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No DL Uploaded
                  </div>
                )}
              </div>

              {/* Vehicle RC */}
              <div style={{ background: 'var(--bg-sidebar, #0f172a)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--primary, #38bdf8)' }}>
                  2. Vehicle RC Card
                </h4>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Reg: <strong>{selectedRider.vehicle_number}</strong>
                </div>
                {selectedRider.rc_doc_url ? (
                  selectedRider.rc_doc_url.toLowerCase().endsWith('.pdf') ? (
                    <div style={{ height: '140px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                      <div style={{ fontSize: '28px' }}>📄</div>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>PDF Document</span>
                      <a href={selectedRider.rc_doc_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '11px' }}>
                        Open PDF
                      </a>
                    </div>
                  ) : (
                    <a href={selectedRider.rc_doc_url} target="_blank" rel="noreferrer">
                      <img
                        src={selectedRider.rc_doc_url}
                        alt="Vehicle RC"
                        style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                      />
                    </a>
                  )
                ) : (
                  <div style={{ height: '140px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No RC Uploaded
                  </div>
                )}
              </div>

              {/* College ID Card */}
              <div style={{ background: 'var(--bg-sidebar, #0f172a)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--primary, #38bdf8)' }}>
                  3. College / Campus ID
                </h4>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Affiliation: <strong>Campus Driver</strong>
                </div>
                {selectedRider.college_id_doc_url ? (
                  selectedRider.college_id_doc_url.toLowerCase().endsWith('.pdf') ? (
                    <div style={{ height: '140px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                      <div style={{ fontSize: '28px' }}>📄</div>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>PDF Document</span>
                      <a href={selectedRider.college_id_doc_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '11px' }}>
                        Open PDF
                      </a>
                    </div>
                  ) : (
                    <a href={selectedRider.college_id_doc_url} target="_blank" rel="noreferrer">
                      <img
                        src={selectedRider.college_id_doc_url}
                        alt="College ID"
                        style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                      />
                    </a>
                  )
                ) : (
                  <div style={{ height: '140px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No College ID Uploaded
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <div>
                Current Status:{' '}
                <span className={`badge ${
                  selectedRider.verification_status === 'APPROVED' ? 'badge-success' :
                  selectedRider.verification_status === 'PENDING' ? 'badge-warning' : 'badge-danger'
                }`}>
                  {selectedRider.verification_status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    handleVerify(selectedRider, 'REJECTED');
                    setSelectedRider(null);
                  }}
                >
                  <X size={16} /> Reject KYC
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => {
                    handleVerify(selectedRider, 'APPROVED');
                    setSelectedRider(null);
                  }}
                >
                  <Check size={16} /> Approve Driver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
