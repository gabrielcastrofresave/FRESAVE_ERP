self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};

  const options = {
    body: data.mensagem,
    icon: 'https://media.licdn.com/dms/image/v2/D4D0BAQE5TclqZAO2YA/company-logo_200_200/company-logo_200_200/0/1687771286669?e=2147483647&v=beta&t=d-4KNKnwa9oNStJhSusNNJyfWPYCOWl1-Ufrllnj3x0',
    badge: 'https://media.licdn.com/dms/image/v2/D4D0BAQE5TclqZAO2YA/company-logo_200_200/company-logo_200_200/0/1687771286669?e=2147483647&v=beta&t=d-4KNKnwa9oNStJhSusNNJyfWPYCOWl1-Ufrllnj3x0',
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