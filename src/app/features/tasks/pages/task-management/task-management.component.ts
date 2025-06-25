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
import { Observable, combineLatest, map, startWith } from 'rxjs';

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

  displayedColumns: string[] = ['name', 'project', 'assignee', 'complete'];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;

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
          const status = t.status?.toLowerCase();
          return status !== 'completed' && status !== TaskStatus.COMPLETED;
        });

        this.loading = false;
        return filtered;
      }),
    );
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
        newStatus === TaskStatus.COMPLETED ? 'Task marked as complete' : 'Task marked as incomplete',
      );

      this.loadData();
    } catch (error) {
      console.error('Error updating task:', error);
      this.notification.error('Failed to update task');
      task.isUpdating = false;
    }
  }
}