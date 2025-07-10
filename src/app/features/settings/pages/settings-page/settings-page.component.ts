import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

interface SettingsTab {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    PageHeaderComponent,
  ],
  template: `
    <div class="settings-page">
      <app-page-header title="Settings" subtitle="Manage system configuration and preferences">
      </app-page-header>

      <div class="content-container">
        <nav mat-tab-nav-bar class="settings-tabs">
          <a
            mat-tab-link
            *ngFor="let tab of tabs"
            [routerLink]="tab.route"
            routerLinkActive
            #rla="routerLinkActive"
            [active]="rla.isActive"
          >
            <mat-icon>{{ tab.icon }}</mat-icon>
            {{ tab.label }}
          </a>
        </nav>

        <div class="tab-content">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .settings-page {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .content-container {
        flex: 1;
        padding: 0 24px 24px;
        overflow-y: auto;
      }

      .settings-tabs {
        margin-bottom: 24px;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .tab-content {
        animation: fadeIn 0.3s ease-in;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      mat-icon {
        margin-right: 8px;
      }
    `,
  ],
})
export class SettingsPageComponent {
  tabs: SettingsTab[] = [
    { label: 'Company Info', icon: 'business', route: 'company' },
    { label: 'Email Templates', icon: 'mail_outline', route: 'email-templates' },
    { label: 'OneMap', icon: 'map', route: 'onemap' },
    { label: 'Users', icon: 'people', route: 'users' },
    { label: 'Email', icon: 'email', route: 'email' },
    { label: 'Notifications', icon: 'notifications', route: 'notifications' },
    { label: 'System', icon: 'settings_applications', route: 'system' },
  ];
}
