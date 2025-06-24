import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { debounceTime } from 'rxjs/operators';

import { DailyKPIs, KPI_DEFINITIONS, KPIDefinition } from '../../models/daily-kpis.model';
import { DailyProgressService } from '../../services/daily-progress.service';
import { DailyKpisService } from '../../services/daily-kpis.service';
import { ProjectService } from '../../../../core/services/project.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Project } from '../../../../core/models/project.model';
import { ContractorService } from '../../../contractors/services/contractor.service';
import { Contractor } from '../../../contractors/models/contractor.model';

@Component({
  selector: 'app-daily-kpis-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="kpis-form-container">
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>Daily KPIs Update</mat-card-title>
          <mat-card-subtitle>{{ selectedDate() | date: 'fullDate' }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div class="test-content">
            <p>✅ Daily KPI Form Component Loaded Successfully!</p>
            <p>Projects loaded: {{ projectsLoaded() ? 'Yes' : 'No' }}</p>
            <p>Projects count: {{ projects().length }}</p>

            @if (projects().length === 0) {
              <div class="no-projects-message">
                <mat-icon>info</mat-icon>
                <p>No projects found. You can still use the form with a manual project ID.</p>
              </div>
            }
          </div>

          @if (projectsLoaded()) {
            <form [formGroup]="kpiForm" (ngSubmit)="onSubmit()">
              <!-- Project & Date Selection -->
              <div class="form-header">
                <mat-form-field appearance="outline">
                  <mat-label>Project</mat-label>
                  <mat-select formControlName="projectId" required>
                    @for (project of projects(); track project.id) {
                      <mat-option [value]="project.id">{{ project.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Contractor</mat-label>
                  <mat-select formControlName="contractorId">
                    <mat-option value="">None</mat-option>
                    @for (contractor of contractors(); track contractor.id) {
                      <mat-option [value]="contractor.id">{{ contractor.companyName }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Date</mat-label>
                  <input matInput [matDatepicker]="picker" formControlName="date" required />
                  <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                  <mat-datepicker #picker></mat-datepicker>
                </mat-form-field>

                <button
                  type="button"
                  mat-raised-button
                  color="accent"
                  (click)="copyPreviousDay()"
                  [disabled]="loading() || !kpiForm.get('projectId')?.value"
                >
                  <mat-icon>content_copy</mat-icon>
                  Copy Yesterday
                </button>
              </div>

              <!-- KPI Input Sections -->
              <div class="kpis-sections">
                <!-- Core KPIs -->
                <div class="kpi-section">
                  <h3 class="section-title">📍 Core Activities</h3>
                  <div class="kpis-grid">
                    @for (kpiDef of getCoreKPIs(); track kpiDef.key) {
                      <mat-card class="kpi-card">
                        <mat-card-header>
                          <mat-card-title class="kpi-title">{{ kpiDef.label }}</mat-card-title>
                          <mat-card-subtitle>{{ kpiDef.unit }}</mat-card-subtitle>
                        </mat-card-header>

                        <mat-card-content>
                          <div class="kpi-inputs">
                            <mat-form-field appearance="outline" class="today-field">
                              <mat-label>Today</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                [formControlName]="kpiDef.todayField"
                                (input)="updateTotal(kpiDef)"
                                placeholder="0"
                              />
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="total-field">
                              <mat-label>Total</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                [formControlName]="kpiDef.totalField"
                                placeholder="0"
                                readonly
                              />
                              <mat-hint>Auto-calculated</mat-hint>
                            </mat-form-field>
                          </div>
                        </mat-card-content>
                      </mat-card>
                    }
                  </div>
                </div>

                <!-- Civils KPIs -->
                <div class="kpi-section">
                  <h3 class="section-title">🚧 Civils</h3>
                  <div class="kpis-grid">
                    @for (kpiDef of getCivilsKPIs(); track kpiDef.key) {
                      <mat-card class="kpi-card civils-card">
                        <mat-card-header>
                          <mat-card-title class="kpi-title">{{ kpiDef.label }}</mat-card-title>
                          <mat-card-subtitle>{{ kpiDef.unit }}</mat-card-subtitle>
                        </mat-card-header>

                        <mat-card-content>
                          <div class="kpi-inputs">
                            <mat-form-field appearance="outline" class="today-field">
                              <mat-label>Today</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                [formControlName]="kpiDef.todayField"
                                (input)="updateTotal(kpiDef)"
                                placeholder="0"
                              />
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="total-field">
                              <mat-label>Total</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                [formControlName]="kpiDef.totalField"
                                placeholder="0"
                                readonly
                              />
                              <mat-hint>Auto-calculated</mat-hint>
                            </mat-form-field>
                          </div>
                        </mat-card-content>
                      </mat-card>
                    }
                  </div>
                </div>

                <!-- Stringing KPIs -->
                <div class="kpi-section">
                  <h3 class="section-title">🔗 Cable Stringing</h3>
                  <div class="kpis-grid">
                    @for (kpiDef of getStringingKPIs(); track kpiDef.key) {
                      <mat-card class="kpi-card stringing-card">
                        <mat-card-header>
                          <mat-card-title class="kpi-title">{{ kpiDef.label }}</mat-card-title>
                          <mat-card-subtitle>{{ kpiDef.unit }}</mat-card-subtitle>
                        </mat-card-header>

                        <mat-card-content>
                          <div class="kpi-inputs">
                            <mat-form-field appearance="outline" class="today-field">
                              <mat-label>Today</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                [formControlName]="kpiDef.todayField"
                                (input)="updateTotal(kpiDef)"
                                placeholder="0"
                              />
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="total-field">
                              <mat-label>Total</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                [formControlName]="kpiDef.totalField"
                                placeholder="0"
                                readonly
                              />
                              <mat-hint>Auto-calculated</mat-hint>
                            </mat-form-field>
                          </div>
                        </mat-card-content>
                      </mat-card>
                    }
                  </div>
                </div>

                <!-- Homes KPIs -->
                <div class="kpi-section">
                  <h3 class="section-title">🏠 Homes</h3>
                  <div class="kpis-grid">
                    <mat-card class="kpi-card">
                      <mat-card-header>
                        <mat-card-title class="kpi-title">Home Signups</mat-card-title>
                        <mat-card-subtitle>count</mat-card-subtitle>
                      </mat-card-header>
                      <mat-card-content>
                        <div class="kpi-inputs">
                          <mat-form-field appearance="outline" class="today-field">
                            <mat-label>Today</mat-label>
                            <input
                              matInput
                              type="number"
                              min="0"
                              formControlName="homeSignupsToday"
                              (input)="updateHomeTotal('homeSignups')"
                              placeholder="0"
                            />
                          </mat-form-field>
                          <mat-form-field appearance="outline" class="total-field">
                            <mat-label>Total</mat-label>
                            <input
                              matInput
                              type="number"
                              min="0"
                              formControlName="homeSignupsTotal"
                              placeholder="0"
                              readonly
                            />
                            <mat-hint>Auto-calculated</mat-hint>
                          </mat-form-field>
                        </div>
                      </mat-card-content>
                    </mat-card>

                    <mat-card class="kpi-card">
                      <mat-card-header>
                        <mat-card-title class="kpi-title">Home Drops</mat-card-title>
                        <mat-card-subtitle>count</mat-card-subtitle>
                      </mat-card-header>
                      <mat-card-content>
                        <div class="kpi-inputs">
                          <mat-form-field appearance="outline" class="today-field">
                            <mat-label>Today</mat-label>
                            <input
                              matInput
                              type="number"
                              min="0"
                              formControlName="homeDropsToday"
                              (input)="updateHomeTotal('homeDrops')"
                              placeholder="0"
                            />
                          </mat-form-field>
                          <mat-form-field appearance="outline" class="total-field">
                            <mat-label>Total</mat-label>
                            <input
                              matInput
                              type="number"
                              min="0"
                              formControlName="homeDropsTotal"
                              placeholder="0"
                              readonly
                            />
                            <mat-hint>Auto-calculated</mat-hint>
                          </mat-form-field>
                        </div>
                      </mat-card-content>
                    </mat-card>

                    <mat-card class="kpi-card">
                      <mat-card-header>
                        <mat-card-title class="kpi-title">Homes Connected</mat-card-title>
                        <mat-card-subtitle>count</mat-card-subtitle>
                      </mat-card-header>
                      <mat-card-content>
                        <div class="kpi-inputs">
                          <mat-form-field appearance="outline" class="today-field">
                            <mat-label>Today</mat-label>
                            <input
                              matInput
                              type="number"
                              min="0"
                              formControlName="homesConnectedToday"
                              (input)="updateHomeTotal('homesConnected')"
                              placeholder="0"
                            />
                          </mat-form-field>
                          <mat-form-field appearance="outline" class="total-field">
                            <mat-label>Total</mat-label>
                            <input
                              matInput
                              type="number"
                              min="0"
                              formControlName="homesConnectedTotal"
                              placeholder="0"
                              readonly
                            />
                            <mat-hint>Auto-calculated</mat-hint>
                          </mat-form-field>
                        </div>
                      </mat-card-content>
                    </mat-card>
                  </div>
                </div>

                <!-- Additional Fields -->
                <div class="kpi-section">
                  <h3 class="section-title">📋 Additional Info</h3>
                  <div class="additional-fields">
                    <mat-form-field appearance="outline">
                      <mat-label>Risk Flag</mat-label>
                      <mat-select formControlName="riskFlag">
                        <mat-option [value]="false">No Risk</mat-option>
                        <mat-option [value]="true">Risk Identified</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Weekly Report Details</mat-label>
                      <input
                        matInput
                        formControlName="weeklyReportDetails"
                        placeholder="Brief summary..."
                      />
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Key Issues Summary</mat-label>
                      <textarea
                        matInput
                        formControlName="keyIssuesSummary"
                        rows="2"
                        placeholder="Key issues encountered today..."
                      ></textarea>
                    </mat-form-field>
                  </div>
                </div>
              </div>

              <!-- Comments -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Comments</mat-label>
                <textarea
                  matInput
                  formControlName="comments"
                  rows="3"
                  placeholder="Site conditions, issues, notes..."
                ></textarea>
              </mat-form-field>

              <!-- Actions -->
              <div class="form-actions">
                <button type="button" mat-button (click)="saveDraft()" [disabled]="loading()">
                  Save Draft
                </button>

                <button
                  type="submit"
                  mat-raised-button
                  color="primary"
                  [disabled]="loading() || kpiForm.invalid"
                >
                  @if (loading()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    {{ currentKPI ? 'Update KPIs' : 'Submit KPIs' }}
                  }
                </button>
              </div>
            </form>
          } @else {
            <div class="loading-container">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Loading projects...</p>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .kpis-form-container {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .header-card {
        margin-bottom: 24px;
      }

      .form-header {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        align-items: flex-start;
        flex-wrap: wrap;
      }

      .form-header mat-form-field {
        flex: 1;
        min-width: 200px;
      }

      .kpis-sections {
        margin-bottom: 24px;
      }

      .kpi-section {
        margin-bottom: 32px;
      }

      .section-title {
        font-size: 18px;
        font-weight: 500;
        margin-bottom: 16px;
        color: var(--mat-sys-primary);
        border-bottom: 2px solid var(--mat-sys-outline-variant);
        padding-bottom: 8px;
      }

      .kpis-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      }

      .additional-fields {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
        max-width: 800px;
      }

      .kpi-card {
        background: var(--mat-sys-surface-container);
        transition: all 0.3s ease;
      }

      .kpi-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--mat-sys-elevation-2);
      }

      .stringing-card {
        background: var(--mat-sys-secondary-container);
      }

      .civils-card {
        background: var(--mat-sys-tertiary-container);
      }

      .kpi-title {
        font-size: 14px;
        font-weight: 500;
      }

      .kpi-inputs {
        display: flex;
        gap: 12px;
      }

      .today-field,
      .total-field {
        flex: 1;
      }

      .today-field {
        background: var(--mat-sys-primary-container);
        border-radius: 4px;
      }

      .full-width {
        width: 100%;
      }

      .form-actions {
        display: flex;
        gap: 16px;
        justify-content: flex-end;
        margin-top: 24px;
      }

      mat-spinner {
        margin-right: 8px;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px;
        gap: 16px;

        p {
          color: var(--mat-sys-on-surface-variant);
          margin: 0;
        }
      }

      .test-content {
        background: var(--mat-sys-primary-container);
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 24px;

        p {
          margin: 8px 0;
          font-weight: 500;
        }
      }

      .no-projects-message {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--mat-sys-error-container);
        padding: 12px;
        border-radius: 4px;
        margin-top: 12px;

        mat-icon {
          color: var(--mat-sys-on-error-container);
        }

        p {
          color: var(--mat-sys-on-error-container);
          margin: 0;
        }
      }
    `,
  ],
})
export class DailyKpisFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private dailyProgressService = inject(DailyProgressService);
  private kpisService = inject(DailyKpisService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private contractorService = inject(ContractorService);

  // Signals
  projects = signal<Project[]>([]);
  projectsLoaded = signal(false);
  loading = signal(false);
  selectedDate = signal(new Date());
  contractors = signal<Contractor[]>([]);
  contractorsLoaded = signal(false);

  // Form and data
  kpiForm!: FormGroup;
  kpiDefinitions = KPI_DEFINITIONS;
  previousDayKPIs: DailyKPIs | null = null;
  currentKPI: DailyKPIs | null = null;
  cumulativeTotals: any = {};
  private isLoadingData = false;

  ngOnInit() {
    this.initializeForm();
    this.loadProjects();
    this.loadContractors();
  }

  private initializeForm() {
    const formControls: any = {
      projectId: ['', Validators.required],
      contractorId: [''],
      date: [new Date(), Validators.required],
      comments: [''],
    };

    // Add all KPI fields
    this.kpiDefinitions.forEach((kpiDef) => {
      formControls[kpiDef.todayField] = [0, [Validators.min(0)]];
      formControls[kpiDef.totalField] = [0, [Validators.min(0)]];
    });

    // Add new home-related fields
    formControls['homeSignupsToday'] = [0, [Validators.min(0)]];
    formControls['homeSignupsTotal'] = [0, [Validators.min(0)]];
    formControls['homeDropsToday'] = [0, [Validators.min(0)]];
    formControls['homeDropsTotal'] = [0, [Validators.min(0)]];
    formControls['homesConnectedToday'] = [0, [Validators.min(0)]];
    formControls['homesConnectedTotal'] = [0, [Validators.min(0)]];

    // Add additional fields
    formControls['riskFlag'] = [false];
    formControls['weeklyReportDetails'] = [''];
    formControls['keyIssuesSummary'] = [''];
    formControls['weeklyReportInsights'] = [''];
    formControls['monthlyReports'] = [''];

    this.kpiForm = this.fb.group(formControls);

    // Watch for date/project changes to load previous day data
    // Use debounceTime to avoid multiple calls
    this.kpiForm
      .get('date')
      ?.valueChanges.pipe(debounceTime(500))
      .subscribe(() => {
        this.updateSelectedDate();
        if (!this.isLoadingData) {
          this.loadExistingKPIData();
        }
      });

    this.kpiForm
      .get('projectId')
      ?.valueChanges.pipe(debounceTime(500))
      .subscribe(() => {
        if (!this.isLoadingData) {
          this.loadExistingKPIData();
        }
      });
  }

  private loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        console.log('Loaded projects:', projects);
        this.projects.set(projects);
        this.projectsLoaded.set(true);
        // Auto-select first project if only one
        if (projects.length === 1 && projects[0].id) {
          this.kpiForm.patchValue({ projectId: projects[0].id }, { emitEvent: false });
          // Load data after project is set
          setTimeout(() => this.loadExistingKPIData(), 200);
        }
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.projectsLoaded.set(true); // Show form even on error
        this.snackBar.open('Error loading projects', 'Close', { duration: 3000 });
        // Fallback to test project for development
        this.projects.set([{ id: 'test', name: 'Test Project (Fallback)' } as Project]);
      },
    });
  }

  private loadContractors() {
    this.contractorService.getActiveContractors().subscribe({
      next: (contractors) => {
        // console.log('Loaded contractors:', contractors);
        this.contractors.set(contractors);
        this.contractorsLoaded.set(true);
      },
      error: (error) => {
        // console.error('Error loading contractors:', error);
        this.contractorsLoaded.set(true); // Show form even on error
        this.snackBar.open('Error loading contractors', 'Close', { duration: 3000 });
      },
    });
  }

  private updateSelectedDate() {
    const dateValue = this.kpiForm.get('date')?.value;
    if (dateValue) {
      this.selectedDate.set(new Date(dateValue));
    }
  }

  private loadCumulativeTotals() {
    const projectId = this.kpiForm.get('projectId')?.value;
    const currentDate = this.selectedDate();

    if (!projectId || !currentDate) {
      console.log('Cannot load cumulative totals - missing project or date');
      return;
    }

    console.log('Loading all KPIs to calculate cumulative totals');

    // Load ALL KPIs for this project
    this.kpisService.getKPIsByProject(projectId).subscribe({
      next: (allKPIs) => {
        console.log(`Loaded ${allKPIs.length} KPIs for project`);

        // Simple approach: Just sum all "today" values from all entries
        const totals: any = {};

        allKPIs.forEach((kpi) => {
          // For each KPI definition, sum the today values
          this.kpiDefinitions.forEach((def) => {
            const todayValue = Number(kpi[def.todayField as keyof DailyKPIs]) || 0;
            totals[def.totalField] = (totals[def.totalField] || 0) + todayValue;
          });

          // Add home-related fields
          totals['homeSignupsTotal'] =
            (totals['homeSignupsTotal'] || 0) + (Number(kpi.homeSignupsToday) || 0);
          totals['homeDropsTotal'] =
            (totals['homeDropsTotal'] || 0) + (Number(kpi.homeDropsToday) || 0);
          totals['homesConnectedTotal'] =
            (totals['homesConnectedTotal'] || 0) + (Number(kpi.homesConnectedToday) || 0);
        });

        console.log('Calculated totals from all entries:', totals);

        // Simply set the totals in the form
        this.kpiDefinitions.forEach((def) => {
          this.kpiForm.patchValue(
            {
              [def.totalField]: totals[def.totalField] || 0,
            },
            { emitEvent: false },
          );
        });

        // Set home totals
        this.kpiForm.patchValue(
          {
            homeSignupsTotal: totals['homeSignupsTotal'] || 0,
            homeDropsTotal: totals['homeDropsTotal'] || 0,
            homesConnectedTotal: totals['homesConnectedTotal'] || 0,
          },
          { emitEvent: false },
        );

        // Store for use in updateTotal
        this.cumulativeTotals = totals;
      },
      error: (error) => {
        console.error('Error loading KPIs:', error);
      },
    });
  }

  private loadExistingKPIData() {
    if (this.isLoadingData) {
      console.log('Already loading data, skipping duplicate load');
      return;
    }

    const projectId = this.kpiForm.get('projectId')?.value;
    const currentDate = this.kpiForm.get('date')?.value;

    console.log('Loading existing KPI data for:', { projectId, currentDate });

    if (!projectId || !currentDate) {
      console.log('Missing projectId or date, skipping load');
      return;
    }

    this.isLoadingData = true;
    const dateToQuery = new Date(currentDate);
    console.log('Querying KPIs for date:', dateToQuery.toISOString());

    this.loading.set(true);
    this.kpisService.getKPIsByProjectAndDate(projectId, dateToQuery).subscribe({
      next: (kpis) => {
        this.loading.set(false);
        console.log('KPIs loaded:', kpis);

        if (kpis.length > 0) {
          // Load the first (most recent) KPI for this date
          this.currentKPI = kpis[0];
          console.log('Found existing KPI, loading into form:', this.currentKPI);
          this.loadFormWithKPIData(this.currentKPI);
          this.snackBar.open('Loaded existing KPI data for this date', 'Close', { duration: 2000 });
        } else {
          // No existing data, but keep cumulative totals
          console.log('No existing KPI data found for this date');
          this.currentKPI = null;
          // Don't reset form - keep the cumulative totals
          this.resetFormValues(true); // Pass true to keep totals
        }

        // Load cumulative totals once
        this.loadCumulativeTotals();

        setTimeout(() => {
          this.isLoadingData = false;
        }, 500);
      },
      error: (error) => {
        this.loading.set(false);
        this.isLoadingData = false;
        console.error('Error loading existing KPI data:', error);
        this.currentKPI = null;
      },
    });
  }

  private loadFormWithKPIData(kpi: DailyKPIs) {
    // Preserve the current projectId and date
    const currentProjectId = this.kpiForm.get('projectId')?.value;
    const currentDate = this.kpiForm.get('date')?.value;

    console.log('Loading form with KPI data:', kpi);

    // Load all KPI values
    const formValues: any = {
      projectId: currentProjectId,
      contractorId: kpi.contractorId || '',
      date: currentDate,
      comments: kpi.comments || '',
      riskFlag: kpi.riskFlag || false,
      weeklyReportDetails: kpi.weeklyReportDetails || '',
      keyIssuesSummary: kpi.keyIssuesSummary || '',
    };

    // Load only TODAY values - totals will be recalculated
    this.kpiDefinitions.forEach((kpiDef) => {
      formValues[kpiDef.todayField] = kpi[kpiDef.todayField as keyof DailyKPIs] || 0;
      // Don't load totals - they will be recalculated from cumulative data
    });

    // Load home-related today fields only
    formValues['homeSignupsToday'] = kpi.homeSignupsToday || 0;
    formValues['homeDropsToday'] = kpi.homeDropsToday || 0;
    formValues['homesConnectedToday'] = kpi.homesConnectedToday || 0;

    console.log('Form values to patch (today values only):', formValues);
    this.kpiForm.patchValue(formValues, { emitEvent: false });
  }

  private resetFormValues(keepTotals: boolean = false) {
    // Reset all KPI values to 0 while preserving project and date
    const currentProjectId = this.kpiForm.get('projectId')?.value;
    const currentDate = this.kpiForm.get('date')?.value;

    const resetValues: any = {
      projectId: currentProjectId,
      contractorId: '',
      date: currentDate,
      comments: '',
      riskFlag: false,
      weeklyReportDetails: '',
      keyIssuesSummary: '',
    };

    // Reset all KPI fields
    this.kpiDefinitions.forEach((kpiDef) => {
      resetValues[kpiDef.todayField] = 0;
      if (!keepTotals) {
        resetValues[kpiDef.totalField] = 0;
      }
    });

    resetValues['homeSignupsToday'] = 0;
    resetValues['homeDropsToday'] = 0;
    resetValues['homesConnectedToday'] = 0;

    if (!keepTotals) {
      resetValues['homeSignupsTotal'] = 0;
      resetValues['homeDropsTotal'] = 0;
      resetValues['homesConnectedTotal'] = 0;
    }

    this.kpiForm.patchValue(resetValues);
  }

  copyPreviousDay() {
    // Use cumulative totals
    if (!this.cumulativeTotals || Object.keys(this.cumulativeTotals).length === 0) {
      this.snackBar.open('No previous data found. Loading...', 'Close', { duration: 3000 });
      this.loadCumulativeTotals();
      return;
    }

    // Copy cumulative totals
    this.kpiDefinitions.forEach((kpiDef) => {
      this.kpiForm.patchValue({
        [kpiDef.totalField]: this.cumulativeTotals[kpiDef.totalField] || 0,
        [kpiDef.todayField]: 0, // Reset today's values
      });
    });

    // Also copy home-related fields
    this.kpiForm.patchValue({
      homeSignupsTotal: this.cumulativeTotals['homeSignupsTotal'] || 0,
      homeDropsTotal: this.cumulativeTotals['homeDropsTotal'] || 0,
      homesConnectedTotal: this.cumulativeTotals['homesConnectedTotal'] || 0,
      homeSignupsToday: 0,
      homeDropsToday: 0,
      homesConnectedToday: 0,
    });

    this.snackBar.open('Previous totals loaded', 'Close', { duration: 2000 });
  }

  updateTotal(kpiDef: KPIDefinition) {
    // Don't auto-update - totals are calculated from the sum of all entries
    // This is just a placeholder for the (input) event
  }

  updateHomeTotal(homeType: 'homeSignups' | 'homeDrops' | 'homesConnected') {
    // Don't auto-update - totals are calculated from the sum of all entries
    // This is just a placeholder for the (input) event
  }

  saveDraft() {
    // TODO: Implement draft saving to local storage
    const formData = this.kpiForm.value;
    localStorage.setItem('kpi-draft', JSON.stringify(formData));
    this.snackBar.open('Draft saved', 'Close', { duration: 2000 });
  }

  onSubmit() {
    if (this.kpiForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    const projectId = this.kpiForm.get('projectId')?.value;
    if (!projectId) {
      this.snackBar.open('Please select a project', 'Close', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    const user = this.authService.getCurrentUser();

    if (this.currentKPI && this.currentKPI.id) {
      // Update existing KPI - only save today values and metadata
      const formValues = this.kpiForm.value;
      const selectedContractor = this.contractors().find((c) => c.id === formValues.contractorId);
      const updates: any = {
        projectId: formValues.projectId,
        contractorId: formValues.contractorId || '',
        contractorName: selectedContractor?.companyName || '',
        date: formValues.date,
        comments: formValues.comments || '',
        riskFlag: formValues.riskFlag || false,
        weeklyReportDetails: formValues.weeklyReportDetails || '',
        keyIssuesSummary: formValues.keyIssuesSummary || '',
        submittedBy: user?.uid || 'unknown',
        submittedByName: user?.displayName || 'Unknown User',
        submittedAt: new Date(),
        updatedAt: new Date(),
      };

      // Only update "today" values, not totals
      this.kpiDefinitions.forEach((def) => {
        updates[def.todayField] = formValues[def.todayField] || 0;
      });

      // Update home today values
      updates.homeSignupsToday = formValues.homeSignupsToday || 0;
      updates.homeDropsToday = formValues.homeDropsToday || 0;
      updates.homesConnectedToday = formValues.homesConnectedToday || 0;

      console.log('Updating KPI data:', this.currentKPI.id, updates);

      this.kpisService.updateKPI(projectId, this.currentKPI.id, updates).subscribe({
        next: () => {
          this.loading.set(false);
          console.log('KPI updated successfully');
          this.snackBar.open('Daily KPIs updated successfully!', 'Close', { duration: 3000 });

          // Clear draft
          localStorage.removeItem('kpi-draft');

          // Reload the data to ensure we have the latest
          this.loadExistingKPIData();
        },
        error: (error) => {
          this.loading.set(false);
          console.error('Error updating KPI:', error);
          this.snackBar.open('Error updating KPIs. Please try again.', 'Close', { duration: 5000 });
        },
      });
    } else {
      // Create new KPI - only save today values and metadata
      const formValues = this.kpiForm.value;
      const selectedContractor = this.contractors().find((c) => c.id === formValues.contractorId);
      const kpiData: any = {
        projectId: formValues.projectId,
        contractorId: formValues.contractorId || '',
        contractorName: selectedContractor?.companyName || '',
        date: formValues.date,
        comments: formValues.comments || '',
        riskFlag: formValues.riskFlag || false,
        weeklyReportDetails: formValues.weeklyReportDetails || '',
        keyIssuesSummary: formValues.keyIssuesSummary || '',
        submittedBy: user?.uid || 'unknown',
        submittedByName: user?.displayName || 'Unknown User',
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Only save "today" values, not totals
      this.kpiDefinitions.forEach((def) => {
        kpiData[def.todayField] = formValues[def.todayField] || 0;
      });

      // Save home today values
      kpiData.homeSignupsToday = formValues.homeSignupsToday || 0;
      kpiData.homeDropsToday = formValues.homeDropsToday || 0;
      kpiData.homesConnectedToday = formValues.homesConnectedToday || 0;

      console.log('Saving KPI data to project:', projectId, kpiData);

      this.kpisService.createKPI(projectId, kpiData).subscribe({
        next: (kpiId) => {
          this.loading.set(false);
          console.log('KPI saved successfully with ID:', kpiId);
          this.snackBar.open('Daily KPIs submitted successfully!', 'Close', { duration: 3000 });

          // Clear draft
          localStorage.removeItem('kpi-draft');

          // Reload the data to ensure we have the latest
          this.loadExistingKPIData();
        },
        error: (error) => {
          this.loading.set(false);
          console.error('Error saving KPI:', error);
          this.snackBar.open('Error saving KPIs. Please try again.', 'Close', { duration: 5000 });
        },
      });
    }
  }

  // Helper methods to categorize KPIs
  getCoreKPIs() {
    return this.kpiDefinitions.filter((kpi) =>
      ['permissions', 'status', 'poles'].includes(kpi.category),
    );
  }

  getCivilsKPIs() {
    return this.kpiDefinitions.filter((kpi) => kpi.category === 'civils');
  }

  getStringingKPIs() {
    return this.kpiDefinitions.filter((kpi) => kpi.category === 'stringing');
  }
}
