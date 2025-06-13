import { Injectable } from '@angular/core';
import { Subject, Observable, filter } from 'rxjs';
import { StaffMember } from '../../features/staff/public-api';
import { Project } from '../models/project.model';

// Event types
export interface AppEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
  source: string;
}

// Staff events
export interface StaffEvent extends AppEvent {
  type:
    | 'staff.created'
    | 'staff.updated'
    | 'staff.deactivated'
    | 'staff.activated'
    | 'staff.availability.changed'
    | 'staff.assigned'
    | 'staff.unassigned';
}

// Project events
export interface ProjectEvent extends AppEvent {
  type:
    | 'project.created'
    | 'project.updated'
    | 'project.completed'
    | 'project.cancelled'
    | 'project.staffing.needed'
    | 'project.staff.added'
    | 'project.staff.removed';
}

// Task events
export interface TaskEvent extends AppEvent {
  type:
    | 'task.created'
    | 'task.assigned'
    | 'task.started'
    | 'task.completed'
    | 'task.flagged'
    | 'task.updated';
}

@Injectable({
  providedIn: 'root',
})
export class EventBusService {
  private eventSubject = new Subject<AppEvent>();
  private events$ = this.eventSubject.asObservable();

  // Emit events
  emit(event: AppEvent): void {
    this.eventSubject.next({
      ...event,
      timestamp: new Date(),
    });
  }

  // Subscribe to all events
  on(): Observable<AppEvent> {
    return this.events$;
  }

  // Subscribe to specific event types
  onType<T extends AppEvent>(eventType: string | string[]): Observable<T> {
    const types = Array.isArray(eventType) ? eventType : [eventType];
    return this.events$.pipe(filter((event) => types.includes(event.type))) as Observable<T>;
  }

  // Convenience methods for specific event types
  onStaffEvent(): Observable<StaffEvent> {
    return this.events$.pipe(
      filter((event) => event.type.startsWith('staff.')),
    ) as Observable<StaffEvent>;
  }

  onProjectEvent(): Observable<ProjectEvent> {
    return this.events$.pipe(
      filter((event) => event.type.startsWith('project.')),
    ) as Observable<ProjectEvent>;
  }

  onTaskEvent(): Observable<TaskEvent> {
    return this.events$.pipe(
      filter((event) => event.type.startsWith('task.')),
    ) as Observable<TaskEvent>;
  }

  // Helper methods to emit specific events
  emitStaffCreated(staff: StaffMember): void {
    this.emit({
      type: 'staff.created',
      payload: { staff },
      source: 'StaffModule',
      timestamp: new Date(),
    });
  }

  emitStaffUpdated(staffId: string, changes: Partial<StaffMember>): void {
    this.emit({
      type: 'staff.updated',
      payload: { staffId, changes },
      source: 'StaffModule',
      timestamp: new Date(),
    });
  }

  emitStaffDeactivated(staffId: string): void {
    this.emit({
      type: 'staff.deactivated',
      payload: { staffId },
      source: 'StaffModule',
      timestamp: new Date(),
    });
  }

  emitStaffAvailabilityChanged(
    staffId: string,
    availability: { available: boolean; fromDate?: Date; toDate?: Date },
  ): void {
    this.emit({
      type: 'staff.availability.changed',
      payload: { staffId, availability },
      source: 'StaffModule',
      timestamp: new Date(),
    });
  }

  emitProjectCreated(project: Project): void {
    this.emit({
      type: 'project.created',
      payload: { project },
      source: 'ProjectModule',
      timestamp: new Date(),
    });
  }

  emitProjectStaffingNeeded(
    projectId: string,
    requirements: { skillsRequired: string[]; count: number; priority: 'high' | 'medium' | 'low' },
  ): void {
    this.emit({
      type: 'project.staffing.needed',
      payload: { projectId, requirements },
      source: 'ProjectModule',
      timestamp: new Date(),
    });
  }

  emitTaskAssigned(taskId: string, staffId: string, projectId: string): void {
    this.emit({
      type: 'task.assigned',
      payload: { taskId, staffId, projectId },
      source: 'TaskModule',
      timestamp: new Date(),
    });
  }

  emitTaskCompleted(taskId: string, staffId: string): void {
    this.emit({
      type: 'task.completed',
      payload: { taskId, staffId },
      source: 'TaskModule',
      timestamp: new Date(),
    });
  }
}

// Usage example in a component or service:
/*
export class StaffService {
  constructor(private eventBus: EventBusService) {
    // Listen for project events that affect staff
    this.eventBus.onProjectEvent().subscribe(event => {
      switch(event.type) {
        case 'project.staffing.needed':
          this.notifyAvailableStaff(event.payload);
          break;
        case 'project.completed':
          this.updateStaffProjectCount(event.payload.staffIds);
          break;
      }
    });
  }

  updateStaffAvailability(staffId: string, status: string) {
    // Update in database
    // ...
    
    // Emit event for other modules
    this.eventBus.emitStaffAvailabilityChanged(staffId, { status });
  }
}
*/
