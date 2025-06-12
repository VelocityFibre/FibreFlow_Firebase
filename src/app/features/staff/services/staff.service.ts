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
  serverTimestamp,
  DocumentReference,
  CollectionReference
} from '@angular/fire/firestore';
import { Observable, from, map, catchError, throwError } from 'rxjs';
import { StaffMember, StaffFilter, StaffGroup, AvailabilityStatus } from '../models';

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private firestore = inject(Firestore);
  private staffCollection = collection(this.firestore, 'staff') as CollectionReference<StaffMember>;

  getStaff(filter?: StaffFilter): Observable<StaffMember[]> {
    const constraints: QueryConstraint[] = [];

    if (filter) {
      if (filter.groups && filter.groups.length > 0) {
        constraints.push(where('primaryGroup', 'in', filter.groups));
      }
      if (filter.isActive !== undefined) {
        constraints.push(where('isActive', '==', filter.isActive));
      }
      if (filter.availabilityStatus && filter.availabilityStatus.length > 0) {
        constraints.push(where('availability.status', 'in', filter.availabilityStatus));
      }
    }

    constraints.push(orderBy('name'));

    const q = query(this.staffCollection, ...constraints);
    
    return collectionData(q, { idField: 'id' }).pipe(
      map(staff => {
        if (filter?.searchTerm) {
          const term = filter.searchTerm.toLowerCase();
          return staff.filter(s => 
            s.name.toLowerCase().includes(term) ||
            s.email.toLowerCase().includes(term) ||
            s.employeeId.toLowerCase().includes(term)
          );
        }
        return staff;
      }),
      catchError(error => {
        console.error('Error fetching staff:', error);
        return throwError(() => new Error('Failed to fetch staff members'));
      })
    );
  }

  getStaffById(id: string): Observable<StaffMember | undefined> {
    const staffDoc = doc(this.staffCollection, id);
    return docData(staffDoc, { idField: 'id' }).pipe(
      catchError(error => {
        console.error('Error fetching staff member:', error);
        return throwError(() => new Error('Failed to fetch staff member'));
      })
    );
  }

  getStaffByGroup(group: StaffGroup): Observable<StaffMember[]> {
    const q = query(
      this.staffCollection,
      where('primaryGroup', '==', group),
      where('isActive', '==', true),
      orderBy('name')
    );
    
    return collectionData(q, { idField: 'id' }).pipe(
      catchError(error => {
        console.error('Error fetching staff by group:', error);
        return throwError(() => new Error('Failed to fetch staff by group'));
      })
    );
  }

  getAvailableStaff(requiredSkills?: string[]): Observable<StaffMember[]> {
    const q = query(
      this.staffCollection,
      where('isActive', '==', true),
      where('availability.status', 'in', ['available', 'busy']),
      orderBy('availability.currentTaskCount')
    );
    
    return collectionData(q, { idField: 'id' }).pipe(
      map(staff => {
        // Filter by available task capacity
        let filtered = staff.filter(s => 
          s.availability.currentTaskCount < s.availability.maxConcurrentTasks
        );

        // Filter by required skills if provided
        if (requiredSkills && requiredSkills.length > 0) {
          filtered = filtered.filter(s => 
            s.skills && requiredSkills.some(skill => s.skills!.includes(skill))
          );
        }

        return filtered;
      }),
      catchError(error => {
        console.error('Error fetching available staff:', error);
        return throwError(() => new Error('Failed to fetch available staff'));
      })
    );
  }

  createStaff(staffData: Omit<StaffMember, 'id' | 'createdAt' | 'updatedAt'>): Observable<DocumentReference> {
    const newStaff = {
      ...staffData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      activity: {
        lastLogin: null,
        lastActive: null,
        tasksCompleted: 0,
        tasksInProgress: 0,
        tasksFlagged: 0,
        totalProjectsWorked: 0,
        averageTaskCompletionTime: 0
      }
    };

    return from(addDoc(this.staffCollection, newStaff as any)).pipe(
      catchError(error => {
        console.error('Error creating staff member:', error);
        return throwError(() => new Error('Failed to create staff member'));
      })
    );
  }

  updateStaff(id: string, updates: Partial<StaffMember>): Observable<void> {
    const staffDoc = doc(this.staffCollection, id);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    return from(updateDoc(staffDoc, updateData)).pipe(
      catchError(error => {
        console.error('Error updating staff member:', error);
        return throwError(() => new Error('Failed to update staff member'));
      })
    );
  }

  updateStaffAvailability(id: string, status: AvailabilityStatus): Observable<void> {
    const staffDoc = doc(this.staffCollection, id);
    const updateData = {
      'availability.status': status,
      'activity.lastActive': serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    return from(updateDoc(staffDoc, updateData)).pipe(
      catchError(error => {
        console.error('Error updating staff availability:', error);
        return throwError(() => new Error('Failed to update staff availability'));
      })
    );
  }

  incrementTaskCount(id: string, increment: number): Observable<void> {
    const staffDoc = doc(this.staffCollection, id);
    const updateData = {
      'availability.currentTaskCount': increment,
      updatedAt: serverTimestamp()
    };

    return from(updateDoc(staffDoc, updateData)).pipe(
      catchError(error => {
        console.error('Error updating task count:', error);
        return throwError(() => new Error('Failed to update task count'));
      })
    );
  }

  deleteStaff(id: string): Observable<void> {
    const staffDoc = doc(this.staffCollection, id);
    return from(deleteDoc(staffDoc)).pipe(
      catchError(error => {
        console.error('Error deleting staff member:', error);
        return throwError(() => new Error('Failed to delete staff member'));
      })
    );
  }

  deactivateStaff(id: string): Observable<void> {
    return this.updateStaff(id, { isActive: false });
  }

  reactivateStaff(id: string): Observable<void> {
    return this.updateStaff(id, { isActive: true });
  }
}