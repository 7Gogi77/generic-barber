// SW Recovery: Detect missing files and attempt safe cleanup
// Runs early in the main bundle to help users recover from stale Service Workers

(async function(){
  try {
    // Listen for recovery confirmation from the temporary recovery SW
    if (navigator.serviceWorker && navigator.serviceWorker.addEventListener) {
      navigator.serviceWorker.addEventListener('message', (ev) => {
        if (ev.data && ev.data.type === 'SW_UNREGISTERED') {
          console.log('SW Recovery: SW_UNREGISTERED received — reloading');
          try { window.location.reload(true); } catch (e) { window.location.reload(); }
        }
      });
    }

    // Quick probe to see if the page is available from the origin
    const probe = await fetch('/poslovni-panel.html', { method: 'HEAD', cache: 'reload' }).catch(() => null);

    // If the resource is available, nothing to do
    if (probe && probe.ok) {
      return;
    }

    console.warn('SW Recovery: target returned', probe ? probe.status : 'no response — initiating cleanup');

    // Unregister all service workers (safe; best-effort)
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      console.log('SW Recovery: unregistered', regs.length);
    }

    // Clear CacheStorage (best-effort)
    if (typeof caches !== 'undefined' && caches.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      console.log('SW Recovery: cleared caches', keys);
    }

    // Remove any legacy local storage keys that could cause stale UI
    try { localStorage.removeItem('schedule'); localStorage.removeItem('appointments'); console.log('SW Recovery: cleared localStorage keys'); } catch (e) {}

    // Force reload bypassing cache where possible
    try { window.location.reload(true); } catch (e) { window.location.reload(); }
  } catch (err) {
    console.warn('SW Recovery failed', err);
  }
})();