import React, { useState, useEffect } from 'react';
import './WaitingWidget.css';
import {
  Clock, AlertTriangle, CheckCircle2, ShieldCheck,
  Zap, Info, ChevronRight, Sparkles
} from 'lucide-react';

export function WaitingWidget({ activeRide, standardCampusFare = 25 }) {
  if (!activeRide) return null;

  const isWaiting = Boolean(activeRide.is_waiting || activeRide.isWaiting);
  const waitingMinutes = parseInt(activeRide.waiting_minutes || activeRide.waitingMinutes || 0, 10);
  const waitingFare = parseFloat(activeRide.waiting_fare || activeRide.waitingFare || 0);
  const waitingStartedAt = activeRide.waiting_started_at || activeRide.waitingStartedAt || null;
  const rideStatus = activeRide.status;

  // Only render when driver is waiting, has recorded waiting, or has arrived at pickup
  const hasWaitingData = isWaiting || waitingMinutes > 0 || waitingFare > 0;
  const isDriverReached = rideStatus === 'RIDER_REACHED';

  if (!hasWaitingData && !isDriverReached) {
    return null;
  }

  // Live ticking seconds counter
  const [elapsedSec, setElapsedSec] = useState(() => {
    if (waitingStartedAt && isWaiting) {
      const startMs = new Date(waitingStartedAt).getTime();
      if (!isNaN(startMs)) {
        const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        return (waitingMinutes * 60) + diff;
      }
    }
    return waitingMinutes * 60;
  });

  // Sync when backend updates
  useEffect(() => {
    if (waitingStartedAt && isWaiting) {
      const startMs = new Date(waitingStartedAt).getTime();
      if (!isNaN(startMs)) {
        const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setElapsedSec((waitingMinutes * 60) + diff);
        return;
      }
    }
    setElapsedSec(waitingMinutes * 60);
  }, [waitingStartedAt, waitingMinutes, isWaiting]);

  // 1-second interval when active
  useEffect(() => {
    if (!isWaiting) return;
    const interval = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isWaiting]);

  const currentMinutes = Math.floor(elapsedSec / 60);
  const currentRemainderSec = elapsedSec % 60;
  const timeString = `${String(currentMinutes).padStart(2, '0')}:${String(currentRemainderSec).padStart(2, '0')}`;

  const isFreeTier = currentMinutes < 10;
  const freeSecondsRemaining = Math.max(0, 600 - elapsedSec);
  const freeMinutesRemaining = Math.max(0, Math.ceil(freeSecondsRemaining / 60));
  const freeProgressPercent = Math.min(100, Math.max(0, (elapsedSec / 600) * 100));

  // Paid tier calculations
  const computedWaitingFare = waitingFare > 0 ? waitingFare : Math.floor(currentMinutes / 10) * 10;
  const blockElapsedSec = elapsedSec % 600;
  const nextBlockSecondsRemaining = 600 - blockElapsedSec;
  const nextBlockMinutesRemaining = Math.max(1, Math.ceil(nextBlockSecondsRemaining / 60));
  const paidBlockProgressPercent = Math.min(100, Math.max(0, (blockElapsedSec / 600) * 100));

  // Fare breakdown
  const rawBaseFare = activeRide.estimated_fare || activeRide.base_fare || standardCampusFare || 25;
  const baseFare = Number(rawBaseFare);
  const effectiveWaitingFare = isFreeTier ? 0 : computedWaitingFare;
  const totalFare = Number(activeRide.total_fare || activeRide.final_fare || (baseFare + effectiveWaitingFare));

  // Mode resolution
  let widgetMode = 'free_active'; // 'free_active' | 'paid_active' | 'concluded' | 'arrived_standby'
  if (!isWaiting && hasWaitingData) {
    widgetMode = 'concluded';
  } else if (!isWaiting && isDriverReached && waitingMinutes === 0) {
    widgetMode = 'arrived_standby';
  } else if (isWaiting && !isFreeTier) {
    widgetMode = 'paid_active';
  }

  return (
    <div
      className={`ps-waiting-widget ps-waiting-widget--${widgetMode} ps-fade-up`}
      role="region"
      aria-label="Driver Waiting Status"
      aria-live="polite"
    >
      {/* Top Banner Row */}
      <div className="ps-waiting-head">
        <div className="ps-waiting-head-left">
          <div className="ps-waiting-live-dot-wrap" aria-hidden="true">
            {isWaiting ? (
              <>
                <span className={`ps-waiting-ping ${widgetMode === 'paid_active' ? 'is-amber' : 'is-emerald'}`} />
                <span className={`ps-waiting-dot ${widgetMode === 'paid_active' ? 'is-amber' : 'is-emerald'}`} />
              </>
            ) : (
              <span className="ps-waiting-dot is-neutral" />
            )}
          </div>

          <div className="ps-waiting-title-group">
            <span className="ps-waiting-tag">
              {widgetMode === 'paid_active' && 'PAID WAITING ACTIVE'}
              {widgetMode === 'free_active' && 'DRIVER WAITING • FREE TIER'}
              {widgetMode === 'concluded' && 'WAITING CHARGES RECORDED'}
              {widgetMode === 'arrived_standby' && 'DRIVER AT PICKUP SPOT'}
            </span>
            <span className="ps-waiting-subtitle">
              {widgetMode === 'paid_active' && `₹10 billed per 10 full minutes elapsed`}
              {widgetMode === 'free_active' && `0–9 mins free waiting grace period`}
              {widgetMode === 'concluded' && `Waiting session concluded for this trip`}
              {widgetMode === 'arrived_standby' && `10-minute complimentary waiting applies`}
            </span>
          </div>
        </div>

        {/* Live Timer Pill */}
        {(isWaiting || hasWaitingData) && (
          <div className={`ps-waiting-timer-pill ${widgetMode === 'paid_active' ? 'is-paid' : ''}`}>
            <Clock size={14} className={isWaiting ? 'ps-waiting-clock-spin' : ''} />
            <span className="ps-waiting-timer-digits font-mono font-bold">
              {timeString}
            </span>
          </div>
        )}
      </div>

      {/* Main Metric Chips */}
      {isWaiting && (
        <div className="ps-waiting-metrics-grid">
          <div className="ps-waiting-metric-card">
            <span className="ps-waiting-metric-label">Elapsed Time</span>
            <span className="ps-waiting-metric-value font-mono">
              {currentMinutes}m {currentRemainderSec}s
            </span>
            <span className="ps-waiting-metric-hint">
              {isWaiting ? 'Live tracking' : 'Total duration'}
            </span>
          </div>

          <div className="ps-waiting-metric-card">
            <span className="ps-waiting-metric-label">
              {isFreeTier ? 'Free Window Left' : 'Next +₹10 In'}
            </span>
            <span className={`ps-waiting-metric-value font-bold ${isFreeTier ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isFreeTier ? `${freeMinutesRemaining} min left` : `~${nextBlockMinutesRemaining} min`}
            </span>
            <span className="ps-waiting-metric-hint">
              {isFreeTier ? 'Zero charge until 10m' : '+₹10 every 10 full mins'}
            </span>
          </div>

          <div className="ps-waiting-metric-card">
            <span className="ps-waiting-metric-label">Waiting Fee</span>
            <span className={`ps-waiting-metric-value font-bold ${isFreeTier ? 'text-emerald-700' : 'text-primary'}`}>
              {isFreeTier ? '₹0.00' : `+₹${effectiveWaitingFare.toFixed(2)}`}
            </span>
            <span className="ps-waiting-metric-hint">
              {isFreeTier ? 'Complimentary' : 'Added to base fare'}
            </span>
          </div>
        </div>
      )}

      {/* Progress Bar (Free tier countdown or Paid tier block progress) */}
      {isWaiting && (
        <div className="ps-waiting-progress-wrap">
          <div className="ps-waiting-progress-labels">
            <span className="font-label-sm">
              {isFreeTier ? (
                <>
                  <strong>{currentMinutes} of 10 min</strong> free window elapsed
                </>
              ) : (
                <>
                  <strong>Paid Tier {Math.floor(currentMinutes / 10)}:</strong> +₹{effectiveWaitingFare} added
                </>
              )}
            </span>
            <span className="font-label-sm font-bold text-primary">
              {isFreeTier
                ? `${Math.round(freeProgressPercent)}%`
                : `${Math.round(paidBlockProgressPercent)}%`}
            </span>
          </div>

          <div className="ps-waiting-progress-track">
            <div
              className={`ps-waiting-progress-fill ${widgetMode === 'paid_active' ? 'is-paid' : 'is-free'}`}
              style={{
                width: `${isFreeTier ? freeProgressPercent : paidBlockProgressPercent}%`
              }}
            />
          </div>

          <div className="ps-waiting-progress-ticks">
            <span>0m (Pickup)</span>
            <span>{isFreeTier ? '5m' : `${Math.floor(currentMinutes / 10) * 10}m`}</span>
            <span>{isFreeTier ? '10m (Free Limit)' : `${(Math.floor(currentMinutes / 10) + 1) * 10}m (+₹10)`}</span>
          </div>
        </div>
      )}

      {/* Concluded Summary (when not currently waiting, but waiting minutes accrued) */}
      {widgetMode === 'concluded' && (
        <div className="ps-waiting-concluded-banner">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-body-sm font-semibold text-on-surface">
              {waitingMinutes} minutes of driver waiting recorded (+₹{effectiveWaitingFare.toFixed(2)} waiting fee).
            </p>
          </div>
        </div>
      )}

      {/* Driver At Pickup Standby Notice */}
      {widgetMode === 'arrived_standby' && (
        <div className="ps-waiting-standby-banner">
          <Sparkles size={16} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-body-sm text-on-surface">
              Your driver has arrived at the pickup spot. You have <strong>10 free minutes</strong> to board before standard waiting fees (₹10/10 min) commence.
            </p>
          </div>
        </div>
      )}

      {/* Transparent Itemized Fare Ribbon */}
      <div className="ps-waiting-fare-ribbon">
        <div className="ps-waiting-fare-item">
          <span className="ps-waiting-fare-item-label">Trip Base</span>
          <span className="ps-waiting-fare-item-val font-mono">₹{baseFare.toFixed(2)}</span>
        </div>
        <div className="ps-waiting-fare-item-sep">+</div>
        <div className="ps-waiting-fare-item">
          <span className="ps-waiting-fare-item-label">Waiting</span>
          <span className={`ps-waiting-fare-item-val font-mono ${effectiveWaitingFare > 0 ? 'text-primary font-bold' : ''}`}>
            {effectiveWaitingFare > 0 ? `₹${effectiveWaitingFare.toFixed(2)}` : '₹0.00 (Free)'}
          </span>
        </div>
        <div className="ps-waiting-fare-item-sep">=</div>
        <div className="ps-waiting-fare-item is-total">
          <span className="ps-waiting-fare-item-label">Current Total</span>
          <span className="ps-waiting-fare-item-val font-mono font-bold text-on-surface">
            ₹{totalFare.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Policy reassurance footnote */}
      <div className="ps-waiting-policy-note">
        <Info size={13} className="shrink-0 text-outline" />
        <span>
          PU Campus Waiting Policy: 0–9 mins free waiting. ₹10 billed for every 10 full minutes of driver waiting.
        </span>
      </div>
    </div>
  );
}

export default WaitingWidget;
