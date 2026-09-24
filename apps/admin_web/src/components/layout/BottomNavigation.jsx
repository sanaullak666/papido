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
      className="papido-bottom-nav"
      style={{
        background: isDark ? '#131D31' : '#FFFFFF',
        borderTop: `1.5px solid ${isDark ? '#23314E' : '#E8DCCB'}`,
        color: isDark ? '#94A3B8' : '#78716C',
        boxShadow: isDark ? 'none' : '0 -4px 20px rgba(39, 30, 22, 0.08)'
      }}
      aria-label="Mobile Navigation"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeId === item.id;
        const activeColor = 'var(--primary, #EA580C)';
        const normalColor = isDark ? '#94A3B8' : '#78716C';

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className="papido-bottom-nav-item"
            style={{
              background: 'transparent',
              border: 'none',
              color: isActive ? activeColor : normalColor
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
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
            <span style={{ fontSize: '11px', fontWeight: isActive ? 800 : 600 }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
export default BottomNavigation;
