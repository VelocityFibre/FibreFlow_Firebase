import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-report-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="report-viewer-container">
      <mat-card class="report-card">
        <mat-card-header>
          <mat-card-title>Report Viewer</mat-card-title>
          <mat-card-subtitle>{{ reportType }} Report - {{ reportId }}</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="placeholder-content">
            <mat-icon>description</mat-icon>
            <h2>Report Viewer Coming Soon</h2>
            <p>The report viewer component will display:</p>
            <ul>
              <li>Formatted report content</li>
              <li>Charts and visualizations</li>
              <li>Export options (PDF, Excel)</li>
              <li>Email distribution</li>
            </ul>
          </div>
        </mat-card-content>
        
        <mat-card-actions>
          <button mat-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Back to Reports
          </button>
          <button mat-raised-button color="primary" disabled>
            <mat-icon>download</mat-icon>
            Download PDF
          </button>
          <button mat-raised-button disabled>
            <mat-icon>email</mat-icon>
            Email Report
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .report-viewer-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .placeholder-content {
      text-align: center;
      padding: 60px 20px;
    }
    
    .placeholder-content mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--mat-sys-on-surface-variant);
      margin-bottom: 24px;
    }
    
    .placeholder-content h2 {
      margin: 0 0 16px 0;
      color: var(--mat-sys-on-surface);
    }
    
    .placeholder-content ul {
      text-align: left;
      display: inline-block;
      margin-top: 16px;
    }
    
    mat-card-actions {
      display: flex;
      gap: 8px;
      padding: 16px;
    }
  `]
})
export class ReportViewerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  reportType: string = '';
  reportId: string = '';
  
  ngOnInit() {
    this.reportType = this.route.snapshot.data['reportType'] || '';
    this.reportId = this.route.snapshot.params['id'] || '';
  }
  
  goBack() {
    this.router.navigate(['/reports']);
  }
}