import { Injectable, inject, Injector, afterNextRender } from '@angular/core';
import { getFirestore, enableIndexedDbPersistence } from '@angular/fire/firestore';
import { ThemeService } from './theme.service';

@Injectable({
  providedIn: 'root',
})
export class AppInitializerService {
  private injector = inject(Injector);

  /**
   * Initialize app after Angular is stable
   * This prevents NG0200 errors by deferring browser API access
   */
  initialize(): Promise<void> {
    return new Promise((resolve) => {
      // Wait for Angular to be completely stable before initializing
      afterNextRender(
        () => {
          // Initialize Firebase persistence
          this.initializeFirebasePersistence();

          // Initialize theme service
          const themeService = this.injector.get(ThemeService);
          themeService.initialize(this.injector);

          resolve();
        },
        { injector: this.injector },
      );
    });
  }

  private initializeFirebasePersistence(): void {
    try {
      const firestore = getFirestore();
      enableIndexedDbPersistence(firestore).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
          console.warn('The current browser does not support offline persistence');
        } else {
          console.error('Firebase persistence error:', err);
        }
      });
    } catch (error) {
      console.error('Error initializing Firebase persistence:', error);
    }
  }
}
