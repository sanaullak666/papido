// Service Worker for Papido Background Push Notifications & PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push message even when browser is closed or phone is locked
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '🔔 PAPIDO RIDE ALERT';
  const options = {
    body: data.body || 'New ride request waiting for acceptance!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'papido-ride-alert',
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 150, 400, 150, 400],
    data: {
      url: data.url || '/rider',
      rideId: data.rideId
    },
    actions: [
      { action: 'open_radar', title: '🚀 Open Radar' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click on phone lockscreen or desktop banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/rider';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url && client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
