import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../core/services/auth.service';
import { demoConfig } from '../../config/demo.config';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

// interface NavCategory {
//   label: string;
//   items: NavItem[];
// }

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
    MatDividerModule,
    MatBadgeModule,
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <!-- Sidebar -->
      <mat-sidenav #sidenav mode="side" opened="true" class="sidenav" [fixedInViewport]="true">
        <!-- Logo Section -->
        <div class="logo-section">
          <div class="logo-container">
            <img
              src="velocity-fibre-logo.jpeg"
              alt="Velocity Fibre"
              class="logo-image"
              loading="lazy"
            />
          </div>
        </div>

        <!-- Navigation -->
        <div class="nav-content">
          <!-- Main Category -->
          <div class="nav-category">
            <h3 class="category-title">Main</h3>
            <mat-nav-list class="nav-list">
              <a
                mat-list-item
                *ngFor="let item of mainItems"
                [routerLink]="item.route"
                routerLinkActive="active-link"
                class="nav-item"
              >
                <mat-icon
                  matListItemIcon
                  [matBadge]="item.badge"
                  [matBadgeHidden]="!item.badge || item.badge === 0"
                  matBadgeColor="warn"
                  matBadgeSize="small"
                  >{{ item.icon }}</mat-icon
                >
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            </mat-nav-list>
          </div>

          <!-- Project Management Category -->
          <div class="nav-category">
            <h3 class="category-title">Project Management</h3>
            <mat-nav-list class="nav-list">
              <a
                mat-list-item
                *ngFor="let item of projectItems"
                [routerLink]="item.route"
                routerLinkActive="active-link"
                class="nav-item"
              >
                <mat-icon
                  matListItemIcon
                  [matBadge]="item.badge"
                  [matBadgeHidden]="!item.badge || item.badge === 0"
                  matBadgeColor="warn"
                  matBadgeSize="small"
                  >{{ item.icon }}</mat-icon
                >
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            </mat-nav-list>
          </div>

          <!-- Stock Management Category -->
          <div class="nav-category">
            <h3 class="category-title">Stock Management</h3>
            <mat-nav-list class="nav-list">
              <a
                mat-list-item
                *ngFor="let item of stockItems"
                [routerLink]="item.route"
                routerLinkActive="active-link"
                class="nav-item"
              >
                <mat-icon
                  matListItemIcon
                  [matBadge]="item.badge"
                  [matBadgeHidden]="!item.badge || item.badge === 0"
                  matBadgeColor="warn"
                  matBadgeSize="small"
                  >{{ item.icon }}</mat-icon
                >
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            </mat-nav-list>
          </div>

          <!-- Staff Category -->
          <div class="nav-category">
            <h3 class="category-title">Staff</h3>
            <mat-nav-list class="nav-list">
              <a
                mat-list-item
                *ngFor="let item of staffItems"
                [routerLink]="item.route"
                routerLinkActive="active-link"
                class="nav-item"
              >
                <mat-icon
                  matListItemIcon
                  [matBadge]="item.badge"
                  [matBadgeHidden]="!item.badge || item.badge === 0"
                  matBadgeColor="warn"
                  matBadgeSize="small"
                  >{{ item.icon }}</mat-icon
                >
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            </mat-nav-list>
          </div>

          <!-- Suppliers Category -->
          <div class="nav-category">
            <h3 class="category-title">Suppliers</h3>
            <mat-nav-list class="nav-list">
              <a
                mat-list-item
                *ngFor="let item of supplierItems"
                [routerLink]="item.route"
                routerLinkActive="active-link"
                class="nav-item"
              >
                <mat-icon
                  matListItemIcon
                  [matBadge]="item.badge"
                  [matBadgeHidden]="!item.badge || item.badge === 0"
                  matBadgeColor="warn"
                  matBadgeSize="small"
                  >{{ item.icon }}</mat-icon
                >
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            </mat-nav-list>
          </div>

          <!-- Clients Category -->
          <div class="nav-category">
            <h3 class="category-title">Clients</h3>
            <mat-nav-list class="nav-list">
              <a
                mat-list-item
                *ngFor="let item of clientItems"
                [routerLink]="item.route"
                routerLinkActive="active-link"
                class="nav-item"
              >
                <mat-icon
                  matListItemIcon
                  [matBadge]="item.badge"
                  [matBadgeHidden]="!item.badge || item.badge === 0"
                  matBadgeColor="warn"
                  matBadgeSize="small"
                  >{{ item.icon }}</mat-icon
                >
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            </mat-nav-list>
          </div>

          <!-- Contractors Category -->
          <div class="nav-category">
            <h3 class="category-title">Contractors</h3>
            <mat-nav-list class="nav-list">
              <a
                mat-list-item
                *ngFor="let item of contractorItems"
                [routerLink]="item.route"
                routerLinkActive="active-link"
                class="nav-item"
              >
                <mat-icon
                  matListItemIcon
                  [matBadge]="item.badge"
                  [matBadgeHidden]="!item.badge || item.badge === 0"
                  matBadgeColor="warn"
                  matBadgeSize="small"
                  >{{ item.icon }}</mat-icon
                >
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            </mat-nav-list>
          </div>

          <!-- Settings Category -->
          <div class="nav-category">
            <h3 class="category-title">Settings</h3>
            <mat-nav-list class="nav-list">
              <a
                mat-list-item
                *ngFor="let item of settingsItems"
                [routerLink]="item.route"
                routerLinkActive="active-link"
                class="nav-item"
              >
                <mat-icon
                  matListItemIcon
                  [matBadge]="item.badge"
                  [matBadgeHidden]="!item.badge || item.badge === 0"
                  matBadgeColor="warn"
                  matBadgeSize="small"
                  >{{ item.icon }}</mat-icon
                >
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            </mat-nav-list>
          </div>
        </div>
      </mat-sidenav>

      <!-- Main Content -->
      <mat-sidenav-content class="main-content">
        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .sidenav-container {
        height: 100vh;
        background-color: #f5f5f5;
      }

      .sidenav {
        width: 280px;
        background-color: #1a2332;
        border-right: 1px solid #2a3344;
        display: flex;
        flex-direction: column;
        color: #ffffff;
      }

      .logo-section {
        padding: 24px 16px;
        background-color: #1a2332;
        border-bottom: 1px solid #2a3344;
        height: 160px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .logo-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      .logo-image {
        width: auto;
        height: auto;
        max-width: 240px;
        max-height: 120px;
        border-radius: 8px;
        object-fit: contain;
        background-color: #ffffff;
        padding: 16px 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .nav-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px 0;
      }

      .nav-category {
        margin-bottom: 8px;
      }

      .category-title {
        font-size: 12px;
        font-weight: 500;
        color: #8b95a7;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 8px 20px;
        margin: 0;
      }

      .nav-list {
        padding: 0 12px;
      }

      .nav-item {
        margin-bottom: 2px;
        border-radius: 8px;
        transition: all 0.2s ease;
        position: relative;
        height: 40px;

        &:hover {
          background-color: #2a3344;
        }

        mat-icon {
          color: #8b95a7;
          font-size: 20px;
          width: 20px;
          height: 20px;
          margin-right: 12px;
        }

        span[matListItemTitle] {
          font-size: 14px;
          font-weight: 400;
          color: #ffffff;
        }
      }

      .active-link {
        background-color: rgba(255, 255, 255, 0.08) !important;

        mat-icon {
          color: #60a5fa !important;
        }

        span[matListItemTitle] {
          color: #60a5fa !important;
        }
      }

      .main-content {
        overflow-y: auto;
        height: 100vh;
        background-color: #f5f5f5;
      }

      /* Scrollbar styling */
      .nav-content::-webkit-scrollbar {
        width: 6px;
      }

      .nav-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .nav-content::-webkit-scrollbar-thumb {
        background: #2a3344;
        border-radius: 3px;
      }

      .nav-content::-webkit-scrollbar-thumb:hover {
        background: #3a4454;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .sidenav {
          width: 240px;
        }
      }
    `,
  ],
})
export class AppShellComponent {
  private authService = inject(AuthService);

  pendingTasksCount = 0;

  // Helper method to filter items based on demo config
  private filterItems(items: NavItem[]): NavItem[] {
    if (!demoConfig.isDemo) {
      return items;
    }
    return items.filter((item) => {
      // Check if the route itself is hidden
      if (demoConfig.hiddenRoutes.includes(item.route)) {
        return false;
      }
      // Check if the route starts with any hidden parent route
      return !demoConfig.hiddenRoutes.some((hiddenRoute) =>
        item.route.startsWith(hiddenRoute + '/'),
      );
    });
  }

  // Main category items
  mainItems: NavItem[] = this.filterItems([
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Meetings', icon: 'groups', route: '/meetings' },
    { label: 'Reports', icon: 'assessment', route: '/reports' },
  ]);

  // Staff category items
  staffItems: NavItem[] = this.filterItems([
    { label: 'Staff Overview', icon: 'people', route: '/staff' },
    { label: 'My Tasks', icon: 'assignment_ind', route: '/tasks/my-tasks' },
    { label: 'Personal Todos', icon: 'checklist_rtl', route: '/personal-todos' },
    { label: 'Roles & Permissions', icon: 'admin_panel_settings', route: '/roles' },
    { label: 'Attendance', icon: 'event_available', route: '/attendance' },
    { label: 'Performance', icon: 'trending_up', route: '/performance' },
  ]);

  // Project Management category items
  projectItems: NavItem[] = this.filterItems([
    { label: 'Projects', icon: 'folder', route: '/projects' },
    { label: 'Pole Tracker', icon: 'cell_tower', route: '/pole-tracker' },
    { label: 'Phases', icon: 'timeline', route: '/phases' },
    { label: 'Steps', icon: 'linear_scale', route: '/steps', badge: 0 },
    { label: 'All Tasks', icon: 'task_alt', route: '/tasks' },
    { label: 'Task Management', icon: 'checklist', route: '/tasks/management' },
    { label: 'Daily Progress', icon: 'assignment_turned_in', route: '/daily-progress' },
    { label: 'Daily KPIs', icon: 'analytics', route: '/daily-progress/kpis-enhanced' },
    { label: 'KPI Dashboard', icon: 'dashboard', route: '/daily-progress/kpis-summary' },
  ]);

  // Stock Management category items
  stockItems: NavItem[] = this.filterItems([
    { label: 'Master Materials', icon: 'category', route: '/materials' },
    { label: 'Stock Items', icon: 'inventory_2', route: '/stock' },
    { label: 'Stock Movements', icon: 'swap_horiz', route: '/stock-movements' },
    { label: 'Stock Allocations', icon: 'assignment', route: '/stock/allocations' },
    { label: 'BOQ Management', icon: 'receipt_long', route: '/boq' },
    { label: 'RFQ Management', icon: 'request_quote', route: '/quotes/rfq' },
    { label: 'Stock Analysis', icon: 'analytics', route: '/stock-analysis' },
  ]);

  // Suppliers category items
  supplierItems: NavItem[] = this.filterItems([
    { label: 'Suppliers', icon: 'local_shipping', route: '/suppliers' },
    { label: 'Email History', icon: 'email', route: '/emails/history' },
    { label: 'Supplier Portal', icon: 'web', route: '/supplier-portal' },
  ]);

  // Clients category items
  clientItems: NavItem[] = this.filterItems([
    { label: 'Clients', icon: 'business', route: '/clients' },
  ]);

  // Contractors category items
  contractorItems: NavItem[] = this.filterItems([
    { label: 'Contractors', icon: 'engineering', route: '/contractors' },
    {
      label: 'Daily Progress Reports',
      icon: 'assignment_turned_in',
      route: '/contractors/daily-progress',
    },
  ]);

  // Settings category items
  settingsItems: NavItem[] = this.filterItems([
    { label: 'Company Info', icon: 'business', route: '/settings/company' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
    { label: 'Audit Trail', icon: 'history', route: '/audit-trail' },
    { label: 'Debug Logs', icon: 'bug_report', route: '/debug-logs' },
  ]);
}
