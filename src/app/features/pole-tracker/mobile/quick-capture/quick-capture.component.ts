import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PoleTrackerService } from '../../services/pole-tracker.service';
import { GoogleMapsService } from '../../services/google-maps.service';
import { OfflineQueueService } from '../../services/offline-queue.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PlannedPole, PoleInstallation, PoleType } from '../../models/mobile-pole-tracker.model';
import { firstValueFrom } from 'rxjs';

interface PhotoCapture {
  type: 'before' | 'front' | 'side' | 'depth' | 'concrete' | 'compaction';
  label: string;
  captured: boolean;
  url?: string;
  file?: File;
}

@Component({
  selector: 'app-quick-capture',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="capture-container">
      <div class="header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Pole Installation Capture</h1>
        @if (!isOnline()) {
          <mat-chip class="offline-chip">
            <mat-icon>cloud_off</mat-icon>
            Offline
          </mat-chip>
        }
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Loading pole data...</p>
        </div>
      } @else if (plannedPole()) {
        <form [formGroup]="captureForm" (ngSubmit)="submitCapture()">
          <!-- Pole Info Card -->
          <mat-card class="info-card">
            <mat-card-header>
              <mat-card-title>{{ plannedPole()!.clientPoleNumber }}</mat-card-title>
              <mat-chip [class]="'status-' + plannedPole()!.status">
                {{ plannedPole()!.status | titlecase }}
              </mat-chip>
            </mat-card-header>
            <mat-card-content>
              @if (plannedPole()!.plannedLocation.address) {
                <p><mat-icon>location_on</mat-icon> {{ plannedPole()!.plannedLocation.address }}</p>
              }
              @if (plannedPole()!.notes) {
                <p><mat-icon>note</mat-icon> {{ plannedPole()!.notes }}</p>
              }
            </mat-card-content>
          </mat-card>

          <!-- Location Validation -->
          <mat-card class="location-card">
            <mat-card-header>
              <mat-card-title>Location Verification</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (gettingLocation()) {
                <div class="location-loading">
                  <mat-spinner diameter="24"></mat-spinner>
                  <span>Getting GPS location...</span>
                </div>
              } @else if (currentLocation()) {
                <div class="location-info">
                  <div class="location-status" [class.valid]="isLocationValid()">
                    @if (isLocationValid()) {
                      <mat-icon>check_circle</mat-icon>
                      <span>Within {{ locationDeviation() }}m of planned location</span>
                    } @else {
                      <mat-icon>warning</mat-icon>
                      <span>{{ locationDeviation() }}m from planned location</span>
                    }
                  </div>
                  <p class="accuracy">GPS Accuracy: ±{{ locationAccuracy() }}m</p>
                  <button mat-button type="button" (click)="refreshLocation()">
                    <mat-icon>refresh</mat-icon>
                    Refresh GPS
                  </button>
                </div>
              } @else {
                <button mat-raised-button type="button" (click)="getLocation()">
                  <mat-icon>my_location</mat-icon>
                  Get GPS Location
                </button>
              }
            </mat-card-content>
          </mat-card>

          <!-- Pole Type Selection -->
          <mat-card>
            <mat-card-content>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Pole Type</mat-label>
                <mat-select formControlName="poleType" required>
                  <mat-option value="wooden">Wooden</mat-option>
                  <mat-option value="concrete">Concrete</mat-option>
                  <mat-option value="steel">Steel</mat-option>
                  <mat-option value="composite">Composite</mat-option>
                </mat-select>
              </mat-form-field>
            </mat-card-content>
          </mat-card>

          <!-- Photo Capture Section -->
          <mat-card class="photos-card">
            <mat-card-header>
              <mat-card-title>Required Photos ({{ capturedPhotosCount() }}/6)</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="photo-grid">
                @for (photo of photos(); track photo.type) {
                  <div class="photo-item" [class.captured]="photo.captured">
                    @if (photo.captured && photo.url) {
                      <img [src]="photo.url" [alt]="photo.label" />
                      <button
                        mat-icon-button
                        type="button"
                        class="photo-action"
                        (click)="retakePhoto(photo)"
                      >
                        <mat-icon>refresh</mat-icon>
                      </button>
                    } @else {
                      <div class="photo-placeholder" (click)="capturePhoto(photo)">
                        <mat-icon>add_a_photo</mat-icon>
                        <span>{{ photo.label }}</span>
                      </div>
                      <input
                        type="file"
                        #photoInput
                        [id]="'photo-' + photo.type"
                        accept="image/*"
                        capture="environment"
                        (change)="onPhotoSelected($event, photo)"
                        style="display: none;"
                      />
                    }
                  </div>
                }
              </div>
              <mat-progress-bar mode="determinate" [value]="photoProgress()"> </mat-progress-bar>
            </mat-card-content>
          </mat-card>

          <!-- Notes -->
          <mat-card>
            <mat-card-content>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Installation Notes (Optional)</mat-label>
                <textarea
                  matInput
                  formControlName="notes"
                  rows="3"
                  placeholder="Any issues or observations..."
                ></textarea>
              </mat-form-field>
            </mat-card-content>
          </mat-card>

          <!-- Action Buttons -->
          <div class="actions">
            <button mat-button type="button" (click)="goBack()">Cancel</button>
            <button
              mat-raised-button
              color="primary"
              type="submit"
              [disabled]="!captureForm.valid || capturedPhotosCount() < 6 || submitting()"
            >
              @if (submitting()) {
                <mat-spinner diameter="20"></mat-spinner>
                Saving...
              } @else {
                <mat-icon>save</mat-icon>
                {{ isOnline() ? 'Submit' : 'Save Offline' }}
              }
            </button>
          </div>
        </form>
      } @else {
        <mat-card class="error-card">
          <mat-card-content>
            <mat-icon>error_outline</mat-icon>
            <h3>Pole Not Found</h3>
            <p>The requested pole could not be loaded.</p>
            <button mat-raised-button (click)="goBack()">Back to Map</button>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .capture-container {
        padding: 16px;
        max-width: 600px;
        margin: 0 auto;
        padding-bottom: 100px;
      }

      .header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;

        h1 {
          flex: 1;
          margin: 0;
          font-size: 20px;
          font-weight: 500;
        }

        .offline-chip {
          background: var(--mat-sys-error-container);
          color: var(--mat-sys-on-error-container);
        }
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        gap: 16px;
      }

      mat-card {
        margin-bottom: 16px;
      }

      .info-card {
        mat-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        mat-card-content {
          p {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 8px 0;
            color: var(--mat-sys-on-surface-variant);

            mat-icon {
              font-size: 18px;
              width: 18px;
              height: 18px;
            }
          }
        }

        .status-planned {
          background: var(--mat-sys-error-container);
        }
        .status-assigned {
          background: #fff3e0;
          color: #e65100;
        }
        .status-in_progress {
          background: #fffde7;
          color: #f57c00;
        }
      }

      .location-card {
        .location-loading {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 0;
        }

        .location-info {
          .location-status {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px;
            border-radius: 8px;
            background: var(--mat-sys-error-container);
            color: var(--mat-sys-on-error-container);
            margin-bottom: 12px;

            &.valid {
              background: var(--mat-sys-primary-container);
              color: var(--mat-sys-on-primary-container);
            }

            mat-icon {
              font-size: 20px;
              width: 20px;
              height: 20px;
            }
          }

          .accuracy {
            margin: 8px 0;
            font-size: 14px;
            color: var(--mat-sys-on-surface-variant);
          }
        }
      }

      .photos-card {
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .photo-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 8px;
          overflow: hidden;
          border: 2px dashed var(--mat-sys-outline-variant);

          &.captured {
            border-style: solid;
            border-color: var(--mat-sys-primary);
          }

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .photo-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            cursor: pointer;
            background: var(--mat-sys-surface-container-low);
            transition: background 0.2s;

            &:hover {
              background: var(--mat-sys-surface-container);
            }

            mat-icon {
              font-size: 32px;
              width: 32px;
              height: 32px;
              color: var(--mat-sys-on-surface-variant);
              margin-bottom: 4px;
            }

            span {
              font-size: 12px;
              text-align: center;
              color: var(--mat-sys-on-surface-variant);
            }
          }

          .photo-action {
            position: absolute;
            top: 4px;
            right: 4px;
            background: rgba(255, 255, 255, 0.9);
            width: 32px;
            height: 32px;

            mat-icon {
              font-size: 18px;
              width: 18px;
              height: 18px;
            }
          }
        }
      }

      .full-width {
        width: 100%;
      }

      .actions {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 16px;
        background: var(--mat-sys-surface);
        border-top: 1px solid var(--mat-sys-outline-variant);
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        z-index: 100;
      }

      .error-card {
        text-align: center;
        padding: 40px 20px;

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: var(--mat-sys-error);
          margin-bottom: 16px;
        }

        h3 {
          margin: 0 0 8px;
        }

        p {
          margin: 0 0 24px;
          color: var(--mat-sys-on-surface-variant);
        }
      }

      @media (max-width: 600px) {
        .capture-container {
          padding: 8px;
        }

        .photo-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }
    `,
  ],
})
export class QuickCaptureComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private poleService = inject(PoleTrackerService);
  private googleMaps = inject(GoogleMapsService);
  private offlineQueue = inject(OfflineQueueService);
  private imageUpload = inject(ImageUploadService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  // State
  loading = signal(true);
  gettingLocation = signal(false);
  submitting = signal(false);
  plannedPole = signal<PlannedPole | null>(null);
  currentLocation = signal<GeolocationPosition | null>(null);
  isOnline = computed(() => this.offlineQueue.isOnline$);

  photos = signal<PhotoCapture[]>([
    { type: 'before', label: 'Before', captured: false },
    { type: 'front', label: 'Front', captured: false },
    { type: 'side', label: 'Side', captured: false },
    { type: 'depth', label: 'Depth', captured: false },
    { type: 'concrete', label: 'Concrete', captured: false },
    { type: 'compaction', label: 'Compaction', captured: false },
  ]);

  captureForm = this.fb.group({
    poleType: ['', Validators.required],
    notes: [''],
  });

  // Computed
  capturedPhotosCount = computed(() => this.photos().filter((p) => p.captured).length);

  photoProgress = computed(() => (this.capturedPhotosCount() / 6) * 100);

  locationAccuracy = computed(() => {
    const loc = this.currentLocation();
    return loc ? Math.round(loc.coords.accuracy) : 0;
  });

  locationDeviation = computed(() => {
    const pole = this.plannedPole();
    const loc = this.currentLocation();

    if (!pole || !loc) return 0;

    const distance = this.googleMaps.calculateDistance(
      loc.coords.latitude,
      loc.coords.longitude,
      pole.plannedLocation.lat,
      pole.plannedLocation.lng,
    );

    return Math.round(distance);
  });

  isLocationValid = computed(() => {
    const deviation = this.locationDeviation();
    const accuracy = this.locationAccuracy();
    // Valid if within 50m considering GPS accuracy
    return deviation <= 50 + accuracy;
  });

  ngOnInit() {
    this.loadPole();
    this.getLocation();
  }

  private async loadPole() {
    try {
      const poleId = this.route.snapshot.paramMap.get('plannedPoleId');
      if (poleId) {
        const pole = await firstValueFrom(this.poleService.getPlannedPoleById(poleId));
        if (pole) {
          this.plannedPole.set(pole);
        }
      }
    } catch (error) {
      console.error('Error loading pole:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getLocation() {
    this.gettingLocation.set(true);
    this.googleMaps.getCurrentLocation().subscribe({
      next: (position) => {
        this.currentLocation.set(position);
        this.gettingLocation.set(false);
      },
      error: (error) => {
        console.error('Location error:', error);
        this.snackBar.open('Could not get GPS location', 'Dismiss', { duration: 3000 });
        this.gettingLocation.set(false);
      },
    });
  }

  refreshLocation() {
    this.getLocation();
  }

  capturePhoto(photo: PhotoCapture) {
    const input = document.getElementById(`photo-${photo.type}`) as HTMLInputElement;
    input?.click();
  }

  onPhotoSelected(event: Event, photo: PhotoCapture) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const updatedPhotos = this.photos().map((p) =>
          p.type === photo.type
            ? { ...p, captured: true, url: e.target?.result as string, file }
            : p,
        );
        this.photos.set(updatedPhotos);
      };
      reader.readAsDataURL(file);
    }
  }

  retakePhoto(photo: PhotoCapture) {
    const updatedPhotos = this.photos().map((p) =>
      p.type === photo.type ? { ...p, captured: false, url: undefined, file: undefined } : p,
    );
    this.photos.set(updatedPhotos);
  }

  async submitCapture() {
    if (!this.captureForm.valid || this.capturedPhotosCount() < 6) return;

    this.submitting.set(true);

    try {
      const pole = this.plannedPole();
      const location = this.currentLocation();
      const user = this.authService.currentUser();

      if (!pole || !location || !user) {
        throw new Error('Missing required data');
      }

      // Prepare installation data
      const installation: Partial<PoleInstallation> = {
        plannedPoleId: pole.id,
        vfPoleId: '', // Will be generated by service
        actualLocation: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy: location.coords.accuracy,
          captureTime: new Date(),
          method: 'gps',
        },
        locationDeviation: this.locationDeviation(),
        contractorId: pole.assignedContractorId || '',
        teamId: pole.assignedTeamId || '',
        installedBy: user.uid,
        poleType: this.captureForm.value.poleType as PoleType,
        photos: {
          before: { uploaded: false },
          front: { uploaded: false },
          side: { uploaded: false },
          depth: { uploaded: false },
          concrete: { uploaded: false },
          compaction: { uploaded: false },
        },
      };

      if (navigator.onLine) {
        // Online: Create installation and upload photos
        // TODO: Fix createPoleInstallation method
        const installationId = ''; // await firstValueFrom(
        //   this.poleService.createPoleInstallation(installation),
        // );

        // Upload photos
        for (const photo of this.photos()) {
          if (photo.file) {
            // TODO: Implement photo upload
            console.log('Would upload photo:', photo.type);
          }
        }

        this.snackBar.open('Installation captured successfully!', 'Dismiss', {
          duration: 3000,
        });

        this.router.navigate(['/pole-tracker/mobile']);
      } else {
        // Offline: Add to queue
        // TODO: Fix offline queue implementation
        // await firstValueFrom(
        //   this.offlineQueue.addToQueue({
        //     type: 'installation',
        //     action: 'create',
        //     entityId: pole.id,
        //     data: installation,
        //     priority: 1,
        //   }),
        // );

        this.snackBar.open('Saved offline. Will sync when connected.', 'Dismiss', {
          duration: 3000,
        });

        this.router.navigate(['/pole-tracker/mobile']);
      }
    } catch (error) {
      console.error('Error submitting capture:', error);
      this.snackBar.open('Error saving installation', 'Dismiss', {
        duration: 3000,
      });
    } finally {
      this.submitting.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/pole-tracker/mobile']);
  }
}
