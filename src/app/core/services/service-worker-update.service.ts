import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class ServiceWorkerUpdateService {
  private snackBar = inject(MatSnackBar);

  constructor() {
    if ('serviceWorker' in navigator) {
      this.initServiceWorkerUpdateHandling();
    }
  }

  private initServiceWorkerUpdateHandling(): void {
    // Check for service worker registration
    navigator.serviceWorker.ready.then((registration) => {
      // Listen for update found
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is installed and waiting
            this.showUpdateNotification(newWorker);
          }
        });
      });
    });

    // Check for updates every 30 minutes
    setInterval(
      () => {
        navigator.serviceWorker.ready.then((reg) => reg.update());
      },
      30 * 60 * 1000,
    );

    // Check for updates on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        navigator.serviceWorker.ready.then((reg) => reg.update());
      }
    });
  }

  private showUpdateNotification(worker: ServiceWorker): void {
    const snackBarRef = this.snackBar.open('New version available! Reload to update.', 'RELOAD', {
      duration: 0, // Don't auto-dismiss
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['update-snackbar'],
    });

    snackBarRef.onAction().subscribe(() => {
      // Tell the service worker to skip waiting
      worker.postMessage({ type: 'SKIP_WAITING' });

      // Reload the page once the new service worker is active
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    });
  }

  // Manual check for updates
  checkForUpdates(): Promise<void> {
    if ('serviceWorker' in navigator) {
      return navigator.serviceWorker.ready.then((reg) => reg.update());
    }
    return Promise.resolve();
  }
}
