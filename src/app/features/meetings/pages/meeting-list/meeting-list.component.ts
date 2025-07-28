import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  PageHeaderComponent,
  PageHeaderAction,
} from '../../../../shared/components/page-header/page-header.component';
import {
  SummaryCardsComponent,
  SummaryCard,
} from '../../../../shared/components/summary-cards/summary-cards.component';
import {
  FilterFormComponent,
  FilterField,
} from '../../../../shared/components/filter-form/filter-form.component';
import { MeetingService } from '../../services/meeting.service';
import { FirefliesService } from '../../services/fireflies.service';
import { Meeting } from '../../models/meeting.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-meeting-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatBadgeModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule,
    PageHeaderComponent,
    SummaryCardsComponent,
    FilterFormComponent,
  ],
  templateUrl: './meeting-list.component.html',
  styleUrls: ['./meeting-list.component.scss'],
})
export class MeetingListComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private meetingService = inject(MeetingService);
  private firefliesService = inject(FirefliesService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Data signals
  meetings = signal<Meeting[]>([]);
  loading = signal(true);
  selectedMeetings = signal<Set<string>>(new Set());

  // Computed values
  filteredMeetings = computed(() => {
    const filterValues = this.filterForm.value;
    let filtered = this.meetings();

    // Search filter
    if (filterValues.search) {
      const search = filterValues.search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(search) ||
          m.organizer?.toLowerCase().includes(search) ||
          m.participants.some((p) => p.name.toLowerCase().includes(search)),
      );
    }

    // Date range filter
    if (filterValues.dateFrom) {
      filtered = filtered.filter((m) => new Date(m.dateTime) >= filterValues.dateFrom);
    }
    if (filterValues.dateTo) {
      filtered = filtered.filter((m) => new Date(m.dateTime) <= filterValues.dateTo);
    }

    // Has action items filter
    if (filterValues.hasActionItems) {
      filtered = filtered.filter((m) => m.actionItems && m.actionItems.length > 0);
    }

    // Participant filter
    if (filterValues.participant) {
      filtered = filtered.filter((m) =>
        m.participants.some((p) => p.name === filterValues.participant),
      );
    }

    return filtered;
  });

  // Summary cards data
  summaryCards = computed<SummaryCard[]>(() => [
    {
      value: this.meetings().length,
      label: 'Total Meetings',
      icon: 'groups',
      color: 'primary',
    },
    {
      value: this.meetings().filter(
        (m) => new Date(m.dateTime).toDateString() === new Date().toDateString(),
      ).length,
      label: "Today's Meetings",
      icon: 'today',
      color: 'info',
    },
    {
      value: this.meetings().reduce((sum, m) => sum + (m.actionItems?.length || 0), 0),
      label: 'Total Action Items',
      icon: 'task_alt',
      color: 'warning',
    },
    {
      value: this.meetings().filter((m) => m.actionItems?.some((ai) => !ai.completed)).length,
      label: 'Meetings with Pending Actions',
      icon: 'pending_actions',
      color: 'danger',
    },
  ]);

  // Get unique participants for filter
  participants = computed(() => {
    const participantSet = new Set<string>();
    this.meetings().forEach((m) => {
      m.participants.forEach((p) => participantSet.add(p.name));
    });
    return Array.from(participantSet).sort();
  });

  // Page header configuration
  headerActions: PageHeaderAction[] = [
    {
      label: 'Sync Meetings',
      icon: 'sync',
      color: 'primary',
      action: () => this.syncMeetings(),
    },
    {
      label: 'Manage Action Items',
      icon: 'task_alt',
      color: 'accent',
      action: () => this.router.navigate(['/action-items']),
    },
    {
      label: 'Export',
      icon: 'download',
      color: 'primary',
      variant: 'stroked',
      action: () => this.exportMeetings(),
    },
  ];

  // Filter form configuration
  filterForm!: FormGroup;
  filterFields: FilterField[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Search by title, organizer, or participant',
      icon: 'search',
    },
    {
      key: 'dateFrom',
      label: 'From Date',
      type: 'date',
    },
    {
      key: 'dateTo',
      label: 'To Date',
      type: 'date',
    },
    {
      key: 'participant',
      label: 'Participant',
      type: 'select',
      options: [],
    },
    {
      key: 'hasActionItems',
      label: 'Has Action Items',
      type: 'select',
      options: [
        { value: '', label: 'All' },
        { value: true, label: 'Yes' },
        { value: false, label: 'No' },
      ],
    },
  ];

  // Table configuration
  displayedColumns = [
    'select',
    'title',
    'dateTime',
    'duration',
    'participants',
    'actionItems',
    'actions',
  ];

  ngOnInit(): void {
    this.initializeFilterForm();
    this.loadMeetings();
  }

  private initializeFilterForm(): void {
    this.filterForm = this.fb.group({
      search: [''],
      dateFrom: [null],
      dateTo: [null],
      participant: [''],
      hasActionItems: [''],
    });
  }

  private loadMeetings(): void {
    this.loading.set(true);
    this.meetingService.getAll().subscribe({
      next: (meetings) => {
        this.meetings.set(meetings);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading meetings:', error);
        this.loading.set(false);
        // Set empty array on error instead of mock data
        this.meetings.set([]);
      },
    });
  }

  syncMeetings(): void {
    this.loading.set(true);
    console.log('Starting Fireflies sync...');

    // Use the new callable function that doesn't have IAM issues
    this.firefliesService.syncMeetings(30).subscribe({
      next: (response) => {
        console.log('Sync response:', response);
        if (response.success) {
          console.log(`Sync completed: ${response.stats.totalMeetings} meetings processed`);
          console.log(
            `New meetings: ${response.stats.newMeetings}, Updated: ${response.stats.updatedMeetings}`,
          );
          // Reload meetings to show the synced data
          this.loadMeetings();
        } else {
          console.error('Sync failed:', response.error);
          this.loading.set(false);
        }
      },
      error: (error) => {
        console.error('Error syncing meetings:', error);
        this.loading.set(false);
        // Still reload existing meetings
        this.loadMeetings();
      },
    });
  }

  exportMeetings(): void {
    // Export functionality
    const selected = Array.from(this.selectedMeetings());
    const dataToExport =
      selected.length > 0
        ? this.meetings().filter((m) => selected.includes(m.id))
        : this.filteredMeetings();

    console.log('Exporting meetings:', dataToExport);
  }

  viewMeeting(meeting: Meeting): void {
    this.router.navigate(['/meetings', meeting.id]);
  }

  deleteMeeting(meeting: Meeting): void {
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
            // Remove from local state
            this.meetings.update((meetings) => meetings.filter((m) => m.id !== meeting.id));
            this.loading.set(false);
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

  toggleSelection(meetingId: string): void {
    const selected = new Set(this.selectedMeetings());
    if (selected.has(meetingId)) {
      selected.delete(meetingId);
    } else {
      selected.add(meetingId);
    }
    this.selectedMeetings.set(selected);
  }

  isSelected(meetingId: string): boolean {
    return this.selectedMeetings().has(meetingId);
  }

  selectAll(): void {
    if (this.selectedMeetings().size === this.filteredMeetings().length) {
      this.selectedMeetings.set(new Set());
    } else {
      const allIds = new Set(this.filteredMeetings().map((m) => m.id));
      this.selectedMeetings.set(allIds);
    }
  }

  onFiltersApply(filters: any): void {
    // Filters are automatically applied through reactive forms
  }

  formatDuration(minutes: number): string {
    // Round the input to avoid decimal places
    const totalMinutes = Math.round(minutes);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  getActionItemsTooltip(meeting: Meeting): string {
    if (!meeting.actionItems || meeting.actionItems.length === 0) {
      return 'No action items';
    }
    const pending = meeting.actionItems.filter((ai) => !ai.completed).length;
    const completed = meeting.actionItems.filter((ai) => ai.completed).length;
    return `${pending} pending, ${completed} completed`;
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

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  getRemainingParticipantsTooltip(meeting: Meeting): string {
    return meeting.participants
      .slice(3)
      .map((p) => p.name)
      .join(', ');
  }

  hasActionItems(meeting: Meeting): boolean {
    return !!(meeting.actionItems && meeting.actionItems.length > 0);
  }

  hasPendingActionItems(meeting: Meeting): boolean {
    return !!(meeting.actionItems && meeting.actionItems.some((ai) => !ai.completed));
  }

  getPendingActionItemsCount(meeting: Meeting): number {
    return meeting.actionItems?.filter((ai) => !ai.completed).length || 0;
  }
}
