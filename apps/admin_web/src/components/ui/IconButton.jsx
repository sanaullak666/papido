import React from 'react';

export function IconButton({
  icon: Icon,
  onClick,
  title,
  'aria-label': ariaLabel,
  variant = 'secondary', // 'secondary' | 'ghost' | 'danger' | 'primary'
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  className = '',
  style = {},
  ...props
}) {
  const pixelSize = size === 'sm' ? 36 : size === 'lg' ? 48 : 42;
  const iconPixel = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--primary, #F59E0B)',
          color: '#0F172A',
          border: 'none'
        };
      case 'danger':
        return {
          background: 'rgba(244, 63, 94, 0.12)',
          color: '#F43F5E',
          border: '1px solid rgba(244, 63, 94, 0.3)'
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--text-secondary, #94A3B8)',
          border: 'none'
        };
      case 'secondary':
      default:
        return {
          background: 'var(--bg-input, #1E293B)',
          color: 'var(--text-primary, #F8FAFC)',
          border: '1px solid var(--border, #23314E)'
        };
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || ariaLabel}
      aria-label={ariaLabel || title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${pixelSize}px`,
        height: `${pixelSize}px`,
        minWidth: '40px',
        minHeight: '40px',
        borderRadius: 'var(--radius-sm, 6px)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        flexShrink: 0,
        ...getVariantStyle(),
        ...style
      }}
      className={`icon-btn ${className}`}
      {...props}
    >
      <Icon size={iconPixel} />
    </button>
  );
}
export default IconButton;
