import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginView } from './views/LoginView';
import { AdminLoginView } from './views/AdminLoginView';
import { CustomerPortalView } from './views/CustomerPortalView';
import { RiderPortalView } from './views/RiderPortalView';
import { DashboardView } from './views/DashboardView';
import { OutsideTripsView } from './views/OutsideTripsView';
import { CustomersView } from './views/CustomersView';
import { RidersView } from './views/RidersView';
import { RidesView } from './views/RidesView';
import { FareSettingsView } from './views/FareSettingsView';
import { PaymentsView } from './views/PaymentsView';
import { ReportsView } from './views/ReportsView';
import { DailySettlementsView } from './views/DailySettlementsView';
import { CoreRegisterView } from './views/CoreRegisterView';
import { CoreTeamView } from './views/CoreTeamView';
import { useSocket } from './context/SocketContext';
import { alertManager } from './utils/alertManager';
import { apiRequest } from './api';
import { ArrowRight, AlertTriangle, X } from 'lucide-react';

const getAdminTabFromPath = (path) => {
  const cleanPath = (path || '').toLowerCase().replace(/\/+$/, '');
  if (!cleanPath || cleanPath === '/admin' || cleanPath === '/admin/dashboard' || cleanPath === '/admin/overview') return 'dashboard';
  if (cleanPath === '/admin/daily-settlements' || cleanPath === '/admin/settlements' || cleanPath === '/admin/deductions') return 'daily-settlements';
  if (cleanPath === '/admin/outside-trips' || cleanPath === '/admin/outside' || cleanPath === '/admin/dispatch') return 'outside-trips';
  if (cleanPath === '/admin/core-team' || cleanPath === '/admin/core' || cleanPath === '/admin/team') return 'core-team';
  if (cleanPath === '/admin/customers' || cleanPath === '/admin/passengers') return 'customers';
  if (cleanPath === '/admin/riders' || cleanPath === '/admin/drivers') return 'riders';
  if (cleanPath === '/admin/rides' || cleanPath === '/admin/trips' || cleanPath === '/admin/operations') return 'rides';
  if (cleanPath === '/admin/fares' || cleanPath === '/admin/fare-settings' || cleanPath === '/admin/pricing') return 'fares';
  if (cleanPath === '/admin/payments' || cleanPath === '/admin/transactions' || cleanPath === '/admin/ledger') return 'payments';
  if (cleanPath === '/admin/reports' || cleanPath === '/admin/analytics') return 'reports';
  return 'dashboard';
};

export function App() {
  const { user, adminUser, loading } = useAuth();
  const { socket } = useSocket() || {};
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentTab, setCurrentTab] = useState(() => getAdminTabFromPath(window.location.pathname));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newOutsideAlert, setNewOutsideAlert] = useState(null);
  const prevAdminPendingCountRef = useRef(null);

  // Background polling + Socket listener for Admin alerts across all pages
  useEffect(() => {
    if (!adminUser) return;

    const checkPendingOutsideRides = async () => {
      try {
        const res = await apiRequest('/admin/outside-rides');
        const pending = res.data?.pending || (Array.isArray(res.data) ? res.data : []);
        
        if (prevAdminPendingCountRef.current !== null && pending.length > prevAdminPendingCountRef.current) {
          const newest = pending[0];
          const custName = newest?.customer_name || 'Passenger';
          const pAddress = newest?.pickup_address || 'Pickup';
          const dAddress = newest?.destination_address || 'Destination';

          alertManager.triggerRideAlert({
            title: `NEW OUTSIDE CAMPUS TRIP REQUEST (${pending.length})`,
            body: `${custName} requested: ${pAddress} → ${dAddress}. Review & dispatch now.`,
            repeat: true
          });

          setNewOutsideAlert({
            rideId: newest.id,
            customerName: custName,
            pickupAddress: pAddress,
            destinationAddress: dAddress,
            time: new Date().toLocaleTimeString()
          });
        }

        prevAdminPendingCountRef.current = pending.length;
      } catch (_) {}
    };

    checkPendingOutsideRides();
    const interval = setInterval(checkPendingOutsideRides, 3000);

    const handleOutsideRide = (data) => {
      const custName = data.customerName || data.customer_name || 'Passenger';
      const pAddress = data.pickupAddress || data.pickup_address || 'Pickup';
      const dAddress = data.destinationAddress || data.destination_address || 'Destination';

      alertManager.triggerRideAlert({
        title: 'NEW OUTSIDE CAMPUS TRIP REQUEST',
        body: `${custName} requested route: ${pAddress} → ${dAddress}. Click to open Dispatch & quote fare.`,
        repeat: true
      });

      setNewOutsideAlert({
        rideId: data.rideId || data.id,
        customerName: custName,
        pickupAddress: pAddress,
        destinationAddress: dAddress,
        time: new Date().toLocaleTimeString()
      });
    };

    if (socket) {
      socket.on('admin:outside_ride_requested', handleOutsideRide);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('admin:outside_ride_requested', handleOutsideRide);
      }
    };
  }, [socket, adminUser]);

  // Stop ringtone when admin opens outside trips
  useEffect(() => {
    if (currentTab === 'outside-trips') {
      alertManager.stopRingtone();
    }
  }, [currentTab]);

  // Sync route on popstate or pushState
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      if (path.startsWith('/admin')) {
        setCurrentTab(getAdminTabFromPath(path));
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Auto-normalize /admin or /admin/ to /admin/dashboard
  useEffect(() => {
    if (adminUser) {
      const path = window.location.pathname.replace(/\/+$/, '');
      if (path === '/admin') {
        window.history.replaceState({}, '', '/admin/dashboard');
        setCurrentPath('/admin/dashboard');
        setCurrentTab('dashboard');
      }
    }
  }, [adminUser]);

  const navigateTo = (path, tabId = null) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    if (path.startsWith('/admin')) {
      const targetTab = tabId || getAdminTabFromPath(path);
      setCurrentTab(targetTab);
    }
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-heading)',
        fontSize: '18px'
      }}>
        Initializing Papido Campus Mobility...
      </div>
    );
  }

  // ============================================================
  // 0. DEDICATED CORE MEMBER REGISTRATION (/register/core)
  // ============================================================
  if (currentPath === '/register/core' || currentPath.startsWith('/register/core') || currentPath === '/core-register') {
    return (
      <CoreRegisterView
        onGoToLogin={() => navigateTo('/login')}
      />
    );
  }

  // ============================================================
  // 1. ADMIN PORTAL (/admin or /admin/*)
  // ============================================================
  if (currentPath.startsWith('/admin')) {
    if (!adminUser) {
      return (
        <AdminLoginView
          onGoToUserPortal={() => navigateTo('/login')}
        />
      );
    }

    const getPageMeta = () => {
      switch (currentTab) {
        case 'dashboard':
          return { title: 'Platform Overview', subtitle: 'Real-time metrics, fleet activity, and dispatch statistics' };
        case 'daily-settlements':
          return { title: 'Daily Driver Deductions & Settlements', subtitle: 'Track daily platform and controller deductions, driver dues, and payment collections' };
        case 'outside-trips':
          return { title: 'Outside Trips Dispatch', subtitle: 'Review passenger custom routes, set fair pricing, and dispatch to riders' };
        case 'core-team':
          return { title: 'Core Team Management', subtitle: 'Manage core organizers, generate invite links, and track driver shifts' };
        case 'customers':
          return { title: 'Customer Management', subtitle: 'Campus passenger directory and history' };
        case 'riders':
          return { title: 'Rider Driver Management', subtitle: 'Fleet KYC approval, vehicle records, and driver status' };
        case 'rides':
          return { title: 'Ride Operations', subtitle: 'Live ride monitor and state machine transitions' };
        case 'fares':
          return { title: 'Fare & Commission Settings', subtitle: 'Configurable base rates and dynamic Papido split matrix' };
        case 'payments':
          return { title: 'Financial Ledger', subtitle: 'All transaction settlements and driver payouts' };
        case 'reports':
          return { title: 'Reports & Analytics', subtitle: 'Performance metrics and CSV exports' };
        default:
          return { title: 'Papido Portal', subtitle: '' };
      }
    };

    const meta = getPageMeta();

    return (
      <div className="app-container">
        <Sidebar
          currentTab={currentTab}
          onNavigate={navigateTo}
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          hasPendingOutsideAlert={Boolean(newOutsideAlert)}
        />

        <main className="main-content">
          {/* Global Outside Campus Ride Alert Banner */}
          {newOutsideAlert && (
            <div
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #EA580C)',
                color: '#000',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 800,
                fontSize: '14px',
                boxShadow: '0 6px 25px rgba(245, 158, 11, 0.4)',
                zIndex: 1000,
                cursor: 'pointer'
              }}
              onClick={() => {
                alertManager.stopRingtone();
                navigateTo('/admin/outside-trips', 'outside-trips');
                setNewOutsideAlert(null);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={22} color="#000" />
                <div>
                  <span style={{ fontWeight: 900 }}>NEW OUTSIDE CAMPUS TRIP:</span> {newOutsideAlert.customerName} requested <strong>{newOutsideAlert.pickupAddress} → {newOutsideAlert.destinationAddress}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ background: '#000', color: '#fff', border: 'none', fontWeight: 800, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>Open Dispatch & Set Fare</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    alertManager.stopRingtone();
                    setNewOutsideAlert(null);
                  }}
                  style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#000' }}
                  title="Dismiss Alert"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          <Header
            title={meta.title}
            subtitle={meta.subtitle}
            onRefresh={() => setRefreshKey(k => k + 1)}
            onToggleMobileMenu={() => setMobileSidebarOpen(o => !o)}
          />

          <div className="content-body" key={refreshKey}>
            {currentTab === 'dashboard' && <DashboardView />}
            {currentTab === 'daily-settlements' && <DailySettlementsView />}
            {currentTab === 'outside-trips' && <OutsideTripsView />}
            {currentTab === 'core-team' && <CoreTeamView />}
            {currentTab === 'customers' && <CustomersView />}
            {currentTab === 'riders' && <RidersView />}
            {currentTab === 'rides' && <RidesView />}
            {currentTab === 'fares' && <FareSettingsView />}
            {currentTab === 'payments' && <PaymentsView />}
            {currentTab === 'reports' && <ReportsView />}
          </div>
        </main>
      </div>
    );
  }

  // ============================================================
  // 2. DIRECT STANDALONE PORTAL ROUTES
  // ============================================================
  if (currentPath === '/passenger' || currentPath === '/customer' || currentPath === '/book') {
    return <CustomerPortalView />;
  }

  if (currentPath === '/driver' || currentPath === '/rider') {
    return <RiderPortalView />;
  }

  // ============================================================
  // 3. AUTHENTICATION (Not Logged In)
  // ============================================================
  if (!user) {
    return (
      <LoginView
        onGoToAdminPortal={() => navigateTo('/admin/dashboard')}
      />
    );
  }

  // ============================================================
  // 4. ROLE-BASED ROUTING FOR AUTHENTICATED USERS
  // ============================================================
  if (user.role === 'CUSTOMER') {
    return <CustomerPortalView />;
  }

  if (user.role === 'RIDER') {
    return <RiderPortalView />;
  }

  // Fallback
  return (
    <LoginView
      onGoToAdminPortal={() => navigateTo('/admin/dashboard')}
    />
  );
}

export default App;
