import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PoleTrackerService } from '../../services/pole-tracker.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PoleTracker, ImageUpload } from '../../models/pole-tracker.model';
import { PlannedPole } from '../../models/mobile-pole-tracker.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-pole-tracker-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatDialogModule,
  ],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <h1>{{ getDisplayValue('vfPoleId') || getDisplayValue('poleId') || 'Pole Details' }}</h1>
          <mat-chip [class]="'type-' + getDisplayValue('poleType')">
            {{ getDisplayValue('poleType') | titlecase }} Pole
          </mat-chip>
        </div>
        <div class="header-actions">
          <a mat-button (click)="goBackToList()">
            <mat-icon>arrow_back</mat-icon>
            Back to List
          </a>
          <a mat-raised-button color="primary" [routerLink]="['/pole-tracker', poleId, 'edit']">
            <mat-icon>edit</mat-icon>
            Edit
          </a>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
        </div>
      } @else if (pole()) {
        <!-- Basic Information -->
        <mat-card class="info-card">
          <mat-card-header>
            <mat-card-title>Basic Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="info-grid">
              <div class="info-item">
                <label>VF Pole ID</label>
                <span class="value">{{ getDisplayValue('vfPoleId') }}</span>
              </div>
              <div class="info-item">
                <label>Pole Number</label>
                <span class="value">{{ getDisplayValue('poleNumber') }}</span>
              </div>
              <div class="info-item">
                <label>PON</label>
                <span class="value">{{ getDisplayValue('ponNumber') || getDisplayValue('pon') || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <label>Zone</label>
                <span class="value">{{ getDisplayValue('zoneNumber') || getDisplayValue('zone') || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <label>Project</label>
                <span class="value">{{ getDisplayValue('projectName') || getDisplayValue('projectCode') }}</span>
              </div>
              <div class="info-item">
                <label>Location</label>
                <span class="value">{{ getLocationDisplay() }}</span>
              </div>
              @if (!isPlannedPole()) {
                <div class="info-item">
                  <label>Date Installed</label>
                  <span class="value">
                    {{ formatDate(getDisplayValue('dateInstalled')) }}
                  </span>
                </div>
                <div class="info-item">
                  <label>Contractor</label>
                  <span class="value">{{ getDisplayValue('contractorName') || getDisplayValue('contractorId') || getDisplayValue('assignedContractorName') }}</span>
                </div>
                <div class="info-item">
                  <label>Working Team</label>
                  <span class="value">{{ getDisplayValue('workingTeam') || getDisplayValue('assignedTeamName') }}</span>
                </div>
              } @else {
                <div class="info-item">
                  <label>Status</label>
                  <span class="value">{{ getDisplayValue('status') | titlecase }}</span>
                </div>
                <div class="info-item">
                  <label>Height</label>
                  <span class="value">{{ getDisplayValue('height') || 'N/A' }}</span>
                </div>
                <div class="info-item">
                  <label>Diameter</label>
                  <span class="value">{{ getDisplayValue('diameter') || 'N/A' }}</span>
                </div>
              }
              @if (getDisplayValue('alternativePoleId')) {
                <div class="info-item">
                  <label>Alternative Pole ID</label>
                  <span class="value">{{ getDisplayValue('alternativePoleId') }}</span>
                </div>
              }
              @if (getDisplayValue('groupNumber')) {
                <div class="info-item">
                  <label>Group Number</label>
                  <span class="value">{{ getDisplayValue('groupNumber') }}</span>
                </div>
              }
              @if (getDisplayValue('connectedDrops') && getDisplayValue('connectedDrops').length > 0) {
                <div class="info-item full-width">
                  <label>Connected Drops ({{ getDisplayValue('connectedDrops').length }})</label>
                  <div class="drops-container">
                    @for (drop of getDisplayValue('connectedDrops'); track drop) {
                      <mat-chip class="drop-chip">{{ drop }}</mat-chip>
                    }
                  </div>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Upload Progress - Only for regular pole trackers -->
        @if (!isPlannedPole()) {
          <mat-card class="progress-card">
            <mat-card-header>
              <mat-card-title>Upload Progress</mat-card-title>
              <div class="progress-summary">
                {{ uploadedCount() }}/6 Images Uploaded ({{ uploadProgress() }}%)
              </div>
            </mat-card-header>
          <mat-card-content>
            <div class="upload-status-grid">
              <div class="upload-status" [class.uploaded]="getUploadStatus('before')">
                <mat-icon>{{
                  getUploadStatus('before') ? 'check_circle' : 'radio_button_unchecked'
                }}</mat-icon>
                <span>Before View</span>
              </div>
              <div class="upload-status" [class.uploaded]="getUploadStatus('front')">
                <mat-icon>{{
                  getUploadStatus('front') ? 'check_circle' : 'radio_button_unchecked'
                }}</mat-icon>
                <span>Front View</span>
              </div>
              <div class="upload-status" [class.uploaded]="getUploadStatus('side')">
                <mat-icon>{{
                  getUploadStatus('side') ? 'check_circle' : 'radio_button_unchecked'
                }}</mat-icon>
                <span>Side View</span>
              </div>
              <div class="upload-status" [class.uploaded]="getUploadStatus('depth')">
                <mat-icon>{{
                  getUploadStatus('depth') ? 'check_circle' : 'radio_button_unchecked'
                }}</mat-icon>
                <span>Depth View</span>
              </div>
              <div class="upload-status" [class.uploaded]="getUploadStatus('concrete')">
                <mat-icon>{{
                  getUploadStatus('concrete') ? 'check_circle' : 'radio_button_unchecked'
                }}</mat-icon>
                <span>Concrete View</span>
              </div>
              <div class="upload-status" [class.uploaded]="getUploadStatus('compaction')">
                <mat-icon>{{
                  getUploadStatus('compaction') ? 'check_circle' : 'radio_button_unchecked'
                }}</mat-icon>
                <span>Compaction View</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        }

        <!-- Image Gallery - Show for all poles (planned and regular) -->
        <mat-card class="gallery-card">
          <mat-card-header>
            <mat-card-title>Image Gallery</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="image-gallery">
              @for (uploadType of uploadTypes; track uploadType) {
                <div class="image-item">
                  <div class="image-header">
                    <h4>{{ getUploadTitle(uploadType) }}</h4>
                    @if (getUploadStatus(uploadType)) {
                      <mat-icon color="primary" matTooltip="Uploaded">check_circle</mat-icon>
                    } @else {
                      <mat-icon color="warn" matTooltip="Not uploaded">cancel</mat-icon>
                    }
                  </div>
                  @if (getUploadData(uploadType)?.url) {
                    <div class="image-container">
                      <img
                        [src]="
                          getUploadData(uploadType)?.thumbnailUrl || getUploadData(uploadType)?.url
                        "
                        [alt]="getUploadTitle(uploadType)"
                        (click)="viewFullImage(getUploadData(uploadType)?.url!)"
                        class="thumbnail"
                      />
                      <div class="image-overlay">
                        <button
                          mat-icon-button
                          (click)="viewFullImage(getUploadData(uploadType)?.url!)"
                        >
                          <mat-icon>zoom_in</mat-icon>
                        </button>
                      </div>
                    </div>
                    @if (getUploadData(uploadType)?.uploadedAt) {
                      <div class="upload-info">
                        <small
                          >Uploaded: {{ formatDate(getUploadData(uploadType)?.uploadedAt!) }}</small
                        >
                      </div>
                    }
                  } @else {
                    <div class="no-image">
                      <mat-icon>image_not_supported</mat-icon>
                      <span>No image uploaded</span>
                    </div>
                  }
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Quality Check - Only for regular pole trackers -->
        @if (!isPlannedPole()) {
        <mat-card class="quality-card">
          <mat-card-header>
            <mat-card-title>Quality Check</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="quality-status">
              <div class="status-indicator" [class.checked]="getDisplayValue('qualityChecked')">
                <mat-icon>{{ getDisplayValue('qualityChecked') ? 'verified' : 'pending' }}</mat-icon>
                <span>{{
                  getDisplayValue('qualityChecked') ? 'Quality Checked' : 'Pending Quality Check'
                }}</span>
              </div>

              @if (getDisplayValue('qualityChecked')) {
                <div class="quality-details">
                  <div class="quality-info">
                    <label>Checked By:</label>
                    <span>{{ getDisplayValue('qualityCheckedByName') || getDisplayValue('qualityCheckedBy') }}</span>
                  </div>
                  <div class="quality-info">
                    <label>Check Date:</label>
                    <span>{{ formatDate(getDisplayValue('qualityCheckDate')) }}</span>
                  </div>
                  @if (getDisplayValue('qualityCheckNotes')) {
                    <div class="quality-info notes">
                      <label>Notes:</label>
                      <span>{{ getDisplayValue('qualityCheckNotes') }}</span>
                    </div>
                  }
                </div>
              } @else {
                <button
                  mat-raised-button
                  color="accent"
                  (click)="markQualityChecked()"
                  [disabled]="!canMarkQualityChecked()"
                >
                  <mat-icon>verified</mat-icon>
                  Mark as Quality Checked
                </button>
              }
            </div>
          </mat-card-content>
        </mat-card>
        }

        <!-- Import Information - Only for planned poles -->
        @if (isPlannedPole()) {
          <mat-card class="import-card">
            <mat-card-header>
              <mat-card-title>Import Information</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="info-grid">
                <div class="info-item">
                  <label>Import Batch ID:</label>
                  <span>{{ getDisplayValue('importBatchId') }}</span>
                </div>
                <div class="info-item">
                  <label>Imported At:</label>
                  <span>{{ formatDate(getDisplayValue('importedAt')) }}</span>
                </div>
                <div class="info-item">
                  <label>Imported By:</label>
                  <span>{{ getDisplayValue('importedBy') }}</span>
                </div>
                @if (getDisplayValue('metadata')?.importFileName) {
                  <div class="info-item">
                    <label>Source File:</label>
                    <span>{{ getDisplayValue('metadata').importFileName }}</span>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Metadata -->
        <mat-card class="metadata-card">
          <mat-card-header>
            <mat-card-title>Metadata</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="metadata-grid">
              <div class="metadata-item">
                <label>Created By:</label>
                <span>{{ getDisplayValue('createdByName') || getDisplayValue('createdBy') || getDisplayValue('importedBy') }}</span>
              </div>
              <div class="metadata-item">
                <label>Created At:</label>
                <span>{{ formatDate(getDisplayValue('createdAt') || getDisplayValue('importedAt')) }}</span>
              </div>
              <div class="metadata-item">
                <label>Last Updated By:</label>
                <span>{{ getDisplayValue('updatedByName') || getDisplayValue('updatedBy') || getDisplayValue('lastModifiedBy') }}</span>
              </div>
              <div class="metadata-item">
                <label>Last Updated:</label>
                <span>{{ formatDate(getDisplayValue('updatedAt') || getDisplayValue('lastModified')) }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card>
          <mat-card-content>
            <p>Pole not found.</p>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 24px;
      }

      .header-left h1 {
        margin: 0 0 8px 0;
        font-size: 32px;
        font-weight: 500;
      }

      .header-actions {
        display: flex;
        gap: 12px;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 400px;
      }

      .info-card,
      .progress-card,
      .gallery-card,
      .quality-card,
      .metadata-card,
      .import-card {
        margin-bottom: 24px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .info-item label {
        font-weight: 500;
        color: #666;
        font-size: 14px;
      }

      .info-item .value {
        font-size: 16px;
      }

      .info-item.full-width {
        grid-column: 1 / -1;
      }

      .drops-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }

      .drop-chip {
        font-size: 12px;
        height: 24px;
        background-color: #e3f2fd;
        color: #1976d2;
      }

      .progress-summary {
        font-size: 14px;
        color: #666;
      }

      .upload-status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 16px;
      }

      .upload-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 8px;
        background: #f5f5f5;
      }

      .upload-status.uploaded {
        background: #e8f5e8;
        color: #2e7d32;
      }

      .upload-status mat-icon {
        color: inherit;
      }

      .image-gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 24px;
      }

      .image-item {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        overflow: hidden;
      }

      .image-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: #f5f5f5;
      }

      .image-header h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 500;
      }

      .image-container {
        position: relative;
        aspect-ratio: 1;
      }

      .thumbnail {
        width: 100%;
        height: 100%;
        object-fit: cover;
        cursor: pointer;
      }

      .image-overlay {
        position: absolute;
        top: 8px;
        right: 8px;
        opacity: 0;
        transition: opacity 0.3s;
      }

      .image-container:hover .image-overlay {
        opacity: 1;
      }

      .image-overlay button {
        background: rgba(0, 0, 0, 0.7);
        color: white;
      }

      .no-image {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1;
        color: #999;
        background: #f9f9f9;
      }

      .no-image mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 8px;
      }

      .upload-info {
        padding: 8px 12px;
        background: #f9f9f9;
        border-top: 1px solid #e0e0e0;
      }

      .quality-status {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
      }

      .status-indicator.checked {
        color: #2e7d32;
      }

      .quality-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        padding: 16px;
        background: #f5f5f5;
        border-radius: 8px;
      }

      .quality-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .quality-info.notes {
        grid-column: 1 / -1;
      }

      .quality-info label {
        font-weight: 500;
        color: #666;
        font-size: 14px;
      }

      .metadata-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }

      .metadata-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .metadata-item label {
        font-weight: 500;
        color: #666;
        font-size: 14px;
      }

      mat-chip.type-wooden {
        background-color: #8d6e63;
        color: white;
      }

      mat-chip.type-concrete {
        background-color: #616161;
        color: white;
      }

      mat-chip.type-steel {
        background-color: #455a64;
        color: white;
      }

      mat-chip.type-composite {
        background-color: #5d4037;
        color: white;
      }

      @media (max-width: 600px) {
        .page-header {
          flex-direction: column;
          gap: 16px;
        }

        .header-actions {
          width: 100%;
          justify-content: space-between;
        }

        .info-grid,
        .metadata-grid {
          grid-template-columns: 1fr;
        }

        .image-gallery {
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        }
      }
    `,
  ],
})
export class PoleTrackerDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private poleTrackerService = inject(PoleTrackerService);
  private authService = inject(AuthService);

  pole = signal<PoleTracker | PlannedPole | null>(null);
  isPlannedPole = signal<boolean>(false);
  loading = signal(true);
  poleId = '';

  uploadTypes = ['before', 'front', 'side', 'depth', 'concrete', 'compaction'] as const;

  uploadedCount = () => {
    const pole = this.pole();
    if (!pole) return 0;
    
    const uploads = (pole as any).uploads;
    if (!uploads) return 0;
    
    return Object.values(uploads).filter((upload: any) => upload.uploaded).length;
  };

  uploadProgress = () => {
    const count = this.uploadedCount();
    return Math.round((count / 6) * 100);
  };

  getDisplayValue(field: string): any {
    const pole = this.pole();
    if (!pole) return 'N/A';
    return (pole as any)[field] || 'N/A';
  }

  getLocationDisplay(): string {
    const pole = this.pole();
    if (!pole) return 'N/A';
    
    // For planned poles, location might be an object
    if (this.isPlannedPole()) {
      const plannedPole = pole as any;
      if (plannedPole.location && typeof plannedPole.location === 'object') {
        return `${plannedPole.location.latitude}, ${plannedPole.location.longitude}`;
      }
      if (plannedPole.plannedLocation) {
        return `${plannedPole.plannedLocation.lat}, ${plannedPole.plannedLocation.lng}`;
      }
    }
    
    // For regular pole trackers or string location
    return (pole as any).location || 'N/A';
  }

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.poleId = params['id'];
      this.loadPole();
    });
  }

  loadPole() {
    // First try to load from planned-poles collection
    this.poleTrackerService.getPlannedPoleById(this.poleId).subscribe({
      next: (plannedPole) => {
        if (plannedPole) {
          this.pole.set(plannedPole as any);
          this.isPlannedPole.set(true);
          this.loading.set(false);
        } else {
          // Fallback to pole-trackers collection
          this.poleTrackerService.getPoleTracker(this.poleId).subscribe({
            next: (pole) => {
              this.pole.set(pole);
              this.isPlannedPole.set(false);
              this.loading.set(false);
            },
            error: (error) => {
              console.error('Error loading pole:', error);
              this.snackBar.open('Error loading pole details', 'Close', { duration: 3000 });
              this.loading.set(false);
            },
          });
        }
      },
      error: (error) => {
        console.error('Error loading planned pole:', error);
        // Fallback to pole-trackers collection
        this.poleTrackerService.getPoleTracker(this.poleId).subscribe({
          next: (pole) => {
            this.pole.set(pole);
            this.isPlannedPole.set(false);
            this.loading.set(false);
          },
          error: (error) => {
            console.error('Error loading pole:', error);
            this.snackBar.open('Error loading pole details', 'Close', { duration: 3000 });
            this.loading.set(false);
          },
        });
      },
    });
  }

  getUploadTitle(uploadType: string): string {
    const titles: Record<string, string> = {
      before: 'Before View',
      front: 'Front View',
      side: 'Side View',
      depth: 'Depth View',
      concrete: 'Concrete View',
      compaction: 'Compaction View',
    };
    return titles[uploadType] || uploadType;
  }

  getUploadData(uploadType: string): ImageUpload | undefined {
    const pole = this.pole();
    if (!pole) return undefined;
    
    // Check if uploads exist on either planned pole or regular pole tracker
    const uploads = (pole as any).uploads;
    if (!uploads) return undefined;
    
    return uploads[uploadType as keyof typeof uploads];
  }

  getUploadStatus(uploadType: string): boolean {
    const uploadData = this.getUploadData(uploadType);
    return uploadData?.uploaded || false;
  }

  viewFullImage(imageUrl: string) {
    window.open(imageUrl, '_blank');
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';

    // Handle Firestore Timestamp
    if (typeof date === 'object' && 'toDate' in date) {
      return date.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // Handle regular Date
    if (date instanceof Date) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // Handle string dates
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  canMarkQualityChecked(): boolean {
    if (this.isPlannedPole()) return false; // Planned poles can't be quality checked
    const pole = this.pole() as PoleTracker;
    if (!pole?.uploads) return false;

    // Check if all images are uploaded
    return Object.values(pole.uploads).every((upload) => upload.uploaded);
  }

  markQualityChecked() {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.snackBar.open('You must be logged in to mark quality check', 'Close', {
        duration: 3000,
      });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Mark Quality Checked',
        message: 'Are you sure you want to mark this pole as quality checked?',
        confirmText: 'Mark Checked',
        confirmColor: 'primary',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.poleTrackerService
          .markQualityChecked(
            this.poleId,
            currentUser.uid,
            currentUser.displayName || currentUser.email || 'Unknown User',
          )
          .subscribe({
            next: () => {
              this.snackBar.open('Pole marked as quality checked', 'Close', { duration: 3000 });
              this.loadPole(); // Reload to show updated status
            },
            error: (error) => {
              console.error('Error marking quality check:', error);
              this.snackBar.open('Failed to mark quality check', 'Close', { duration: 3000 });
            },
          });
      }
    });
  }

  goBackToList() {
    // Try to get saved filters from session storage
    const savedFilters = sessionStorage.getItem('poleTrackerFilters');
    if (savedFilters) {
      try {
        const queryParams = JSON.parse(savedFilters);
        this.router.navigate(['/pole-tracker'], { queryParams });
      } catch (error) {
        // If parsing fails, go to basic list
        this.router.navigate(['/pole-tracker']);
      }
    } else {
      // No saved filters, go to basic list
      this.router.navigate(['/pole-tracker']);
    }
  }
}
