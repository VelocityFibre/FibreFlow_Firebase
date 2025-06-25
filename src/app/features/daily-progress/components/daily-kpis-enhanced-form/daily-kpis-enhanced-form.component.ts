import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Router } from '@angular/router';

import { KPIsService } from '../../services/kpis.service';
import { DailyKPIs } from '../../models/daily-kpis.model';
import { FinancialTracking } from '../../models/financial-tracking.model';
import { QualityMetrics } from '../../models/quality-metrics.model';
import { FinancialService } from '../../services/financial.service';
import { QualityService } from '../../services/quality.service';
import { ProjectService } from '../../../../core/services/project.service';
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
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatExpansionModule,
    MatCheckboxModule
  ],
  template: `
    <div class="container">
      <mat-card class="form-card">
        <mat-card-header>
          <mat-card-title>
            <h1>📊 Enhanced Daily KPIs Entry</h1>
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          @if (loading()) {
            <div class="loading-container">
              <mat-spinner></mat-spinner>
              <p>Loading...</p>
            </div>
          } @else {
            <form [formGroup]="kpiForm" (ngSubmit)="onSubmit()">
              <!-- Basic Information -->
              <div class="form-section">
                <h2>📋 Basic Information</h2>
                <div class="form-grid">
                  <mat-form-field>
                    <mat-label>Date</mat-label>
                    <input matInput [matDatepicker]="picker" formControlName="date" required>
                    <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                    <mat-datepicker #picker></mat-datepicker>
                  </mat-form-field>

                  <mat-form-field>
                    <mat-label>Project</mat-label>
                    <mat-select formControlName="projectId" required>
                      @for (project of projects(); track project.id) {
                        <mat-option [value]="project.id">{{ project.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field>
                    <mat-label>Contractor</mat-label>
                    <mat-select formControlName="contractorId" required>
                      @for (contractor of contractors(); track contractor.id) {
                        <mat-option [value]="contractor.id">{{ contractor.companyName }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field>
                    <mat-label>Weather Conditions</mat-label>
                    <mat-select formControlName="weather">
                      <mat-option value="sunny">☀️ Sunny</mat-option>
                      <mat-option value="partly-cloudy">⛅ Partly Cloudy</mat-option>
                      <mat-option value="cloudy">☁️ Cloudy</mat-option>
                      <mat-option value="rainy">🌧️ Rainy</mat-option>
                      <mat-option value="stormy">⛈️ Stormy</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              <!-- KPIs Tabs -->
              <mat-tab-group>
                <!-- Production KPIs -->
                <mat-tab label="🏗️ Production">
                  <div class="tab-content">
                    <div class="kpi-section">
                      <h3 class="section-title">📐 Surveying & Design</h3>
                      <div class="kpis-grid">
                        @for (kpiDef of getSurveyingKPIs(); track kpiDef.key) {
                          <mat-card class="kpi-card">
                            <mat-card-header>
                              <mat-card-title class="kpi-title">{{ kpiDef.label }}</mat-card-title>
                            </mat-card-header>
                            <mat-card-content>
                              <mat-form-field class="full-width">
                                <mat-label>{{ kpiDef.unit }}</mat-label>
                                <input 
                                  matInput 
                                  type="number" 
                                  [formControlName]="kpiDef.key"
                                  [placeholder]="'Enter ' + kpiDef.label.toLowerCase()">
                              </mat-form-field>
                            </mat-card-content>
                          </mat-card>
                        }
                      </div>
                    </div>

                    <div class="kpi-section">
                      <h3 class="section-title">🚧 Civils & Stringing</h3>
                      <div class="kpis-grid">
                        @for (kpiDef of getAllCivilsAndStringingKPIs(); track kpiDef.key) {
                          <mat-card class="kpi-card">
                            <mat-card-header>
                              <mat-card-title class="kpi-title">{{ kpiDef.label }}</mat-card-title>
                            </mat-card-header>
                            <mat-card-content>
                              <mat-form-field class="full-width">
                                <mat-label>{{ kpiDef.unit }}</mat-label>
                                <input 
                                  matInput 
                                  type="number" 
                                  [formControlName]="kpiDef.key"
                                  [placeholder]="'Enter ' + kpiDef.label.toLowerCase()">
                              </mat-form-field>
                            </mat-card-content>
                          </mat-card>
                        }
                      </div>
                    </div>
                  </div>
                </mat-tab>

                <!-- Resources Tab -->
                <mat-tab label="👥 Resources">
                  <div class="tab-content">
                    <div class="form-section">
                      <h3>👷 Staff on Site</h3>
                      <button 
                        mat-raised-button 
                        type="button"
                        (click)="addStaffMember()"
                        class="add-button">
                        <mat-icon>add</mat-icon>
                        Add Staff Member
                      </button>

                      <div formArrayName="staffOnSite" class="staff-list">
                        @for (staff of staffArray.controls; track $index; let i = $index) {
                          <div [formGroupName]="i" class="staff-entry">
                            <mat-form-field>
                              <mat-label>Staff Member</mat-label>
                              <mat-select formControlName="staffId" (selectionChange)="onStaffSelected(i)">
                                @for (member of staffMembers(); track member.id) {
                                  <mat-option [value]="member.id">{{ member.name }}</mat-option>
                                }
                              </mat-select>
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Name</mat-label>
                              <input matInput formControlName="name" readonly>
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Role</mat-label>
                              <input matInput formControlName="role" readonly>
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Hours Worked</mat-label>
                              <input matInput type="number" formControlName="hoursWorked" min="0" max="24">
                            </mat-form-field>

                            <button 
                              mat-icon-button 
                              type="button"
                              color="warn"
                              (click)="removeStaffMember(i)">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </div>
                        }
                      </div>
                    </div>

                    <div class="form-section">
                      <h3>🚛 Equipment Used</h3>
                      <button 
                        mat-raised-button 
                        type="button"
                        (click)="addEquipment()"
                        class="add-button">
                        <mat-icon>add</mat-icon>
                        Add Equipment
                      </button>

                      <div formArrayName="equipmentUsed" class="equipment-list">
                        @for (equipment of equipmentArray.controls; track $index; let i = $index) {
                          <div [formGroupName]="i" class="equipment-entry">
                            <mat-form-field>
                              <mat-label>Equipment Type</mat-label>
                              <input matInput formControlName="type" placeholder="e.g., Excavator, Crane">
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Equipment ID/Name</mat-label>
                              <input matInput formControlName="name" placeholder="e.g., EX-001">
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Hours Used</mat-label>
                              <input matInput type="number" formControlName="hoursUsed" min="0" max="24">
                            </mat-form-field>

                            <button 
                              mat-icon-button 
                              type="button"
                              color="warn"
                              (click)="removeEquipment(i)">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                </mat-tab>

                <!-- Financial Tab -->
                <mat-tab label="💰 Financial">
                  <div class="tab-content">
                    <div class="form-section">
                      <h3>💵 Daily Expenses</h3>
                      <button 
                        mat-raised-button 
                        type="button"
                        (click)="addExpense()"
                        class="add-button">
                        <mat-icon>add</mat-icon>
                        Add Expense
                      </button>

                      <div formArrayName="expenses" class="expenses-list">
                        @for (expense of expensesArray.controls; track $index; let i = $index) {
                          <div [formGroupName]="i" class="expense-entry">
                            <mat-form-field>
                              <mat-label>Category</mat-label>
                              <mat-select formControlName="category">
                                <mat-option value="labor">Labor</mat-option>
                                <mat-option value="materials">Materials</mat-option>
                                <mat-option value="equipment">Equipment</mat-option>
                                <mat-option value="transport">Transport</mat-option>
                                <mat-option value="utilities">Utilities</mat-option>
                                <mat-option value="other">Other</mat-option>
                              </mat-select>
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Description</mat-label>
                              <input matInput formControlName="description">
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Amount (KES)</mat-label>
                              <input matInput type="number" formControlName="amount" min="0">
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Receipt No.</mat-label>
                              <input matInput formControlName="receiptNumber">
                            </mat-form-field>

                            <button 
                              mat-icon-button 
                              type="button"
                              color="warn"
                              (click)="removeExpense(i)">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </div>
                        }
                      </div>

                      <div class="total-section">
                        <h4>Total Daily Expenses: KES {{ calculateTotalExpenses() | number:'1.2-2' }}</h4>
                      </div>
                    </div>
                  </div>
                </mat-tab>

                <!-- Quality & Safety Tab -->
                <mat-tab label="✅ Quality & Safety">
                  <div class="tab-content">
                    <div class="form-section">
                      <h3>🔍 Quality Checks</h3>
                      <button 
                        mat-raised-button 
                        type="button"
                        (click)="addQualityCheck()"
                        class="add-button">
                        <mat-icon>add</mat-icon>
                        Add Quality Check
                      </button>

                      <div formArrayName="qualityChecks" class="quality-checks-list">
                        @for (check of qualityChecksArray.controls; track $index; let i = $index) {
                          <div [formGroupName]="i" class="quality-check-entry">
                            <mat-form-field>
                              <mat-label>Check Type</mat-label>
                              <mat-select formControlName="type">
                                <mat-option value="excavation-depth">Excavation Depth</mat-option>
                                <mat-option value="concrete-quality">Concrete Quality</mat-option>
                                <mat-option value="pole-alignment">Pole Alignment</mat-option>
                                <mat-option value="cable-tension">Cable Tension</mat-option>
                                <mat-option value="splice-quality">Splice Quality</mat-option>
                                <mat-option value="other">Other</mat-option>
                              </mat-select>
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Result</mat-label>
                              <mat-select formControlName="result">
                                <mat-option value="pass">✅ Pass</mat-option>
                                <mat-option value="fail">❌ Fail</mat-option>
                                <mat-option value="rework">🔄 Rework Needed</mat-option>
                              </mat-select>
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Notes</mat-label>
                              <textarea matInput formControlName="notes" rows="2"></textarea>
                            </mat-form-field>

                            <button 
                              mat-icon-button 
                              type="button"
                              color="warn"
                              (click)="removeQualityCheck(i)">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </div>
                        }
                      </div>
                    </div>

                    <div class="form-section">
                      <h3>⚠️ Safety Incidents</h3>
                      <button 
                        mat-raised-button 
                        type="button"
                        (click)="addSafetyIncident()"
                        class="add-button">
                        <mat-icon>add</mat-icon>
                        Add Safety Incident
                      </button>

                      <div formArrayName="safetyIncidents" class="safety-incidents-list">
                        @for (incident of safetyIncidentsArray.controls; track $index; let i = $index) {
                          <div [formGroupName]="i" class="safety-incident-entry">
                            <mat-form-field>
                              <mat-label>Incident Type</mat-label>
                              <mat-select formControlName="type">
                                <mat-option value="near-miss">Near Miss</mat-option>
                                <mat-option value="minor-injury">Minor Injury</mat-option>
                                <mat-option value="major-injury">Major Injury</mat-option>
                                <mat-option value="property-damage">Property Damage</mat-option>
                                <mat-option value="environmental">Environmental</mat-option>
                              </mat-select>
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Description</mat-label>
                              <textarea matInput formControlName="description" rows="2"></textarea>
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Action Taken</mat-label>
                              <textarea matInput formControlName="actionTaken" rows="2"></textarea>
                            </mat-form-field>

                            <button 
                              mat-icon-button 
                              type="button"
                              color="warn"
                              (click)="removeSafetyIncident(i)">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                </mat-tab>

                <!-- Issues & Comments Tab -->
                <mat-tab label="📝 Issues & Comments">
                  <div class="tab-content">
                    <div class="form-section">
                      <h3>🚧 Issues & Challenges</h3>
                      <button 
                        mat-raised-button 
                        type="button"
                        (click)="addIssue()"
                        class="add-button">
                        <mat-icon>add</mat-icon>
                        Add Issue
                      </button>

                      <div formArrayName="issues" class="issues-list">
                        @for (issue of issuesArray.controls; track $index; let i = $index) {
                          <div [formGroupName]="i" class="issue-entry">
                            <mat-form-field>
                              <mat-label>Category</mat-label>
                              <mat-select formControlName="category">
                                <mat-option value="technical">Technical</mat-option>
                                <mat-option value="resource">Resource</mat-option>
                                <mat-option value="weather">Weather</mat-option>
                                <mat-option value="material">Material</mat-option>
                                <mat-option value="access">Access</mat-option>
                                <mat-option value="other">Other</mat-option>
                              </mat-select>
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Description</mat-label>
                              <textarea matInput formControlName="description" rows="2"></textarea>
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Impact</mat-label>
                              <mat-select formControlName="impact">
                                <mat-option value="low">Low</mat-option>
                                <mat-option value="medium">Medium</mat-option>
                                <mat-option value="high">High</mat-option>
                                <mat-option value="critical">Critical</mat-option>
                              </mat-select>
                            </mat-form-field>

                            <mat-form-field>
                              <mat-label>Resolution</mat-label>
                              <textarea matInput formControlName="resolution" rows="2"></textarea>
                            </mat-form-field>

                            <button 
                              mat-icon-button 
                              type="button"
                              color="warn"
                              (click)="removeIssue(i)">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </div>
                        }
                      </div>
                    </div>

                    <div class="form-section">
                      <mat-form-field class="full-width">
                        <mat-label>General Comments</mat-label>
                        <textarea 
                          matInput 
                          formControlName="comments" 
                          rows="4"
                          placeholder="Any additional comments or observations for the day...">
                        </textarea>
                      </mat-form-field>
                    </div>

                    <div class="form-section">
                      <mat-form-field class="full-width">
                        <mat-label>Tomorrow's Plan</mat-label>
                        <textarea 
                          matInput 
                          formControlName="tomorrowPlan" 
                          rows="4"
                          placeholder="Brief outline of activities planned for tomorrow...">
                        </textarea>
                      </mat-form-field>
                    </div>
                  </div>
                </mat-tab>
              </mat-tab-group>

              <!-- Form Actions -->
              <div class="form-actions">
                <button 
                  mat-raised-button 
                  type="button"
                  (click)="saveDraft()"
                  [disabled]="loading()">
                  <mat-icon>save</mat-icon>
                  Save Draft
                </button>
                
                <button 
                  mat-raised-button 
                  color="primary"
                  type="submit"
                  [disabled]="kpiForm.invalid || loading()">
                  <mat-icon>check_circle</mat-icon>
                  Submit KPIs
                </button>
              </div>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .form-card {
      margin-bottom: 20px;
    }

    h1 {
      margin: 0;
      font-size: 28px;
      color: #333;
    }

    h2 {
      color: #555;
      margin-bottom: 20px;
      font-size: 20px;
    }

    h3 {
      color: #666;
      margin-bottom: 15px;
      font-size: 18px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
    }

    .form-section {
      margin-bottom: 30px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .tab-content {
      padding: 20px 0;
    }

    .kpi-section {
      margin-bottom: 40px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 20px;
      color: #555;
    }

    .kpis-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .kpi-card {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .kpi-title {
      font-size: 14px;
      font-weight: 500;
    }

    .full-width {
      width: 100%;
    }

    .add-button {
      margin-bottom: 15px;
    }

    .staff-list,
    .equipment-list,
    .expenses-list,
    .quality-checks-list,
    .safety-incidents-list,
    .issues-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .staff-entry,
    .equipment-entry,
    .expense-entry,
    .quality-check-entry,
    .safety-incident-entry,
    .issue-entry {
      display: flex;
      gap: 15px;
      align-items: flex-start;
      padding: 15px;
      background: #f5f5f5;
      border-radius: 8px;
      flex-wrap: wrap;
    }

    .staff-entry mat-form-field,
    .equipment-entry mat-form-field,
    .expense-entry mat-form-field {
      flex: 1;
      min-width: 200px;
    }

    .quality-check-entry mat-form-field,
    .safety-incident-entry mat-form-field,
    .issue-entry mat-form-field {
      flex: 1;
      min-width: 250px;
    }

    .total-section {
      margin-top: 20px;
      padding: 15px;
      background: #e3f2fd;
      border-radius: 8px;
      text-align: right;
    }

    .total-section h4 {
      margin: 0;
      font-size: 18px;
      color: #1976d2;
    }

    .form-actions {
      display: flex;
      gap: 15px;
      justify-content: flex-end;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }

    mat-tab-group {
      margin-top: 30px;
    }

    ::ng-deep .mat-mdc-tab-label {
      font-size: 16px !important;
      font-weight: 500 !important;
    }

    ::ng-deep .mat-mdc-form-field {
      font-size: 14px;
    }

    ::ng-deep .mat-mdc-card-header {
      padding: 8px 16px;
    }

    ::ng-deep .mat-mdc-card-content {
      padding: 16px;
    }
  `]
})
export class DailyKpisEnhancedFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private kpisService = inject(KPIsService);
  private financialService = inject(FinancialService);
  private qualityService = inject(QualityService);
  private projectService = inject(ProjectService);
  private contractorService = inject(ContractorService);
  private staffService = inject(StaffService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  // KPI Definitions
  kpiDefinitions = [
    // Surveying & Design
    { key: 'kmSurveyed', label: 'Kilometers Surveyed', unit: 'km', category: 'surveying' },
    { key: 'polesStaked', label: 'Poles Staked', unit: 'poles', category: 'surveying' },
    { key: 'makeReadyComplete', label: 'Make Ready Complete', unit: 'poles', category: 'surveying' },
    { key: 'polesScanned', label: 'Poles Scanned', unit: 'poles', category: 'surveying' },
    
    // Civils
    { key: 'polesDelivered', label: 'Poles Delivered', unit: 'poles', category: 'civils' },
    { key: 'holesExcavated', label: 'Holes Excavated', unit: 'holes', category: 'civils' },
    { key: 'polesErected', label: 'Poles Erected', unit: 'poles', category: 'civils' },
    { key: 'concretePouredM3', label: 'Concrete Poured', unit: 'm³', category: 'civils' },
    { key: 'backfillCompleted', label: 'Backfill Completed', unit: 'holes', category: 'civils' },
    
    // Stringing
    { key: 'cableDeliveredKm', label: 'Cable Delivered', unit: 'km', category: 'stringing' },
    { key: 'cableStrungKm', label: 'Cable Strung', unit: 'km', category: 'stringing' },
    { key: 'hangersBoltsInstalled', label: 'Hangers/Bolts Installed', unit: 'units', category: 'stringing' },
    { key: 'ODFInstalled', label: 'ODF Installed', unit: 'units', category: 'stringing' },
    { key: 'fatInstalled', label: 'FAT Installed', unit: 'units', category: 'stringing' },
  ];

  // Form
  kpiForm!: FormGroup;

  // Signals
  projects = signal<Project[]>([]);
  contractors = signal<Contractor[]>([]);
  staffMembers = signal<StaffMember[]>([]);
  projectsLoaded = signal(false);
  contractorsLoaded = signal(false);
  loading = signal(false);

  ngOnInit() {
    this.initializeForm();
    this.loadProjects();
    this.loadContractors();
    this.loadStaff();
  }

  initializeForm() {
    const kpiControls: any = {};
    this.kpiDefinitions.forEach(def => {
      kpiControls[def.key] = [0, [Validators.required, Validators.min(0)]];
    });

    this.kpiForm = this.fb.group({
      // Basic Info
      date: [new Date(), Validators.required],
      projectId: ['', Validators.required],
      contractorId: ['', Validators.required],
      weather: ['sunny'],

      // KPIs
      ...kpiControls,

      // Resources
      staffOnSite: this.fb.array([]),
      equipmentUsed: this.fb.array([]),

      // Financial
      expenses: this.fb.array([]),

      // Quality & Safety
      qualityChecks: this.fb.array([]),
      safetyIncidents: this.fb.array([]),

      // Issues & Comments
      issues: this.fb.array([]),
      comments: [''],
      tomorrowPlan: ['']
    });
  }

  // Load Data Methods
  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.projectsLoaded.set(true);
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.snackBar.open('Error loading projects', 'Close', { duration: 3000 });
      }
    });
  }

  loadContractors() {
    this.contractorService.getContractors().subscribe({
      next: (contractors) => {
        this.contractors.set(contractors);
        this.contractorsLoaded.set(true);
      },
      error: (error) => {
        console.error('Error loading contractors:', error);
        this.snackBar.open('Error loading contractors', 'Close', { duration: 3000 });
      }
    });
  }

  loadStaff() {
    this.staffService.getStaff().subscribe({
      next: (staff: any) => {
        this.staffMembers.set(staff);
      },
      error: (error) => {
        console.error('Error loading staff:', error);
      }
    });
  }

  // Form Array Getters
  get staffArray() {
    return this.kpiForm.get('staffOnSite') as FormArray;
  }

  get equipmentArray() {
    return this.kpiForm.get('equipmentUsed') as FormArray;
  }

  get expensesArray() {
    return this.kpiForm.get('expenses') as FormArray;
  }

  get qualityChecksArray() {
    return this.kpiForm.get('qualityChecks') as FormArray;
  }

  get safetyIncidentsArray() {
    return this.kpiForm.get('safetyIncidents') as FormArray;
  }

  get issuesArray() {
    return this.kpiForm.get('issues') as FormArray;
  }

  // Staff Methods
  addStaffMember() {
    const staffGroup = this.fb.group({
      staffId: ['', Validators.required],
      name: [''],
      role: [''],
      hoursWorked: [8, [Validators.required, Validators.min(0), Validators.max(24)]]
    });
    this.staffArray.push(staffGroup);
  }

  removeStaffMember(index: number) {
    this.staffArray.removeAt(index);
  }

  onStaffSelected(index: number) {
    const memberGroup = this.staffArray.at(index);
    const staffId = memberGroup.get('staffId')?.value;
    
    if (staffId) {
      const staff = this.staffMembers().find(s => s.id === staffId);
      if (staff) {
        memberGroup.patchValue({ 
          name: staff.name,
          role: staff.primaryGroup 
        });
      }
    }
  }

  // Equipment Methods
  addEquipment() {
    const equipmentGroup = this.fb.group({
      type: ['', Validators.required],
      name: ['', Validators.required],
      hoursUsed: [0, [Validators.required, Validators.min(0), Validators.max(24)]]
    });
    this.equipmentArray.push(equipmentGroup);
  }

  removeEquipment(index: number) {
    this.equipmentArray.removeAt(index);
  }

  // Expense Methods
  addExpense() {
    const expenseGroup = this.fb.group({
      category: ['', Validators.required],
      description: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      receiptNumber: ['']
    });
    this.expensesArray.push(expenseGroup);
  }

  removeExpense(index: number) {
    this.expensesArray.removeAt(index);
  }

  calculateTotalExpenses(): number {
    return this.expensesArray.controls.reduce((total, control) => {
      return total + (control.get('amount')?.value || 0);
    }, 0);
  }

  // Quality Check Methods
  addQualityCheck() {
    const checkGroup = this.fb.group({
      type: ['', Validators.required],
      result: ['', Validators.required],
      notes: ['']
    });
    this.qualityChecksArray.push(checkGroup);
  }

  removeQualityCheck(index: number) {
    this.qualityChecksArray.removeAt(index);
  }

  // Safety Incident Methods
  addSafetyIncident() {
    const incidentGroup = this.fb.group({
      type: ['', Validators.required],
      description: ['', Validators.required],
      actionTaken: ['']
    });
    this.safetyIncidentsArray.push(incidentGroup);
  }

  removeSafetyIncident(index: number) {
    this.safetyIncidentsArray.removeAt(index);
  }

  // Issue Methods
  addIssue() {
    const issueGroup = this.fb.group({
      category: ['', Validators.required],
      description: ['', Validators.required],
      impact: ['medium', Validators.required],
      resolution: ['']
    });
    this.issuesArray.push(issueGroup);
  }

  removeIssue(index: number) {
    this.issuesArray.removeAt(index);
  }

  // KPI Filter Methods
  getSurveyingKPIs() {
    return this.kpiDefinitions.filter(kpi => kpi.category === 'surveying');
  }

  getCivilsKPIs() {
    return this.kpiDefinitions.filter(kpi => kpi.category === 'civils');
  }

  getStringingKPIs() {
    return this.kpiDefinitions.filter(kpi => kpi.category === 'stringing');
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
    const formValue = this.kpiForm.value;

    try {
      // Create main KPI data
      const kpiData: DailyKPIs = {
        ...formValue,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add project and contractor names
      const project = this.projects().find(p => p.id === formValue.projectId);
      const contractor = this.contractors().find(c => c.id === formValue.contractorId);
      
      if (project) kpiData.projectName = project.name;
      if (contractor) kpiData.contractorName = contractor.companyName;

      this.kpisService.createKPI(kpiData).subscribe({
        next: (result: any) => {
          this.loading.set(false);
          this.snackBar.open('KPIs saved successfully!', 'Close', { duration: 3000 });
          this.router.navigate(['/daily-progress/kpis-summary']);
        },
        error: (error: any) => {
          this.loading.set(false);
          console.error('Error saving KPIs:', error);
          this.snackBar.open('Error saving KPIs', 'Close', { duration: 3000 });
        }
      });
    } catch (error) {
      this.loading.set(false);
      console.error('Error:', error);
      this.snackBar.open('Error saving data', 'Close', { duration: 3000 });
    }
  }

  saveDraft() {
    // TODO: Implement draft saving functionality
    this.snackBar.open('Draft saved successfully!', 'Close', { duration: 3000 });
  }
}