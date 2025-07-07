import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialog,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { PoleInstallation } from '../../models/mobile-pole-tracker.model';
import { formatDate } from '@angular/common';

interface DialogData {
  pole: PoleInstallation;
}

@Component({
  selector: 'app-pole-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatChipsModule,
  ],
  styleUrls: ['./pole-details-dialog.component.scss'],
  template: `
    <div class="pole-details-dialog">
      <h2 mat-dialog-title>
        <div class="title-row">
          <span>Pole Details - {{ data.pole.vfPoleId }}</span>
          <button mat-icon-button (click)="close()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </h2>

      <mat-dialog-content>
        <!-- Status Section -->
        <section class="details-section">
          <h3>Status</h3>
          <mat-list>
            <mat-list-item>
              <span matListItemTitle>Verification Status</span>
              <span matListItemLine>
                <mat-chip [class]="'status-' + (data.pole.verificationStatus || 'pending')">
                  {{ data.pole.verificationStatus || 'pending' }}
                </mat-chip>
              </span>
            </mat-list-item>
            @if (data.pole.verificationDate) {
              <mat-list-item>
                <span matListItemTitle>Verified Date</span>
                <span matListItemLine>{{ formatDate(data.pole.verificationDate) }}</span>
              </mat-list-item>
            }
            @if (data.pole.rejectionReason) {
              <mat-list-item>
                <span matListItemTitle>Rejection Reason</span>
                <span matListItemLine class="error-text">{{ data.pole.rejectionReason }}</span>
              </mat-list-item>
            }
          </mat-list>
        </section>

        <mat-divider></mat-divider>

        <!-- Project Information -->
        <section class="details-section">
          <h3>Project Information</h3>
          <mat-list>
            <mat-list-item>
              <span matListItemTitle>Project</span>
              <span matListItemLine>{{ data.pole.projectName || 'Unknown' }}</span>
            </mat-list-item>
            <mat-list-item>
              <span matListItemTitle>Project Code</span>
              <span matListItemLine>{{ data.pole.projectCode || 'N/A' }}</span>
            </mat-list-item>
            <mat-list-item>
              <span matListItemTitle>Contractor</span>
              <span matListItemLine>{{ data.pole.contractorName || 'Unknown' }}</span>
            </mat-list-item>
            <mat-list-item>
              <span matListItemTitle>Team</span>
              <span matListItemLine>{{ data.pole.teamName || 'N/A' }}</span>
            </mat-list-item>
          </mat-list>
        </section>

        <mat-divider></mat-divider>

        <!-- Installation Details -->
        <section class="details-section">
          <h3>Installation Details</h3>
          <mat-list>
            <mat-list-item>
              <span matListItemTitle>Installed By</span>
              <span matListItemLine>{{ data.pole.installedByName || data.pole.installedBy }}</span>
            </mat-list-item>
            <mat-list-item>
              <span matListItemTitle>Installation Date</span>
              <span matListItemLine>{{ formatDate(data.pole.installationDate) }}</span>
            </mat-list-item>
            <mat-list-item>
              <span matListItemTitle>Pole Type</span>
              <span matListItemLine>{{ data.pole.poleType }}</span>
            </mat-list-item>
            @if (data.pole.completionTime) {
              <mat-list-item>
                <span matListItemTitle>Completion Time</span>
                <span matListItemLine>{{ data.pole.completionTime }} minutes</span>
              </mat-list-item>
            }
          </mat-list>
        </section>

        <mat-divider></mat-divider>

        <!-- Location Information -->
        <section class="details-section">
          <h3>Location Information</h3>
          <mat-list>
            <mat-list-item>
              <span matListItemTitle>Location Deviation</span>
              <span matListItemLine>
                <mat-chip [class]="getDeviationClass()">
                  {{ data.pole.locationDeviation.toFixed(1) }}m
                  {{ data.pole.locationValid ? '(Valid)' : '(Invalid)' }}
                </mat-chip>
              </span>
            </mat-list-item>
            <mat-list-item>
              <span matListItemTitle>GPS Accuracy</span>
              <span matListItemLine>{{ data.pole.actualLocation.accuracy.toFixed(1) }}m</span>
            </mat-list-item>
            <mat-list-item>
              <span matListItemTitle>Capture Method</span>
              <span matListItemLine>{{ data.pole.actualLocation.method }}</span>
            </mat-list-item>
            <mat-list-item>
              <span matListItemTitle>Actual Coordinates</span>
              <span matListItemLine>
                {{ data.pole.actualLocation.lat.toFixed(6) }},
                {{ data.pole.actualLocation.lng.toFixed(6) }}
              </span>
            </mat-list-item>
          </mat-list>
        </section>

        <mat-divider></mat-divider>

        <!-- Quality Information -->
        <section class="details-section">
          <h3>Quality & Sync Status</h3>
          <mat-list>
            @if (data.pole.qualityScore !== undefined) {
              <mat-list-item>
                <span matListItemTitle>Quality Score</span>
                <span matListItemLine>{{ data.pole.qualityScore }}%</span>
              </mat-list-item>
            }
            @if (data.pole.syncStatus) {
              <mat-list-item>
                <span matListItemTitle>Sync Status</span>
                <span matListItemLine>
                  <mat-chip [class]="'sync-' + data.pole.syncStatus">
                    {{ data.pole.syncStatus }}
                  </mat-chip>
                </span>
              </mat-list-item>
            }
            @if (data.pole.createdOffline) {
              <mat-list-item>
                <span matListItemTitle>Created Offline</span>
                <span matListItemLine>Yes</span>
              </mat-list-item>
            }
          </mat-list>
        </section>

        @if (data.pole.verificationNotes) {
          <mat-divider></mat-divider>
          <section class="details-section">
            <h3>Verification Notes</h3>
            <p class="notes">{{ data.pole.verificationNotes }}</p>
          </section>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="viewPhotos()">
          <mat-icon>photo_library</mat-icon>
          View Photos
        </button>
        <button mat-button (click)="close()">Close</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      @use '../../../styles/component-theming' as theme;

      .pole-details-dialog {
        width: 600px;
        max-width: 90vw;
      }

      .title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .details-section {
        padding: theme.ff-spacing(lg) 0;

        h3 {
          margin: 0 0 theme.ff-spacing(md) 0;
          color: theme.ff-rgba(foreground, 0.8);
          font-size: 16px;
          font-weight: 600;
        }
      }

      mat-list-item {
        height: auto;
        padding: theme.ff-spacing(sm) 0;

        span[matListItemTitle] {
          font-weight: 500;
          color: theme.ff-rgba(foreground, 0.7);
          font-size: 14px;
        }

        span[matListItemLine] {
          margin-top: theme.ff-spacing(xs);
          color: theme.ff-rgb(foreground);
        }
      }

      .error-text {
        color: theme.ff-rgb(danger);
      }

      .notes {
        padding: theme.ff-spacing(md);
        background-color: theme.ff-rgba(surface-variant, 0.3);
        border-radius: 4px;
        margin: 0;
        white-space: pre-wrap;
      }

      // Status chips
      .status-pending {
        background-color: theme.ff-rgba(warning, 0.2);
        color: theme.ff-rgb(warning);
      }

      .status-approved {
        background-color: theme.ff-rgba(success, 0.2);
        color: theme.ff-rgb(success);
      }

      .status-rejected {
        background-color: theme.ff-rgba(danger, 0.2);
        color: theme.ff-rgb(danger);
      }

      // Deviation chips
      .deviation-valid {
        background-color: theme.ff-rgba(success, 0.2);
        color: theme.ff-rgb(success);
      }

      .deviation-warning {
        background-color: theme.ff-rgba(warning, 0.2);
        color: theme.ff-rgb(warning);
      }

      .deviation-invalid {
        background-color: theme.ff-rgba(danger, 0.2);
        color: theme.ff-rgb(danger);
      }

      // Sync status chips
      .sync-synced {
        background-color: theme.ff-rgba(success, 0.2);
        color: theme.ff-rgb(success);
      }

      .sync-pending,
      .sync-syncing {
        background-color: theme.ff-rgba(warning, 0.2);
        color: theme.ff-rgb(warning);
      }

      .sync-failed {
        background-color: theme.ff-rgba(danger, 0.2);
        color: theme.ff-rgb(danger);
      }

      mat-divider {
        margin: theme.ff-spacing(lg) 0;
      }
    `,
  ],
})
export class PoleDetailsDialogComponent {
  private dialogRef = inject(MatDialogRef<PoleDetailsDialogComponent>);
  private dialog = inject(MatDialog);
  data = inject<DialogData>(MAT_DIALOG_DATA);

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : date.toDate();
    return formatDate(d, 'dd MMM yyyy HH:mm', 'en-ZA');
  }

  getDeviationClass(): string {
    const deviation = this.data.pole.locationDeviation;
    if (deviation < 10) return 'deviation-valid';
    if (deviation <= 20) return 'deviation-warning';
    return 'deviation-invalid';
  }

  viewPhotos(): void {
    // Import the photo viewer dialog dynamically to avoid circular dependency
    import('../photo-viewer-dialog/photo-viewer-dialog.component').then(
      ({ PhotoViewerDialogComponent }) => {
        this.dialog.open(PhotoViewerDialogComponent, {
          data: { pole: this.data.pole },
          width: '90vw',
          maxWidth: '900px',
          maxHeight: '90vh',
        });
      },
    );
  }

  close(): void {
    this.dialogRef.close();
  }
}
