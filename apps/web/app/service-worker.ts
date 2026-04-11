/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

// ──────────────────────────────────────────────
// 1. Precache build assets (JS, CSS, icons, SVGs)
//    Workbox injects the manifest at build time.
//    Every entry has a content hash — when you deploy
//    a new version, changed hashes trigger re-fetches.
// ──────────────────────────────────────────────
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ──────────────────────────────────────────────
// 2. SPA shell (navigation requests)
//    In SPA mode, Nitro serves the shell dynamically
//    (there's no static index.html in the build output).
//    NetworkFirst ensures we always try the server first,
//    but cache the response so the app works offline.
//    Excludes /api/* so those always hit the network.
// ──────────────────────────────────────────────
const shellStrategy = new NetworkFirst({
  cacheName: 'spa-shell',
  plugins: [
    new CacheableResponsePlugin({ statuses: [200] })
  ]
})
registerRoute(
  new NavigationRoute(shellStrategy, {
    denylist: [/^\/api\//]
  })
)

// ──────────────────────────────────────────────
// 3. Runtime caching for assets not in the precache manifest
//    (e.g. lazily loaded images, external fonts, etc.)
//    Stale-while-revalidate: serve from cache, update in background.
// ──────────────────────────────────────────────
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin
    && (request.destination === 'image'
      || request.destination === 'font'
      || request.destination === 'style'
      || request.destination === 'script'),
  new StaleWhileRevalidate({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }) // 30 days
    ]
  })
)

// ──────────────────────────────────────────────
// 4. API calls — never cached.
//    All /api/* requests go straight to the network.
//    No fallback, no caching — API data should always
//    be fresh and come from the server.
// ──────────────────────────────────────────────
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-calls',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 0 }) // effectively never cache
    ]
  })
)

// ──────────────────────────────────────────────
// 5. Push notification placeholder
//    Uncomment and expand when implementing push notifications.
// ──────────────────────────────────────────────
// self.addEventListener('push', (event) => {
//   const data = event.data?.json() ?? {}
//   event.waitUntil(
//     self.registration.showNotification(data.title ?? 'Workout', {
//       body: data.body,
//       icon: '/icon-192.png',
//       badge: '/icon-192.png',
//       data: data.url ? { url: data.url } : undefined
//     })
//   )
// })

// self.addEventListener('notificationclick', (event) => {
//   event.notification.close()
//   const url = event.notification.data?.url ?? '/'
//   event.waitUntil(self.clients.openWindow(url))
// })

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
