import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PhaseService } from '../../../../core/services/phase.service';
import { ProjectService } from '../../../../core/services/project.service';
import { Phase, PhaseStatus } from '../../../../core/models/phase.model';
import { Observable, combineLatest, map, switchMap, of } from 'rxjs';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-phases-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink
  ],
  template: `
    <div class="phases-page">
      <div class="page-header">
        <h1>All Project Phases</h1>
        <p class="subtitle">View all phases across all projects</p>
      </div>
      
      <div class="phases-container" *ngIf="phasesWithProjects$ | async as phasesData; else loading">
        <mat-card *ngIf="phasesData.length === 0" class="empty-state">
          <mat-card-content>
            <mat-icon>timeline</mat-icon>
            <h2>No phases found</h2>
            <p>No project phases have been created yet.</p>
          </mat-card-content>
        </mat-card>

        <div class="phases-table-container" *ngIf="phasesData.length > 0">
          <table mat-table [dataSource]="phasesData" class="phases-table">
            <!-- Project Column -->
            <ng-container matColumnDef="project">
              <th mat-header-cell *matHeaderCellDef>Project</th>
              <td mat-cell *matCellDef="let item">
                <a [routerLink]="['/projects', item.projectId]" class="project-link">
                  <strong>{{ item.projectName }}</strong>
                  <span class="project-code">{{ item.projectCode }}</span>
                </a>
              </td>
            </ng-container>

            <!-- Phase Name Column -->
            <ng-container matColumnDef="phase">
              <th mat-header-cell *matHeaderCellDef>Phase</th>
              <td mat-cell *matCellDef="let item">
                <div class="phase-info">
                  <span class="phase-name">{{ item.phase.name }}</span>
                  <small *ngIf="item.phase.description">{{ item.phase.description }}</small>
                </div>
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let item">
                <mat-chip [ngClass]="'status-' + item.phase.status">
                  {{ getStatusLabel(item.phase.status) }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Assigned To Column -->
            <ng-container matColumnDef="assignedTo">
              <th mat-header-cell *matHeaderCellDef>Assigned To</th>
              <td mat-cell *matCellDef="let item">
                <span *ngIf="item.phase.assignedToDetails">
                  {{ item.phase.assignedToDetails.name }}
                </span>
                <span *ngIf="!item.phase.assignedToDetails" class="unassigned">
                  Unassigned
                </span>
              </td>
            </ng-container>

            <!-- Order Column -->
            <ng-container matColumnDef="order">
              <th mat-header-cell *matHeaderCellDef>Order</th>
              <td mat-cell *matCellDef="let item">
                <span class="order-badge">{{ item.phase.orderNo }}</span>
              </td>
            </ng-container>

            <!-- Dates Column -->
            <ng-container matColumnDef="dates">
              <th mat-header-cell *matHeaderCellDef>Timeline</th>
              <td mat-cell *matCellDef="let item">
                <div class="dates">
                  <span *ngIf="item.phase.startDate">
                    Start: {{ formatDate(item.phase.startDate) }}
                  </span>
                  <span *ngIf="item.phase.endDate">
                    End: {{ formatDate(item.phase.endDate) }}
                  </span>
                  <span *ngIf="!item.phase.startDate && !item.phase.endDate" class="no-dates">
                    No dates set
                  </span>
                </div>
              </td>
            </ng-container>

            <!-- Dependencies Column -->
            <ng-container matColumnDef="dependencies">
              <th mat-header-cell *matHeaderCellDef>Dependencies</th>
              <td mat-cell *matCellDef="let item">
                <span *ngIf="item.phase.dependencies && item.phase.dependencies.length > 0" class="dependency-count">
                  <mat-icon>link</mat-icon>
                  {{ item.phase.dependencies.length }}
                </span>
                <span *ngIf="!item.phase.dependencies || item.phase.dependencies.length === 0" class="no-dependencies">
                  None
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" 
                class="phase-row"
                [class.blocked]="row.phase.status === 'blocked'"></tr>
          </table>
        </div>
      </div>

      <ng-template #loading>
        <div class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Loading phases...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .phases-page {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 32px;
      font-weight: 500;
      margin: 0 0 8px 0;
    }

    .subtitle {
      color: #666;
      margin: 0;
    }

    .empty-state {
      text-align: center;
      padding: 48px;
      
      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #ddd;
        margin-bottom: 16px;
      }
      
      h2 {
        margin: 0 0 8px 0;
        color: #666;
      }
      
      p {
        margin: 0;
        color: #999;
      }
    }

    .phases-table-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .phases-table {
      width: 100%;
    }

    .project-link {
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      
      &:hover {
        color: #2563eb;
      }
      
      strong {
        font-size: 14px;
      }
      
      .project-code {
        font-size: 12px;
        color: #666;
      }
    }

    .phase-info {
      display: flex;
      flex-direction: column;
      
      .phase-name {
        font-weight: 500;
      }
      
      small {
        color: #666;
        font-size: 12px;
        margin-top: 2px;
      }
    }

    mat-chip {
      font-size: 12px;
      
      &.status-pending {
        background-color: #e5e7eb !important;
        color: #374151 !important;
      }
      
      &.status-active {
        background-color: #dbeafe !important;
        color: #1e40af !important;
      }
      
      &.status-completed {
        background-color: #d1fae5 !important;
        color: #065f46 !important;
      }
      
      &.status-blocked {
        background-color: #fee2e2 !important;
        color: #dc2626 !important;
      }
    }

    .unassigned {
      color: #999;
      font-style: italic;
    }

    .order-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: #e3f2fd;
      color: #1976d2;
      font-weight: 600;
      font-size: 13px;
    }

    .dates {
      display: flex;
      flex-direction: column;
      font-size: 13px;
      color: #666;
    }

    .no-dates {
      color: #999;
      font-style: italic;
    }

    .dependency-count {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #f57c00;
      font-size: 13px;
      
      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .no-dependencies {
      color: #999;
      font-size: 13px;
    }

    .phase-row {
      &:hover {
        background-color: #f5f5f5;
      }
      
      &.blocked {
        background-color: #fef2f2;
      }
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      
      p {
        margin-top: 16px;
        color: #666;
      }
    }
  `]
})
export class PhasesPageComponent implements OnInit {
  private phaseService = inject(PhaseService);
  private projectService = inject(ProjectService);

  displayedColumns = ['project', 'phase', 'status', 'assignedTo', 'order', 'dates', 'dependencies'];
  phasesWithProjects$!: Observable<any[]>;

  ngOnInit() {
    // Get all projects and their phases
    this.phasesWithProjects$ = this.projectService.getProjects().pipe(
      switchMap(projects => {
        if (projects.length === 0) {
          return of([]);
        }

        // For each project, get its phases
        const phaseObservables = projects.map(project => 
          this.phaseService.getProjectPhases(project.id!).pipe(
            map(phases => 
              phases.map(phase => ({
                projectId: project.id,
                projectName: project.name,
                projectCode: project.projectCode,
                phase
              }))
            )
          )
        );

        return combineLatest(phaseObservables).pipe(
          map(allPhases => allPhases.flat())
        );
      })
    );
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': 'Pending',
      'active': 'Active',
      'completed': 'Completed',
      'blocked': 'Blocked'
    };
    return labels[status] || status;
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  }
}