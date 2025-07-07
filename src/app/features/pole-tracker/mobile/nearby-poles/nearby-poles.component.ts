import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { PoleTrackerService } from '../../services/pole-tracker.service';
import { PlannedPole } from '../../models/mobile-pole-tracker.model';

interface NearbyPole extends PlannedPole {
  distance: number; // meters
  bearing: number; // degrees
}

@Component({
  selector: 'app-nearby-poles',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    MatDividerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="nearby-container">
      <div class="header">
        <h1>Nearby Poles</h1>
        <button mat-icon-button (click)="refreshLocation()">
          <mat-icon>my_location</mat-icon>
        </button>
      </div>

      @if (locationError()) {
        <mat-card class="error-card">
          <mat-card-content>
            <mat-icon>location_off</mat-icon>
            <h3>Location Access Required</h3>
            <p>{{ locationError() }}</p>
            <button mat-raised-button color="primary" (click)="requestLocation()">
              Enable Location
            </button>
          </mat-card-content>
        </mat-card>
      } @else if (loading()) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Finding nearby poles...</p>
        </div>
      } @else {
        <div class="controls">
          <div class="radius-control">
            <label>Search Radius: {{ searchRadius() }}m</label>
            <mat-slider
              [min]="100"
              [max]="5000"
              [step]="100"
              [discrete]="true"
              [showTickMarks]="true"
              (input)="updateRadius($event)"
            >
              <input matSliderThumb [value]="searchRadius()" />
            </mat-slider>
          </div>
        </div>

        <div class="location-info">
          <mat-icon>location_on</mat-icon>
          <span>Your location (±{{ locationAccuracy() }}m)</span>
        </div>

        <div class="poles-list">
          @for (pole of nearbyPoles(); track pole.id) {
            <mat-card class="pole-card" (click)="navigateToPole(pole)">
              <mat-card-content>
                <div class="pole-header">
                  <div class="pole-info">
                    <h3>{{ pole.clientPoleNumber }}</h3>
                    <p class="distance">{{ formatDistance(pole.distance) }}</p>
                  </div>
                  <div class="pole-direction">
                    <mat-icon [style.transform]="'rotate(' + pole.bearing + 'deg)'">
                      navigation
                    </mat-icon>
                    <span>{{ getCompassDirection(pole.bearing) }}</span>
                  </div>
                </div>

                <div class="pole-details">
                  <p>{{ pole.plannedLocation.address || 'No address available' }}</p>
                  @if (pole.notes) {
                    <p class="notes">{{ pole.notes }}</p>
                  }
                  <div class="pole-status">
                    <mat-icon [color]="getStatusColor(pole.status)">
                      {{ getStatusIcon(pole.status) }}
                    </mat-icon>
                    <span>{{ pole.status | titlecase }}</span>
                  </div>
                </div>

                <div class="pole-actions">
                  @if (pole.status === 'planned' || pole.status === 'assigned') {
                    <button mat-button color="primary" (click)="startCapture(pole, $event)">
                      <mat-icon>camera_alt</mat-icon>
                      Capture
                    </button>
                  }
                  <button mat-button (click)="navigateToMap(pole, $event)">
                    <mat-icon>directions</mat-icon>
                    Navigate
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          } @empty {
            <mat-card class="empty-state">
              <mat-card-content>
                <mat-icon>explore_off</mat-icon>
                <h3>No Poles Nearby</h3>
                <p>No poles found within {{ searchRadius() }}m of your location.</p>
                <p>Try increasing the search radius.</p>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .nearby-container {
        padding: 16px;
        max-width: 600px;
        margin: 0 auto;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;

        h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 500;
        }
      }

      .error-card,
      .empty-state {
        text-align: center;

        mat-card-content {
          padding: 40px !important;
        }

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: var(--mat-sys-on-surface-variant);
          margin-bottom: 16px;
        }

        h3 {
          margin: 0 0 8px;
          color: var(--mat-sys-on-surface);
        }

        p {
          margin: 0 0 16px;
          color: var(--mat-sys-on-surface-variant);
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

      .controls {
        margin-bottom: 20px;
      }

      .radius-control {
        background: var(--mat-sys-surface-container);
        padding: 16px;
        border-radius: 12px;

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }

        mat-slider {
          width: 100%;
        }
      }

      .location-info {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        margin-bottom: 16px;
        color: var(--mat-sys-on-surface-variant);
        font-size: 14px;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .poles-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .pole-card {
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          transform: translateY(-2px);
          box-shadow: var(--mat-sys-elevation-3);
        }
      }

      .pole-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .pole-info {
        h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 500;
        }

        .distance {
          margin: 4px 0 0;
          font-size: 14px;
          color: var(--mat-sys-primary);
          font-weight: 600;
        }
      }

      .pole-direction {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        color: var(--mat-sys-on-surface-variant);

        mat-icon {
          transition: transform 0.3s;
        }

        span {
          font-size: 12px;
          font-weight: 500;
        }
      }

      .pole-details {
        margin-bottom: 16px;

        p {
          margin: 0 0 8px;
          font-size: 14px;
          color: var(--mat-sys-on-surface-variant);
        }

        .notes {
          font-style: italic;
          font-size: 12px;
        }
      }

      .pole-status {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }

        span {
          font-size: 14px;
          font-weight: 500;
        }
      }

      .pole-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      @media (max-width: 480px) {
        .nearby-container {
          padding: 12px;
        }

        .header h1 {
          font-size: 20px;
        }
      }
    `,
  ],
})
export class NearbyPolesComponent implements OnInit, OnDestroy {
  private poleService = inject(PoleTrackerService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  locationError = signal<string | null>(null);
  currentLocation = signal<GeolocationPosition | null>(null);
  locationAccuracy = signal(0);
  searchRadius = signal(1000); // meters
  allPoles = signal<PlannedPole[]>([]);

  private watchId: number | null = null;

  nearbyPoles = computed(() => {
    const location = this.currentLocation();
    const radius = this.searchRadius();

    if (!location) return [];

    return this.allPoles()
      .map((pole) => ({
        ...pole,
        distance: this.calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          pole.plannedLocation.lat,
          pole.plannedLocation.lng,
        ),
        bearing: this.calculateBearing(
          location.coords.latitude,
          location.coords.longitude,
          pole.plannedLocation.lat,
          pole.plannedLocation.lng,
        ),
      }))
      .filter((pole) => pole.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  });

  ngOnInit() {
    this.requestLocation();
    this.loadPoles();
  }

  ngOnDestroy() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }

  async loadPoles() {
    try {
      this.poleService.getAllPlannedPoles().subscribe({
        next: (poles) => {
          this.allPoles.set(poles);
        },
        error: (error) => {
          console.error('Error loading poles:', error);
          this.snackBar.open('Error loading poles', 'Dismiss', { duration: 3000 });
        },
      });
    } catch (error) {
      console.error('Error loading poles:', error);
      this.snackBar.open('Error loading poles', 'Dismiss', { duration: 3000 });
    }
  }

  requestLocation() {
    this.loading.set(true);
    this.locationError.set(null);

    if (!navigator.geolocation) {
      this.locationError.set('Geolocation is not supported by your browser');
      this.loading.set(false);
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentLocation.set(position);
        this.locationAccuracy.set(Math.round(position.coords.accuracy));
        this.loading.set(false);
      },
      (error) => {
        this.loading.set(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.locationError.set('Location permission denied');
            break;
          case error.POSITION_UNAVAILABLE:
            this.locationError.set('Location information unavailable');
            break;
          case error.TIMEOUT:
            this.locationError.set('Location request timed out');
            break;
          default:
            this.locationError.set('An unknown error occurred');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  refreshLocation() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.requestLocation();
  }

  updateRadius(event: any) {
    const value = event?.value || event;
    this.searchRadius.set(Number(value));
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);

    return ((θ * 180) / Math.PI + 360) % 360;
  }

  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  getCompassDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'planned':
      case 'assigned':
        return 'warn';
      case 'in_progress':
        return 'accent';
      case 'installed':
      case 'verified':
        return 'primary';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'planned':
        return 'location_on';
      case 'assigned':
        return 'assignment_ind';
      case 'in_progress':
        return 'engineering';
      case 'installed':
        return 'check_circle';
      case 'verified':
        return 'verified';
      default:
        return 'help_outline';
    }
  }

  navigateToPole(pole: NearbyPole) {
    this.router.navigate(['/pole-tracker/mobile', pole.id]);
  }

  startCapture(pole: NearbyPole, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/pole-tracker/mobile/capture', pole.id]);
  }

  navigateToMap(pole: NearbyPole, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/pole-tracker/mobile'], {
      queryParams: {
        lat: pole.plannedLocation.lat,
        lng: pole.plannedLocation.lng,
        zoom: 18,
      },
    });
  }
}
