import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { PoleAnalyticsService } from '../../services/pole-analytics.service';
import { PoleTimelineComponent } from '../../components/pole-timeline/pole-timeline.component';
import { ConnectedDropsComponent } from '../../components/connected-drops/connected-drops.component';
import { AgentActivityComponent } from '../../components/agent-activity/agent-activity.component';
import { PoleReport } from '../../models/pole-report.model';

@Component({
  selector: 'app-pole-detail-report',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatSnackBarModule,
    MatChipsModule,
    PoleTimelineComponent,
    ConnectedDropsComponent,
    AgentActivityComponent,
  ],
  templateUrl: './pole-detail-report.component.html',
  styleUrls: ['./pole-detail-report.component.scss'],
})
export class PoleDetailReportComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private poleService = inject(PoleAnalyticsService);
  private snackBar = inject(MatSnackBar);

  poleNumber = signal<string>('');
  report = signal<PoleReport | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    // Get pole number from route
    this.route.params.subscribe((params) => {
      const poleNumber = params['poleNumber'];
      if (poleNumber) {
        this.poleNumber.set(poleNumber);
        this.loadReport(poleNumber);
      }
    });
  }

  loadReport(poleNumber: string) {
    this.loading.set(true);
    this.error.set(null);

    this.poleService.getPoleReport(poleNumber).subscribe({
      next: (report) => {
        if (report) {
          this.report.set(report);
        } else {
          this.error.set('No report found for this pole');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading report:', err);
        this.error.set('Failed to load pole report');
        this.loading.set(false);
      },
    });
  }

  refreshReport() {
    if (this.poleNumber()) {
      this.loadReport(this.poleNumber());
    }
  }

  exportPDF() {
    // TODO: Implement PDF export
    this.snackBar.open('PDF export coming soon', 'Close', { duration: 3000 });
  }

  exportExcel() {
    // TODO: Implement Excel export
    this.snackBar.open('Excel export coming soon', 'Close', { duration: 3000 });
  }

  formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getTimeSpanText(days?: number): string {
    if (!days) return '';
    if (days === 0) return 'Same day';
    if (days === 1) return '1 day';
    return `${days} days`;
  }
}
