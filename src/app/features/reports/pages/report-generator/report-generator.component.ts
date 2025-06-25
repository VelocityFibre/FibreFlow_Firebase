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
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

import { ReportService } from '../../services/report.service';
import { ReportPDFService } from '../../services/report-pdf.service';
import { ProjectService } from '../../../../core/services/project.service';
import { Project } from '../../../../core/models/project.model';
import { DailyReport, WeeklyReport, MonthlyReport } from '../../models/report.model';

@Component({
  selector: 'app-report-generator',
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
    MatRadioModule,
    MatDividerModule,
  ],
  template: `
    <div class="report-generator-container">
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>Generate Report</mat-card-title>
          <mat-card-subtitle>Create daily, weekly, or monthly reports</mat-card-subtitle>
        </mat-card-header>
      </mat-card>

      <mat-card class="form-card">
        <mat-card-content>
          <form [formGroup]="reportForm" (ngSubmit)="generateReport()">
            <!-- Report Type Selection -->
            <div class="report-type-section">
              <h3>Select Report Type</h3>
              <mat-radio-group formControlName="reportType" class="radio-group">
                <mat-radio-button value="daily">
                  <mat-icon>today</mat-icon>
                  Daily Report
                </mat-radio-button>
                <mat-radio-button value="weekly">
                  <mat-icon>date_range</mat-icon>
                  Weekly Report
                </mat-radio-button>
                <mat-radio-button value="monthly">
                  <mat-icon>calendar_month</mat-icon>
                  Monthly Report
                </mat-radio-button>
              </mat-radio-group>
            </div>

            <mat-divider class="my-4"></mat-divider>

            <!-- Project Selection -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Select Project</mat-label>
              <mat-select formControlName="projectId" required>
                @for (project of projects(); track project.id) {
                  <mat-option [value]="project.id">{{ project.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <!-- Date Selection based on Report Type -->
            @switch (reportForm.get('reportType')?.value) {
              @case ('daily') {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Select Date</mat-label>
                  <input matInput [matDatepicker]="dailyPicker" formControlName="date" required />
                  <mat-datepicker-toggle matIconSuffix [for]="dailyPicker"></mat-datepicker-toggle>
                  <mat-datepicker #dailyPicker></mat-datepicker>
                </mat-form-field>
              }
              @case ('weekly') {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Select Week Start Date</mat-label>
                  <input matInput [matDatepicker]="weeklyPicker" formControlName="weekStart" required />
                  <mat-datepicker-toggle matIconSuffix [for]="weeklyPicker"></mat-datepicker-toggle>
                  <mat-datepicker #weeklyPicker></mat-datepicker>
                  <mat-hint>Select any Monday to generate report for that week</mat-hint>
                </mat-form-field>
              }
              @case ('monthly') {
                <div class="month-selection">
                  <mat-form-field appearance="outline">
                    <mat-label>Select Month</mat-label>
                    <mat-select formControlName="month" required>
                      @for (month of months; track month.value) {
                        <mat-option [value]="month.value">{{ month.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Select Year</mat-label>
                    <mat-select formControlName="year" required>
                      @for (year of years; track year) {
                        <mat-option [value]="year">{{ year }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                </div>
              }
            }

            <!-- Generate Button -->
            <div class="form-actions">
              <button mat-raised-button type="button" (click)="cancel()">Cancel</button>
              <button 
                mat-raised-button 
                color="primary" 
                type="submit" 
                [disabled]="loading() || reportForm.invalid"
              >
                @if (loading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <mat-icon>description</mat-icon>
                  Generate Report
                }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Recent Reports -->
      @if (recentReports().length > 0) {
        <mat-card class="recent-reports-card">
          <mat-card-header>
            <mat-card-title>Recent Reports</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="recent-reports-list">
              @for (report of recentReports(); track report.id) {
                <div class="report-item" (click)="viewReport(report)">
                  <mat-icon [class]="'report-icon ' + report.reportType">
                    @switch (report.reportType) {
                      @case ('daily') { today }
                      @case ('weekly') { date_range }
                      @case ('monthly') { calendar_month }
                    }
                  </mat-icon>
                  <div class="report-details">
                    <div class="report-title">{{ report.projectName }} - {{ getReportTypeLabel(report.reportType) }}</div>
                    <div class="report-date">{{ formatReportPeriod(report) }}</div>
                  </div>
                  <mat-icon class="view-icon">arrow_forward</mat-icon>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .report-generator-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .header-card {
      margin-bottom: 24px;
    }

    .form-card {
      margin-bottom: 24px;
    }

    .report-type-section h3 {
      margin: 0 0 16px 0;
      color: var(--mat-sys-on-surface);
    }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .radio-group mat-radio-button {
      display: flex;
      align-items: center;
    }

    .radio-group mat-icon {
      margin-right: 8px;
      margin-left: 8px;
    }

    .full-width {
      width: 100%;
    }

    .my-4 {
      margin: 24px 0;
    }

    .month-selection {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-actions {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .recent-reports-card {
      margin-top: 24px;
    }

    .recent-reports-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .report-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px;
      border-radius: 8px;
      background: var(--mat-sys-surface-variant);
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .report-item:hover {
      background: var(--mat-sys-surface-container-high);
    }

    .report-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .report-icon.daily {
      color: var(--mat-sys-primary);
    }

    .report-icon.weekly {
      color: var(--mat-sys-secondary);
    }

    .report-icon.monthly {
      color: var(--mat-sys-tertiary);
    }

    .report-details {
      flex: 1;
    }

    .report-title {
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .report-date {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      margin-top: 2px;
    }

    .view-icon {
      color: var(--mat-sys-on-surface-variant);
    }

    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    @media (max-width: 600px) {
      .month-selection {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ReportGeneratorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private reportService = inject(ReportService);
  private reportPDFService = inject(ReportPDFService);
  private projectService = inject(ProjectService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  // Signals
  projects = signal<Project[]>([]);
  loading = signal(false);
  recentReports = signal<any[]>([]);

  // Form
  reportForm!: FormGroup;

  // Data
  months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  years: number[] = [];

  ngOnInit() {
    this.initializeForm();
    this.loadProjects();
    this.generateYears();
    this.setupFormListeners();
  }

  private initializeForm() {
    const currentDate = new Date();
    
    this.reportForm = this.fb.group({
      reportType: ['daily', Validators.required],
      projectId: ['', Validators.required],
      date: [currentDate],
      weekStart: [this.getMonday(currentDate)],
      month: [currentDate.getMonth() + 1],
      year: [currentDate.getFullYear()]
    });
  }

  private loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        // Auto-select first project if only one
        if (projects.length === 1) {
          this.reportForm.patchValue({ projectId: projects[0].id });
        }
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.snackBar.open('Error loading projects', 'Close', { duration: 3000 });
      }
    });
  }

  private generateYears() {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 2; i--) {
      this.years.push(i);
    }
  }

  private setupFormListeners() {
    // Clear date fields when report type changes
    this.reportForm.get('reportType')?.valueChanges.subscribe(type => {
      const currentDate = new Date();
      
      switch (type) {
        case 'daily':
          this.reportForm.patchValue({ date: currentDate });
          break;
        case 'weekly':
          this.reportForm.patchValue({ weekStart: this.getMonday(currentDate) });
          break;
        case 'monthly':
          this.reportForm.patchValue({
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear()
          });
          break;
      }
    });
  }

  private getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  async generateReport() {
    if (this.reportForm.invalid) return;

    this.loading.set(true);
    const formValue = this.reportForm.value;

    try {
      let report: DailyReport | WeeklyReport | MonthlyReport;
      
      switch (formValue.reportType) {
        case 'daily':
          report = await this.reportService.generateDailyReport(
            formValue.projectId, 
            new Date(formValue.date)
          );
          break;
          
        case 'weekly':
          report = await this.reportService.generateWeeklyReport(
            formValue.projectId,
            new Date(formValue.weekStart)
          );
          break;
          
        case 'monthly':
          report = await this.reportService.generateMonthlyReport(
            formValue.projectId,
            formValue.month,
            formValue.year
          );
          break;
          
        default:
          throw new Error(`Unsupported report type: ${formValue.reportType}`);
      }

      this.loading.set(false);
      
      // Generate PDF
      const pdf = this.reportPDFService.generateReportPDF(report);
      
      // Show options
      this.snackBar.open('Report generated successfully!', 'Download PDF', { duration: 10000 })
        .onAction()
        .subscribe(() => {
          // Download PDF
          const filename = `${report.projectName}_${report.reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`;
          this.reportPDFService.savePDF(pdf, filename);
        });
      
      // Also navigate to viewer
      setTimeout(() => {
        this.router.navigate(['/reports', formValue.reportType, report.id]);
      }, 1000);

    } catch (error) {
      this.loading.set(false);
      console.error('Error generating report:', error);
      this.snackBar.open('Error generating report. Please ensure data exists for the selected period.', 'Close', { 
        duration: 5000 
      });
    }
  }

  cancel() {
    this.router.navigate(['/reports']);
  }

  viewReport(report: any) {
    this.router.navigate(['/reports', report.reportType, report.id]);
  }

  getReportTypeLabel(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1) + ' Report';
  }

  formatReportPeriod(report: any): string {
    const start = new Date(report.period.start);
    const end = new Date(report.period.end);
    
    if (report.reportType === 'daily') {
      return start.toLocaleDateString();
    } else if (report.reportType === 'weekly') {
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    } else {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }
}