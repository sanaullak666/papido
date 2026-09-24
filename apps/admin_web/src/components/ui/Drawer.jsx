import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import IconButton from './IconButton';

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = '480px',
  className = '',
  style = {}
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(11, 15, 25, 0.75)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: '100%',
          maxWidth: width,
          height: '100%',
          background: 'var(--bg-card, #131D31)',
          borderLeft: '1px solid var(--border, #23314E)',
          boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideLeft 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          ...style
        }}
        className={`drawer-ui ${className}`}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border, #23314E)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            background: 'var(--bg-sidebar, #0F172A)'
          }}
        >
          <div>
            {title && (
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading, inherit)',
                  color: 'var(--text-primary, #F8FAFC)',
                  margin: 0
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted, #64748B)',
                  margin: '4px 0 0 0'
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {onClose && (
            <IconButton
              icon={X}
              onClick={onClose}
              variant="ghost"
              size="sm"
              aria-label="Close drawer"
            />
          )}
        </div>

        {/* Drawer Content */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {children}
        </div>

        {/* Drawer Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border, #23314E)',
              background: 'var(--bg-sidebar, #0F172A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
export default Drawer;
