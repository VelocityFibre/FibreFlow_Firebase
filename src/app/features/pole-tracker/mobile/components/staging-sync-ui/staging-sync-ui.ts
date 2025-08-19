import { Component, inject, signal, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

import { OfflineSyncService } from '../../services/offline-sync.service';
import { StagingSyncService, StagingSyncProgress } from '../../services/staging-sync.service';
import { OfflinePoleService } from '../../services/offline-pole.service';

@Component({
  selector: 'app-staging-sync-ui',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatBadgeModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  templateUrl: './staging-sync-ui.html',
  styleUrl: './staging-sync-ui.scss'
})
export class StagingSyncUiComponent implements OnInit, OnDestroy {
  private offlineSyncService = inject(OfflineSyncService);
  private stagingSyncService = inject(StagingSyncService);
  private offlinePoleService = inject(OfflinePoleService);
  private snackBar = inject(MatSnackBar);
  
  // Signals for reactive state
  syncProgress = signal<StagingSyncProgress>({
    totalItems: 0,
    syncedToStaging: 0,
    validatedItems: 0,
    syncedToProduction: 0,
    currentStage: 'idle',
    errors: []
  });
  
  syncSummary = signal<{
    offlinePending: number;
    offlineError: number;
    staged: number;
    stagingPending: number;
    stagingValidated: number;
    stagingRejected: number;
  }>({
    offlinePending: 0,
    offlineError: 0,
    staged: 0,
    stagingPending: 0,
    stagingValidated: 0,
    stagingRejected: 0
  });
  
  isOnline = signal(navigator.onLine);
  isSyncing = signal(false);
  showErrors = signal(false);
  
  // Event emitter for successful sync completion
  @Output() syncCompleted = new EventEmitter<void>();
  
  private subscriptions = new Subscription();
  
  ngOnInit() {
    // Subscribe to sync progress
    this.subscriptions.add(
      this.stagingSyncService.syncProgress$.subscribe(progress => {
        this.syncProgress.set(progress);
      })
    );
    
    // Subscribe to online status
    this.subscriptions.add(
      this.offlinePoleService.online$.subscribe(online => {
        this.isOnline.set(online);
      })
    );
    
    // Load initial summary
    this.loadSyncSummary();
    
    // Refresh summary every 10 seconds
    const intervalId = setInterval(() => {
      if (!this.isSyncing()) {
        this.loadSyncSummary();
      }
    }, 10000);
    
    this.subscriptions.add({
      unsubscribe: () => clearInterval(intervalId)
    });
  }
  
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
  
  private async loadSyncSummary() {
    try {
      // Get offline summary from offline sync service
      const offlineSummary = await this.offlineSyncService.getSyncSummary();
      
      // Get staging summary directly from staging sync service
      const stagingSummary = await this.stagingSyncService.getSyncSummary();
      
      // Combine both summaries
      this.syncSummary.set({
        offlinePending: offlineSummary.offlinePending,
        offlineError: offlineSummary.offlineError,
        staged: offlineSummary.staged,
        stagingPending: stagingSummary.stagingPending,
        stagingValidated: stagingSummary.stagingValidated,
        stagingRejected: stagingSummary.stagingRejected
      });
    } catch (error) {
      console.error('Failed to load sync summary:', error);
    }
  }
  
  async startSync() {
    if (!this.isOnline() || this.isSyncing()) return;
    
    this.isSyncing.set(true);
    this.stagingSyncService.clearErrors();
    
    try {
      // First, mark all pending poles for staging sync
      await this.offlineSyncService.syncAllPendingPoles();
      
      // Then trigger the staging sync
      const results = await this.stagingSyncService.syncAllToStaging();
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        this.snackBar.open(
          `Successfully synced ${successCount} pole(s) to staging`, 
          'Close', 
          { duration: 5000 }
        );
        
        // Emit event to notify parent component of successful sync
        this.syncCompleted.emit();
      }
      
      if (failureCount > 0) {
        this.snackBar.open(
          `Failed to sync ${failureCount} pole(s)`, 
          'View Errors', 
          { duration: 10000 }
        ).onAction().subscribe(() => {
          this.showErrors.set(true);
        });
      }
      
      // Reload summary
      await this.loadSyncSummary();
      
    } catch (error) {
      this.snackBar.open(
        'Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 
        'Close', 
        { duration: 5000, panelClass: 'error-snackbar' }
      );
    } finally {
      this.isSyncing.set(false);
    }
  }
  
  async retryFailed() {
    if (!this.isOnline() || this.isSyncing()) return;
    
    this.isSyncing.set(true);
    
    try {
      // Mark failed poles as pending for retry
      await this.offlineSyncService.retryFailedSyncs();
      
      // Then trigger the staging sync
      const results = await this.stagingSyncService.syncAllToStaging();
      
      const successCount = results.filter(r => r.success).length;
      
      this.snackBar.open(
        successCount > 0 
          ? `Retried ${successCount} failed sync(s)` 
          : 'No failed syncs to retry',
        'Close', 
        { duration: 3000 }
      );
      
      // Reload summary
      await this.loadSyncSummary();
      
    } catch (error) {
      this.snackBar.open(
        'Retry failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 
        'Close', 
        { duration: 5000, panelClass: 'error-snackbar' }
      );
    } finally {
      this.isSyncing.set(false);
    }
  }
  
  getProgressPercentage(): number {
    const progress = this.syncProgress();
    if (progress.totalItems === 0) return 0;
    return Math.round((progress.syncedToStaging / progress.totalItems) * 100);
  }
  
  getStageBadgeColor(stage: string): string {
    switch (stage) {
      case 'idle':
      case 'complete':
        return 'primary';
      case 'uploading':
      case 'validating':
      case 'syncing':
        return 'accent';
      default:
        return 'warn';
    }
  }
  
  clearErrors() {
    this.stagingSyncService.clearErrors();
    this.showErrors.set(false);
  }
}