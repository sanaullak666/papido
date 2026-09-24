import React from 'react';
import './RiderUI.css';

export function RPButton({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const cls = [
    'rp-btn',
    `rp-btn--${variant}`,
    `rp-btn--${size}`,
    block ? 'rp-btn--block' : '',
    loading ? 'is-loading' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} disabled={disabled || loading} {...props}>
      {loading ? (
        <span className="rp-btn-spinner rp-spin">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
        </span>
      ) : null}
      {children}
    </button>
  );
}

export function RPCard({
  children,
  className = '',
  solid = false,
  ...props
}) {
  const cls = ['rp-card', solid ? 'rp-card--solid' : '', className].filter(Boolean).join(' ');
  return (
    <div className={cls} {...props}>
      {children}
    </div>
  );
}

export function RPField({
  label,
  hint,
  error,
  children,
  className = '',
  ...props
}) {
  return (
    <div className={`rp-field ${className}`} {...props}>
      {label && <label className="rp-field-label">{label}</label>}
      {children}
      {hint && !error && <span className="rp-field-hint">{hint}</span>}
      {error && <span className="rp-field-error">{error}</span>}
    </div>
  );
}

export function RPBadge({
  children,
  variant = 'neutral',
  className = '',
  ...props
}) {
  return (
    <span className={`rp-badge rp-badge--${variant} ${className}`} {...props}>
      {children}
    </span>
  );
}

export function RPSkeleton({ width = '100%', height = '20px', className = '', style = {} }) {
  return (
    <div
      className={`rp-skeleton ${className}`}
      style={{ width, height, ...style }}
    />
  );
}
