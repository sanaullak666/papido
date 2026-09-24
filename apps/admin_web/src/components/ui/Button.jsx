import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
  size = 'md',        // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  style = {},
  title,
  ...props
}) {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'var(--font-sans, inherit)',
    fontWeight: 600,
    borderRadius: 'var(--radius-sm, 6px)',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.65 : 1,
    transition: 'all 0.15s ease',
    textDecoration: 'none',
    border: 'none',
    outline: 'none',
    userSelect: 'none',
    width: fullWidth ? '100%' : 'auto',
    minHeight: size === 'sm' ? '36px' : size === 'lg' ? '48px' : '42px',
    padding: size === 'sm' ? '6px 12px' : size === 'lg' ? '12px 24px' : '9px 18px',
    fontSize: size === 'sm' ? '12px' : size === 'lg' ? '15px' : '13px',
    ...style
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--primary, #F59E0B)',
          color: '#0F172A', // Dark text on amber for accessible WCAG AA contrast (8.5:1)
          fontWeight: 700,
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)'
        };
      case 'secondary':
        return {
          background: 'var(--bg-input, #1E293B)',
          color: 'var(--text-primary, #F8FAFC)',
          border: '1px solid var(--border, #23314E)'
        };
      case 'danger':
        return {
          background: 'rgba(244, 63, 94, 0.15)',
          color: '#F43F5E',
          border: '1px solid rgba(244, 63, 94, 0.35)'
        };
      case 'success':
        return {
          background: 'rgba(16, 185, 129, 0.15)',
          color: '#10B981',
          border: '1px solid rgba(16, 185, 129, 0.35)'
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--text-secondary, #94A3B8)',
          border: 'none'
        };
      default:
        return {};
    }
  };

  const combinedStyles = {
    ...baseStyle,
    ...getVariantStyles(),
    ...style
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={combinedStyles}
      className={`btn-ui ${className}`}
      title={title}
      {...props}
    >
      {loading && <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />}
      {!loading && Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      <span>{children}</span>
      {!loading && IconRight && <IconRight size={size === 'sm' ? 14 : 16} />}
    </button>
  );
}
export default Button;
