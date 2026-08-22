import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useSocket } from '../context/SocketContext';
import { Search, Check, X, Star, ShieldCheck, ShieldAlert, Bike, Car, RefreshCw, Eye, ExternalLink, FileText, Image as ImageIcon, Download, Trash2, Camera } from 'lucide-react';

const resolveDocUrl = (rawUrl) => {
  if (!rawUrl) return null;
  if (rawUrl.startsWith('data:') || rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('blob:')) {
    return rawUrl;
  }
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '').replace(/\/api$/, '');
  return `${apiBase}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
};

const isPdfDoc = (rawUrl) => {
  if (!rawUrl) return false;
  const s = String(rawUrl).toLowerCase();
  return s.startsWith('data:application/pdf') || s.endsWith('.pdf') || s.includes('.pdf?') || s.includes('mimetype=application/pdf');
};

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
  const [previewDoc, setPreviewDoc] = useState(null); // { title, url, isPdf }

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

  const handleDeleteDriver = async (rider) => {
    const confirmDelete = window.confirm(`Permanently delete driver "${rider.name}" (ID #${rider.user_id || rider.id}) from the database?\n\nThis will completely remove their profile, documents, and records.`);
    if (!confirmDelete) return;

    try {
      await apiRequest(`/admin/riders/${rider.user_id || rider.id}`, 'DELETE');
      fetchRiders();
    } catch (err) {
      alert(err.message || 'Failed to delete driver from database.');
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong>{r.name}</strong>
                            {Boolean(r.is_core_member) && (
                              <span style={{
                                background: '#FEF3C7',
                                color: '#92400E',
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: '6px',
                                border: '1px solid #FCD34D'
                              }}>
                                ⭐ CORE
                              </span>
                            )}
                          </div>
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
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteDriver(r)}
                          title="Permanently Delete Driver from Database"
                          style={{
                            padding: '6px 8px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid #EF4444',
                            color: '#F87171',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
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
                color: '#FCD34D',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={15} color="#F59E0B" style={{ flexShrink: 0 }} />
                <span>The suspension reason you enter will be <strong>directly displayed to the driver</strong> in the mobile app.</span>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSuspendingRider(null)}
                  disabled={isSubmittingSuspension}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleSubmitSuspension}
                  disabled={isSubmittingSuspension}
                >
                  {isSubmittingSuspension ? 'Suspending...' : 'Confirm Suspension'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KYC Documents Inspector Modal */}
      {selectedRider && (
        <div className="modal-backdrop" style={{
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
          <div className="modal" style={{
            background: 'var(--bg-card, #1e293b)',
            borderRadius: '16px',
            maxWidth: '850px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--border, rgba(255,255,255,0.1))'
          }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Driver KYC Documents & Profile Details</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Driver ID: #{selectedRider.user_id} • {selectedRider.name} ({selectedRider.phone})
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedRider(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {/* Driver Profile Photo */}
              {(() => {
                const photoUrl = resolveDocUrl(selectedRider.profile_image);
                return (
                  <div style={{ background: 'var(--bg-sidebar, #0f172a)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--primary, #38bdf8)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Camera size={15} /> Driver Profile Photo
                    </h4>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      Face ID: <strong>{selectedRider.name}</strong>
                    </div>
                    {photoUrl ? (
                      <div style={{ position: 'relative', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', height: '150px', background: '#000' }} onClick={() => setPreviewDoc({ title: `Face Photo: ${selectedRider.name}`, url: photoUrl, isPdf: false })}>
                        <img
                          src={photoUrl}
                          alt={selectedRider.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', fontSize: '11px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <Eye size={12} /> Click to Enlarge
                        </div>
                      </div>
                    ) : (
                      <div style={{ height: '150px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        No Photo Uploaded
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Driving License */}
              {(() => {
                const dlUrl = resolveDocUrl(selectedRider.license_doc_url);
                const isPdf = isPdfDoc(selectedRider.license_doc_url);
                return (
                  <div style={{ background: 'var(--bg-sidebar, #0f172a)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--primary, #38bdf8)' }}>
                      1. Driving Licence (DL)
                    </h4>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      License: <strong>{selectedRider.license_number || 'Submitted via Upload'}</strong>
                    </div>
                    {dlUrl ? (
                      isPdf ? (
                        <div style={{ height: '150px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                          <FileText size={32} color="#38bdf8" />
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>PDF Document</span>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ title: `Driving Licence: ${selectedRider.name}`, url: dlUrl, isPdf: true })}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={12} /> View PDF
                          </button>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', height: '150px', background: '#000' }} onClick={() => setPreviewDoc({ title: `Driving Licence: ${selectedRider.name}`, url: dlUrl, isPdf: false })}>
                          <img
                            src={dlUrl}
                            alt="Driving License"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', fontSize: '11px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Eye size={12} /> Click to Inspect
                          </div>
                        </div>
                      )
                    ) : (
                      <div style={{ height: '150px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        No DL Uploaded
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Vehicle RC */}
              {(() => {
                const rcUrl = resolveDocUrl(selectedRider.rc_doc_url);
                const isPdf = isPdfDoc(selectedRider.rc_doc_url);
                return (
                  <div style={{ background: 'var(--bg-sidebar, #0f172a)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--primary, #38bdf8)' }}>
                      2. Vehicle RC Document
                    </h4>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      Model: <strong>{selectedRider.vehicle_model}</strong>
                    </div>
                    {rcUrl ? (
                      isPdf ? (
                        <div style={{ height: '150px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                          <FileText size={32} color="#38bdf8" />
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>PDF Document</span>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ title: `Vehicle RC: ${selectedRider.name} (${selectedRider.vehicle_model})`, url: rcUrl, isPdf: true })}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={12} /> View PDF
                          </button>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', height: '150px', background: '#000' }} onClick={() => setPreviewDoc({ title: `Vehicle RC: ${selectedRider.name} (${selectedRider.vehicle_model})`, url: rcUrl, isPdf: false })}>
                          <img
                            src={rcUrl}
                            alt="Vehicle RC"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', fontSize: '11px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Eye size={12} /> Click to Inspect
                          </div>
                        </div>
                      )
                    ) : (
                      <div style={{ height: '150px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        No RC Uploaded
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* College ID Card */}
              {(() => {
                const cidUrl = resolveDocUrl(selectedRider.college_id_doc_url);
                const isPdf = isPdfDoc(selectedRider.college_id_doc_url);
                return (
                  <div style={{ background: 'var(--bg-sidebar, #0f172a)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--primary, #38bdf8)' }}>
                      3. Campus / College ID Card
                    </h4>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      Affiliation: <strong>Pondicherry University</strong>
                    </div>
                    {cidUrl ? (
                      isPdf ? (
                        <div style={{ height: '150px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                          <FileText size={32} color="#38bdf8" />
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>PDF Document</span>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ title: `Campus ID Card: ${selectedRider.name}`, url: cidUrl, isPdf: true })}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={12} /> View PDF
                          </button>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', height: '150px', background: '#000' }} onClick={() => setPreviewDoc({ title: `Campus ID Card: ${selectedRider.name}`, url: cidUrl, isPdf: false })}>
                          <img
                            src={cidUrl}
                            alt="College ID"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', fontSize: '11px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Eye size={12} /> Click to Inspect
                          </div>
                        </div>
                      )
                    ) : (
                      <div style={{ height: '150px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        No College ID Uploaded
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
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

      {/* Fullscreen Document Inspector Modal */}
      {previewDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100000,
          padding: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-card, #1e293b)',
            padding: '12px 20px',
            borderRadius: '12px 12px 0 0',
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            borderBottom: 'none'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--primary, #38bdf8)" /> {previewDoc.title}
            </h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <ExternalLink size={14} /> Open in New Tab
              </a>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setPreviewDoc(null)}
                style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <X size={14} /> Close
              </button>
            </div>
          </div>

          <div style={{
            flex: 1,
            background: '#0a0f1d',
            borderRadius: '0 0 12px 12px',
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            padding: '16px'
          }}>
            {previewDoc.isPdf ? (
              <iframe
                src={previewDoc.url}
                title={previewDoc.title}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
              />
            ) : (
              <img
                src={previewDoc.url}
                alt={previewDoc.title}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
