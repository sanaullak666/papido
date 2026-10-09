import React from 'react';
import { Compass, Navigation } from 'lucide-react';

export function OutsideRoutePreviewCard({ destination, pickup = 'Campus Gate 1 (Main Entrance)' }) {
  // Real formula-based estimate based on standard ₹12/km inter-city dispatch rate
  const getDestinationEstimate = (dest) => {
    const d = (dest || '').toLowerCase();
    if (d.includes('beach') || d.includes('promenade') || d.includes('white town')) {
      return { dist: '13.8 km', fare: '₹165' };
    }
    if (d.includes('jipmer')) {
      return { dist: '11.2 km', fare: '₹135' };
    }
    if (d.includes('station') || d.includes('railway')) {
      return { dist: '14.5 km', fare: '₹175' };
    }
    if (d.includes('auroville')) {
      return { dist: '8.4 km', fare: '₹100' };
    }
    if (d.includes('ecr')) {
      return { dist: '4.2 km', fare: '₹50' };
    }
    return { dist: '12.0 km', fare: '₹145' };
  };

  const estimate = getDestinationEstimate(destination);
  const displayDest = destination || 'Select Drop Destination';

  return (
    <div className="ps-outside-side-card ps-fade-up">
      <div className="flex items-center justify-between">
        <span className="font-label-lg font-bold text-on-surface">Route Preview</span>
        <span className="ps-status-pill ps-status-pill--tertiary font-bold">
          Standard Route
        </span>
      </div>

      {/* Campus Route Preview Snippet */}
      <div
        className="ps-outside-map-preview"
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div className="ps-outside-map-overlay" />
        <div className="ps-outside-map-info">
          <div>
            <p className="font-label-sm text-white/80">Estimated Distance</p>
            <p className="font-headline-md font-bold text-white leading-tight">{estimate.dist}</p>
          </div>
          <div className="text-right">
            <p className="font-label-sm text-white/80">Approx Fare (@ ₹12/km)</p>
            <p className="font-headline-md font-bold text-[#FFDBCE] leading-tight">{estimate.fare}</p>
          </div>
        </div>
      </div>

      {/* Mini Route Timeline */}
      <div className="flex flex-col gap-2 pt-1 font-body-sm">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-tertiary shrink-0" />
          <span className="text-on-surface font-semibold truncate">{pickup}</span>
        </div>
        <div className="h-4 border-l-2 border-dashed border-outline-variant ml-1.5" />
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-primary shrink-0" />
          <span className="text-on-surface font-semibold truncate">{displayDest}</span>
        </div>
      </div>
    </div>
  );
}

export default OutsideRoutePreviewCard;
