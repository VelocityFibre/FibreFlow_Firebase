import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-pole-tracker-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: ` <router-outlet></router-outlet> `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class PoleTrackerShellComponent implements OnInit {
  private router = inject(Router);
  private breakpointObserver = inject(BreakpointObserver);
  private authService = inject(AuthService);

  ngOnInit() {
    // Auto-detect and redirect based on device and user preference
    this.detectAndRedirect();
  }

  private detectAndRedirect() {
    // Get current path
    const currentPath = this.router.url;

    // If already on a specific path, don't redirect
    if (
      currentPath.includes('/desktop') ||
      currentPath.includes('/mobile') ||
      currentPath.includes('/import') ||
      currentPath.includes('/verify') ||
      currentPath.includes('/reports')
    ) {
      return;
    }

    // Check user preference from localStorage
    const userPreference = localStorage.getItem('pole-tracker-view-preference');
    if (userPreference) {
      this.router.navigate([`/pole-tracker/${userPreference}`]);
      return;
    }

    // Auto-detect based on device
    const isMobile = this.breakpointObserver.isMatched([
      Breakpoints.Handset,
      Breakpoints.TabletPortrait,
    ]);

    // Check user role - field technicians default to mobile
    const currentUser = this.authService.currentUser();
    const isFieldTechnician =
      currentUser?.role === 'technician' || currentUser?.customClaims?.role === 'technician';

    if (isMobile || isFieldTechnician) {
      this.router.navigate(['/pole-tracker/mobile']);
    } else {
      this.router.navigate(['/pole-tracker/desktop']);
    }
  }
}
