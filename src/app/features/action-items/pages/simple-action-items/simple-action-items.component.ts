import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  PageHeaderComponent,
  PageHeaderAction,
} from '../../../../shared/components/page-header/page-header.component';
import { MeetingService } from '../../../meetings/services/meeting.service';
import { Meeting, ActionItem } from '../../../meetings/models/meeting.model';
import { AuthService } from '../../../../core/services/auth.service';

interface ActionItemDisplay extends ActionItem {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  actionIndex: number;
  isEditing?: boolean;
}

@Component({
  selector: 'app-simple-action-items',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
  ],
  templateUrl: './simple-action-items.component.html',
  styleUrl: './simple-action-items.component.scss',
})
export class SimpleActionItemsComponent implements OnInit {
  private meetingService = inject(MeetingService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  // State
  meetings = signal<Meeting[]>([]);
  loading = signal(false);
  selectedPriority = signal<string>('all');
  selectedStatus = signal<string>('all');
  searchText = signal('');

  // Computed values
  allActionItems = computed(() => {
    const items: ActionItemDisplay[] = [];

    this.meetings().forEach((meeting) => {
      if (meeting.actionItems && meeting.actionItems.length > 0) {
        meeting.actionItems.forEach((item, index) => {
          items.push({
            ...item,
            meetingId: meeting.id!,
            meetingTitle: meeting.title,
            meetingDate: meeting.dateTime,
            actionIndex: index,
            isEditing: false,
          });
        });
      }
    });

    return items;
  });

  filteredActionItems = computed(() => {
    let items = this.allActionItems();

    // Filter by priority
    if (this.selectedPriority() !== 'all') {
      items = items.filter((item) => item.priority === this.selectedPriority());
    }

    // Filter by status
    if (this.selectedStatus() === 'completed') {
      items = items.filter((item) => item.completed);
    } else if (this.selectedStatus() === 'pending') {
      items = items.filter((item) => !item.completed);
    }

    // Filter by search text
    const search = this.searchText().toLowerCase();
    if (search) {
      items = items.filter(
        (item) =>
          item.text.toLowerCase().includes(search) ||
          item.meetingTitle.toLowerCase().includes(search) ||
          (item.assignee && item.assignee.toLowerCase().includes(search)),
      );
    }

    return items;
  });

  stats = computed(() => {
    const items = this.allActionItems();
    return {
      total: items.length,
      completed: items.filter((i) => i.completed).length,
      pending: items.filter((i) => !i.completed).length,
      high: items.filter((i) => i.priority === 'high').length,
      overdue: items.filter((i) => {
        if (i.completed || !i.dueDate) return false;
        return new Date(i.dueDate) < new Date();
      }).length,
    };
  });

  // Table columns
  displayedColumns = [
    'select',
    'actionItem',
    'meeting',
    'priority',
    'assignee',
    'dueDate',
    'status',
    'actions',
  ];

  // Page header actions
  headerActions: PageHeaderAction[] = [
    {
      label: 'Refresh',
      icon: 'refresh',
      action: () => this.loadMeetings(),
    },
  ];

  ngOnInit() {
    this.loadMeetings();
  }

  loadMeetings() {
    this.loading.set(true);

    this.meetingService.getAll().subscribe({
      next: (meetings) => {
        this.meetings.set(meetings);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading meetings:', error);
        this.snackBar.open('Error loading meetings', 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  // Edit mode
  startEdit(item: ActionItemDisplay) {
    // Cancel any other edits
    this.allActionItems().forEach((i) => (i.isEditing = false));
    item.isEditing = true;
  }

  cancelEdit(item: ActionItemDisplay) {
    item.isEditing = false;
    // Reload to reset any changes
    this.loadMeetings();
  }

  async saveEdit(item: ActionItemDisplay) {
    try {
      await this.meetingService.updateActionItem(item.meetingId, item.actionIndex, {
        text: item.text,
        priority: item.priority,
        assignee: item.assignee,
        dueDate: item.dueDate,
        completed: item.completed,
      });

      item.isEditing = false;
      this.snackBar.open('Action item updated', 'Close', { duration: 3000 });
      this.loadMeetings();
    } catch (error) {
      console.error('Error updating action item:', error);
      this.snackBar.open('Error updating action item', 'Close', { duration: 3000 });
    }
  }

  // Quick actions
  async toggleComplete(item: ActionItemDisplay) {
    try {
      await this.meetingService.updateActionItem(item.meetingId, item.actionIndex, {
        completed: !item.completed,
        completedAt: !item.completed ? new Date().toISOString() : undefined,
      });

      this.snackBar.open(item.completed ? 'Marked as pending' : 'Marked as completed', 'Close', {
        duration: 3000,
      });
      this.loadMeetings();
    } catch (error) {
      console.error('Error updating action item:', error);
      this.snackBar.open('Error updating action item', 'Close', { duration: 3000 });
    }
  }

  async updatePriority(item: ActionItemDisplay, priority: string) {
    try {
      await this.meetingService.updateActionItem(item.meetingId, item.actionIndex, { priority });

      this.snackBar.open('Priority updated', 'Close', { duration: 3000 });
      this.loadMeetings();
    } catch (error) {
      console.error('Error updating priority:', error);
      this.snackBar.open('Error updating priority', 'Close', { duration: 3000 });
    }
  }

  // Utility methods
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return 'warn';
      case 'medium':
        return 'accent';
      case 'low':
        return 'primary';
      default:
        return '';
    }
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'No due date';
    return new Date(date).toLocaleDateString();
  }

  isOverdue(item: ActionItemDisplay): boolean {
    if (!item.dueDate || item.completed) return false;
    return new Date(item.dueDate) < new Date();
  }
}
