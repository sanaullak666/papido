import React, { useEffect, useRef, useState } from 'react';
import { Bike, Calendar } from 'lucide-react';

/* Simple RAF count-up */
function useCountUp(target = 0, duration = 700) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

export function HistorySummary({ totalRides = 0, prebookedRides = 0 }) {
  const rides = useCountUp(totalRides);
  const prebooked = useCountUp(prebookedRides);

  return (
    <div className="ps-hist-summary ps-fade-up">
      <div className="ps-hist-summary-cell">
        <div className="ps-hist-summary-icon">
          <Bike size={16} />
        </div>
        <div className="ps-hist-summary-body">
          <div className="ps-hist-summary-value">{rides}</div>
          <div className="ps-hist-summary-label">
            {totalRides === 1 ? 'Ride completed' : 'Rides completed'}
          </div>
        </div>
      </div>

      <div className="ps-hist-summary-divider" aria-hidden="true" />

      <div className="ps-hist-summary-cell">
        <div className="ps-hist-summary-icon ps-hist-summary-icon--blue">
          <Calendar size={16} />
        </div>
        <div className="ps-hist-summary-body">
          <div className="ps-hist-summary-value">{prebooked}</div>
          <div className="ps-hist-summary-label">
            {prebookedRides === 1 ? 'Pre-booked trip' : 'Pre-booked trips'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistorySummary;
