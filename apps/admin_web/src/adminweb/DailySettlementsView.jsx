import React, { useState, useEffect } from 'react';
import './DailySettlementsView.css';
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
  CheckCircle2,
  Clock,
  X,
  Copy,
  Check,
  AlertCircle,
  Save,
  Shield,
  Bike,
  FileText,
  Users,
  TrendingUp,
  Wallet,
  ArrowRight
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import MetricCard from '../components/ui/MetricCard';
import StatusBadge from '../components/ui/StatusBadge';
import DataTable from '../components/ui/DataTable';
import Drawer from '../components/ui/Drawer';
import Modal from '../components/ui/Modal';

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

  const [adminUpiId, setAdminUpiId] = useState('papido.admin@okaxis');
  const [adminName, setAdminName] = useState('Papido Campus Operations');
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');
  const [rejectionModalRider, setRejectionModalRider] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

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

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
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

  const columns = [
    {
      header: 'Driver',
      accessor: (r) => (
        <div>
          <div className="ds-table-name">{r.riderName}</div>
          <div className="ds-table-sub">{r.riderPhone}</div>
        </div>
      )
    },
    {
      header: 'Vehicle',
      accessor: (r) => (
        <div>
          <div className="ds-table-sub-strong">{r.vehicleModel}</div>
          <div className="ds-table-mono">{r.vehicleNumber}</div>
        </div>
      )
    },
    {
      header: 'Trips',
      accessor: (r) => (
        <strong className="ds-table-trips">
          {r.totalTrips}
        </strong>
      )
    },
    {
      header: 'Gross Fare',
      accessor: (r) => <span className="ds-table-gross">₹{r.grossFare.toFixed(2)}</span>
    },
    {
      header: 'Company Due',
      accessor: (r) => <span className="ds-table-amber">₹{r.companyDue.toFixed(2)}</span>
    },
    {
      header: 'Controller Due',
      accessor: (r) => <span className="ds-table-cyan">₹{r.controllerDue.toFixed(2)}</span>
    },
    {
      header: 'Total Collectible',
      accessor: (r) => (
        <strong className="ds-table-rose">
          ₹{r.totalDeductionDue.toFixed(2)}
        </strong>
      )
    },
    {
      header: 'Driver Kept Net',
      accessor: (r) => (
        <strong className="ds-table-emerald">
          ₹{r.riderNetEarnings.toFixed(2)}
        </strong>
      )
    },
    {
      header: 'Status',
      accessor: (r) => (
        <StatusBadge
          status={r.settlementStatus === 'SETTLED' ? 'completed' : r.settlementStatus === 'REJECTED' ? 'cancelled' : 'requested'}
          label={r.settlementStatus}
          size="sm"
        />
      )
    },
    {
      header: 'Actions',
      accessor: (r) => (
        <div className="ds-row-actions">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSelectedRider(r)}
          >
            Inspect
          </Button>
          {r.settlementStatus !== 'SETTLED' && (
            <Button
              size="sm"
              variant="success"
              onClick={() => handleApproveSettlement(r)}
              disabled={updatingRiderId === r.riderId}
            >
              Approve
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="ds-page">
      {/* ============================================================
          KPI GRID
          ============================================================ */}
      <div className="ds-kpi-grid">
        <MetricCard
          label="Total Due to Collect"
          value={`₹${summary.totalDeductionsDue.toFixed(2)}`}
          trendText={`From ${riders.length} active drivers`}
          icon={Coins}
          iconColor="#F43F5E"
          iconBg="rgba(244, 63, 94, 0.15)"
        />

        <MetricCard
          label="Platform Net Commission"
          value={`₹${summary.totalCompanyCut.toFixed(2)}`}
          trendText="Via dynamic Papido split rules"
          icon={Building2}
          iconColor="#F59E0B"
          iconBg="rgba(245, 158, 11, 0.15)"
        />

        <MetricCard
          label="Duty Controller Pool"
          value={`₹${summary.totalControllerCut.toFixed(2)}`}
          trendText="Flat ₹2 per ride allocation"
          icon={ShieldCheck}
          iconColor="#38BDF8"
          iconBg="rgba(56, 189, 248, 0.15)"
        />

        <MetricCard
          label="Driver Total Earnings Kept"
          value={`₹${summary.totalRiderNet.toFixed(2)}`}
          trendText={`Across ${summary.totalRides} completed trips`}
          icon={DollarSign}
          iconColor="#10B981"
          iconBg="rgba(16, 185, 129, 0.15)"
        />
      </div>

      {/* ============================================================
          FILTER / ACTION TOOLBAR
          ============================================================ */}
      <div className="ds-toolbar ds-fade-up">
        <div className="ds-toolbar-left">
          <div className="ds-date-switch">
            <button
              type="button"
              onClick={() => setSelectedDate(getTodayDateString())}
              className={`ds-date-btn ${selectedDate === getTodayDateString() ? 'is-active' : ''}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(getYesterdayDateString())}
              className={`ds-date-btn ${selectedDate === getYesterdayDateString() ? 'is-active' : ''}`}
            >
              Yesterday
            </button>
          </div>

          <div className="ds-date-picker">
            <Calendar size={15} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="ds-date-input"
            />
          </div>

          <div className="ds-search-wrap">
            <Input
              placeholder="Search driver by name, phone, plate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>
        </div>

        <div className="ds-toolbar-right">
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={exportCSV}
          >
            Export CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={fetchSettlements}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ============================================================
          DUTY CONTROLLER BAR
          ============================================================ */}
      <div className="ds-controller-bar ds-fade-up">
        <div className="ds-controller-left">
          <div className="ds-controller-icon">
            <Shield size={20} />
          </div>
          <div className="ds-controller-info">
            <div className="ds-controller-title">
              Duty Controller on Shift ({selectedDate})
            </div>
            <div className="ds-controller-sub">
              {dutyController ? (
                <span>
                  Assigned: <strong className="ds-controller-name">{dutyController.name}</strong>{' '}
                  · Pool Share: <strong>₹{summary.totalControllerCut.toFixed(2)}</strong>
                </span>
              ) : (
                'No duty controller assigned for this date yet'
              )}
            </div>
          </div>
        </div>

        <div className="ds-controller-right">
          <select
            value={selectedCoreMemberId}
            onChange={(e) => setSelectedCoreMemberId(e.target.value)}
            className="ds-select"
          >
            <option value="">Assign Core Member</option>
            {availableCoreMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.phone})
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleSaveDutyController}
            loading={isSavingController}
            disabled={!selectedCoreMemberId}
          >
            <Save size={13} /> Save Shift
          </Button>
        </div>
      </div>

      {controllerSuccessMsg && (
        <div className="ds-inline-success ds-slide-down">
          <CheckCircle2 size={16} color="#34D399" />
          <span>{controllerSuccessMsg}</span>
        </div>
      )}

      {/* ============================================================
          SETTLEMENTS LEDGER TABLE
          ============================================================ */}
      <div className="ds-table-card ds-fade-up">
        <div className="ds-table-card-head">
          <div>
            <h3 className="ds-table-card-title">Driver Settlements Ledger</h3>
            <p className="ds-table-card-sub">
              Driver-by-driver deductions, net earnings, and settlement status for the selected date.
            </p>
          </div>
          <span className="ds-table-live">
            <span className="ds-table-live-dot" /> Live
          </span>
        </div>

        <DataTable
          columns={columns}
          data={riders}
          loading={loading}
          emptyMessage="No driver trips or settlement records found for this date."
          emptySubtext="Drivers who complete trips will automatically appear in this ledger."
        />
      </div>

      {/* ============================================================
          RIDER DRAWER
          ============================================================ */}
      <Drawer
        isOpen={Boolean(selectedRider)}
        onClose={() => setSelectedRider(null)}
        title="Driver Settlement Inspection"
        subtitle={`${selectedRider?.riderName} · ${selectedDate}`}
      >
        {selectedRider && (
          <div className="ds-drawer">
            <div className="ds-drawer-profile">
              <div className="ds-drawer-avatar">
                {selectedRider.riderName?.charAt(0) || 'D'}
              </div>
              <div>
                <h4 className="ds-drawer-name">{selectedRider.riderName}</h4>
                <div className="ds-drawer-vehicle">
                  {selectedRider.vehicleModel} · {selectedRider.vehicleNumber}
                </div>
              </div>
            </div>

            <div className="ds-drawer-list">
              <div className="ds-drawer-row">
                <span className="ds-drawer-row-label">Completed Rides</span>
                <strong className="ds-drawer-row-value">{selectedRider.totalTrips}</strong>
              </div>
              <div className="ds-drawer-row">
                <span className="ds-drawer-row-label">Gross Fares Collected</span>
                <strong className="ds-drawer-row-value ds-drawer-row-value--lg">
                  ₹{selectedRider.grossFare.toFixed(2)}
                </strong>
              </div>
              <div className="ds-drawer-row">
                <span className="ds-drawer-row-label">Company Platform Share</span>
                <strong className="ds-drawer-row-value ds-drawer-row-value--amber">
                  ₹{selectedRider.companyDue.toFixed(2)}
                </strong>
              </div>
              <div className="ds-drawer-row">
                <span className="ds-drawer-row-label">Duty Controller Pool (₹2/trip)</span>
                <strong className="ds-drawer-row-value ds-drawer-row-value--cyan">
                  ₹{selectedRider.controllerDue.toFixed(2)}
                </strong>
              </div>

              <div className="ds-drawer-divider" />

              <div className="ds-drawer-row ds-drawer-row--lg">
                <span className="ds-drawer-row-label ds-drawer-row-label--bold">
                  Total Due to Papido
                </span>
                <strong className="ds-drawer-row-value ds-drawer-row-value--rose ds-drawer-row-value--lg">
                  ₹{selectedRider.totalDeductionDue.toFixed(2)}
                </strong>
              </div>
              <div className="ds-drawer-row ds-drawer-row--lg">
                <span className="ds-drawer-row-label ds-drawer-row-label--bold">
                  Driver Net Kept
                </span>
                <strong className="ds-drawer-row-value ds-drawer-row-value--emerald ds-drawer-row-value--lg">
                  ₹{selectedRider.riderNetEarnings.toFixed(2)}
                </strong>
              </div>
            </div>

            <Button
              variant="secondary"
              icon={copiedRiderId === selectedRider.riderId ? Check : Copy}
              onClick={() => copyRiderStatement(selectedRider)}
              fullWidth
            >
              {copiedRiderId === selectedRider.riderId
                ? 'Copied Statement to Clipboard'
                : 'Copy WhatsApp Driver Statement'}
            </Button>

            <div className="ds-drawer-actions">
              <Button
                variant="success"
                fullWidth
                onClick={() => {
                  handleApproveSettlement(selectedRider);
                  setSelectedRider(null);
                }}
              >
                <CheckCircle2 size={15} /> Mark as Settled
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={() => {
                  setRejectionModalRider(selectedRider);
                  setSelectedRider(null);
                }}
              >
                <X size={15} /> Reject / Flag
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* ============================================================
          REJECTION MODAL
          ============================================================ */}
      <Modal
        isOpen={Boolean(rejectionModalRider)}
        onClose={() => setRejectionModalRider(null)}
        title="Reject Driver Settlement"
        subtitle={`Flag settlement dispute for ${rejectionModalRider?.riderName}`}
        footer={
          <div className="ds-modal-footer">
            <Button variant="ghost" onClick={() => setRejectionModalRider(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRejectSettlement}>
              Confirm Rejection
            </Button>
          </div>
        }
      >
        <div className="ds-modal-body">
          <Input
            label="Reason for Rejection / Dispute"
            placeholder="e.g. Incomplete UPI payment or missing UTR confirmation"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
          />
        </div>
      </Modal>
    </div>
  );
}
export default DailySettlementsView;
