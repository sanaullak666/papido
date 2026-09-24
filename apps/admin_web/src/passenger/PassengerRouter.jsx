import React, { useState, useEffect } from 'react';
import { PassengerLayout } from './PassengerLayout';
import { BookRidePage } from './BookRidePage';
import { AdvanceBookingsPage } from './AdvanceBookingsPage';
import { OutsideTripsPage } from './OutsideTripsPage';
import { RideHistoryPage } from './RideHistoryPage';
import { PassengerProfilePage } from './PassengerProfilePage';

export const getPassengerTabFromPath = (path) => {
  const clean = (path || window.location.pathname || '').toLowerCase().replace(/\/+$/, '');
  if (clean.endsWith('/outside')) return 'outside';
  if (clean.endsWith('/prebook') || clean.endsWith('/scheduled') || clean.endsWith('/advance')) return 'scheduled';
  if (clean.endsWith('/rides') || clean.endsWith('/history')) return 'history';
  if (clean.endsWith('/profile')) return 'profile';
  return 'book';
};

export function PassengerRouter() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const currentTab = getPassengerTabFromPath(currentPath);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <PassengerLayout currentTab={currentTab}>
      {currentTab === 'book' && <BookRidePage />}
      {currentTab === 'scheduled' && <AdvanceBookingsPage />}
      {currentTab === 'outside' && <OutsideTripsPage />}
      {currentTab === 'history' && <RideHistoryPage />}
      {currentTab === 'profile' && <PassengerProfilePage />}
    </PassengerLayout>
  );
}

export default PassengerRouter;
