import { Component, inject, signal, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
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
import { GPSAccuracyComponent } from '../../components/gps-accuracy/gps-accuracy.component';
import { OfflinePhotoCaptureComponent } from '../../components/offline-photo-capture/offline-photo-capture.component';
import { StagingSyncUiComponent } from '../../components/staging-sync-ui/staging-sync-ui';

import { OfflinePoleService, OfflinePoleData, OfflinePhoto } from '../../services/offline-pole.service';
import { OfflineSyncService } from '../../services/offline-sync.service';
import { EnhancedGPSService, GPSPosition } from '../../services/enhanced-gps.service';
import { AuthService } from '@app/core/services/auth.service';
import { ProjectService } from '@app/core/services/project.service';
import { Project } from '@app/core/models/project.model';
import { NavigationRestrictionService } from '@app/core/services/navigation-restriction.service';

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
    GPSAccuracyComponent,
    OfflinePhotoCaptureComponent,
    StagingSyncUiComponent
  ],
  template: `
    <div class="offline-capture-page">
      <!-- Header -->
      <div class="header">
        @if (!isFieldWorker()) {
          <button mat-icon-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
          </button>
        } @else {
          <div class="header-spacer"></div>
        }
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
                    
                    <!-- Photo Status Summary -->
                    @if (searchResult()!.pole!.photos && searchResult()!.pole!.photos.length > 0) {
                      <div class="photo-status-summary">
                        @for (photoType of photoTypes; track photoType.type) {
                          <div class="photo-status-item" 
                               [class.captured]="hasPhotoInPole(searchResult()!.pole!, photoType.type)">
                            <mat-icon>{{ hasPhotoInPole(searchResult()!.pole!, photoType.type) ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                            <span>{{ photoType.label }}</span>
                          </div>
                        }
                      </div>
                    }
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
                @if (gpsPermissionState() === 'denied') {
                  <mat-card class="permission-denied-card">
                    <mat-card-content>
                      <div class="permission-info">
                        <mat-icon color="warn">location_disabled</mat-icon>
                        <div>
                          <h3>Location Permission Required</h3>
                          <p>To capture GPS location, please enable location services:</p>
                          
                          @if (isIOS()) {
                            <div class="ios-instructions">
                              <h4>For Chrome on iPhone/iPad:</h4>
                              <ol>
                                <li>Go to iPhone <strong>Settings</strong> → <strong>Privacy & Security</strong> → <strong>Location Services</strong></li>
                                <li>Make sure Location Services is ON</li>
                                <li>Find <strong>Chrome</strong> in the app list and tap it</li>
                                <li>Select <strong>"While Using App"</strong> or <strong>"Always"</strong></li>
                                <li>Return to Chrome and tap "Check Again" below</li>
                              </ol>
                              <p class="help-text">If location is already enabled for Chrome, try:</p>
                              <ul>
                                <li>Pull down to refresh this page</li>
                                <li>Close Chrome completely (swipe up and remove from app switcher)</li>
                                <li>Reopen Chrome and try again</li>
                                <li>Check Chrome Settings → Site Settings → Location (should be "Ask First")</li>
                                <li>Try clearing Chrome's cache: Chrome Settings → Privacy → Clear Browsing Data</li>
                              </ul>
                              <p class="chrome-note"><strong>Note:</strong> Chrome on iOS requires location permission in iPhone Settings, not just in the browser.</p>
                            </div>
                          } @else {
                            <ol>
                              <li>Click the <mat-icon inline>lock</mat-icon> or <mat-icon inline>info</mat-icon> icon in your browser's address bar</li>
                              <li>Find "Location" or "Permissions"</li>
                              <li>Change from "Block" to "Allow"</li>
                              <li>Refresh this page</li>
                            </ol>
                            <p class="help-text">Or go to your browser settings → Site settings → Location</p>
                          }
                        </div>
                      </div>
                    </mat-card-content>
                    <mat-card-actions>
                      <button mat-raised-button color="primary" (click)="checkGPSPermission()">
                        <mat-icon>refresh</mat-icon>
                        Check Again
                      </button>
                    </mat-card-actions>
                  </mat-card>
                } @else {
                  <div class="gps-capture-options">
                    <button mat-raised-button color="primary" 
                            (click)="captureGPS()" 
                            [disabled]="isCapturingGPS()">
                      <mat-icon>location_on</mat-icon>
                      {{ isCapturingGPS() ? 'Getting GPS...' : 'Capture GPS Location' }}
                    </button>
                    
                    @if (isIOS() && gpsError()) {
                      <p class="ios-help">Having trouble? Try these options:</p>
                      <button mat-stroked-button 
                              (click)="requestPermissionDirectly()"
                              [disabled]="isCapturingGPS()">
                        <mat-icon>settings</mat-icon>
                        Request Permission Again
                      </button>
                      <button mat-stroked-button 
                              (click)="tryWithLowerAccuracy()"
                              [disabled]="isCapturingGPS()">
                        <mat-icon>gps_not_fixed</mat-icon>
                        Try Lower Accuracy
                      </button>
                    }
                  </div>
                }
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

              @if (gpsError() && gpsPermissionState() !== 'denied') {
                <mat-card class="error-card">
                  <mat-card-content>
                    <p class="error-message">
                      <mat-icon>error</mat-icon>
                      {{ gpsError() }}
                    </p>
                    @if (isIOS()) {
                      <p class="debug-info">
                        <strong>Debug Info:</strong><br>
                        Permission State: {{ gpsPermissionState() }}<br>
                        User Agent: iOS Device<br>
                        GPS Available: {{ isGPSAvailable() ? 'Yes' : 'No' }}
                      </p>
                    }
                  </mat-card-content>
                </mat-card>
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
                @if (capturedPhotos().length === 0) {
                  <div class="photo-info">
                    <mat-icon color="accent">info</mat-icon>
                    <span>No photos captured yet. You can add photos later.</span>
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

      <!-- Staging Sync UI (shown when offline data exists) -->
      @if ((offlinePoleService.offlinePoles$ | async)?.length) {
        <app-staging-sync-ui (syncCompleted)="onSyncCompleted()"></app-staging-sync-ui>
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
      
      .header-spacer {
        width: 40px; // Same width as the back button
        height: 40px;
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

    .photo-status-summary {
      margin-top: 12px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      
      .photo-status-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: var(--mat-sys-outline);
        }
        
        &.captured {
          mat-icon {
            color: var(--mat-sys-primary);
          }
          
          span {
            font-weight: 500;
          }
        }
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

    .gps-capture-options {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      
      .ios-help {
        margin: 16px 0 8px 0;
        color: var(--mat-sys-outline);
        font-size: 14px;
        text-align: center;
      }
      
      button {
        min-width: 200px;
      }
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

    .permission-denied-card {
      width: 100%;
      max-width: 500px;
      
      .permission-info {
        display: flex;
        gap: 16px;
        
        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
        }
        
        h3 {
          margin: 0 0 12px 0;
          color: var(--mat-sys-error);
        }
        
        p {
          margin: 0 0 12px 0;
        }
        
        ol {
          margin: 0 0 12px 0;
          padding-left: 20px;
          
          li {
            margin-bottom: 8px;
            
            mat-icon {
              font-size: 16px;
              width: 16px;
              height: 16px;
              vertical-align: middle;
            }
          }
        }
        
        .help-text {
          font-size: 14px;
          color: var(--mat-sys-outline);
          font-style: italic;
        }
      }
      
      mat-card-actions {
        padding-top: 0;
      }
    }

    .ios-instructions {
      h4 {
        margin: 12px 0 8px 0;
        color: var(--mat-sys-primary);
      }
      
      ul {
        margin: 8px 0;
        padding-left: 20px;
      }
      
      .chrome-note {
        margin-top: 12px;
        padding: 12px;
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
        border-radius: 8px;
        font-size: 14px;
      }
    }

    .error-card {
      width: 100%;
      margin-top: 16px;
      
      .debug-info {
        margin-top: 12px;
        padding: 12px;
        background: var(--mat-sys-surface-variant);
        border-radius: 4px;
        font-size: 12px;
        font-family: monospace;
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

    .photo-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      margin-bottom: 16px;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
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
  private navigationRestrictionService = inject(NavigationRestrictionService);
  
  offlinePoleService = inject(OfflinePoleService);
  private offlineSyncService = inject(OfflineSyncService);
  private gpsService = inject(EnhancedGPSService);
  
  @ViewChild('stepper') stepper!: MatStepper;
  
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
  gpsPermissionState = signal<PermissionState>('prompt');
  
  // Search functionality
  searchPoleNumber = '';
  isSearching = signal(false);
  searchResult = signal<{ found: boolean; pole?: OfflinePoleData } | null>(null);
  
  // Auto-save functionality
  currentDraftId = signal<string | null>(null);
  isAutoSaving = signal(false);
  lastAutoSave = signal<Date | null>(null);
  
  // Photo types for status display
  photoTypes: Array<{ type: string; label: string }> = [
    { type: 'before', label: 'Before' },
    { type: 'front', label: 'Front' },
    { type: 'side', label: 'Side' },
    { type: 'depth', label: 'Depth' },
    { type: 'concrete', label: 'Concrete' },
    { type: 'compaction', label: 'Compaction' }
  ];
  
  // Field worker detection
  isFieldWorker = signal(false);
  
  private subscriptions: Subscription[] = [];

  ngOnInit() {
    // Check if user is a field worker
    this.checkFieldWorkerStatus();
    
    // Initialize navigation restrictions for field workers
    if (this.authService.getCurrentUserProfile()?.userGroup === 'technician') {
      this.navigationRestrictionService.initializeRestrictions();
      this.navigationRestrictionService.disableNavigationForFieldWorkers();
    }
    
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

    // Check GPS permission on load
    this.checkGPSPermission();
  }

  private async checkFieldWorkerStatus(): Promise<void> {
    const userProfile = this.authService.getCurrentUserProfile();
    const isFieldWorker = userProfile?.userGroup === 'technician';
    this.isFieldWorker.set(isFieldWorker);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.gpsService.stopWatching();
  }

  goBack(): void {
    // Field workers cannot navigate away
    if (this.isFieldWorker()) {
      this.snackBar.open('Navigation is restricted for field workers', 'OK', {
        duration: 3000
      });
      return;
    }
    
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  private resetForm(): void {
    this.basicInfoForm.reset();
    this.locationForm.reset();
    this.currentPosition.set(null);
    this.capturedPhotos.set([]);
    this.currentDraftId.set(null);
    this.searchResult.set(null);
    this.searchPoleNumber = '';
  }

  isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  }

  isChrome(): boolean {
    // CriOS is Chrome on iOS
    return /CriOS/.test(navigator.userAgent) || /Chrome/.test(navigator.userAgent);
  }

  isGPSAvailable(): boolean {
    return 'geolocation' in navigator;
  }

  async checkGPSPermission(): Promise<void> {
    try {
      const permissionState = await this.gpsService.checkPermission();
      this.gpsPermissionState.set(permissionState);
    } catch (error) {
      console.warn('Failed to check GPS permission:', error);
      this.gpsPermissionState.set('prompt');
    }
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to get GPS location';
      this.gpsError.set(errorMessage);
      
      // Check if permission was denied
      if (errorMessage.toLowerCase().includes('permission denied')) {
        this.gpsPermissionState.set('denied');
      }
    } finally {
      this.isCapturingGPS.set(false);
    }
  }

  recaptureGPS(): void {
    this.currentPosition.set(null);
    this.captureGPS();
  }

  async requestPermissionDirectly(): Promise<void> {
    this.isCapturingGPS.set(true);
    this.gpsError.set(null);
    
    try {
      // Try to request permission directly
      const permissionGranted = await this.gpsService.requestPermission();
      if (permissionGranted) {
        this.gpsPermissionState.set('granted');
        // Try to capture GPS after permission granted
        await this.captureGPS();
      } else {
        this.gpsPermissionState.set('denied');
        this.gpsError.set('Permission denied. Please check iOS Settings → Privacy & Security → Location Services → Safari');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request permission';
      this.gpsError.set(errorMessage);
    } finally {
      this.isCapturingGPS.set(false);
    }
  }

  async tryWithLowerAccuracy(): Promise<void> {
    this.isCapturingGPS.set(true);
    this.gpsError.set(null);
    
    try {
      // Try with lower accuracy requirements
      const position = await this.gpsService.getCurrentPosition({
        requiredAccuracy: 50, // 50 meters instead of 5
        enableHighAccuracy: false, // Use network location instead of GPS
        timeout: 30000, // 30 seconds timeout
        maxAttempts: 3
      });
      
      this.currentPosition.set(position);
      this.locationForm.patchValue({
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy
      });
      
      this.snackBar.open(
        `GPS captured with ${this.formatAccuracy(position.accuracy)} accuracy (lower precision mode)`,
        'OK',
        { duration: 5000 }
      );

      // Auto-save after GPS capture
      this.autoSaveDraft();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get GPS location';
      this.gpsError.set(errorMessage);
    } finally {
      this.isCapturingGPS.set(false);
    }
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
    // No photos are required anymore - field agents can save with any number
    return true;
  }

  hasAnyPhotos(): boolean {
    return this.capturedPhotos().length > 0;
  }

  getMissingRequiredPhotos(): string[] {
    // No photos are required anymore
    return [];
  }

  hasPhotoInPole(pole: OfflinePoleData, photoType: string): boolean {
    return pole.photos?.some(photo => photo.type === photoType) || false;
  }

  hasPhotoType(photoType: string): boolean {
    return this.capturedPhotos().some(photo => photo.type === photoType);
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

  async confirmSaveWithoutPhotos(): Promise<boolean> {
    return new Promise((resolve) => {
      const snackBarRef = this.snackBar.open(
        'Save without photos? You can add photos later.',
        'Save Anyway',
        {
          duration: 10000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['confirm-snackbar']
        }
      );
      
      snackBarRef.onAction().subscribe(() => {
        resolve(true);
      });
      
      snackBarRef.afterDismissed().subscribe((info) => {
        if (!info.dismissedByAction) {
          resolve(false);
        }
      });
    });
  }

  getProjectName(): string {
    const projectId = this.basicInfoForm.get('projectId')?.value;
    if (!projectId) return 'Not selected';
    
    // Get the selected project name from the projects list
    const selectedProject = this.projects.find(p => p.id === projectId);
    return selectedProject?.name || projectId;
  }

  async saveOffline(): Promise<void> {
    if (!this.basicInfoForm.valid || !this.locationForm.valid) {
      this.snackBar.open('Please complete basic information and GPS location', 'OK', { duration: 3000 });
      return;
    }
    
    // Photos are optional - can save with any number of photos
    if (this.capturedPhotos().length === 0) {
      const confirmed = await this.confirmSaveWithoutPhotos();
      if (!confirmed) return;
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
      
      // Reset stepper to step 1 instead of navigating away
      this.stepper.reset();
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

  /**
   * Handle successful sync completion - reset stepper to step 1
   */
  onSyncCompleted(): void {
    console.log('🎯 DEBUG: onSyncCompleted method called');
    
    // Reset the stepper to the first step
    console.log('🎯 DEBUG: Resetting stepper to step 1');
    this.stepper.reset();
    
    // Reset all forms
    console.log('🎯 DEBUG: Resetting forms and data');
    this.basicInfoForm.reset();
    this.locationForm.reset();
    this.currentPosition.set(null);
    this.capturedPhotos.set([]);
    this.currentDraftId.set(null);
    
    // Show success message
    console.log('🎯 DEBUG: Showing success message');
    this.snackBar.open(
      'Sync completed! Ready to capture a new pole.',
      'Close',
      { duration: 3000 }
    );
    
    console.log('🎯 DEBUG: onSyncCompleted method finished - should stay on offline-pole-capture page');
  }
}