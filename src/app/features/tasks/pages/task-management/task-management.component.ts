import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, combineLatest, map, startWith, tap, catchError, of } from 'rxjs';

import { Task, TaskStatus } from '../../../../core/models/task.model';
import { TaskService } from '../../../../core/services/task.service';
import { ProjectService } from '../../../../core/services/project.service';
import { StaffService } from '../../../staff/services/staff.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Project } from '../../../../core/models/project.model';
import { StaffMember } from '../../../staff/models/staff.model';

interface TaskDisplay extends Task {
  projectName?: string;
  assigneeName?: string;
  isUpdating?: boolean;
}

@Component({
  selector: 'app-task-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './task-management.component.html',
  styleUrls: ['./task-management.component.scss'],
})
export class TaskManagementComponent implements OnInit {
  private taskService = inject(TaskService);
  private projectService = inject(ProjectService);
  private staffService = inject(StaffService);
  private notification = inject(NotificationService);

  loading = true;
  tasks$!: Observable<TaskDisplay[]>;
  projects$!: Observable<Project[]>;
  staff$!: Observable<StaffMember[]>;
  filteredTasks$!: Observable<TaskDisplay[]>;

  projectFilter = new FormControl<string>('all', { nonNullable: true });
  assigneeFilter = new FormControl<string>('all', { nonNullable: true });
  showCompletedFilter = new FormControl<boolean>(false, { nonNullable: true });

  displayedColumns: string[] = ['name', 'project', 'assignee', 'complete'];

  ngOnInit() {
    console.log('TaskManagementComponent initialized');
    this.loadData();

    // Add debugging subscription after loadData creates the observables
    setTimeout(() => {
      if (this.filteredTasks$) {
        this.filteredTasks$.subscribe({
          next: (tasks) =>
            console.log('🟢 filteredTasks$ emitted to template:', tasks?.length || 0, 'tasks'),
          error: (err) => console.error('🔴 filteredTasks$ error:', err),
        });
      }
    }, 100);
  }

  loadData() {
    console.log('TaskManagementComponent: Loading data...');
    this.loading = true;

    // Load projects and staff for filters
    this.projects$ = this.projectService
      .getProjects()
      .pipe(
        tap((projects) =>
          console.log('ProjectService.getProjects() emitted:', projects.length, 'projects'),
        ),
      );
    this.staff$ = this.staffService
      .getStaff()
      .pipe(tap((staff) => console.log('StaffService.getStaff() emitted:', staff.length, 'staff'))); // Fixed: use getStaff()

    // Debug individual observables
    this.taskService.getAllTasks().subscribe({
      next: (tasks) => {
        console.log('📋 TaskService.getAllTasks() emitted:', tasks?.length || 0, 'tasks');
        console.log('📋 Sample task:', tasks?.[0]);
      },
      error: (err) => console.error('❌ TaskService.getAllTasks() error:', err),
      complete: () => console.log('✅ TaskService.getAllTasks() completed'),
    });

    this.projects$.subscribe({
      next: (projects) => {
        console.log('🏗️ ProjectService.getProjects() emitted:', projects?.length || 0, 'projects');
        console.log('🏗️ Project IDs:', projects?.map((p) => p.id) || []);
      },
      error: (err) => console.error('❌ ProjectService.getProjects() error:', err),
      complete: () => console.log('✅ ProjectService.getProjects() completed'),
    });

    this.staff$.subscribe({
      next: (staff) => {
        console.log('👥 StaffService.getStaff() emitted:', staff?.length || 0, 'staff');
        console.log('👥 Staff IDs:', staff?.map((s) => s.id) || []);
      },
      error: (err) => console.error('❌ StaffService.getStaff() error:', err),
      complete: () => console.log('✅ StaffService.getStaff() completed'),
    });

    // Load all tasks and enhance with project/staff names
    this.tasks$ = combineLatest([
      this.taskService.getAllTasks().pipe(
        catchError((err) => {
          console.error('Error loading tasks:', err);
          return of([]);
        }),
      ),
      this.projects$.pipe(
        catchError((err) => {
          console.error('Error loading projects:', err);
          return of([]);
        }),
      ),
      this.staff$.pipe(
        catchError((err) => {
          console.error('Error loading staff:', err);
          return of([]);
        }),
      ),
    ]).pipe(
      tap(([tasks, projects, staff]) => {
        console.log('CombineLatest emitted with:', {
          tasks: tasks?.length || 0,
          projects: projects?.length || 0,
          staff: staff?.length || 0,
        });
      }),
      map(([tasks, projects, staff]) => {
        console.log('TaskManagementComponent: Raw tasks loaded:', tasks.length);
        console.log('TaskManagementComponent: Projects loaded:', projects.length);
        console.log('TaskManagementComponent: Staff loaded:', staff.length);

        // Get unique project IDs from tasks
        const taskProjectIds = [...new Set(tasks.map((t) => t.projectId))];
        console.log('Unique project IDs in tasks:', taskProjectIds.length);
        console.log(
          'Project IDs from ProjectService:',
          projects.map((p) => p.id),
        );

        return tasks.map((task) => {
          const project = projects.find((p) => p.id === task.projectId);
          const assignee = staff.find((s) => s.id === task.assignedTo);

          // Use projectName from task if project not found in projects list
          const displayProjectName =
            project?.name || task.projectName || `Project ${task.projectId}`;

          return {
            ...task,
            projectName: displayProjectName,
            assigneeName: assignee?.name,
            isUpdating: false,
          } as TaskDisplay;
        });
      }),
      catchError((err) => {
        console.error('Error in combineLatest:', err);
        return of([]);
      }),
    );

    // Apply filters
    this.filteredTasks$ = combineLatest([
      this.tasks$,
      this.projectFilter.valueChanges.pipe(startWith(this.projectFilter.value)),
      this.assigneeFilter.valueChanges.pipe(startWith(this.assigneeFilter.value)),
      this.showCompletedFilter.valueChanges.pipe(startWith(this.showCompletedFilter.value)),
    ]).pipe(
      map(([tasks, projectId, assigneeId, showCompleted]) => {
        console.log('TaskManagementComponent: Filtering tasks...');
        console.log('Tasks to filter:', tasks.length);
        console.log('Project filter:', projectId);
        console.log('Assignee filter:', assigneeId);
        console.log('Show completed:', showCompleted);

        let filtered = tasks;

        // Filter by project
        if (projectId !== 'all') {
          filtered = filtered.filter((t) => t.projectId === projectId);
          console.log('After project filter:', filtered.length);
        }

        // Filter by assignee
        if (assigneeId !== 'all') {
          filtered = filtered.filter((t) => t.assignedTo === assigneeId);
          console.log('After assignee filter:', filtered.length);
        }

        // Filter by completion status
        if (!showCompleted) {
          const beforeStatusFilter = filtered.length;
          filtered = filtered.filter((t) => {
            const status = t.status?.toLowerCase();
            const isCompleted =
              status === 'completed' || status === TaskStatus.COMPLETED.toLowerCase();
            return !isCompleted;
          });

          console.log(`After status filter: ${beforeStatusFilter} -> ${filtered.length} tasks`);
          console.log('Removed completed tasks:', beforeStatusFilter - filtered.length);
        }

        console.log('Final filtered tasks:', filtered.length);
        if (filtered.length === 0 && tasks.length > 0) {
          console.log('No tasks shown. Try checking "Show Completed Tasks" to see all tasks.');
        }

        this.loading = false;
        console.log('Setting loading to false, filtered tasks:', filtered);
        return filtered;
      }),
    );

    // Debug the tasks$ observable
    this.tasks$.subscribe({
      next: (tasks) => {
        console.log('🔄 tasks$ emitted:', tasks?.length || 0, 'enhanced tasks');
        console.log('🔄 Sample enhanced task:', tasks?.[0]);
      },
      error: (err) => console.error('❌ tasks$ error:', err),
    });
  }

  async toggleTaskCompletion(task: TaskDisplay) {
    task.isUpdating = true;

    try {
      const newStatus =
        task.status === TaskStatus.COMPLETED ? TaskStatus.IN_PROGRESS : TaskStatus.COMPLETED;

      await this.taskService.updateTask(task.id!, {
        status: newStatus,
        completedDate: newStatus === TaskStatus.COMPLETED ? new Date() : undefined,
      });

      this.notification.success(
        newStatus === TaskStatus.COMPLETED
          ? 'Task marked as complete'
          : 'Task marked as incomplete',
      );

      this.loadData();
    } catch (error) {
      console.error('Error updating task:', error);
      this.notification.error('Failed to update task');
      task.isUpdating = false;
    }
  }
}
