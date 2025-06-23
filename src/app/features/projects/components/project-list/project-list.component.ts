import {
  Component,
  inject,
  ChangeDetectionStrategy,
  computed,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, firstValueFrom, forkJoin, map } from 'rxjs';
import { Project, ProjectStatus, ProjectType } from '../../../../core/models/project.model';
import { ProjectService } from '../../../../core/services/project.service';
import { DateFormatService } from '../../../../core/services/date-format.service';
import { TaskService } from '../../../../core/services/task.service';
import { TaskStatus } from '../../../../core/models/task.model';

@Component({
  selector: 'app-project-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule,
    ScrollingModule,
  ],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss',
})
export class ProjectListComponent {
  private projectService = inject(ProjectService);
  private dateFormat = inject(DateFormatService);
  private router = inject(Router);
  private taskService = inject(TaskService);

  // Signal-based state management
  projectTaskStats = signal<Record<string, any>>({});

  projects = toSignal(
    this.projectService.getProjects().pipe(
      catchError((error) => {
        console.error('Failed to load projects:', error);
        return of([]);
      }),
    ),
    { initialValue: [] },
  );

  // Computed loading state
  isLoading = computed(() => this.projects().length === 0);

  constructor() {
    // Load task statistics whenever projects change
    effect(() => {
      const projects = this.projects();
      if (projects.length > 0) {
        this.loadTaskStatistics();
      }
    });
  }

  // Computed project stats for dashboard
  projectStats = computed(() => {
    const projects = this.projects();
    return {
      total: projects.length,
      active: projects.filter((p) => p.status === 'active').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      onHold: projects.filter((p) => p.status === 'on_hold').length,
    };
  });

  async createNewProject() {
    await this.router.navigate(['/projects/new']);
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

  getProjectTypeLabel(type: ProjectType): string {
    const labels: Record<ProjectType, string> = {
      [ProjectType.FTTH]: 'FTTH',
      [ProjectType.FTTB]: 'FTTB',
      [ProjectType.FTTC]: 'FTTC',
      [ProjectType.BACKBONE]: 'Backbone',
      [ProjectType.LASTMILE]: 'Last Mile',
      [ProjectType.ENTERPRISE]: 'Enterprise',
      [ProjectType.MAINTENANCE]: 'Maintenance',
    };
    return labels[type];
  }

  getPhaseLabel(phase: string): string {
    const labels: Record<string, string> = {
      planning: 'Planning',
      initiate_project: 'Initiate Project',
      work_in_progress: 'Work in Progress',
      handover: 'Handover',
      handover_complete: 'Handover Complete',
      final_acceptance: 'Final Acceptance',
    };
    return labels[phase] || phase;
  }

  formatDate(date: unknown): string {
    return this.dateFormat.formatShortDate(date as Date | string | { toDate(): Date });
  }

  getBudgetPercentage(project: Project): number {
    if (!project.budget || project.budget === 0) return 0;
    return Math.round((project.budgetUsed / project.budget) * 100);
  }

  async loadTaskStatistics() {
    const projects = this.projects();
    if (projects.length === 0) return;

    const stats: Record<string, any> = {};

    // Load tasks for each project
    for (const project of projects) {
      if (project.id) {
        try {
          const tasks = await firstValueFrom(this.taskService.getTasksByProject(project.id));

          const totalTasks = tasks.length;
          const completedTasks = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
          const inProgressTasks = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
          const overallProgress =
            totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          stats[project.id] = {
            totalTasks,
            completedTasks,
            inProgressTasks,
            overallProgress,
          };
        } catch (error) {
          console.error(`Error loading tasks for project ${project.id}:`, error);
          stats[project.id] = {
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            overallProgress: 0,
          };
        }
      }
    }

    this.projectTaskStats.set(stats);
  }

  getProjectTaskStats(projectId: string | undefined) {
    if (!projectId)
      return { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, overallProgress: 0 };
    return (
      this.projectTaskStats()[projectId] || {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overallProgress: 0,
      }
    );
  }
}
