import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { HomeSignupService } from '../../../../core/services/home-signup.service';
import { HomeSignup } from '../../../pole-tracker/models/pole-tracker.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-home-signup-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    PageHeaderComponent,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Home Signups"
        subtitle="Manage home signup requests with data integrity validation"
        [actions]="headerActions"
      >
      </app-page-header>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
        </div>
      } @else {
        <!-- Summary Cards -->
        <div class="summary-cards">
          <mat-card>
            <mat-card-content>
              <div class="stat-item">
                <mat-icon color="primary">home</mat-icon>
                <div>
                  <h3>{{ homeSignups().length }}</h3>
                  <p>Total Signups</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-content>
              <div class="stat-item">
                <mat-icon color="accent">pending</mat-icon>
                <div>
                  <h3>{{ getPendingCount() }}</h3>
                  <p>Pending</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-content>
              <div class="stat-item">
                <mat-icon color="primary">check_circle</mat-icon>
                <div>
                  <h3>{{ getApprovedCount() }}</h3>
                  <p>Approved</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Home Signups Table -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Home Signups</mat-card-title>
            <mat-card-subtitle>
              All home signup requests with pole-drop relationship tracking
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="homeSignups()" class="full-width">
              <!-- Drop Number Column -->
              <ng-container matColumnDef="dropNumber">
                <th mat-header-cell *matHeaderCellDef>Drop Number</th>
                <td mat-cell *matCellDef="let signup">
                  <div class="drop-number">
                    <mat-icon>cable</mat-icon>
                    <strong>{{ signup.dropNumber }}</strong>
                  </div>
                </td>
              </ng-container>

              <!-- Connected Pole Column -->
              <ng-container matColumnDef="connectedToPole">
                <th mat-header-cell *matHeaderCellDef>Connected Pole</th>
                <td mat-cell *matCellDef="let signup">
                  <div class="pole-reference">
                    <mat-icon>electrical_services</mat-icon>
                    <span>{{ signup.connectedToPole }}</span>
                    @if (signup.poleValidated) {
                      <mat-icon color="primary" matTooltip="Pole validated">verified</mat-icon>
                    } @else {
                      <mat-icon color="warn" matTooltip="Pole not validated">warning</mat-icon>
                    }
                  </div>
                </td>
              </ng-container>

              <!-- Address Column -->
              <ng-container matColumnDef="address">
                <th mat-header-cell *matHeaderCellDef>Address</th>
                <td mat-cell *matCellDef="let signup">
                  <div class="address">
                    <mat-icon>location_on</mat-icon>
                    <span>{{ signup.address }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let signup">
                  <mat-chip>
                    <mat-icon matChipAvatar>{{ getStatusIcon(signup.status) }}</mat-icon>
                    {{ signup.status | titlecase }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Created Date Column -->
              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef>Created</th>
                <td mat-cell *matCellDef="let signup">
                  {{ formatDate(signup.createdAt) }}
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let signup">
                  <div class="actions">
                    <button
                      mat-icon-button
                      [routerLink]="['/home-signups', signup.id]"
                      matTooltip="View details"
                    >
                      <mat-icon>visibility</mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      [routerLink]="['/home-signups', signup.id, 'edit']"
                      matTooltip="Edit"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      color="warn"
                      (click)="deleteHomeSignup(signup)"
                      matTooltip="Delete"
                    >
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>

            @if (homeSignups().length === 0) {
              <div class="no-data">
                <mat-icon>home</mat-icon>
                <h3>No home signups yet</h3>
                <p>Create your first home signup to get started.</p>
                <button mat-raised-button color="primary" routerLink="/home-signups/new">
                  <mat-icon>add</mat-icon>
                  Create Home Signup
                </button>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 24px;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 400px;
      }

      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .stat-item {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .stat-item mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .stat-item h3 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
      }

      .stat-item p {
        margin: 0;
        color: var(--ff-text-secondary);
      }

      .full-width {
        width: 100%;
      }

      .drop-number,
      .pole-reference,
      .address {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .drop-number strong {
        font-weight: 600;
      }

      .actions {
        display: flex;
        gap: 4px;
      }

      .no-data {
        text-align: center;
        padding: 48px;
        color: var(--ff-text-secondary);
      }

      .no-data mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }

      .no-data h3 {
        margin: 0 0 8px 0;
        font-size: 20px;
      }

      .no-data p {
        margin: 0 0 24px 0;
      }

      @media (max-width: 768px) {
        .summary-cards {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class HomeSignupListComponent implements OnInit {
  private homeSignupService = inject(HomeSignupService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // State
  loading = signal(true);
  homeSignups = signal<HomeSignup[]>([]);

  // Table configuration
  displayedColumns: string[] = [
    'dropNumber',
    'connectedToPole',
    'address',
    'status',
    'createdAt',
    'actions',
  ];

  // Header actions
  headerActions = [
    {
      label: 'New Home Signup',
      icon: 'add',
      color: 'primary' as const,
      variant: 'raised' as const,
      action: () => {
        // Navigation handled by router
      },
      routerLink: '/home-signups/new',
    },
  ];

  ngOnInit() {
    this.loadHomeSignups();
  }

  loadHomeSignups() {
    this.homeSignupService.getAllHomeSignups().subscribe({
      next: (homeSignups) => {
        this.homeSignups.set(homeSignups);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading home signups:', error);
        this.snackBar.open('Error loading home signups', 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  getPendingCount(): number {
    return this.homeSignups().filter((signup) => signup.status === 'pending').length;
  }

  getApprovedCount(): number {
    return this.homeSignups().filter((signup) => signup.status === 'approved').length;
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

  formatDate(date: any): string {
    if (!date) return '';

    // Handle Firestore Timestamp
    if (date.toDate) {
      return date.toDate().toLocaleDateString();
    }

    // Handle regular Date
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }

    return '';
  }

  deleteHomeSignup(signup: HomeSignup) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Home Signup',
        message: `Are you sure you want to delete the home signup for drop "${signup.dropNumber}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.homeSignupService.deleteHomeSignup(signup.id!).subscribe({
          next: () => {
            this.snackBar.open('Home signup deleted successfully', 'Close', { duration: 3000 });
            this.loadHomeSignups(); // Refresh list
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
