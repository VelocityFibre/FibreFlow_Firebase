import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { SelectionModel } from '@angular/cdk/collections';
import { PoleTrackerService } from '../../services/pole-tracker.service';
import { PoleInstallation, VerificationStatus } from '../../models/mobile-pole-tracker.model';
import { PhotoViewerDialogComponent } from '../photo-viewer-dialog/photo-viewer-dialog.component';
import { PoleDetailsDialogComponent } from '../pole-details-dialog/pole-details-dialog.component';

@Component({
  selector: 'app-verification-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="verification-container">
      <h1>Pole Verification Dashboard</h1>
      <p>Verification dashboard will be implemented in Phase 5</p>
    </div>
  `,
  styles: [
    `
      .verification-container {
        padding: 24px;
      }
    `,
  ],
})
export class VerificationDashboardComponent implements OnInit {
  private poleService = inject(PoleTrackerService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Data signals
  installations = signal<PoleInstallation[]>([]);
  loading = signal(true);
  selection = new SelectionModel<PoleInstallation>(true, []);

  // Filter signals
  statusFilter = signal('pending');
  contractorFilter = signal('all');
  deviationFilter = signal('all');

  // Computed values
  filteredInstallations = computed(() => {
    let filtered = this.installations();

    // Status filter
    if (this.statusFilter() !== 'all') {
      filtered = filtered.filter(
        (p) => (p.verificationStatus || 'pending') === this.statusFilter(),
      );
    }

    // Contractor filter
    if (this.contractorFilter() !== 'all') {
      filtered = filtered.filter((p) => p.contractorName === this.contractorFilter());
    }

    // Deviation filter
    if (this.deviationFilter() !== 'all') {
      switch (this.deviationFilter()) {
        case 'valid':
          filtered = filtered.filter((p) => p.locationDeviation < 10);
          break;
        case 'warning':
          filtered = filtered.filter((p) => p.locationDeviation >= 10 && p.locationDeviation <= 20);
          break;
        case 'invalid':
          filtered = filtered.filter((p) => p.locationDeviation > 20);
          break;
      }
    }

    return filtered;
  });

  contractors = computed(() => {
    const contractorSet = new Set(
      this.installations()
        .map((p) => p.contractorName)
        .filter((c) => c),
    );
    return Array.from(contractorSet).sort();
  });

  pendingCount = computed(
    () =>
      this.installations().filter(
        (p) => !p.verificationStatus || p.verificationStatus === 'pending',
      ).length,
  );

  approvedToday = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.installations().filter((p) => {
      if (p.verificationStatus !== 'approved' || !p.verificationDate) return false;
      const verifiedDate =
        p.verificationDate instanceof Date ? p.verificationDate : p.verificationDate.toDate();
      return verifiedDate >= today;
    }).length;
  });

  rejectedToday = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.installations().filter((p) => {
      if (p.verificationStatus !== 'rejected' || !p.verificationDate) return false;
      const verifiedDate =
        p.verificationDate instanceof Date ? p.verificationDate : p.verificationDate.toDate();
      return verifiedDate >= today;
    }).length;
  });

  averageDeviationMeters = computed(() => {
    const deviations = this.installations().map((p) => p.locationDeviation);
    if (deviations.length === 0) return 0;
    const sum = deviations.reduce((a, b) => a + b, 0);
    return Math.round(sum / deviations.length);
  });

  displayedColumns = [
    'select',
    'vfPoleId',
    'project',
    'contractor',
    'installedDate',
    'deviation',
    'photos',
    'status',
    'actions',
  ];

  ngOnInit() {
    this.loadInstallations();
  }

  async loadInstallations() {
    this.loading.set(true);
    try {
      const installations = await this.poleService.getAllInstalledPoles();
      this.installations.set(installations);
    } catch (error) {
      console.error('Error loading installations:', error);
      this.snackBar.open('Error loading pole installations', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : date.toDate();
    return formatDate(d, 'dd MMM yyyy', 'en-ZA');
  }

  getPhotoCount(pole: PoleInstallation): string {
    let count = 0;
    if (pole.photos) {
      Object.values(pole.photos).forEach((photo) => {
        if (photo && photo.url) count++;
      });
    }
    return count.toString();
  }

  applyFilters() {
    // Filters are applied via computed signal
    this.selection.clear();
  }

  resetFilters() {
    this.statusFilter.set('pending');
    this.contractorFilter.set('all');
    this.deviationFilter.set('all');
    this.selection.clear();
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.filteredInstallations().length;
    return numSelected === numRows;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.filteredInstallations().forEach((row) => this.selection.select(row));
    }
  }

  async approvePole(pole: PoleInstallation) {
    try {
      await this.poleService.updatePoleVerification(pole.id, 'approved');
      this.snackBar.open('Pole approved successfully', 'Close', { duration: 3000 });
      await this.loadInstallations();
    } catch (error) {
      console.error('Error approving pole:', error);
      this.snackBar.open('Error approving pole', 'Close', { duration: 3000 });
    }
  }

  async rejectPole(pole: PoleInstallation) {
    // TODO: Add dialog to get rejection reason
    try {
      await this.poleService.updatePoleVerification(
        pole.id,
        'rejected',
        'Requires re-installation',
      );
      this.snackBar.open('Pole rejected', 'Close', { duration: 3000 });
      await this.loadInstallations();
    } catch (error) {
      console.error('Error rejecting pole:', error);
      this.snackBar.open('Error rejecting pole', 'Close', { duration: 3000 });
    }
  }

  async bulkApprove() {
    const selected = this.selection.selected;
    if (selected.length === 0) return;

    try {
      const promises = selected.map((pole) =>
        this.poleService.updatePoleVerification(pole.id, 'approved'),
      );
      await Promise.all(promises);

      this.snackBar.open(`${selected.length} poles approved successfully`, 'Close', {
        duration: 3000,
      });
      this.selection.clear();
      await this.loadInstallations();
    } catch (error) {
      console.error('Error bulk approving poles:', error);
      this.snackBar.open('Error approving poles', 'Close', { duration: 3000 });
    }
  }

  viewPhotos(pole: PoleInstallation) {
    this.dialog.open(PhotoViewerDialogComponent, {
      data: { pole },
      width: '90vw',
      maxWidth: '900px',
      maxHeight: '90vh',
    });
  }

  viewDetails(pole: PoleInstallation) {
    this.dialog.open(PoleDetailsDialogComponent, {
      data: { pole },
      width: '90vw',
      maxWidth: '700px',
      maxHeight: '90vh',
    });
  }
}
