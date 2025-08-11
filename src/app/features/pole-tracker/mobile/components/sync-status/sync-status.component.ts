import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { OfflineSyncService } from '../../services/offline-sync.service';
import { OfflinePoleService } from '../../services/offline-pole.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatExpansionModule
  ],
  template: `
    <mat-card class="sync-status-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>sync</mat-icon>
          Sync Status
        </mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        @if (syncProgress$ | async; as progress) {
          @if (!progress.isComplete) {
            <div class="sync-progress">
              <p>{{ progress.currentItem || 'Preparing to sync...' }}</p>
              <mat-progress-bar 
                mode="determinate" 
                [value]="getProgressPercentage(progress)">
              </mat-progress-bar>
              <p class="progress-text">
                {{ progress.syncedItems }} of {{ progress.totalItems }} items synced
              </p>
            </div>
          }
          
          @if (progress.errors.length > 0) {
            <mat-expansion-panel class="errors-panel">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon color="warn">error</mat-icon>
                  Sync Errors ({{ progress.errors.length }})
                </mat-panel-title>
              </mat-expansion-panel-header>
              
              <mat-list>
                @for (error of progress.errors; track error) {
                  <mat-list-item>
                    <mat-icon matListItemIcon color="warn">warning</mat-icon>
                    <span matListItemTitle>{{ error }}</span>
                  </mat-list-item>
                }
              </mat-list>
              
              <mat-action-row>
                <button mat-button color="warn" (click)="clearErrors()">
                  Clear Errors
                </button>
              </mat-action-row>
            </mat-expansion-panel>
          }
        }
        
        <div class="sync-summary">
          <div class="summary-item">
            <mat-icon>cloud_off</mat-icon>
            <div>
              <span class="label">Offline Items</span>
              <span class="value">{{ getOfflineCount() }}</span>
            </div>
          </div>
          
          <div class="summary-item">
            <mat-icon>cloud_queue</mat-icon>
            <div>
              <span class="label">Pending Sync</span>
              <span class="value">{{ getPendingCount() }}</span>
            </div>
          </div>
        </div>
      </mat-card-content>
      
      <mat-card-actions>
        <button mat-raised-button 
                color="primary" 
                (click)="syncNow()"
                [disabled]="isSyncing()">
          <mat-icon>sync</mat-icon>
          {{ isSyncing() ? 'Syncing...' : 'Sync Now' }}
        </button>
        
        @if (hasFailedPoles()) {
          <button mat-button color="accent" (click)="retryFailed()">
            <mat-icon>refresh</mat-icon>
            Retry Failed
          </button>
        }
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .sync-status-card {
      margin: 16px;
      max-width: 500px;
      
      mat-card-header {
        margin-bottom: 16px;
        
        mat-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }
    }
    
    .sync-progress {
      margin-bottom: 24px;
      
      p {
        margin: 8px 0;
      }
      
      .progress-text {
        text-align: center;
        color: var(--mat-sys-outline);
        font-size: 14px;
      }
    }
    
    .errors-panel {
      margin-bottom: 16px;
      background: var(--mat-sys-error-container);
      
      mat-panel-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
    
    .sync-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
      
      .summary-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--mat-sys-surface-variant);
        border-radius: 8px;
        
        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
          color: var(--mat-sys-primary);
        }
        
        div {
          display: flex;
          flex-direction: column;
          
          .label {
            font-size: 12px;
            color: var(--mat-sys-outline);
          }
          
          .value {
            font-size: 24px;
            font-weight: bold;
            color: var(--mat-sys-on-surface);
          }
        }
      }
    }
    
    mat-card-actions {
      padding: 16px;
      gap: 8px;
    }
  `]
})
export class SyncStatusComponent {
  private syncService = inject(OfflineSyncService);
  private offlinePoleService = inject(OfflinePoleService);
  
  syncProgress$ = this.syncService.syncProgress$;
  offlinePoles$ = this.offlinePoleService.offlinePoles$;
  
  getProgressPercentage(progress: any): number {
    if (progress.totalItems === 0) return 0;
    return (progress.syncedItems / progress.totalItems) * 100;
  }
  
  getOfflineCount(): number {
    return this.offlinePoleService.getTotalOfflineCount();
  }
  
  getPendingCount(): number {
    return this.offlinePoleService.getPendingSyncCount();
  }
  
  isSyncing(): boolean {
    return this.syncService.getSyncStatus().isSyncing;
  }
  
  async syncNow(): Promise<void> {
    try {
      await this.syncService.syncAllPendingPoles();
    } catch (error) {
      console.error('Sync error:', error);
    }
  }
  
  async retryFailed(): Promise<void> {
    try {
      await this.syncService.retryFailedSyncs();
    } catch (error) {
      console.error('Retry error:', error);
    }
  }
  
  clearErrors(): void {
    this.syncService.clearErrors();
  }

  hasFailedPoles(): boolean {
    return this.offlinePoleService.getFailedSyncCount() > 0;
  }
}