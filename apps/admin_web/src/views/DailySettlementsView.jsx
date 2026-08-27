import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  Calendar,
  Search,
  RefreshCw,
  Download,
  DollarSign,
  Building2,
  ShieldCheck,
  CreditCard,
  Coins,
  Navigation,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  FileText,
  Copy,
  Check,
  AlertCircle,
  UserCheck,
  Save,
  User,
  Phone,
  Mail,
  Shield
} from 'lucide-react';

const getTodayDateString = () => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch (_) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

const getYesterdayDateString = () => {
  try {
    const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch (_) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

export function DailySettlementsView() {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [settlementData, setSettlementData] = useState(null);
  const [selectedRider, setSelectedRider] = useState(null);
  const [copiedRiderId, setCopiedRiderId] = useState(null);
  const [updatingRiderId, setUpdatingRiderId] = useState(null);

  // Admin Platform Settlement UPI Settings State
  const [adminUpiId, setAdminUpiId] = useState('papido.admin@okaxis');
  const [adminName, setAdminName] = useState('Papido Campus Operations');
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');
  const [rejectionModalRider, setRejectionModalRider] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Duty Controller State (Core Member Shift)
  const [selectedCoreMemberId, setSelectedCoreMemberId] = useState('');
  const [controllerPayoutStatus, setControllerPayoutStatus] = useState('PENDING');
  const [controllerNotes, setControllerNotes] = useState('');
  const [isSavingController, setIsSavingController] = useState(false);
  const [controllerSuccessMsg, setControllerSuccessMsg] = useState('');

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (search.trim()) params.append('search', search.trim());

      const res = await apiRequest(`/admin/daily-settlements?${params.toString()}`);
      setSettlementData(res.data);

      if (res.data?.adminSettings) {
        setAdminUpiId(res.data.adminSettings.adminUpiId || 'papido.admin@okaxis');
        setAdminName(res.data.adminSettings.adminName || 'Papido Campus Operations');
        setAutoLockEnabled(res.data.adminSettings.autoLockEnabled !== false);
      }

      if (res.data?.dutyController) {
        setSelectedCoreMemberId(String(res.data.dutyController.coreMemberId));
        setControllerPayoutStatus(res.data.dutyController.payoutStatus || 'PENDING');
        setControllerNotes(res.data.dutyController.notes || '');
      } else {
        setSelectedCoreMemberId('');
        setControllerPayoutStatus('PENDING');
        setControllerNotes('');
      }
    } catch (err) {
      console.error('Failed to fetch daily settlements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, [selectedDate, search]);

  const handleSaveAdminSettings = async (e) => {
    if (e) e.preventDefault();
    if (!adminUpiId.trim()) {
      alert('Please enter a valid Admin UPI ID.');
      return;
    }
    try {
      setIsSavingSettings(true);
      setSettingsSuccessMsg('');
      await apiRequest('/admin/daily-settlements/settings', 'POST', {
        upiId: adminUpiId.trim(),
        adminName: adminName.trim(),
        autoLockEnabled
      });
      setSettingsSuccessMsg('Admin settlement UPI details & lock settings saved successfully.');
      setTimeout(() => setSettingsSuccessMsg(''), 4000);
    } catch (err) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleApproveSettlement = async (rider) => {
    try {
      setUpdatingRiderId(rider.riderId);
      await apiRequest('/admin/daily-settlements/status', 'PATCH', {
        riderId: rider.riderId,
        date: selectedDate,
        status: 'SETTLED'
      });
      fetchSettlements();
    } catch (err) {
      alert(`Failed to approve settlement: ${err.message}`);
    } finally {
      setUpdatingRiderId(null);
    }
  };

  const handleRejectSettlement = async () => {
    if (!rejectionModalRider) return;
    try {
      setUpdatingRiderId(rejectionModalRider.riderId);
      await apiRequest('/admin/daily-settlements/status', 'PATCH', {
        riderId: rejectionModalRider.riderId,
        date: selectedDate,
        status: 'REJECTED',
        reason: rejectionReason.trim() || 'Payment verification failed'
      });
      setRejectionModalRider(null);
      setRejectionReason('');
      fetchSettlements();
    } catch (err) {
      alert(`Failed to reject settlement: ${err.message}`);
    } finally {
      setUpdatingRiderId(null);
    }
  };

  const handleSaveDutyController = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCoreMemberId) {
      alert('Please select a Core Member to assign as the duty controller.');
      return;
    }

    try {
      setIsSavingController(true);
      setControllerSuccessMsg('');
      const res = await apiRequest('/admin/daily-settlements/controller', 'POST', {
        date: selectedDate,
        coreMemberId: parseInt(selectedCoreMemberId, 10),
        payoutStatus: controllerPayoutStatus,
        notes: controllerNotes.trim()
      });
      setSettlementData(res.data);
      setControllerSuccessMsg('Duty Controller saved successfully for ' + selectedDate);
      setTimeout(() => setControllerSuccessMsg(''), 4000);
    } catch (err) {
      alert(`Failed to save duty controller: ${err.message}`);
    } finally {
      setIsSavingController(false);
    }
  };

  const handleToggleSettlement = async (rider) => {
    try {
      setUpdatingRiderId(rider.riderId);
      const nextStatus = rider.settlementStatus === 'SETTLED' ? 'UNSETTLED' : 'SETTLED';
      await apiRequest('/admin/daily-settlements/status', 'PATCH', {
        riderId: rider.riderId,
        date: selectedDate,
        status: nextStatus
      });
      fetchSettlements();
      if (selectedRider && selectedRider.riderId === rider.riderId) {
        setSelectedRider((prev) => (prev ? { ...prev, settlementStatus: nextStatus } : null));
      }
    } catch (err) {
      alert(`Failed to update settlement status: ${err.message}`);
    } finally {
      setUpdatingRiderId(null);
    }
  };

  const copyRiderStatement = (rider) => {
    const text = [
      `*PAPIDO DAILY SETTLEMENT STATEMENT*`,
      `Date: ${selectedDate}`,
      `Driver: ${rider.riderName} (${rider.riderPhone})`,
      `Vehicle: ${rider.vehicleModel} [${rider.vehicleNumber}]`,
      `---------------------------------`,
      `Completed Trips: ${rider.totalTrips}`,
      `Total Gross Fare Collected: Rs. ${rider.grossFare.toFixed(2)}`,
      `---------------------------------`,
      `DEDUCTIONS:`,
      `- Company Platform Share: Rs. ${rider.companyDue.toFixed(2)}`,
      `- Controller Pool Share (Rs. 2/ride): Rs. ${rider.controllerDue.toFixed(2)}`,
      `*TOTAL DUE TO PAY PAPIDO: Rs. ${rider.totalDeductionDue.toFixed(2)}*`,
      `---------------------------------`,
      `Driver Net Earnings Kept: Rs. ${rider.riderNetEarnings.toFixed(2)}`,
      `Status: ${rider.settlementStatus}`
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedRiderId(rider.riderId);
    setTimeout(() => setCopiedRiderId(null), 2500);
  };

  const exportCSV = () => {
    if (!settlementData || !settlementData.riders || settlementData.riders.length === 0) {
      return alert('No settlement records found for the selected date to export.');
    }

    const headers = [
      'Date',
      'Driver ID',
      'Driver Name',
      'Driver Phone',
      'Vehicle Model',
      'Vehicle Number',
      'Completed Trips',
      'Gross Fare (INR)',
      'Company Due (INR)',
      'Controller Due (INR)',
      'Total Due to Collect (INR)',
      'Driver Net Earnings (INR)',
      'Settlement Status'
    ];

    const rows = settlementData.riders.map((r) => [
      selectedDate,
      r.riderId,
      `"${r.riderName.replace(/"/g, '""')}"`,
      r.riderPhone,
      `"${r.vehicleModel.replace(/"/g, '""')}"`,
      r.vehicleNumber,
      r.totalTrips,
      r.grossFare.toFixed(2),
      r.companyDue.toFixed(2),
      r.controllerDue.toFixed(2),
      r.totalDeductionDue.toFixed(2),
      r.riderNetEarnings.toFixed(2),
      r.settlementStatus
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `papido_daily_settlements_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = settlementData?.summary || {
    totalRides: 0,
    totalActiveRiders: 0,
    totalGrossVolume: 0,
    totalCompanyCut: 0,
    totalControllerCut: 0,
    totalDeductionsDue: 0,
    totalRiderNet: 0
  };

  const riders = settlementData?.riders || [];
  const availableCoreMembers = settlementData?.availableCoreMembers || [];
  const dutyController = settlementData?.dutyController || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Filter Controls Panel */}
      <div className="panel">
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={20} color="var(--primary)" />
              Daily Rider Deductions &amp; Settlements
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Daily deduction ledger: Rs. 2 Company + Rs. 2 Controller (&le; Rs. 80) and 10% Company + Rs. 2 Controller (&gt; Rs. 80)
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            {/* Quick Date Selectors */}
            <div style={{ display: 'flex', background: 'var(--bg-sidebar)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <button
                type="button"
                className={`btn btn-sm ${selectedDate === getTodayDateString() ? 'btn-primary' : 'btn-secondary'}`}
                style={{ border: 'none', borderRadius: '6px', fontSize: '12px', padding: '6px 12px' }}
                onClick={() => setSelectedDate(getTodayDateString())}
              >
                Today
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedDate === getYesterdayDateString() ? 'btn-primary' : 'btn-secondary'}`}
                style={{ border: 'none', borderRadius: '6px', fontSize: '12px', padding: '6px 12px' }}
                onClick={() => setSelectedDate(getYesterdayDateString())}
              >
                Yesterday
              </button>
            </div>

            {/* Custom Date Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={15} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
              <input
                type="date"
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '13px', padding: '6px 12px 6px 32px' }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search driver / phone..."
                className="form-input"
                style={{ paddingLeft: '32px', width: '100%', fontSize: '13px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Export CSV */}
            <button className="btn btn-secondary btn-sm" onClick={exportCSV} title="Export CSV for selected day">
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            {/* Refresh */}
            <button className="btn btn-secondary btn-sm" onClick={fetchSettlements} title="Refresh records">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* 6 Key Performance Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginTop: '16px' }}>
          {/* Card 1: Completed Trips */}
          <div style={{ background: 'var(--bg-sidebar)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Completed Trips</span>
              <Navigation size={15} color="#38BDF8" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#38BDF8' }}>
              {summary.totalRides} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>rides</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {summary.totalActiveRiders} active drivers
            </div>
          </div>

          {/* Card 2: Gross Fare Volume */}
          <div style={{ background: 'var(--bg-sidebar)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Gross Volume</span>
              <DollarSign size={15} color="#FBBF24" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#FBBF24' }}>
              Rs. {summary.totalGrossVolume.toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Total passenger fares
            </div>
          </div>

          {/* Card 3: Company Share */}
          <div style={{ background: 'var(--bg-sidebar)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>Company Share</span>
              <Building2 size={15} color="var(--primary)" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>
              Rs. {summary.totalCompanyCut.toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Rs. 2 (&le;80) / 10% (&gt;80)
            </div>
          </div>

          {/* Card 4: Controller Share (Rs. 2 per ride) */}
          <div style={{ background: 'var(--bg-sidebar)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(6, 182, 212, 0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#06B6D4', fontWeight: 700, textTransform: 'uppercase' }}>Controller Share (Rs. 2/Ride)</span>
              <ShieldCheck size={15} color="#06B6D4" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#06B6D4' }}>
              Rs. {summary.totalControllerCut.toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {summary.totalRides} rides &times; Rs. 2.00
            </div>
          </div>

          {/* Card 5: Total Due to Collect */}
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#F87171', fontWeight: 700, textTransform: 'uppercase' }}>Total Due from Drivers</span>
              <CreditCard size={15} color="#F87171" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#EF4444' }}>
              Rs. {summary.totalDeductionsDue.toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: '#FCA5A5', marginTop: '2px' }}>
              Company + Controller dues
            </div>
          </div>

          {/* Card 6: Driver Net Retained */}
          <div style={{ background: 'var(--bg-sidebar)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#34D399', fontWeight: 700, textTransform: 'uppercase' }}>Drivers Net Kept</span>
              <Coins size={15} color="#34D399" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981' }}>
              Rs. {summary.totalRiderNet.toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Gross minus deductions
            </div>
          </div>
        </div>

        {/* Policy Summary Banner */}
        <div style={{
          marginTop: '16px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Deduction Policy for {selectedDate}:</strong> Trips &le; Rs. 80 deducts <strong>Rs. 4.00</strong> (Rs. 2 Company + Rs. 2 Controller). Trips &gt; Rs. 80 deducts <strong>10% of Fare</strong> (Company) + <strong>Rs. 2.00</strong> (Controller). Controller receives exactly Rs. 2.00 for every single ride.
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Total Collections for Day: <strong style={{ color: '#EF4444' }}>Rs. {summary.totalDeductionsDue.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      {/* Admin Platform Settlement UPI & Shift Auto-Lock Settings Panel */}
      <div className="panel" style={{ border: '1px solid rgba(245, 158, 11, 0.35)', background: 'var(--bg-card)' }}>
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
              <CreditCard size={18} color="var(--primary)" />
              Admin Settlement UPI &amp; Next-Day Driver Lock Settings
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Drivers scan this UPI QR to pay their daily platform commission. Drivers with unsettled shifts are locked next day.
            </p>
          </div>
        </div>

        {settingsSuccessMsg && (
          <div style={{
            padding: '10px 16px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '8px',
            color: '#34D399',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={16} />
            <span>{settingsSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveAdminSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Admin Settlement UPI ID *
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. papido.admin@okaxis"
              style={{ width: '100%', fontSize: '13px', fontFamily: 'monospace' }}
              value={adminUpiId}
              onChange={(e) => setAdminUpiId(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Receiver / Account Name *
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Papido Campus Operations"
              style={{ width: '100%', fontSize: '13px' }}
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoLockEnabled}
                onChange={(e) => setAutoLockEnabled(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span>Auto-Lock Drivers with Overdue Shift Dues</span>
            </label>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Locks driver online toggle until previous day commission is approved.
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSavingSettings}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontWeight: 700, width: '100%', justifyContent: 'center' }}
            >
              <Save size={14} />
              <span>{isSavingSettings ? 'Saving...' : 'Save Admin UPI Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Duty Controller (Core Member Management for that Day) Panel */}
      <div className="panel" style={{ border: '1px solid rgba(6, 182, 212, 0.35)' }}>
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#06B6D4' }}>
              <ShieldCheck size={18} color="#06B6D4" />
              Daily Operations Controller (Core Member Shift)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Core Team members are authorized to control operations on duty and receive the daily controller pool (Rs. 2 per ride)
            </p>
          </div>

          {dutyController && (
            <span className={`badge ${dutyController.payoutStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> Payout: {dutyController.payoutStatus}
            </span>
          )}
        </div>

        {controllerSuccessMsg && (
          <div style={{
            padding: '10px 16px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '8px',
            color: '#34D399',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={16} />
            <span>{controllerSuccessMsg}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '10px' }}>
          {/* Assignment Form */}
          <form onSubmit={handleSaveDutyController} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Select Core Member on Duty for {selectedDate} *
              </label>
              <select
                className="form-select"
                style={{ width: '100%', fontSize: '13px' }}
                value={selectedCoreMemberId}
                onChange={(e) => setSelectedCoreMemberId(e.target.value)}
                required
              >
                <option value="">-- Choose Authorized Core Member --</option>
                {availableCoreMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.phone || member.email})
                  </option>
                ))}
              </select>
              {availableCoreMembers.length === 0 && (
                <div style={{ fontSize: '11px', color: '#F87171', marginTop: '4px' }}>
                  No core members found. Register core members in Core Team Management.
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Controller Payout Status
                </label>
                <select
                  className="form-select"
                  style={{ width: '100%', fontSize: '13px' }}
                  value={controllerPayoutStatus}
                  onChange={(e) => setControllerPayoutStatus(e.target.value)}
                >
                  <option value="PENDING">PENDING (Unpaid)</option>
                  <option value="PAID">PAID (Settled to Controller)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Shift Notes / Time (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Full Day / Evening Shift"
                  style={{ width: '100%', fontSize: '13px' }}
                  value={controllerNotes}
                  onChange={(e) => setControllerNotes(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isSavingController || !selectedCoreMemberId}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: 700 }}
              >
                <Save size={14} />
                <span>{isSavingController ? 'Saving...' : 'Save / Assign Duty Controller'}</span>
              </button>
            </div>
          </form>

          {/* Assigned Controller Summary Card */}
          <div style={{
            background: 'var(--bg-sidebar)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            {dutyController ? (
              <div>
                <div style={{ fontSize: '11px', color: '#06B6D4', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                  Assigned Duty Controller for {selectedDate}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <img
                    src={dutyController.controllerProfileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={dutyController.controllerName}
                    style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #06B6D4' }}
                  />
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF' }}>{dutyController.controllerName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dutyController.controllerPhone} &bull; {dutyController.controllerEmail}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '8px', padding: '10px 14px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Trips Managed:</span>
                    <strong style={{ fontSize: '13px' }}>{summary.totalRides} trips</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Controller Pool Earned (Rs. 2/ride):</span>
                    <strong style={{ fontSize: '16px', color: '#06B6D4' }}>Rs. {summary.totalControllerCut.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Payout Status:</span>
                    <span className={`badge ${dutyController.payoutStatus === 'PAID' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                      {dutyController.payoutStatus}
                    </span>
                  </div>
                  {dutyController.notes && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                      Note: "{dutyController.notes}"
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                <Shield size={32} color="#06B6D4" style={{ marginBottom: '8px', opacity: 0.6 }} />
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>No Duty Controller Assigned Yet</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Select a Core Member on the left to assign who controlled the {summary.totalRides} trips (Rs. {summary.totalControllerCut.toFixed(2)} pool) on {selectedDate}.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Driver Deductions & Settlements Table */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Driver Breakdown ({riders.length} Drivers)</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Individual driver deduction amounts and settlement status for {selectedDate}
            </p>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver Details</th>
                <th>Trips</th>
                <th>Gross Fare</th>
                <th>Company Cut</th>
                <th>Controller Cut</th>
                <th style={{ color: '#EF4444' }}>Total Due to Collect</th>
                <th style={{ color: '#10B981' }}>Driver Net</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading daily driver settlements...
                  </td>
                </tr>
              ) : riders.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No completed trips or deductions recorded for {selectedDate}.
                  </td>
                </tr>
              ) : (
                riders.map((r) => (
                  <tr key={r.riderId}>
                    <td>
                      <div>
                        <strong>{r.riderName}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.riderPhone}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {r.vehicleModel} ({r.vehicleNumber})
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{r.totalTrips}</strong> trips
                    </td>
                    <td>
                      <strong>Rs. {r.grossFare.toFixed(2)}</strong>
                    </td>
                    <td>
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        Rs. {r.companyDue.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#06B6D4', fontWeight: 600 }}>
                        Rs. {r.controllerDue.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#EF4444', fontSize: '15px' }}>
                        Rs. {r.totalDeductionDue.toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <strong style={{ color: '#10B981' }}>
                        Rs. {r.riderNetEarnings.toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      {r.shiftStatus === 'SETTLED' ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Approved &amp; Unlocked
                        </span>
                      ) : r.shiftStatus === 'PENDING_APPROVAL' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> Verification Pending
                          </span>
                          {r.utrReference && (
                            <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, fontFamily: 'monospace' }}>
                              UTR: {r.utrReference}
                            </div>
                          )}
                        </div>
                      ) : r.shiftStatus === 'REJECTED' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} /> Rejected (Locked)
                          </span>
                          {r.rejectionReason && (
                            <div style={{ fontSize: '10px', color: '#EF4444' }}>
                              {r.rejectionReason}
                            </div>
                          )}
                        </div>
                      ) : r.settlementStatus === 'PARTIALLY_SETTLED' ? (
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> Partial
                        </span>
                      ) : (
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> Due (Unsettled)
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedRider(r)}
                          title="View all individual rides on this date"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                        >
                          <FileText size={12} /> Trips ({r.totalTrips})
                        </button>

                        {r.shiftStatus !== 'SETTLED' ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              onClick={() => handleApproveSettlement(r)}
                              disabled={updatingRiderId === r.riderId}
                              title="Approve settlement and unlock driver for tomorrow"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700 }}
                            >
                              <CheckCircle2 size={12} /> Approve &amp; Unlock
                            </button>

                            {r.shiftStatus === 'PENDING_APPROVAL' && (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => setRejectionModalRider(r)}
                                disabled={updatingRiderId === r.riderId}
                                title="Reject settlement payment and keep driver locked"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700 }}
                              >
                                <X size={12} /> Reject
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleToggleSettlement(r)}
                            disabled={updatingRiderId === r.riderId}
                            title="Re-open / Mark as Unsettled"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                          >
                            Mark Due
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => copyRiderStatement(r)}
                          title="Copy statement to clipboard for WhatsApp"
                          style={{ padding: '6px 8px', display: 'flex', alignItems: 'center' }}
                        >
                          {copiedRiderId === r.riderId ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver Trip Details Modal */}
      {selectedRider && (
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
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '860px',
            maxHeight: '85vh',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} color="var(--primary)" />
                  {selectedRider.riderName} &mdash; Trip Deductions for {selectedDate}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Phone: {selectedRider.riderPhone} &bull; Vehicle: {selectedRider.vehicleModel} ({selectedRider.vehicleNumber})
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyRiderStatement(selectedRider)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  {copiedRiderId === selectedRider.riderId ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                  <span>{copiedRiderId === selectedRider.riderId ? 'Copied' : 'Copy Statement'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedRider(null)}
                  style={{ padding: '6px 8px', display: 'flex', alignItems: 'center' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Summary Cards */}
            <div style={{
              padding: '16px 24px',
              background: 'var(--bg-sidebar)',
              borderBottom: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Trips</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{selectedRider.totalTrips}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gross Fare</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#FBBF24' }}>
                  Rs. {selectedRider.grossFare.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Company Share</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                  Rs. {selectedRider.companyDue.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Controller Share</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#06B6D4' }}>
                  Rs. {selectedRider.controllerDue.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#F87171' }}>Total Due to Collect</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#EF4444' }}>
                  Rs. {selectedRider.totalDeductionDue.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#34D399' }}>Driver Net Kept</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }}>
                  Rs. {selectedRider.riderNetEarnings.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Individual Rides Table */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ride Code</th>
                      <th>Route</th>
                      <th>Fare</th>
                      <th>Company</th>
                      <th>Controller</th>
                      <th style={{ color: '#EF4444' }}>Total Cut</th>
                      <th style={{ color: '#10B981' }}>Driver Net</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRider.rides.map((ride) => (
                      <tr key={ride.earningId}>
                        <td>
                          <strong style={{ color: 'var(--primary)' }}>{ride.rideCode}</strong>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {ride.totalFare <= 80 ? 'Standard (<= Rs.80)' : 'Long/Outside (> Rs.80)'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px' }}>{ride.pickupAddress}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>&rarr; {ride.destinationAddress}</div>
                        </td>
                        <td>
                          <strong>Rs. {ride.totalFare.toFixed(2)}</strong>
                        </td>
                        <td>
                          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            Rs. {ride.companyEarning.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: '#06B6D4', fontWeight: 600 }}>
                            Rs. {ride.controllerEarning.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: '#EF4444' }}>
                            Rs. {ride.totalDeduction.toFixed(2)}
                          </strong>
                        </td>
                        <td>
                          <strong style={{ color: '#10B981' }}>
                            Rs. {ride.riderEarning.toFixed(2)}
                          </strong>
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {ride.time ? new Date(ride.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border)',
              background: 'rgba(0, 0, 0, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '13px' }}>
                Status: {selectedRider.settlementStatus === 'SETTLED' ? (
                  <span className="badge badge-success">SETTLED</span>
                ) : (
                  <span className="badge badge-danger">DUE (Rs. {selectedRider.totalDeductionDue.toFixed(2)})</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className={`btn ${selectedRider.settlementStatus === 'SETTLED' ? 'btn-secondary' : 'btn-success'}`}
                  onClick={() => handleToggleSettlement(selectedRider)}
                  disabled={updatingRiderId === selectedRider.riderId}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle2 size={14} />
                  <span>{selectedRider.settlementStatus === 'SETTLED' ? 'Mark as Due' : 'Mark as Settled'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedRider(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Settlement Modal */}
      {rejectionModalRider && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} /> Reject Shift Settlement
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setRejectionModalRider(null); setRejectionReason(''); }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Rejecting will mark <strong>{rejectionModalRider.riderName}</strong>'s shift as rejected and keep their driving account <strong>locked</strong> until they re-submit a valid payment.
              {rejectionModalRider.utrReference && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Submitted UTR: <strong>{rejectionModalRider.utrReference}</strong>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Rejection Reason (Shown to Driver) *
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="e.g. UTR not found in bank account / Amount mismatch"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setRejectionModalRider(null); setRejectionReason(''); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={updatingRiderId === rejectionModalRider.riderId}
                onClick={handleRejectSettlement}
                style={{ fontWeight: 700 }}
              >
                {updatingRiderId === rejectionModalRider.riderId ? 'Rejecting...' : 'Confirm Rejection & Lock Driver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
