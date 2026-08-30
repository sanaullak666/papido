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

  const navItems = [
    { id: 'dashboard', path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'daily-settlements', path: '/admin/daily-settlements', label: 'Daily Deductions', icon: CreditCard, badge: 'DAILY' },
    { id: 'outside-trips', path: '/admin/outside-trips', label: 'Outside Trips Dispatch', icon: Globe, badge: hasPendingOutsideAlert ? 'NEW' : 'DISPATCH' },
    { id: 'core-team', path: '/admin/core-team', label: 'Core Team Management', icon: Shield, badge: 'CORE' },
    { id: 'customers', path: '/admin/customers', label: 'Customers Directory', icon: Users },
    { id: 'riders', path: '/admin/riders', label: 'Riders (Drivers)', icon: Bike },
    { id: 'rides', path: '/admin/rides', label: 'Ride Operations', icon: Navigation },
    { id: 'fares', path: '/admin/fares', label: 'Fare & Split Rules', icon: Sliders },
    { id: 'payments', path: '/admin/payments', label: 'Payments Ledger', icon: DollarSign },
    { id: 'reports', path: '/admin/reports', label: 'Reports & Analytics', icon: FileBarChart }
  ];

  return (
    <>
      {isOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`sidebar ${isOpen ? 'mobile-open' : ''}`}
        aria-label="Admin Navigation Sidebar"
      >
        <div className="brand-header">
          <div className="brand-logo" aria-hidden="true">P</div>
          <div>
            <div className="brand-title">PAPIDO</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Command Console</div>
          </div>
          <span className="brand-badge">PROD</span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px'
              }}
              title="Close Menu"
              aria-label="Close sidebar menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="nav-list" aria-label="Main Menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isOutsideAlert = item.id === 'outside-trips' && hasPendingOutsideAlert;

            return (
              <a
                key={item.id}
                href={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{
                  background: isOutsideAlert && !isActive ? 'rgba(245, 158, 11, 0.12)' : undefined,
                  borderColor: isOutsideAlert && !isActive ? 'rgba(245, 158, 11, 0.5)' : undefined
                }}
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigate) {
                    onNavigate(item.path, item.id);
                  }
                  if (onClose) onClose();
                }}
              >
                <Icon size={18} color={isOutsideAlert ? '#F59E0B' : undefined} />
                <span style={{ fontWeight: isOutsideAlert ? 800 : undefined, color: isOutsideAlert && !isActive ? '#F59E0B' : undefined }}>
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    className="nav-item-badge"
                    style={{
                      background: isOutsideAlert ? 'var(--primary)' : undefined,
                      color: isOutsideAlert ? '#000' : undefined,
                      fontWeight: 800
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {currentUser && (
          <div className="user-profile-widget">
            <img
              src={currentUser.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={currentUser.name || 'Admin'}
              className="user-avatar"
            />
            <div className="user-info">
              <div className="user-name">{currentUser.name || 'Master Admin'}</div>
              <div className="user-role">{adminUser ? 'Super Admin' : 'Administrator'}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Log Out of Admin Portal"
              aria-label="Log Out of Admin Portal"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#F87171',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
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
