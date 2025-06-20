import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DailyProgress, DailyProgressFilter } from '../../models/daily-progress.model';
import { DailyProgressService } from '../../services/daily-progress.service';
import { ProjectService } from '../../../../core/services/project.service';
import { StaffService } from '../../../staff/services/staff.service';
import { DateFormatService } from '../../../../core/services/date-format.service';

@Component({
  selector: 'app-daily-progress-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    FormsModule,
  ],
  template: `
    <div class="ff-page-container">
      <div class="ff-page-header">
        <div class="header-content">
          <h1 class="page-title">Daily Progress Reports</h1>
          <p class="page-subtitle">Track and manage daily work progress across all projects</p>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="createNew()">
            <mat-icon>add</mat-icon>
            New Progress Report
          </button>
        </div>
      </div>

      <div class="filters-section">
        <mat-form-field appearance="outline">
          <mat-label>Project</mat-label>
          <mat-select [(ngModel)]="filter().projectId" (selectionChange)="applyFilter()">
            <mat-option value="">All Projects</mat-option>
            @for (project of projects$ | async; track project.id) {
              <mat-option [value]="project.id">
                {{ project.name }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Staff Member</mat-label>
          <mat-select [(ngModel)]="filter().staffId" (selectionChange)="applyFilter()">
            <mat-option value="">All Staff</mat-option>
            @for (staff of staff$ | async; track staff.id) {
              <mat-option [value]="staff.id">
                {{ staff.name }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="filter().status" (selectionChange)="applyFilter()">
            <mat-option value="">All Statuses</mat-option>
            <mat-option value="draft">Draft</mat-option>
            <mat-option value="submitted">Submitted</mat-option>
            <mat-option value="approved">Approved</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date From</mat-label>
          <input
            matInput
            [matDatepicker]="fromPicker"
            [(ngModel)]="filter().dateFrom"
            (dateChange)="applyFilter()"
          />
          <mat-datepicker-toggle matSuffix [for]="fromPicker"></mat-datepicker-toggle>
          <mat-datepicker #fromPicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date To</mat-label>
          <input
            matInput
            [matDatepicker]="toPicker"
            [(ngModel)]="filter().dateTo"
            (dateChange)="applyFilter()"
          />
          <mat-datepicker-toggle matSuffix [for]="toPicker"></mat-datepicker-toggle>
          <mat-datepicker #toPicker></mat-datepicker>
        </mat-form-field>

        <button mat-button (click)="clearFilters()">
          <mat-icon>clear</mat-icon>
          Clear Filters
        </button>
      </div>

      @if (progressReports$ | async; as reports) {
        <div class="table-container">
          <table mat-table [dataSource]="reports">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let report">
                {{ formatDate(report.date) }}
              </td>
            </ng-container>

            <ng-container matColumnDef="project">
              <th mat-header-cell *matHeaderCellDef>Project</th>
              <td mat-cell *matCellDef="let report">
                {{ report.projectName || 'N/A' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="phase">
              <th mat-header-cell *matHeaderCellDef>Phase</th>
              <td mat-cell *matCellDef="let report">
                {{ report.phaseName || '-' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Description</th>
              <td mat-cell *matCellDef="let report" class="description-cell">
                {{ report.description }}
              </td>
            </ng-container>

            <ng-container matColumnDef="hours">
              <th mat-header-cell *matHeaderCellDef>Hours</th>
              <td mat-cell *matCellDef="let report">
                {{ report.hoursWorked }}
              </td>
            </ng-container>

            <ng-container matColumnDef="staff">
              <th mat-header-cell *matHeaderCellDef>Staff</th>
              <td mat-cell *matCellDef="let report">
                <mat-chip-set>
                  @for (name of report.staffNames; track name) {
                    <mat-chip>
                      {{ name }}
                    </mat-chip>
                  }
                </mat-chip-set>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let report">
                <mat-chip [class]="'status-' + report.status">
                  {{ report.status | titlecase }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let report">
                <button mat-icon-button [matTooltip]="'View Details'" (click)="viewDetails(report)">
                  <mat-icon>visibility</mat-icon>
                </button>
                @if (report.status === 'draft') {
                  <button mat-icon-button [matTooltip]="'Edit'" (click)="edit(report)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    [matTooltip]="'Submit for Approval'"
                    (click)="submitForApproval(report)"
                  >
                    <mat-icon>send</mat-icon>
                  </button>
                }
                @if (report.status === 'submitted' && canApprove) {
                  <button mat-icon-button [matTooltip]="'Approve'" (click)="approve(report)">
                    <mat-icon>check_circle</mat-icon>
                  </button>
                }
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: displayedColumns"
              [class.has-issues]="row.issuesEncountered"
              (click)="viewDetails(row)"
            ></tr>
          </table>

          @if (reports.length === 0) {
            <div class="empty-state">
              <div class="empty-state-icon">
                <mat-icon>assignment</mat-icon>
              </div>
              <h2>No progress reports found</h2>
              <p>Create your first daily progress report to track work activities</p>
            </div>
          }
        </div>
      } @else {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
        </div>
      }
    </div>
  `,
  styleUrls: ['./daily-progress-list.component.scss'],
})
export class DailyProgressListComponent implements OnInit {
  private dailyProgressService = inject(DailyProgressService);
  private projectService = inject(ProjectService);
  private staffService = inject(StaffService);
  private dateFormatService = inject(DateFormatService);
  private router = inject(Router);

  filter = signal<DailyProgressFilter>({});

  progressReports$ = this.dailyProgressService.getAll({});
  projects$ = this.projectService.getProjects();
  staff$ = this.staffService.getStaff();

  displayedColumns = [
    'date',
    'project',
    'phase',
    'description',
    'hours',
    'staff',
    'status',
    'actions',
  ];
  canApprove = false; // This should be based on user role

  ngOnInit() {
    // Component initialized with reactive signals
  }

  applyFilter() {
    // Filter updates are handled by ngModel two-way binding
    // The computed progressReports$ will automatically react to filter changes
  }

  clearFilters() {
    this.filter.set({});
  }

  formatDate(date: Date | string | number): string {
    const dateValue = typeof date === 'number' ? new Date(date) : date;
    return this.dateFormatService.formatDate(dateValue);
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    switch (status) {
      case 'approved':
        return 'primary';
      case 'submitted':
        return 'accent';
      default:
        return 'warn';
    }
  }

  createNew() {
    this.router.navigate(['/daily-progress/new']);
  }

  viewDetails(report: DailyProgress) {
    this.router.navigate(['/daily-progress', report.id]);
  }

  edit(report: DailyProgress) {
    this.router.navigate(['/daily-progress', report.id, 'edit']);
  }

  submitForApproval(report: DailyProgress) {
    if (report.id) {
      this.dailyProgressService.submitForApproval(report.id).subscribe({
        next: () => {
          console.log('Progress report submitted for approval');
        },
        error: (error) => {
          console.error('Error submitting progress report:', error);
        },
      });
    }
  }

  approve(report: DailyProgress) {
    if (report.id) {
      this.dailyProgressService.approve(report.id).subscribe({
        next: () => {
          console.log('Progress report approved');
        },
        error: (error) => {
          console.error('Error approving progress report:', error);
        },
      });
    }
  }
}