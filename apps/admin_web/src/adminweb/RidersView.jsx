import React, { useState, useEffect } from 'react';
import './RidersView.css';
import { apiRequest } from '../api';
import { useSocket } from '../context/SocketContext';
import {
  Search,
  Check,
  X,
  Star,
  ShieldCheck,
  ShieldAlert,
  Bike,
  Car,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Trash2,
  AlertTriangle,
  Trophy,
  Medal,
  Award,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Users,
  Edit,
  Save,
  User,
  Crown,
  ThumbsUp,
  Flag,
  Ban
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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

  const [activeTab, setActiveTab] = useState('LEADERBOARD');

  const [riders, setRiders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [selectedRider, setSelectedRider] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  const [periodType, setPeriodType] = useState('ALL_TIME');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [leaderboardFilter, setLeaderboardFilter] = useState('ALL');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [leaderboardData, setLeaderboardData] = useState({ items: [], summary: {}, total: 0 });
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const [editingRider, setEditingRider] = useState(null);
  const [showRiderPassword, setShowRiderPassword] = useState(false);
  const [editRiderForm, setEditRiderForm] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'OTHER',
    status: 'ACTIVE',
    password: '',
    vehicle_type: 'BIKE',
    vehicle_model: '',
    vehicle_number: '',
    license_number: '',
    upi_id: '',
    verification_status: 'APPROVED',
    is_core_member: false
  });
  const [isSubmittingRiderEdit, setIsSubmittingRiderEdit] = useState(false);
  const [editRiderError, setEditRiderError] = useState(null);

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
      setRiders(res.data.items || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch riders', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      const params = new URLSearchParams();
      params.append('periodType', periodType);
      params.append('year', selectedYear);
      params.append('month', selectedMonth);
      if (leaderboardSearch) params.append('search', leaderboardSearch);
      if (leaderboardFilter) params.append('filter', leaderboardFilter);

      const res = await apiRequest(`/admin/riders/leaderboard?${params.toString()}`);
      if (res.data) {
        setLeaderboardData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch rider leaderboard', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, [search, verificationFilter, vehicleFilter]);

  useEffect(() => {
    fetchLeaderboard();
  }, [periodType, selectedYear, selectedMonth, leaderboardSearch, leaderboardFilter]);

  useEffect(() => {
    if (!socket) return;

    const handleRiderStatusChanged = (payload) => {
      setRiders(prev => prev.map(r => {
        if (r.user_id === payload.riderId || r.id === payload.riderId) {
          return { ...r, is_online: payload.isOnline ? 1 : 0 };
        }
        return r;
      }));
      fetchRiders();
      fetchLeaderboard();
    };

    socket.on('admin:rider_status_changed', handleRiderStatusChanged);

    return () => {
      socket.off('admin:rider_status_changed', handleRiderStatusChanged);
    };
  }, [socket]);

  const handleOpenEditRiderModal = (rider) => {
    setEditingRider(rider);
    setShowRiderPassword(false);
    setEditRiderForm({
      name: rider.name || '',
      email: rider.email || '',
      phone: rider.phone || '',
      gender: rider.gender || 'OTHER',
      status: rider.user_status || rider.status || 'ACTIVE',
      password: '',
      vehicle_type: rider.vehicle_type || 'BIKE',
      vehicle_model: rider.vehicle_model || '',
      vehicle_number: rider.vehicle_number || '',
      license_number: rider.license_number || '',
      upi_id: rider.upi_id || '',
      verification_status: rider.verification_status || 'APPROVED',
      is_core_member: Boolean(rider.is_core_member)
    });
    setEditRiderError(null);
  };

  const handleSaveEditRider = async (e) => {
    if (e) e.preventDefault();
    if (!editRiderForm.name.trim()) { setEditRiderError('Driver name is required.'); return; }
    if (!editRiderForm.phone.trim()) { setEditRiderError('Phone number is required.'); return; }
    if (!editRiderForm.email.trim()) { setEditRiderError('Email address is required.'); return; }
    if (editRiderForm.password && editRiderForm.password.trim().length > 0 && editRiderForm.password.trim().length < 6) {
      setEditRiderError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmittingRiderEdit(true);
      setEditRiderError(null);
      const targetUserId = editingRider.user_id || editingRider.id;
      const payload = {
        name: editRiderForm.name.trim(),
        email: editRiderForm.email.trim(),
        phone: editRiderForm.phone.trim(),
        gender: editRiderForm.gender,
        status: editRiderForm.status,
        vehicleType: editRiderForm.vehicle_type,
        vehicleModel: editRiderForm.vehicle_model.trim(),
        vehicleNumber: editRiderForm.vehicle_number.trim(),
        licenseNumber: editRiderForm.license_number.trim(),
        upiId: editRiderForm.upi_id.trim(),
        verificationStatus: editRiderForm.verification_status,
        isCoreMember: editRiderForm.is_core_member
      };
      if (editRiderForm.password && editRiderForm.password.trim()) {
        payload.password = editRiderForm.password.trim();
      }
      await apiRequest(`/admin/riders/${targetUserId}`, 'PATCH', payload);
      setEditingRider(null);
      fetchRiders();
      fetchLeaderboard();
    } catch (err) {
      setEditRiderError(err.message || 'Failed to update driver details.');
    } finally {
      setIsSubmittingRiderEdit(false);
    }
  };

  const handleConfirmSuspension = async () => {
    if (!suspensionReason.trim()) {
      alert('Please enter a valid suspension reason.');
      return;
    }
    try {
      setIsSubmittingSuspension(true);
      const targetUserId = suspendingRider.user_id || suspendingRider.id;
      await apiRequest(`/admin/users/${targetUserId}/status`, 'PATCH', {
        status: 'SUSPENDED',
        reason: suspensionReason.trim()
      });
      setSuspendingRider(null);
      setSuspensionReason('');
      fetchRiders();
      fetchLeaderboard();
    } catch (err) {
      alert(`Error suspending driver: ${err.message}`);
    } finally {
      setIsSubmittingSuspension(false);
    }
  };

  const handleReactivateDriver = async (rider) => {
    if (!confirm(`Are you sure you want to reactivate ${rider.name}'s driver account?`)) return;
    try {
      const targetUserId = rider.user_id || rider.id;
      await apiRequest(`/admin/users/${targetUserId}/status`, 'PATCH', { status: 'ACTIVE' });
      fetchRiders();
      fetchLeaderboard();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleVerify = async (rider, newStatus) => {
    if (!confirm(`Are you sure you want to change KYC status of ${rider.name} to ${newStatus}?`)) return;
    try {
      await apiRequest(`/admin/riders/${rider.user_id}/verify`, 'PATCH', { status: newStatus });
      fetchRiders();
      fetchLeaderboard();
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
      fetchLeaderboard();
    } catch (err) {
      alert(err.message || 'Failed to delete driver from database.');
    }
  };

  const summary = leaderboardData.summary || {};
  const topRiders = summary.topRiders || [];
  const leaderboardItems = leaderboardData.items || [];
  const availableDates = summary.availableDates || [];

  return (
    <div className="rd-page">
      {/* ============================================================
          TOP HEADER
          ============================================================ */}
      <div className="rd-header">
        <div>
          <h2 className="rd-header-title">
            <Users size={22} color="#F59E0B" />
            Riders &amp; Fleet Operations
          </h2>
          <p className="rd-header-sub">
            Monitor student driver performance, rankings, quality alerts, and manage KYC documents.
          </p>
        </div>

        <div className="rd-view-switch">
          <button
            type="button"
            onClick={() => setActiveTab('LEADERBOARD')}
            className={`rd-view-btn ${activeTab === 'LEADERBOARD' ? 'is-active' : ''}`}
          >
            <Trophy size={15} />
            <span>Performance Leaderboard</span>
            {summary.periodCompletedRides !== undefined && (
              <span className="rd-view-count">{summary.periodCompletedRides} rides</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MANAGEMENT')}
            className={`rd-view-btn ${activeTab === 'MANAGEMENT' ? 'is-active rd-view-btn--cyan' : ''}`}
          >
            <ShieldCheck size={15} />
            <span>Fleet &amp; KYC Records</span>
            <span className="rd-view-count">{total}</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          LEADERBOARD TAB
          ============================================================ */}
      {activeTab === 'LEADERBOARD' && (
        <div className="rd-lb-wrap">
          {/* Filter panel */}
          <div className="rd-lb-filter rv-fade-up">
            <div className="rd-lb-filter-row">
              <div className="rd-lb-time-group">
                <span className="rd-lb-time-label">
                  <Calendar size={13} /> Timeframe:
                </span>

                <div className="rd-lb-switch">
                  <button
                    type="button"
                    onClick={() => setPeriodType('ALL_TIME')}
                    className={`rd-lb-switch-btn ${periodType === 'ALL_TIME' ? 'is-active' : ''}`}
                  >
                    All-Time
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('MONTHLY')}
                    className={`rd-lb-switch-btn ${periodType === 'MONTHLY' ? 'is-active' : ''}`}
                  >
                    Monthly View
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('YEARLY')}
                    className={`rd-lb-switch-btn ${periodType === 'YEARLY' ? 'is-active' : ''}`}
                  >
                    Yearly View
                  </button>
                </div>

                {periodType === 'MONTHLY' && (
                  <select
                    className="rd-select"
                    style={{ minWidth: 150 }}
                    value={availableDates.length > 0 ? `${selectedYear}-${selectedMonth}` : selectedMonth}
                    onChange={(e) => {
                      if (e.target.value.includes('-')) {
                        const [yr, mo] = e.target.value.split('-');
                        setSelectedYear(Number(yr));
                        setSelectedMonth(Number(mo));
                      } else {
                        setSelectedMonth(Number(e.target.value));
                      }
                    }}
                  >
                    {availableDates.length > 0 ? (
                      availableDates.map((d) => (
                        <option key={`${d.year}-${d.month}`} value={`${d.year}-${d.month}`}>
                          {d.label}
                        </option>
                      ))
                    ) : (
                      MONTH_NAMES.map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>{name} {selectedYear}</option>
                      ))
                    )}
                  </select>
                )}

                {periodType === 'YEARLY' && (
                  <select
                    className="rd-select"
                    style={{ minWidth: 90 }}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {[2026, 2025, 2024].map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="rd-lb-search-group">
                <div className="rd-search-wrap">
                  <Search size={14} className="rd-search-icon" />
                  <input
                    type="text"
                    placeholder="Search rider name, phone, plate..."
                    className="rd-input"
                    value={leaderboardSearch}
                    onChange={(e) => setLeaderboardSearch(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  onClick={fetchLeaderboard}
                  className="rd-icon-btn"
                  title="Refresh Leaderboard Data"
                >
                  <RefreshCw size={14} className={loadingLeaderboard ? 'rd-spin' : ''} />
                </button>
              </div>
            </div>

            {periodType === 'MONTHLY' && Number(summary.periodCompletedRides || 0) === 0 && (
              <div className="rd-lb-hint">
                <div className="rd-lb-hint-left">
                  <Calendar size={14} color="#F59E0B" />
                  <span>
                    Viewing <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong> (0 rides in this month).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPeriodType('ALL_TIME')}
                  className="rd-lb-hint-action"
                >
                  View All-Time Performance
                </button>
              </div>
            )}

            <div className="rd-lb-filter-chips">
              <button
                type="button"
                onClick={() => setLeaderboardFilter('ALL')}
                className={`rd-chip ${leaderboardFilter === 'ALL' ? 'is-active' : ''}`}
              >
                All Ranked ({summary.totalRiders || 0})
              </button>

              <button
                type="button"
                onClick={() => setLeaderboardFilter('TOP_PERFORMERS')}
                className={`rd-chip ${leaderboardFilter === 'TOP_PERFORMERS' ? 'is-active rd-chip--emerald' : ''}`}
              >
                <Trophy size={13} /> Top Performers (4.5+)
              </button>

              <button
                type="button"
                onClick={() => setLeaderboardFilter('FLAGGED')}
                className={`rd-chip ${leaderboardFilter === 'FLAGGED' ? 'is-active rd-chip--rose' : ''}`}
              >
                <AlertTriangle size={13} /> Flagged for Review ({summary.flaggedCount || 0})
              </button>

              <button
                type="button"
                onClick={() => setLeaderboardFilter('ONLINE')}
                className={`rd-chip ${leaderboardFilter === 'ONLINE' ? 'is-active rd-chip--cyan' : ''}`}
              >
                <CheckCircle2 size={13} /> Online Now ({summary.onlineCount || 0})
              </button>

              <button
                type="button"
                onClick={() => setLeaderboardFilter('SUSPENDED')}
                className={`rd-chip ${leaderboardFilter === 'SUSPENDED' ? 'is-active rd-chip--gray' : ''}`}
              >
                <ShieldAlert size={13} /> Suspended Riders
              </button>
            </div>
          </div>

          {/* KPI cards */}
          <div className="rd-lb-kpi-grid">
            <div className="rd-lb-kpi rd-lb-kpi--amber rd-fade-up">
              <div className="rd-lb-kpi-head">
                <span className="rd-lb-kpi-tag rd-lb-kpi-tag--amber">
                  <Trophy size={14} /> Rank #1 Champion
                </span>
                <span className="rd-lb-kpi-period">
                  {periodType === 'MONTHLY'
                    ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
                    : periodType === 'YEARLY'
                      ? selectedYear
                      : 'All-Time'}
                </span>
              </div>
              <div className="rd-lb-kpi-title">
                {topRiders[0] ? topRiders[0].name : 'No rides yet'}
              </div>
              <div className="rd-lb-kpi-sub">
                <span>{topRiders[0]?.completed_rides || 0} completed rides</span>
                {topRiders[0] && (
                  <span className="rd-lb-kpi-rating">
                    <Star size={11} fill="#FBBF24" color="#FBBF24" /> {topRiders[0].avg_rating}
                  </span>
                )}
              </div>
            </div>

            <div className="rd-lb-kpi rd-lb-kpi--primary rd-fade-up" style={{ animationDelay: '60ms' }}>
              <div className="rd-lb-kpi-label">
                <TrendingUp size={14} color="#F59E0B" /> Period Completed Trips
              </div>
              <div className="rd-lb-kpi-value rd-lb-kpi-value--primary">
                {summary.periodCompletedRides || 0}
              </div>
              <div className="rd-lb-kpi-sub">
                Net Fleet Earnings: ₹{summary.periodTotalEarnings || 0}
              </div>
            </div>

            <div className="rd-lb-kpi rd-lb-kpi--emerald rd-fade-up" style={{ animationDelay: '120ms' }}>
              <div className="rd-lb-kpi-label">
                <Star size={14} color="#10B981" /> Fleet Quality Score
              </div>
              <div className="rd-lb-kpi-value rd-lb-kpi-value--emerald">
                <span>{summary.fleetAvgRating || '5.0'}</span>
                <span className="rd-lb-kpi-value-sub">/ 5.0</span>
              </div>
              <div className="rd-lb-kpi-sub">
                Based on verified student passenger reviews
              </div>
            </div>

            <div className={`rd-lb-kpi rd-fade-up ${(summary.flaggedCount || 0) > 0 ? 'rd-lb-kpi--rose' : 'rd-lb-kpi--emerald'}`} style={{ animationDelay: '180ms' }}>
              <div className="rd-lb-kpi-label">
                <AlertTriangle size={14} /> Quality &amp; Safety Flags
              </div>
              <div className={`rd-lb-kpi-value ${(summary.flaggedCount || 0) > 0 ? 'rd-lb-kpi-value--rose' : 'rd-lb-kpi-value--emerald'}`}>
                {summary.flaggedCount || 0} Drivers
              </div>
              <div className="rd-lb-kpi-sub">
                {(summary.flaggedCount || 0) > 0
                  ? 'Low rating (below 3.5) or high cancellation'
                  : 'All drivers meeting quality standards'}
              </div>
            </div>
          </div>

          {/* Podium */}
          {leaderboardFilter === 'ALL' && topRiders.length > 0 && (
            <div className="rd-podium">
              {topRiders.map((rider, idx) => {
                const badgeColor = idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : '#D97706';
                const badgeBg = idx === 0
                  ? 'rgba(245, 158, 11, 0.15)'
                  : idx === 1
                    ? 'rgba(148, 163, 184, 0.15)'
                    : 'rgba(217, 119, 6, 0.15)';
                const rankTitle = idx === 0 ? 'Gold Winner' : idx === 1 ? 'Silver Runner-Up' : 'Bronze 3rd Place';

                return (
                  <div
                    key={rider.user_id}
                    className="rd-podium-card rd-fade-up"
                    style={{
                      animationDelay: `${idx * 80}ms`,
                      borderColor: badgeColor,
                      boxShadow: `0 12px 32px ${badgeColor}22`
                    }}
                  >
                    <div className="rd-podium-head">
                      <div className="rd-podium-left">
                        <div
                          className="rd-podium-badge"
                          style={{
                            background: badgeBg,
                            border: `2px solid ${badgeColor}`,
                            color: badgeColor
                          }}
                        >
                          {idx === 0 ? <Trophy size={20} /> : idx === 1 ? <Medal size={20} /> : <Award size={20} />}
                        </div>
                        <div>
                          <div className="rd-podium-rank" style={{ color: badgeColor }}>
                            {rankTitle}
                          </div>
                          <div className="rd-podium-name">{rider.name}</div>
                        </div>
                      </div>

                      <div className="rd-podium-stats">
                        <div className="rd-podium-trips">{rider.completed_rides} Trips</div>
                        <div className="rd-podium-earn">₹{rider.total_earnings}</div>
                      </div>
                    </div>

                    <div className="rd-podium-foot">
                      <div className="rd-podium-rating">
                        <Star size={13} color="#FBBF24" fill="#FBBF24" />
                        <strong>{rider.avg_rating}</strong>
                        <span>({rider.rating_count} ratings)</span>
                      </div>
                      <div className="rd-podium-completion">
                        Completion:{' '}
                        <strong className={rider.completion_rate >= 90 ? 'is-good' : 'is-warn'}>
                          {rider.completion_rate}%
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full leaderboard table */}
          <div className="rd-lb-panel">
            <div className="rd-lb-panel-head">
              <div>
                <h3 className="rd-panel-title">
                  <Award size={18} color="#F59E0B" />
                  Ranked Fleet Leaderboard &amp; Quality Audit
                </h3>
                <p className="rd-panel-sub">
                  Showing {leaderboardItems.length} riders sorted by total completed rides and passenger ratings.
                </p>
              </div>

              <div className="rd-lb-period-label">
                Period:{' '}
                {periodType === 'MONTHLY'
                  ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
                  : periodType === 'YEARLY'
                    ? `Full Year ${selectedYear}`
                    : 'All-Time'}
              </div>
            </div>

            <div className="rd-table-wrap">
              <table className="rd-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Rank</th>
                    <th>Driver Details</th>
                    <th>Vehicle &amp; Plate</th>
                    <th>Completed Trips</th>
                    <th>Rating &amp; Reviews</th>
                    <th>Reliability / Drops</th>
                    <th>Quality Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLeaderboard ? (
                    <tr>
                      <td colSpan="8" className="rd-table-loading">
                        <RefreshCw size={20} className="rd-spin" />
                        <div>Computing performance leaderboard...</div>
                      </td>
                    </tr>
                  ) : leaderboardItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="rd-table-empty">
                        <AlertCircle size={24} />
                        <div>No riders found matching the selected filter.</div>
                      </td>
                    </tr>
                  ) : (
                    leaderboardItems.map((r) => {
                      const isTop3 = r.rank <= 3;
                      const rankBadgeBg = r.rank === 1 ? 'rgba(245,158,11,0.15)' : r.rank === 2 ? 'rgba(148,163,184,0.15)' : r.rank === 3 ? 'rgba(217,119,6,0.15)' : 'transparent';
                      const rankBadgeColor = r.rank === 1 ? '#F59E0B' : r.rank === 2 ? '#94A3B8' : r.rank === 3 ? '#D97706' : '#64748B';

                      return (
                        <tr key={r.user_id} className={r.has_critical_flag ? 'is-flagged' : ''}>
                          <td>
                            <div
                              className="rd-rank-badge"
                              style={{
                                background: rankBadgeBg,
                                color: rankBadgeColor,
                                borderColor: isTop3 ? rankBadgeColor : '#23314E'
                              }}
                            >
                              {r.rank === 1 ? <Trophy size={14} /> : r.rank === 2 ? <Medal size={14} /> : r.rank === 3 ? <Award size={14} /> : `#${r.rank}`}
                            </div>
                          </td>

                          <td>
                            <div className="rd-driver-cell">
                              <img
                                src={r.profile_image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                                alt={r.name}
                                className="rd-driver-avatar"
                              />
                              <div className="rd-driver-info">
                                <div className="rd-driver-name-row">
                                  <strong className="rd-driver-name">{r.name}</strong>
                                  {Boolean(r.is_core_member) && (
                                    <span className="rd-core-chip">
                                      <Star size={9} color="#D97706" /> CORE
                                    </span>
                                  )}
                                </div>
                                <div className="rd-driver-phone">{r.phone}</div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="rd-vehicle-cell">
                              {r.vehicle_type === 'BIKE' ? <Bike size={14} color="#F59E0B" /> : <Car size={14} color="#38BDF8" />}
                              <strong className="rd-vehicle-model">{r.vehicle_model}</strong>
                            </div>
                            <div className="rd-vehicle-plate">{r.vehicle_number}</div>
                          </td>

                          <td>
                            <div className="rd-trips-value">{r.completed_rides} Trips</div>
                            <div className="rd-earnings-value">₹{r.total_earnings}</div>
                          </td>

                          <td>
                            <div className="rd-rating-cell">
                              <Star size={14} fill="#FBBF24" />
                              <strong>{r.avg_rating}</strong>
                              <span className="rd-rating-count">({r.rating_count})</span>
                            </div>
                          </td>

                          <td>
                            <div className="rd-reliability">
                              <div className="rd-reliability-head">
                                <span className={`rd-reliability-value ${r.completion_rate >= 90 ? 'is-good' : r.completion_rate >= 75 ? 'is-warn' : 'is-bad'}`}>
                                  {r.completion_rate}% Done
                                </span>
                                {r.cancelled_rides > 0 && (
                                  <span className="rd-reliability-drops">{r.cancelled_rides} dropped</span>
                                )}
                              </div>
                              <div className="rd-reliability-bar">
                                <div
                                  className={`rd-reliability-fill ${r.completion_rate >= 90 ? 'is-good' : r.completion_rate >= 75 ? 'is-warn' : 'is-bad'}`}
                                  style={{ width: `${Math.min(100, Math.max(0, r.completion_rate))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="rd-flags">
                              {r.flags && r.flags.length > 0 ? (
                                r.flags.map((flag, fIdx) => (
                                  <span
                                    key={fIdx}
                                    className={`rd-flag rd-flag--${flag.severity === 'danger' ? 'danger' : flag.severity === 'warning' ? 'warning' : 'info'}`}
                                  >
                                    {flag.severity === 'danger' ? <AlertTriangle size={10} /> : <AlertCircle size={10} />}
                                    {flag.label}
                                  </span>
                                ))
                              ) : r.completed_rides > 0 ? (
                                <span className="rd-flag rd-flag--success">
                                  <CheckCircle2 size={10} /> Good Standing
                                </span>
                              ) : (
                                <span className="rd-flag rd-flag--neutral">Registered Rider</span>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="rd-row-actions">
                              {r.user_status === 'SUSPENDED' ? (
                                <button
                                  type="button"
                                  onClick={() => handleReactivateDriver(r)}
                                  className="rd-icon-btn rd-icon-btn--success"
                                  title="Reactivate Driver Account"
                                >
                                  <Check size={13} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSuspendingRider(r);
                                    setSuspensionReason(
                                      r.avg_rating < 3.5
                                        ? `Low rating score (${r.avg_rating}/5.0)`
                                        : r.cancellation_rate >= 20
                                          ? `High cancellation rate (${r.cancellation_rate}%)`
                                          : ''
                                    );
                                  }}
                                  className="rd-icon-btn rd-icon-btn--danger"
                                  title="Suspend Driver Account"
                                >
                                  <ShieldAlert size={13} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEditRiderModal(r)}
                                className="rd-icon-btn"
                                title="Edit Driver Details"
                              >
                                <Edit size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedRider(r)}
                                className="rd-icon-btn"
                                title="View Driver Details"
                              >
                                <Eye size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MANAGEMENT TAB
          ============================================================ */}
      {activeTab === 'MANAGEMENT' && (
        <div className="rd-mgmt-wrap rd-fade-up">
          <div className="rd-mgmt-head">
            <div>
              <h2 className="rd-panel-title rd-panel-title--lg">
                Fleet KYC &amp; Driver Records ({total})
              </h2>
              <p className="rd-panel-sub">
                Rider means the driver who provides the ride. Manage KYC verification and fleet status.
              </p>
            </div>

            <div className="rd-mgmt-actions">
              <div className="rd-search-wrap">
                <Search size={14} className="rd-search-icon" />
                <input
                  type="text"
                  placeholder="Search rider, phone, plate..."
                  className="rd-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="rd-select"
              >
                <option value="">All Verification</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending KYC</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="rd-select"
              >
                <option value="">All Vehicles</option>
                <option value="BIKE">Bike</option>
                <option value="AUTO">Auto</option>
                <option value="CAB_MINI">Cab Mini</option>
                <option value="CAB_SEDAN">Cab Sedan</option>
              </select>

              <button
                type="button"
                onClick={fetchRiders}
                className="rd-icon-btn"
                title="Refresh"
              >
                <RefreshCw size={14} className={loading ? 'rd-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="rd-table-wrap rd-table-wrap--card">
            <table className="rd-table">
              <thead>
                <tr>
                  <th>Rider (Driver)</th>
                  <th>Vehicle &amp; License</th>
                  <th>Live Status</th>
                  <th>KYC Verification</th>
                  <th>Rating</th>
                  <th>Total Rides</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="rd-table-loading">Loading riders...</td></tr>
                ) : riders.length === 0 ? (
                  <tr><td colSpan="7" className="rd-table-empty">No riders found matching filter criteria.</td></tr>
                ) : (
                  riders.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="rd-driver-cell">
                          <img
                            src={r.profile_image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                            alt={r.name}
                            className="rd-driver-avatar"
                          />
                          <div className="rd-driver-info">
                            <div className="rd-driver-name-row">
                              <strong className="rd-driver-name">{r.name}</strong>
                              {Boolean(r.is_core_member) && (
                                <span className="rd-core-chip">
                                  <Star size={9} color="#D97706" /> CORE
                                </span>
                              )}
                            </div>
                            <div className="rd-driver-phone">{r.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="rd-vehicle-cell">
                          {r.vehicle_type === 'BIKE' ? <Bike size={15} color="#F59E0B" /> : <Car size={15} color="#38BDF8" />}
                          <strong className="rd-vehicle-model">{r.vehicle_model}</strong>
                        </div>
                        <div className="rd-vehicle-plate">
                          Plate: {r.vehicle_number} · DL: {r.license_number}
                        </div>
                      </td>
                      <td>
                        {r.is_online ? (
                          <span className="rd-status-pill rd-status-pill--online">
                            <span className="rd-status-dot" /> ONLINE
                          </span>
                        ) : (
                          <span className="rd-status-pill rd-status-pill--offline">OFFLINE</span>
                        )}
                      </td>
                      <td>
                        <span className={`rd-kyc-pill rd-kyc-pill--${r.verification_status === 'APPROVED' ? 'approved' : r.verification_status === 'PENDING' ? 'pending' : 'rejected'}`}>
                          {r.verification_status}
                        </span>
                      </td>
                      <td>
                        <div className="rd-rating-cell">
                          <Star size={14} fill="#FBBF24" />
                          <strong>{parseFloat(r.rating || 5.0).toFixed(1)}</strong>
                          <span className="rd-rating-count">({r.total_ratings_count || 0})</span>
                        </div>
                      </td>
                      <td>
                        <strong>{r.total_rides || 0}</strong> rides
                      </td>
                      <td>
                        <div className="rd-row-actions">
                          <button
                            type="button"
                            className="rd-icon-btn"
                            onClick={() => handleOpenEditRiderModal(r)}
                            title="Edit Driver Details"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            type="button"
                            className="rd-icon-btn"
                            onClick={() => setSelectedRider(r)}
                            title="Inspect KYC Documents"
                          >
                            <FileText size={13} />
                          </button>
                          {r.verification_status !== 'APPROVED' && (
                            <button
                              type="button"
                              className="rd-icon-btn rd-icon-btn--success"
                              onClick={() => handleVerify(r, 'APPROVED')}
                              title="Approve Driver KYC"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          {r.verification_status !== 'REJECTED' && (
                            <button
                              type="button"
                              className="rd-icon-btn rd-icon-btn--danger"
                              onClick={() => handleVerify(r, 'REJECTED')}
                              title="Reject KYC"
                            >
                              <X size={14} />
                            </button>
                          )}
                          {r.user_status === 'SUSPENDED' ? (
                            <button
                              type="button"
                              className="rd-icon-btn rd-icon-btn--success"
                              onClick={() => handleReactivateDriver(r)}
                              title="Reactivate Suspended Driver"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="rd-icon-btn rd-icon-btn--danger"
                              onClick={() => {
                                setSuspendingRider(r);
                                setSuspensionReason('');
                              }}
                              title="Suspend Driver Account"
                            >
                              <ShieldAlert size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="rd-icon-btn rd-icon-btn--danger-soft"
                            onClick={() => handleDeleteDriver(r)}
                            title="Permanently Delete Driver"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        {r.user_status === 'SUSPENDED' && (
                          <div className="rd-suspension-note">
                            <span className="rd-flag rd-flag--danger">SUSPENDED</span>
                            {r.suspension_reason && (
                              <div className="rd-suspension-reason">
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
      )}

      {/* ============================================================
          SUSPENSION MODAL
          ============================================================ */}
      {suspendingRider && (
        <div className="rd-modal-overlay" role="dialog" aria-modal="true">
          <div className="rd-modal rd-modal-in rd-modal--danger">
            <div className="rd-modal-head">
              <div className="rd-modal-head-icon rd-modal-head-icon--danger">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="rd-modal-title">Suspend Driver Account</h3>
                <p className="rd-modal-sub">
                  Driver: <strong>{suspendingRider.name}</strong> ({suspendingRider.vehicle_model} · {suspendingRider.vehicle_number})
                </p>
              </div>
            </div>

            <div className="rd-warn-box">
              <AlertTriangle size={18} />
              <div>
                Suspended drivers cannot receive rides, log in to duty shifts, or earn money until reactivated by an admin.
              </div>
            </div>

            <div className="rd-modal-body">
              <label className="rd-modal-label">
                Suspension Reason (Visible to driver):
              </label>
              <textarea
                className="rd-textarea"
                rows="3"
                placeholder="e.g. Low customer rating (below 3.5), high ride cancellations, reckless driving report..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                required
              />
            </div>

            <div className="rd-modal-footer">
              <button
                type="button"
                className="rd-btn rd-btn--ghost"
                onClick={() => { setSuspendingRider(null); setSuspensionReason(''); }}
                disabled={isSubmittingSuspension}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rd-btn rd-btn--danger"
                onClick={handleConfirmSuspension}
                disabled={isSubmittingSuspension || !suspensionReason.trim()}
              >
                {isSubmittingSuspension ? (
                  <><RefreshCw size={14} className="rd-spin" /> Suspending...</>
                ) : (
                  <><ShieldAlert size={14} /> Confirm Suspension</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          RIDER DETAIL / KYC MODAL
          ============================================================ */}
      {selectedRider && (
        <div className="rd-modal-overlay" role="dialog" aria-modal="true">
          <div className="rd-modal rd-modal-in rd-modal--wide">
            <div className="rd-modal-head">
              <div className="rd-rider-detail-head">
                <img
                  src={selectedRider.profile_image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                  alt={selectedRider.name}
                  className="rd-rider-detail-avatar"
                />
                <div>
                  <h3 className="rd-modal-title">{selectedRider.name}</h3>
                  <div className="rd-modal-sub">
                    {selectedRider.email} · {selectedRider.phone}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="rd-icon-btn"
                onClick={() => setSelectedRider(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rd-rider-meta-grid">
              <div className="rd-meta-cell">
                <div className="rd-meta-label">VEHICLE MODEL</div>
                <strong className="rd-meta-value">{selectedRider.vehicle_model}</strong>
              </div>
              <div className="rd-meta-cell">
                <div className="rd-meta-label">PLATE NUMBER</div>
                <strong className="rd-meta-value">{selectedRider.vehicle_number}</strong>
              </div>
              <div className="rd-meta-cell">
                <div className="rd-meta-label">LICENSE NUMBER</div>
                <strong className="rd-meta-value">{selectedRider.license_number}</strong>
              </div>
              <div className="rd-meta-cell">
                <div className="rd-meta-label">STATUS / GENDER</div>
                <strong className="rd-meta-value">{selectedRider.user_status} · {selectedRider.gender}</strong>
              </div>
            </div>

            <div className="rd-docs-section">
              <h4 className="rd-docs-title">
                <FileText size={16} color="#F59E0B" />
                KYC Verification Documents
              </h4>

              <div className="rd-docs-grid">
                {/* DL */}
                <div className="rd-doc-card">
                  <div className="rd-doc-label">DRIVING LICENSE (DL)</div>
                  {selectedRider.license_doc_url ? (
                    <div className="rd-doc-content">
                      <div className="rd-doc-preview">
                        {isPdfDoc(selectedRider.license_doc_url) ? (
                          <FileText size={32} color="#F43F5E" />
                        ) : (
                          <img
                            src={resolveDocUrl(selectedRider.license_doc_url)}
                            alt="DL"
                            className="rd-doc-image"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        className="rd-doc-inspect"
                        onClick={() => setPreviewDoc({
                          title: `Driving License - ${selectedRider.name}`,
                          url: resolveDocUrl(selectedRider.license_doc_url),
                          isPdf: isPdfDoc(selectedRider.license_doc_url)
                        })}
                      >
                        <Eye size={12} /> Inspect DL
                      </button>
                    </div>
                  ) : (
                    <div className="rd-doc-empty">Not Uploaded</div>
                  )}
                </div>

                {/* RC */}
                <div className="rd-doc-card">
                  <div className="rd-doc-label">VEHICLE RC BOOK</div>
                  {selectedRider.rc_doc_url ? (
                    <div className="rd-doc-content">
                      <div className="rd-doc-preview">
                        {isPdfDoc(selectedRider.rc_doc_url) ? (
                          <FileText size={32} color="#F43F5E" />
                        ) : (
                          <img
                            src={resolveDocUrl(selectedRider.rc_doc_url)}
                            alt="RC"
                            className="rd-doc-image"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        className="rd-doc-inspect"
                        onClick={() => setPreviewDoc({
                          title: `Vehicle RC Book - ${selectedRider.name}`,
                          url: resolveDocUrl(selectedRider.rc_doc_url),
                          isPdf: isPdfDoc(selectedRider.rc_doc_url)
                        })}
                      >
                        <Eye size={12} /> Inspect RC
                      </button>
                    </div>
                  ) : (
                    <div className="rd-doc-empty">Not Uploaded</div>
                  )}
                </div>

                {/* Campus ID */}
                <div className="rd-doc-card">
                  <div className="rd-doc-label">CAMPUS / COLLEGE ID</div>
                  {selectedRider.college_id_doc_url ? (
                    <div className="rd-doc-content">
                      <div className="rd-doc-preview">
                        {isPdfDoc(selectedRider.college_id_doc_url) ? (
                          <FileText size={32} color="#F43F5E" />
                        ) : (
                          <img
                            src={resolveDocUrl(selectedRider.college_id_doc_url)}
                            alt="Campus ID"
                            className="rd-doc-image"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        className="rd-doc-inspect"
                        onClick={() => setPreviewDoc({
                          title: `Campus ID Card - ${selectedRider.name}`,
                          url: resolveDocUrl(selectedRider.college_id_doc_url),
                          isPdf: isPdfDoc(selectedRider.college_id_doc_url)
                        })}
                      >
                        <Eye size={12} /> Inspect ID
                      </button>
                    </div>
                  ) : (
                    <div className="rd-doc-empty">Not Uploaded</div>
                  )}
                </div>
              </div>
            </div>

            <div className="rd-modal-footer rd-modal-footer--split">
              <button
                type="button"
                className="rd-btn rd-btn--danger"
                onClick={() => { handleVerify(selectedRider, 'REJECTED'); setSelectedRider(null); }}
              >
                <X size={16} /> Reject Documents
              </button>
              <button
                type="button"
                className="rd-btn rd-btn--success"
                onClick={() => { handleVerify(selectedRider, 'APPROVED'); setSelectedRider(null); }}
              >
                <Check size={16} /> Approve Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          FULLSCREEN DOC INSPECTOR
          ============================================================ */}
      {previewDoc && (
        <div className="rd-doc-inspector" role="dialog" aria-modal="true">
          <div className="rd-doc-inspector-head">
            <h3 className="rd-doc-inspector-title">
              <FileText size={18} color="#F59E0B" /> {previewDoc.title}
            </h3>
            <div className="rd-doc-inspector-actions">
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noreferrer"
                className="rd-btn rd-btn--ghost"
              >
                <ExternalLink size={14} /> Open in New Tab
              </a>
              <button
                type="button"
                className="rd-btn rd-btn--primary"
                onClick={() => setPreviewDoc(null)}
              >
                <X size={14} /> Close
              </button>
            </div>
          </div>

          <div className="rd-doc-inspector-body">
            {previewDoc.isPdf ? (
              <iframe
                src={previewDoc.url}
                title={previewDoc.title}
                className="rd-doc-inspector-frame"
              />
            ) : (
              <img
                src={previewDoc.url}
                alt={previewDoc.title}
                className="rd-doc-inspector-image"
              />
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          EDIT DRIVER MODAL
          ============================================================ */}
      {editingRider && (
        <div className="rd-modal-overlay" role="dialog" aria-modal="true">
          <div className="rd-modal rd-modal-in rd-modal--wide">
            <div className="rd-modal-head">
              <div className="rd-modal-head-icon rd-modal-head-icon--amber">
                <Bike size={18} />
              </div>
              <div>
                <h3 className="rd-modal-title">Edit Driver Profile Details</h3>
                <p className="rd-modal-sub">Driver ID: #{editingRider.user_id || editingRider.id}</p>
              </div>
              <button
                type="button"
                className="rd-icon-btn"
                onClick={() => setEditingRider(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditRider} className="rd-modal-form">
              {editRiderError && (
                <div className="rd-alert rd-alert--error rd-slide-down">
                  {editRiderError}
                </div>
              )}

              <div className="rd-form-section">
                <div className="rd-form-section-title">
                  1. Personal &amp; Contact Information
                </div>

                <div className="rd-field">
                  <label className="rd-label">FULL NAME *</label>
                  <input
                    type="text"
                    className="rd-input"
                    value={editRiderForm.name}
                    onChange={(e) => setEditRiderForm({ ...editRiderForm, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    required
                  />
                </div>

                <div className="rd-grid-2">
                  <div className="rd-field">
                    <label className="rd-label">PHONE NUMBER *</label>
                    <input
                      type="text"
                      className="rd-input"
                      value={editRiderForm.phone}
                      onChange={(e) => setEditRiderForm({ ...editRiderForm, phone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      required
                    />
                  </div>

                  <div className="rd-field">
                    <label className="rd-label">GENDER</label>
                    <select
                      className="rd-select rd-select--block"
                      value={editRiderForm.gender}
                      onChange={(e) => setEditRiderForm({ ...editRiderForm, gender: e.target.value })}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="rd-field">
                  <label className="rd-label">EMAIL ADDRESS *</label>
                  <input
                    type="email"
                    className="rd-input"
                    value={editRiderForm.email}
                    onChange={(e) => setEditRiderForm({ ...editRiderForm, email: e.target.value })}
                    placeholder="e.g. driver@pondiuni.ac.in"
                    required
                  />
                </div>

                <div className="rd-field">
                  <label className="rd-label">CHANGE PASSWORD (OPTIONAL)</label>
                  <div className="rd-input-wrap">
                    <input
                      type={showRiderPassword ? 'text' : 'password'}
                      className="rd-input rd-input--with-trail"
                      value={editRiderForm.password || ''}
                      onChange={(e) => setEditRiderForm({ ...editRiderForm, password: e.target.value })}
                      placeholder="Leave blank to keep unchanged (min. 6 chars)"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRiderPassword(!showRiderPassword)}
                      className="rd-input-trail"
                      aria-label={showRiderPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRiderPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="rd-field-note">
                    Admins can reset or set a new password for this driver account.
                  </div>
                </div>
              </div>

              <div className="rd-form-section">
                <div className="rd-form-section-title">
                  2. Vehicle &amp; Driving License Details
                </div>

                <div className="rd-grid-2">
                  <div className="rd-field">
                    <label className="rd-label">VEHICLE TYPE *</label>
                    <select
                      className="rd-select rd-select--block"
                      value={editRiderForm.vehicle_type}
                      onChange={(e) => setEditRiderForm({ ...editRiderForm, vehicle_type: e.target.value })}
                    >
                      <option value="BIKE">Motorcycle / Bike</option>
                      <option value="SCOOTER">Scooter / Scooty</option>
                      <option value="AUTO">Auto Rickshaw</option>
                      <option value="CAB_MINI">Cab Mini</option>
                      <option value="CAB_SEDAN">Cab Sedan</option>
                    </select>
                  </div>

                  <div className="rd-field">
                    <label className="rd-label">VEHICLE MODEL *</label>
                    <input
                      type="text"
                      className="rd-input"
                      value={editRiderForm.vehicle_model}
                      onChange={(e) => setEditRiderForm({ ...editRiderForm, vehicle_model: e.target.value })}
                      placeholder="e.g. TVS Jupiter 125"
                    />
                  </div>
                </div>

                <div className="rd-grid-2">
                  <div className="rd-field">
                    <label className="rd-label">LICENSE PLATE NUMBER *</label>
                    <input
                      type="text"
                      className="rd-input"
                      value={editRiderForm.vehicle_number}
                      onChange={(e) => setEditRiderForm({ ...editRiderForm, vehicle_number: e.target.value })}
                      placeholder="e.g. PY-01-SC-2002"
                    />
                  </div>

                  <div className="rd-field">
                    <label className="rd-label">DRIVING LICENSE NUMBER</label>
                    <input
                      type="text"
                      className="rd-input"
                      value={editRiderForm.license_number}
                      onChange={(e) => setEditRiderForm({ ...editRiderForm, license_number: e.target.value })}
                      placeholder="e.g. DL-PY0120220012345"
                    />
                  </div>
                </div>

                <div className="rd-field">
                  <label className="rd-label">DRIVER UPI ID</label>
                  <input
                    type="text"
                    className="rd-input"
                    value={editRiderForm.upi_id}
                    onChange={(e) => setEditRiderForm({ ...editRiderForm, upi_id: e.target.value })}
                    placeholder="e.g. driver@oksbi or 9876543210@paytm"
                  />
                </div>
              </div>

              <div className="rd-form-section">
                <div className="rd-form-section-title">
                  3. Administration &amp; KYC Status
                </div>

                <div className="rd-grid-3">
                  <div className="rd-field">
                    <label className="rd-label">KYC STATUS</label>
                    <select
                      className="rd-select rd-select--block"
                      value={editRiderForm.verification_status}
                      onChange={(e) => setEditRiderForm({ ...editRiderForm, verification_status: e.target.value })}
                    >
                      <option value="APPROVED">APPROVED (Verified)</option>
                      <option value="PENDING">PENDING (Under Review)</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>

                  <div className="rd-field">
                    <label className="rd-label">ACCOUNT ACCESS</label>
                    <select
                      className="rd-select rd-select--block"
                      value={editRiderForm.status}
                      onChange={(e) => setEditRiderForm({ ...editRiderForm, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE (Normal)</option>
                      <option value="SUSPENDED">SUSPENDED (Blocked)</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>

                  <div className="rd-field">
                    <label className="rd-label">CORE MEMBER</label>
                    <select
                      className="rd-select rd-select--block"
                      value={editRiderForm.is_core_member ? 'YES' : 'NO'}
                      onChange={(e) => setEditRiderForm({ ...editRiderForm, is_core_member: e.target.value === 'YES' })}
                    >
                      <option value="YES">Yes (Core Member)</option>
                      <option value="NO">No (Regular Driver)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rd-modal-footer">
                <button
                  type="button"
                  className="rd-btn rd-btn--ghost"
                  onClick={() => setEditingRider(null)}
                  disabled={isSubmittingRiderEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rd-btn rd-btn--primary"
                  disabled={isSubmittingRiderEdit}
                >
                  {isSubmittingRiderEdit ? (
                    <><RefreshCw size={14} className="rd-spin" /> Saving Driver Details...</>
                  ) : (
                    <><Save size={14} /> Save Driver Details</>
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
export default RidersView;
