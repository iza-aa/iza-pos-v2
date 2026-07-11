/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

// Required by next-pwa / workbox to inject the precache manifest
// DO NOT REMOVE this line — build will fail without it
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
self.__WB_MANIFEST;

// To disable all workbox logging during development
self.__WB_DISABLE_DEV_LOGS = true;

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'New Notification', {
        body: data.body || 'You have a new message.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { 
          orderId: data.orderId, 
          url: data.url || '/' 
        },
      })
    );
  } catch (err) {
    console.error('Error handling push event:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      const url = event.notification.data?.url || '/';
      
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
