import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, fromEvent, merge } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ServiceWorkerService {
  private platformId = inject(PLATFORM_ID);

  private updateAvailableSubject = new BehaviorSubject<boolean>(false);
  private onlineSubject = new BehaviorSubject<boolean>(true);

  public readonly updateAvailable$ = this.updateAvailableSubject.asObservable();
  public readonly isOnline$ = this.onlineSubject.asObservable();

  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeServiceWorker();
      this.setupNetworkStatusListener();
    }
  }

  private async initializeServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      console.log('FibreFlow: Registering service worker...');

      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('FibreFlow: Service worker registered successfully');

      // Listen for updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('FibreFlow: New service worker available');
              this.updateAvailableSubject.next(true);
            }
          });
        }
      });

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('FibreFlow: Message from SW:', event.data);
      });

      // Check for existing update
      if (this.swRegistration.waiting) {
        this.updateAvailableSubject.next(true);
      }
    } catch (error) {
      console.error('FibreFlow: Service worker registration failed:', error);
    }
  }

  private setupNetworkStatusListener(): void {
    // Initial status
    this.onlineSubject.next(navigator.onLine);

    // Listen for changes
    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));

    merge(online$, offline$).subscribe((isOnline) => {
      console.log('FibreFlow: Network status changed:', isOnline ? 'online' : 'offline');
      this.onlineSubject.next(isOnline);

      if (isOnline) {
        this.triggerSync();
      }
    });
  }

  /**
   * Update the service worker to the latest version
   */
  public updateServiceWorker(): void {
    if (this.swRegistration?.waiting) {
      console.log('FibreFlow: Updating service worker...');
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Reload the page to activate new SW
      window.location.reload();
    }
  }

  /**
   * Check for service worker updates manually
   */
  public async checkForUpdates(): Promise<void> {
    if (this.swRegistration) {
      try {
        await this.swRegistration.update();
        console.log('FibreFlow: Checked for service worker updates');
      } catch (error) {
        console.error('FibreFlow: Update check failed:', error);
      }
    }
  }

  /**
   * Trigger background sync
   */
  public triggerSync(): void {
    if (this.swRegistration && 'sync' in window.ServiceWorkerRegistration.prototype) {
      this.swRegistration.sync
        .register('fibreflow-sync')
        .then(() => {
          console.log('FibreFlow: Background sync registered');
        })
        .catch((error) => {
          console.error('FibreFlow: Background sync registration failed:', error);
        });
    }
  }

  /**
   * Request persistent storage
   */
  public async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist();
        console.log('FibreFlow: Persistent storage:', persistent ? 'granted' : 'denied');
        return persistent;
      } catch (error) {
        console.error('FibreFlow: Persistent storage request failed:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Get storage usage estimate
   */
  public async getStorageEstimate(): Promise<StorageEstimate | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        console.log('FibreFlow: Storage estimate:', estimate);
        return estimate;
      } catch (error) {
        console.error('FibreFlow: Storage estimate failed:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Show install prompt for PWA
   */
  public showInstallPrompt(): void {
    // This would be used with beforeinstallprompt event
    // Implementation depends on PWA setup
    console.log('FibreFlow: Install prompt would be shown here');
  }

  /**
   * Check if app is running in standalone mode (installed as PWA)
   */
  public isStandalone(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      );
    }
    return false;
  }

  /**
   * Get current service worker status
   */
  public getServiceWorkerStatus(): string {
    if (!('serviceWorker' in navigator)) {
      return 'not-supported';
    }

    if (!this.swRegistration) {
      return 'not-registered';
    }

    if (this.swRegistration.active) {
      return 'active';
    }

    if (this.swRegistration.installing) {
      return 'installing';
    }

    if (this.swRegistration.waiting) {
      return 'waiting';
    }

    return 'unknown';
  }
}
