import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Download, RefreshCw, FileBarChart, Calendar, TrendingUp } from 'lucide-react';

export function ReportsView() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/admin/reports?period=${period}`);
      setReports(res.data);
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

  return (
    <div>
      {/* Aggregated Totals */}
      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Total Booking Volume</span>
            <div className="stat-card-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366F1' }}>
              <TrendingUp size={22} />
            </div>
          </div>
          <div className="stat-value">₹{totalGross.toFixed(2)}</div>
          <div className="stat-desc">Gross transactions in selected period</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Platform Net Commission</span>
            <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
              <FileBarChart size={22} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#10B981' }}>₹{totalCompany.toFixed(2)}</div>
          <div className="stat-desc">Calculated via Papido split rules</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Driver Total Payouts</span>
            <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
              <Calendar size={22} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>₹{totalRider.toFixed(2)}</div>
          <div className="stat-desc">Disbursed to verified riders</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Daily Financial & Dispatch Breakdown</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Historical ride volume and commission breakdown</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
              <Download size={14} /> Export Report CSV
            </button>
            <button className="btn btn-secondary btn-sm" onClick={fetchReports}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Total Rides</th>
                <th>Completed</th>
                <th>Cancelled</th>
                <th>Gross Volume</th>
                <th>Rider Payouts</th>
                <th>Company Commission</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading analytics reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No report records found for this period.
                  </td>
                </tr>
              ) : (
                reports.map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.report_date}</strong></td>
                    <td>{r.total_rides}</td>
                    <td><span style={{ color: '#10B981', fontWeight: 600 }}>{r.completed_rides}</span></td>
                    <td><span style={{ color: '#F43F5E', fontWeight: 600 }}>{r.cancelled_rides}</span></td>
                    <td><strong>₹{parseFloat(r.gross_volume).toFixed(2)}</strong></td>
                    <td><span style={{ color: 'var(--primary)' }}>₹{parseFloat(r.rider_payouts).toFixed(2)}</span></td>
                    <td><span style={{ color: '#10B981', fontWeight: 700 }}>₹{parseFloat(r.company_revenue).toFixed(2)}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
