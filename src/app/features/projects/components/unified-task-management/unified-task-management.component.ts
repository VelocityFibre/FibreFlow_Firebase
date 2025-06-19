import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Observable, combineLatest, map } from 'rxjs';

import { Phase, PhaseStatus } from '../../../../core/models/phase.model';
import { Step, StepStatus } from '../../../../core/models/step.model';
import { Task, TaskStatus } from '../../../../core/models/task.model';
import { StaffMember } from '../../../staff/models/staff.model';

import { PhaseService } from '../../../../core/services/phase.service';
import { StepService } from '../../../../core/services/step.service';
import { TaskService } from '../../../../core/services/task.service';
import { StaffService } from '../../../staff/services/staff.service';
import { NotificationService } from '../../../../core/services/notification.service';

interface WorkItem {
  id: string;
  type: 'phase' | 'step' | 'task';
  name: string;
  description?: string;
  status: PhaseStatus | StepStatus | TaskStatus;
  assignedTo?: string;
  assignedToName?: string;
  isFlagged: boolean;
  flaggedReason?: string;
  progress: number;
  parentId?: string;
  orderNo: number;
  expanded?: boolean;
  children?: WorkItem[];
  originalData: Phase | Step | Task;
}

type ViewFilter = 'all' | 'uncompleted' | 'flagged';

@Component({
  selector: 'app-unified-task-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatMenuModule,
    MatDividerModule,
  ],
  template: `
    <div class="unified-task-management">
      <!-- Header with Filters -->
      <div class="management-header">
        <h2>Task Management</h2>
        <div class="header-actions">
          <button mat-button (click)="refreshData()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <mat-card class="filter-card">
        <div class="filters-container">
          <mat-button-toggle-group [(value)]="viewFilter" (change)="onFilterChange()">
            <mat-button-toggle value="all">
              <mat-icon>list</mat-icon>
              All Items
            </mat-button-toggle>
            <mat-button-toggle value="uncompleted">
              <mat-icon>radio_button_unchecked</mat-icon>
              Uncompleted
            </mat-button-toggle>
            <mat-button-toggle value="flagged">
              <mat-icon>flag</mat-icon>
              Flagged
            </mat-button-toggle>
          </mat-button-toggle-group>

          <mat-form-field appearance="outline" class="assignee-filter">
            <mat-label>Filter by Assignee</mat-label>
            <mat-select [(value)]="assigneeFilter" (selectionChange)="onFilterChange()">
              <mat-option value="all">All Assignees</mat-option>
              <mat-option value="unassigned">Unassigned</mat-option>
              <mat-option *ngFor="let staff of staff$ | async" [value]="staff.id">
                {{ staff.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="filter-stats">
          <span *ngIf="filteredWorkItems$ | async as items">
            Showing {{ items.length }} items
          </span>
        </div>
      </mat-card>

      <!-- Work Items List -->
      <div class="work-items-container" *ngIf="filteredWorkItems$ | async as workItems">
        <div *ngIf="workItems.length === 0" class="empty-state">
          <mat-icon>inbox</mat-icon>
          <p>No items match your filters</p>
        </div>

        <div *ngFor="let item of workItems; trackBy: trackByWorkItem" class="work-item-wrapper">
          <!-- Phase Item -->
          <div class="work-item phase-item" [class.expanded]="item.expanded">
            <div class="item-main">
              <button
                mat-icon-button
                class="expand-button"
                (click)="toggleExpand(item)"
                *ngIf="item.type === 'phase' && item.children && item.children.length > 0"
              >
                <mat-icon>{{ item.expanded ? 'expand_more' : 'chevron_right' }}</mat-icon>
              </button>

              <div class="item-type-icon">
                <mat-icon *ngIf="item.type === 'phase'">folder</mat-icon>
                <mat-icon *ngIf="item.type === 'step'">layers</mat-icon>
                <mat-icon *ngIf="item.type === 'task'">assignment</mat-icon>
              </div>

              <div class="item-content">
                <div class="item-header">
                  <h3 class="item-name">{{ item.name }}</h3>
                  <span class="item-type-badge">{{ item.type | titlecase }}</span>
                </div>
                <p class="item-description" *ngIf="item.description">{{ item.description }}</p>

                <div class="item-meta">
                  <span class="meta-item">
                    <mat-icon>donut_small</mat-icon>
                    {{ item.progress }}% complete
                  </span>
                  <span class="meta-item" *ngIf="item.assignedToName">
                    <mat-icon>person</mat-icon>
                    {{ item.assignedToName }}
                  </span>
                </div>
              </div>
            </div>

            <div class="item-actions">
              <!-- Assignee Selector -->
              <mat-form-field appearance="outline" class="assignee-select">
                <mat-select
                  [(value)]="item.assignedTo"
                  (selectionChange)="updateAssignee(item, $event.value)"
                  placeholder="Assign to"
                  (click)="$event.stopPropagation()"
                >
                  <mat-option [value]="null">Unassigned</mat-option>
                  <mat-option *ngFor="let staff of staff$ | async" [value]="staff.id">
                    {{ staff.name }}
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Status Indicator -->
              <button
                mat-icon-button
                [matTooltip]="getStatusTooltip(item)"
                [matMenuTriggerFor]="statusMenu"
                class="status-button"
                [class]="'status-' + item.status"
              >
                <mat-icon>{{ getStatusIcon(item) }}</mat-icon>
              </button>
              <mat-menu #statusMenu="matMenu">
                <button mat-menu-item (click)="updateStatus(item, 'pending')">
                  <mat-icon>schedule</mat-icon>
                  <span>Pending</span>
                </button>
                <button mat-menu-item (click)="updateStatus(item, 'in_progress')">
                  <mat-icon>trending_up</mat-icon>
                  <span>In Progress</span>
                </button>
                <button mat-menu-item (click)="updateStatus(item, 'completed')">
                  <mat-icon>check_circle</mat-icon>
                  <span>Completed</span>
                </button>
                <button mat-menu-item (click)="updateStatus(item, 'blocked')">
                  <mat-icon>block</mat-icon>
                  <span>Blocked</span>
                </button>
              </mat-menu>

              <!-- Complete Toggle -->
              <button
                mat-icon-button
                (click)="toggleComplete(item)"
                [matTooltip]="
                  item.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'
                "
                class="complete-button"
              >
                <mat-icon>{{
                  isCompleted(item) ? 'check_circle' : 'radio_button_unchecked'
                }}</mat-icon>
              </button>

              <!-- Flag Toggle -->
              <button
                mat-icon-button
                (click)="toggleFlag(item)"
                [matTooltip]="item.isFlagged ? 'Remove flag' : 'Flag this item'"
                class="flag-button"
                [class.flagged]="item.isFlagged"
              >
                <mat-icon>{{ item.isFlagged ? 'flag' : 'outlined_flag' }}</mat-icon>
              </button>

              <!-- More Actions -->
              <button mat-icon-button [matMenuTriggerFor]="moreMenu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #moreMenu="matMenu">
                <button mat-menu-item (click)="editItem(item)">
                  <mat-icon>edit</mat-icon>
                  <span>Edit</span>
                </button>
                <button mat-menu-item (click)="viewDetails(item)">
                  <mat-icon>info</mat-icon>
                  <span>View Details</span>
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item (click)="deleteItem(item)" class="delete-option">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </mat-menu>
            </div>
          </div>

          <!-- Children Items (Steps and Tasks) -->
          <div class="children-container" *ngIf="item.expanded && item.children">
            <div
              *ngFor="let child of item.children; trackBy: trackByWorkItem"
              class="work-item child-item"
              [class]="'child-' + child.type"
            >
              <div class="item-main">
                <div class="indent-spacer"></div>

                <div class="item-type-icon small">
                  <mat-icon *ngIf="child.type === 'step'">layers</mat-icon>
                  <mat-icon *ngIf="child.type === 'task'">task_alt</mat-icon>
                </div>

                <div class="item-content">
                  <h4 class="item-name">{{ child.name }}</h4>
                  <div class="item-meta">
                    <span class="meta-item" *ngIf="child.assignedToName">
                      <mat-icon>person_outline</mat-icon>
                      {{ child.assignedToName }}
                    </span>
                    <span class="meta-item"> {{ child.progress }}% complete </span>
                  </div>
                </div>
              </div>

              <div class="item-actions compact">
                <!-- Quick Assign -->
                <mat-select
                  [(value)]="child.assignedTo"
                  (selectionChange)="updateAssignee(child, $event.value)"
                  placeholder="Assign"
                  class="quick-assign"
                  (click)="$event.stopPropagation()"
                >
                  <mat-option [value]="null">-</mat-option>
                  <mat-option *ngFor="let staff of staff$ | async" [value]="staff.id">
                    {{ staff.name }}
                  </mat-option>
                </mat-select>

                <!-- Complete Toggle -->
                <button
                  mat-icon-button
                  (click)="toggleComplete(child)"
                  [matTooltip]="isCompleted(child) ? 'Mark as incomplete' : 'Mark as complete'"
                  class="complete-button small"
                >
                  <mat-icon>{{
                    isCompleted(child) ? 'check_circle' : 'radio_button_unchecked'
                  }}</mat-icon>
                </button>

                <!-- Flag Toggle -->
                <button
                  mat-icon-button
                  (click)="toggleFlag(child)"
                  [matTooltip]="child.isFlagged ? 'Remove flag' : 'Flag this item'"
                  class="flag-button small"
                  [class.flagged]="child.isFlagged"
                >
                  <mat-icon>{{ child.isFlagged ? 'flag' : 'outlined_flag' }}</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .unified-task-management {
        padding: 0;
      }

      .management-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .management-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
      }

      .filter-card {
        margin-bottom: 24px;
        border-radius: 12px;
      }

      .filters-container {
        display: flex;
        gap: 24px;
        align-items: center;
        flex-wrap: wrap;
      }

      .assignee-filter {
        min-width: 200px;
      }

      .filter-stats {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
        font-size: 14px;
        color: #6b7280;
      }

      .work-items-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .empty-state {
        text-align: center;
        padding: 64px 32px;
        color: #6b7280;
      }

      .empty-state mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        opacity: 0.3;
        margin-bottom: 16px;
      }

      .work-item {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        transition: all 0.2s ease;
      }

      .work-item:hover {
        border-color: #d1d5db;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .phase-item {
        border-left: 4px solid #3b82f6;
      }

      .child-item {
        margin-left: 40px;
        border-left: 3px solid #e5e7eb;
      }

      .child-step {
        border-left-color: #8b5cf6;
      }

      .child-task {
        border-left-color: #10b981;
      }

      .item-main {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        flex: 1;
      }

      .expand-button {
        margin-left: -8px;
      }

      .indent-spacer {
        width: 24px;
      }

      .item-type-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background-color: #f3f4f6;
        flex-shrink: 0;
      }

      .item-type-icon.small {
        width: 32px;
        height: 32px;
      }

      .item-type-icon mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #6b7280;
      }

      .item-content {
        flex: 1;
        min-width: 0;
      }

      .item-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 4px;
      }

      .item-name {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #1f2937;
      }

      .child-item .item-name {
        font-size: 14px;
        font-weight: 400;
      }

      .item-type-badge {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 4px;
        background-color: #e5e7eb;
        color: #6b7280;
        text-transform: uppercase;
        font-weight: 500;
      }

      .item-description {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: #6b7280;
        line-height: 1.5;
      }

      .item-meta {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        color: #6b7280;
      }

      .meta-item mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .work-item {
        display: flex;
        gap: 16px;
        align-items: center;
      }

      .item-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .item-actions.compact {
        gap: 4px;
      }

      .assignee-select {
        width: 140px;
      }

      .assignee-select ::ng-deep .mat-mdc-form-field-wrapper {
        padding-bottom: 0;
      }

      .assignee-select ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }

      .quick-assign {
        width: 100px;
        font-size: 13px;
      }

      .status-button {
        position: relative;
      }

      .status-button.status-pending {
        color: #6b7280;
      }

      .status-button.status-active,
      .status-button.status-in_progress,
      .status-button.status-IN_PROGRESS {
        color: #3b82f6;
      }

      .status-button.status-completed,
      .status-button.status-COMPLETED {
        color: #10b981;
      }

      .status-button.status-blocked,
      .status-button.status-BLOCKED {
        color: #ef4444;
      }

      .complete-button {
        color: #10b981;
      }

      .complete-button.small mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .flag-button {
        color: #6b7280;
      }

      .flag-button.flagged {
        color: #ef4444;
      }

      .flag-button.small mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .delete-option {
        color: #ef4444;
      }

      .children-container {
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      @media (max-width: 768px) {
        .filters-container {
          flex-direction: column;
          align-items: stretch;
        }

        .assignee-filter {
          width: 100%;
        }

        .work-item {
          flex-direction: column;
          gap: 12px;
        }

        .item-actions {
          width: 100%;
          justify-content: flex-end;
        }

        .child-item {
          margin-left: 20px;
        }
      }
    `,
  ],
})
export class UnifiedTaskManagementComponent implements OnInit {
  @Input() projectId!: string;

  private phaseService = inject(PhaseService);
  private stepService = inject(StepService);
  private taskService = inject(TaskService);
  private staffService = inject(StaffService);
  private notification = inject(NotificationService);

  staff$!: Observable<StaffMember[]>;
  workItems$!: Observable<WorkItem[]>;
  filteredWorkItems$!: Observable<WorkItem[]>;

  viewFilter: ViewFilter = 'all';
  assigneeFilter = 'all';

  ngOnInit() {
    this.loadStaff();
    this.loadWorkItems();
  }

  private loadStaff() {
    this.staff$ = this.staffService.getStaff();
  }

  private loadWorkItems() {
    if (!this.projectId) return;

    // Combine all data sources
    const phases$ = this.phaseService.getByProject(this.projectId);
    const steps$ = this.stepService.getStepsByProject(this.projectId);
    const tasks$ = this.taskService.getTasksByProject(this.projectId);

    this.workItems$ = combineLatest([phases$, steps$, tasks$, this.staff$]).pipe(
      map(([phases, steps, tasks, staff]) => {
        // Create a map of staff for quick lookup
        const staffMap = new Map(staff.map((s: StaffMember) => [s.id, s]));

        // Convert phases to work items
        const phaseItems: WorkItem[] = phases.map((phase: Phase) => ({
          id: phase.id!,
          type: 'phase' as const,
          name: phase.name,
          description: phase.description,
          status: phase.status,
          assignedTo: phase.assignedTo,
          assignedToName: phase.assignedTo ? staffMap.get(phase.assignedTo)?.name : undefined,
          isFlagged: false, // TODO: Add to phase model
          progress: phase.progress || 0,
          orderNo: phase.orderNo,
          expanded: false,
          children: [],
          originalData: phase,
        }));

        // Convert steps to work items and group by phase
        const stepsByPhase = new Map<string, WorkItem[]>();
        steps.forEach((step: Step) => {
          const workItem: WorkItem = {
            id: step.id!,
            type: 'step' as const,
            name: step.name,
            description: step.description,
            status: step.status,
            assignedTo: step.assignedTo?.[0], // Take first assignee for now
            assignedToName: step.assignedTo?.[0]
              ? staffMap.get(step.assignedTo[0])?.name
              : undefined,
            isFlagged: false, // TODO: Add to step model
            progress: step.progress || 0,
            parentId: step.phaseId,
            orderNo: step.orderNo,
            originalData: step,
          };

          const phaseSteps = stepsByPhase.get(step.phaseId) || [];
          phaseSteps.push(workItem);
          stepsByPhase.set(step.phaseId, phaseSteps);
        });

        // Convert tasks to work items and group by phase
        const tasksByPhase = new Map<string, WorkItem[]>();
        tasks.forEach((task: Task) => {
          const workItem: WorkItem = {
            id: task.id!,
            type: 'task' as const,
            name: task.name,
            description: task.description,
            status: task.status,
            assignedTo: task.assignedTo,
            assignedToName:
              task.assignedToName ||
              (task.assignedTo ? staffMap.get(task.assignedTo)?.name : undefined),
            isFlagged: false, // TODO: Add to task model
            progress: task.completionPercentage || 0,
            parentId: task.phaseId,
            orderNo: task.orderNo,
            originalData: task,
          };

          const phaseTasks = tasksByPhase.get(task.phaseId) || [];
          phaseTasks.push(workItem);
          tasksByPhase.set(task.phaseId, phaseTasks);
        });

        // Assign children to phases
        phaseItems.forEach((phase) => {
          const steps = stepsByPhase.get(phase.id) || [];
          const tasks = tasksByPhase.get(phase.id) || [];
          phase.children = [...steps, ...tasks].sort((a, b) => a.orderNo - b.orderNo);
        });

        return phaseItems.sort((a, b) => a.orderNo - b.orderNo);
      }),
    );

    // Apply filters
    this.filteredWorkItems$ = this.workItems$.pipe(map((items) => this.applyFilters(items)));
  }

  private applyFilters(items: WorkItem[]): WorkItem[] {
    let filtered = [...items];

    // View filter
    if (this.viewFilter === 'uncompleted') {
      filtered = this.filterUncompleted(filtered);
    } else if (this.viewFilter === 'flagged') {
      filtered = this.filterFlagged(filtered);
    }

    // Assignee filter
    if (this.assigneeFilter !== 'all') {
      filtered = this.filterByAssignee(filtered, this.assigneeFilter);
    }

    return filtered;
  }

  private filterUncompleted(items: WorkItem[]): WorkItem[] {
    return items
      .map((item) => {
        if (item.children) {
          const filteredChildren = item.children.filter((child) => !this.isCompleted(child));
          if (!this.isCompleted(item) || filteredChildren.length > 0) {
            return { ...item, children: filteredChildren };
          }
          return null;
        }
        return !this.isCompleted(item) ? item : null;
      })
      .filter((item) => item !== null) as WorkItem[];
  }

  private filterFlagged(items: WorkItem[]): WorkItem[] {
    return items
      .map((item) => {
        if (item.children) {
          const filteredChildren = item.children.filter((child) => child.isFlagged);
          if (item.isFlagged || filteredChildren.length > 0) {
            return { ...item, children: filteredChildren };
          }
          return null;
        }
        return item.isFlagged ? item : null;
      })
      .filter((item) => item !== null) as WorkItem[];
  }

  private filterByAssignee(items: WorkItem[], assigneeId: string): WorkItem[] {
    const checkAssignee = (item: WorkItem) => {
      if (assigneeId === 'unassigned') {
        return !item.assignedTo;
      }
      return item.assignedTo === assigneeId;
    };

    return items
      .map((item) => {
        if (item.children) {
          const filteredChildren = item.children.filter(checkAssignee);
          if (checkAssignee(item) || filteredChildren.length > 0) {
            return { ...item, children: filteredChildren };
          }
          return null;
        }
        return checkAssignee(item) ? item : null;
      })
      .filter((item) => item !== null) as WorkItem[];
  }

  isCompleted(item: WorkItem): boolean {
    const status = item.status as string;
    return status === 'completed' || status === 'COMPLETED';
  }

  getStatusIcon(item: WorkItem): string {
    const status = item.status as string;
    switch (status.toLowerCase()) {
      case 'pending':
        return 'schedule';
      case 'active':
      case 'in_progress':
        return 'trending_up';
      case 'completed':
        return 'check_circle';
      case 'blocked':
        return 'block';
      default:
        return 'help_outline';
    }
  }

  getStatusTooltip(item: WorkItem): string {
    const status = item.status as string;
    return `Status: ${status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}`;
  }

  toggleExpand(item: WorkItem) {
    item.expanded = !item.expanded;
  }

  async toggleComplete(item: WorkItem) {
    try {
      const newStatus = this.isCompleted(item) ? 'pending' : 'completed';
      await this.updateStatus(item, newStatus);
    } catch (error) {
      console.error('Error toggling completion:', error);
      this.notification.error('Failed to update completion status');
    }
  }

  async toggleFlag(item: WorkItem) {
    try {
      // const updates = { isFlagged: !item.isFlagged };

      switch (item.type) {
        case 'phase':
          // TODO: Add isFlagged to phase model and service
          this.notification.warning('Flagging phases coming soon');
          break;
        case 'step':
          // TODO: Add isFlagged to step model and service
          this.notification.warning('Flagging steps coming soon');
          break;
        case 'task':
          // TODO: Add isFlagged to task model and service
          this.notification.warning('Flagging tasks coming soon');
          break;
      }
    } catch (error) {
      console.error('Error toggling flag:', error);
      this.notification.error('Failed to update flag');
    }
  }

  async updateAssignee(item: WorkItem, assigneeId: string | null) {
    try {
      switch (item.type) {
        case 'phase':
          await this.phaseService.assignPhase(this.projectId, item.id, assigneeId);
          break;
        case 'step':
          await this.stepService.updateStep(item.id, {
            assignedTo: assigneeId ? [assigneeId] : [],
          });
          break;
        case 'task':
          await this.taskService.updateTask(item.id, { assignedTo: assigneeId || undefined });
          break;
      }
      this.notification.success('Assignee updated');
    } catch (error) {
      console.error('Error updating assignee:', error);
      this.notification.error('Failed to update assignee');
    }
  }

  async updateStatus(item: WorkItem, newStatus: string) {
    try {
      switch (item.type) {
        case 'phase':
          await this.phaseService.updatePhaseStatus(
            this.projectId,
            item.id,
            newStatus as PhaseStatus,
          );
          break;
        case 'step':
          await this.stepService.updateStep(item.id, { status: newStatus as StepStatus });
          break;
        case 'task':
          await this.taskService.updateTask(item.id, { status: newStatus as TaskStatus });
          break;
      }
      this.notification.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      this.notification.error('Failed to update status');
    }
  }

  editItem(item: WorkItem) {
    // TODO: Open appropriate edit dialog based on type
    this.notification.info(`Edit ${item.type}: ${item.name}`);
  }

  viewDetails(item: WorkItem) {
    // TODO: Open appropriate detail dialog based on type
    this.notification.info(`View details for ${item.type}: ${item.name}`);
  }

  async deleteItem(item: WorkItem) {
    if (!confirm(`Are you sure you want to delete this ${item.type}?`)) {
      return;
    }

    try {
      switch (item.type) {
        case 'phase':
          // Phase deletion not implemented yet
          this.notification.warning('Phase deletion not available');
          return;
        case 'step':
          await this.stepService.deleteStep(item.id);
          break;
        case 'task':
          await this.taskService.deleteTask(item.id);
          break;
      }
      this.notification.success(`${item.type} deleted`);
    } catch (error) {
      console.error('Error deleting item:', error);
      this.notification.error(`Failed to delete ${item.type}`);
    }
  }

  onFilterChange() {
    // Triggers the filter pipe to recalculate
    this.loadWorkItems();
  }

  refreshData() {
    this.loadWorkItems();
  }

  trackByWorkItem(index: number, item: WorkItem): string {
    return `${item.type}-${item.id}`;
  }
}
