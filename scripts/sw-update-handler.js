
// Add this to your app to handle service worker updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          if (confirm('New version available! Reload to update?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });
  });

  // Check for updates every 5 minutes
  setInterval(() => {
    navigator.serviceWorker.ready.then(reg => reg.update());
  }, 5 * 60 * 1000);
}
