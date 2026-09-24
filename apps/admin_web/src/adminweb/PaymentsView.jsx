import React, { useState, useEffect } from 'react';
import './PaymentsView.css';
import { apiRequest } from '../api';
import {
  DollarSign,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  Filter,
  Wallet,
  TrendingUp,
  Users,
  CreditCard,
  AlertCircle,
  Search
} from 'lucide-react';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import DataTable from '../components/ui/DataTable';

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
      setPayments(res.data.items || []);
      setTotal(res.data.pagination?.total || 0);
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

  const columns = [
    {
      header: 'Txn Reference',
      accessor: (p) => (
        <span className="pv-table-mono">
          {p.transaction_reference || `TXN-${p.id}`}
        </span>
      )
    },
    {
      header: 'Ride Code',
      accessor: (p) => (
        <strong className="pv-table-code">{p.ride_code}</strong>
      )
    },
    {
      header: 'Customer',
      accessor: (p) => (
        <span className="pv-table-name">{p.customer_name}</span>
      )
    },
    {
      header: 'Driver (Rider)',
      accessor: (p) => (
        p.rider_name ? (
          <span className="pv-table-name pv-table-name--emerald">{p.rider_name}</span>
        ) : (
          <span className="pv-table-unassigned">N/A</span>
        )
      )
    },
    {
      header: 'Amount',
      accessor: (p) => (
        <strong className="pv-table-amount">
          ₹{parseFloat(p.amount).toFixed(2)}
        </strong>
      )
    },
    {
      header: 'Method',
      accessor: (p) => (
        <span className="pv-method-chip">
          {p.payment_method}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (p) => (
        <StatusBadge
          status={p.payment_status === 'COMPLETED' ? 'completed' : p.payment_status === 'FAILED' ? 'cancelled' : 'requested'}
          label={p.payment_status}
          size="sm"
        />
      )
    },
    {
      header: 'Paid At',
      accessor: (p) => (
        <span className="pv-table-time">
          {new Date(p.created_at).toLocaleString()}
        </span>
      )
    }
  ];

  return (
    <div className="pv-page">
      {/* ============================================================
          FILTER / ACTION TOOLBAR
          ============================================================ */}
      <div className="pv-toolbar pv-fade-up">
        <div className="pv-toolbar-left">
          <div className="pv-toolbar-icon">
            <Wallet size={20} />
          </div>
          <div>
            <h3 className="pv-toolbar-title">
              Financial Ledger &amp; Transactions
            </h3>
            <p className="pv-toolbar-sub">
              Complete audit ledger of customer ride settlements and driver payouts · {total} total
            </p>
          </div>
        </div>

        <div className="pv-toolbar-right">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pv-select"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="pv-select"
          >
            <option value="">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="WALLET">Wallet</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
          </select>

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
            onClick={fetchPayments}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ============================================================
          TRANSACTIONS TABLE
          ============================================================ */}
      <div className="pv-table-card pv-fade-up">
        <div className="pv-table-card-head">
          <div>
            <h3 className="pv-table-card-title">Payment Transactions</h3>
            <p className="pv-table-card-sub">
              Auto-synced ledger from completed rides and settlements
            </p>
          </div>
          <span className="pv-table-live">
            <span className="pv-table-live-dot" /> Live
          </span>
        </div>

        <DataTable
          columns={columns}
          data={payments}
          loading={loading}
          emptyMessage="No payment transaction records found."
          emptySubtext="New payments from completed rides will appear here in real time."
        />
      </div>
    </div>
  );
}
export default PaymentsView;
