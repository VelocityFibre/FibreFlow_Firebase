import { Injectable, inject } from '@angular/core';
import { DevNote, DevTask, PageError } from '../models/dev-note.model';
import { AuthService } from './auth.service';
import { Observable, map, of, switchMap, from, take } from 'rxjs';
import { 
  where, 
  orderBy, 
  Firestore, 
  collection, 
  CollectionReference,
  doc,
  updateDoc,
  addDoc,
  query,
  getDocs,
  Timestamp,
  collectionData,
  docData
} from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { BaseFirestoreService } from './base-firestore.service';
import { EntityType } from '../models/audit-log.model';

@Injectable({
  providedIn: 'root',
})
export class DevNoteService extends BaseFirestoreService<DevNote> {
  private authService = inject(AuthService);
  
  protected collectionName = 'devNotes';
  
  protected getEntityType(): EntityType {
    return 'devNote' as EntityType;
  }

  constructor() {
    super();
  }

  /**
   * Get or create a dev note for a specific route
   */
  getOrCreateForRoute(route: string, pageTitle: string): Observable<DevNote> {
    return this.getWithQuery([where('route', '==', route)]).pipe(
      take(1), // Take only the first emission to check if exists
      switchMap((notes) => {
        if (notes.length > 0) {
          // Return real-time observable for existing note
          return this.getById(notes[0].id!).pipe(
            map(note => note!)
          );
        }

        // Create new note for this route
        const newNote: Omit<DevNote, 'id'> = {
          route,
          pageTitle,
          notes: '',
          tasks: [],
          errors: [],
          createdAt: Timestamp.fromDate(new Date()),
          createdBy: this.authService.currentUser()?.email || 'system',
          lastUpdated: Timestamp.fromDate(new Date()),
          updatedBy: this.authService.currentUser()?.email || 'system',
        };

        // Create and return real-time observable
        return from(this.create(newNote)).pipe(
          switchMap(id => this.getById(id)),
          map(note => note!)
        );
      }),
    );
  }

  /**
   * Add a task to a specific route's dev note
   */
  async addTask(route: string, task: Omit<DevTask, 'id' | 'createdAt'>): Promise<void> {
    const note = await this.getOrCreateForRoute(route, route).pipe(take(1)).toPromise();
    if (!note || !note.id) return;

    const newTask: DevTask = {
      ...task,
      id: this.generateId(),
      createdAt: new Date(),
    };

    const updatedTasks = [...(note.tasks || []), newTask];
    await this.update(note.id, {
      tasks: updatedTasks,
      lastUpdated: Timestamp.fromDate(new Date()),
      updatedBy: this.authService.currentUser()?.email || 'system',
    });
  }

  /**
   * Update task status
   */
  async updateTaskStatus(route: string, taskId: string, status: DevTask['status']): Promise<void> {
    const note = await this.getOrCreateForRoute(route, route).pipe(take(1)).toPromise();
    if (!note || !note.id) return;

    const updatedTasks = note.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status,
            completedAt: status === 'done' ? new Date() : undefined,
          }
        : task,
    );

    await this.update(note.id, {
      tasks: updatedTasks,
      lastUpdated: Timestamp.fromDate(new Date()),
      updatedBy: this.authService.currentUser()?.email || 'system',
    });
  }

  /**
   * Log an error for a specific page
   */
  async logPageError(
    route: string,
    error: Omit<PageError, 'id' | 'timestamp' | 'resolved'>,
  ): Promise<void> {
    const note = await this.getOrCreateForRoute(route, route).pipe(take(1)).toPromise();
    if (!note || !note.id) return;

    const newError: PageError = {
      ...error,
      id: this.generateId(),
      timestamp: new Date(),
      resolved: false,
    };

    const updatedErrors = [...(note.errors || []), newError];
    await this.update(note.id, {
      errors: updatedErrors,
      lastUpdated: Timestamp.fromDate(new Date()),
      updatedBy: 'system',
    });
  }

  /**
   * Get all dev notes with pending tasks
   */
  getNotesWithPendingTasks(): Observable<DevNote[]> {
    return this.getAll().pipe(
      map((notes) => notes.filter((note) => note.tasks.some((task) => task.status !== 'done'))),
    );
  }

  /**
   * Get summary stats for admin dashboard
   */
  getDevStats(): Observable<{
    totalTasks: number;
    pendingTasks: number;
    unresolvedErrors: number;
    pagesWithNotes: number;
  }> {
    return this.getAll().pipe(
      map((notes) => {
        let totalTasks = 0;
        let pendingTasks = 0;
        let unresolvedErrors = 0;

        notes.forEach((note) => {
          totalTasks += note.tasks.length;
          pendingTasks += note.tasks.filter((t) => t.status !== 'done').length;
          unresolvedErrors += note.errors.filter((e) => !e.resolved).length;
        });

        return {
          totalTasks,
          pendingTasks,
          unresolvedErrors,
          pagesWithNotes: notes.length,
        };
      }),
    );
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Note: getAll(), getWithQuery(), create() and update() methods 
  // are inherited from BaseFirestoreService and provide real-time updates

}
