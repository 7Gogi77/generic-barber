// Temporary self-unregistering service worker
// When a browser requests /sw.js it will install this worker which immediately
// unregisters itself and clears any caches created by older workers. This
// helps recover users who are stuck with an old, broken SW that returns 404s.

self.addEventListener('install', (event) => {
  // Activate immediately so we can unregister on activate
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      // Unregister this service worker registration
      await self.registration.unregister();

      // Clear any caches
      if (typeof caches !== 'undefined' && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      // Notify clients to reload so they pick up fresh content
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach(c => c.postMessage({ type: 'SW_UNREGISTERED' }));
    } catch (err) {
      // Fail silently - this file is purely a recovery helper
      console.warn('SW cleanup failed', err);
    }
  })());
});