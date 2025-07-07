import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { PoleTrackerService } from '../../services/pole-tracker.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PlannedPole, PoleInstallation } from '../../models/mobile-pole-tracker.model';

interface AssignmentGroup {
  status: string;
  count: number;
  poles: PlannedPole[];
}

@Component({
  selector: 'app-my-assignments',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatBadgeModule,
    MatDividerModule,
  ],
  template: `
    <div class="assignments-container">
      <div class="header">
        <h1>My Assignments</h1>
        <button mat-icon-button (click)="refreshAssignments()">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Loading assignments...</p>
        </div>
      } @else {
        <div class="stats-cards">
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ totalAssignments() }}</div>
              <div class="stat-label">Total Assigned</div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ completedToday() }}</div>
              <div class="stat-label">Completed Today</div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card pending">
            <mat-card-content>
              <div class="stat-value">{{ pendingAssignments() }}</div>
              <div class="stat-label">Pending</div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="assignment-groups">
          @for (group of assignmentGroups(); track group.status) {
            <mat-card class="group-card">
              <mat-card-header>
                <mat-card-title>
                  {{ group.status | titlecase }}
                  <mat-chip [matBadge]="group.count" matBadgeColor="primary" matBadgeSize="small">
                    {{ group.count }}
                  </mat-chip>
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @for (pole of group.poles; track pole.id) {
                  <div class="pole-item" (click)="navigateToPole(pole)">
                    <div class="pole-info">
                      <h4>{{ pole.clientPoleNumber }}</h4>
                      <p>{{ pole.plannedLocation.address || 'No address' }}</p>
                      @if (pole.notes) {
                        <p class="notes">{{ pole.notes }}</p>
                      }
                    </div>
                    <div class="pole-actions">
                      @switch (pole.status) {
                        @case ('planned') {
                          <button
                            mat-icon-button
                            color="primary"
                            (click)="startCapture(pole, $event)"
                          >
                            <mat-icon>camera_alt</mat-icon>
                          </button>
                        }
                        @case ('in_progress') {
                          <button
                            mat-icon-button
                            color="accent"
                            (click)="continueCapture(pole, $event)"
                          >
                            <mat-icon>edit</mat-icon>
                          </button>
                        }
                        @case ('installed') {
                          <mat-icon color="primary">check_circle</mat-icon>
                        }
                      }
                      <button mat-icon-button (click)="navigateToMap(pole, $event)">
                        <mat-icon>map</mat-icon>
                      </button>
                    </div>
                  </div>
                  @if (!$last) {
                    <mat-divider></mat-divider>
                  }
                }
              </mat-card-content>
            </mat-card>
          }
        </div>

        @if (assignmentGroups().length === 0) {
          <mat-card class="empty-state">
            <mat-card-content>
              <mat-icon>assignment</mat-icon>
              <h3>No Assignments</h3>
              <p>You don't have any pole assignments yet.</p>
              <p>Contact your supervisor for new assignments.</p>
            </mat-card-content>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [
    `
      .assignments-container {
        padding: 16px;
        max-width: 600px;
        margin: 0 auto;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;

        h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 500;
        }
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        gap: 16px;
      }

      .stats-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
        margin-bottom: 20px;
      }

      .stat-card {
        text-align: center;

        mat-card-content {
          padding: 16px !important;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 600;
          color: var(--mat-sys-primary);
        }

        .stat-label {
          font-size: 12px;
          color: var(--mat-sys-on-surface-variant);
          margin-top: 4px;
        }

        &.pending {
          .stat-value {
            color: var(--mat-sys-error);
          }
        }
      }

      .assignment-groups {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .group-card {
        mat-card-header {
          padding-bottom: 8px;
        }

        mat-card-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
        }
      }

      .pole-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
          background-color: var(--mat-sys-surface-variant);
          margin: 0 -16px;
          padding: 12px 16px;
        }

        .pole-info {
          flex: 1;

          h4 {
            margin: 0;
            font-weight: 500;
            color: var(--mat-sys-on-surface);
          }

          p {
            margin: 4px 0 0;
            font-size: 14px;
            color: var(--mat-sys-on-surface-variant);
          }

          .notes {
            font-style: italic;
            font-size: 12px;
          }
        }

        .pole-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }

      .empty-state {
        margin-top: 40px;
        text-align: center;

        mat-card-content {
          padding: 40px !important;
        }

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: var(--mat-sys-on-surface-variant);
          margin-bottom: 16px;
        }

        h3 {
          margin: 0 0 8px;
          color: var(--mat-sys-on-surface);
        }

        p {
          margin: 0;
          color: var(--mat-sys-on-surface-variant);
        }
      }

      @media (max-width: 480px) {
        .assignments-container {
          padding: 12px;
        }

        .header h1 {
          font-size: 20px;
        }

        .stat-card .stat-value {
          font-size: 24px;
        }
      }
    `,
  ],
})
export class MyAssignmentsComponent implements OnInit {
  private poleService = inject(PoleTrackerService);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(true);
  assignments = signal<PlannedPole[]>([]);
  installations = signal<PoleInstallation[]>([]);

  currentUserId = computed(() => this.authService.currentUser()?.uid || '');

  totalAssignments = computed(() => this.assignments().length);

  pendingAssignments = computed(
    () =>
      this.assignments().filter((a) => a.status === 'planned' || a.status === 'assigned').length,
  );

  completedToday = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.installations().filter((i) => {
      const installDate =
        i.installationDate instanceof Date ? i.installationDate : i.installationDate.toDate();
      return installDate >= today && i.installedBy === this.currentUserId();
    }).length;
  });

  assignmentGroups = computed(() => {
    const grouped = this.assignments().reduce(
      (acc, pole) => {
        const status = pole.status || 'planned';
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(pole);
        return acc;
      },
      {} as Record<string, PlannedPole[]>,
    );

    return Object.entries(grouped)
      .map(([status, poles]) => ({
        status,
        count: poles.length,
        poles: poles.sort((a, b) => a.clientPoleNumber.localeCompare(b.clientPoleNumber)),
      }))
      .sort((a, b) => {
        const order = ['in_progress', 'planned', 'assigned', 'installed', 'verified'];
        return order.indexOf(a.status) - order.indexOf(b.status);
      });
  });

  ngOnInit() {
    this.loadAssignments();
  }

  async loadAssignments() {
    this.loading.set(true);
    try {
      // TODO: Replace with actual service calls when methods are implemented
      // const assignments = await this.poleService.getAssignmentsByContractor(this.currentUserId());
      // const installations = await this.poleService.getInstallationsByUser(this.currentUserId());

      // Temporary mock data
      this.assignments.set([]);
      this.installations.set([]);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      this.loading.set(false);
    }
  }

  refreshAssignments() {
    this.loadAssignments();
  }

  navigateToPole(pole: PlannedPole) {
    this.router.navigate(['/pole-tracker/mobile', pole.id]);
  }

  startCapture(pole: PlannedPole, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/pole-tracker/mobile/capture', pole.id]);
  }

  continueCapture(pole: PlannedPole, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/pole-tracker/mobile/capture', pole.id]);
  }

  navigateToMap(pole: PlannedPole, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/pole-tracker/mobile'], {
      queryParams: {
        lat: pole.plannedLocation.lat,
        lng: pole.plannedLocation.lng,
        zoom: 18,
      },
    });
  }
}
