import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { DevNoteService } from '../../core/services/dev-note.service';
import { demoConfig } from '../../config/demo.config';
import { toSignal } from '@angular/core/rxjs-interop';
import { computed } from '@angular/core';
import { switchMap, of } from 'rxjs';

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
    MatTooltipModule,
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

        <!-- User Profile Section -->
        <div class="user-section" *ngIf="currentUser()">
          <mat-divider></mat-divider>
          <div class="user-info">
            <mat-icon class="user-avatar">account_circle</mat-icon>
            <div class="user-details">
              <div class="user-name">{{ currentUser()?.displayName }}</div>
              <div class="user-email">{{ currentUser()?.email }}</div>
            </div>
          </div>
          <button mat-icon-button class="logout-btn" (click)="logout()" matTooltip="Logout">
            <mat-icon>logout</mat-icon>
          </button>
          <mat-divider></mat-divider>
        </div>

        <!-- Navigation -->
        <div class="nav-content">
          <!-- Main Category -->
          <div class="nav-category">
            <h3 class="category-title">Main</h3>
            <mat-nav-list class="nav-list">
              <a
                mat-list-item
                *ngFor="let item of mainItems()"
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

          <!-- Analytics Category -->
          <div class="nav-category">
            <h3 class="category-title">Analytics</h3>
            <mat-nav-list class="nav-list">
              <a
                mat-list-item
                *ngFor="let item of analyticsItems"
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

          <!-- Mobile Pages Category -->
          <div class="nav-category">
            <h3 class="category-title">Mobile Pages</h3>
            <mat-nav-list class="nav-list">
              <a
                mat-list-item
                *ngFor="let item of mobileItems"
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
                *ngFor="let item of settingsItems()"
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

      /* User profile section */
      .user-section {
        padding: 16px;
        background-color: rgba(255, 255, 255, 0.05);
      }

      .user-info {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        position: relative;
      }

      .user-avatar {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: #64b5f6;
      }

      .user-details {
        flex: 1;
        overflow: hidden;
      }

      .user-name {
        color: #ffffff;
        font-weight: 500;
        font-size: 14px;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      .user-email {
        color: #90a4ae;
        font-size: 12px;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      .logout-btn {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        color: #90a4ae;

        &:hover {
          color: #ffffff;
        }
      }

      .mat-divider {
        border-top-color: rgba(255, 255, 255, 0.12);
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
  private devNoteService = inject(DevNoteService);
  private router = inject(Router);

  pendingTasksCount = 0;

  // Get dev stats for badge count - only load if authenticated
  devStats = toSignal(
    this.authService.user$.pipe(
      switchMap((user) => (user ? this.devNoteService.getDevStats() : of(null))),
    ),
    { initialValue: null },
  );

  // Current user signal
  currentUser = this.authService.currentUser;

  // Logout function
  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

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
  mainItems = computed(() =>
    this.filterItems([
      { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
      { label: 'Meetings', icon: 'groups', route: '/meetings' },
      { label: 'Action Items', icon: 'task_alt', route: '/action-items' },
    ]),
  );

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
    { label: 'Pole Tracker (Desktop)', icon: 'cell_tower', route: '/pole-tracker/list' },
    { label: 'Phases', icon: 'timeline', route: '/phases' },
    { label: 'Steps', icon: 'linear_scale', route: '/steps', badge: 0 },
    { label: 'All Tasks', icon: 'task_alt', route: '/tasks' },
    { label: 'Task Management', icon: 'checklist', route: '/task-management' },
    { label: 'Daily Progress', icon: 'assignment_turned_in', route: '/daily-progress' },
    // { label: 'Daily KPIs', icon: 'analytics', route: '/daily-progress/kpis' },
    { label: 'Enhanced KPIs', icon: 'insights', route: '/daily-progress/kpis-enhanced' },
    { label: 'KPI Dashboard', icon: 'dashboard', route: '/daily-progress/kpis-summary' },
    { label: 'Reports', icon: 'description', route: '/reports' },
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
    { label: 'Contractors', icon: 'engineering', route: '/contractors' },
  ]);

  // Analytics category items
  analyticsItems: NavItem[] = this.filterItems([
    { label: 'Project Progress Summary', icon: 'summarize', route: '/analytics/project-progress' },
    { label: 'Project Progress (Neon)', icon: 'storage', route: '/analytics/project-progress/neon' },
    { label: 'Pole Permission Analytics', icon: 'analytics', route: '/analytics/pole-permissions' },
    { label: 'Image Upload', icon: 'cloud_upload', route: '/images/upload' },
    { label: 'Argon AI Assistant', icon: 'hub', route: '/argon' },
  ]);

  // Mobile Pages category items
  mobileItems: NavItem[] = this.filterItems([
    { label: 'Pole Tracker (Mobile)', icon: 'smartphone', route: '/pole-tracker/mobile' },
    { label: 'Pole Map View', icon: 'map', route: '/pole-tracker/mobile/map' },
    { label: 'Quick Capture', icon: 'camera_alt', route: '/pole-tracker/mobile/capture' },
    { label: 'Offline Pole Capture', icon: 'cloud_off', route: '/offline-pole-capture' },
    { label: 'My Assignments', icon: 'assignment_ind', route: '/pole-tracker/mobile/assignments' },
    { label: 'Nearby Poles', icon: 'near_me', route: '/pole-tracker/mobile/nearby' },
  ]);

  // Settings category items
  settingsItems = computed(() =>
    this.filterItems([
      { label: 'Company Info', icon: 'business', route: '/settings/company' },
      { label: 'Settings', icon: 'settings', route: '/settings' },
      { label: 'Audit Trail', icon: 'history', route: '/audit-trail' },
      { label: 'Debug Logs', icon: 'bug_report', route: '/debug-logs' },
      {
        label: 'Dev Tasks',
        icon: 'assignment',
        route: '/dev-tasks',
        badge: this.devStats()?.pendingTasks || 0,
      },
    ]),
  );
}
