import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, combineLatest, map, startWith, take } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

import { Task, TaskStatus } from '../../../../core/models/task.model';
import { TaskService } from '../../../../core/services/task.service';
import { ProjectService } from '../../../../core/services/project.service';
import { StaffService } from '../../../staff/services/staff.service';
import { DateFormatService } from '../../../../core/services/date-format.service';
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
    RouterModule,
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
  private dateFormat = inject(DateFormatService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  constructor() {
    console.log('Task Management Component - Constructor called');
  }

  loading = true;
  tasks$!: Observable<TaskDisplay[]>;
  projects$!: Observable<Project[]>;
  staff$!: Observable<StaffMember[]>;
  filteredTasks$!: Observable<TaskDisplay[]>;

  projectFilter = new FormControl<string>('all', { nonNullable: true });
  assigneeFilter = new FormControl<string>('all', { nonNullable: true });

  displayedColumns: string[] = ['name', 'project', 'assignee', 'complete'];

  // Expose enum to template
  TaskStatus = TaskStatus;

  ngOnInit() {
    console.log('Task Management Component - ngOnInit started');
    try {
      this.loadData();
      console.log('Task Management Component - loadData called successfully');
    } catch (error) {
      console.error('Task Management Component - Error in ngOnInit:', error);
      this.loading = false;
    }
  }

  loadData() {
    console.log('Task Management - loadData method started');
    this.loading = true;

    try {
      // Load projects and staff for filters
      this.projects$ = this.projectService.getProjects();
      this.staff$ = this.staffService.getStaff();

      // Load all tasks and enhance with project/staff names
      this.tasks$ = combineLatest([
        this.taskService.getAllTasks(),
        this.projects$,
        this.staff$,
      ]).pipe(
        map(([tasks, projects, staff]) => {
          console.log('Task Management - Raw tasks from service:', tasks.length);
          console.log('Task Management - Projects loaded:', projects.length);
          console.log('Task Management - Staff loaded:', staff.length);

          if (tasks.length > 0) {
            console.log('Task Management - Sample task:', tasks[0]);
          }

          return tasks.map((task) => {
            const project = projects.find((p) => p.id === task.projectId);
            const assignee = staff.find((s) => s.id === task.assignedTo);

            return {
              ...task,
              projectName: project?.name,
              assigneeName: assignee?.name,
              isUpdating: false,
            } as TaskDisplay;
          });
        }),
      );

      // Apply filters
      this.filteredTasks$ = combineLatest([
        this.tasks$,
        this.projectFilter.valueChanges.pipe(startWith(this.projectFilter.value)),
        this.assigneeFilter.valueChanges.pipe(startWith(this.assigneeFilter.value)),
      ]).pipe(
        map(([tasks, projectId, assigneeId]) => {
          let filtered = tasks;

          // Filter by project
          if (projectId !== 'all') {
            filtered = filtered.filter((t) => t.projectId === projectId);
          }

          // Filter by assignee
          if (assigneeId !== 'all') {
            filtered = filtered.filter((t) => t.assignedTo === assigneeId);
          }

          // Only show incomplete tasks
          filtered = filtered.filter((t) => {
            // Handle both enum values and string values from Firestore
            const status = t.status?.toLowerCase();
            return status !== 'completed' && status !== TaskStatus.COMPLETED;
          });

          console.log('Task Management - Total tasks:', tasks.length);
          console.log('Task Management - Filtered tasks:', filtered.length);
          console.log('Task Management - Sample task:', filtered[0]);

          return filtered;
        }),
      );

      // Subscribe to set loading state - use a subscription to ensure it executes
      const loadingSub = this.filteredTasks$.pipe(take(1)).subscribe({
        next: (tasks) => {
          console.log('Task Management - First data received, tasks:', tasks.length);
          this.loading = false;
        },
        error: (error) => {
          console.error('Task Management - Error loading tasks:', error);
          this.loading = false;
        },
      });

      console.log('Task Management - loadData method completed');
    } catch (error) {
      console.error('Task Management - Error in loadData:', error);
      this.loading = false;
    }
  }

  refreshTasks() {
    this.loadData();
  }

  navigateToGridView() {
    console.log('Navigating to grid view...');
    this.router.navigate(['/task-grid']).then(
      success => {
        console.log('Navigation success:', success);
      },
      error => {
        console.error('Navigation error:', error);
        this.notification.error('Failed to navigate to grid view');
      }
    );
  }

  async toggleTaskCompletion(task: TaskDisplay) {
    // Mark task as updating to disable checkbox
    task.isUpdating = true;

    try {
      const newStatus =
        task.status === TaskStatus.COMPLETED ? TaskStatus.IN_PROGRESS : TaskStatus.COMPLETED;

      await this.taskService.updateTask(task.id!, {
        status: newStatus,
        completedDate: newStatus === TaskStatus.COMPLETED ? Timestamp.now() : undefined,
      });

      this.notification.success(
        newStatus === TaskStatus.COMPLETED
          ? 'Task marked as complete'
          : 'Task marked as incomplete',
      );

      // Refresh tasks to get updated data
      this.refreshTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      this.notification.error('Failed to update task');
      task.isUpdating = false;
    }
  }
}
