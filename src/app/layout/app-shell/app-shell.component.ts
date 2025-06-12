import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <!-- Sidebar -->
      <mat-sidenav 
        #sidenav 
        mode="side" 
        opened="true"
        class="sidenav"
        [fixedInViewport]="true">
        
        <!-- Logo Section -->
        <div class="logo-section">
          <img src="/velocity-fibre-logo.jpeg" alt="VelocityFibre" class="logo">
          <h2 class="app-name">FibreFlow</h2>
        </div>

        <mat-divider></mat-divider>

        <!-- Navigation -->
        <mat-nav-list class="nav-list">
          <a mat-list-item 
             *ngFor="let item of navItems"
             [routerLink]="item.route"
             routerLinkActive="active-link"
             class="nav-item">
            <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
            <span matListItemTitle>{{ item.label }}</span>
            <span *ngIf="item.badge" class="nav-badge">{{ item.badge }}</span>
          </a>
        </mat-nav-list>

        <!-- Bottom Section -->
        <div class="sidebar-bottom">
          <mat-divider></mat-divider>
          <mat-nav-list>
            <a mat-list-item class="nav-item">
              <mat-icon matListItemIcon>settings</mat-icon>
              <span matListItemTitle>Settings</span>
            </a>
            <a mat-list-item class="nav-item">
              <mat-icon matListItemIcon>help_outline</mat-icon>
              <span matListItemTitle>Help & Support</span>
            </a>
          </mat-nav-list>
        </div>
      </mat-sidenav>

      <!-- Main Content -->
      <mat-sidenav-content class="main-content">
        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container {
      height: 100vh;
      background-color: #fafbfc;
    }

    .sidenav {
      width: 280px;
      background-color: #ffffff;
      border-right: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
    }

    .logo-section {
      padding: 24px;
      text-align: center;
      background-color: #fafbfc;
    }

    .logo {
      width: 120px;
      height: auto;
      margin-bottom: 12px;
      border-radius: 12px;
    }

    .app-name {
      font-size: 24px;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .nav-list {
      padding: 16px 8px;
      flex: 1;
    }

    .nav-item {
      margin-bottom: 4px;
      border-radius: 8px;
      transition: all 0.2s ease;
      position: relative;
      
      &:hover {
        background-color: #f3f4f6;
      }
    }

    .nav-item mat-icon {
      margin-right: 16px;
      color: #6b7280;
    }

    .nav-item span[matListItemTitle] {
      font-size: 15px;
      font-weight: 500;
      color: #374151;
    }

    .active-link {
      background-color: #eff6ff !important;
      
      mat-icon {
        color: #2563eb !important;
      }
      
      span[matListItemTitle] {
        color: #2563eb !important;
      }
    }

    .nav-badge {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      background-color: #ef4444;
      color: white;
      font-size: 12px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      min-width: 20px;
      text-align: center;
    }

    .sidebar-bottom {
      margin-top: auto;
      padding-bottom: 16px;
    }

    .main-content {
      overflow-y: auto;
      height: 100vh;
    }

    mat-divider {
      margin: 0 !important;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .sidenav {
        width: 240px;
      }
      
      .logo {
        width: 80px;
      }
      
      .app-name {
        font-size: 20px;
      }
    }
  `]
})
export class AppShellComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Projects', icon: 'folder', route: '/projects' },
    { label: 'Staff', icon: 'badge', route: '/staff' },
    { label: 'Tasks', icon: 'assignment', route: '/tasks' },
    { label: 'Inventory', icon: 'inventory_2', route: '/inventory' },
    { label: 'Clients', icon: 'business', route: '/clients' },
    { label: 'Reports', icon: 'analytics', route: '/reports' },
  ];
}