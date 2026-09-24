import React from 'react';

export function LoadingSkeleton({
  type = 'line', // 'line' | 'card' | 'metric' | 'table'
  count = 1,
  height,
  width,
  style = {},
  className = ''
}) {
  const pulseStyle = {
    background: 'linear-gradient(90deg, #1E293B 25%, #2A3854 50%, #1E293B 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite linear',
    borderRadius: 'var(--radius-sm, 6px)'
  };

  const renderSingle = (key) => {
    if (type === 'metric') {
      return (
        <div
          key={key}
          style={{
            background: 'var(--bg-card, #131D31)',
            border: '1px solid var(--border, #23314E)',
            borderRadius: 'var(--radius-md, 10px)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            ...style
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ ...pulseStyle, width: '100px', height: '14px' }} />
            <div style={{ ...pulseStyle, width: '36px', height: '36px', borderRadius: '6px' }} />
          </div>
          <div style={{ ...pulseStyle, width: '140px', height: '32px' }} />
          <div style={{ ...pulseStyle, width: '90px', height: '12px' }} />
        </div>
      );
    }

    if (type === 'card') {
      return (
        <div
          key={key}
          style={{
            background: 'var(--bg-card, #131D31)',
            border: '1px solid var(--border, #23314E)',
            borderRadius: 'var(--radius-md, 10px)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            ...style
          }}
        >
          <div style={{ ...pulseStyle, width: '60%', height: '18px' }} />
          <div style={{ ...pulseStyle, width: '90%', height: '14px' }} />
          <div style={{ ...pulseStyle, width: '40%', height: '14px' }} />
        </div>
      );
    }

    if (type === 'table') {
      return (
        <div
          key={key}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '16px',
            background: 'var(--bg-card, #131D31)',
            border: '1px solid var(--border, #23314E)',
            borderRadius: 'var(--radius-md, 10px)',
            ...style
          }}
        >
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ ...pulseStyle, width: '15%', height: '16px' }} />
              <div style={{ ...pulseStyle, width: '25%', height: '16px' }} />
              <div style={{ ...pulseStyle, width: '20%', height: '16px' }} />
              <div style={{ ...pulseStyle, width: '15%', height: '16px' }} />
              <div style={{ ...pulseStyle, width: '15%', height: '16px' }} />
            </div>
          ))}
        </div>
      );
    }

    // Default: 'line'
    return (
      <div
        key={key}
        style={{
          ...pulseStyle,
          height: height || '16px',
          width: width || '100%',
          ...style
        }}
        className={`skeleton-line ${className}`}
      />
    );
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => renderSingle(i))}
    </>
  );
}
export default LoadingSkeleton;
