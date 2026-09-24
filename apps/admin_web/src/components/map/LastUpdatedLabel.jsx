import React, { useEffect, useState } from 'react';

export function LastUpdatedLabel({
  lastUpdatedTimestamp,
  className = '',
  style = {}
}) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const update = () => {
      if (!lastUpdatedTimestamp) {
        setSecondsAgo(999);
        return;
      }
      const timeMs = new Date(lastUpdatedTimestamp).getTime();
      const diff = Math.max(0, Math.round((Date.now() - timeMs) / 1000));
      setSecondsAgo(diff);
    };

    update();
    const timer = setInterval(update, 3000);
    return () => clearInterval(timer);
  }, [lastUpdatedTimestamp]);

  let statusText = 'Driver location is live';
  let dotColor = '#10B981';
  let bg = '#ECFDF5';
  let textColor = '#065F46';

  if (secondsAgo <= 15) {
    statusText = 'Driver location is live';
    dotColor = '#10B981';
    bg = '#ECFDF5';
    textColor = '#065F46';
  } else if (secondsAgo <= 45) {
    statusText = `Driver location updated ${secondsAgo} seconds ago`;
    dotColor = '#F59E0B';
    bg = '#FFFBEB';
    textColor = '#92400E';
  } else if (secondsAgo <= 120) {
    statusText = 'Driver location delayed';
    dotColor = '#EA580C';
    bg = '#FFF7ED';
    textColor = '#9A3412';
  } else {
    statusText = 'Driver location is temporarily unavailable';
    dotColor = '#64748B';
    bg = '#F1F5F9';
    textColor = '#475569';
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        background: bg,
        color: textColor,
        fontSize: '11px',
        fontWeight: 700,
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
        ...style
      }}
      className={`papido-last-updated-label ${className}`}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: dotColor,
          display: 'inline-block',
          boxShadow: secondsAgo <= 15 ? `0 0 6px ${dotColor}` : 'none'
        }}
      />
      <span>{statusText}</span>
    </div>
  );
}

export default LastUpdatedLabel;
