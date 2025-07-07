import {
  Component,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { GoogleMapsService } from '../../services/google-maps.service';
import { PoleTrackerService } from '../../services/pole-tracker.service';
import { PlannedPole } from '../../models/mobile-pole-tracker.model';
import { Subject, takeUntil } from 'rxjs';
// import { MarkerClusterer } from '@googlemaps/markerclusterer';

// Declare google namespace
declare const google: any;

interface MapPole extends PlannedPole {
  marker?: any; // google.maps.Marker
}

@Component({
  selector: 'app-mobile-map-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatBottomSheetModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatBadgeModule,
  ],
  template: `
    <div class="map-container">
      @if (loading()) {
        <div class="loading-overlay">
          <mat-spinner></mat-spinner>
          <p>Loading map...</p>
        </div>
      }

      <div #mapElement class="map-element"></div>

      <!-- Map Controls -->
      <div class="map-controls">
        <div class="filter-chips">
          <mat-chip-set>
            <mat-chip
              [class.mat-chip-selected]="filterStatus() === 'all'"
              (click)="setFilter('all')"
            >
              All
              <span class="chip-count">{{ allPoles().length }}</span>
            </mat-chip>
            <mat-chip
              [class.mat-chip-selected]="filterStatus() === 'assigned'"
              (click)="setFilter('assigned')"
            >
              Assigned
              <span class="chip-count">{{ assignedPoles().length }}</span>
            </mat-chip>
            <mat-chip
              [class.mat-chip-selected]="filterStatus() === 'installed'"
              (click)="setFilter('installed')"
            >
              Installed
              <span class="chip-count">{{ installedPoles().length }}</span>
            </mat-chip>
          </mat-chip-set>
        </div>
      </div>

      <!-- Floating Action Buttons -->
      <div class="fab-container">
        <button mat-fab color="primary" (click)="navigateToCapture()">
          <mat-icon>camera_alt</mat-icon>
        </button>
        <button mat-mini-fab (click)="centerOnUser()">
          <mat-icon>my_location</mat-icon>
        </button>
        <button mat-mini-fab (click)="refreshPoles()">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      <!-- Selected Pole Card -->
      @if (selectedPole()) {
        <div class="pole-info-card">
          <mat-card>
            <mat-card-header>
              <mat-card-title>{{ selectedPole()!.clientPoleNumber }}</mat-card-title>
              <button mat-icon-button (click)="clearSelection()">
                <mat-icon>close</mat-icon>
              </button>
            </mat-card-header>
            <mat-card-content>
              <div class="pole-details">
                <p>
                  <strong>Status:</strong>
                  <span [class]="'status-' + selectedPole()!.status">
                    {{ selectedPole()!.status | titlecase }}
                  </span>
                </p>
                @if (selectedPole()!.plannedLocation.address) {
                  <p><strong>Address:</strong> {{ selectedPole()!.plannedLocation.address }}</p>
                }
                @if (selectedPole()!.notes) {
                  <p><strong>Notes:</strong> {{ selectedPole()!.notes }}</p>
                }
                @if (selectedPole()!.assignedContractorName) {
                  <p><strong>Contractor:</strong> {{ selectedPole()!.assignedContractorName }}</p>
                }
              </div>
            </mat-card-content>
            <mat-card-actions>
              @if (selectedPole()!.status === 'planned' || selectedPole()!.status === 'assigned') {
                <button mat-raised-button color="primary" (click)="captureSelectedPole()">
                  <mat-icon>camera_alt</mat-icon>
                  Capture
                </button>
              }
              <button mat-button (click)="getDirections()">
                <mat-icon>directions</mat-icon>
                Navigate
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      }

      <!-- Stats Badge -->
      <div class="stats-badge">
        <mat-icon>place</mat-icon>
        {{ visiblePoles().length }} poles
      </div>
    </div>
  `,
  styles: [
    `
      .map-container {
        position: relative;
        height: 100vh;
        width: 100%;
        overflow: hidden;
      }

      .map-element {
        width: 100%;
        height: 100%;
      }

      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.9);
        z-index: 1000;

        p {
          margin-top: 16px;
          color: var(--mat-sys-on-surface-variant);
        }
      }

      .map-controls {
        position: absolute;
        top: 16px;
        left: 16px;
        right: 16px;
        z-index: 100;
      }

      .filter-chips {
        background: rgba(255, 255, 255, 0.95);
        padding: 8px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

        mat-chip-set {
          display: flex;
          gap: 8px;
          flex-wrap: nowrap;
          overflow-x: auto;
        }

        mat-chip {
          position: relative;

          .chip-count {
            margin-left: 4px;
            font-weight: 600;
            color: var(--mat-sys-primary);
          }
        }
      }

      .fab-container {
        position: absolute;
        bottom: 100px;
        right: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 100;
      }

      .pole-info-card {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 200;
        animation: slideUp 0.3s ease-out;

        mat-card {
          margin: 16px;
          max-height: 300px;
          overflow-y: auto;
        }

        mat-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
        }

        .pole-details {
          p {
            margin: 8px 0;
            font-size: 14px;
          }

          .status-planned {
            color: var(--mat-sys-error);
          }
          .status-assigned {
            color: #ff9800;
          }
          .status-in_progress {
            color: #ffc107;
          }
          .status-installed {
            color: var(--mat-sys-primary);
          }
          .status-verified {
            color: #2196f3;
          }
        }

        mat-card-actions {
          display: flex;
          gap: 8px;
          padding: 8px 16px;
        }
      }

      .stats-badge {
        position: absolute;
        top: 80px;
        left: 16px;
        background: rgba(255, 255, 255, 0.95);
        padding: 8px 12px;
        border-radius: 20px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        font-weight: 500;
        z-index: 100;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }

      @keyframes slideUp {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }

      @media (max-width: 600px) {
        .map-controls {
          top: 8px;
          left: 8px;
          right: 8px;
        }

        .fab-container {
          bottom: 80px;
          right: 12px;
        }

        .pole-info-card mat-card {
          margin: 8px;
        }
      }
    `,
  ],
})
export class MobileMapViewComponent implements OnInit, OnDestroy {
  @ViewChild('mapElement', { static: true }) mapElement!: ElementRef<HTMLElement>;

  private googleMaps = inject(GoogleMapsService);
  private poleService = inject(PoleTrackerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private bottomSheet = inject(MatBottomSheet);
  private destroy$ = new Subject<void>();

  // State
  map: any = null; // google.maps.Map
  markerClusterer: any = null; // MarkerClusterer
  loading = signal(true);
  allPoles = signal<MapPole[]>([]);
  selectedPole = signal<MapPole | null>(null);
  filterStatus = signal<'all' | 'assigned' | 'installed'>('all');
  userLocation = signal<GeolocationPosition | null>(null);
  userMarker: any = null; // google.maps.Marker
  watchId: number = -1;

  // Computed
  assignedPoles = computed(() =>
    this.allPoles().filter((p) => p.status === 'assigned' || p.status === 'planned'),
  );

  installedPoles = computed(() =>
    this.allPoles().filter((p) => p.status === 'installed' || p.status === 'verified'),
  );

  visiblePoles = computed(() => {
    const filter = this.filterStatus();
    if (filter === 'all') return this.allPoles();
    if (filter === 'assigned') return this.assignedPoles();
    return this.installedPoles();
  });

  ngOnInit() {
    this.initializeMap();
    this.loadPoles();
    this.startLocationTracking();
    this.handleQueryParams();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.googleMaps.stopWatchingLocation(this.watchId);
  }

  private initializeMap(): void {
    this.googleMaps.apiLoaded$.pipe(takeUntil(this.destroy$)).subscribe((loaded) => {
      if (loaded) {
        this.createMap();
      } else {
        console.error('Failed to load Google Maps API');
        this.loading.set(false);
      }
    });
  }

  private createMap(): void {
    const mapConfig = {
      center: { lat: -26.2041, lng: 28.0473 }, // Default to Johannesburg
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy' as const,
    };

    this.map = this.googleMaps.createMap(this.mapElement.nativeElement, mapConfig);

    if (this.map) {
      this.googleMaps.addLocationControl(this.map);
      this.loading.set(false);
    }
  }

  private loadPoles(): void {
    this.poleService
      .getAllPlannedPoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (poles) => {
          this.allPoles.set(poles);
          this.displayPoles();
        },
        error: (error) => {
          console.error('Error loading poles:', error);
        },
      });
  }

  private displayPoles(): void {
    if (!this.map) return;

    // Clear existing marker clusterer
    if (this.markerClusterer) {
      this.markerClusterer.clearMarkers();
      this.markerClusterer = null;
    }

    // Clear existing markers
    this.allPoles().forEach((pole) => {
      if (pole.marker) {
        pole.marker.setMap(null);
        pole.marker = undefined;
      }
    });

    // Add markers for visible poles
    const markers: any[] = []; // google.maps.Marker[]

    this.visiblePoles().forEach((pole) => {
      const marker = this.googleMaps.createMarker(this.map!, {
        position: {
          lat: pole.plannedLocation.lat,
          lng: pole.plannedLocation.lng,
        },
        title: pole.clientPoleNumber,
        icon: this.googleMaps.getMarkerIcon(pole.status),
        data: pole,
      });

      marker.addListener('click', () => {
        this.selectPole(pole);
      });

      pole.marker = marker;
      markers.push(marker);
    });

    // Create marker clusterer for better performance
    if (markers.length > 0) {
      this.markerClusterer = this.googleMaps.createMarkerClusterer(this.map!, markers, {
        // Custom options for pole tracking
        algorithm: {
          maxZoom: 16, // Don't cluster at street level
          radius: 60, // Tighter clusters for poles
        },
      });

      // Fit bounds to show all markers
      if (!this.userLocation()) {
        this.googleMaps.fitBounds(this.map, markers);
      }
    }
  }

  private startLocationTracking(): void {
    this.watchId = this.googleMaps.watchLocation(
      (position) => {
        this.userLocation.set(position);
        this.updateUserMarker(position);
      },
      (error) => {
        console.error('Location error:', error);
      },
    );
  }

  private updateUserMarker(position: GeolocationPosition): void {
    if (!this.map) return;

    const pos = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    if (this.userMarker) {
      this.userMarker.setPosition(pos);
    } else {
      this.userMarker = this.googleMaps.createMarker(this.map, {
        position: pos,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
    }
  }

  private handleQueryParams(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['lat'] && params['lng']) {
        const lat = parseFloat(params['lat']);
        const lng = parseFloat(params['lng']);
        const zoom = params['zoom'] ? parseInt(params['zoom']) : 17;

        if (this.map) {
          this.map.setCenter({ lat, lng });
          this.map.setZoom(zoom);
        }
      }
    });
  }

  setFilter(status: 'all' | 'assigned' | 'installed'): void {
    this.filterStatus.set(status);
    this.displayPoles();
  }

  selectPole(pole: MapPole): void {
    this.selectedPole.set(pole);

    if (this.map && pole.marker) {
      this.map.panTo(pole.marker.getPosition()!);
      this.map.setZoom(17);
    }
  }

  clearSelection(): void {
    this.selectedPole.set(null);
  }

  centerOnUser(): void {
    const location = this.userLocation();
    if (location && this.map) {
      this.map.setCenter({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      this.map.setZoom(17);
    } else {
      this.googleMaps.getCurrentLocation().subscribe({
        next: (position) => {
          if (this.map) {
            this.map.setCenter({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            this.map.setZoom(17);
          }
        },
        error: () => {
          console.error('Could not get current location');
        },
      });
    }
  }

  refreshPoles(): void {
    this.loadPoles();
  }

  navigateToCapture(): void {
    this.router.navigate(['/pole-tracker/mobile/capture']);
  }

  captureSelectedPole(): void {
    const pole = this.selectedPole();
    if (pole) {
      this.router.navigate(['/pole-tracker/mobile/capture', pole.id]);
    }
  }

  getDirections(): void {
    const pole = this.selectedPole();
    const userLoc = this.userLocation();

    if (pole && userLoc) {
      const origin = `${userLoc.coords.latitude},${userLoc.coords.longitude}`;
      const destination = `${pole.plannedLocation.lat},${pole.plannedLocation.lng}`;
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
      window.open(url, '_blank');
    }
  }
}
