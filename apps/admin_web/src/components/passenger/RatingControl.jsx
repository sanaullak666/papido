import React, { useState } from 'react';
import { Star } from 'lucide-react';

export function RatingControl({
  value = 5,
  onChange,
  readOnly = false,
  size = 28,
  className = '',
  style = {}
}) {
  const [hoverValue, setHoverValue] = useState(null);

  const stars = [1, 2, 3, 4, 5];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        ...style
      }}
      className={`rating-control-ui ${className}`}
      role="radiogroup"
      aria-label="Rating"
    >
      {stars.map((star) => {
        const isFilled = (hoverValue !== null ? hoverValue : value) >= star;

        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange && onChange(star)}
            onMouseEnter={() => !readOnly && setHoverValue(star)}
            onMouseLeave={() => !readOnly && setHoverValue(null)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              cursor: readOnly ? 'default' : 'pointer',
              color: isFilled ? 'var(--primary, #F59E0B)' : '#CBD5E1',
              transition: 'transform 0.1s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none'
            }}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            aria-checked={value === star}
            role="radio"
          >
            <Star
              size={size}
              fill={isFilled ? 'currentColor' : 'none'}
              strokeWidth={isFilled ? 0 : 2}
            />
          </button>
        );
      })}
    </div>
  );
}
export default RatingControl;
