import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PoleTrackerService } from '../../services/pole-tracker.service';
import { ProjectService } from '../../../../core/services/project.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PlannedPole } from '../../models/mobile-pole-tracker.model';
import { firstValueFrom } from 'rxjs';

interface ParsedPole {
  clientPoleNumber: string;
  lat: number;
  lng: number;
  address?: string;
  notes?: string;
  valid: boolean;
  errors: string[];
}

@Component({
  selector: 'app-import-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatProgressBarModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="import-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Import Poles from CSV/Excel</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-stepper linear #stepper>
            <!-- Step 1: File Upload -->
            <mat-step [stepControl]="fileForm">
              <form [formGroup]="fileForm">
                <ng-template matStepLabel>Upload File</ng-template>

                <div class="step-content">
                  <div
                    class="file-upload-area"
                    (click)="fileInput.click()"
                    (dragover)="onDragOver($event)"
                    (drop)="onDrop($event)"
                    [class.dragging]="isDragging()"
                  >
                    <mat-icon>cloud_upload</mat-icon>
                    <h3>Click or drag file here</h3>
                    <p>Supports CSV and Excel files (.csv, .xlsx, .xls)</p>
                    <input
                      #fileInput
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      (change)="onFileSelected($event)"
                      style="display: none"
                    />
                  </div>

                  @if (selectedFile()) {
                    <div class="file-info">
                      <mat-icon>description</mat-icon>
                      <span>{{ selectedFile()!.name }}</span>
                      <button mat-icon-button (click)="clearFile()">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  }

                  <div class="format-info">
                    <h4>Required Columns:</h4>
                    <ul>
                      <li><strong>Pole Number</strong> - Unique identifier</li>
                      <li><strong>Latitude</strong> - GPS latitude</li>
                      <li><strong>Longitude</strong> - GPS longitude</li>
                    </ul>
                    <h4>Optional Columns:</h4>
                    <ul>
                      <li><strong>Address</strong> - Physical address</li>
                      <li><strong>Notes</strong> - Additional information</li>
                    </ul>
                  </div>
                </div>

                <div class="step-actions">
                  <button mat-button routerLink="/pole-tracker">Cancel</button>
                  <button
                    mat-raised-button
                    color="primary"
                    matStepperNext
                    [disabled]="!selectedFile()"
                  >
                    Next
                  </button>
                </div>
              </form>
            </mat-step>

            <!-- Step 2: Parse & Validate -->
            <mat-step [stepControl]="projectForm">
              <form [formGroup]="projectForm">
                <ng-template matStepLabel>Select Project & Validate</ng-template>

                <div class="step-content">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Select Project</mat-label>
                    <mat-select formControlName="projectId" required>
                      @for (project of projects(); track project.id) {
                        <mat-option [value]="project.id">
                          {{ project.title }}
                        </mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  @if (parsing()) {
                    <div class="parsing-indicator">
                      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
                      <p>Parsing file...</p>
                    </div>
                  }

                  @if (parsedPoles().length > 0) {
                    <div class="validation-summary">
                      <mat-card class="summary-card valid">
                        <mat-icon>check_circle</mat-icon>
                        <div>
                          <div class="count">{{ validPoles().length }}</div>
                          <div class="label">Valid Poles</div>
                        </div>
                      </mat-card>

                      <mat-card class="summary-card invalid">
                        <mat-icon>error</mat-icon>
                        <div>
                          <div class="count">{{ invalidPoles().length }}</div>
                          <div class="label">Invalid Poles</div>
                        </div>
                      </mat-card>
                    </div>

                    <div class="preview-table">
                      <h4>Preview (First 10 rows)</h4>
                      <table mat-table [dataSource]="previewData()" class="full-width">
                        <ng-container matColumnDef="status">
                          <th mat-header-cell *matHeaderCellDef>Status</th>
                          <td mat-cell *matCellDef="let pole">
                            @if (pole.valid) {
                              <mat-icon color="primary">check</mat-icon>
                            } @else {
                              <mat-icon color="warn">warning</mat-icon>
                            }
                          </td>
                        </ng-container>

                        <ng-container matColumnDef="poleNumber">
                          <th mat-header-cell *matHeaderCellDef>Pole Number</th>
                          <td mat-cell *matCellDef="let pole">{{ pole.clientPoleNumber }}</td>
                        </ng-container>

                        <ng-container matColumnDef="coordinates">
                          <th mat-header-cell *matHeaderCellDef>Coordinates</th>
                          <td mat-cell *matCellDef="let pole">
                            {{ pole.lat?.toFixed(6) }}, {{ pole.lng?.toFixed(6) }}
                          </td>
                        </ng-container>

                        <ng-container matColumnDef="address">
                          <th mat-header-cell *matHeaderCellDef>Address</th>
                          <td mat-cell *matCellDef="let pole">{{ pole.address || '-' }}</td>
                        </ng-container>

                        <ng-container matColumnDef="errors">
                          <th mat-header-cell *matHeaderCellDef>Errors</th>
                          <td mat-cell *matCellDef="let pole">
                            @if (pole.errors.length > 0) {
                              <span class="error-text">{{ pole.errors.join(', ') }}</span>
                            }
                          </td>
                        </ng-container>

                        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                        <tr
                          mat-row
                          *matRowDef="let row; columns: displayedColumns"
                          [class.invalid-row]="!row.valid"
                        ></tr>
                      </table>
                    </div>

                    <mat-checkbox formControlName="skipInvalid" class="skip-checkbox">
                      Skip invalid poles and import only valid ones
                    </mat-checkbox>
                  }
                </div>

                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button
                    mat-raised-button
                    color="primary"
                    matStepperNext
                    [disabled]="
                      !projectForm.valid ||
                      parsing() ||
                      (validPoles().length === 0 && !projectForm.value.skipInvalid)
                    "
                  >
                    Next
                  </button>
                </div>
              </form>
            </mat-step>

            <!-- Step 3: Import -->
            <mat-step>
              <ng-template matStepLabel>Import Poles</ng-template>

              <div class="step-content">
                @if (!importing() && !importComplete()) {
                  <div class="import-summary">
                    <h3>Ready to Import</h3>
                    <p>
                      Project: <strong>{{ getSelectedProjectName() }}</strong>
                    </p>
                    <p>
                      Poles to import: <strong>{{ polesToImport().length }}</strong>
                    </p>

                    <button
                      mat-raised-button
                      color="primary"
                      (click)="startImport()"
                      class="import-button"
                    >
                      <mat-icon>upload</mat-icon>
                      Start Import
                    </button>
                  </div>
                }

                @if (importing()) {
                  <div class="import-progress">
                    <mat-progress-bar mode="indeterminate"></mat-progress-bar>
                    <p>Importing poles...</p>
                  </div>
                }

                @if (importComplete()) {
                  <div class="import-result">
                    @if (importResult()) {
                      <mat-icon class="success-icon">check_circle</mat-icon>
                      <h3>Import Complete!</h3>
                      <div class="result-stats">
                        <p>
                          Successfully imported:
                          <strong>{{ importResult()!.successCount }}</strong> poles
                        </p>
                        @if (importResult()!.errorCount > 0) {
                          <p>
                            Failed: <strong>{{ importResult()!.errorCount }}</strong> poles
                          </p>
                          <div class="error-list">
                            @for (error of importResult()!.errors; track error) {
                              <p class="error-text">{{ error }}</p>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>

              <div class="step-actions">
                @if (!importing() && !importComplete()) {
                  <button mat-button matStepperPrevious>Back</button>
                }
                @if (importComplete()) {
                  <button mat-raised-button color="primary" routerLink="/pole-tracker/desktop">
                    View Poles
                  </button>
                  <button mat-button (click)="resetWizard()">Import More</button>
                }
              </div>
            </mat-step>
          </mat-stepper>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .import-container {
        padding: 24px;
        max-width: 800px;
        margin: 0 auto;
      }

      .step-content {
        padding: 24px 0;
        min-height: 400px;
      }

      .file-upload-area {
        border: 2px dashed var(--mat-sys-outline);
        border-radius: 8px;
        padding: 40px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
        background: var(--mat-sys-surface-container-low);

        &:hover,
        &.dragging {
          border-color: var(--mat-sys-primary);
          background: var(--mat-sys-surface-container);
        }

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          color: var(--mat-sys-on-surface-variant);
        }

        h3 {
          margin: 16px 0 8px;
          color: var(--mat-sys-on-surface);
        }

        p {
          margin: 0;
          color: var(--mat-sys-on-surface-variant);
        }
      }

      .file-info {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 16px;
        padding: 12px;
        background: var(--mat-sys-surface-container);
        border-radius: 8px;

        mat-icon {
          color: var(--mat-sys-primary);
        }

        span {
          flex: 1;
          font-weight: 500;
        }
      }

      .format-info {
        margin-top: 24px;
        padding: 16px;
        background: var(--mat-sys-surface-container-low);
        border-radius: 8px;

        h4 {
          margin: 0 0 8px;
          color: var(--mat-sys-on-surface);
          font-size: 14px;
        }

        ul {
          margin: 0 0 16px;
          padding-left: 20px;

          li {
            margin-bottom: 4px;
            font-size: 13px;
            color: var(--mat-sys-on-surface-variant);
          }
        }
      }

      .full-width {
        width: 100%;
      }

      .parsing-indicator {
        text-align: center;
        padding: 24px;

        p {
          margin-top: 16px;
          color: var(--mat-sys-on-surface-variant);
        }
      }

      .validation-summary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 24px;
      }

      .summary-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;

        mat-icon {
          font-size: 40px;
          width: 40px;
          height: 40px;
        }

        &.valid mat-icon {
          color: var(--mat-sys-primary);
        }

        &.invalid mat-icon {
          color: var(--mat-sys-error);
        }

        .count {
          font-size: 32px;
          font-weight: 600;
          line-height: 1;
        }

        .label {
          font-size: 14px;
          color: var(--mat-sys-on-surface-variant);
          margin-top: 4px;
        }
      }

      .preview-table {
        margin-top: 24px;

        h4 {
          margin: 0 0 12px;
          color: var(--mat-sys-on-surface);
        }

        table {
          border: 1px solid var(--mat-sys-outline-variant);
          border-radius: 8px;
          overflow: hidden;
        }

        .invalid-row {
          background: var(--mat-sys-error-container);
        }

        .error-text {
          color: var(--mat-sys-error);
          font-size: 12px;
        }
      }

      .skip-checkbox {
        margin-top: 16px;
      }

      .step-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid var(--mat-sys-outline-variant);
      }

      .import-summary {
        text-align: center;
        padding: 40px;

        h3 {
          margin: 0 0 24px;
          font-size: 24px;
        }

        p {
          margin: 0 0 12px;
          font-size: 16px;
          color: var(--mat-sys-on-surface-variant);
        }

        strong {
          color: var(--mat-sys-on-surface);
        }
      }

      .import-button {
        margin-top: 32px;
        height: 48px;
        padding: 0 32px;
        font-size: 16px;
      }

      .import-progress {
        text-align: center;
        padding: 60px;

        p {
          margin-top: 24px;
          font-size: 16px;
          color: var(--mat-sys-on-surface-variant);
        }
      }

      .import-result {
        text-align: center;
        padding: 40px;

        .success-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: var(--mat-sys-primary);
          margin-bottom: 24px;
        }

        h3 {
          margin: 0 0 24px;
          font-size: 24px;
        }

        .result-stats {
          p {
            margin: 0 0 8px;
            font-size: 16px;
          }

          strong {
            color: var(--mat-sys-primary);
          }
        }

        .error-list {
          margin-top: 16px;
          padding: 16px;
          background: var(--mat-sys-error-container);
          border-radius: 8px;
          text-align: left;
          max-height: 200px;
          overflow-y: auto;

          .error-text {
            margin: 0 0 4px;
            font-size: 13px;
            color: var(--mat-sys-error);
          }
        }
      }
    `,
  ],
})
export class ImportWizardComponent {
  private fb = inject(FormBuilder);
  private poleService = inject(PoleTrackerService);
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  fileForm = this.fb.group({
    file: [null as File | null, Validators.required],
  });

  projectForm = this.fb.group({
    projectId: ['', Validators.required],
    skipInvalid: [false],
  });

  selectedFile = signal<File | null>(null);
  isDragging = signal(false);
  parsing = signal(false);
  parsedPoles = signal<ParsedPole[]>([]);
  projects = signal<any[]>([]);
  importing = signal(false);
  importComplete = signal(false);
  importResult = signal<any>(null);

  displayedColumns = ['status', 'poleNumber', 'coordinates', 'address', 'errors'];

  validPoles = computed(() => this.parsedPoles().filter((p) => p.valid));
  invalidPoles = computed(() => this.parsedPoles().filter((p) => !p.valid));
  previewData = computed(() => this.parsedPoles().slice(0, 10));
  polesToImport = computed(() => {
    if (this.projectForm.value.skipInvalid) {
      return this.validPoles();
    }
    return this.parsedPoles();
  });

  constructor() {
    this.loadProjects();
  }

  async loadProjects() {
    try {
      // Subscribe to projects observable for real-time updates
      this.projectService.getProjects().subscribe({
        next: (projects) => {
          console.log('Projects loaded successfully:', projects);
          this.projects.set(projects || []);
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          this.snackBar.open(
            'Error loading projects: ' + (error?.message || 'Unknown error'),
            'Dismiss',
            { duration: 5000 },
          );
        },
      });
    } catch (error) {
      console.error('Error loading projects:', error);
      this.snackBar.open('Error loading projects', 'Dismiss', { duration: 3000 });
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile.set(input.files[0]);
      this.fileForm.patchValue({ file: input.files[0] });
      this.parseFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files[0]) {
      this.selectedFile.set(files[0]);
      this.fileForm.patchValue({ file: files[0] });
      this.parseFile(files[0]);
    }
  }

  clearFile() {
    this.selectedFile.set(null);
    this.fileForm.patchValue({ file: null });
    this.parsedPoles.set([]);
  }

  async parseFile(file: File) {
    this.parsing.set(true);
    this.parsedPoles.set([]);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        throw new Error('File must contain at least a header row and one data row');
      }

      const headers = lines[0]
        .toLowerCase()
        .split(',')
        .map((h) => h.trim());
      const poleNumberIndex = headers.findIndex((h) => h.includes('pole') && h.includes('number'));
      const latIndex = headers.findIndex((h) => h.includes('lat'));
      const lngIndex = headers.findIndex((h) => h.includes('lng') || h.includes('lon'));
      const addressIndex = headers.findIndex((h) => h.includes('address'));
      const notesIndex = headers.findIndex((h) => h.includes('note'));

      if (poleNumberIndex === -1 || latIndex === -1 || lngIndex === -1) {
        throw new Error('Missing required columns: Pole Number, Latitude, Longitude');
      }

      const poles: ParsedPole[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const errors: string[] = [];

        const poleNumber = values[poleNumberIndex];
        const lat = parseFloat(values[latIndex]);
        const lng = parseFloat(values[lngIndex]);
        const address = addressIndex !== -1 ? values[addressIndex] : undefined;
        const notes = notesIndex !== -1 ? values[notesIndex] : undefined;

        if (!poleNumber) errors.push('Missing pole number');
        if (isNaN(lat)) errors.push('Invalid latitude');
        if (isNaN(lng)) errors.push('Invalid longitude');
        if (lat < -90 || lat > 90) errors.push('Latitude out of range');
        if (lng < -180 || lng > 180) errors.push('Longitude out of range');

        poles.push({
          clientPoleNumber: poleNumber,
          lat,
          lng,
          address,
          notes,
          valid: errors.length === 0,
          errors,
        });
      }

      this.parsedPoles.set(poles);
    } catch (error) {
      console.error('Error parsing file:', error);
      this.snackBar.open('Error parsing file: ' + error, 'Dismiss', { duration: 5000 });
    } finally {
      this.parsing.set(false);
    }
  }

  getSelectedProjectName(): string {
    const projectId = this.projectForm.value.projectId;
    const project = this.projects().find((p) => p.id === projectId);
    return project?.title || '';
  }

  async startImport() {
    this.importing.set(true);
    this.importComplete.set(false);

    try {
      const projectId = this.projectForm.value.projectId!;
      const currentUser = this.authService.currentUser();
      const fileName = this.selectedFile()!.name;

      const polesToImport = this.polesToImport().map(
        (p) =>
          ({
            clientPoleNumber: p.clientPoleNumber,
            plannedLocation: {
              lat: p.lat,
              lng: p.lng,
              address: p.address,
            },
            notes: p.notes,
          }) as Partial<PlannedPole>,
      );

      const result = await firstValueFrom(
        this.poleService.importPoles(projectId, polesToImport, currentUser!.uid, fileName),
      );

      this.importResult.set(result);
      this.importComplete.set(true);

      if (result.successCount > 0) {
        this.snackBar.open(`Successfully imported ${result.successCount} poles`, 'Dismiss', {
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error importing poles:', error);
      this.snackBar.open('Error importing poles', 'Dismiss', { duration: 3000 });
    } finally {
      this.importing.set(false);
    }
  }

  resetWizard() {
    this.clearFile();
    this.fileForm.reset();
    this.projectForm.reset();
    this.importComplete.set(false);
    this.importResult.set(null);
  }
}
