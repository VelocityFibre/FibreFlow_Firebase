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
import { Meeting, ActionItem } from '../models/meeting.model';

@Injectable({
  providedIn: 'root',
})
export class MeetingService {
  private firestore = inject(Firestore);
  private meetingsCollection = collection(this.firestore, 'meetings');

  getMeetings(constraints: QueryConstraint[] = []): Observable<Meeting[]> {
    const q = query(this.meetingsCollection, orderBy('dateTime', 'desc'), ...constraints);
    return collectionData(q, { idField: 'id' }).pipe(
      map((meetings) => meetings.map((m) => this.convertFromFirestore(m))),
    );
  }

  getAll(): Observable<Meeting[]> {
    return this.getMeetings();
  }

  getById(id: string): Observable<Meeting> {
    return this.getMeetingById(id).pipe(
      map((meeting) => {
        if (!meeting) throw new Error('Meeting not found');
        return meeting;
      }),
    );
  }

  getMeetingById(id: string): Observable<Meeting | undefined> {
    const meetingDoc = doc(this.firestore, 'meetings', id);
    return docData(meetingDoc, { idField: 'id' }).pipe(
      map((meeting) => (meeting ? this.convertFromFirestore(meeting) : undefined)),
    );
  }

  getMeetingsByProject(projectId: string): Observable<Meeting[]> {
    return this.getMeetings([where('projectId', '==', projectId)]);
  }

  getMeetingsByParticipant(email: string): Observable<Meeting[]> {
    return this.getMeetings([where('participants', 'array-contains', { email, isSpeaker: true })]);
  }

  getRecentMeetings(days: number = 7): Observable<Meeting[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return this.getMeetings([where('dateTime', '>=', startDate.toISOString()), limit(50)]);
  }

  getMeetingsWithPendingActions(): Observable<Meeting[]> {
    return this.getMeetings([where('actionItems', '!=', [])]).pipe(
      map((meetings) =>
        meetings.filter((m) =>
          m.actionItems?.some(
            (a) => !a.completed && !a.convertedToTaskId && !a.convertedToPersonalTodoId,
          ),
        ),
      ),
    );
  }

  async createMeeting(meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const meetingData = {
      ...meeting,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      dateTime: meeting.dateTime || now.toISOString(),
      processedAt: meeting.processedAt || null,
    };
    const docRef = await addDoc(this.meetingsCollection, meetingData);
    return docRef.id;
  }

  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<void> {
    const meetingDoc = doc(this.firestore, 'meetings', id);
    const updateData: any = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(meetingDoc, updateData);
  }

  async updateActionItem(
    meetingId: string,
    actionItemIndex: number,
    updates: Partial<ActionItem>,
  ): Promise<void> {
    const meeting = await this.getMeetingById(meetingId).toPromise();
    if (!meeting) throw new Error('Meeting not found');

    const actionItems =
      meeting.actionItems?.map((item, index) =>
        index === actionItemIndex ? { ...item, ...updates } : item,
      ) || [];

    await this.updateMeeting(meetingId, { actionItems });
  }

  async convertActionItemToTask(
    meetingId: string,
    actionItemIndex: number,
    taskId: string,
  ): Promise<void> {
    await this.updateActionItem(meetingId, actionItemIndex, {
      convertedToTaskId: taskId,
      completed: true,
      completedAt: new Date().toISOString(),
    });
  }

  async convertActionItemToPersonalTodo(
    meetingId: string,
    actionItemIndex: number,
    todoId: string,
  ): Promise<void> {
    await this.updateActionItem(meetingId, actionItemIndex, {
      convertedToPersonalTodoId: todoId,
    });
  }

  async deleteMeeting(id: string): Promise<void> {
    const meetingDoc = doc(this.firestore, 'meetings', id);
    await deleteDoc(meetingDoc);
  }

  private convertFromFirestore(data: any): Meeting {
    return {
      ...data,
      dateTime: data.dateTime || data.date?.toDate()?.toISOString() || new Date().toISOString(),
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString()
        : data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt || new Date().toISOString(),
      processedAt: data.processedAt?.toDate
        ? data.processedAt.toDate().toISOString()
        : data.processedAt,
      actionItems:
        data.actionItems?.map((item: any) => ({
          ...item,
          dueDate: item.dueDate?.toDate ? item.dueDate.toDate().toISOString() : item.dueDate,
          completedAt: item.completedAt?.toDate
            ? item.completedAt.toDate().toISOString()
            : item.completedAt,
        })) || [],
    };
  }
}
