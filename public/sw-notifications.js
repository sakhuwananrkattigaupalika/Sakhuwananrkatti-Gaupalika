// Service Worker Notification Handler for Sakhuwanankarkatti Municipal Portal
// Handles Custom 'Status Updated' PWA Browser Notifications and Clicks

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || (data.ref ? `/?ref=${encodeURIComponent(data.ref)}&portal=track` : '/');

  // When notification is clicked, bring existing window to focus or open new window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Listener for messages sent from web app to service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    if (self.registration && self.registration.showNotification) {
      event.waitUntil(
        self.registration.showNotification(title, {
          icon: '/pwa-192x192.png',
          badge: '/icon.svg',
          vibrate: [250, 100, 250],
          ...options,
        })
      );
    }
  }
});
