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
  QueryConstraint,
  serverTimestamp,
  DocumentReference,
  CollectionReference,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, from, map, catchError, throwError, shareReplay, startWith } from 'rxjs';
import { StaffMember, StaffFilter, StaffGroup, AvailabilityStatus } from '../models';

@Injectable({
  providedIn: 'root',
})
export class StaffService {
  private firestore = inject(Firestore);
  private staffCollection = collection(this.firestore, 'staff') as CollectionReference<StaffMember>;

  // Cache for staff list
  private staffCache$?: Observable<StaffMember[]>;

  getStaff(filter?: StaffFilter): Observable<StaffMember[]> {
    console.log('Fetching staff with filter:', filter);
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

    // If no filter, use cached version
    if (
      !filter ||
      (!filter.groups &&
        filter.isActive === undefined &&
        !filter.availabilityStatus &&
        !filter.searchTerm)
    ) {
      if (!this.staffCache$) {
        this.staffCache$ = collectionData(q, { idField: 'id' }).pipe(
          map((staff) => {
            console.log('Loaded staff members:', staff.length, 'members');
            console.log(
              'Staff IDs:',
              staff.map((s) => ({ id: s.id, name: s.name, employeeId: s.employeeId })),
            );
            return staff;
          }),
          shareReplay(1),
          catchError((error) => {
            console.error('Error fetching staff:', error);
            this.staffCache$ = undefined; // Clear cache on error
            return throwError(() => new Error('Failed to fetch staff members'));
          }),
        );
      }
      return this.staffCache$;
    }

    // For filtered queries, don't cache
    return collectionData(q, { idField: 'id' }).pipe(
      map((staff) => {
        console.log('Loaded filtered staff members:', staff.length, 'members');
        if (filter?.searchTerm) {
          const term = filter.searchTerm.toLowerCase();
          const filtered = staff.filter(
            (s) =>
              s.name.toLowerCase().includes(term) ||
              s.email.toLowerCase().includes(term) ||
              s.employeeId.toLowerCase().includes(term),
          );
          console.log('After search filter:', filtered.length, 'members');
          return filtered;
        }
        return staff;
      }),
      startWith([]), // Return empty array while loading
      catchError((error) => {
        console.error('Error fetching staff:', error);
        return throwError(() => new Error('Failed to fetch staff members'));
      }),
    );
  }

  clearCache() {
    this.staffCache$ = undefined;
  }

  getStaffById(id: string): Observable<StaffMember | undefined> {
    console.log('Fetching staff member by ID:', id);
    const staffDoc = doc(this.staffCollection, id);
    return docData(staffDoc, { idField: 'id' }).pipe(
      map((staff) => {
        console.log(
          'Staff member fetched:',
          staff ? { id: staff.id, name: staff.name, employeeId: staff.employeeId } : 'Not found',
        );
        return staff;
      }),
      catchError((error) => {
        console.error('Error fetching staff member:', error);
        console.error('Staff ID that failed:', id);
        return throwError(() => new Error('Failed to fetch staff member'));
      }),
    );
  }

  getStaffByGroup(group: StaffGroup): Observable<StaffMember[]> {
    const q = query(
      this.staffCollection,
      where('primaryGroup', '==', group),
      where('isActive', '==', true),
      orderBy('name'),
    );

    return collectionData(q, { idField: 'id' }).pipe(
      catchError((error) => {
        console.error('Error fetching staff by group:', error);
        return throwError(() => new Error('Failed to fetch staff by group'));
      }),
    );
  }

  getAvailableStaff(requiredSkills?: string[]): Observable<StaffMember[]> {
    const q = query(
      this.staffCollection,
      where('isActive', '==', true),
      where('availability.status', 'in', ['available', 'busy']),
      orderBy('availability.currentTaskCount'),
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((staff) => {
        // Filter by available task capacity
        let filtered = staff.filter(
          (s) => s.availability.currentTaskCount < s.availability.maxConcurrentTasks,
        );

        // Filter by required skills if provided
        if (requiredSkills && requiredSkills.length > 0) {
          filtered = filtered.filter(
            (s) => s.skills && requiredSkills.some((skill) => s.skills!.includes(skill)),
          );
        }

        return filtered;
      }),
      catchError((error) => {
        console.error('Error fetching available staff:', error);
        return throwError(() => new Error('Failed to fetch available staff'));
      }),
    );
  }

  createStaff(
    staffData: Omit<StaffMember, 'id' | 'createdAt' | 'updatedAt'>,
  ): Observable<DocumentReference> {
    console.log('Creating staff member with data:', staffData);

    const newStaff: Omit<StaffMember, 'id'> = {
      ...staffData,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      activity: {
        lastLogin: null,
        lastActive: null,
        tasksCompleted: 0,
        tasksInProgress: 0,
        tasksFlagged: 0,
        totalProjectsWorked: 0,
        averageTaskCompletionTime: 0,
      },
    };

    console.log('Final staff data to be saved:', newStaff);

    return from(addDoc(this.staffCollection, newStaff)).pipe(
      map((result) => {
        console.log('Staff member created successfully with ID:', result.id);
        this.clearCache(); // Clear cache after successful creation
        return result;
      }),
      catchError((error) => {
        console.error('Error creating staff member:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return throwError(() => new Error('Failed to create staff member'));
      }),
    );
  }

  updateStaff(id: string, updates: Partial<StaffMember>): Observable<void> {
    const staffDoc = doc(this.staffCollection, id);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    return from(updateDoc(staffDoc, updateData)).pipe(
      map(() => {
        this.clearCache(); // Clear cache after successful update
      }),
      catchError((error) => {
        console.error('Error updating staff member:', error);
        return throwError(() => new Error('Failed to update staff member'));
      }),
    );
  }

  updateStaffAvailability(id: string, status: AvailabilityStatus): Observable<void> {
    const staffDoc = doc(this.staffCollection, id);
    const updateData = {
      'availability.status': status,
      'activity.lastActive': serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return from(updateDoc(staffDoc, updateData)).pipe(
      catchError((error) => {
        console.error('Error updating staff availability:', error);
        return throwError(() => new Error('Failed to update staff availability'));
      }),
    );
  }

  incrementTaskCount(id: string, increment: number): Observable<void> {
    const staffDoc = doc(this.staffCollection, id);
    const updateData = {
      'availability.currentTaskCount': increment,
      updatedAt: serverTimestamp(),
    };

    return from(updateDoc(staffDoc, updateData)).pipe(
      catchError((error) => {
        console.error('Error updating task count:', error);
        return throwError(() => new Error('Failed to update task count'));
      }),
    );
  }

  deleteStaff(id: string): Observable<void> {
    const staffDoc = doc(this.staffCollection, id);
    return from(deleteDoc(staffDoc)).pipe(
      catchError((error) => {
        console.error('Error deleting staff member:', error);
        return throwError(() => new Error('Failed to delete staff member'));
      }),
    );
  }

  deactivateStaff(id: string): Observable<void> {
    return this.updateStaff(id, { isActive: false });
  }

  reactivateStaff(id: string): Observable<void> {
    return this.updateStaff(id, { isActive: true });
  }
}
