// src/sw.js — Service Worker con Push Notifications
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

// Precachea los assets del build automáticamente
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── PUSH NOTIFICATIONS ──────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'confirm', title: '✅ Ver clase' },
      { action: 'close',   title: '✕ Cerrar'   },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Al tocar la notificación abre la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') return

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data.url)
    })
  )
})