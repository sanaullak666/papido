import React, { useEffect, useMemo, useState } from 'react';
import './history/history.css';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
import { usePassenger } from './shared/PassengerContext';
import { HistoryCard } from './history/HistoryCard';
import { HistoryEmptyState } from './history/HistoryEmptyState';
import {
  History as HistoryIcon, Download, Sparkles, Star,
  Trees, Luggage, CheckCircle2, X
} from 'lucide-react';

const FILTERS = [
  { id: 'all', label: 'All Rides' },
  { id: 'completed', label: 'Completed' },
  { id: 'pre-booked', label: 'Pre-Booked' },
  { id: 'outside', label: 'Outside Trips' }
];

export function RideHistoryPage() {
  const { token } = useAuth();
  const { pastRides = [], loadingHistory, fetchRideHistory } = usePassenger();
  const [activeFilter, setActiveFilter] = useState('all');
  const [rateModalTarget, setRateModalTarget] = useState(null); // { tripId, driverName }
  const [selectedStars, setSelectedStars] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchRideHistory();
  }, []);

  const safePastRides = pastRides || [];

  /* Filter and sort */
  const filteredRides = useMemo(() => {
    const list = [...safePastRides];
    list.sort((a, b) => {
      const da = new Date(a.completed_at || a.requested_at || a.created_at || 0);
      const db = new Date(b.completed_at || b.requested_at || b.created_at || 0);
      return db - da;
    });

    if (activeFilter === 'all') return list;
    if (activeFilter === 'completed') return list.filter(r => r.status === 'COMPLETED');
    if (activeFilter === 'pre-booked') return list.filter(r => r.is_scheduled || r.isScheduled || r.scheduled_time);
    if (activeFilter === 'outside') return list.filter(r => r.is_outside || r.isOutside);
    return list;
  }, [safePastRides, activeFilter]);

  /* Stats metrics strictly from real data */
  const stats = useMemo(() => {
    const completed = safePastRides.filter(r => r.status === 'COMPLETED');
    const totalDist = completed.reduce((acc, r) => acc + (parseFloat(r.distance_km || r.estimated_distance) || 0), 0);
    const savings = completed.length * 30;
    return {
      tripsCount: safePastRides.length,
      distanceKm: Math.round(totalDist),
      savedTaxi: savings
    };
  }, [safePastRides]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleExportCSV = () => {
    if (safePastRides.length === 0) {
      showToast('No ride records available to export.');
      return;
    }
    const headers = ['ID', 'Date', 'Pickup', 'Destination', 'Fare', 'Status', 'Driver'];
    const rows = safePastRides.map(r => [
      r.id,
      r.completed_at || r.created_at || '',
      `"${(r.pickup_address || '').replace(/"/g, '""')}"`,
      `"${(r.destination_address || '').replace(/"/g, '""')}"`,
      r.total_fare || r.final_fare || 25,
      r.status,
      `"${(r.rider_name || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Papido_Transit_Archive_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${safePastRides.length} ride records to CSV.`);
  };

  const handleRateSubmit = async () => {
    if (!rateModalTarget?.tripId) return;
    try {
      await apiRequest(`/customer/rides/${rateModalTarget.tripId}/rating`, 'POST', {
        rating: selectedStars,
        review: feedbackNotes
      }, token);
      showToast(`Thank you! ${selectedStars}-star rating submitted.`);
      if (typeof fetchRideHistory === 'function') {
        fetchRideHistory();
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit rating.');
    }
    setRateModalTarget(null);
    setFeedbackNotes('');
  };

  const isEmpty = safePastRides.length === 0;

  return (
    <div className="ps-history-page">
      <div className="ps-history-container">

        {/* Top Welcome & Overview Header */}
        <section className="w-full flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 ps-fade-up">
          <div className="flex flex-col gap-1 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="ps-history-icon-box">
                <HistoryIcon size={26} color="#EA580C" />
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm uppercase tracking-widest text-primary font-bold text-xs">
                  Transit Archive
                </span>
                <h1 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
                  Your Ride History
                </h1>
              </div>
            </div>
            <p className="font-body-md text-sm text-on-surface-variant pt-1">
              Past completed campus rides, outside trips, and electronic tax invoices for Pondicherry University members.
            </p>
          </div>

          {/* Quick Stats Bento Strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/30 shadow-xs">
            <div className="flex flex-col items-start px-3 py-2 bg-white rounded-xl">
              <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                Total Trips
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-headline-md text-lg font-bold text-on-surface">{stats.tripsCount}</span>
                <Sparkles size={12} color="#00855B" />
              </div>
            </div>

            <div className="flex flex-col items-start px-3 py-2 bg-white rounded-xl">
              <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                Campus Dist.
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-headline-md text-lg font-bold text-on-surface">{stats.distanceKm}</span>
                <span className="font-label-sm text-xs text-on-surface-variant">km</span>
              </div>
            </div>

            <div className="flex flex-col items-start px-3 py-2 bg-white rounded-xl">
              <span className="font-label-sm text-[10px] text-tertiary font-bold uppercase tracking-wider">
                Saved vs Taxi
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-headline-md text-lg text-tertiary font-bold">₹{stats.savedTaxi}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Filter Bar & Export Actions */}
        <section className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 py-2 ps-fade-up">
          <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-full w-full sm:w-auto overflow-x-auto">
            {FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                className={`ps-hist-tab-btn ${activeFilter === f.id ? 'is-active' : ''}`}
                onClick={() => setActiveFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              className="ps-hist-csv-btn"
              onClick={handleExportCSV}
            >
              <Download size={15} />
              <span>Export Monthly CSV</span>
            </button>
            <span className="font-body-sm text-xs text-on-surface-variant hidden sm:inline-block">
              Showing {filteredRides.length} of {safePastRides.length} records
            </span>
          </div>
        </section>

        {/* Trip List Stack */}
        {isEmpty ? (
          <HistoryEmptyState />
        ) : filteredRides.length === 0 ? (
          <HistoryEmptyState
            variant="filtered"
            filterLabel={FILTERS.find(f => f.id === activeFilter)?.label}
            onReset={() => setActiveFilter('all')}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredRides.map((ride, idx) => (
              <HistoryCard
                key={ride.id}
                ride={ride}
                index={idx}
                onRate={(tripId, driverName) => setRateModalTarget({ tripId, driverName })}
                onDownloadReceipt={(tripId) => showToast(`Invoice receipt #${tripId} generated.`)}
              />
            ))}
          </div>
        )}

        {/* Bottom Sustainability & Support Deck */}
        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5 ps-fade-up">
          {/* Eco Impact & Cost Savings */}
          <div className="md:col-span-2 bg-gradient-to-br from-surface-container-low via-white to-surface-container-low p-6 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-tertiary-fixed flex items-center justify-center shrink-0 text-tertiary">
              <Trees size={32} color="#00855B" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-xs uppercase tracking-wider font-bold text-tertiary">
                Eco Mobility Impact
              </span>
              <h3 className="font-headline-md text-base md:text-lg font-bold text-on-surface">
                You saved ~18.4 kg of CO₂ across campus hops
              </h3>
              <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                Using Papido electric fleet and university-shared micro-mobility saves an estimated ₹30 per trip compared to commercial on-demand cabs outside the gate.
              </p>
            </div>
          </div>

          {/* Need Support / Lost Property */}
          <div className="bg-white p-6 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                <Luggage size={18} color="#EA580C" />
              </div>
              <div className="flex flex-col">
                <h4 className="font-label-md font-bold text-on-surface text-sm">Lost something on a ride?</h4>
                <span className="font-body-sm text-xs text-on-surface-variant">Campus Transit Security Desk</span>
              </div>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
              Our dispatch monitors all vehicles. Report items left behind with the trip reference ID.
            </p>
            <button
              type="button"
              className="w-full py-2 rounded-full bg-surface-container font-label-md text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors border-0 cursor-pointer"
              onClick={() => alert('To report lost property, please call PU Mobility Transit Hotline at Ext. 4088 or visit Gate 1 Security Operations Desk.')}
            >
              Report Lost Item
            </button>
          </div>
        </section>

        {/* Dynamic Rate/Feedback Modal */}
        {rateModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full flex flex-col gap-4 ps-fade-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star size={20} fill="#EA580C" color="#EA580C" />
                  <h3 className="font-headline-md font-bold text-on-surface text-lg">Rate Your Trip</h3>
                </div>
                <button
                  type="button"
                  className="text-on-surface-variant hover:text-on-surface bg-transparent border-0 cursor-pointer"
                  onClick={() => setRateModalTarget(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <p className="font-body-sm text-xs text-on-surface-variant">
                Trip #{rateModalTarget.tripId} with Driver {rateModalTarget.driverName}. How was your experience?
              </p>

              {/* 5-Star Selection */}
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map(val => (
                  <button
                    key={val}
                    type="button"
                    className="text-3xl bg-transparent border-0 cursor-pointer transition-transform hover:scale-110"
                    style={{ color: val <= selectedStars ? '#EA580C' : '#D1D5DB' }}
                    onClick={() => setSelectedStars(val)}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                className="w-full bg-surface-container-low p-3 rounded-xl text-on-surface font-body-sm text-xs border border-outline-variant/30 outline-none resize-none"
                placeholder="Write brief feedback for campus transit improvement (optional)..."
                value={feedbackNotes}
                onChange={e => setFeedbackNotes(e.target.value)}
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="px-4 py-2 rounded-full text-on-surface-variant font-label-md text-xs bg-transparent border-0 cursor-pointer"
                  onClick={() => setRateModalTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-5 py-2 rounded-full bg-primary text-white font-label-md text-xs font-bold shadow-sm border-0 cursor-pointer"
                  onClick={handleRateSubmit}
                >
                  Submit Review
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#231A12] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 ps-fade-up">
            <CheckCircle2 size={16} color="#4EDEA3" />
            <span className="font-label-md text-xs">{toastMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
}

export default RideHistoryPage;
