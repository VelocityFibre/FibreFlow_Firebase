import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectService } from '../../../../core/services/project.service';
import { ClientService } from '../../../../features/clients/services/client.service';
import { Client } from '../../../../features/clients/models/client.model';
import { Observable, firstValueFrom } from 'rxjs';
import {
  ProjectType,
  ProjectStatus,
  Priority,
  PhaseType,
  DEFAULT_KPI_CONFIGURATIONS,
} from '../../../../core/models/project.model';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="ff-page-container">
      <!-- Header -->
      <div class="form-header">
        <div class="header-content">
          <button mat-icon-button routerLink="/projects" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h1 class="page-title">{{ isEditMode ? 'Edit Project' : 'Create New Project' }}</h1>
            <p class="page-subtitle">
              {{
                isEditMode
                  ? 'Update project details'
                  : 'Set up a new fiber optic infrastructure project'
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form [formGroup]="projectForm" (ngSubmit)="onSubmit()">
        <div class="form-grid">
          <!-- Project Information -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>Project Information</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-section">
                <mat-form-field appearance="outline">
                  <mat-label>Project Code</mat-label>
                  <input matInput formControlName="projectCode" placeholder="PRJ-001" />
                  <mat-error *ngIf="projectForm.get('projectCode')?.hasError('required')">
                    Project code is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Project Name</mat-label>
                  <input matInput formControlName="name" placeholder="Enter project name" />
                  <mat-error *ngIf="projectForm.get('name')?.hasError('required')">
                    Project name is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description</mat-label>
                  <textarea
                    matInput
                    formControlName="description"
                    rows="3"
                    placeholder="Describe the project scope and objectives"
                  ></textarea>
                </mat-form-field>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Project Type</mat-label>
                    <mat-select formControlName="projectType">
                      <mat-option value="ftth">FTTH - Fiber to the Home</mat-option>
                      <mat-option value="fttb">FTTB - Fiber to the Building</mat-option>
                      <mat-option value="fttc">FTTC - Fiber to the Curb</mat-option>
                      <mat-option value="backbone">Backbone</mat-option>
                      <mat-option value="lastmile">Last Mile</mat-option>
                      <mat-option value="enterprise">Enterprise</mat-option>
                      <mat-option value="maintenance">Maintenance</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Priority</mat-label>
                    <mat-select formControlName="priorityLevel">
                      <mat-option value="low">Low</mat-option>
                      <mat-option value="medium">Medium</mat-option>
                      <mat-option value="high">High</mat-option>
                      <mat-option value="critical">Critical</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Location</mat-label>
                  <input matInput formControlName="location" placeholder="Project location" />
                  <mat-icon matSuffix>location_on</mat-icon>
                  <mat-error *ngIf="projectForm.get('location')?.hasError('required')">
                    Location is required
                  </mat-error>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Client Information -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>Client Information</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-section">
                <mat-form-field appearance="outline">
                  <mat-label>Client Organization</mat-label>
                  <mat-select formControlName="clientOrganization" placeholder="Select client">
                    <mat-option *ngFor="let client of clients$ | async" [value]="client.id">
                      {{ client.name }}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="projectForm.get('clientOrganization')?.hasError('required')">
                    Client organization is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Contact Person</mat-label>
                  <input matInput formControlName="clientContact" placeholder="Full name" />
                  <mat-error *ngIf="projectForm.get('clientContact')?.hasError('required')">
                    Contact person is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>
                  <input
                    matInput
                    type="email"
                    formControlName="clientEmail"
                    placeholder="email@example.com"
                  />
                  <mat-icon matSuffix>email</mat-icon>
                  <mat-error *ngIf="projectForm.get('clientEmail')?.hasError('required')">
                    Email is required
                  </mat-error>
                  <mat-error *ngIf="projectForm.get('clientEmail')?.hasError('email')">
                    Please enter a valid email
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Phone</mat-label>
                  <input matInput formControlName="clientPhone" placeholder="+27 12 345 6789" />
                  <mat-icon matSuffix>phone</mat-icon>
                  <mat-error *ngIf="projectForm.get('clientPhone')?.hasError('required')">
                    Phone is required
                  </mat-error>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Scope of Work (SOW) -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>
                <mat-icon style="margin-right: 8px; vertical-align: middle;">trending_up</mat-icon>
                Scope of Work (SOW)
              </mat-card-title>
              <mat-card-subtitle
                >Set daily targets for key performance indicators</mat-card-subtitle
              >
            </mat-card-header>
            <mat-card-content>
              <div class="form-section">
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Pole Permissions Target</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="polePermissionsTotal"
                      placeholder="50"
                    />
                    <span matSuffix>permissions</span>
                    <mat-error
                      *ngIf="projectForm.get('polePermissionsTotal')?.hasError('required')"
                    >
                      Pole permissions target is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Permissions Per Day</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="polePermissionsDaily"
                      placeholder="5"
                    />
                    <span matSuffix>per day</span>
                    <mat-error
                      *ngIf="projectForm.get('polePermissionsDaily')?.hasError('required')"
                    >
                      Daily target is required
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Home Signups Target</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="homeSignupsTotal"
                      placeholder="100"
                    />
                    <span matSuffix>homes</span>
                    <mat-error *ngIf="projectForm.get('homeSignupsTotal')?.hasError('required')">
                      Home signups target is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Signups Per Day</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="homeSignupsDaily"
                      placeholder="8"
                    />
                    <span matSuffix>per day</span>
                    <mat-error *ngIf="projectForm.get('homeSignupsDaily')?.hasError('required')">
                      Daily target is required
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Poles to Plant</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="polesPlantedTotal"
                      placeholder="50"
                    />
                    <span matSuffix>poles</span>
                    <mat-error *ngIf="projectForm.get('polesPlantedTotal')?.hasError('required')">
                      Poles target is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Poles Per Day</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="polesPlantedDaily"
                      placeholder="3"
                    />
                    <span matSuffix>per day</span>
                    <mat-error *ngIf="projectForm.get('polesPlantedDaily')?.hasError('required')">
                      Daily target is required
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Fibre Stringing (meters)</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="fibreStringingTotal"
                      placeholder="2000"
                    />
                    <span matSuffix>meters</span>
                    <mat-error *ngIf="projectForm.get('fibreStringingTotal')?.hasError('required')">
                      Fibre stringing target is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Stringing Per Day</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="fibreStringingDaily"
                      placeholder="150"
                    />
                    <span matSuffix>meters/day</span>
                    <mat-error *ngIf="projectForm.get('fibreStringingDaily')?.hasError('required')">
                      Daily target is required
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Trenching (meters)</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="trenchingMetersTotal"
                      placeholder="500"
                    />
                    <span matSuffix>meters</span>
                    <mat-error
                      *ngIf="projectForm.get('trenchingMetersTotal')?.hasError('required')"
                    >
                      Trenching target is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Trenching Per Day</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="trenchingMetersDaily"
                      placeholder="50"
                    />
                    <span matSuffix>meters/day</span>
                    <mat-error
                      *ngIf="projectForm.get('trenchingMetersDaily')?.hasError('required')"
                    >
                      Daily target is required
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Homes Connected</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="homesConnectedTotal"
                      placeholder="200"
                    />
                    <span matSuffix>homes</span>
                    <mat-error *ngIf="projectForm.get('homesConnectedTotal')?.hasError('required')">
                      Homes connected target is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Homes Per Day</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="homesConnectedDaily"
                      placeholder="10"
                    />
                    <span matSuffix>homes/day</span>
                    <mat-error *ngIf="projectForm.get('homesConnectedDaily')?.hasError('required')">
                      Daily target is required
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="kpi-timeline-info" *ngIf="projectForm.valid">
                  <mat-icon>info</mat-icon>
                  <div>
                    <strong>Estimated Project Timeline:</strong>
                    <br />
                    Based on your KPI targets, this project is estimated to take
                    <strong>{{ getEstimatedDuration() }} working days</strong>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Schedule & Budget -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>Schedule & Budget</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-section">
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Start Date</mat-label>
                    <input matInput [matDatepicker]="startPicker" formControlName="startDate" />
                    <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                    <mat-datepicker #startPicker></mat-datepicker>
                    <mat-error *ngIf="projectForm.get('startDate')?.hasError('required')">
                      Start date is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Expected End Date</mat-label>
                    <input matInput [matDatepicker]="endPicker" formControlName="expectedEndDate" />
                    <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                    <mat-datepicker #endPicker></mat-datepicker>
                    <mat-error *ngIf="projectForm.get('expectedEndDate')?.hasError('required')">
                      End date is required
                    </mat-error>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Budget (ZAR)</mat-label>
                  <input matInput type="number" formControlName="budget" placeholder="0" />
                  <span matPrefix>R&nbsp;</span>
                  <mat-error *ngIf="projectForm.get('budget')?.hasError('required')">
                    Budget is required
                  </mat-error>
                  <mat-error *ngIf="projectForm.get('budget')?.hasError('min')">
                    Budget must be greater than 0
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Project Manager</mat-label>
                  <input
                    matInput
                    formControlName="projectManagerName"
                    placeholder="Project manager name"
                  />
                  <mat-icon matSuffix>person</mat-icon>
                  <mat-error *ngIf="projectForm.get('projectManagerName')?.hasError('required')">
                    Project manager is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Working Hours</mat-label>
                  <input
                    matInput
                    formControlName="workingHours"
                    placeholder="8:00 AM - 5:00 PM SAST"
                  />
                  <mat-icon matSuffix>schedule</mat-icon>
                </mat-form-field>

                <div class="checkbox-group">
                  <mat-checkbox formControlName="allowWeekendWork">Allow Weekend Work</mat-checkbox>
                  <mat-checkbox formControlName="allowNightWork">Allow Night Work</mat-checkbox>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button mat-button type="button" routerLink="/projects">Cancel</button>
          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="projectForm.invalid || isSubmitting"
          >
            <mat-icon *ngIf="!isSubmitting">save</mat-icon>
            <mat-icon *ngIf="isSubmitting">
              <mat-progress-spinner diameter="20" mode="indeterminate"></mat-progress-spinner>
            </mat-icon>
            {{
              isSubmitting
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Update Project'
                  : 'Create Project'
            }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .form-header {
        margin: -40px -24px 32px;
        padding: 24px;
        background: white;
        border-bottom: 1px solid #e5e7eb;
      }

      .header-content {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .page-title {
        font-size: 32px;
        font-weight: 500;
        margin: 0;
        color: #1f2937;
      }

      .page-subtitle {
        font-size: 16px;
        color: #6b7280;
        margin: 4px 0 0 0;
      }

      .form-grid {
        display: grid;
        gap: 24px;
        margin-bottom: 32px;
      }

      .form-section {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }

      mat-form-field {
        width: 100%;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      .checkbox-group {
        display: flex;
        gap: 24px;
        margin-top: 8px;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 16px;
        padding: 24px;
        background: white;
        border-top: 1px solid #e5e7eb;
        margin: 0 -24px -40px;
        position: sticky;
        bottom: 0;
        z-index: 10;
      }

      mat-card {
        border-radius: 12px !important;
      }

      mat-card-header {
        margin-bottom: 16px;
      }

      mat-card-title {
        font-size: 20px !important;
        font-weight: 500 !important;
      }

      .kpi-timeline-info {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 8px;
        margin-top: 16px;
        font-size: 14px;
        color: #0c4a6e;
      }

      .kpi-timeline-info mat-icon {
        color: #0284c7;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .form-header {
          margin: -24px -16px 24px;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .checkbox-group {
          flex-direction: column;
          gap: 12px;
        }

        .form-actions {
          margin: 0 -16px -24px;
        }
      }
    `,
  ],
})
export class ProjectCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private clientService = inject(ClientService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isSubmitting = false;
  isEditMode = false;
  projectId: string | null = null;
  clients$: Observable<Client[]> = this.clientService.getActiveClients();

  projectForm: FormGroup = this.fb.group({
    projectCode: ['', Validators.required],
    name: ['', Validators.required],
    description: [''],
    projectType: [ProjectType.FTTH, Validators.required],
    priorityLevel: [Priority.MEDIUM, Validators.required],
    location: ['', Validators.required],

    clientOrganization: ['', Validators.required],
    clientContact: ['', Validators.required],
    clientEmail: ['', [Validators.required, Validators.email]],
    clientPhone: ['', Validators.required],

    startDate: [new Date(), Validators.required],
    expectedEndDate: ['', Validators.required],
    budget: [0, [Validators.required, Validators.min(1)]],

    projectManagerName: ['', Validators.required],
    workingHours: ['8:00 AM - 5:00 PM SAST'],
    allowWeekendWork: [false],
    allowNightWork: [false],

    // Scope of Work (SOW)
    polePermissionsTotal: ['', [Validators.required, Validators.min(1)]],
    polePermissionsDaily: ['', [Validators.required, Validators.min(1)]],
    homeSignupsTotal: ['', [Validators.required, Validators.min(1)]],
    homeSignupsDaily: ['', [Validators.required, Validators.min(1)]],
    polesPlantedTotal: ['', [Validators.required, Validators.min(1)]],
    polesPlantedDaily: ['', [Validators.required, Validators.min(1)]],
    fibreStringingTotal: ['', [Validators.required, Validators.min(1)]],
    fibreStringingDaily: ['', [Validators.required, Validators.min(1)]],
    trenchingMetersTotal: ['', [Validators.required, Validators.min(1)]],
    trenchingMetersDaily: ['', [Validators.required, Validators.min(1)]],
    homesConnectedTotal: ['', [Validators.required, Validators.min(1)]],
    homesConnectedDaily: ['', [Validators.required, Validators.min(1)]],
  });

  constructor() {
    // Watch for client selection changes
    this.projectForm.get('clientOrganization')?.valueChanges.subscribe((clientId) => {
      if (clientId) {
        this.clientService.getClient(clientId).subscribe((client) => {
          if (client) {
            // Auto-populate client fields
            this.projectForm.patchValue({
              clientContact: client.contactPerson || '',
              clientEmail: client.email || '',
              clientPhone: client.phone || '',
            });
          }
        });
      }
    });
  }

  ngOnInit() {
    // Check if we're in edit mode
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.isEditMode = true;
      this.loadProject(this.projectId);
    }
  }

  loadProject(projectId: string) {
    this.projectService.getProject(projectId).subscribe((project) => {
      if (project) {
        // Populate form with existing project data
        this.projectForm.patchValue({
          projectCode: project.projectCode,
          name: project.name,
          description: project.description,
          projectType: project.projectType,
          priorityLevel: project.priorityLevel,
          location: project.location,

          clientOrganization: project.clientId,
          clientContact: project.clientContact,
          clientEmail: project.clientEmail,
          clientPhone: project.clientPhone,

          startDate:
            project.startDate instanceof Date
              ? project.startDate
              : (project.startDate as any)?.toDate
                ? (project.startDate as any).toDate()
                : project.startDate,
          expectedEndDate:
            project.expectedEndDate instanceof Date
              ? project.expectedEndDate
              : (project.expectedEndDate as any)?.toDate
                ? (project.expectedEndDate as any).toDate()
                : project.expectedEndDate,
          budget: project.budget,

          projectManagerName: project.projectManagerName,
          workingHours: project.workingHours,
          allowWeekendWork: project.allowWeekendWork || false,
          allowNightWork: project.allowNightWork || false,

          // KPI Targets
          polePermissionsTotal: project.metadata?.kpiTargets?.polePermissions?.totalTarget || '',
          polePermissionsDaily: project.metadata?.kpiTargets?.polePermissions?.dailyTarget || '',
          homeSignupsTotal: project.metadata?.kpiTargets?.homeSignups?.totalTarget || '',
          homeSignupsDaily: project.metadata?.kpiTargets?.homeSignups?.dailyTarget || '',
          polesPlantedTotal: project.metadata?.kpiTargets?.polesPlanted?.totalTarget || '',
          polesPlantedDaily: project.metadata?.kpiTargets?.polesPlanted?.dailyTarget || '',
          fibreStringingTotal: project.metadata?.kpiTargets?.fibreStringing?.totalTarget || '',
          fibreStringingDaily: project.metadata?.kpiTargets?.fibreStringing?.dailyTarget || '',
          trenchingMetersTotal: project.metadata?.kpiTargets?.trenchingMeters?.totalTarget || '',
          trenchingMetersDaily: project.metadata?.kpiTargets?.trenchingMeters?.dailyTarget || '',
          homesConnectedTotal: project.metadata?.kpiTargets?.homesConnected?.totalTarget || '',
          homesConnectedDaily: project.metadata?.kpiTargets?.homesConnected?.dailyTarget || '',
        });
      }
    });
  }

  getEstimatedDuration(): number {
    const form = this.projectForm.value;
    const kpiDurations = [
      Math.ceil(form.polePermissionsTotal / form.polePermissionsDaily || 0),
      Math.ceil(form.homeSignupsTotal / form.homeSignupsDaily || 0),
      Math.ceil(form.polesPlantedTotal / form.polesPlantedDaily || 0),
      Math.ceil(form.fibreStringingTotal / form.fibreStringingDaily || 0),
      Math.ceil(form.trenchingMetersTotal / form.trenchingMetersDaily || 0),
      Math.ceil(form.homesConnectedTotal / form.homesConnectedDaily || 0),
    ];
    return Math.max(...kpiDurations.filter((d) => d > 0));
  }

  async onSubmit() {
    if (this.projectForm.invalid || this.isSubmitting) return;

    // Prevent duplicate submissions
    this.isSubmitting = true;
    this.projectForm.disable(); // Disable the entire form

    try {
      const formValue = this.projectForm.value;

      // Get the selected client to populate client fields correctly
      const selectedClient = await firstValueFrom(
        this.clientService.getClient(formValue.clientOrganization),
      );

      // Prepare project data
      const projectData: any = {
        ...formValue,

        // Set client fields correctly
        clientId: formValue.clientOrganization, // The selected client ID
        clientName: selectedClient?.contactPerson || formValue.clientContact,
        clientOrganization: selectedClient?.name || '', // Store the actual client organization name

        // Scope of Work (SOW)
        metadata: {
          kpiTargets: {
            polePermissions: {
              ...DEFAULT_KPI_CONFIGURATIONS['polePermissions'],
              totalTarget: formValue.polePermissionsTotal,
              dailyTarget: formValue.polePermissionsDaily,
              estimatedDays: Math.ceil(
                formValue.polePermissionsTotal / formValue.polePermissionsDaily,
              ),
            },
            homeSignups: {
              ...DEFAULT_KPI_CONFIGURATIONS['homeSignups'],
              totalTarget: formValue.homeSignupsTotal,
              dailyTarget: formValue.homeSignupsDaily,
              estimatedDays: Math.ceil(formValue.homeSignupsTotal / formValue.homeSignupsDaily),
            },
            polesPlanted: {
              ...DEFAULT_KPI_CONFIGURATIONS['polesPlanted'],
              totalTarget: formValue.polesPlantedTotal,
              dailyTarget: formValue.polesPlantedDaily,
              estimatedDays: Math.ceil(formValue.polesPlantedTotal / formValue.polesPlantedDaily),
            },
            fibreStringing: {
              ...DEFAULT_KPI_CONFIGURATIONS['fibreStringing'],
              totalTarget: formValue.fibreStringingTotal,
              dailyTarget: formValue.fibreStringingDaily,
              estimatedDays: Math.ceil(
                formValue.fibreStringingTotal / formValue.fibreStringingDaily,
              ),
            },
            trenchingMeters: {
              ...DEFAULT_KPI_CONFIGURATIONS['trenchingMeters'],
              totalTarget: formValue.trenchingMetersTotal,
              dailyTarget: formValue.trenchingMetersDaily,
              estimatedDays: Math.ceil(
                formValue.trenchingMetersTotal / formValue.trenchingMetersDaily,
              ),
            },
            homesConnected: {
              ...(DEFAULT_KPI_CONFIGURATIONS['homesConnected'] || {
                name: 'Homes Connected',
                unit: 'homes',
                icon: 'home',
                color: '#10B981',
                enabled: true,
              }),
              totalTarget: formValue.homesConnectedTotal,
              dailyTarget: formValue.homesConnectedDaily,
              estimatedDays: Math.ceil(
                formValue.homesConnectedTotal / formValue.homesConnectedDaily,
              ),
            },
            calculatedDuration: this.getEstimatedDuration(),
          },
        },

        // Metadata
        lastModifiedBy: 'user',
      };

      if (this.isEditMode && this.projectId) {
        // Update existing project
        await this.projectService.updateProject(this.projectId, projectData);
        // Navigate back to the project details
        await this.router.navigate(['/projects', this.projectId]);
      } else {
        // Create new project - add create-only fields
        projectData.status = ProjectStatus.PLANNING;
        projectData.currentPhase = PhaseType.PLANNING;
        projectData.currentPhaseName = 'Planning Phase';
        projectData.projectManagerId = `pm-${Date.now()}`;
        projectData.budgetUsed = 0;
        projectData.overallProgress = 0;
        projectData.activeTasksCount = 0;
        projectData.completedTasksCount = 0;
        projectData.currentPhaseProgress = 0;
        projectData.createdBy = 'user';

        const projectId = await this.projectService.createProject(projectData);
        // Check if projectId is valid before navigating
        if (projectId) {
          // Navigate to the new project
          await this.router.navigate(['/projects', projectId]);
        } else {
          // This shouldn't happen, but handle it just in case
          throw new Error('Project created but no ID returned');
        }
      }
    } catch (error: any) {
      console.error(`Error ${this.isEditMode ? 'updating' : 'creating'} project:`, error);
      // Re-enable form on error
      this.projectForm.enable();

      // Handle specific error cases
      let errorMessage = `Failed to ${this.isEditMode ? 'update' : 'create'} project.`;

      if (error?.message?.includes('already exists')) {
        errorMessage = `A project with code "${this.projectForm.value.projectCode}" already exists. Please use a different project code.`;
      } else if (error?.message) {
        errorMessage += ` ${error.message}`;
      } else {
        errorMessage += ' Please try again.';
      }

      // Only show error if we actually failed to create/update the project
      // Check if we're already on a project page (which would indicate success)
      if (!this.router.url.includes('/projects/')) {
        alert(errorMessage);
      }
    } finally {
      // Note: Don't re-enable form here as we're navigating away on success
      // Only reset the flag in case of error (handled above)
      this.isSubmitting = false;
    }
  }
}
