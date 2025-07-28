import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PoleAnalyticsService } from '../../services/pole-analytics.service';

interface PoleReportSummary {
  poleNumber: string;
  lastGenerated: string;
  version: 'current' | 'previous';
  totalRecords: number;
  totalDrops: number;
  totalAgents: number;
  dataSource: 'CSV' | 'Firestore';
  status: 'available' | 'generating' | 'error';
}

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.scss'],
})
export class AnalyticsDashboardComponent implements OnInit {
  private router = inject(Router);
  private analyticsService = inject(PoleAnalyticsService);

  availableReports = signal<PoleReportSummary[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Search and filter
  searchTerm = signal('');
  selectedSource = signal<string>('all');
  selectedStatus = signal<string>('all');

  displayedColumns = ['poleNumber', 'lastGenerated', 'summary', 'dataSource', 'actions'];

  // Filter computed values
  filteredReports = computed(() => {
    const reports = this.availableReports();
    const search = this.searchTerm().toLowerCase();
    const source = this.selectedSource();
    const status = this.selectedStatus();

    return reports.filter((report) => {
      const matchesSearch = !search || report.poleNumber.toLowerCase().includes(search);
      const matchesSource = source === 'all' || report.dataSource === source;
      const matchesStatus = status === 'all' || report.status === status;

      return matchesSearch && matchesSource && matchesStatus;
    });
  });

  // Dashboard statistics
  dashboardStats = computed(() => {
    const reports = this.availableReports();
    const total = reports.length;
    const available = reports.filter((r) => r.status === 'available').length;
    const csvReports = reports.filter((r) => r.dataSource === 'CSV').length;
    const firestoreReports = reports.filter((r) => r.dataSource === 'Firestore').length;

    return {
      total,
      available,
      csvReports,
      firestoreReports,
      availabilityRate: total > 0 ? Math.round((available / total) * 100) : 0,
    };
  });

  ngOnInit() {
    this.loadAvailableReports();
  }

  loadAvailableReports() {
    this.loading.set(true);
    this.error.set(null);

    this.analyticsService.getAvailableReportsForDashboard().subscribe({
      next: (reports) => {
        this.availableReports.set(reports);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load reports:', err);
        this.error.set('Failed to load available reports. Please try again.');
        this.loading.set(false);

        // Fallback to mock data for demo purposes
        const mockReports: PoleReportSummary[] = [
          {
            poleNumber: 'LAW.P.A508',
            lastGenerated: new Date().toISOString(),
            version: 'current',
            totalRecords: 15,
            totalDrops: 3,
            totalAgents: 2,
            dataSource: 'CSV',
            status: 'available',
          },
          {
            poleNumber: 'LAW.P.A707',
            lastGenerated: new Date(Date.now() - 86400000).toISOString(), // Yesterday
            version: 'current',
            totalRecords: 28,
            totalDrops: 5,
            totalAgents: 6,
            dataSource: 'CSV',
            status: 'available',
          },
        ];

        this.availableReports.set(mockReports);
      },
    });
  }

  refreshReports() {
    this.loadAvailableReports();
  }

  viewPoleReport(poleNumber: string) {
    this.router.navigate(['/analytics/pole-report', poleNumber]);
  }

  generateReport(poleNumber: string) {
    // TODO: Implement report generation
    console.log('Generate report for pole:', poleNumber);
  }

  deleteReport(poleNumber: string) {
    // TODO: Implement report deletion
    console.log('Delete report for pole:', poleNumber);
  }

  formatDate(date: string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return d.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'available':
        return 'check_circle';
      case 'generating':
        return 'hourglass_empty';
      case 'error':
        return 'error';
      default:
        return 'help';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'available':
        return 'primary';
      case 'generating':
        return 'accent';
      case 'error':
        return 'warn';
      default:
        return '';
    }
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }
}
