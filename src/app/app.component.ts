import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { ThemeService } from './core/services/theme.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AppShellComponent, MatProgressBarModule],
  template: `
    @if (loading) {
      <mat-progress-bar mode="indeterminate" class="global-loading-bar"></mat-progress-bar>
    }
    <app-shell></app-shell>
  `,
  styles: [`
    .global-loading-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10000;
      height: 3px;
    }
  `]
})
export class AppComponent {
  title = 'FibreFlow';
  loading = false;
  
  private themeService = inject(ThemeService);
  private router = inject(Router);
  
  constructor() {
    console.log('FibreFlow: AppComponent constructor called');
    
    // Ensure theme is initialized to light by default
    this.themeService.setTheme('light');
    
    // Setup navigation loading indicator
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loading = true;
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.loading = false;
      }
    });
  }
}