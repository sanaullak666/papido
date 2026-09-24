import React, { useState, useEffect } from 'react';
import { RiderProvider } from './shared/RiderContext';
import { RiderLayout } from './RiderLayout';
import { RadarPage } from './RadarPage';
import { ActiveTripPage } from './ActiveTripPage';
import { ScheduledRidesPage } from './ScheduledRidesPage';
import { ShiftEarningsPage } from './ShiftEarningsPage';
import { DailySettlementsPage } from './DailySettlementsPage';
import { KycVehiclePage } from './KycVehiclePage';
import { RiderProfilePage } from './RiderProfilePage';

export const getRiderTabFromPath = (path) => {
  const clean = (path || window.location.pathname || '').toLowerCase().replace(/\/+$/, '');
  if (clean.endsWith('/active') || clean.endsWith('/trip')) return 'active';
  if (clean.endsWith('/advance') || clean.endsWith('/scheduled') || clean.endsWith('/prebook')) return 'scheduled';
  if (clean.endsWith('/settlement') || clean.endsWith('/settlements')) return 'settlements';
  if (clean.endsWith('/earnings')) return 'earnings';
  if (clean.endsWith('/kyc') || clean.endsWith('/vehicle')) return 'kyc';
  if (clean.endsWith('/profile')) return 'profile';
  return 'radar';
};

const TAB_TO_PATH = {
  radar: '/driver/radar',
  active: '/driver/active',
  scheduled: '/driver/advance',
  earnings: '/driver/earnings',
  settlements: '/driver/settlements',
  kyc: '/driver/kyc',
  profile: '/driver/profile'
};

export function RiderRouter() {
  const [currentTab, setCurrentTab] = useState(() => getRiderTabFromPath(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => {
      setCurrentTab(getRiderTabFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const tab = getRiderTabFromPath(window.location.pathname);
    setCurrentTab(tab);
    const cleanPath = window.location.pathname.replace(/\/+$/, '');
    if (cleanPath === '/driver' || cleanPath === '/rider' || cleanPath === '' || cleanPath === '/') {
      window.history.replaceState({}, '', TAB_TO_PATH[tab] || '/driver/radar');
    }
  }, []);

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
    const targetPath = TAB_TO_PATH[tabId] || '/driver/radar';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  return (
    <RiderProvider onNavigateTab={handleTabChange}>
      <RiderLayout currentTab={currentTab} onTabChange={handleTabChange}>
        {currentTab === 'radar' && <RadarPage onNavigateTab={handleTabChange} />}
        {currentTab === 'active' && <ActiveTripPage onNavigateTab={handleTabChange} />}
        {currentTab === 'scheduled' && <ScheduledRidesPage onNavigateTab={handleTabChange} />}
        {currentTab === 'earnings' && <ShiftEarningsPage />}
        {currentTab === 'settlements' && <DailySettlementsPage />}
        {currentTab === 'kyc' && <KycVehiclePage />}
        {currentTab === 'profile' && <RiderProfilePage />}
      </RiderLayout>
    </RiderProvider>
  );
}

/* Alias for backwards compatibility with any existing imports */
export { RiderRouter as RiderPortalView };
export default RiderRouter;
