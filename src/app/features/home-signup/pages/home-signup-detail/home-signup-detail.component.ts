import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { HomeSignupService } from '../../../../core/services/home-signup.service';
import { PoleTrackerService } from '../../../pole-tracker/services/pole-tracker.service';
import { HomeSignup } from '../../../pole-tracker/models/pole-tracker.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-home-signup-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    PageHeaderComponent,
  ],
  template: `
    <div class="page-container">
      @if (loading()) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
        </div>
      } @else if (homeSignup()) {
        <app-page-header
          [title]="'Home Signup: ' + homeSignup()!.dropNumber"
          subtitle="View home signup details and data integrity status"
          [actions]="headerActions"
          [showBackButton]="true"
          backUrl="/home-signups"
        >
        </app-page-header>

        <!-- Basic Information -->
        <mat-card class="detail-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>home</mat-icon>
              Home Signup Information
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="detail-grid">
              <div class="detail-item">
                <mat-icon>cable</mat-icon>
                <div>
                  <h4>Drop Number</h4>
                  <p>{{ homeSignup()!.dropNumber }}</p>
                </div>
              </div>

              <div class="detail-item">
                <mat-icon>electrical_services</mat-icon>
                <div>
                  <h4>Connected Pole</h4>
                  <p>{{ homeSignup()!.connectedToPole }}</p>
                </div>
              </div>

              <div class="detail-item full-width">
                <mat-icon>location_on</mat-icon>
                <div>
                  <h4>Address</h4>
                  <p>{{ homeSignup()!.address }}</p>
                </div>
              </div>

              <div class="detail-item">
                <mat-icon>{{ getStatusIcon(homeSignup()!.status) }}</mat-icon>
                <div>
                  <h4>Status</h4>
                  <mat-chip>
                    {{ homeSignup()!.status | titlecase }}
                  </mat-chip>
                </div>
              </div>

              <div class="detail-item">
                <mat-icon>{{ homeSignup()!.poleValidated ? 'verified' : 'warning' }}</mat-icon>
                <div>
                  <h4>Validation Status</h4>
                  <mat-chip>
                    {{ homeSignup()!.poleValidated ? 'Validated' : 'Not Validated' }}
                  </mat-chip>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Data Integrity Status -->
        <mat-card class="detail-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>verified_user</mat-icon>
              Data Integrity Status
            </mat-card-title>
            <mat-card-subtitle> Real-time validation of pole-drop relationship </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (integrityStatus()) {
              <div class="integrity-grid">
                <div class="integrity-item">
                  <mat-icon [color]="integrityStatus()!.dropUnique ? 'primary' : 'warn'">
                    {{ integrityStatus()!.dropUnique ? 'check_circle' : 'error' }}
                  </mat-icon>
                  <div>
                    <h4>Drop Number Uniqueness</h4>
                    <p>
                      {{
                        integrityStatus()!.dropUnique
                          ? 'Unique across all collections'
                          : 'Duplicate found'
                      }}
                    </p>
                  </div>
                </div>

                <div class="integrity-item">
                  <mat-icon [color]="integrityStatus()!.poleExists ? 'primary' : 'warn'">
                    {{ integrityStatus()!.poleExists ? 'check_circle' : 'error' }}
                  </mat-icon>
                  <div>
                    <h4>Pole Existence</h4>
                    <p>
                      {{
                        integrityStatus()!.poleExists ? 'Pole exists in system' : 'Pole not found'
                      }}
                    </p>
                  </div>
                </div>

                <div class="integrity-item">
                  <mat-icon [color]="integrityStatus()!.poleCapacityOk ? 'primary' : 'warn'">
                    {{ integrityStatus()!.poleCapacityOk ? 'check_circle' : 'warning' }}
                  </mat-icon>
                  <div>
                    <h4>Pole Capacity</h4>
                    <p>
                      {{ integrityStatus()!.poleCapacityInfo?.count || 0 }}/12 drops
                      {{ integrityStatus()!.poleCapacityOk ? '(Available)' : '(At capacity)' }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Pole Capacity Details -->
              @if (integrityStatus()!.poleCapacityInfo) {
                <div class="capacity-details">
                  <h4>Pole Capacity Details</h4>
                  <mat-chip-set>
                    <mat-chip>
                      <mat-icon matChipAvatar>cable</mat-icon>
                      {{ integrityStatus()!.poleCapacityInfo!.count }}/12 Drops
                    </mat-chip>

                    @if (integrityStatus()!.poleCapacityInfo!.count >= 10) {
                      <mat-chip>
                        <mat-icon matChipAvatar>warning</mat-icon>
                        Near Capacity
                      </mat-chip>
                    }

                    @if (integrityStatus()!.poleCapacityInfo!.count >= 12) {
                      <mat-chip>
                        <mat-icon matChipAvatar>block</mat-icon>
                        At Maximum
                      </mat-chip>
                    }
                  </mat-chip-set>
                </div>
              }
            } @else {
              <div class="validation-loading">
                <mat-spinner diameter="32"></mat-spinner>
                <p>Validating data integrity...</p>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Timestamps -->
        <mat-card class="detail-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>schedule</mat-icon>
              Timestamps
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="detail-grid">
              <div class="detail-item">
                <mat-icon>add_circle</mat-icon>
                <div>
                  <h4>Created</h4>
                  <p>{{ formatDate(homeSignup()!.createdAt) }}</p>
                </div>
              </div>

              <div class="detail-item">
                <mat-icon>update</mat-icon>
                <div>
                  <h4>Last Updated</h4>
                  <p>{{ formatDate(homeSignup()!.updatedAt) }}</p>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="error-container">
          <mat-icon>error</mat-icon>
          <h3>Home Signup Not Found</h3>
          <p>The requested home signup could not be found.</p>
          <button mat-raised-button routerLink="/home-signups">
            <mat-icon>arrow_back</mat-icon>
            Back to Home Signups
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 24px;
        max-width: 1000px;
        margin: 0 auto;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 400px;
      }

      .detail-section {
        margin-bottom: 24px;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 24px;
      }

      .detail-item {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }

      .detail-item.full-width {
        grid-column: 1 / -1;
      }

      .detail-item mat-icon {
        margin-top: 4px;
        color: var(--ff-text-secondary);
      }

      .detail-item h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 500;
        color: var(--ff-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .detail-item p {
        margin: 0;
        font-size: 16px;
        font-weight: 400;
      }

      .integrity-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 24px;
        margin-bottom: 24px;
      }

      .integrity-item {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 16px;
        border: 1px solid var(--ff-border);
        border-radius: 8px;
      }

      .integrity-item h4 {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 500;
      }

      .integrity-item p {
        margin: 0;
        color: var(--ff-text-secondary);
      }

      .capacity-details {
        border-top: 1px solid var(--ff-border);
        padding-top: 24px;
      }

      .capacity-details h4 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 500;
      }

      .validation-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 48px;
      }

      .validation-loading p {
        margin: 0;
        color: var(--ff-text-secondary);
      }

      .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 48px;
        text-align: center;
      }

      .error-container mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: var(--ff-text-secondary);
      }

      .error-container h3 {
        margin: 0;
        font-size: 24px;
      }

      .error-container p {
        margin: 0;
        color: var(--ff-text-secondary);
      }

      @media (max-width: 768px) {
        .detail-grid,
        .integrity-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class HomeSignupDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private homeSignupService = inject(HomeSignupService);
  private poleTrackerService = inject(PoleTrackerService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // State
  loading = signal(true);
  homeSignup = signal<HomeSignup | null>(null);
  integrityStatus = signal<{
    dropUnique: boolean;
    poleExists: boolean;
    poleCapacityOk: boolean;
    poleCapacityInfo?: { count: number; canAddMore: boolean };
  } | null>(null);

  homeSignupId: string = '';

  // Header actions
  headerActions = [
    {
      label: 'Edit',
      icon: 'edit',
      color: 'primary' as const,
      variant: 'raised' as const,
      action: () => {
        this.router.navigate(['/home-signups', this.homeSignupId, 'edit']);
      },
    },
    {
      label: 'Delete',
      icon: 'delete',
      color: 'warn' as const,
      variant: 'stroked' as const,
      action: () => {
        this.deleteHomeSignup();
      },
    },
  ];

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.homeSignupId = params['id'];
      this.loadHomeSignup();
    });
  }

  loadHomeSignup() {
    this.homeSignupService.getHomeSignup(this.homeSignupId).subscribe({
      next: (homeSignup) => {
        if (homeSignup) {
          this.homeSignup.set(homeSignup);
          this.validateDataIntegrity(homeSignup);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading home signup:', error);
        this.snackBar.open('Error loading home signup', 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  async validateDataIntegrity(homeSignup: HomeSignup) {
    try {
      // Check drop number uniqueness
      const dropUnique = await this.poleTrackerService.validateDropNumberUniqueness(
        homeSignup.dropNumber,
        homeSignup.id,
      );

      // Check pole existence
      const poleExists = await this.poleTrackerService.validatePoleExists(
        homeSignup.connectedToPole,
      );

      // Check pole capacity
      const poleCapacityInfo = await this.poleTrackerService.checkPoleCapacity(
        homeSignup.connectedToPole,
      );
      const poleCapacityOk = poleCapacityInfo.canAddMore;

      this.integrityStatus.set({
        dropUnique,
        poleExists,
        poleCapacityOk,
        poleCapacityInfo,
      });
    } catch (error) {
      console.error('Error validating data integrity:', error);
      this.integrityStatus.set({
        dropUnique: false,
        poleExists: false,
        poleCapacityOk: false,
      });
    }
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    switch (status) {
      case 'approved':
      case 'completed':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'rejected':
        return 'warn';
      default:
        return 'accent';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'approved':
        return 'check_circle';
      case 'completed':
        return 'verified';
      case 'pending':
        return 'pending';
      case 'rejected':
        return 'cancel';
      default:
        return 'help';
    }
  }

  getCapacityColor(count: number): 'primary' | 'accent' | 'warn' {
    if (count >= 12) return 'warn';
    if (count >= 10) return 'accent';
    return 'primary';
  }

  formatDate(date: any): string {
    if (!date) return '';

    // Handle Firestore Timestamp
    if (date.toDate) {
      return date.toDate().toLocaleString();
    }

    // Handle regular Date
    if (date instanceof Date) {
      return date.toLocaleString();
    }

    return '';
  }

  deleteHomeSignup() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Home Signup',
        message: `Are you sure you want to delete the home signup for drop "${this.homeSignup()?.dropNumber}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.homeSignupService.deleteHomeSignup(this.homeSignupId).subscribe({
          next: () => {
            this.snackBar.open('Home signup deleted successfully', 'Close', { duration: 3000 });
            this.router.navigate(['/home-signups']);
          },
          error: (error) => {
            console.error('Error deleting home signup:', error);
            const errorMessage = error.message || 'Failed to delete home signup';
            this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
          },
        });
      }
    });
  }
}
