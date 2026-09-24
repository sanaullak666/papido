import React from 'react';
import Button from './Button';

export function EmptyState({
  icon: Icon,
  title = 'No records found',
  description = 'There is currently no activity to display here.',
  actionLabel,
  onAction,
  actionIcon,
  actionComponent,
  className = '',
  style = {}
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        background: 'var(--bg-card, #131D31)',
        border: '1px dashed var(--border, #23314E)',
        borderRadius: 'var(--radius-md, 10px)',
        ...style
      }}
      className={`empty-state-ui ${className}`}
    >
      {Icon && (
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.12)',
            color: 'var(--primary, #F59E0B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}
        >
          <Icon size={28} />
        </div>
      )}

      <h4
        style={{
          fontSize: '16px',
          fontWeight: 700,
          fontFamily: 'var(--font-heading, inherit)',
          color: 'var(--text-primary, #F8FAFC)',
          margin: '0 0 6px 0'
        }}
      >
        {title}
      </h4>

      {description && (
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted, #64748B)',
            maxWidth: '380px',
            margin: '0 0 20px 0',
            lineHeight: 1.5
          }}
        >
          {description}
        </p>
      )}

      {actionComponent}

      {!actionComponent && actionLabel && onAction && (
        <Button
          onClick={onAction}
          icon={actionIcon}
          variant="secondary"
          size="sm"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
export default EmptyState;
