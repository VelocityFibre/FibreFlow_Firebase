import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { FCMService } from '@app/core/services/fcm.service';
import { NotificationService } from '@app/core/services/notification.service';

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    FormsModule,
  ],
  template: `
    <mat-card class="notification-settings">
      <mat-card-header>
        <mat-icon mat-card-avatar>notifications</mat-icon>
        <mat-card-title>Push Notifications</mat-card-title>
        <mat-card-subtitle> Get notified about pole installation updates </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <div class="settings-content">
          @if (loading) {
            <div class="loading">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Checking notification settings...</p>
            </div>
          } @else {
            <div class="notification-status">
              <mat-icon [class.enabled]="notificationsEnabled">
                {{ notificationsEnabled ? 'notifications_active' : 'notifications_off' }}
              </mat-icon>
              <div class="status-text">
                <h3>{{ getStatusTitle() }}</h3>
                <p>{{ getStatusDescription() }}</p>
              </div>
            </div>

            @if (isSupported && permissionStatus !== 'denied') {
              <mat-slide-toggle
                [(ngModel)]="notificationsEnabled"
                (change)="toggleNotifications()"
                [disabled]="toggling"
              >
                {{ notificationsEnabled ? 'Notifications Enabled' : 'Enable Notifications' }}
              </mat-slide-toggle>
            }

            @if (permissionStatus === 'denied') {
              <div class="permission-denied">
                <mat-icon color="warn">block</mat-icon>
                <p>
                  Notifications are blocked. Please enable them in your browser settings to receive
                  pole update notifications.
                </p>
              </div>
            }

            @if (!isSupported) {
              <div class="not-supported">
                <mat-icon color="accent">info</mat-icon>
                <p>
                  Push notifications are not supported in your browser. Please use a modern browser
                  like Chrome, Firefox, or Edge.
                </p>
              </div>
            }
          }
        </div>
      </mat-card-content>

      @if (notificationsEnabled) {
        <mat-card-actions>
          <button mat-button (click)="testNotification()" [disabled]="testing">
            <mat-icon>send</mat-icon>
            Test Notification
          </button>
        </mat-card-actions>
      }
    </mat-card>
  `,
  styles: [
    `
      .notification-settings {
        max-width: 500px;
        margin: 16px auto;
      }

      .settings-content {
        padding: 16px 0;
      }

      .loading {
        text-align: center;
        padding: 32px;

        p {
          margin-top: 16px;
          color: var(--mat-sys-on-surface-variant);
        }
      }

      .notification-status {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          color: var(--mat-sys-on-surface-variant);

          &.enabled {
            color: var(--mat-sys-primary);
          }
        }

        .status-text {
          flex: 1;

          h3 {
            margin: 0 0 4px 0;
            font-size: 18px;
          }

          p {
            margin: 0;
            color: var(--mat-sys-on-surface-variant);
            font-size: 14px;
          }
        }
      }

      .permission-denied,
      .not-supported {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: var(--mat-sys-surface-variant);
        border-radius: 8px;
        margin-top: 16px;

        mat-icon {
          flex-shrink: 0;
        }

        p {
          margin: 0;
          font-size: 14px;
        }
      }

      mat-slide-toggle {
        display: block;
      }

      mat-card-actions {
        padding: 8px 16px;
        border-top: 1px solid var(--mat-sys-outline-variant);
      }
    `,
  ],
})
export class NotificationSettingsComponent implements OnInit {
  private fcmService = inject(FCMService);
  private notificationService = inject(NotificationService);

  loading = true;
  toggling = false;
  testing = false;

  isSupported = false;
  permissionStatus: NotificationPermission = 'default';
  notificationsEnabled = false;
  currentToken: string | null = null;

  ngOnInit(): void {
    this.checkNotificationStatus();
  }

  private async checkNotificationStatus(): Promise<void> {
    this.loading = true;

    try {
      // Check if notifications are supported
      this.isSupported = this.fcmService.isNotificationSupported();

      if (this.isSupported) {
        // Get current permission status
        this.permissionStatus = this.fcmService.getPermissionStatus();

        // Check if we have a token (notifications enabled)
        this.fcmService.currentToken$.subscribe((token) => {
          this.currentToken = token;
          this.notificationsEnabled = !!token;
        });
      }
    } catch (error) {
      console.error('Error checking notification status:', error);
    } finally {
      this.loading = false;
    }
  }

  async toggleNotifications(): Promise<void> {
    if (!this.isSupported) return;

    this.toggling = true;

    try {
      if (this.notificationsEnabled) {
        // Request permission and get token
        const token = await this.fcmService.requestPermission();

        if (token) {
          this.notificationService.showNotification(
            'Notifications enabled! You will receive updates about pole installations.',
            'success',
          );
        } else {
          this.notificationsEnabled = false;
          this.permissionStatus = this.fcmService.getPermissionStatus();
        }
      } else {
        // In a real app, you would revoke the token here
        // For now, just update the UI
        this.currentToken = null;
        this.notificationService.showNotification('Notifications disabled', 'info');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      this.notificationsEnabled = !this.notificationsEnabled;
      this.notificationService.showNotification('Failed to update notification settings', 'error');
    } finally {
      this.toggling = false;
    }
  }

  async testNotification(): Promise<void> {
    this.testing = true;

    try {
      // Show a test notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('FibreFlow Test', {
          body: 'Pole VF-TEST-001 has been approved and verified.',
          icon: '/velocity-fibre-logo.jpeg',
          badge: '/favicon.ico',
          tag: 'test-notification',
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }

      this.notificationService.showNotification('Test notification sent!', 'success');
    } catch (error) {
      console.error('Error sending test notification:', error);
      this.notificationService.showNotification('Failed to send test notification', 'error');
    } finally {
      this.testing = false;
    }
  }

  getStatusTitle(): string {
    if (!this.isSupported) {
      return 'Not Supported';
    }

    if (this.permissionStatus === 'denied') {
      return 'Notifications Blocked';
    }

    return this.notificationsEnabled ? 'Notifications Active' : 'Notifications Disabled';
  }

  getStatusDescription(): string {
    if (!this.isSupported) {
      return 'Your browser does not support push notifications';
    }

    if (this.permissionStatus === 'denied') {
      return 'You have blocked notifications for this site';
    }

    return this.notificationsEnabled
      ? 'You will receive updates when poles are installed or verified'
      : 'Enable notifications to receive pole update alerts';
  }
}
