import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';

import { OfflineIndicatorComponent } from '../../components/offline-indicator/offline-indicator.component';
import { SyncStatusComponent } from '../../components/sync-status/sync-status.component';
import { GPSAccuracyComponent } from '../../components/gps-accuracy/gps-accuracy.component';
import { OfflinePhotoCaptureComponent } from '../../components/offline-photo-capture/offline-photo-capture.component';

import { OfflinePoleService, OfflinePoleData, OfflinePhoto } from '../../services/offline-pole.service';
import { OfflineSyncService } from '../../services/offline-sync.service';
import { EnhancedGPSService, GPSPosition } from '../../services/enhanced-gps.service';
import { AuthService } from '@app/core/services/auth.service';
import { ProjectService } from '@app/core/services/project.service';
import { Project } from '@app/core/models/project.model';

@Component({
  selector: 'app-offline-capture',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    OfflineIndicatorComponent,
    SyncStatusComponent,
    GPSAccuracyComponent,
    OfflinePhotoCaptureComponent
  ],
  template: `
    <div class="offline-capture-page">
      <!-- Header -->
      <div class="header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Offline Pole Capture</h1>
        <app-offline-indicator></app-offline-indicator>
      </div>

      <!-- GPS Status -->
      <div class="gps-status-bar">
        <app-gps-accuracy [requiredAccuracy]="5"></app-gps-accuracy>
        @if (currentPosition()) {
          <span class="coordinates">
            {{ formatCoordinates(currentPosition()!) }}
          </span>
        }
      </div>

      <!-- Search for Existing Pole -->
      <mat-card class="search-card">
        <mat-card-content>
          <h3>Continue Previous Work?</h3>
          <div class="search-section">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search Pole Number</mat-label>
              <input matInput 
                     [(ngModel)]="searchPoleNumber" 
                     placeholder="e.g., LAW.P.B167"
                     (keyup.enter)="searchForPole()">
              <button matSuffix mat-icon-button (click)="searchForPole()" [disabled]="isSearching()">
                <mat-icon>{{ isSearching() ? 'hourglass_empty' : 'search' }}</mat-icon>
              </button>
            </mat-form-field>
            
            @if (searchResult()) {
              @if (searchResult()!.found) {
                <div class="search-result found">
                  <mat-icon color="primary">check_circle</mat-icon>
                  <div class="result-content">
                    <strong>Found: {{ searchResult()!.pole!.poleNumber }}</strong>
                    <p>{{ searchResult()!.pole!.photos?.length || 0 }} photos captured</p>
                    <p>Status: {{ searchResult()!.pole!.syncStatus }}</p>
                  </div>
                  <button mat-raised-button color="primary" (click)="loadExistingPole(searchResult()!.pole!)">
                    Continue Work
                  </button>
                </div>
              } @else {
                <div class="search-result not-found">
                  <mat-icon color="accent">info</mat-icon>
                  <span>No existing work found for "{{ searchPoleNumber }}". Start new capture below.</span>
                </div>
              }
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Stepper Form -->
      <mat-stepper #stepper linear class="capture-stepper">
        <!-- Step 1: Basic Info -->
        <mat-step [stepControl]="basicInfoForm">
          <form [formGroup]="basicInfoForm">
            <ng-template matStepLabel>Basic Information</ng-template>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Project</mat-label>
              <mat-select formControlName="projectId" required>
                @for (project of projects$ | async; track project.id) {
                  <mat-option [value]="project.id">{{ project.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Pole Number</mat-label>
              <input matInput formControlName="poleNumber" placeholder="e.g., LAW.P.B167">
              <mat-hint>Leave empty to auto-generate</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notes</mat-label>
              <textarea matInput formControlName="notes" rows="3"></textarea>
            </mat-form-field>

            <div class="step-actions">
              <button mat-raised-button matStepperNext color="primary">
                Next
                <mat-icon>arrow_forward</mat-icon>
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Step 2: GPS Location -->
        <mat-step [stepControl]="locationForm">
          <form [formGroup]="locationForm">
            <ng-template matStepLabel>GPS Location</ng-template>
            
            <div class="gps-capture-section">
              @if (!currentPosition()) {
                <button mat-raised-button color="primary" 
                        (click)="captureGPS()" 
                        [disabled]="isCapturingGPS()">
                  <mat-icon>location_on</mat-icon>
                  {{ isCapturingGPS() ? 'Getting GPS...' : 'Capture GPS Location' }}
                </button>
              } @else {
                <mat-card class="gps-result">
                  <mat-card-content>
                    <div class="gps-info">
                      <mat-icon color="primary">location_on</mat-icon>
                      <div>
                        <strong>{{ formatCoordinates(currentPosition()!) }}</strong>
                        <br>
                        <span class="accuracy">
                          Accuracy: {{ formatAccuracy(currentPosition()!.accuracy) }}
                          @if (!isAccuracyAcceptable(currentPosition()!.accuracy)) {
                            <mat-icon color="warn" inline>warning</mat-icon>
                          }
                        </span>
                      </div>
                    </div>
                  </mat-card-content>
                  <mat-card-actions>
                    <button mat-button (click)="recaptureGPS()">
                      <mat-icon>refresh</mat-icon>
                      Recapture
                    </button>
                  </mat-card-actions>
                </mat-card>
              }

              @if (gpsError()) {
                <p class="error-message">
                  <mat-icon>error</mat-icon>
                  {{ gpsError() }}
                </p>
              }
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button matStepperNext color="primary" 
                      [disabled]="!currentPosition()">
                Next
                <mat-icon>arrow_forward</mat-icon>
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Step 3: Photos -->
        <mat-step>
          <ng-template matStepLabel>Capture Photos</ng-template>
          
          <app-offline-photo-capture 
            [existingPhotos]="capturedPhotos()"
            (photosChanged)="onPhotosChanged($event)">
          </app-offline-photo-capture>

          <div class="step-actions">
            <button mat-button matStepperPrevious>Back</button>
            <button mat-raised-button matStepperNext color="primary"
                    [disabled]="!hasAnyPhotos()">
              Next
              <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        </mat-step>

        <!-- Step 4: Review & Save -->
        <mat-step>
          <ng-template matStepLabel>Review & Save</ng-template>
          
          <mat-card class="review-card">
            <mat-card-header>
              <mat-card-title>Review Captured Data</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="review-section">
                <h3>Basic Information</h3>
                <div class="review-item">
                  <span class="label">Project:</span>
                  <span>{{ getProjectName() }}</span>
                </div>
                <div class="review-item">
                  <span class="label">Pole Number:</span>
                  <span>{{ basicInfoForm.get('poleNumber')?.value || 'Auto-generate' }}</span>
                </div>
                @if (basicInfoForm.get('notes')?.value) {
                  <div class="review-item">
                    <span class="label">Notes:</span>
                    <span>{{ basicInfoForm.get('notes')?.value }}</span>
                  </div>
                }
              </div>

              <div class="review-section">
                <h3>GPS Location</h3>
                @if (currentPosition()) {
                  <div class="review-item">
                    <span class="label">Coordinates:</span>
                    <span>{{ formatCoordinates(currentPosition()!) }}</span>
                  </div>
                  <div class="review-item">
                    <span class="label">Accuracy:</span>
                    <span [class.warn]="!isAccuracyAcceptable(currentPosition()!.accuracy)">
                      {{ formatAccuracy(currentPosition()!.accuracy) }}
                    </span>
                  </div>
                }
              </div>

              <div class="review-section">
                <h3>Photos ({{ capturedPhotos().length }})</h3>
                @if (!hasRequiredPhotos()) {
                  <div class="photo-warning">
                    <mat-icon color="warn">warning</mat-icon>
                    <span>Missing required photos: {{ getMissingRequiredPhotos().join(', ') }}</span>
                  </div>
                }
                <div class="photo-summary">
                  @for (photo of capturedPhotos(); track photo.id) {
                    <div class="photo-thumb">
                      <img [src]="photo.data" [alt]="photo.type">
                      <span>{{ photo.type }}</span>
                    </div>
                  }
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <div class="step-actions">
            <button mat-button matStepperPrevious>Back</button>
            <button mat-raised-button color="primary" 
                    (click)="saveOffline()"
                    [disabled]="isSaving()">
              <mat-icon>save</mat-icon>
              {{ isSaving() ? 'Saving...' : 'Save Offline' }}
            </button>
          </div>
        </mat-step>
      </mat-stepper>

      <!-- Sync Status (shown when offline data exists) -->
      @if ((offlinePoleService.offlinePoles$ | async)?.length) {
        <app-sync-status></app-sync-status>
      }
    </div>
  `,
  styles: [`
    .offline-capture-page {
      min-height: 100vh;
      background: var(--mat-sys-background);
    }

    .header {
      display: flex;
      align-items: center;
      padding: 16px;
      background: var(--mat-sys-surface);
      box-shadow: var(--mat-sys-elevation-1);
      
      h1 {
        flex: 1;
        margin: 0 16px;
        font-size: 20px;
      }
    }

    .gps-status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: var(--mat-sys-surface-variant);
      
      .coordinates {
        font-size: 12px;
        color: var(--mat-sys-outline);
      }
    }

    .search-card {
      margin: 16px;
      
      h3 {
        margin-bottom: 16px;
        color: var(--mat-sys-primary);
      }
    }

    .search-section {
      .search-field {
        width: 100%;
        margin-bottom: 16px;
      }
    }

    .search-result {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      margin-top: 8px;
      
      &.found {
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
        
        .result-content {
          flex: 1;
          
          strong {
            display: block;
            margin-bottom: 4px;
          }
          
          p {
            margin: 0;
            font-size: 14px;
            opacity: 0.8;
          }
        }
      }
      
      &.not-found {
        background: var(--mat-sys-secondary-container);
        color: var(--mat-sys-on-secondary-container);
      }
    }

    .capture-stepper {
      margin: 16px;
      background: transparent;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .step-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .gps-capture-section {
      min-height: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .gps-result {
      width: 100%;
      
      .gps-info {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        
        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
        }
        
        .accuracy {
          color: var(--mat-sys-outline);
          font-size: 14px;
          
          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
            vertical-align: middle;
          }
        }
      }
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--mat-sys-error);
      
      mat-icon {
        font-size: 20px;
      }
    }

    .review-card {
      margin-bottom: 24px;
    }

    .review-section {
      margin-bottom: 24px;
      
      h3 {
        margin-bottom: 12px;
        color: var(--mat-sys-primary);
      }
      
      &:last-child {
        margin-bottom: 0;
      }
    }

    .review-item {
      display: flex;
      gap: 12px;
      margin-bottom: 8px;
      
      .label {
        font-weight: 500;
        min-width: 120px;
      }
      
      .warn {
        color: var(--mat-sys-error);
      }
    }

    .photo-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      margin-bottom: 16px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      border-radius: 8px;
      font-size: 14px;
      
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .photo-summary {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 8px;
      
      .photo-thumb {
        text-align: center;
        
        img {
          width: 100%;
          height: 80px;
          object-fit: cover;
          border-radius: 4px;
        }
        
        span {
          display: block;
          font-size: 11px;
          margin-top: 4px;
        }
      }
    }

    @media (max-width: 600px) {
      .capture-stepper {
        margin: 8px;
      }
    }
  `]
})
export class OfflineCaptureComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  
  offlinePoleService = inject(OfflinePoleService);
  private offlineSyncService = inject(OfflineSyncService);
  private gpsService = inject(EnhancedGPSService);
  
  projects$ = this.projectService.getProjects();
  projects: Project[] = [];
  
  basicInfoForm = this.fb.group({
    projectId: ['', Validators.required],
    poleNumber: [''],
    notes: ['']
  });
  
  locationForm = this.fb.group({
    latitude: [0, Validators.required],
    longitude: [0, Validators.required],
    accuracy: [0, Validators.required]
  });
  
  currentPosition = signal<GPSPosition | null>(null);
  capturedPhotos = signal<OfflinePhoto[]>([]);
  isCapturingGPS = signal(false);
  gpsError = signal<string | null>(null);
  isSaving = signal(false);
  
  // Search functionality
  searchPoleNumber = '';
  isSearching = signal(false);
  searchResult = signal<{ found: boolean; pole?: OfflinePoleData } | null>(null);
  
  // Auto-save functionality
  currentDraftId = signal<string | null>(null);
  isAutoSaving = signal(false);
  lastAutoSave = signal<Date | null>(null);
  
  private subscriptions: Subscription[] = [];

  ngOnInit() {
    // Subscribe to projects
    const projectSub = this.projects$.subscribe(projects => {
      this.projects = projects || [];
    });
    this.subscriptions.push(projectSub);
    
    // Pre-fill project if provided in route
    const projectId = this.route.snapshot.queryParamMap.get('projectId');
    if (projectId) {
      this.basicInfoForm.patchValue({ projectId });
    }

    // Setup auto-save on form changes
    const formChangeSub = this.basicInfoForm.valueChanges.subscribe(() => {
      this.autoSaveDraft();
    });
    this.subscriptions.push(formChangeSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.gpsService.stopWatching();
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  async captureGPS(): Promise<void> {
    this.isCapturingGPS.set(true);
    this.gpsError.set(null);
    
    try {
      const position = await this.gpsService.getCurrentPosition({
        requiredAccuracy: 5,
        maxAttempts: 5
      });
      
      this.currentPosition.set(position);
      this.locationForm.patchValue({
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy
      });
      
      if (!this.isAccuracyAcceptable(position.accuracy)) {
        this.snackBar.open(
          `GPS accuracy ${this.formatAccuracy(position.accuracy)} exceeds required 5m`,
          'OK',
          { duration: 5000 }
        );
      }

      // Auto-save after GPS capture
      this.autoSaveDraft();
    } catch (error) {
      this.gpsError.set(error instanceof Error ? error.message : 'Failed to get GPS location');
    } finally {
      this.isCapturingGPS.set(false);
    }
  }

  recaptureGPS(): void {
    this.currentPosition.set(null);
    this.captureGPS();
  }

  formatCoordinates(position: GPSPosition): string {
    return this.gpsService.formatCoordinates(position);
  }

  formatAccuracy(accuracy: number): string {
    return this.gpsService.formatAccuracy(accuracy);
  }

  isAccuracyAcceptable(accuracy: number): boolean {
    return this.gpsService.isAccuracyAcceptable(accuracy, 5);
  }

  onPhotosChanged(photos: OfflinePhoto[]): void {
    this.capturedPhotos.set(photos);
    
    // Auto-save when photos change
    this.autoSaveDraft();
  }

  hasRequiredPhotos(): boolean {
    const requiredTypes = ['before', 'front', 'side'];
    const capturedTypes = new Set(this.capturedPhotos().map(p => p.type));
    const hasAllRequired = requiredTypes.every(type => capturedTypes.has(type as any));
    
    // Debug log to help troubleshoot
    console.log('Required photos check:', {
      requiredTypes,
      capturedTypes: Array.from(capturedTypes),
      capturedPhotos: this.capturedPhotos(),
      hasAllRequired
    });
    
    return hasAllRequired;
  }

  hasAnyPhotos(): boolean {
    return this.capturedPhotos().length > 0;
  }

  getMissingRequiredPhotos(): string[] {
    const requiredTypes = ['before', 'front', 'side'];
    const capturedTypes = new Set(this.capturedPhotos().map(p => p.type));
    return requiredTypes.filter(type => !capturedTypes.has(type as any));
  }

  async searchForPole(): Promise<void> {
    if (!this.searchPoleNumber.trim()) {
      this.snackBar.open('Please enter a pole number to search', 'OK', { duration: 3000 });
      return;
    }

    this.isSearching.set(true);
    this.searchResult.set(null);

    try {
      // Search in offline storage
      const offlinePoles = await this.getOfflinePoles();
      const foundPole = offlinePoles.find(pole => 
        pole.poleNumber?.toLowerCase().includes(this.searchPoleNumber.toLowerCase()) ||
        pole.id.includes(this.searchPoleNumber)
      );

      if (foundPole) {
        this.searchResult.set({ found: true, pole: foundPole });
      } else {
        this.searchResult.set({ found: false });
      }
    } catch (error) {
      console.error('Error searching for pole:', error);
      this.snackBar.open('Error searching for pole', 'OK', { duration: 3000 });
      this.searchResult.set({ found: false });
    } finally {
      this.isSearching.set(false);
    }
  }

  loadExistingPole(pole: OfflinePoleData): void {
    // Set the current draft ID
    this.currentDraftId.set(pole.id);
    
    // Load the existing pole data into the form
    this.basicInfoForm.patchValue({
      projectId: pole.projectId || '',
      poleNumber: pole.poleNumber || '',
      notes: pole.notes || ''
    });

    // Load GPS location if available
    if (pole.gpsLocation) {
      this.currentPosition.set({
        latitude: pole.gpsLocation.latitude,
        longitude: pole.gpsLocation.longitude,
        accuracy: pole.gpsAccuracy || 0,
        timestamp: pole.capturedAt?.getTime() || Date.now()
      });
      
      this.locationForm.patchValue({
        latitude: pole.gpsLocation.latitude,
        longitude: pole.gpsLocation.longitude,
        accuracy: pole.gpsAccuracy || 0
      });
    }

    // Load captured photos
    if (pole.photos) {
      this.capturedPhotos.set(pole.photos);
    }

    this.snackBar.open(`Loaded existing work for ${pole.poleNumber}`, 'OK', { duration: 3000 });
    
    // Clear search
    this.searchPoleNumber = '';
    this.searchResult.set(null);
  }

  private async getOfflinePoles(): Promise<OfflinePoleData[]> {
    return new Promise((resolve) => {
      const subscription = this.offlinePoleService.offlinePoles$.subscribe(poles => {
        resolve(poles);
        subscription.unsubscribe();
      });
    });
  }

  private autoSaveTimeout?: number;

  async autoSaveDraft(): Promise<void> {
    // Debounce auto-save to avoid too many saves
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = window.setTimeout(async () => {
      await this.performAutoSave();
    }, 2000); // Save after 2 seconds of inactivity
  }

  private async performAutoSave(): Promise<void> {
    if (this.isAutoSaving()) return; // Prevent concurrent saves
    
    const formValue = this.basicInfoForm.value;
    
    // Only auto-save if we have some meaningful data
    if (!formValue.projectId && !formValue.poleNumber && !formValue.notes) {
      return;
    }

    this.isAutoSaving.set(true);

    try {
      const user = await this.authService.getCurrentUser();
      const position = this.currentPosition();
      
      const draftData: Partial<OfflinePoleData> = {
        projectId: formValue.projectId || undefined,
        poleNumber: formValue.poleNumber || undefined,
        notes: formValue.notes || undefined,
        capturedBy: user?.uid || 'offline_user',
        status: 'draft'
      };

      if (position) {
        draftData.gpsLocation = {
          latitude: position.latitude,
          longitude: position.longitude
        };
        draftData.gpsAccuracy = position.accuracy;
      }

      if (this.currentDraftId()) {
        // Update existing draft
        await this.offlinePoleService.updatePoleOffline(
          this.currentDraftId()!,
          draftData,
          this.capturedPhotos()
        );
      } else {
        // Create new draft
        const draftId = await this.offlinePoleService.storeDraftPole(
          draftData as any,
          this.capturedPhotos()
        );
        this.currentDraftId.set(draftId);
      }

      this.lastAutoSave.set(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      this.isAutoSaving.set(false);
    }
  }

  getProjectName(): string {
    const projectId = this.basicInfoForm.get('projectId')?.value;
    if (!projectId) return 'Not selected';
    
    // Get the selected project name from the projects list
    const selectedProject = this.projects.find(p => p.id === projectId);
    return selectedProject?.name || projectId;
  }

  async saveOffline(): Promise<void> {
    if (!this.basicInfoForm.valid || !this.locationForm.valid || !this.hasRequiredPhotos()) {
      this.snackBar.open('Please complete all required fields', 'OK', { duration: 3000 });
      return;
    }
    
    this.isSaving.set(true);
    
    try {
      const user = await this.authService.getCurrentUser();
      const position = this.currentPosition();
      
      if (!position) {
        throw new Error('No GPS position captured');
      }

      if (this.currentDraftId()) {
        // Update the existing draft with final data
        const finalData: Partial<OfflinePoleData> = {
          projectId: this.basicInfoForm.get('projectId')!.value!,
          poleNumber: this.basicInfoForm.get('poleNumber')?.value || undefined,
          notes: this.basicInfoForm.get('notes')?.value || undefined,
          gpsLocation: {
            latitude: position.latitude,
            longitude: position.longitude
          },
          gpsAccuracy: position.accuracy,
          capturedBy: user?.uid || 'offline_user',
          capturedAt: new Date(),
          status: 'captured'
        };
        
        await this.offlinePoleService.updatePoleOffline(
          this.currentDraftId()!,
          finalData,
          this.capturedPhotos()
        );
        
        // Promote draft to pending for sync
        await this.offlinePoleService.promoteDraftToPending(this.currentDraftId()!);
      } else {
        // No draft exists, create new pole directly
        const poleData: Partial<OfflinePoleData> = {
          projectId: this.basicInfoForm.get('projectId')!.value!,
          poleNumber: this.basicInfoForm.get('poleNumber')?.value || undefined,
          notes: this.basicInfoForm.get('notes')?.value || undefined,
          gpsLocation: {
            latitude: position.latitude,
            longitude: position.longitude
          },
          gpsAccuracy: position.accuracy,
          capturedBy: user?.uid || 'offline_user',
          capturedAt: new Date(),
          status: 'captured'
        };
        
        await this.offlinePoleService.storePoleOffline(
          poleData,
          this.capturedPhotos()
        );
      }
      
      this.snackBar.open(
        navigator.onLine 
          ? 'Pole saved offline. Will sync automatically.'
          : 'Pole saved offline. Will sync when connection is restored.',
        'OK',
        { duration: 5000 }
      );
      
      // Reset form and draft
      this.basicInfoForm.reset();
      this.locationForm.reset();
      this.currentPosition.set(null);
      this.capturedPhotos.set([]);
      this.currentDraftId.set(null);
      
      // Navigate to offline list or back
      this.router.navigate(['../'], { relativeTo: this.route });
    } catch (error) {
      console.error('Error saving offline:', error);
      this.snackBar.open(
        'Failed to save pole data offline',
        'OK',
        { duration: 3000 }
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}