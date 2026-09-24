import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function MetricCard({
  label,
  value,
  trend,
  trendDirection = 'up', // 'up' | 'down' | 'neutral'
  trendText,
  icon: Icon,
  iconColor = 'var(--primary, #F59E0B)',
  iconBg = 'rgba(245, 158, 11, 0.12)',
  badge,
  onClick,
  className = '',
  style = {}
}) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card, #131D31)',
        border: '1px solid var(--border, #23314E)',
        borderRadius: 'var(--radius-md, 10px)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '12px',
        position: 'relative',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
        ...style
      }}
      className={`metric-card-ui ${isClickable ? 'clickable' : ''} ${className}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-secondary, #94A3B8)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          {label}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {badge && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#F59E0B'
              }}
            >
              {badge}
            </span>
          )}
          {Icon && (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm, 6px)',
                background: iconBg,
                color: iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Icon size={18} />
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 700,
            fontFamily: 'var(--font-heading, inherit)',
            color: 'var(--text-primary, #F8FAFC)',
            lineHeight: 1.15
          }}
        >
          {value ?? '—'}
        </div>

        {(trend || trendText) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginTop: '2px' }}>
            {trend && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontWeight: 700,
                  color: trendDirection === 'up' ? '#10B981' : trendDirection === 'down' ? '#F43F5E' : 'var(--text-muted, #64748B)'
                }}
              >
                {trendDirection === 'up' && <ArrowUpRight size={14} />}
                {trendDirection === 'down' && <ArrowDownRight size={14} />}
                {trend}
              </span>
            )}
            {trendText && (
              <span style={{ color: 'var(--text-muted, #64748B)' }}>
                {trendText}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export default MetricCard;
