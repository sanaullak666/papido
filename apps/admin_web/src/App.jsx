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
import { SimulatorView } from './views/SimulatorView';
import { useSocket } from './context/SocketContext';
import { alertManager } from './utils/alertManager';
import { apiRequest } from './api';
import { ArrowRight, AlertTriangle } from 'lucide-react';

export function App() {
  const { user, adminUser, loading } = useAuth();
  const { socket } = useSocket() || {};
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentTab, setCurrentTab] = useState('dashboard');
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
            title: `🚨 NEW OUTSIDE CAMPUS TRIP REQUEST (${pending.length})`,
            body: `${custName} requested: ${pAddress} ➔ ${dAddress}. Review & dispatch now.`,
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
        title: '🚨 NEW OUTSIDE CAMPUS TRIP REQUEST',
        body: `${custName} requested route: ${pAddress} ➔ ${dAddress}. Click to open Dispatch & quote fare.`,
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
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
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
        case 'passenger-portal':
          return { title: 'Passenger Web Portal View', subtitle: 'Live preview of the student campus booking experience' };
        case 'driver-portal':
          return { title: 'Driver Web Portal View', subtitle: 'Live preview of the driver dispatch radar and active trips' };
        case 'outside-trips':
          return { title: 'Outside Trips Dispatch', subtitle: 'Review passenger custom routes, set fair pricing, and dispatch to riders' };
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
        case 'simulator':
          return { title: 'Live Multi-App Test Simulator', subtitle: 'Customer App and Rider App interactive live testing' };
        default:
          return { title: 'Papido Admin', subtitle: '' };
      }
    };

    const meta = getPageMeta();

    return (
      <div className="app-container">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
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
                setCurrentTab('outside-trips');
                setNewOutsideAlert(null);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>🚨</span>
                <div>
                  <span style={{ fontWeight: 900 }}>NEW OUTSIDE CAMPUS TRIP:</span> {newOutsideAlert.customerName} requested <strong>{newOutsideAlert.pickupAddress} ➔ {newOutsideAlert.destinationAddress}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ background: '#000', color: '#fff', border: 'none', fontWeight: 800, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>🚀 Open Dispatch & Set Fare</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    alertManager.stopRingtone();
                    setNewOutsideAlert(null);
                  }}
                  style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', fontWeight: 900, color: '#000' }}
                  title="Dismiss Alert"
                >
                  ✕
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
            {currentTab === 'passenger-portal' && <CustomerPortalView />}
            {currentTab === 'driver-portal' && <RiderPortalView />}
            {currentTab === 'outside-trips' && <OutsideTripsView />}
            {currentTab === 'customers' && <CustomersView />}
            {currentTab === 'riders' && <RidersView />}
            {currentTab === 'rides' && <RidesView />}
            {currentTab === 'fares' && <FareSettingsView />}
            {currentTab === 'payments' && <PaymentsView />}
            {currentTab === 'reports' && <ReportsView />}
            {currentTab === 'simulator' && <SimulatorView />}
          </div>
        </main>
      </div>
    );
  }

  // ============================================================
  // 2. AUTHENTICATION (Not Logged In)
  // ============================================================
  if (!user) {
    return (
      <LoginView
        onGoToAdminPortal={() => navigateTo('/admin')}
      />
    );
  }

  // ============================================================
  // 3. ROLE-BASED ROUTING FOR AUTHENTICATED USERS
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
      onGoToAdminPortal={() => navigateTo('/admin')}
    />
  );
}

export default App;
