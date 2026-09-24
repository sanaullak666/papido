import React from 'react';

export function PopularSpots({ spots, activeName, onSelect }) {
  return (
    <div className="ps-popular-wrap">
      <div className="ps-popular-label">Popular Destinations</div>
      <div className="ps-popular-grid">
        {spots.map((spot, i) => {
          const isActive = activeName === spot.name;
          return (
            <button
              key={spot.name}
              type="button"
              onClick={() => onSelect(spot)}
              className={`ps-popular-pill ${isActive ? 'is-active' : ''} ps-fade-up`}
              style={{ animationDelay: `${i * 25}ms` }}
            >
              {spot.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PopularSpots;
