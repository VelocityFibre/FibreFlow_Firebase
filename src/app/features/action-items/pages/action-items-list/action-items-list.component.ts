import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';
import { 
  PageHeaderComponent, 
  PageHeaderAction 
} from '../../../../shared/components/page-header/page-header.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { ActionItemsManagementService } from '../../services/action-items-management.service';
import { AuthService } from '../../../../core/services/auth.service';
import { 
  ActionItemManagement, 
  ActionItemStatus, 
  ActionItemFilter,
  ActionItemStats 
} from '../../models/action-item-management.model';

@Component({
  selector: 'app-action-items-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatDividerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    PageHeaderComponent,
    LoadingSkeletonComponent
  ],
  templateUrl: './action-items-list.component.html',
  styleUrls: ['./action-items-list.component.scss']
})
export class ActionItemsListComponent implements OnInit {
  private actionItemsService = inject(ActionItemsManagementService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  // State signals
  actionItems = signal<ActionItemManagement[]>([]);
  stats = signal<ActionItemStats | null>(null);
  loading = signal(true);
  filter = signal<ActionItemFilter>({});
  selection = new SelectionModel<ActionItemManagement>(true, []);

  // Filter options
  statusOptions = Object.values(ActionItemStatus);
  priorityOptions = ['high', 'medium', 'low'];

  // Computed values
  filteredItems = computed(() => {
    const items = this.actionItems();
    const filterValue = this.filter();
    
    // Client-side filtering is handled in the service
    return items;
  });

  displayedColumns = [
    'select',
    'actionItem',
    'meeting',
    'priority',
    'assignee',
    'dueDate',
    'status',
    'actions'
  ];

  // Page header configuration
  get headerActions(): PageHeaderAction[] {
    const actions: PageHeaderAction[] = [];

    if (this.selection.hasValue()) {
      actions.push({
        label: `Update ${this.selection.selected.length} Items`,
        icon: 'edit',
        color: 'accent',
        action: () => this.bulkUpdate()
      });
    }

    return actions;
  }

  ngOnInit() {
    this.loadActionItems();
    this.loadStats();
  }

  private loadActionItems() {
    this.loading.set(true);
    this.actionItemsService.getActionItems(this.filter()).subscribe({
      next: (items) => {
        this.actionItems.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading action items:', error);
        this.loading.set(false);
        this.snackBar.open('Error loading action items', 'Close', {
          duration: 3000
        });
      }
    });
  }

  private loadStats() {
    this.actionItemsService.getActionItemStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: (error) => console.error('Error loading stats:', error)
    });
  }

  // Selection methods
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.filteredItems().length;
    return numSelected === numRows;
  }

  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.filteredItems().forEach(row => this.selection.select(row));
    }
  }

  // Filter methods
  applyFilter() {
    this.loadActionItems();
  }

  clearFilter() {
    this.filter.set({});
    this.loadActionItems();
  }

  // Action methods (importFromMeetings removed - handled by scheduled sync)

  async editActionItem(item: ActionItemManagement) {
    // Edit functionality moved to AG-Grid view
    // Redirect to grid view for editing
    this.snackBar.open('Please use the grid view for editing', 'Close', {
      duration: 3000
    });
  }

  async updateStatus(item: ActionItemManagement, status: ActionItemStatus) {
    try {
      const user = this.authService.currentUser();
      if (!user) {
        this.snackBar.open('Please login to update status', 'Close', {
          duration: 3000
        });
        return;
      }
      
      await this.actionItemsService.updateActionItem(
        item.id!,
        { status },
        user.uid,
        user.email || 'unknown@fibreflow.com',
        `Status changed to ${status}`
      );
      
      this.snackBar.open('Status updated successfully', 'Close', {
        duration: 3000
      });
      
      this.loadActionItems();
      this.loadStats();
    } catch (error) {
      console.error('Error updating status:', error);
      this.snackBar.open('Error updating status', 'Close', {
        duration: 3000
      });
    }
  }

  async bulkUpdate() {
    // Bulk update functionality moved to AG-Grid view
    // Redirect to grid view for bulk operations
    this.snackBar.open('Please use the grid view for bulk updates', 'Close', {
      duration: 3000
    });
  }

  // Utility methods
  getActionItemText(item: ActionItemManagement): string {
    return item.originalActionItem.text;
  }

  getAssignee(item: ActionItemManagement): string {
    return item.updates.assignee || item.originalActionItem.assignee || 'Unassigned';
  }

  getPriority(item: ActionItemManagement): string {
    return item.updates.priority || item.originalActionItem.priority;
  }

  getDueDate(item: ActionItemManagement): string | undefined {
    return item.updates.dueDate || item.originalActionItem.dueDate;
  }

  formatDueDate(dateString: string | undefined): string {
    if (!dateString) return 'No due date';
    
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
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return date.toLocaleDateString();
    }
  }

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

  getStatusColor(status: ActionItemStatus): string {
    switch (status) {
      case ActionItemStatus.COMPLETED:
        return 'success';
      case ActionItemStatus.IN_PROGRESS:
        return 'info';
      case ActionItemStatus.BLOCKED:
        return 'danger';
      case ActionItemStatus.CANCELLED:
        return 'muted';
      default:
        return 'warning';
    }
  }

  isOverdue(item: ActionItemManagement): boolean {
    const dueDate = this.getDueDate(item);
    if (!dueDate || item.status === ActionItemStatus.COMPLETED) return false;
    return new Date(dueDate) < new Date();
  }
}