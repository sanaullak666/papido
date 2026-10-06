import React from 'react';

export function BottomNavigation({
  items = [],
  activeId,
  onChange,
  theme = 'rider' // 'rider' | 'passenger'
}) {
  const isDark = theme === 'rider';

  return (
    <nav
      className={`papido-bottom-nav ${!isDark ? 'papido-bottom-nav--passenger' : ''}`}
      style={{
        background: isDark ? '#131D31' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: isDark ? 'none' : 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: isDark ? 'none' : 'blur(16px) saturate(180%)',
        borderTop: `1.5px solid ${isDark ? '#23314E' : 'rgba(232, 220, 203, 0.9)'}`,
        color: isDark ? '#94A3B8' : '#796D61',
        boxShadow: isDark ? 'none' : '0 -4px 20px rgba(39, 30, 22, 0.06)'
      }}
      aria-label="Mobile Navigation"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeId === item.id;
        const activeColor = 'var(--primary, #EA580C)';
        const normalColor = isDark ? '#94A3B8' : '#796D61';

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`papido-bottom-nav-item ${isActive ? 'is-active' : ''}`}
            style={{
              background: 'transparent',
              border: 'none',
              color: isActive ? activeColor : normalColor,
              transition: 'all 0.16s ease'
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                transform: (!isDark && isActive) ? 'scale(1.1) translateY(-1px)' : 'scale(1)',
                transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <Icon size={20} color={isActive ? activeColor : normalColor} />
              {item.badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-8px',
                    background: '#EF4444',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    fontSize: '9px',
                    fontWeight: 900,
                    padding: '1px 5px',
                    lineHeight: 1
                  }}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: isActive ? 800 : 600,
                letterSpacing: '-0.01em',
                marginTop: '2px'
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
export default BottomNavigation;
