import React from 'react';
import './PassengerUI.css';

export function PSButton({ variant = 'primary', size = 'md', block, ripple, children, ...rest }) {
  const cls = [
    'ps-btn',
    `ps-btn--${variant}`,
    `ps-btn--${size}`,
    block && 'ps-btn--block',
    ripple && 'ps-btn--ripple'
  ].filter(Boolean).join(' ');
  return <button className={cls} {...rest}>{children}</button>;
}

export function PSCard({ children, className = '', glass = true, ...rest }) {
  return (
    <div className={`ps-card ${glass ? 'is-glass' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function PSField({ label, hint, children }) {
  return (
    <div className="ps-field">
      {label && <label className="ps-field-label">{label}</label>}
      {children}
      {hint && <div className="ps-field-hint">{hint}</div>}
    </div>
  );
}

export function PSSwitch({ checked, onChange, tone = 'amber', label }) {
  return (
    <label className={`ps-switch ${checked ? 'is-on' : ''} ${tone === 'pink' ? 'is-pink' : ''}`}>
      {label}
      <input
        type="checkbox"
        className="ps-switch-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="ps-switch-thumb" />
    </label>
  );
}

export function PSSkeleton({ lines = 3 }) {
  return (
    <div className="ps-skeleton">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="ps-skeleton-line"
          style={{ width: i === 0 ? '40%' : '100%' }}
        />
      ))}
    </div>
  );
}
