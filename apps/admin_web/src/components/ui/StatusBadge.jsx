import React from 'react';
import { getRideStatus } from '../../design/statusConfig';

export function StatusBadge({
  status,
  label,
  tone,
  icon: CustomIcon,
  size = 'md', // 'sm' | 'md'
  showIcon = true,
  showDot = false,
  className = '',
  style = {}
}) {
  const config = getRideStatus(status);
  const displayLabel = label || config.label;
  const Icon = CustomIcon || config.icon;

  const getToneColors = () => {
    const t = tone || config.tone;
    switch (t) {
      case 'success':
        return {
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      case 'info':
        return {
          color: '#06B6D4',
          bg: 'rgba(6, 182, 212, 0.12)',
          border: 'rgba(6, 182, 212, 0.3)'
        };
      case 'danger':
        return {
          color: '#F43F5E',
          bg: 'rgba(244, 63, 94, 0.12)',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'brand':
      case 'primary':
      case 'warning':
      default:
        return {
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)'
        };
    }
  };

  const colors = getToneColors();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: 'var(--radius-full, 9999px)',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        letterSpacing: '0.01em',
        lineHeight: 1.4,
        background: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...style
      }}
      className={`status-badge-ui ${className}`}
    >
      {showDot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: colors.color,
            display: 'inline-block',
            flexShrink: 0
          }}
        />
      )}
      {showIcon && Icon && <Icon size={size === 'sm' ? 12 : 14} style={{ flexShrink: 0 }} />}
      <span>{displayLabel}</span>
    </span>
  );
}
export default StatusBadge;
