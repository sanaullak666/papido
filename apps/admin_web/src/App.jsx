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
  const { user, adminUser } = useAuth();
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
    } else {
      if (lowerPath === '/admin' || lowerPath === '/admin/') {
        window.history.replaceState({}, '', '/AdminLogin');
        setCurrentPath('/AdminLogin');
      }
    }
  }, [adminUser]);

  const navigateTo = (path, tabId = null) => {
    const cleanPath = path.split('?')[0];
    if (window.location.pathname !== cleanPath || window.location.search !== (path.includes('?') ? '?' + path.split('?')[1] : '')) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(cleanPath);
    if (cleanPath.startsWith('/admin')) {
      const targetTab = tabId || getAdminTabFromPath(cleanPath);
      setCurrentTab(targetTab);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      if (window.location.pathname.startsWith('/admin')) {
        setCurrentTab(getAdminTabFromPath(window.location.pathname));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


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
  // ============================================================
  if (currentPath.startsWith('/admin')) {
    if (!adminUser) {
      if (window.location.pathname !== '/AdminLogin') {
        window.history.replaceState({}, '', '/AdminLogin');
      }
      return (
        <AdminLoginView
          onGoToUserPortal={() => navigateTo('/login')}
          onLoginSuccess={() => navigateTo('/admin/dashboard')}
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
          <AlertBanner
            alert={newOutsideAlert}
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
        onGoToAdminPortal={() => navigateTo('/AdminLogin')}
      />
    );
  }

  // ============================================================
  // 3. ROLE-BASED ROUTING FOR AUTHENTICATED USERS
  // ============================================================
  if (user) {
    if (currentPath === '/driver' || currentPath.startsWith('/driver/') || currentPath === '/rider' || currentPath.startsWith('/rider/') || user.role === 'RIDER') {
      return <RiderRouter />;
    }

    if (currentPath === '/passenger' || currentPath.startsWith('/passenger/') || currentPath === '/customer' || currentPath.startsWith('/customer/') || currentPath === '/book' || user.role === 'CUSTOMER') {
      return <PassengerRouter />;
    }
  }

  // ============================================================
  // 4. AUTHENTICATION (Not Logged In)
  // ============================================================
  return (
    <LoginView
      onGoToAdminPortal={() => navigateTo('/AdminLogin')}
      onLoginSuccess={(loggedInUser) => {
        const dest = loggedInUser?.role === 'RIDER' ? '/rider' : '/passenger';
        navigateTo(dest);
      }}
    />
  );
}

export default App;
