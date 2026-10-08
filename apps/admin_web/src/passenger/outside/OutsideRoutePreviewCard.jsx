import React from 'react';
import { Compass, Navigation } from 'lucide-react';

export function OutsideRoutePreviewCard({ destination, pickup = 'Campus Gate 1 (Main Entrance)' }) {
  // Approximate distance & fare based on destination
  const getDestinationEstimate = (dest) => {
    const d = (dest || '').toLowerCase();
    if (d.includes('beach') || d.includes('promenade') || d.includes('white town')) {
      return { dist: '13.8 km', fare: '₹165 - ₹180' };
    }
    if (d.includes('jipmer')) {
      return { dist: '11.2 km', fare: '₹135 - ₹150' };
    }
    if (d.includes('station') || d.includes('railway')) {
      return { dist: '14.5 km', fare: '₹175 - ₹195' };
    }
    if (d.includes('auroville')) {
      return { dist: '8.4 km', fare: '₹100 - ₹120' };
    }
    if (d.includes('ecr')) {
      return { dist: '4.2 km', fare: '₹50 - ₹65' };
    }
    return { dist: '12.0 km', fare: '₹145 - ₹165' };
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

      {/* Simulated Map / Route Preview Snippet */}
      <div
        className="ps-outside-map-preview"
        style={{
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBYDPmb_HtzBj4hS9UHI4JSuw3BSdLaORUev_9sr2cU31f7a6YeKd-5DcVPDMTehBcR8bHUwUtLxQHvRgfqOX3OncsLQG3ZOpJz5DugyhkZD4TOvtT8_BEzWb_nmU4OV789o_oyk60SMwSHm-5orTu8J82RBHlDc6hDHRzQD07DhGpzmhGP7cZyvuorSqXsL51Nh5kMt1r1G0LDXXwovaY-6rZAWdA31EiRw5bPr5VLddRa8OBgCLcecQ')`
        }}
      >
        <div className="ps-outside-map-overlay" />
        <div className="ps-outside-map-info">
          <div>
            <p className="font-label-sm text-white/80">Estimated Distance</p>
            <p className="font-headline-md font-bold text-white leading-tight">{estimate.dist}</p>
          </div>
          <div className="text-right">
            <p className="font-label-sm text-white/80">Approx Fare</p>
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
