import React from 'react';
import './ShiftEarningsPage.css';
import { useRider } from './shared/RiderContext';
import { formatRideDateTime } from './shared/riderConstants';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { RPButton } from './shared/RiderUI';

export function ShiftEarningsPage() {
  const {
    todayNetEarning,
    todayTripsCount,
    lifetimeTripsCount,
    totalPlatformFee,
    loadingEarnings,
    riderRides,
    fetchEarnings
  } = useRider();

  return (
    <div className="rp-content rp-content--wide">
      <div className="rp-tab-header rp-tab-header--no-surface rp-fade-up">
        <div>
          <h2 className="rp-heading rp-heading--icon">
            <TrendingUp size={24} color="#EA580C" /> Driver Shift Earnings &amp; Trip Ledger
          </h2>
          <p className="rp-subheading">
            Review your daily shift earnings, trips breakdown, and platform fee deductions.
          </p>
        </div>
        <RPButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={loadingEarnings}
          onClick={() => fetchEarnings(true)}
        >
          <RefreshCw size={14} className={loadingEarnings ? 'rp-spin' : ''} />
          <span>{loadingEarnings ? 'Refreshing...' : 'Refresh'}</span>
        </RPButton>
      </div>

      {/* Metrics Row */}
      <div className="rp-metrics-row rp-metrics-row--4 rp-fade-up">
        <div className="rp-metric-tile">
          <div className="rp-metric-tile-label">TODAY'S NET EARNINGS</div>
          <div className="rp-metric-tile-value rp-metric-tile-value--amber">
            ₹{Number(todayNetEarning).toFixed(2)}
          </div>
        </div>

        <div className="rp-metric-tile">
          <div className="rp-metric-tile-label">TODAY'S COMPLETED TRIPS</div>
          <div className="rp-metric-tile-value rp-metric-tile-value--emerald">
            {todayTripsCount}
          </div>
        </div>

        <div className="rp-metric-tile">
          <div className="rp-metric-tile-label">TOTAL TRIPS (ALL-TIME)</div>
          <div className="rp-metric-tile-value" style={{ color: '#8B5CF6' }}>
            {lifetimeTripsCount}
          </div>
        </div>

        <div className="rp-metric-tile">
          <div className="rp-metric-tile-label">PLATFORM FEE DUE</div>
          <div className="rp-metric-tile-value" style={{ color: '#0891B2' }}>
            ₹{Number(totalPlatformFee).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Trip Settlements Table Panel */}
      <div className="rp-panel rp-fade-up">
        <div className="rp-panel-head">
          <h3 className="rp-panel-title">Trip Settlements &amp; Receipts</h3>
        </div>

        {loadingEarnings ? (
          <div className="rp-skeletons">
            {[1, 2, 3].map((n) => (
              <div key={`earn-skel-${n}`} className="rp-skeleton-row">
                <div className="rp-skeleton-line rp-skeleton-line--short" />
                <div className="rp-skeleton-line" />
              </div>
            ))}
          </div>
        ) : riderRides.length === 0 ? (
          <div className="rp-empty-flat" style={{ margin: '24px' }}>
            <TrendingUp size={32} />
            <div className="rp-empty-flat-title">No completed rides in this shift yet.</div>
          </div>
        ) : (
          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th>Ride Code</th>
                  <th>Route</th>
                  <th>Gross Fare</th>
                  <th>Your Net</th>
                  <th>Platform Fee</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {riderRides.map((r) => {
                  const fare = Number(r.total_fare || r.final_fare || r.estimated_fare || 20);
                  const fee = fare <= 80 ? 4.0 : Number((fare * 0.10 + 2.0).toFixed(2));
                  const net = r.rider_earning !== undefined ? Number(r.rider_earning) : Math.max(0, fare - fee);
                  const isPrebooked = Boolean(r.is_scheduled || r.isScheduled || r.scheduled_time);

                  return (
                    <tr key={r.id}>
                      <td className="rp-table-code">{r.ride_code || `PAP-${r.id}`}</td>
                      <td>
                        <div className="rp-table-route">
                          {r.pickup_address} → {r.destination_address}
                          {isPrebooked && <span className="rp-tag rp-tag--amber-soft">PRE-BOOKED</span>}
                        </div>
                        <div className="rp-table-route-sub">
                          {isPrebooked && r.scheduled_time ? (
                            <>
                              <span>Pickup Scheduled: {formatRideDateTime(r.scheduled_time)}</span>
                              <span> · </span>
                              <span>Completed: {formatRideDateTime(r.completed_at || r.settled_at || r.created_at)}</span>
                            </>
                          ) : (
                            formatRideDateTime(r.completed_at || r.requested_at || r.created_at || r.accepted_at)
                          )}
                        </div>
                      </td>
                      <td>₹{fare.toFixed(2)}</td>
                      <td className="rp-table-amber">₹{net.toFixed(2)}</td>
                      <td className="rp-table-cyan">₹{fee.toFixed(2)}</td>
                      <td>
                        <span className={`rp-status-chip ${r.status === 'COMPLETED' ? 'rp-status-chip--emerald' : 'rp-status-chip--amber'}`}>
                          {r.status || 'COMPLETED'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
export default ShiftEarningsPage;
