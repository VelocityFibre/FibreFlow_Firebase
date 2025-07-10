import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  PageHeaderComponent,
  PageHeaderAction,
} from '../../../../shared/components/page-header/page-header.component';
import { MeetingService } from '../../services/meeting.service';
import { PersonalTodoService } from '../../../personal-todos/services/personal-todo.service';
import { Meeting, ActionItem } from '../../models/meeting.model';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-meeting-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatListModule,
    MatDividerModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatMenuModule,
    MatBadgeModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    PageHeaderComponent,
  ],
  templateUrl: './meeting-detail.component.html',
  styleUrls: ['./meeting-detail.component.scss'],
})
export class MeetingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private meetingService = inject(MeetingService);
  private todoService = inject(PersonalTodoService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Data signals
  meeting = signal<Meeting | null>(null);
  loading = signal(true);
  selectedActionItems = signal<Set<number>>(new Set());

  // Computed values
  pendingActionItems = computed(
    () => this.meeting()?.actionItems?.filter((ai) => !ai.completed) || [],
  );

  completedActionItems = computed(
    () => this.meeting()?.actionItems?.filter((ai) => ai.completed) || [],
  );

  speakerStatsArray = computed(() => {
    const stats = this.meeting()?.insights?.speakerStats;
    if (!stats) return [];
    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        ...data,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  });

  // Page header configuration
  get headerActions(): PageHeaderAction[] {
    return [
      {
        label: 'Back to List',
        icon: 'arrow_back',
        color: 'primary',
        variant: 'stroked',
        action: () => this.router.navigate(['/meetings']),
      },
      {
        label: 'View Recording',
        icon: 'videocam',
        color: 'primary',
        action: () => this.openRecording(),
        disabled: !this.meeting()?.recordingUrl,
      },
      {
        label: 'Delete Meeting',
        icon: 'delete',
        color: 'warn',
        variant: 'stroked',
        action: () => this.deleteMeeting(),
      },
    ];
  }

  ngOnInit(): void {
    this.loadMeeting();
  }

  private loadMeeting(): void {
    this.route.params
      .pipe(switchMap((params) => this.meetingService.getById(params['id'])))
      .subscribe({
        next: (meeting) => {
          this.meeting.set(meeting);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading meeting:', error);
          this.loading.set(false);
          // Load mock data for development
          this.loadMockData();
        },
      });
  }

  private loadMockData(): void {
    const mockMeeting: Meeting = {
      id: '1',
      firefliesId: 'ff-001',
      title: 'Weekly Team Standup',
      dateTime: new Date().toISOString(),
      duration: 30,
      organizer: 'John Smith',
      participants: [
        { name: 'John Smith', email: 'john@velocityfibre.co.za' },
        { name: 'Jane Doe', email: 'jane@velocityfibre.co.za' },
        { name: 'Bob Wilson', email: 'bob@velocityfibre.co.za' },
      ],
      summary:
        'The team discussed the current sprint progress, identified blockers, and planned the work for the upcoming week. Key decisions were made regarding the API integration timeline and resource allocation.',
      actionItems: [
        {
          text: 'Complete API integration for meetings module',
          assignee: 'Jane Doe',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          completed: false,
        },
        {
          text: 'Review and approve design mockups',
          assignee: 'John Smith',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          completed: true,
        },
        {
          text: 'Schedule follow-up meeting with stakeholders',
          assignee: 'Bob Wilson',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'low',
          completed: false,
        },
      ],
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      recordingUrl: 'https://fireflies.ai/view/meeting-recording',
      transcript:
        'This is a sample transcript that would contain the full conversation from the meeting...',
      insights: {
        keyTopics: ['API Integration', 'Design Review', 'Sprint Planning', 'Resource Allocation'],
        sentiment: 'positive',
        speakerStats: {
          'John Smith': { duration: 12, percentage: 40 },
          'Jane Doe': { duration: 10, percentage: 33 },
          'Bob Wilson': { duration: 8, percentage: 27 },
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.meeting.set(mockMeeting);
    this.loading.set(false);
  }

  openRecording(): void {
    const recordingUrl = this.meeting()?.recordingUrl;
    if (recordingUrl) {
      window.open(recordingUrl, '_blank');
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  formatDueDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} days`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'high':
        return 'priority_high';
      case 'medium':
        return 'remove';
      case 'low':
        return 'arrow_downward';
      default:
        return 'help';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'info';
    }
  }

  toggleActionItem(index: number): void {
    const selected = new Set(this.selectedActionItems());
    if (selected.has(index)) {
      selected.delete(index);
    } else {
      selected.add(index);
    }
    this.selectedActionItems.set(selected);
  }

  createTodosFromSelected(): void {
    const meeting = this.meeting();
    if (!meeting) return;

    const selectedIndices = Array.from(this.selectedActionItems());
    const selectedItems =
      meeting.actionItems?.filter((_, index) => selectedIndices.includes(index)) || [];

    selectedItems.forEach((actionItem) => {
      // For now, just log the action item
      console.log('Would create todo for:', actionItem);
      // TODO: Implement when we have user authentication
      // this.todoService.createFromMeetingActionItem(
      //   actionItem,
      //   meeting.id,
      //   meeting.title,
      //   'current-user-id'
      // ).then(() => {
      //   console.log('Todo created successfully');
      // }).catch(error => {
      //   console.error('Error creating todo:', error);
      // });
    });

    // Clear selection after creating todos
    this.selectedActionItems.set(new Set());
  }

  getSentimentIcon(sentiment: string): string {
    switch (sentiment) {
      case 'positive':
        return 'sentiment_satisfied';
      case 'neutral':
        return 'sentiment_neutral';
      case 'negative':
        return 'sentiment_dissatisfied';
      default:
        return 'help';
    }
  }

  getSentimentColor(sentiment: string): string {
    switch (sentiment) {
      case 'positive':
        return 'success';
      case 'neutral':
        return 'info';
      case 'negative':
        return 'danger';
      default:
        return 'info';
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  deleteMeeting(): void {
    const meeting = this.meeting();
    if (!meeting) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Meeting',
        message: `Are you sure you want to delete "${meeting.title}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loading.set(true);
        this.meetingService
          .deleteMeeting(meeting.id)
          .then(() => {
            this.snackBar.open('Meeting deleted successfully', 'Close', {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'top',
            });
            // Navigate back to meetings list
            this.router.navigate(['/meetings']);
          })
          .catch((error) => {
            console.error('Error deleting meeting:', error);
            this.snackBar.open('Error deleting meeting', 'Close', {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'top',
            });
            this.loading.set(false);
          });
      }
    });
  }
}
