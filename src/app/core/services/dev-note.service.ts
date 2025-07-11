import { Injectable, inject } from '@angular/core';
import { DevNote, DevTask, PageError } from '../models/dev-note.model';
import { AuthService } from './auth.service';
import { Observable, map, of, switchMap, from } from 'rxjs';
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
  getDocs
} from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class DevNoteService {
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private collection: CollectionReference<DevNote>;

  constructor() {
    this.collection = collection(this.firestore, 'devNotes') as CollectionReference<DevNote>;
  }

  /**
   * Get or create a dev note for a specific route
   */
  getOrCreateForRoute(route: string, pageTitle: string): Observable<DevNote> {
    return this.getWithQuery([where('route', '==', route)]).pipe(
      switchMap((notes) => {
        if (notes.length > 0) {
          return of(notes[0]);
        }

        // Create new note for this route
        const newNote: DevNote = {
          route,
          pageTitle,
          notes: '',
          tasks: [],
          errors: [],
          createdAt: new Date(),
          createdBy: this.authService.currentUser()?.email || 'system',
          lastUpdated: new Date(),
          updatedBy: this.authService.currentUser()?.email || 'system',
        };

        return this.add(newNote);
      }),
    );
  }

  /**
   * Add a task to a specific route's dev note
   */
  async addTask(route: string, task: Omit<DevTask, 'id' | 'createdAt'>): Promise<void> {
    const note = await this.getOrCreateForRoute(route, route).toPromise();
    if (!note || !note.id) return;

    const newTask: DevTask = {
      ...task,
      id: this.generateId(),
      createdAt: new Date(),
    };

    const updatedTasks = [...(note.tasks || []), newTask];
    await this.update(note.id, {
      tasks: updatedTasks,
      lastUpdated: new Date(),
      updatedBy: this.authService.currentUser()?.email || 'system',
    });
  }

  /**
   * Update task status
   */
  async updateTaskStatus(route: string, taskId: string, status: DevTask['status']): Promise<void> {
    const note = await this.getOrCreateForRoute(route, route).toPromise();
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
      lastUpdated: new Date(),
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
    const note = await this.getOrCreateForRoute(route, route).toPromise();
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
      lastUpdated: new Date(),
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

  /**
   * Get all dev notes
   */
  getAll(): Observable<DevNote[]> {
    return from(getDocs(this.collection)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({ 
        ...doc.data(), 
        id: doc.id 
      })))
    );
  }

  /**
   * Get dev notes with query
   */
  getWithQuery(constraints: any[]): Observable<DevNote[]> {
    const q = query(this.collection, ...constraints);
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({ 
        ...doc.data(), 
        id: doc.id 
      })))
    );
  }

  /**
   * Add a new dev note
   */
  add(note: Omit<DevNote, 'id'>): Observable<DevNote> {
    return from(addDoc(this.collection, note as any)).pipe(
      map(docRef => ({ ...note, id: docRef.id } as DevNote))
    );
  }

  /**
   * Update a dev note
   */
  async update(id: string, data: Partial<DevNote>): Promise<void> {
    const docRef = doc(this.firestore, 'devNotes', id);
    await updateDoc(docRef, data as any);
  }

}
