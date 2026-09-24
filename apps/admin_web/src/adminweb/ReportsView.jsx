import React, { useState, useEffect } from 'react';
import './ReportsView.css';
import { apiRequest } from '../api';
import {
  Download,
  RefreshCw,
  FileBarChart,
  Calendar,
  TrendingUp,
  DollarSign,
  BarChart3,
  PieChart,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import MetricCard from '../components/ui/MetricCard';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';

export function ReportsView() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/admin/reports?period=${period}`);
      setReports(res.data || []);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period]);

  const exportCSV = () => {
    if (reports.length === 0) return alert('No report data to export.');

    const headers = ['Date', 'Total Rides', 'Completed Rides', 'Cancelled Rides', 'Gross Volume (INR)', 'Driver Payouts (INR)', 'Company Revenue (INR)'];
    const rows = reports.map(r => [
      r.report_date,
      r.total_rides,
      r.completed_rides,
      r.cancelled_rides,
      r.gross_volume,
      r.rider_payouts,
      r.company_revenue
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `papido_analytics_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalGross = reports.reduce((acc, r) => acc + parseFloat(r.gross_volume || 0), 0);
  const totalCompany = reports.reduce((acc, r) => acc + parseFloat(r.company_revenue || 0), 0);
  const totalRider = reports.reduce((acc, r) => acc + parseFloat(r.rider_payouts || 0), 0);
  const totalRides = reports.reduce((acc, r) => acc + parseInt(r.total_rides || 0, 10), 0);

  const columns = [
    {
      header: 'Date / Period',
      accessor: (r) => <strong className="rr-table-date">{r.report_date}</strong>
    },
    {
      header: 'Total Rides',
      accessor: 'total_rides'
    },
    {
      header: 'Completed',
      accessor: (r) => (
        <span className="rr-table-emerald">{r.completed_rides}</span>
      )
    },
    {
      header: 'Cancelled',
      accessor: (r) => (
        <span className="rr-table-rose">{r.cancelled_rides}</span>
      )
    },
    {
      header: 'Gross Volume',
      accessor: (r) => (
        <strong className="rr-table-gross">
          ₹{parseFloat(r.gross_volume || 0).toFixed(2)}
        </strong>
      )
    },
    {
      header: 'Driver Payouts',
      accessor: (r) => (
        <span className="rr-table-amber">
          ₹{parseFloat(r.rider_payouts || 0).toFixed(2)}
        </span>
      )
    },
    {
      header: 'Platform Commission',
      accessor: (r) => (
        <span className="rr-table-emerald-strong">
          ₹{parseFloat(r.company_revenue || 0).toFixed(2)}
        </span>
      )
    }
  ];

  return (
    <div className="rr-page">
      {/* ============================================================
          AGGREGATED TOTALS GRID
          ============================================================ */}
      <div className="rr-kpi-grid">
        <MetricCard
          label="Total Booking Volume"
          value={`₹${totalGross.toFixed(2)}`}
          trendText="Gross transactions in selected period"
          icon={TrendingUp}
          iconColor="#6366F1"
          iconBg="rgba(99, 102, 241, 0.15)"
        />

        <MetricCard
          label="Platform Net Commission"
          value={`₹${totalCompany.toFixed(2)}`}
          trendText="Via Papido dynamic commission matrix"
          icon={FileBarChart}
          iconColor="#10B981"
          iconBg="rgba(16, 185, 129, 0.15)"
        />

        <MetricCard
          label="Driver Total Payouts"
          value={`₹${totalRider.toFixed(2)}`}
          trendText="Disbursed to verified fleet drivers"
          icon={DollarSign}
          iconColor="#F59E0B"
          iconBg="rgba(245, 158, 11, 0.15)"
        />

        <MetricCard
          label="Total Rides"
          value={totalRides}
          trendText="Across the selected period"
          icon={BarChart3}
          iconColor="#38BDF8"
          iconBg="rgba(56, 189, 248, 0.15)"
        />
      </div>

      {/* ============================================================
          TOOLBAR
          ============================================================ */}
      <div className="rr-toolbar rr-fade-up">
        <div className="rr-toolbar-left">
          <div className="rr-toolbar-icon">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="rr-toolbar-title">
              Historical Financial &amp; Dispatch Breakdown
            </h3>
            <p className="rr-toolbar-sub">
              Daily ride volume, fleet payouts, and company margin analytics
            </p>
          </div>
        </div>

        <div className="rr-toolbar-right">
          <div className="rr-period-switch">
            {['daily', 'weekly', 'monthly'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rr-period-btn ${period === p ? 'is-active' : ''}`}
              >
                {p}
              </button>
            ))}
          </div>

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
            onClick={fetchReports}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ============================================================
          BREAKDOWN TABLE
          ============================================================ */}
      <div className="rr-table-card rr-fade-up">
        <div className="rr-table-card-head">
          <div>
            <h3 className="rr-table-card-title">Period Breakdown</h3>
            <p className="rr-table-card-sub">
              Ride counts, gross volume, driver payouts, and platform margins per {period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}
            </p>
          </div>
          <span className="rr-table-live">
            <span className="rr-table-live-dot" /> Live
          </span>
        </div>

        <DataTable
          columns={columns}
          data={reports}
          loading={loading}
          emptyMessage="No report records found for this period."
          emptySubtext="Completed rides will automatically generate analytics."
        />
      </div>
    </div>
  );
}
export default ReportsView;
