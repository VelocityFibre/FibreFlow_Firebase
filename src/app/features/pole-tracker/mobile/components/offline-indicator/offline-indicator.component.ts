import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { OfflinePoleService } from '../../services/offline-pole.service';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatBadgeModule,
    MatTooltipModule,
    MatChipsModule
  ],
  template: `
    <div class="offline-indicator" [class.online]="online$ | async">
      <mat-chip [highlighted]="true">
        <mat-icon>{{ (online$ | async) ? 'wifi' : 'wifi_off' }}</mat-icon>
        <span>{{ (online$ | async) ? 'Online' : 'Offline' }}</span>
        
        @if (offlineCount() > 0) {
          <span class="count-badge">{{ offlineCount() }}</span>
        }
      </mat-chip>
    </div>
  `,
  styles: [`
    .offline-indicator {
      display: inline-block;
      
      mat-chip {
        background-color: var(--mat-sys-error-container) !important;
        color: var(--mat-sys-on-error-container) !important;
        
        mat-icon {
          margin-right: 4px;
        }
      }
      
      &.online mat-chip {
        background-color: var(--mat-sys-primary-container) !important;
        color: var(--mat-sys-on-primary-container) !important;
      }
      
      .count-badge {
        margin-left: 8px;
        padding: 2px 6px;
        background: var(--mat-sys-error);
        color: var(--mat-sys-on-error);
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
      }
    }
  `]
})
export class OfflineIndicatorComponent {
  private offlinePoleService = inject(OfflinePoleService);
  
  online$ = this.offlinePoleService.online$;
  
  offlineCount(): number {
    return this.offlinePoleService.getTotalOfflineCount();
  }
}