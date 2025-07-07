import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { PoleInstallation } from '../../models/mobile-pole-tracker.model';

interface DialogData {
  pole: PoleInstallation;
}

@Component({
  selector: 'app-photo-viewer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  styleUrls: ['./photo-viewer-dialog.component.scss'],
  template: `
    <div class="photo-viewer-dialog">
      <h2 mat-dialog-title>
        <div class="title-row">
          <span>Pole Photos - {{ data.pole.vfPoleId }}</span>
          <button mat-icon-button (click)="close()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </h2>

      <mat-dialog-content>
        <!-- Pole Info Summary -->
        <div class="pole-info">
          <div class="info-item">
            <strong>Project:</strong>
            <span>{{ data.pole.projectName || 'Unknown' }}</span>
          </div>
          <div class="info-item">
            <strong>Contractor:</strong>
            <span>{{ data.pole.contractorName || 'Unknown' }}</span>
          </div>
          <div class="info-item">
            <strong>Location Deviation:</strong>
            <mat-chip [class]="getDeviationClass()">
              {{ data.pole.locationDeviation.toFixed(1) }}m
            </mat-chip>
          </div>
        </div>

        <!-- Photo Tabs -->
        <mat-tab-group [selectedIndex]="selectedTab()">
          @for (photoType of photoTypes; track photoType.key) {
            <mat-tab [label]="photoType.label">
              <div class="photo-container">
                @if (getPhoto(photoType.key)?.url) {
                  <div class="photo-wrapper">
                    <img
                      [src]="getPhoto(photoType.key)?.url"
                      [alt]="photoType.label + ' photo'"
                      (click)="openFullscreen(getPhoto(photoType.key)?.url)"
                      class="pole-photo"
                    />

                    <!-- Photo Metadata -->
                    <div class="photo-metadata">
                      <div class="metadata-item">
                        <mat-icon>access_time</mat-icon>
                        <span>{{ formatTimestamp(getPhoto(photoType.key)?.timestamp) }}</span>
                      </div>

                      @if (getPhoto(photoType.key)?.gpsLocation) {
                        <div class="metadata-item">
                          <mat-icon>location_on</mat-icon>
                          <span>
                            {{ getPhoto(photoType.key)?.gpsLocation?.lat?.toFixed(6) }},
                            {{ getPhoto(photoType.key)?.gpsLocation?.lng?.toFixed(6) }}
                          </span>
                        </div>
                      }

                      @if (getPhoto(photoType.key)?.size) {
                        <div class="metadata-item">
                          <mat-icon>photo_size_select_actual</mat-icon>
                          <span>{{ formatFileSize(getPhoto(photoType.key)?.size) }}</span>
                        </div>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="no-photo">
                    <mat-icon>image_not_supported</mat-icon>
                    <p>No {{ photoType.label.toLowerCase() }} photo available</p>
                  </div>
                }
              </div>
            </mat-tab>
          }
        </mat-tab-group>

        <!-- Photo Grid View -->
        <div class="photo-grid-toggle">
          <button mat-button (click)="toggleGridView()">
            <mat-icon>{{ showGrid() ? 'view_list' : 'view_module' }}</mat-icon>
            {{ showGrid() ? 'List View' : 'Grid View' }}
          </button>
        </div>

        @if (showGrid()) {
          <div class="photo-grid">
            @for (photoType of photoTypes; track photoType.key) {
              <div class="grid-item" (click)="selectPhoto(photoType.key)">
                @if (getPhoto(photoType.key)?.url) {
                  <img
                    [src]="getPhoto(photoType.key)?.thumbnailUrl || getPhoto(photoType.key)?.url"
                    [alt]="photoType.label"
                    class="grid-photo"
                  />
                  <div class="grid-label">{{ photoType.label }}</div>
                } @else {
                  <div class="grid-placeholder">
                    <mat-icon>image_not_supported</mat-icon>
                    <div class="grid-label">{{ photoType.label }}</div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">Close</button>
        <button mat-raised-button color="primary" (click)="downloadAll()">
          <mat-icon>download</mat-icon>
          Download All Photos
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      @use '../../../styles/component-theming' as theme;

      .photo-viewer-dialog {
        width: 800px;
        max-width: 90vw;
      }

      .title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .pole-info {
        display: flex;
        gap: theme.ff-spacing(xl);
        padding: theme.ff-spacing(lg);
        background-color: theme.ff-rgba(primary, 0.05);
        border-radius: 8px;
        margin-bottom: theme.ff-spacing(xl);

        .info-item {
          display: flex;
          flex-direction: column;
          gap: theme.ff-spacing(xs);

          strong {
            font-size: 12px;
            color: theme.ff-rgba(foreground, 0.6);
          }
        }
      }

      mat-tab-group {
        margin-bottom: theme.ff-spacing(xl);
      }

      .photo-container {
        padding: theme.ff-spacing(lg);
        min-height: 400px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .photo-wrapper {
        width: 100%;
        max-width: 600px;
      }

      .pole-photo {
        width: 100%;
        height: auto;
        border-radius: 8px;
        cursor: zoom-in;
        box-shadow: theme.ff-var(elevation-3);
      }

      .photo-metadata {
        display: flex;
        gap: theme.ff-spacing(lg);
        margin-top: theme.ff-spacing(lg);
        padding: theme.ff-spacing(md);
        background-color: theme.ff-rgba(surface-variant, 0.5);
        border-radius: 4px;

        .metadata-item {
          display: flex;
          align-items: center;
          gap: theme.ff-spacing(xs);
          font-size: 14px;
          color: theme.ff-rgba(foreground, 0.7);

          mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }
      }

      .no-photo {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: theme.ff-spacing(md);
        color: theme.ff-rgba(foreground, 0.4);

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
        }
      }

      .photo-grid-toggle {
        text-align: center;
        margin-bottom: theme.ff-spacing(lg);
      }

      .photo-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: theme.ff-spacing(lg);
        padding: theme.ff-spacing(lg);
      }

      .grid-item {
        cursor: pointer;
        transition: transform 0.2s;

        &:hover {
          transform: scale(1.05);
        }
      }

      .grid-photo {
        width: 100%;
        height: 150px;
        object-fit: cover;
        border-radius: 4px;
        box-shadow: theme.ff-var(elevation-1);
      }

      .grid-placeholder {
        width: 100%;
        height: 150px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: theme.ff-rgba(surface-variant, 0.3);
        border-radius: 4px;
        color: theme.ff-rgba(foreground, 0.3);

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
        }
      }

      .grid-label {
        text-align: center;
        margin-top: theme.ff-spacing(xs);
        font-size: 12px;
        color: theme.ff-rgba(foreground, 0.7);
      }

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
    `,
  ],
})
export class PhotoViewerDialogComponent {
  private dialogRef = inject(MatDialogRef<PhotoViewerDialogComponent>);
  data = inject<DialogData>(MAT_DIALOG_DATA);

  selectedTab = signal(0);
  showGrid = signal(false);

  photoTypes = [
    { key: 'before', label: 'Before' },
    { key: 'front', label: 'Front View' },
    { key: 'side', label: 'Side View' },
    { key: 'depth', label: 'Depth' },
    { key: 'concrete', label: 'Concrete' },
    { key: 'compaction', label: 'Compaction' },
  ];

  getPhoto(key: string): any {
    return this.data.pole.photos?.[key as keyof typeof this.data.pole.photos];
  }

  getDeviationClass(): string {
    const deviation = this.data.pole.locationDeviation;
    if (deviation < 10) return 'deviation-valid';
    if (deviation <= 20) return 'deviation-warning';
    return 'deviation-invalid';
  }

  formatTimestamp(timestamp: any): string {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleString('en-ZA');
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  toggleGridView(): void {
    this.showGrid.update((v) => !v);
  }

  selectPhoto(key: string): void {
    const index = this.photoTypes.findIndex((p) => p.key === key);
    if (index >= 0) {
      this.selectedTab.set(index);
      this.showGrid.set(false);
    }
  }

  openFullscreen(url?: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  async downloadAll(): Promise<void> {
    // Create a temporary anchor element for each photo
    for (const photoType of this.photoTypes) {
      const photo = this.getPhoto(photoType.key);
      if (photo?.url) {
        const link = document.createElement('a');
        link.href = photo.url;
        link.download = `${this.data.pole.vfPoleId}_${photoType.key}.jpg`;
        link.click();

        // Small delay between downloads
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
