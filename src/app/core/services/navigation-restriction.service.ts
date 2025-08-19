import { Injectable, inject } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class NavigationRestrictionService {
  private router = inject(Router);
  private authService = inject(AuthService);
  private location = inject(Location);

  /**
   * Initialize navigation restrictions for field workers
   */
  initializeRestrictions() {
    // Listen to navigation events
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart),
      map(event => event as NavigationStart)
    ).subscribe(event => {
      this.handleNavigation(event.url);
    });

    // Override browser back button for field workers
    window.addEventListener('popstate', (e) => {
      this.handleBrowserBack();
    });
  }

  /**
   * Check if current user is a field worker
   */
  private isFieldWorker(): boolean {
    const userProfile = this.authService.getCurrentUserProfile();
    if (!userProfile) return false;
    
    return userProfile.userGroup === 'technician';
  }

  /**
   * Handle navigation attempts
   */
  private handleNavigation(url: string) {
    const isFieldWorker = this.isFieldWorker();
    
    if (isFieldWorker && !url.includes('offline-pole-capture') && !url.includes('login')) {
      console.log('🚫 Field worker attempting to navigate to:', url);
      // Cancel navigation and redirect back to offline capture
      this.router.navigate(['/offline-pole-capture'], { replaceUrl: true });
    }
  }

  /**
   * Handle browser back button
   */
  private handleBrowserBack() {
    const isFieldWorker = this.isFieldWorker();
    
    if (isFieldWorker) {
      const currentUrl = this.location.path();
      
      if (!currentUrl.includes('offline-pole-capture')) {
        console.log('🚫 Field worker used back button - redirecting to offline capture');
        this.location.replaceState('/offline-pole-capture');
        this.router.navigate(['/offline-pole-capture'], { replaceUrl: true });
      }
    }
  }

  /**
   * Disable navigation controls for field workers
   */
  disableNavigationForFieldWorkers() {
    // Disable right-click context menu
    document.addEventListener('contextmenu', (e) => {
      if (this.shouldDisableNavigation()) {
        e.preventDefault();
        return false;
      }
      return true;
    });

    // Disable keyboard shortcuts that might navigate
    document.addEventListener('keydown', async (e) => {
      const isFieldWorker = this.isFieldWorker();
      if (isFieldWorker) {
        // Disable common navigation shortcuts
        if (
          (e.ctrlKey && e.key === 'l') || // Ctrl+L (address bar)
          (e.altKey && e.key === 'ArrowLeft') || // Alt+Left (back)
          (e.altKey && e.key === 'ArrowRight') || // Alt+Right (forward)
          e.key === 'F5' // Refresh (handle carefully)
        ) {
          e.preventDefault();
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Check if navigation should be disabled
   */
  private shouldDisableNavigation(): boolean {
    return this.isFieldWorker();
  }

  /**
   * Create a restricted router for field workers
   */
  getRestrictedRouter() {
    const originalNavigate = this.router.navigate.bind(this.router);
    
    // Override navigate method
    this.router.navigate = async (commands: any[], extras?: any) => {
      const isFieldWorker = this.isFieldWorker();
      
      if (isFieldWorker) {
        const url = Array.isArray(commands) ? commands.join('/') : commands;
        
        if (!url.includes('offline-pole-capture') && !url.includes('login')) {
          console.log('🚫 Navigation blocked for field worker:', url);
          return originalNavigate(['/offline-pole-capture'], { replaceUrl: true });
        }
      }
      
      return originalNavigate(commands, extras);
    };
  }
}