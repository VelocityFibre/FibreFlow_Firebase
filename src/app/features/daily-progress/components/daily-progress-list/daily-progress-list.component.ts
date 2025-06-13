import { Component, OnInit, inject } from '@angular/core';
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
import { Observable, BehaviorSubject, combineLatest, map, switchMap } from 'rxjs';
import { DailyProgress, DailyProgressFilter } from '../../models/daily-progress.model';
import { DailyProgressService } from '../../services/daily-progress.service';
import { ProjectService } from '../../../../core/services/project.service';
import { StaffService } from '../../../staff/services/staff.service';
import { DateFormatService } from '../../../../core/services/date-format.service';

@Component({
  selector: 'app-daily-progress-list',
  standalone: true,
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
    FormsModule
  ],
  template: `
    <div class="daily-progress-list">
      <div class="list-header">
        <h2>Daily Progress Reports</h2>
        <button mat-raised-button color="primary" (click)="createNew()">
          <mat-icon>add</mat-icon>
          New Progress Report
        </button>
      </div>

      <div class="filters">
        <mat-form-field appearance="fill">
          <mat-label>Project</mat-label>
          <mat-select [(ngModel)]="filter.projectId" (selectionChange)="applyFilter()">
            <mat-option value="">All Projects</mat-option>
            <mat-option *ngFor="let project of projects$ | async" [value]="project.id">
              {{project.name}}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Staff Member</mat-label>
          <mat-select [(ngModel)]="filter.staffId" (selectionChange)="applyFilter()">
            <mat-option value="">All Staff</mat-option>
            <mat-option *ngFor="let staff of staff$ | async" [value]="staff.id">
              {{staff.name}}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="filter.status" (selectionChange)="applyFilter()">
            <mat-option value="">All Statuses</mat-option>
            <mat-option value="draft">Draft</mat-option>
            <mat-option value="submitted">Submitted</mat-option>
            <mat-option value="approved">Approved</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Date From</mat-label>
          <input matInput [matDatepicker]="fromPicker" [(ngModel)]="filter.dateFrom" (dateChange)="applyFilter()">
          <mat-datepicker-toggle matSuffix [for]="fromPicker"></mat-datepicker-toggle>
          <mat-datepicker #fromPicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Date To</mat-label>
          <input matInput [matDatepicker]="toPicker" [(ngModel)]="filter.dateTo" (dateChange)="applyFilter()">
          <mat-datepicker-toggle matSuffix [for]="toPicker"></mat-datepicker-toggle>
          <mat-datepicker #toPicker></mat-datepicker>
        </mat-form-field>

        <button mat-button (click)="clearFilters()">
          <mat-icon>clear</mat-icon>
          Clear Filters
        </button>
      </div>

      <div class="table-container" *ngIf="progressReports$ | async as reports; else loading">
        <table mat-table [dataSource]="reports" class="mat-elevation-z2">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let report">
              {{formatDate(report.date)}}
            </td>
          </ng-container>

          <ng-container matColumnDef="project">
            <th mat-header-cell *matHeaderCellDef>Project</th>
            <td mat-cell *matCellDef="let report">
              {{report.projectName || 'N/A'}}
            </td>
          </ng-container>

          <ng-container matColumnDef="phase">
            <th mat-header-cell *matHeaderCellDef>Phase</th>
            <td mat-cell *matCellDef="let report">
              {{report.phaseName || '-'}}
            </td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Description</th>
            <td mat-cell *matCellDef="let report" class="description-cell">
              {{report.description}}
            </td>
          </ng-container>

          <ng-container matColumnDef="hours">
            <th mat-header-cell *matHeaderCellDef>Hours</th>
            <td mat-cell *matCellDef="let report">
              {{report.hoursWorked}}
            </td>
          </ng-container>

          <ng-container matColumnDef="staff">
            <th mat-header-cell *matHeaderCellDef>Staff</th>
            <td mat-cell *matCellDef="let report">
              <mat-chip-set>
                <mat-chip *ngFor="let name of report.staffNames">
                  {{name}}
                </mat-chip>
              </mat-chip-set>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let report">
              <mat-chip [color]="getStatusColor(report.status)" selected>
                {{report.status | titlecase}}
              </mat-chip>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let report">
              <button mat-icon-button [matTooltip]="'View Details'" (click)="viewDetails(report)">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button [matTooltip]="'Edit'" (click)="edit(report)" 
                      *ngIf="report.status === 'draft'">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button [matTooltip]="'Submit for Approval'" 
                      (click)="submitForApproval(report)"
                      *ngIf="report.status === 'draft'">
                <mat-icon>send</mat-icon>
              </button>
              <button mat-icon-button [matTooltip]="'Approve'" 
                      (click)="approve(report)"
                      *ngIf="report.status === 'submitted' && canApprove">
                <mat-icon>check_circle</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"
              [class.has-issues]="row.issuesEncountered"
              (click)="viewDetails(row)"></tr>
        </table>

        <div class="no-data" *ngIf="reports.length === 0">
          <mat-icon>assignment</mat-icon>
          <p>No progress reports found</p>
        </div>
      </div>

      <ng-template #loading>
        <div class="loading-container">
          <mat-spinner></mat-spinner>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .daily-progress-list {
      padding: 24px;
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }

    .filters mat-form-field {
      min-width: 200px;
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
    }

    .description-cell {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mat-row {
      cursor: pointer;
    }

    .mat-row:hover {
      background-color: #f5f5f5;
    }

    .mat-row.has-issues {
      border-left: 4px solid #ff9800;
    }

    .no-data {
      text-align: center;
      padding: 48px;
      color: #666;
    }

    .no-data mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ccc;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    mat-chip-set {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    mat-chip {
      font-size: 12px;
    }
  `]
})
export class DailyProgressListComponent implements OnInit {
  private dailyProgressService = inject(DailyProgressService);
  private projectService = inject(ProjectService);
  private staffService = inject(StaffService);
  private dateFormatService = inject(DateFormatService);
  private router = inject(Router);

  filter: DailyProgressFilter = {};
  private filterSubject = new BehaviorSubject<DailyProgressFilter>({});
  
  progressReports$: Observable<DailyProgress[]>;
  projects$ = this.projectService.getProjects();
  staff$ = this.staffService.getStaff();
  
  displayedColumns = ['date', 'project', 'phase', 'description', 'hours', 'staff', 'status', 'actions'];
  canApprove = false; // This should be based on user role

  constructor() {
    this.progressReports$ = this.filterSubject.pipe(
      switchMap(filter => this.dailyProgressService.getAll(filter))
    );
  }

  ngOnInit() {
    this.loadProgressReports();
  }

  loadProgressReports() {
    this.progressReports$ = this.dailyProgressService.getAll(this.filter);
  }

  applyFilter() {
    this.filterSubject.next(this.filter);
    this.loadProgressReports();
  }

  clearFilters() {
    this.filter = {};
    this.applyFilter();
  }

  formatDate(date: Date | any): string {
    return this.dateFormatService.formatDate(date);
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
        }
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
        }
      });
    }
  }
}