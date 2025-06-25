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
import { Observable, from, map, combineLatest } from 'rxjs';
import { PersonalTodo, TodoFilter, TodoStats, TodoStatus, TodoPriority, TodoSource } from '../models/personal-todo.model';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class PersonalTodoService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private todosCollection = collection(this.firestore, 'personalTodos');

  getTodos(filter: TodoFilter = {}): Observable<PersonalTodo[]> {
    const constraints: QueryConstraint[] = [];
    
    // Default to current user if not specified
    const userId = filter.userId || this.authService.currentUser()?.uid;
    if (userId) {
      constraints.push(where('userId', '==', userId));
    }

    if (filter.status?.length) {
      constraints.push(where('status', 'in', filter.status));
    }

    if (filter.priority?.length) {
      constraints.push(where('priority', 'in', filter.priority));
    }

    if (filter.source?.length) {
      constraints.push(where('source', 'in', filter.source));
    }

    constraints.push(orderBy('dueDate', 'asc'), orderBy('createdAt', 'desc'));

    const q = query(this.todosCollection, ...constraints);
    return collectionData(q, { idField: 'id' }).pipe(
      map((todos) => todos.map((t) => this.convertFromFirestore(t))),
      map((todos) => this.applyClientSideFilters(todos, filter))
    );
  }

  getTodoById(id: string): Observable<PersonalTodo | undefined> {
    const todoDoc = doc(this.firestore, 'personalTodos', id);
    return docData(todoDoc, { idField: 'id' }).pipe(
      map((todo) => todo ? this.convertFromFirestore(todo) : undefined)
    );
  }

  getMyTodos(): Observable<PersonalTodo[]> {
    return this.getTodos({ userId: this.authService.currentUser()?.uid });
  }

  getTodosByMeeting(meetingId: string): Observable<PersonalTodo[]> {
    return this.getTodos({ userId: this.authService.currentUser()?.uid }).pipe(
      map(todos => todos.filter(t => t.meetingId === meetingId))
    );
  }

  getOverdueTodos(): Observable<PersonalTodo[]> {
    const now = new Date();
    return this.getTodos({
      userId: this.authService.currentUser()?.uid,
      status: [TodoStatus.PENDING, TodoStatus.IN_PROGRESS]
    }).pipe(
      map(todos => todos.filter(t => t.dueDate && t.dueDate < now))
    );
  }

  getTodosDueToday(): Observable<PersonalTodo[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getTodos({
      userId: this.authService.currentUser()?.uid,
      status: [TodoStatus.PENDING, TodoStatus.IN_PROGRESS]
    }).pipe(
      map(todos => todos.filter(t => 
        t.dueDate && t.dueDate >= today && t.dueDate < tomorrow
      ))
    );
  }

  getTodoStats(): Observable<TodoStats> {
    return this.getMyTodos().pipe(
      map(todos => this.calculateStats(todos))
    );
  }

  async createTodo(todo: Omit<PersonalTodo, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const todoData = {
      ...todo,
      userId: todo.userId || this.authService.currentUser()?.uid,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      dueDate: todo.dueDate ? Timestamp.fromDate(todo.dueDate as Date) : null,
      completedAt: todo.completedAt ? Timestamp.fromDate(todo.completedAt as Date) : null,
      reminder: todo.reminder ? {
        ...todo.reminder,
        date: Timestamp.fromDate(todo.reminder.date as Date),
        sentAt: todo.reminder.sentAt ? Timestamp.fromDate(todo.reminder.sentAt as Date) : null
      } : null
    };
    const docRef = await addDoc(this.todosCollection, todoData);
    return docRef.id;
  }

  async updateTodo(id: string, updates: Partial<PersonalTodo>): Promise<void> {
    const todoDoc = doc(this.firestore, 'personalTodos', id);
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    };
    
    if (updates.dueDate) {
      updateData.dueDate = Timestamp.fromDate(updates.dueDate as Date);
    }
    if (updates.completedAt) {
      updateData.completedAt = Timestamp.fromDate(updates.completedAt as Date);
    }
    if (updates.reminder?.date) {
      updateData.reminder = {
        ...updates.reminder,
        date: Timestamp.fromDate(updates.reminder.date as Date),
        sentAt: updates.reminder.sentAt ? Timestamp.fromDate(updates.reminder.sentAt as Date) : null
      };
    }
    
    await updateDoc(todoDoc, updateData);
  }

  async completeTodo(id: string): Promise<void> {
    await this.updateTodo(id, {
      status: TodoStatus.COMPLETED,
      completed: true,
      completedAt: new Date()
    });
  }

  async deleteTodo(id: string): Promise<void> {
    const todoDoc = doc(this.firestore, 'personalTodos', id);
    await deleteDoc(todoDoc);
  }

  async createFromMeetingActionItem(
    actionItem: any,
    meetingId: string,
    meetingTitle: string,
    userId: string
  ): Promise<string> {
    const todo: Omit<PersonalTodo, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      text: actionItem.text,
      description: actionItem.context,
      source: TodoSource.MEETING,
      meetingId,
      meetingTitle,
      dueDate: actionItem.dueDate,
      priority: actionItem.priority || TodoPriority.MEDIUM,
      status: TodoStatus.PENDING,
      completed: false,
      assignedBy: actionItem.speakerName,
    };
    return this.createTodo(todo);
  }

  private convertFromFirestore(data: any): PersonalTodo {
    return {
      ...data,
      dueDate: data.dueDate?.toDate(),
      completedAt: data.completedAt?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      reminder: data.reminder ? {
        ...data.reminder,
        date: data.reminder.date?.toDate(),
        sentAt: data.reminder.sentAt?.toDate()
      } : undefined
    };
  }

  private applyClientSideFilters(todos: PersonalTodo[], filter: TodoFilter): PersonalTodo[] {
    let filtered = [...todos];

    if (filter.dueDate?.from) {
      filtered = filtered.filter(t => t.dueDate && t.dueDate >= filter.dueDate!.from!);
    }
    if (filter.dueDate?.to) {
      filtered = filtered.filter(t => t.dueDate && t.dueDate <= filter.dueDate!.to!);
    }

    if (filter.category?.length) {
      filtered = filtered.filter(t => t.category && filter.category!.includes(t.category));
    }

    if (filter.tags?.length) {
      filtered = filtered.filter(t => 
        t.tags && filter.tags!.some(tag => t.tags!.includes(tag))
      );
    }

    if (filter.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.text.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search) ||
        t.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }

    return filtered;
  }

  private calculateStats(todos: PersonalTodo[]): TodoStats {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return {
      total: todos.length,
      pending: todos.filter(t => t.status === TodoStatus.PENDING).length,
      inProgress: todos.filter(t => t.status === TodoStatus.IN_PROGRESS).length,
      completed: todos.filter(t => t.status === TodoStatus.COMPLETED).length,
      overdue: todos.filter(t => 
        t.dueDate && t.dueDate < now && !t.completed
      ).length,
      dueToday: todos.filter(t => 
        t.dueDate && t.dueDate >= todayStart && t.dueDate < todayEnd && !t.completed
      ).length,
      dueThisWeek: todos.filter(t => 
        t.dueDate && t.dueDate >= todayStart && t.dueDate < weekEnd && !t.completed
      ).length,
      byPriority: {
        high: todos.filter(t => t.priority === TodoPriority.HIGH).length,
        medium: todos.filter(t => t.priority === TodoPriority.MEDIUM).length,
        low: todos.filter(t => t.priority === TodoPriority.LOW).length,
      },
      bySource: {
        meeting: todos.filter(t => t.source === TodoSource.MEETING).length,
        manual: todos.filter(t => t.source === TodoSource.MANUAL).length,
        email: todos.filter(t => t.source === TodoSource.EMAIL).length,
        projectTask: todos.filter(t => t.source === TodoSource.PROJECT_TASK).length,
      }
    };
  }
}