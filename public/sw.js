self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};

  const options = {
    body: data.mensagem,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: data.titulo,
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.titulo, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});