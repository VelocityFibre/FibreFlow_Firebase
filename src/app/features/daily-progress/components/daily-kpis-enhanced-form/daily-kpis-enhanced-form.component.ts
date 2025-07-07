import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatSliderModule } from '@angular/material/slider';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { debounceTime } from 'rxjs/operators';

import { DailyKPIs, KPI_DEFINITIONS, KPIDefinition } from '../../models/daily-kpis.model';
import { DailyKpisService } from '../../services/daily-kpis.service';
import { ProjectService } from '../../../../core/services/project.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Project } from '../../../../core/models/project.model';
import { ContractorService } from '../../../contractors/services/contractor.service';
import { Contractor } from '../../../contractors/models/contractor.model';
import { StaffService } from '../../../staff/services/staff.service';
import { StaffMember } from '../../../staff/models/staff.model';

@Component({
  selector: 'app-daily-kpis-enhanced-form',
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
    MatTabsModule,
    MatSlideToggleModule,
    MatExpansionModule,
    MatChipsModule,
    MatSliderModule,
    MatDividerModule,
  ],
  template: `
    <div class="enhanced-kpis-form-container">
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>Enhanced Daily KPIs Update</mat-card-title>
          <mat-card-subtitle>{{ selectedDate() | date: 'fullDate' }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
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

              <!-- Tabs for different sections -->
              <mat-tab-group animationDuration="0ms">
                <!-- Core KPIs Tab -->
                <mat-tab label="Core Activities">
                  <div class="tab-content">
                    <!-- Existing Core KPIs -->
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
                      <h3 class="section-title">🚧 Civils & Stringing</h3>
                      <div class="kpis-grid">
                        @for (kpiDef of getAllCivilsAndStringingKPIs(); track kpiDef.key) {
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
                  </div>
                </mat-tab>

                <!-- Weather & Safety Tab -->
                <mat-tab label="Weather & Safety">
                  <div class="tab-content">
                    <div class="form-row">
                      <!-- Weather Section -->
                      <mat-card class="section-card">
                        <mat-card-header>
                          <mat-card-title>🌤️ Weather Conditions</mat-card-title>
                        </mat-card-header>
                        <mat-card-content>
                          <mat-form-field appearance="outline" class="full-width">
                            <mat-label>Weather Conditions</mat-label>
                            <mat-select formControlName="weatherConditions">
                              <mat-option value="sunny">☀️ Sunny</mat-option>
                              <mat-option value="cloudy">☁️ Cloudy</mat-option>
                              <mat-option value="rainy">🌧️ Rainy</mat-option>
                              <mat-option value="stormy">⛈️ Stormy</mat-option>
                              <mat-option value="windy">💨 Windy</mat-option>
                              <mat-option value="foggy">🌫️ Foggy</mat-option>
                            </mat-select>
                          </mat-form-field>

                          <div class="slider-field">
                            <label>Weather Impact on Work (0-10)</label>
                            <mat-slider min="0" max="10" step="1" discrete>
                              <input matSliderThumb formControlName="weatherImpact" />
                            </mat-slider>
                            <span class="slider-value">{{
                              kpiForm.get('weatherImpact')?.value || 0
                            }}</span>
                          </div>

                          <div class="temperature-range">
                            <mat-form-field appearance="outline">
                              <mat-label>Min Temperature (°C)</mat-label>
                              <input matInput type="number" formControlName="temperatureMin" />
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                              <mat-label>Max Temperature (°C)</mat-label>
                              <input matInput type="number" formControlName="temperatureMax" />
                            </mat-form-field>
                          </div>
                        </mat-card-content>
                      </mat-card>

                      <!-- Safety Section -->
                      <mat-card class="section-card">
                        <mat-card-header>
                          <mat-card-title>🦺 Safety & Compliance</mat-card-title>
                        </mat-card-header>
                        <mat-card-content>
                          <div class="safety-grid">
                            <mat-form-field appearance="outline">
                              <mat-label>Safety Incidents</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                formControlName="safetyIncidents"
                              />
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                              <mat-label>Near Misses</mat-label>
                              <input matInput type="number" min="0" formControlName="nearMisses" />
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                              <mat-label>Toolbox Talks</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                formControlName="toolboxTalks"
                              />
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                              <mat-label>Safety Observations</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                formControlName="safetyObservations"
                              />
                            </mat-form-field>
                          </div>

                          <div class="slider-field">
                            <label>Compliance Score (%)</label>
                            <mat-slider min="0" max="100" step="5" discrete>
                              <input matSliderThumb formControlName="complianceScore" />
                            </mat-slider>
                            <span class="slider-value"
                              >{{ kpiForm.get('complianceScore')?.value || 0 }}%</span
                            >
                          </div>
                        </mat-card-content>
                      </mat-card>
                    </div>
                  </div>
                </mat-tab>

                <!-- Quality & Resources Tab -->
                <mat-tab label="Quality & Resources">
                  <div class="tab-content">
                    <div class="form-row">
                      <!-- Quality Metrics -->
                      <mat-card class="section-card">
                        <mat-card-header>
                          <mat-card-title>✅ Quality Metrics</mat-card-title>
                        </mat-card-header>
                        <mat-card-content>
                          <div class="quality-grid">
                            <mat-form-field appearance="outline">
                              <mat-label>Quality Issues</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                formControlName="qualityIssues"
                              />
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                              <mat-label>Rework Required</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                formControlName="reworkRequired"
                              />
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                              <mat-label>Inspections Passed</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                formControlName="inspectionsPassed"
                              />
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                              <mat-label>Inspections Failed</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                formControlName="inspectionsFailed"
                              />
                            </mat-form-field>
                          </div>
                        </mat-card-content>
                      </mat-card>

                      <!-- Resource Utilization -->
                      <mat-card class="section-card">
                        <mat-card-header>
                          <mat-card-title>👥 Resource Utilization</mat-card-title>
                        </mat-card-header>
                        <mat-card-content>
                          <div class="resource-grid">
                            <mat-form-field appearance="outline">
                              <mat-label>Team Size</mat-label>
                              <input matInput type="number" min="0" formControlName="teamSize" />
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                              <mat-label>Regular Hours</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                formControlName="regularHours"
                              />
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                              <mat-label>Overtime Hours</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                formControlName="overtimeHours"
                              />
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                              <mat-label>Vehicles Used</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0"
                                formControlName="vehiclesUsed"
                              />
                            </mat-form-field>
                          </div>

                          <div class="slider-field">
                            <label>Equipment Utilization (%)</label>
                            <mat-slider min="0" max="100" step="5" discrete>
                              <input matSliderThumb formControlName="equipmentUtilization" />
                            </mat-slider>
                            <span class="slider-value"
                              >{{ kpiForm.get('equipmentUtilization')?.value || 0 }}%</span
                            >
                          </div>
                        </mat-card-content>
                      </mat-card>
                    </div>
                  </div>
                </mat-tab>

                <!-- Financial Tab -->
                <mat-tab label="Financial">
                  <div class="tab-content">
                    <mat-card class="section-card full-width">
                      <mat-card-header>
                        <mat-card-title>💰 Daily Financial Tracking</mat-card-title>
                      </mat-card-header>
                      <mat-card-content>
                        <div class="financial-grid">
                          <mat-form-field appearance="outline">
                            <mat-label>Labor Cost Today</mat-label>
                            <input
                              matInput
                              type="number"
                              min="0"
                              formControlName="laborCostToday"
                            />
                            <span matPrefix>R&nbsp;</span>
                          </mat-form-field>
                          <mat-form-field appearance="outline">
                            <mat-label>Material Cost Today</mat-label>
                            <input
                              matInput
                              type="number"
                              min="0"
                              formControlName="materialCostToday"
                            />
                            <span matPrefix>R&nbsp;</span>
                          </mat-form-field>
                          <mat-form-field appearance="outline">
                            <mat-label>Equipment Cost Today</mat-label>
                            <input
                              matInput
                              type="number"
                              min="0"
                              formControlName="equipmentCostToday"
                            />
                            <span matPrefix>R&nbsp;</span>
                          </mat-form-field>
                          <mat-form-field appearance="outline">
                            <mat-label>Total Cost Today</mat-label>
                            <input
                              matInput
                              type="number"
                              formControlName="totalCostToday"
                              readonly
                            />
                            <span matPrefix>R&nbsp;</span>
                            <mat-hint>Auto-calculated</mat-hint>
                          </mat-form-field>
                        </div>

                        <mat-divider class="my-3"></mat-divider>

                        <div class="productivity-section">
                          <h4>Productivity Metrics</h4>
                          <div class="slider-field">
                            <label>Overall Productivity Score (%)</label>
                            <mat-slider min="0" max="100" step="5" discrete>
                              <input matSliderThumb formControlName="productivityScore" />
                            </mat-slider>
                            <span class="slider-value"
                              >{{ kpiForm.get('productivityScore')?.value || 0 }}%</span
                            >
                          </div>
                        </div>
                      </mat-card-content>
                    </mat-card>
                  </div>
                </mat-tab>

                <!-- Team Members Tab -->
                <mat-tab label="Team Members">
                  <div class="tab-content">
                    <mat-card class="section-card full-width">
                      <mat-card-header>
                        <mat-card-title>👷 Team Members Present</mat-card-title>
                        <button mat-icon-button type="button" (click)="addTeamMember()">
                          <mat-icon>add</mat-icon>
                        </button>
                      </mat-card-header>
                      <mat-card-content>
                        <div formArrayName="teamMembers">
                          @for (member of teamMembersArray.controls; track $index) {
                            <div [formGroupName]="$index" class="team-member-row">
                              <mat-form-field appearance="outline">
                                <mat-label>Team Member</mat-label>
                                <mat-select formControlName="id">
                                  @for (staff of staffMembers(); track staff.id) {
                                    <mat-option [value]="staff.id">{{ staff.name }}</mat-option>
                                  }
                                </mat-select>
                              </mat-form-field>
                              <mat-form-field appearance="outline">
                                <mat-label>Role</mat-label>
                                <input matInput formControlName="role" />
                              </mat-form-field>
                              <mat-form-field appearance="outline">
                                <mat-label>Hours Worked</mat-label>
                                <input
                                  matInput
                                  type="number"
                                  min="0"
                                  max="24"
                                  formControlName="hoursWorked"
                                />
                              </mat-form-field>
                              <button
                                mat-icon-button
                                type="button"
                                (click)="removeTeamMember($index)"
                              >
                                <mat-icon>delete</mat-icon>
                              </button>
                            </div>
                          }
                        </div>
                      </mat-card-content>
                    </mat-card>
                  </div>
                </mat-tab>

                <!-- Comments & Risk Tab -->
                <mat-tab label="Comments & Risk">
                  <div class="tab-content">
                    <mat-card class="section-card full-width">
                      <mat-card-header>
                        <mat-card-title>📝 Additional Information</mat-card-title>
                      </mat-card-header>
                      <mat-card-content>
                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Comments</mat-label>
                          <textarea matInput formControlName="comments" rows="4"></textarea>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Key Issues Summary</mat-label>
                          <textarea matInput formControlName="keyIssuesSummary" rows="3"></textarea>
                        </mat-form-field>

                        <div class="risk-section">
                          <mat-slide-toggle formControlName="riskFlag" color="warn">
                            Risk Flag - Check if there are significant risks
                          </mat-slide-toggle>
                        </div>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Weekly Report Details</mat-label>
                          <textarea
                            matInput
                            formControlName="weeklyReportDetails"
                            rows="3"
                          ></textarea>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Weekly Report Insights</mat-label>
                          <textarea
                            matInput
                            formControlName="weeklyReportInsights"
                            rows="3"
                          ></textarea>
                        </mat-form-field>
                      </mat-card-content>
                    </mat-card>
                  </div>
                </mat-tab>
              </mat-tab-group>

              <!-- Submit Buttons -->
              <div class="form-actions">
                <button mat-raised-button type="button" (click)="cancel()">Cancel</button>
                <button
                  mat-raised-button
                  color="primary"
                  type="submit"
                  [disabled]="loading() || kpiForm.invalid"
                >
                  @if (loading()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <mat-icon>save</mat-icon>
                    Save KPIs
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
      .enhanced-kpis-form-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .header-card {
        margin-bottom: 24px;
      }

      .form-header {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        flex-wrap: wrap;
        margin-bottom: 24px;
      }

      .form-header mat-form-field {
        flex: 1;
        min-width: 200px;
      }

      .tab-content {
        padding: 24px 0;
      }

      .kpi-section {
        margin-bottom: 32px;
      }

      .section-title {
        margin: 0 0 16px 0;
        color: var(--mat-sys-on-surface);
        font-weight: 500;
      }

      .kpis-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }

      .kpi-card {
        height: 100%;
      }

      .kpi-title {
        font-size: 14px;
        font-weight: 500;
      }

      .kpi-inputs {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }

      .today-field,
      .total-field {
        flex: 1;
      }

      .form-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 24px;
      }

      .section-card {
        height: 100%;
      }

      .section-card.full-width {
        grid-column: 1 / -1;
      }

      .safety-grid,
      .quality-grid,
      .resource-grid,
      .financial-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }

      .temperature-range {
        display: flex;
        gap: 16px;
        margin-top: 16px;
      }

      .temperature-range mat-form-field {
        flex: 1;
      }

      .slider-field {
        margin: 16px 0;
      }

      .slider-field label {
        display: block;
        margin-bottom: 8px;
        color: var(--mat-sys-on-surface-variant);
        font-size: 14px;
      }

      .slider-field mat-slider {
        width: 100%;
      }

      .slider-value {
        display: inline-block;
        margin-left: 16px;
        font-weight: 500;
        color: var(--mat-sys-primary);
      }

      .full-width {
        width: 100%;
      }

      .my-3 {
        margin: 24px 0;
      }

      .productivity-section h4 {
        margin: 16px 0 8px 0;
        color: var(--mat-sys-on-surface);
      }

      .team-member-row {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 16px;
      }

      .team-member-row mat-form-field {
        flex: 1;
      }

      .risk-section {
        margin: 24px 0;
      }

      .form-actions {
        display: flex;
        gap: 16px;
        justify-content: flex-end;
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid var(--mat-sys-outline);
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px;
        gap: 16px;
      }

      mat-spinner {
        margin-right: 8px;
      }

      @media (max-width: 768px) {
        .form-header {
          flex-direction: column;
        }

        .form-header mat-form-field,
        .form-header button {
          width: 100%;
        }

        .kpis-grid {
          grid-template-columns: 1fr;
        }

        .form-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DailyKpisEnhancedFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private kpisService = inject(DailyKpisService);
  private projectService = inject(ProjectService);
  private contractorService = inject(ContractorService);
  private staffService = inject(StaffService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  // Signals
  projects = signal<Project[]>([]);
  contractors = signal<Contractor[]>([]);
  staffMembers = signal<StaffMember[]>([]);
  projectsLoaded = signal(false);
  contractorsLoaded = signal(false);
  loading = signal(false);
  selectedDate = signal(new Date());

  // Form
  kpiForm!: FormGroup;
  kpiDefinitions = KPI_DEFINITIONS;
  cumulativeTotals: any = {};
  private isLoadingData = false;

  ngOnInit() {
    this.initializeForm();
    this.loadProjects();
    this.loadContractors();
    this.loadStaffMembers();
    this.setupFormListeners();
  }

  private initializeForm() {
    // Base form controls
    const formControls: any = {
      projectId: ['', Validators.required],
      contractorId: [''],
      date: [new Date(), Validators.required],
      comments: [''],

      // Weather & Environmental
      weatherConditions: [''],
      weatherImpact: [0],
      temperatureMin: [null],
      temperatureMax: [null],

      // Safety & Compliance
      safetyIncidents: [0, [Validators.min(0)]],
      nearMisses: [0, [Validators.min(0)]],
      toolboxTalks: [0, [Validators.min(0)]],
      safetyObservations: [0, [Validators.min(0)]],
      complianceScore: [100, [Validators.min(0), Validators.max(100)]],

      // Quality Metrics
      qualityIssues: [0, [Validators.min(0)]],
      reworkRequired: [0, [Validators.min(0)]],
      inspectionsPassed: [0, [Validators.min(0)]],
      inspectionsFailed: [0, [Validators.min(0)]],

      // Resource Utilization
      teamSize: [0, [Validators.min(0)]],
      teamMembers: this.fb.array([]),
      regularHours: [0, [Validators.min(0)]],
      overtimeHours: [0, [Validators.min(0)]],
      equipmentUtilization: [0, [Validators.min(0), Validators.max(100)]],
      vehiclesUsed: [0, [Validators.min(0)]],

      // Financial Tracking
      laborCostToday: [0, [Validators.min(0)]],
      materialCostToday: [0, [Validators.min(0)]],
      equipmentCostToday: [0, [Validators.min(0)]],
      totalCostToday: [0, [Validators.min(0)]],

      // Productivity Metrics
      productivityScore: [0, [Validators.min(0), Validators.max(100)]],

      // Risk and Reports
      riskFlag: [false],
      weeklyReportDetails: [''],
      keyIssuesSummary: [''],
      weeklyReportInsights: [''],
      monthlyReports: [''],
    };

    // Add all existing KPI fields
    this.kpiDefinitions.forEach((kpiDef) => {
      formControls[kpiDef.todayField] = [0, [Validators.min(0)]];
      formControls[kpiDef.totalField] = [0, [Validators.min(0)]];
    });

    // Add home-related fields
    formControls['homeSignupsToday'] = [0, [Validators.min(0)]];
    formControls['homeSignupsTotal'] = [0, [Validators.min(0)]];
    formControls['homeDropsToday'] = [0, [Validators.min(0)]];
    formControls['homeDropsTotal'] = [0, [Validators.min(0)]];
    formControls['homesConnectedToday'] = [0, [Validators.min(0)]];
    formControls['homesConnectedTotal'] = [0, [Validators.min(0)]];

    this.kpiForm = this.fb.group(formControls);
  }

  private setupFormListeners() {
    // Calculate total cost when individual costs change
    ['laborCostToday', 'materialCostToday', 'equipmentCostToday'].forEach((field) => {
      this.kpiForm.get(field)?.valueChanges.subscribe(() => {
        this.calculateTotalCost();
      });
    });

    // Temperature range
    this.kpiForm.get('temperatureMin')?.valueChanges.subscribe((min) => {
      if (min !== null && min !== undefined) {
        const max = this.kpiForm.get('temperatureMax')?.value;
        if (max !== null && min > max) {
          this.kpiForm.patchValue({ temperatureMax: min });
        }
      }
    });

    // Watch for date/project changes
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

  private calculateTotalCost() {
    const labor = this.kpiForm.get('laborCostToday')?.value || 0;
    const material = this.kpiForm.get('materialCostToday')?.value || 0;
    const equipment = this.kpiForm.get('equipmentCostToday')?.value || 0;
    const total = labor + material + equipment;
    this.kpiForm.patchValue({ totalCostToday: total }, { emitEvent: false });
  }

  get teamMembersArray() {
    return this.kpiForm.get('teamMembers') as FormArray;
  }

  addTeamMember() {
    const memberGroup = this.fb.group({
      id: ['', Validators.required],
      name: [''],
      role: [''],
      hoursWorked: [8, [Validators.min(0), Validators.max(24)]],
    });

    // Update name when staff member is selected
    memberGroup.get('id')?.valueChanges.subscribe((id) => {
      const staff = this.staffMembers().find((s) => s.id === id);
      if (staff) {
        memberGroup.patchValue({
          name: staff.name,
          role: staff.primaryGroup,
        });
      }
    });

    this.teamMembersArray.push(memberGroup);
  }

  removeTeamMember(index: number) {
    this.teamMembersArray.removeAt(index);
  }

  private loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.projectsLoaded.set(true);
        if (projects.length === 1 && projects[0].id) {
          this.kpiForm.patchValue({ projectId: projects[0].id }, { emitEvent: false });
          setTimeout(() => this.loadExistingKPIData(), 200);
        }
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.projectsLoaded.set(true);
        this.snackBar.open('Error loading projects', 'Close', { duration: 3000 });
      },
    });
  }

  private loadContractors() {
    this.contractorService.getActiveContractors().subscribe({
      next: (contractors) => {
        this.contractors.set(contractors);
        this.contractorsLoaded.set(true);
      },
      error: (error) => {
        this.contractorsLoaded.set(true);
        this.snackBar.open('Error loading contractors', 'Close', { duration: 3000 });
      },
    });
  }

  private loadStaffMembers() {
    this.staffService.getStaff().subscribe({
      next: (staff) => {
        this.staffMembers.set(staff);
      },
      error: (error) => {
        console.error('Error loading staff:', error);
      },
    });
  }

  private updateSelectedDate() {
    const dateValue = this.kpiForm.get('date')?.value;
    if (dateValue) {
      this.selectedDate.set(new Date(dateValue));
    }
  }

  private loadExistingKPIData() {
    // Similar implementation to original component
    // Load existing data for the selected date and populate form
  }

  copyPreviousDay() {
    // Implementation to copy previous day's data
    const projectId = this.kpiForm.get('projectId')?.value;
    const currentDate = new Date(this.kpiForm.get('date')?.value);
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);

    if (!projectId) return;

    this.loading.set(true);
    this.kpisService.getKPIsByProjectAndDate(projectId, previousDate).subscribe({
      next: (kpis) => {
        if (kpis.length > 0) {
          const previousKpi = kpis[0];
          // Copy relevant fields but not totals
          const fieldsToCopy = [
            'contractorId',
            'weatherConditions',
            'weatherImpact',
            'teamSize',
            'equipmentUtilization',
            'productivityScore',
          ];

          const valuesToCopy: any = {};
          fieldsToCopy.forEach((field) => {
            if (previousKpi[field as keyof DailyKPIs] !== undefined) {
              valuesToCopy[field] = previousKpi[field as keyof DailyKPIs];
            }
          });

          this.kpiForm.patchValue(valuesToCopy);
          this.snackBar.open('Previous day data copied', 'Close', { duration: 2000 });
        } else {
          this.snackBar.open('No data found for previous day', 'Close', { duration: 2000 });
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error copying previous day:', error);
        this.loading.set(false);
        this.snackBar.open('Error copying previous day data', 'Close', { duration: 3000 });
      },
    });
  }

  updateTotal(kpiDef: KPIDefinition) {
    // Similar to original implementation
    const todayValue = Number(this.kpiForm.get(kpiDef.todayField)?.value) || 0;
    const currentTotal = Number(this.kpiForm.get(kpiDef.totalField)?.value) || 0;

    this.kpiForm.patchValue({
      [kpiDef.totalField]: currentTotal + todayValue,
    });
  }

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

  getAllCivilsAndStringingKPIs() {
    return [...this.getCivilsKPIs(), ...this.getStringingKPIs()];
  }

  async onSubmit() {
    if (this.kpiForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    const currentUser = await this.authService.getCurrentUser();

    // Prepare temperature range
    const tempMin = this.kpiForm.get('temperatureMin')?.value;
    const tempMax = this.kpiForm.get('temperatureMax')?.value;
    const temperatureRange =
      tempMin !== null && tempMax !== null ? { min: tempMin, max: tempMax } : undefined;

    // Prepare KPI data
    const kpiData: DailyKPIs = {
      ...this.kpiForm.value,
      temperatureRange,
      submittedBy: currentUser?.uid || 'unknown',
      submittedByName: currentUser?.displayName || currentUser?.email || 'Unknown User',
      submittedAt: new Date(),
      date: new Date(this.kpiForm.get('date')?.value),
    };

    // Get project and contractor names
    const project = this.projects().find((p) => p.id === kpiData.projectId);
    const contractor = this.contractors().find((c) => c.id === kpiData.contractorId);

    if (project) kpiData.projectName = project.name;
    if (contractor) kpiData.contractorName = contractor.companyName;

    this.kpisService.createKPI(kpiData.projectId!, kpiData).subscribe({
      next: (result: any) => {
        this.loading.set(false);
        this.snackBar.open('KPIs saved successfully!', 'Close', { duration: 3000 });
        this.router.navigate(['/daily-progress/kpis-summary']);
      },
      error: (error: any) => {
        this.loading.set(false);
        console.error('Error saving KPIs:', error);
        this.snackBar.open('Error saving KPIs', 'Close', { duration: 3000 });
      },
    });
  }

  cancel() {
    this.router.navigate(['/daily-progress/kpis-summary']);
  }
}
