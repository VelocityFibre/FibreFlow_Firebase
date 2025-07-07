import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { Observable, combineLatest, map, startWith, take } from 'rxjs';

import {
  PersonalTodo,
  TodoStatus,
  TodoPriority,
  TodoSource,
  TodoStats,
} from '../../models/personal-todo.model';
import { PersonalTodoService } from '../../services/personal-todo.service';
import { DateFormatService } from '../../../../core/services/date-format.service';
import { NotificationService } from '../../../../core/services/notification.service';

interface TodoDisplay extends PersonalTodo {
  isUpdating?: boolean;
  isOverdue?: boolean;
  isDueToday?: boolean;
  isDueSoon?: boolean;
}

@Component({
  selector: 'app-todo-management',
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
    MatChipsModule,
    MatBadgeModule,
    MatMenuModule,
  ],
  templateUrl: './todo-management.component.html',
  styleUrls: ['./todo-management.component.scss'],
})
export class TodoManagementComponent implements OnInit {
  private todoService = inject(PersonalTodoService);
  private dateFormat = inject(DateFormatService);
  private notification = inject(NotificationService);

  todos$!: Observable<TodoDisplay[]>;
  filteredTodos$!: Observable<TodoDisplay[]>;
  todoStats$!: Observable<TodoStats>;
  loading = true;

  // Filters
  statusFilter = new FormControl<string>('active', { nonNullable: true });
  priorityFilter = new FormControl<string>('all', { nonNullable: true });
  sourceFilter = new FormControl<string>('all', { nonNullable: true });

  displayedColumns: string[] = ['complete', 'text', 'priority', 'source', 'dueDate', 'actions'];

  // Expose enums to template
  TodoStatus = TodoStatus;
  TodoPriority = TodoPriority;
  TodoSource = TodoSource;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;

    // Load todos and calculate stats
    this.todos$ = this.todoService
      .getMyTodos()
      .pipe(map((todos) => todos.map((todo) => this.enhanceTodo(todo))));

    this.todoStats$ = this.todoService.getTodoStats();

    // Set up filtered todos with reactive filters
    this.filteredTodos$ = combineLatest([
      this.todos$,
      this.statusFilter.valueChanges.pipe(startWith(this.statusFilter.value)),
      this.priorityFilter.valueChanges.pipe(startWith(this.priorityFilter.value)),
      this.sourceFilter.valueChanges.pipe(startWith(this.sourceFilter.value)),
    ]).pipe(
      map(([todos, status, priority, source]) => {
        let filtered = [...todos];

        // Filter by status
        switch (status) {
          case 'active':
            filtered = filtered.filter(
              (t) => t.status !== TodoStatus.COMPLETED && t.status !== TodoStatus.CANCELLED,
            );
            break;
          case 'completed':
            filtered = filtered.filter((t) => t.status === TodoStatus.COMPLETED);
            break;
          case 'overdue':
            filtered = filtered.filter((t) => t.isOverdue);
            break;
        }

        // Filter by priority
        if (priority !== 'all') {
          filtered = filtered.filter((t) => t.priority === priority);
        }

        // Filter by source
        if (source !== 'all') {
          filtered = filtered.filter((t) => t.source === source);
        }

        setTimeout(() => {
          this.loading = false;
        }, 0);

        return filtered;
      }),
    );

    // Subscribe to set loading state
    this.filteredTodos$.pipe(take(1)).subscribe(() => {
      this.loading = false;
    });
  }

  private enhanceTodo(todo: PersonalTodo): TodoDisplay {
    const now = new Date();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    return {
      ...todo,
      isOverdue: todo.dueDate ? todo.dueDate < now && !todo.completed : false,
      isDueToday: todo.dueDate ? todo.dueDate <= today && todo.dueDate >= now : false,
      isDueSoon: todo.dueDate ? todo.dueDate <= threeDaysFromNow && todo.dueDate > today : false,
    };
  }

  refreshTodos() {
    this.loadData();
  }

  async toggleTodoCompletion(todo: TodoDisplay) {
    if (todo.isUpdating) return;

    todo.isUpdating = true;
    try {
      if (todo.completed) {
        await this.todoService.updateTodo(todo.id!, {
          status: TodoStatus.PENDING,
          completed: false,
          completedAt: undefined,
        });
        this.notification.success('Todo marked as incomplete');
      } else {
        await this.todoService.completeTodo(todo.id!);
        this.notification.success('Todo completed!');
      }
      this.refreshTodos();
    } catch (error) {
      console.error('Error updating todo:', error);
      this.notification.error('Failed to update todo');
      todo.isUpdating = false;
    }
  }

  async deleteTodo(todo: TodoDisplay) {
    if (confirm('Are you sure you want to delete this todo?')) {
      try {
        await this.todoService.deleteTodo(todo.id!);
        this.notification.success('Todo deleted');
        this.refreshTodos();
      } catch (error) {
        console.error('Error deleting todo:', error);
        this.notification.error('Failed to delete todo');
      }
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return this.dateFormat.formatShortDate(date);
  }

  getPriorityClass(priority: TodoPriority): string {
    switch (priority) {
      case TodoPriority.HIGH:
        return 'priority-high';
      case TodoPriority.MEDIUM:
        return 'priority-medium';
      case TodoPriority.LOW:
        return 'priority-low';
      default:
        return '';
    }
  }

  getSourceIcon(source: TodoSource): string {
    switch (source) {
      case TodoSource.MEETING:
        return 'groups';
      case TodoSource.EMAIL:
        return 'email';
      case TodoSource.PROJECT_TASK:
        return 'task';
      case TodoSource.MANUAL:
      default:
        return 'edit';
    }
  }

  getDueDateClass(todo: TodoDisplay): string {
    if (todo.isOverdue) return 'text-danger';
    if (todo.isDueToday) return 'text-warning';
    if (todo.isDueSoon) return 'text-info';
    return '';
  }
}
