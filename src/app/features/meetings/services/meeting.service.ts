import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { Meeting, MeetingStatus, ActionItem } from '../models/meeting.model';

@Injectable({
  providedIn: 'root',
})
export class MeetingService {
  private firestore = inject(Firestore);
  private meetingsCollection = collection(this.firestore, 'meetings');

  getMeetings(constraints: QueryConstraint[] = []): Observable<Meeting[]> {
    const q = query(
      this.meetingsCollection,
      orderBy('date', 'desc'),
      ...constraints
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map((meetings) => meetings.map((m) => this.convertFromFirestore(m)))
    );
  }

  getMeetingById(id: string): Observable<Meeting | undefined> {
    const meetingDoc = doc(this.firestore, 'meetings', id);
    return docData(meetingDoc, { idField: 'id' }).pipe(
      map((meeting) => meeting ? this.convertFromFirestore(meeting) : undefined)
    );
  }

  getMeetingsByProject(projectId: string): Observable<Meeting[]> {
    return this.getMeetings([where('projectId', '==', projectId)]);
  }

  getMeetingsByParticipant(email: string): Observable<Meeting[]> {
    return this.getMeetings([
      where('participants', 'array-contains', { email, isSpeaker: true })
    ]);
  }

  getRecentMeetings(days: number = 7): Observable<Meeting[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return this.getMeetings([
      where('date', '>=', Timestamp.fromDate(startDate)),
      limit(50)
    ]);
  }

  getMeetingsWithPendingActions(): Observable<Meeting[]> {
    return this.getMeetings([
      where('actionItems', '!=', []),
      where('status', '==', MeetingStatus.PROCESSED)
    ]).pipe(
      map(meetings => meetings.filter(m => 
        m.actionItems.some(a => !a.completed && !a.convertedToTaskId && !a.convertedToPersonalTodoId)
      ))
    );
  }

  async createMeeting(meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const meetingData = {
      ...meeting,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      date: Timestamp.fromDate(meeting.date as Date),
      processedAt: meeting.processedAt ? Timestamp.fromDate(meeting.processedAt as Date) : null,
    };
    const docRef = await addDoc(this.meetingsCollection, meetingData);
    return docRef.id;
  }

  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<void> {
    const meetingDoc = doc(this.firestore, 'meetings', id);
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    };
    
    if (updates.date) {
      updateData.date = Timestamp.fromDate(updates.date as Date);
    }
    if (updates.processedAt) {
      updateData.processedAt = Timestamp.fromDate(updates.processedAt as Date);
    }
    
    await updateDoc(meetingDoc, updateData);
  }

  async updateActionItem(meetingId: string, actionItemId: string, updates: Partial<ActionItem>): Promise<void> {
    const meeting = await this.getMeetingById(meetingId).toPromise();
    if (!meeting) throw new Error('Meeting not found');

    const actionItems = meeting.actionItems.map(item =>
      item.id === actionItemId ? { ...item, ...updates } : item
    );

    await this.updateMeeting(meetingId, { actionItems });
  }

  async convertActionItemToTask(meetingId: string, actionItemId: string, taskId: string): Promise<void> {
    await this.updateActionItem(meetingId, actionItemId, {
      convertedToTaskId: taskId,
      completed: true,
      completedAt: new Date()
    });
  }

  async convertActionItemToPersonalTodo(meetingId: string, actionItemId: string, todoId: string): Promise<void> {
    await this.updateActionItem(meetingId, actionItemId, {
      convertedToPersonalTodoId: todoId
    });
  }

  async deleteMeeting(id: string): Promise<void> {
    const meetingDoc = doc(this.firestore, 'meetings', id);
    await deleteDoc(meetingDoc);
  }

  private convertFromFirestore(data: any): Meeting {
    return {
      ...data,
      date: data.date?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      processedAt: data.processedAt?.toDate(),
      actionItems: data.actionItems?.map((item: any) => ({
        ...item,
        dueDate: item.dueDate?.toDate(),
        completedAt: item.completedAt?.toDate(),
      })) || [],
    };
  }
}