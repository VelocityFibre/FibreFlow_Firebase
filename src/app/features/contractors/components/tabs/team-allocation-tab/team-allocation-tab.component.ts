import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ContractorProject } from '../../../models/contractor-project.model';

interface TeamAllocation {
  id: string;
  teamName: string;
  teamLead: string;
  membersCount: number;
  allocatedDate: Date;
  status: 'active' | 'inactive' | 'completed';
  currentPhase?: string;
}

@Component({
  selector: 'app-team-allocation-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
  ],
  template: `
    <div class="team-allocation-container">
      <div class="header-section">
        <h3>Team Allocation</h3>
        <button mat-raised-button color="primary" (click)="addTeam()">
          <mat-icon>add</mat-icon>
          Allocate Team
        </button>
      </div>

      <mat-card class="summary-card">
        <mat-card-content>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="label">Total Teams</span>
              <span class="value">{{ teams.length }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Active Teams</span>
              <span class="value">{{ activeTeamsCount }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Total Members</span>
              <span class="value">{{ totalMembers }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="teams-table-card">
        <mat-card-content>
          <table mat-table [dataSource]="teams" class="teams-table">
            <!-- Team Name Column -->
            <ng-container matColumnDef="teamName">
              <th mat-header-cell *matHeaderCellDef>Team Name</th>
              <td mat-cell *matCellDef="let team">
                <strong>{{ team.teamName }}</strong>
              </td>
            </ng-container>

            <!-- Team Lead Column -->
            <ng-container matColumnDef="teamLead">
              <th mat-header-cell *matHeaderCellDef>Team Lead</th>
              <td mat-cell *matCellDef="let team">{{ team.teamLead }}</td>
            </ng-container>

            <!-- Members Column -->
            <ng-container matColumnDef="members">
              <th mat-header-cell *matHeaderCellDef>Members</th>
              <td mat-cell *matCellDef="let team">
                <mat-chip-set>
                  <mat-chip>{{ team.membersCount }} members</mat-chip>
                </mat-chip-set>
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let team">
                <mat-chip
                  [class.active-chip]="team.status === 'active'"
                  [class.inactive-chip]="team.status === 'inactive'"
                  [class.completed-chip]="team.status === 'completed'"
                >
                  {{ team.status | titlecase }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Current Phase Column -->
            <ng-container matColumnDef="currentPhase">
              <th mat-header-cell *matHeaderCellDef>Current Phase</th>
              <td mat-cell *matCellDef="let team">{{ team.currentPhase || 'N/A' }}</td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let team">
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="editTeam(team)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="viewTeamDetails(team)">
                    <mat-icon>visibility</mat-icon>
                    <span>View Details</span>
                  </button>
                  <button mat-menu-item (click)="removeTeam(team)" class="delete-action">
                    <mat-icon>delete</mat-icon>
                    <span>Remove</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>

          <div *ngIf="teams.length === 0" class="no-data">
            <mat-icon>groups</mat-icon>
            <p>No teams allocated yet</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .team-allocation-container {
        padding: 16px;
      }

      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .header-section h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
      }

      .summary-card {
        margin-bottom: 24px;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 24px;
      }

      .summary-item {
        text-align: center;
      }

      .summary-item .label {
        display: block;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);
        margin-bottom: 4px;
      }

      .summary-item .value {
        display: block;
        font-size: 24px;
        font-weight: 500;
      }

      .teams-table {
        width: 100%;
      }

      .teams-table-card {
        overflow: hidden;
      }

      mat-chip {
        font-size: 12px;
      }

      .active-chip {
        background-color: #4caf50 !important;
        color: white !important;
      }

      .inactive-chip {
        background-color: #ff9800 !important;
        color: white !important;
      }

      .completed-chip {
        background-color: #2196f3 !important;
        color: white !important;
      }

      .no-data {
        text-align: center;
        padding: 48px;
        color: rgba(0, 0, 0, 0.4);
      }

      .no-data mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }

      .delete-action {
        color: #f44336;
      }
    `,
  ],
})
export class TeamAllocationTabComponent implements OnInit {
  @Input() contractorProject!: ContractorProject;

  displayedColumns: string[] = [
    'teamName',
    'teamLead',
    'members',
    'status',
    'currentPhase',
    'actions',
  ];
  teams: TeamAllocation[] = [];

  get activeTeamsCount(): number {
    return this.teams.filter((t) => t.status === 'active').length;
  }

  get totalMembers(): number {
    return this.teams.reduce((sum, team) => sum + team.membersCount, 0);
  }

  ngOnInit(): void {
    this.loadTeams();
  }

  loadTeams(): void {
    // TODO: Load teams from service
    // For now, using mock data
    this.teams = [
      {
        id: '1',
        teamName: 'Installation Team A',
        teamLead: 'John Smith',
        membersCount: 5,
        allocatedDate: new Date(),
        status: 'active',
        currentPhase: 'Phase 1 - Foundation',
      },
      {
        id: '2',
        teamName: 'Cable Laying Team',
        teamLead: 'Jane Doe',
        membersCount: 8,
        allocatedDate: new Date(),
        status: 'active',
        currentPhase: 'Phase 2 - Main Installation',
      },
    ];
  }

  addTeam(): void {
    // TODO: Open dialog to allocate new team
    console.log('Add team');
  }

  editTeam(team: TeamAllocation): void {
    // TODO: Open dialog to edit team allocation
    console.log('Edit team:', team);
  }

  viewTeamDetails(team: TeamAllocation): void {
    // TODO: Navigate to team details or open dialog
    console.log('View team details:', team);
  }

  removeTeam(team: TeamAllocation): void {
    // TODO: Confirm and remove team allocation
    console.log('Remove team:', team);
  }
}
