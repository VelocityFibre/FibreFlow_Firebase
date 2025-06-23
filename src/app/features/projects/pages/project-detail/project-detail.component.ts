import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { Observable, switchMap, combineLatest, map, of } from 'rxjs';
import { Project, ProjectStatus } from '../../../../core/models/project.model';
import { Phase, PhaseStatus } from '../../../../core/models/phase.model';
import { ProjectService } from '../../../../core/services/project.service';
import { DateFormatService } from '../../../../core/services/date-format.service';
import { UnifiedTaskManagementComponent } from '../../components/unified-task-management/unified-task-management.component';
import { ProjectStockComponent } from '../../components/stock/project-stock.component';
import { ProjectContractorsComponent } from '../../components/contractors/project-contractors.component';
import { ProjectBOQComponent } from '../../components/boq/project-boq.component';
import { PhaseService } from '../../../../core/services/phase.service';
import { TaskService } from '../../../../core/services/task.service';
import { Task } from '../../../../core/models/task.model';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDividerModule,
    MatListModule,
    MatMenuModule,
    MatDialogModule,
    MatExpansionModule,
    UnifiedTaskManagementComponent,
    ProjectStockComponent,
    ProjectContractorsComponent,
    ProjectBOQComponent,
  ],
  templateUrl: './project-detail.component.html',
  styles: [
    `
      .project-header {
        background: white;
        margin: -40px -24px 32px;
        padding: 24px;
        border-bottom: 1px solid #e5e7eb;
      }

      .header-top {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .back-button {
        margin-right: 8px;
      }

      .header-info {
        flex: 1;
      }

      .project-title {
        font-size: 32px;
        font-weight: 500;
        margin: 0;
        color: #1f2937;
      }

      .project-code {
        font-size: 16px;
        color: #6b7280;
        margin: 4px 0 0 0;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 32px;
      }

      .metric-card {
        border-radius: 12px !important;
      }

      .metric-card mat-card-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 24px !important;
      }

      .metric-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }
      }

      .metric-icon.overall-progress {
        background-color: #eff6ff;
        color: #2563eb;
      }

      .metric-icon.budget {
        background-color: #f0fdf4;
        color: #16a34a;
      }

      .metric-icon.tasks {
        background-color: #fef3c7;
        color: #d97706;
      }

      .metric-icon.phase {
        background-color: #fce7f3;
        color: #db2777;
      }

      .metric-info {
        flex: 1;
      }

      .metric-value {
        font-size: 28px;
        font-weight: 600;
        color: #111827;
        line-height: 1;
      }

      .metric-label {
        font-size: 14px;
        color: #6b7280;
        margin-top: 4px;
      }

      .content-tabs {
        margin-top: 32px;

        ::ng-deep .mat-mdc-tab-label {
          font-size: 15px;
          font-weight: 500;
        }
      }

      .tab-content {
        padding: 32px 0;
      }

      .tasks-tab-content {
        max-width: 100%;

        ::ng-deep app-project-tasks {
          display: block;
          margin-bottom: 48px;

          .tasks-card {
            max-width: 100%;
          }

          .task-item {
            width: 100%;
          }
        }
      }

      .phases-summary-section {
        margin-top: 48px;
        padding-top: 48px;
        border-top: 2px solid #e5e7eb;
      }

      .summary-title {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 24px;
        color: #1f2937;
      }

      .phases-summary {
        display: block;
      }

      .overview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 24px;
      }

      .detail-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .detail-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f3f4f6;

        &:last-child {
          border-bottom: none;
        }
      }

      .detail-label {
        font-size: 14px;
        color: #6b7280;
        font-weight: 500;
      }

      .detail-value {
        font-size: 15px;
        color: #1f2937;
        text-align: right;

        a {
          color: #2563eb;
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        }
      }

      .priority-chip {
        font-size: 12px !important;
        height: 24px !important;

        &.priority-low {
          background-color: #e5e7eb !important;
          color: #374151 !important;
        }

        &.priority-medium {
          background-color: #dbeafe !important;
          color: #1e40af !important;
        }

        &.priority-high {
          background-color: #fed7aa !important;
          color: #c2410c !important;
        }

        &.priority-critical {
          background-color: #fee2e2 !important;
          color: #dc2626 !important;
        }
      }

      .budget-overview {
        margin-top: 16px;
      }

      .budget-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 20px;
      }

      .budget-stat {
        text-align: center;
      }

      .budget-label {
        display: block;
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 4px;
      }

      .budget-value {
        display: block;
        font-size: 20px;
        font-weight: 600;
        color: #1f2937;

        &.used {
          color: #dc2626;
        }

        &.remaining {
          color: #16a34a;
        }
      }

      .budget-percentage {
        text-align: center;
        margin-top: 12px;
        font-size: 14px;
        color: #6b7280;
      }

      .loading-container {
        padding: 64px;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .project-header {
          margin: -24px -16px 24px;
        }

        .header-top {
          flex-wrap: wrap;
        }

        .header-actions {
          width: 100%;
          margin-top: 16px;
        }

        .metrics-grid {
          grid-template-columns: 1fr;
        }

        .overview-grid {
          grid-template-columns: 1fr;
        }

        .budget-stats {
          grid-template-columns: 1fr;
        }
      }

      .delete-option {
        color: #ef4444;

        mat-icon {
          color: #ef4444;
        }
      }

      /* Phases with Tasks Styles */
      .phases-tasks-container {
        padding: 0;
      }

      .phases-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }
      }

      .phases-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
      }

      .empty-state {
        text-align: center;
        padding: 48px 24px;

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: #e5e7eb;
          margin-bottom: 16px;
        }

        p {
          color: #6b7280;
          margin-bottom: 24px;
        }
      }

      mat-accordion {
        mat-expansion-panel {
          margin-bottom: 16px;
          border-radius: 12px !important;
          overflow: hidden;

          &:before {
            display: none;
          }
        }
      }

      .phase-header-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .phase-status-button {
        font-size: 12px;
        font-weight: 600;
        padding: 4px 12px;
        min-width: 100px;
        height: 28px;
        line-height: 20px;
        border: none;
        display: flex;
        align-items: center;
        gap: 4px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }

        &.status-pending {
          background-color: #f3f4f6 !important;
          color: #6b7280 !important;
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

      .phase-name {
        font-size: 16px;
        font-weight: 500;
      }

      .task-count {
        margin-right: 16px;
      }

      .phase-progress {
        color: #6b7280;
      }

      mat-chip.phase-status-pending {
        background-color: #e5e7eb !important;
        color: #374151 !important;
      }

      mat-chip.phase-status-active {
        background-color: #dbeafe !important;
        color: #1e40af !important;
      }

      mat-chip.phase-status-completed {
        background-color: #d1fae5 !important;
        color: #065f46 !important;
      }

      mat-chip.phase-status-blocked {
        background-color: #fee2e2 !important;
        color: #dc2626 !important;
      }

      .phase-tasks {
        padding: 0 24px 16px;
      }

      .phase-blocked-reason {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        color: #991b1b;
        margin-bottom: 16px;

        mat-icon {
          color: #dc2626;
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        strong {
          color: #dc2626;
        }
      }

      .no-tasks {
        text-align: center;
        padding: 24px;
        background-color: #f9fafb;
        border-radius: 8px;

        p {
          margin-bottom: 12px;
          color: #6b7280;
        }
      }

      .task-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .task-item {
        display: flex;
        align-items: center;
        padding: 16px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: white;

        &:hover {
          border-color: #d1d5db;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
      }

      .task-status-indicator {
        width: 4px;
        height: 40px;
        border-radius: 4px;
        margin-right: 16px;

        &.status-pending {
          background-color: #6b7280;
        }

        &.status-in_progress {
          background-color: #3b82f6;
        }

        &.status-completed {
          background-color: #10b981;
        }

        &.status-blocked {
          background-color: #ef4444;
        }
      }

      .task-main {
        flex: 1;
        min-width: 0;
      }

      .task-header-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .task-name {
        margin: 0;
        font-size: 15px;
        font-weight: 500;
        color: #1f2937;
        flex: 1;
      }

      .task-meta {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: #6b7280;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }
      }

      .task-actions {
        margin-left: 16px;
      }

      mat-chip.priority-low {
        background-color: #e5e7eb !important;
        color: #374151 !important;
        font-size: 11px !important;
        min-height: 22px !important;
      }

      mat-chip.priority-medium {
        background-color: #dbeafe !important;
        color: #1e40af !important;
        font-size: 11px !important;
        min-height: 22px !important;
      }

      mat-chip.priority-high {
        background-color: #fed7aa !important;
        color: #c2410c !important;
        font-size: 11px !important;
        min-height: 22px !important;
      }

      mat-chip.priority-critical {
        background-color: #fee2e2 !important;
        color: #dc2626 !important;
        font-size: 11px !important;
        min-height: 22px !important;
      }
    `,
  ],
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);
  private dateFormat = inject(DateFormatService);
  private dialog = inject(MatDialog);
  private phaseService = inject(PhaseService);
  private taskService = inject(TaskService);

  project$!: Observable<Project | undefined>;
  phasesWithTasks$!: Observable<{ phase: Phase; tasks: Task[] }[]>;

  ngOnInit() {
    const projectId$ = this.route.paramMap.pipe(map((params) => params.get('id') || ''));

    this.project$ = projectId$.pipe(switchMap((id) => this.projectService.getProjectById(id)));

    // Initialize phasesWithTasks$ observable
    this.phasesWithTasks$ = projectId$.pipe(
      switchMap((projectId) => {
        if (!projectId) return of([]);
        return combineLatest([
          this.phaseService.getProjectPhases(projectId),
          this.taskService.getTasksByProject(projectId),
        ]).pipe(
          map(([phases, tasks]) => {
            return phases.map((phase) => ({
              phase,
              tasks: tasks.filter((task) => task.phaseId === phase.id),
            }));
          }),
        );
      }),
    );
  }

  getStatusLabel(status: ProjectStatus): string {
    const labels: Record<ProjectStatus, string> = {
      [ProjectStatus.PLANNING]: 'Planning',
      [ProjectStatus.ACTIVE]: 'Active',
      [ProjectStatus.ON_HOLD]: 'On Hold',
      [ProjectStatus.COMPLETED]: 'Completed',
      [ProjectStatus.CANCELLED]: 'Cancelled',
    };
    return labels[status];
  }

  getProjectTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ftth: 'FTTH',
      fttb: 'FTTB',
      fttc: 'FTTC',
      backbone: 'Backbone',
      lastmile: 'Last Mile',
      enterprise: 'Enterprise',
      maintenance: 'Maintenance',
    };
    return labels[type] || type;
  }

  formatDate(date: unknown): string {
    return this.dateFormat.formatDate(date as Date | string | { toDate(): Date });
  }

  getBudgetPercentage(project: Project): number {
    if (!project.budget || project.budget === 0) return 0;
    return Math.round((project.budgetUsed / project.budget) * 100);
  }

  editProject(projectId: string): void {
    // Navigate to edit page (we'll create this later)
    this.router.navigate(['/projects', projectId, 'edit']);
  }

  async deleteProject(projectId: string): Promise<void> {
    const confirmDelete = confirm(
      'Are you sure you want to delete this project? This action cannot be undone.',
    );

    if (confirmDelete) {
      try {
        await this.projectService.deleteProject(projectId);
        // Navigate back to projects list after successful deletion
        this.router.navigate(['/projects']);
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project. Please try again.');
      }
    }
  }

  getPhaseStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      active: 'Active',
      completed: 'Completed',
      blocked: 'Blocked',
    };
    return labels[status] || status;
  }

  getPhaseProgress(tasks: Task[]): number {
    if (tasks.length === 0) return 0;
    const totalProgress = tasks.reduce((sum, task) => sum + task.completionPercentage, 0);
    return Math.round(totalProgress / tasks.length);
  }

  addTask(): void {
    // This will be implemented with the task dialog
    // Add task clicked
  }

  addTaskToPhase(_phaseId: string): void {
    // This will be implemented with the task dialog
    // Add task to phase: ${phaseId}
  }

  viewTask(_task: Task): void {
    // This will be implemented with the task dialog
    // View task: ${task.name}
  }

  editTask(_task: Task): void {
    // This will be implemented with the task dialog
    // Edit task: ${task.name}
  }

  async deleteTask(task: Task): Promise<void> {
    if (confirm(`Are you sure you want to delete "${task.name}"?`)) {
      try {
        await this.taskService.deleteTask(task.id!);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  }

  async initializePhases(): Promise<void> {
    const projectId = this.route.snapshot.params['id'];
    if (confirm('This will create the default project phases with tasks. Continue?')) {
      try {
        await this.phaseService.createProjectPhases(projectId, true);
        // Refresh the phases data
        this.ngOnInit();
      } catch (error) {
        console.error('Error initializing phases:', error);
        alert('Failed to initialize phases. Please try again.');
      }
    }
  }

  async initializeTasks(): Promise<void> {
    const projectId = this.route.snapshot.params['id'];
    if (confirm('This will create default tasks for all phases. Continue?')) {
      try {
        await this.taskService.initializeProjectTasks(projectId);
        // Refresh the data
        this.ngOnInit();
      } catch (error) {
        console.error('Error initializing tasks:', error);
        alert('Failed to initialize tasks. Please try again.');
      }
    }
  }

  async updatePhaseStatus(phase: Phase, newStatus: string): Promise<void> {
    try {
      const projectId = this.route.snapshot.params['id'];

      // If changing to blocked, prompt for reason
      let blockedReason: string | undefined;
      if (newStatus === 'blocked') {
        const reason = prompt('Please provide a reason for blocking this phase:');
        if (!reason) {
          return; // User cancelled
        }
        blockedReason = reason;
      }

      await this.phaseService.updatePhaseStatus(
        projectId,
        phase.id!,
        newStatus as PhaseStatus,
        blockedReason,
      );

      // Refresh the data
      this.ngOnInit();
    } catch (error) {
      console.error('Error updating phase status:', error);
      alert('Failed to update phase status. Please try again.');
    }
  }

  trackByPhaseFn(index: number, phaseData: { phase: Phase; tasks: Task[] }): string {
    return phaseData.phase.id || index.toString();
  }

  trackByTaskFn(index: number, task: Task): string {
    return task.id || index.toString();
  }

  getTotalTaskCount(phasesWithTasks: { phase: Phase; tasks: Task[] }[]): number {
    return phasesWithTasks.reduce((total, phaseData) => total + phaseData.tasks.length, 0);
  }
}
