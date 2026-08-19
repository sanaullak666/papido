import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { DollarSign, Download, RefreshCw, CheckCircle2, Clock } from 'lucide-react';

export function PaymentsView() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('paymentStatus', statusFilter);
      if (methodFilter) params.append('paymentMethod', methodFilter);

      const res = await apiRequest(`/admin/payments?${params.toString()}`);
      setPayments(res.data.items);
      setTotal(res.data.pagination.total);
    } catch (err) {
      console.error('Failed to fetch payments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, methodFilter]);

  const exportCSV = () => {
    if (payments.length === 0) return alert('No payment records to export.');

    const headers = ['Payment ID', 'Ride Code', 'Customer', 'Driver (Rider)', 'Amount (INR)', 'Method', 'Status', 'Date'];
    const rows = payments.map(p => [
      p.id,
      p.ride_code,
      p.customer_name,
      p.rider_name || 'N/A',
      p.amount,
      p.payment_method,
      p.payment_status,
      new Date(p.created_at).toISOString()
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `papido_payments_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Payments & Financial Ledger ({total})</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Complete ledger of trip settlements and payment transactions</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>

            <select
              className="form-select"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="WALLET">Wallet</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
            </select>

            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </button>

            <button className="btn btn-secondary btn-sm" onClick={fetchPayments}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Txn Ref / ID</th>
                <th>Ride Code</th>
                <th>Customer</th>
                <th>Rider (Driver)</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Paid At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading payment records...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600 }}>
                        {p.transaction_reference || `TXN-${p.id}`}
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--primary)' }}>{p.ride_code}</strong>
                    </td>
                    <td>{p.customer_name}</td>
                    <td>{p.rider_name || 'N/A'}</td>
                    <td>
                      <strong style={{ fontSize: '15px', color: '#10B981' }}>
                        ₹{parseFloat(p.amount).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <span className="badge badge-secondary">{p.payment_method}</span>
                    </td>
                    <td>
                      <span className={`badge ${p.payment_status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                        {p.payment_status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(p.created_at).toLocaleString()}
                    </td>
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
