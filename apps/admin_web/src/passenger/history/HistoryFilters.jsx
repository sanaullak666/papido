import React from 'react';

export function HistoryFilters({ filters, active, counts, onChange }) {
  return (
    <div className="ps-hist-filters" role="tablist">
      {filters.map((f) => {
        const isActive = active === f.id;
        const count = counts?.[f.id] ?? 0;
        return (
          <button
            key={f.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(f.id)}
            className={`ps-hist-filter ${isActive ? 'is-active' : ''}`}
          >
            {f.label}
            {count > 0 && (
              <span className="ps-hist-filter-count">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default HistoryFilters;
