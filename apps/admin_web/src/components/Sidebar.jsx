import React from 'react';
import {
  LayoutDashboard,
  Users,
  Bike,
  Navigation,
  Globe,
  DollarSign,
  Sliders,
  FileBarChart,
  Smartphone,
  LogOut,
  Shield,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ currentTab, setCurrentTab, isOpen, onClose, hasPendingOutsideAlert }) {
  const { user, adminUser, logout, adminLogout } = useAuth();
  const currentUser = adminUser || user;
  const handleLogout = adminUser ? adminLogout : logout;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'passenger-portal', label: 'Passenger Web Portal', icon: Users, badge: 'WEB' },
    { id: 'driver-portal', label: 'Driver Web Portal', icon: Bike, badge: 'WEB' },
    { id: 'outside-trips', label: 'Outside Trips Dispatch', icon: Globe, badge: hasPendingOutsideAlert ? '🚨 NEW' : 'DISPATCH' },
    { id: 'core-team', label: 'Core Team Management', icon: Shield, badge: 'CORE' },
    { id: 'customers', label: 'Customers Directory', icon: Users },
    { id: 'riders', label: 'Riders (Drivers)', icon: Bike },
    { id: 'rides', label: 'Ride Operations', icon: Navigation },
    { id: 'fares', label: 'Fare & Split Rules', icon: Sliders },
    { id: 'payments', label: 'Payments Ledger', icon: DollarSign },
    { id: 'reports', label: 'Reports & Analytics', icon: FileBarChart },
    { id: 'simulator', label: 'Live Multi-App Test', icon: Smartphone, badge: 'LIVE' }
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
        <div className="brand-header">
          <div className="brand-logo">P</div>
          <div>
            <div className="brand-title">PAPIDO</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Admin Portal</div>
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

      <ul className="nav-list">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isOutsideAlert = item.id === 'outside-trips' && hasPendingOutsideAlert;
          return (
            <li key={item.id}>
              <button
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{
                  width: '100%',
                  background: isOutsideAlert ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                  textAlign: 'left',
                  border: isOutsideAlert ? '1px solid #F59E0B' : 'none'
                }}
                onClick={() => {
                  setCurrentTab(item.id);
                  if (onClose) onClose();
                }}
              >
                <Icon size={18} color={isOutsideAlert ? '#F59E0B' : undefined} />
                <span style={{ fontWeight: isOutsideAlert ? 800 : undefined, color: isOutsideAlert ? '#F59E0B' : undefined }}>{item.label}</span>
                {item.badge && (
                  <span
                    className="nav-item-badge"
                    style={{
                      background: isOutsideAlert ? '#F59E0B' : undefined,
                      color: isOutsideAlert ? '#000' : 'var(--primary)',
                      fontWeight: 800
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

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
