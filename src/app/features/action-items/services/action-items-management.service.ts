import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  QueryConstraint,
  collectionData,
  docData,
  serverTimestamp,
  writeBatch
} from '@angular/fire/firestore';
import { Observable, from, map, switchMap, combineLatest } from 'rxjs';
import { 
  ActionItemManagement, 
  ActionItemUpdates, 
  ActionItemStatus, 
  ActionItemHistory,
  ActionItemFilter,
  ActionItemStats 
} from '../models/action-item-management.model';
import { MeetingService } from '../../meetings/services/meeting.service';
import { Meeting, ActionItem } from '../../meetings/models/meeting.model';

@Injectable({
  providedIn: 'root'
})
export class ActionItemsManagementService {
  private firestore = inject(Firestore);
  private meetingService = inject(MeetingService);
  private collectionName = 'actionItemsManagement';

  /**
   * Create a managed action item from a meeting action item
   */
  async createFromMeetingActionItem(
    meeting: Meeting,
    actionItem: ActionItem,
    userId: string,
    userEmail: string
  ): Promise<string> {
    const managementItem: Omit<ActionItemManagement, 'id'> = {
      meetingId: meeting.id!,
      meetingTitle: meeting.title,
      meetingDate: meeting.dateTime,
      originalActionItem: actionItem,
      updates: {
        priority: actionItem.priority,
        assignee: actionItem.assignee,
        assigneeEmail: actionItem.assigneeEmail,
        dueDate: actionItem.dueDate,
        status: actionItem.completed ? ActionItemStatus.COMPLETED : ActionItemStatus.PENDING,
        notes: '',
        tags: []
      },
      status: actionItem.completed ? ActionItemStatus.COMPLETED : ActionItemStatus.PENDING,
      history: [{
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        userId,
        userEmail,
        action: 'created',
        notes: 'Action item imported from meeting'
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId,
      updatedBy: userId
    };

    const docRef = await addDoc(
      collection(this.firestore, this.collectionName), 
      managementItem
    );
    
    return docRef.id;
  }

  /**
   * Get all managed action items with optional filters
   */
  getActionItems(filter?: ActionItemFilter): Observable<ActionItemManagement[]> {
    const constraints: QueryConstraint[] = [
      orderBy('updatedAt', 'desc')
    ];

    if (filter?.status && filter.status.length > 0) {
      constraints.push(where('status', 'in', filter.status));
    }

    if (filter?.assignee) {
      constraints.push(where('updates.assignee', '==', filter.assignee));
    }

    if (filter?.meetingId) {
      constraints.push(where('meetingId', '==', filter.meetingId));
    }

    const q = query(collection(this.firestore, this.collectionName), ...constraints);
    
    return collectionData(q, { idField: 'id' }).pipe(
      map(items => {
        let filtered = items as ActionItemManagement[];
        
        // Client-side filtering for complex conditions
        if (filter?.priority && filter.priority.length > 0) {
          filtered = filtered.filter(item => 
            filter.priority!.includes(item.updates.priority || item.originalActionItem.priority)
          );
        }

        if (filter?.dueDateFrom) {
          filtered = filtered.filter(item => {
            const dueDate = item.updates.dueDate || item.originalActionItem.dueDate;
            return dueDate && new Date(dueDate) >= new Date(filter.dueDateFrom!);
          });
        }

        if (filter?.dueDateTo) {
          filtered = filtered.filter(item => {
            const dueDate = item.updates.dueDate || item.originalActionItem.dueDate;
            return dueDate && new Date(dueDate) <= new Date(filter.dueDateTo!);
          });
        }

        if (filter?.searchText) {
          const searchLower = filter.searchText.toLowerCase();
          filtered = filtered.filter(item => 
            item.originalActionItem.text.toLowerCase().includes(searchLower) ||
            item.updates.notes?.toLowerCase().includes(searchLower) ||
            item.updates.assignee?.toLowerCase().includes(searchLower) ||
            item.meetingTitle.toLowerCase().includes(searchLower)
          );
        }

        return filtered;
      })
    );
  }

  /**
   * Get a single action item by ID
   */
  getActionItemById(id: string): Observable<ActionItemManagement | undefined> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return docData(docRef, { idField: 'id' }) as Observable<ActionItemManagement | undefined>;
  }

  /**
   * Update an action item
   */
  async updateActionItem(
    id: string,
    updates: Partial<ActionItemUpdates>,
    userId: string,
    userEmail: string,
    notes?: string
  ): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    
    // Get current state for history
    const currentItem = await this.getActionItemById(id).toPromise();
    if (!currentItem) throw new Error('Action item not found');

    // Build history entry
    const historyEntry: ActionItemHistory = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      userId,
      userEmail,
      action: 'updated',
      notes
    };

    // Track specific changes
    if (updates.status && updates.status !== currentItem.status) {
      historyEntry.action = 'status_changed';
      historyEntry.field = 'status';
      historyEntry.oldValue = currentItem.status;
      historyEntry.newValue = updates.status;
    } else if (updates.assignee && updates.assignee !== currentItem.updates.assignee) {
      historyEntry.action = 'assigned';
      historyEntry.field = 'assignee';
      historyEntry.oldValue = currentItem.updates.assignee;
      historyEntry.newValue = updates.assignee;
    }

    // Update the document
    const updateData: any = {
      'updates': { ...currentItem.updates, ...updates },
      'status': updates.status || currentItem.status,
      'history': [...currentItem.history, historyEntry],
      'updatedAt': new Date().toISOString(),
      'updatedBy': userId
    };
    
    // Handle text update separately as it's in originalActionItem
    if ('text' in updates && updates.text !== undefined) {
      updateData['originalActionItem.text'] = updates.text;
      historyEntry.field = 'text';
      historyEntry.oldValue = currentItem.originalActionItem.text;
      historyEntry.newValue = updates.text;
    }
    
    await updateDoc(docRef, updateData);
  }

  /**
   * Bulk update action items
   */
  async bulkUpdateActionItems(
    ids: string[],
    updates: Partial<ActionItemUpdates>,
    userId: string,
    userEmail: string
  ): Promise<void> {
    const batch = writeBatch(this.firestore);
    
    for (const id of ids) {
      const docRef = doc(this.firestore, this.collectionName, id);
      const historyEntry: ActionItemHistory = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        userId,
        userEmail,
        action: 'updated',
        notes: 'Bulk update'
      };

      batch.update(docRef, {
        'updates': updates,
        'status': updates.status,
        'history': [...(await this.getActionItemById(id).toPromise())!.history, historyEntry],
        'updatedAt': new Date().toISOString(),
        'updatedBy': userId
      });
    }

    await batch.commit();
  }

  /**
   * Get statistics for action items
   */
  getActionItemStats(): Observable<ActionItemStats> {
    return this.getActionItems().pipe(
      map(items => {
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const stats: ActionItemStats = {
          total: items.length,
          pending: 0,
          inProgress: 0,
          completed: 0,
          overdue: 0,
          dueToday: 0,
          dueThisWeek: 0,
          byPriority: { high: 0, medium: 0, low: 0 },
          byAssignee: {}
        };

        items.forEach(item => {
          // Status counts
          switch (item.status) {
            case ActionItemStatus.PENDING:
              stats.pending++;
              break;
            case ActionItemStatus.IN_PROGRESS:
              stats.inProgress++;
              break;
            case ActionItemStatus.COMPLETED:
              stats.completed++;
              break;
          }

          // Due date analysis
          const dueDate = item.updates.dueDate || item.originalActionItem.dueDate;
          if (dueDate && item.status !== ActionItemStatus.COMPLETED) {
            const due = new Date(dueDate);
            if (due < now) {
              stats.overdue++;
            } else if (due.toDateString() === now.toDateString()) {
              stats.dueToday++;
            } else if (due <= weekFromNow) {
              stats.dueThisWeek++;
            }
          }

          // Priority counts
          const priority = item.updates.priority || item.originalActionItem.priority;
          stats.byPriority[priority]++;

          // Assignee counts
          const assignee = item.updates.assignee || item.originalActionItem.assignee || 'Unassigned';
          stats.byAssignee[assignee] = (stats.byAssignee[assignee] || 0) + 1;
        });

        return stats;
      })
    );
  }

  /**
   * Import all action items from meetings that haven't been imported yet
   */
  async importUnmanagedActionItems(userId: string, userEmail: string): Promise<number> {
    const meetings = await this.meetingService.getMeetingsWithPendingActions().toPromise();
    const existingItems = await this.getActionItems().toPromise();
    
    const existingMap = new Map(
      (existingItems || []).map(item => [
        `${item.meetingId}-${item.originalActionItem.text}`,
        item
      ])
    );

    let importCount = 0;

    for (const meeting of meetings || []) {
      for (const actionItem of meeting.actionItems || []) {
        const key = `${meeting.id}-${actionItem.text}`;
        if (!existingMap.has(key)) {
          await this.createFromMeetingActionItem(meeting, actionItem, userId, userEmail);
          importCount++;
        }
      }
    }

    return importCount;
  }

  /**
   * Delete an action item
   */
  async deleteActionItem(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    await deleteDoc(docRef);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}