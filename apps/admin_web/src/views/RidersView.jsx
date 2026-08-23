import React, { useState, useEffect } from 'react';
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
  Users
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

  // View Mode: 'LEADERBOARD' or 'MANAGEMENT'
  const [activeTab, setActiveTab] = useState('LEADERBOARD');

  // Management State
  const [riders, setRiders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [selectedRider, setSelectedRider] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Leaderboard State (Monthly & Yearly)
  const [periodType, setPeriodType] = useState('ALL_TIME'); // Default to 'ALL_TIME' to immediately display lifetime completed rides
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [leaderboardFilter, setLeaderboardFilter] = useState('ALL'); // 'ALL' | 'TOP_PERFORMERS' | 'FLAGGED' | 'ONLINE' | 'SUSPENDED'
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [leaderboardData, setLeaderboardData] = useState({ items: [], summary: {}, total: 0 });
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Suspension Modal State
  const [suspendingRider, setSuspendingRider] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [isSubmittingSuspension, setIsSubmittingSuspension] = useState(false);

  // 1. Fetch Management Fleet Data
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

  // 2. Fetch Leaderboard Performance Data
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

  // Real-time socket listener for rider online/offline status changes
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

  // Handle Driver Suspension
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

  // Handle Driver Reactivation
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

  // Handle KYC Verification Status Change
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

  // Handle Driver Deletion
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
    <div>
      {/* Top View Mode Switcher Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-main, #FFFFFF)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={22} color="var(--primary)" />
            Riders & Fleet Operations
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Monitor student driver performance, rankings, quality alerts, and manage KYC documents.
          </p>
        </div>

        {/* View Mode Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-card, #1E293B)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid var(--border, rgba(255,255,255,0.1))',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('LEADERBOARD')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'LEADERBOARD' ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'transparent',
              color: activeTab === 'LEADERBOARD' ? '#FFFFFF' : 'var(--text-muted)'
            }}
          >
            <Trophy size={15} />
            <span>Performance Leaderboard</span>
            {summary.periodCompletedRides !== undefined && (
              <span style={{
                background: activeTab === 'LEADERBOARD' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.1)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: 800
              }}>
                {summary.periodCompletedRides} rides
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MANAGEMENT')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'MANAGEMENT' ? 'var(--primary, #38BDF8)' : 'transparent',
              color: activeTab === 'MANAGEMENT' ? '#0F172A' : 'var(--text-muted)'
            }}
          >
            <ShieldCheck size={15} />
            <span>Fleet & KYC Records</span>
            <span style={{
              background: activeTab === 'MANAGEMENT' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
              padding: '2px 6px',
              borderRadius: '10px',
              fontSize: '10px',
              fontWeight: 800
            }}>
              {total}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PERFORMANCE LEADERBOARD VIEW (MONTHLY & YEARLY)                        */}
      {/* ========================================================================= */}
      {activeTab === 'LEADERBOARD' && (
        <div>
          {/* Timeframe Selector & Period Filters Panel */}
          <div className="panel" style={{ marginBottom: '20px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              
              {/* Period Type Switcher (Monthly vs Yearly vs All-Time) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> Timeframe:
                </span>

                <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setPeriodType('ALL_TIME')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: periodType === 'ALL_TIME' ? 'var(--primary)' : 'transparent',
                      color: periodType === 'ALL_TIME' ? '#FFFFFF' : 'var(--text-muted)'
                    }}
                  >
                    All-Time
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodType('MONTHLY')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: periodType === 'MONTHLY' ? 'var(--primary)' : 'transparent',
                      color: periodType === 'MONTHLY' ? '#FFFFFF' : 'var(--text-muted)'
                    }}
                  >
                    Monthly View
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodType('YEARLY')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: periodType === 'YEARLY' ? 'var(--primary)' : 'transparent',
                      color: periodType === 'YEARLY' ? '#FFFFFF' : 'var(--text-muted)'
                    }}
                  >
                    Yearly View
                  </button>
                </div>

                {/* Specific Month Dropdown (If Monthly) */}
                {periodType === 'MONTHLY' && (
                  <select
                    className="form-select"
                    style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 700, minWidth: '150px' }}
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
                        <option key={idx + 1} value={idx + 1}>
                          {name} {selectedYear}
                        </option>
                      ))
                    )}
                  </select>
                )}

                {/* Specific Year Dropdown (If Yearly) */}
                {periodType === 'YEARLY' && (
                  <select
                    className="form-select"
                    style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 700, minWidth: '90px' }}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {[2026, 2025, 2024].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Search & Refresh */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'flex-end', minWidth: '260px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search rider name, phone, plate..."
                    className="form-input"
                    style={{ paddingLeft: '32px', paddingRight: '10px', fontSize: '12px', height: '34px', width: '100%' }}
                    value={leaderboardSearch}
                    onChange={(e) => setLeaderboardSearch(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={fetchLeaderboard}
                  title="Refresh Leaderboard Data"
                  style={{ height: '34px', width: '34px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <RefreshCw size={14} className={loadingLeaderboard ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Helper Banner when Monthly view has 0 rides */}
            {periodType === 'MONTHLY' && Number(summary.periodCompletedRides || 0) === 0 && (
              <div style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '8px',
                padding: '8px 14px',
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'var(--text-main, #FFFFFF)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={14} color="var(--primary)" />
                  <span>Viewing <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong> (0 rides in this month).</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPeriodType('ALL_TIME')}
                  style={{
                    background: 'var(--primary)',
                    color: '#0F172A',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  View All-Time Performance
                </button>
              </div>
            )}

            {/* Quality & Status Filter Tabs */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)',
              overflowX: 'auto',
              whiteSpace: 'nowrap'
            }}>
              <button
                type="button"
                onClick={() => setLeaderboardFilter('ALL')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: '1px solid',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderColor: leaderboardFilter === 'ALL' ? 'var(--primary)' : 'var(--border)',
                  background: leaderboardFilter === 'ALL' ? 'var(--primary)' : 'var(--bg-input)',
                  color: leaderboardFilter === 'ALL' ? '#FFFFFF' : 'var(--text-muted)'
                }}
              >
                All Ranked ({summary.totalRiders || 0})
              </button>

              <button
                type="button"
                onClick={() => setLeaderboardFilter('TOP_PERFORMERS')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: '1px solid',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderColor: leaderboardFilter === 'TOP_PERFORMERS' ? '#10B981' : 'var(--border)',
                  background: leaderboardFilter === 'TOP_PERFORMERS' ? '#10B981' : 'var(--bg-input)',
                  color: leaderboardFilter === 'TOP_PERFORMERS' ? '#FFFFFF' : '#10B981'
                }}
              >
                <Trophy size={13} />
                Top Performers (4.5★+)
              </button>

              <button
                type="button"
                onClick={() => setLeaderboardFilter('FLAGGED')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: '1.5px solid',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderColor: leaderboardFilter === 'FLAGGED' ? '#EF4444' : '#FCA5A5',
                  background: leaderboardFilter === 'FLAGGED' ? '#EF4444' : 'rgba(239, 68, 68, 0.1)',
                  color: leaderboardFilter === 'FLAGGED' ? '#FFFFFF' : '#EF4444'
                }}
              >
                <AlertTriangle size={13} />
                Flagged for Review ({summary.flaggedCount || 0})
              </button>

              <button
                type="button"
                onClick={() => setLeaderboardFilter('ONLINE')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: '1px solid',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderColor: leaderboardFilter === 'ONLINE' ? '#3B82F6' : 'var(--border)',
                  background: leaderboardFilter === 'ONLINE' ? '#3B82F6' : 'var(--bg-input)',
                  color: leaderboardFilter === 'ONLINE' ? '#FFFFFF' : '#38BDF8'
                }}
              >
                <CheckCircle2 size={13} />
                Online Now ({summary.onlineCount || 0})
              </button>

              <button
                type="button"
                onClick={() => setLeaderboardFilter('SUSPENDED')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: '1px solid',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderColor: leaderboardFilter === 'SUSPENDED' ? '#6B7280' : 'var(--border)',
                  background: leaderboardFilter === 'SUSPENDED' ? '#6B7280' : 'var(--bg-input)',
                  color: leaderboardFilter === 'SUSPENDED' ? '#FFFFFF' : 'var(--text-muted)'
                }}
              >
                <ShieldAlert size={13} />
                Suspended Riders
              </button>
            </div>
          </div>

          {/* 4 Summary Performance KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {/* Card 1: Champion Driver */}
            <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #F59E0B' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Trophy size={14} /> Rank #1 Champion
                </span>
                <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: '6px', fontWeight: 800 }}>
                  {periodType === 'MONTHLY' ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` : periodType === 'YEARLY' ? selectedYear : 'All-Time'}
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main, #FFFFFF)' }}>
                {topRiders[0] ? topRiders[0].name : 'No rides yet'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{topRiders[0]?.completed_rides || 0} completed rides</span>
                {topRiders[0] && (
                  <span style={{ color: '#FBBF24', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
                    <Star size={11} fill="#FBBF24" /> {topRiders[0].avg_rating}
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Period Ride Volume & Revenue */}
            <div className="panel" style={{ padding: '16px', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={14} color="var(--primary)" /> Period Completed Trips
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>
                {summary.periodCompletedRides || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Net Fleet Earnings: ₹{summary.periodTotalEarnings || 0}
              </div>
            </div>

            {/* Card 3: Fleet Average Rating */}
            <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #10B981' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={14} color="#10B981" /> Fleet Quality Score
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{summary.fleetAvgRating || '5.0'}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>/ 5.0</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Based on verified student passenger reviews
              </div>
            </div>

            {/* Card 4: Quality & Safety Flagged Alert */}
            <div className="panel" style={{ padding: '16px', borderLeft: (summary.flaggedCount || 0) > 0 ? '4px solid #EF4444' : '4px solid #10B981' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: (summary.flaggedCount || 0) > 0 ? '#EF4444' : '#10B981', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={14} /> Quality & Safety Flags
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: (summary.flaggedCount || 0) > 0 ? '#EF4444' : '#10B981' }}>
                {summary.flaggedCount || 0} Drivers
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {(summary.flaggedCount || 0) > 0 ? 'Low rating (< 3.5★) or high cancellation' : 'All drivers meeting quality standards'}
              </div>
            </div>
          </div>

          {/* Top 3 Champion Podium Cards (Shown when not in flagged filter) */}
          {leaderboardFilter === 'ALL' && topRiders.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}>
              {topRiders.map((rider, idx) => {
                const badgeColor = idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : '#D97706';
                const badgeBg = idx === 0 ? 'rgba(245, 158, 11, 0.15)' : idx === 1 ? 'rgba(148, 163, 184, 0.15)' : 'rgba(217, 119, 6, 0.15)';
                const rankTitle = idx === 0 ? 'Gold Winner' : idx === 1 ? 'Silver Runner-Up' : 'Bronze 3rd Place';

                return (
                  <div
                    key={rider.user_id}
                    className="panel"
                    style={{
                      padding: '18px',
                      border: `1.5px solid ${badgeColor}`,
                      position: 'relative',
                      background: 'var(--bg-card)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: badgeBg,
                          border: `2px solid ${badgeColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: badgeColor,
                          fontWeight: 900,
                          fontSize: '16px'
                        }}>
                          {idx === 0 ? <Trophy size={20} /> : idx === 1 ? <Medal size={20} /> : <Award size={20} />}
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: badgeColor, fontWeight: 800, textTransform: 'uppercase' }}>
                            {rankTitle}
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #FFFFFF)' }}>
                            {rider.name}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--primary)' }}>
                          {rider.completed_rides} Trips
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          ₹{rider.total_earnings}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={13} color="#FBBF24" fill="#FBBF24" />
                        <strong style={{ color: '#FBBF24' }}>{rider.avg_rating}</strong>
                        <span>({rider.rating_count} ratings)</span>
                      </div>
                      <div>
                        <span>Completion: </span>
                        <strong style={{ color: rider.completion_rate >= 90 ? '#10B981' : '#F59E0B' }}>
                          {rider.completion_rate}%
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detailed Leaderboard Performance Table */}
          <div className="panel">
            <div className="panel-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
              <div>
                <h3 className="panel-title" style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={18} color="var(--primary)" />
                  Ranked Fleet Leaderboard & Quality Audit
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Showing {leaderboardItems.length} riders sorted by total completed rides and passenger ratings.
                </p>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>
                Period: {periodType === 'MONTHLY' ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` : periodType === 'YEARLY' ? `Full Year ${selectedYear}` : 'All-Time'}
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Rank</th>
                    <th>Driver Details</th>
                    <th>Vehicle & Plate</th>
                    <th>Completed Trips</th>
                    <th>Rating & Reviews</th>
                    <th>Reliability / Drops</th>
                    <th>Quality Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLeaderboard ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                        <div>Computing performance leaderboard...</div>
                      </td>
                    </tr>
                  ) : leaderboardItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        <AlertCircle size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                        <div>No riders found matching the selected filter.</div>
                      </td>
                    </tr>
                  ) : (
                    leaderboardItems.map((r) => {
                      const isTop3 = r.rank <= 3;
                      const rankBadgeBg = r.rank === 1 ? '#FEF3C7' : r.rank === 2 ? '#F1F5F9' : r.rank === 3 ? '#FFEDD5' : 'transparent';
                      const rankBadgeColor = r.rank === 1 ? '#B45309' : r.rank === 2 ? '#475569' : r.rank === 3 ? '#C2410C' : 'var(--text-muted)';

                      return (
                        <tr key={r.user_id} style={{ background: r.has_critical_flag ? 'rgba(239, 68, 68, 0.04)' : undefined }}>
                          {/* Rank Column */}
                          <td>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: rankBadgeBg,
                              color: rankBadgeColor,
                              border: isTop3 ? `1.5px solid ${rankBadgeColor}` : '1px solid var(--border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: isTop3 ? '13px' : '12px'
                            }}>
                              {r.rank === 1 ? <Trophy size={14} /> : r.rank === 2 ? <Medal size={14} /> : r.rank === 3 ? <Award size={14} /> : `#${r.rank}`}
                            </div>
                          </td>

                          {/* Driver Details */}
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
                                      border: '1px solid #FCD34D',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}>
                                      <Star size={9} color="#D97706" /> CORE
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.phone}</div>
                              </div>
                            </div>
                          </td>

                          {/* Vehicle & Plate */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {r.vehicle_type === 'BIKE' ? <Bike size={14} color="var(--primary)" /> : <Car size={14} color="#38BDF8" />}
                              <strong style={{ fontSize: '12px' }}>{r.vehicle_model}</strong>
                            </div>
                            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                              {r.vehicle_number}
                            </div>
                          </td>

                          {/* Completed Trips & Earnings */}
                          <td>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>
                              {r.completed_rides} Trips
                            </div>
                            <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>
                              ₹{r.total_earnings}
                            </div>
                          </td>

                          {/* Rating & Reviews */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FBBF24' }}>
                              <Star size={14} fill="#FBBF24" />
                              <strong style={{ fontSize: '13px' }}>{r.avg_rating}</strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({r.rating_count})</span>
                            </div>
                          </td>

                          {/* Reliability / Completion Rate */}
                          <td>
                            <div style={{ minWidth: '120px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                                <span style={{ fontWeight: 700, color: r.completion_rate >= 90 ? '#10B981' : r.completion_rate >= 75 ? '#F59E0B' : '#EF4444' }}>
                                  {r.completion_rate}% Done
                                </span>
                                {r.cancelled_rides > 0 && (
                                  <span style={{ color: '#EF4444', fontSize: '10px' }}>
                                    {r.cancelled_rides} dropped
                                  </span>
                                )}
                              </div>
                              <div style={{ width: '100%', height: '5px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${Math.min(100, Math.max(0, r.completion_rate))}%`,
                                  height: '100%',
                                  background: r.completion_rate >= 90 ? '#10B981' : r.completion_rate >= 75 ? '#F59E0B' : '#EF4444',
                                  borderRadius: '3px'
                                }} />
                              </div>
                            </div>
                          </td>

                          {/* Quality Status Tags */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              {r.flags && r.flags.length > 0 ? (
                                r.flags.map((flag, fIdx) => (
                                  <span
                                    key={fIdx}
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      padding: '2px 7px',
                                      borderRadius: '6px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      background: flag.severity === 'danger' ? '#FEE2E2' : flag.severity === 'warning' ? '#FEF3C7' : '#E0F2FE',
                                      color: flag.severity === 'danger' ? '#991B1B' : flag.severity === 'warning' ? '#92400E' : '#075985',
                                      border: `1px solid ${flag.severity === 'danger' ? '#FCA5A5' : flag.severity === 'warning' ? '#FCD34D' : '#BAE6FD'}`
                                    }}
                                  >
                                    {flag.severity === 'danger' ? <AlertTriangle size={10} /> : <AlertCircle size={10} />}
                                    {flag.label}
                                  </span>
                                ))
                              ) : r.completed_rides > 0 ? (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: '#ECFDF5',
                                  color: '#065F46',
                                  border: '1px solid #A7F3D0',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}>
                                  <CheckCircle2 size={10} /> Good Standing
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Registered Rider</span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {r.user_status === 'SUSPENDED' ? (
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleReactivateDriver(r)}
                                  title="Reactivate Driver Account"
                                  style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Check size={12} /> Reactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() => {
                                    setSuspendingRider(r);
                                    setSuspensionReason(r.avg_rating < 3.5 ? `Low rating score (${r.avg_rating}/5.0)` : r.cancellation_rate >= 20 ? `High cancellation rate (${r.cancellation_rate}%)` : '');
                                  }}
                                  title="Suspend Driver Account"
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid #EF4444',
                                    color: '#F87171',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <ShieldAlert size={12} /> Suspend
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setSelectedRider(r)}
                                title="View Driver Details"
                                style={{ padding: '5px 8px' }}
                              >
                                <Eye size={12} />
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

      {/* ========================================================================= */}
      {/* 2. FLEET MANAGEMENT & KYC RECORDS VIEW                                     */}
      {/* ========================================================================= */}
      {activeTab === 'MANAGEMENT' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Fleet KYC & Driver Records ({total})</h2>
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
                                  border: '1px solid #FCD34D',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}>
                                  <Star size={9} color="#D97706" /> CORE
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
                              title="Reject KYC"
                            >
                              <X size={14} />
                            </button>
                          )}
                          {r.user_status === 'SUSPENDED' ? (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleReactivateDriver(r)}
                              title="Reactivate Suspended Driver"
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => {
                                setSuspendingRider(r);
                                setSuspensionReason('');
                              }}
                              title="Suspend Driver Account"
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
                              <ShieldAlert size={13} />
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
      )}

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
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <div>
                  Suspended drivers cannot receive rides, log in to duty shifts, or earn money until reactivated by an admin.
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 'bold' }}>
                  Suspension Reason (Visible to driver):
                </label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="e.g. Low customer rating (<3.5), high ride cancellations, reckless driving report..."
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSuspendingRider(null);
                    setSuspensionReason('');
                  }}
                  disabled={isSubmittingSuspension}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmSuspension}
                  disabled={isSubmittingSuspension || !suspensionReason.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSubmittingSuspension ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Suspending...
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={14} />
                      Confirm Suspension
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rider Detail & KYC Verification Modal */}
      {selectedRider && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <img
                  src={selectedRider.profile_image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                  alt={selectedRider.name}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedRider.name}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {selectedRider.email} &bull; {selectedRider.phone}
                  </div>
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedRider(null);
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>VEHICLE MODEL</div>
                <strong>{selectedRider.vehicle_model}</strong>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PLATE NUMBER</div>
                <strong>{selectedRider.vehicle_number}</strong>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>LICENSE NUMBER</div>
                <strong>{selectedRider.license_number}</strong>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>STATUS / GENDER</div>
                <strong>{selectedRider.user_status} &bull; {selectedRider.gender}</strong>
              </div>
            </div>

            {/* KYC Uploaded Documents Inspection Section */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} color="var(--primary)" />
                KYC Verification Documents
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {/* 1. Driving License */}
                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                    DRIVING LICENSE (DL)
                  </div>
                  {selectedRider.license_doc_url ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ height: '80px', background: '#0f172a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {isPdfDoc(selectedRider.license_doc_url) ? (
                          <FileText size={32} color="#f43f5e" />
                        ) : (
                          <img
                            src={resolveDocUrl(selectedRider.license_doc_url)}
                            alt="DL"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', padding: '4px 8px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
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
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
                      Not Uploaded
                    </div>
                  )}
                </div>

                {/* 2. Vehicle RC */}
                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                    VEHICLE RC BOOK
                  </div>
                  {selectedRider.rc_doc_url ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ height: '80px', background: '#0f172a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {isPdfDoc(selectedRider.rc_doc_url) ? (
                          <FileText size={32} color="#f43f5e" />
                        ) : (
                          <img
                            src={resolveDocUrl(selectedRider.rc_doc_url)}
                            alt="RC"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', padding: '4px 8px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
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
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
                      Not Uploaded
                    </div>
                  )}
                </div>

                {/* 3. Campus ID */}
                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                    CAMPUS / COLLEGE ID
                  </div>
                  {selectedRider.college_id_doc_url ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ height: '80px', background: '#0f172a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {isPdfDoc(selectedRider.college_id_doc_url) ? (
                          <FileText size={32} color="#f43f5e" />
                        ) : (
                          <img
                            src={resolveDocUrl(selectedRider.college_id_doc_url)}
                            alt="Campus ID"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', padding: '4px 8px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
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
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
                      Not Uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* KYC Approval Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    handleVerify(selectedRider, 'REJECTED');
                    setSelectedRider(null);
                  }}
                >
                  <X size={16} /> Reject Documents
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-success btn-sm"
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
