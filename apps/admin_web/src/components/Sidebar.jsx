import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Bike,
  Navigation,
  Globe,
  DollarSign,
  Sliders,
  FileBarChart,
  LogOut,
  Shield,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ currentTab, onNavigate, isOpen, onClose, hasPendingOutsideAlert }) {
  const { user, adminUser, logout, adminLogout } = useAuth();
  const currentUser = adminUser || user;
  const handleLogout = adminUser ? adminLogout : logout;

  // Grouped Navigation Structure
  const navGroups = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'rides', path: '/admin/rides', label: 'Live Rides', icon: Navigation }
      ]
    },
    {
      title: 'Operations',
      items: [
        {
          id: 'outside-trips',
          path: '/admin/outside-trips',
          label: 'Dispatch',
          icon: Globe,
          badge: hasPendingOutsideAlert ? 'NEW' : 'DISPATCH',
          alert: hasPendingOutsideAlert
        },
        { id: 'core-team', path: '/admin/core-team', label: 'Core Team', icon: Shield, badge: 'CORE' }
      ]
    },
    {
      title: 'People',
      items: [
        { id: 'riders', path: '/admin/riders', label: 'Riders', icon: Bike },
        { id: 'customers', path: '/admin/customers', label: 'Customers', icon: Users }
      ]
    },
    {
      title: 'Finance',
      items: [
        { id: 'daily-settlements', path: '/admin/daily-settlements', label: 'Settlements', icon: CreditCard, badge: 'DAILY' },
        { id: 'payments', path: '/admin/payments', label: 'Payments', icon: DollarSign },
        { id: 'fares', path: '/admin/fares', label: 'Pricing Rules', icon: Sliders }
      ]
    },
    {
      title: 'Intelligence',
      items: [
        { id: 'reports', path: '/admin/reports', label: 'Reports', icon: FileBarChart }
      ]
    }
  ];

  return (
    <>
      {isOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="brand-header">
          <div className="brand-logo">P</div>
          <div>
            <div className="brand-title">PAPIDO</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Operations Console</div>
          </div>
          <span className="brand-badge">PROD</span>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Close Menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Grouped Navigation */}
        <div
          className="nav-list-wrapper"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0'
          }}
        >
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: '8px' }}>
              <div className="nav-group-title">
                {group.title}
              </div>

              <ul className="nav-list" style={{ listStyle: 'none', padding: '0 8px', margin: 0 }}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  const isOutsideAlert = item.alert;

                  return (
                    <li key={item.id} style={{ marginBottom: '2px' }}>
                      <a
                        href={item.path}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        style={{
                          width: '100%',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm, 6px)',
                          background: isOutsideAlert
                            ? 'rgba(245, 158, 11, 0.18)'
                            : isActive
                            ? 'rgba(245, 158, 11, 0.12)'
                            : 'transparent',
                          color: isOutsideAlert || isActive ? 'var(--primary, #F59E0B)' : 'var(--text-secondary, #94A3B8)',
                          fontWeight: isOutsideAlert || isActive ? 700 : 500,
                          border: isOutsideAlert ? '1px solid #F59E0B' : '1px solid transparent',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          if (onNavigate) {
                            onNavigate(item.path, item.id);
                          }
                          if (onClose) onClose();
                        }}
                      >
                        <Icon size={18} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '13px' }}>{item.label}</span>
                        {item.badge && (
                          <span
                            className="nav-item-badge"
                            style={{
                              background: isOutsideAlert ? '#F59E0B' : 'rgba(255, 255, 255, 0.08)',
                              color: isOutsideAlert ? '#0F172A' : 'var(--text-secondary, #94A3B8)',
                              fontWeight: 700,
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* User Profile Widget */}
        {currentUser && (
          <div className="user-profile-widget">
            <img
              src={currentUser.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={currentUser.name}
              className="user-avatar"
            />
            <div className="user-info">
              <div className="user-name">{currentUser.name || 'Admin'}</div>
              <div className="user-role">{adminUser ? 'Super Admin' : 'Administrator'}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Log Out of Admin Portal"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#F87171',
                cursor: 'pointer',
                padding: '6px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
export default Sidebar;
