import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LandingView } from './shared/LandingView';
import { LoginView } from './shared/LoginView';
import { AdminLoginView } from './adminweb/AdminLoginView';
import { PassengerRouter } from './passenger/PassengerRouter';
import { RiderRouter } from './rider/RiderRouter';
import { DashboardView } from './adminweb/DashboardView';
import { OutsideTripsView } from './adminweb/OutsideTripsView';
import { CustomersView } from './adminweb/CustomersView';
import { RidersView } from './adminweb/RidersView';
import { RidesView } from './adminweb/RidesView';
import { FareSettingsView } from './adminweb/FareSettingsView';
import { PaymentsView } from './adminweb/PaymentsView';
import { ReportsView } from './adminweb/ReportsView';
import { DailySettlementsView } from './adminweb/DailySettlementsView';
import { CoreRegisterView } from './rider/CoreRegisterView';
import { CoreTeamView } from './adminweb/CoreTeamView';
import { useSocket } from './context/SocketContext';
import { alertManager } from './utils/alertManager';
import { apiRequest } from './api';
import { AlertBanner } from './components/ui/AlertBanner';
import { ArrowRight, AlertTriangle, X } from 'lucide-react';

const isDriverRoute = (path) => {
  const cleanPath = (path || '').toLowerCase().replace(/\/+$/, '');
  return cleanPath === '/driver' || cleanPath.startsWith('/driver/') || cleanPath === '/rider' || cleanPath.startsWith('/rider/');
};

const isPassengerRoute = (path) => {
  const cleanPath = (path || '').toLowerCase().replace(/\/+$/, '');
  return (
    cleanPath === '/passenger' ||
    cleanPath.startsWith('/passenger/') ||
    cleanPath === '/customer' ||
    cleanPath.startsWith('/customer/') ||
    cleanPath === '/book' ||
    cleanPath.startsWith('/book/')
  );
};

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
  const { user, adminUser, logout } = useAuth();
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
        
        // If queue is cleared, ensure ringtone and alert banner stop
        if (pending.length === 0) {
          alertManager.stopRingtone();
          setNewOutsideAlert(null);
        }

        if (prevAdminPendingCountRef.current !== null && pending.length > prevAdminPendingCountRef.current) {
          const newest = pending[0];
          const custName = newest?.customer_name || 'Passenger';
          const pAddress = newest?.pickup_address || 'Pickup';
          const dAddress = newest?.destination_address || 'Destination';
          const isViewingOutside = currentTab === 'outside-trips';

          if (!isViewingOutside) {
            setNewOutsideAlert({
              rideId: newest.id,
              customerName: custName,
              pickupAddress: pAddress,
              destinationAddress: dAddress,
              time: new Date().toLocaleTimeString()
            });
          }
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
      const isViewingOutside = currentTab === 'outside-trips';

      if (!isViewingOutside) {
        setNewOutsideAlert({
          rideId: data.rideId || data.id,
          customerName: custName,
          pickupAddress: pAddress,
          destinationAddress: dAddress,
          time: new Date().toLocaleTimeString()
        });
      }
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
  }, [socket, adminUser, currentTab]);

  // Stop ringtone when admin opens outside trips
  useEffect(() => {
    if (currentTab === 'outside-trips') {
      alertManager.stopRingtone();
      setNewOutsideAlert(null);
    }
  }, [currentTab]);

  // Sync route on popstate
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

  // Auto-normalize /admin or /AdminLogin routes
  useEffect(() => {
    const rawPath = window.location.pathname.replace(/\/+$/, '');
    const lowerPath = rawPath.toLowerCase();

    if (adminUser) {
      if (lowerPath === '/admin' || lowerPath === '/adminlogin' || lowerPath === '/admin/login') {
        window.history.replaceState({}, '', '/admin/dashboard');
        setCurrentPath('/admin/dashboard');
        setCurrentTab('dashboard');
      }
    }
  }, [adminUser]);

  // Security Enforcement: Immediate role cross-access detection & session termination
  useEffect(() => {
    if (!user) return;

    if (user.role === 'CUSTOMER' && isDriverRoute(currentPath)) {
      const msg = 'Access Denied: Passenger accounts cannot access Driver routes. You have been logged out of your session.';
      try {
        sessionStorage.setItem('papido_auth_error', msg);
      } catch (_) {}
      logout('/login?reason=unauthorized_role&role=rider&message=' + encodeURIComponent(msg));
    } else if (user.role === 'RIDER' && isPassengerRoute(currentPath)) {
      const msg = 'Access Denied: Driver accounts cannot access Passenger routes. You have been logged out of your session.';
      try {
        sessionStorage.setItem('papido_auth_error', msg);
      } catch (_) {}
      logout('/login?reason=unauthorized_role&role=customer&message=' + encodeURIComponent(msg));
    }
  }, [user, currentPath, logout]);

  const navigateTo = (path, tabId = null) => {
    const cleanPath = path.split('?')[0];

    // Security check on programmatic navigation
    if (user) {
      if (user.role === 'CUSTOMER' && isDriverRoute(cleanPath)) {
        const msg = 'Access Denied: Passenger accounts cannot access Driver routes. You have been logged out of your session.';
        try {
          sessionStorage.setItem('papido_auth_error', msg);
        } catch (_) {}
        logout('/login?reason=unauthorized_role&role=rider&message=' + encodeURIComponent(msg));
        return;
      }
      if (user.role === 'RIDER' && isPassengerRoute(cleanPath)) {
        const msg = 'Access Denied: Driver accounts cannot access Passenger routes. You have been logged out of your session.';
        try {
          sessionStorage.setItem('papido_auth_error', msg);
        } catch (_) {}
        logout('/login?reason=unauthorized_role&role=customer&message=' + encodeURIComponent(msg));
        return;
      }
    }

    if (window.location.pathname !== cleanPath || window.location.search !== (path.includes('?') ? '?' + path.split('?')[1] : '')) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(cleanPath);
    if (cleanPath.startsWith('/admin')) {
      const targetTab = tabId || getAdminTabFromPath(cleanPath);
      setCurrentTab(targetTab);
    }
  };


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
  // 1. ADMIN LOGIN (/AdminLogin, /adminlogin, /admin/login)
  // ONLY accessible via the exact secret route!
  // ============================================================
  const lowerPath = currentPath.toLowerCase();
  if (lowerPath === '/adminlogin' || lowerPath === '/admin/login') {
    if (adminUser) {
      navigateTo('/admin/dashboard');
      return null;
    }
    return (
      <AdminLoginView
        onGoToUserPortal={() => navigateTo('/login')}
        onLoginSuccess={() => navigateTo('/admin/dashboard')}
      />
    );
  }

  // ============================================================
  // 2. ADMIN PORTAL (/admin or /admin/*)
  // Blocked for outsiders! If unauthenticated, do NOT redirect to /AdminLogin.
  // Display a 404 Not Found screen to completely conceal admin view.
  // ============================================================
  if (currentPath.startsWith('/admin')) {
    if (!adminUser) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
          color: '#f8fafc',
          flexDirection: 'column',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            fontSize: '76px',
            fontWeight: '900',
            lineHeight: '1',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            404
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 8px', color: '#f1f5f9' }}>
            Page Not Found
          </h1>
          <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: '420px', margin: '0 0 28px', lineHeight: '1.6' }}>
            The page you are looking for doesn't exist, has been removed, or is not accessible.
          </p>
          <button
            onClick={() => navigateTo('/')}
            style={{
              background: '#10b981',
              color: '#064e3b',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '15px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}
          >
            Go to Home
          </button>
        </div>
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
          <AlertBanner
            alert={newOutsideAlert}
            onSilence={() => alertManager.stopRingtone()}
            onAction={() => {
              alertManager.stopRingtone();
              navigateTo('/admin/outside-trips', 'outside-trips');
              setNewOutsideAlert(null);
            }}
            onDismiss={() => {
              alertManager.stopRingtone();
              setNewOutsideAlert(null);
            }}
          />

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
  // 2. PUBLIC LANDING VIEW (/ or /welcome)
  // ============================================================
  if ((currentPath === '/' || currentPath === '' || currentPath === '/welcome') && !user) {
    return (
      <LandingView
        onGoToLogin={() => navigateTo('/login')}
        onGoToRegister={() => navigateTo('/login?mode=register')}
        onGoToRiderLogin={() => navigateTo('/login?mode=rider')}
      />
    );
  }

  // ============================================================
  // 3. ROLE-BASED ROUTING FOR AUTHENTICATED USERS
  // ============================================================
  if (user) {
    // 3a. Strict Role Enforcement: Passenger (CUSTOMER)
    if (user.role === 'CUSTOMER') {
      if (isDriverRoute(currentPath)) {
        return (
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0d14',
            color: '#f8fafc',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <AlertTriangle size={36} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 10px', color: '#f87171' }}>
              Access Denied: Security Violation
            </h2>
            <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: '440px', margin: '0 0 24px', lineHeight: '1.6' }}>
              Passenger accounts cannot access Driver portals (<code style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px' }}>/driver/</code>). Your session has been terminated for security.
            </p>
            <button
              onClick={() => logout('/login?reason=unauthorized_role&role=rider')}
              style={{
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '10px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '15px'
              }}
            >
              Return to Login
            </button>
          </div>
        );
      }
      return <PassengerRouter />;
    }

    // 3b. Strict Role Enforcement: Driver (RIDER)
    if (user.role === 'RIDER') {
      if (isPassengerRoute(currentPath)) {
        return (
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0d14',
            color: '#f8fafc',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <AlertTriangle size={36} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 10px', color: '#f87171' }}>
              Access Denied: Security Violation
            </h2>
            <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: '440px', margin: '0 0 24px', lineHeight: '1.6' }}>
              Driver accounts cannot access Passenger portals. Your session has been terminated for security.
            </p>
            <button
              onClick={() => logout('/login?reason=unauthorized_role&role=customer')}
              style={{
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '10px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '15px'
              }}
            >
              Return to Login
            </button>
          </div>
        );
      }
      return <RiderRouter />;
    }

    // Fallback: If user role is unrecognized, terminate session immediately
    logout('/login?reason=unauthorized_role');
    return null;
  }

  // ============================================================
  // 4. AUTHENTICATION (Not Logged In)
  // ============================================================
  return (
    <LoginView
      onLoginSuccess={(loggedInUser) => {
        const dest = loggedInUser?.role === 'RIDER' ? '/rider' : '/passenger';
        navigateTo(dest);
      }}
    />
  );
}

export default App;
