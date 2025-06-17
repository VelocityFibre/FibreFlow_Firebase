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
  serverTimestamp,
  writeBatch,
  // DocumentReference,
  Query,
  // Timestamp,
  // collectionGroup,
} from '@angular/fire/firestore';
import { Observable, from, map, of, switchMap, firstValueFrom } from 'rxjs';
import { Task, TaskStatus, TaskPriority } from '../models/task.model';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';
import { StaffService } from '../../features/staff/services/staff.service';
import { DEFAULT_TASK_TEMPLATES, PHASE_NAME_MAPPING } from '../models/task-templates.model';
import { Phase } from '../models/phase.model';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private staffService = inject(StaffService);
  private tasksCollection = collection(this.firestore, 'tasks');

  getAllTasks(): Observable<Task[]> {
    const q = query(this.tasksCollection, orderBy('dueDate', 'asc'));

    return (collectionData(q, { idField: 'id' }) as Observable<Task[]>).pipe(
      switchMap((tasks: Task[]) => {
        if (tasks.length === 0) return of([]);

        // Get unique project IDs
        const projectIds = [...new Set(tasks.map((t) => t.projectId))];

        // Fetch project details
        return from(
          Promise.all(
            projectIds.map((id) => firstValueFrom(this.projectService.getProjectById(id))),
          ),
        ).pipe(
          map((projects) => {
            const projectMap = new Map(projects.filter((p) => p).map((p) => [p!.id!, p!]));

            // Enhance tasks with project information
            return tasks.map((task) => ({
              ...task,
              projectName: projectMap.get(task.projectId)?.name,
              projectCode: projectMap.get(task.projectId)?.projectCode,
              clientName: projectMap.get(task.projectId)?.clientName,
            }));
          }),
        );
      }),
    ) as Observable<Task[]>;
  }

  getTasksByProject(projectId: string): Observable<Task[]> {
    const q = query(
      this.tasksCollection,
      where('projectId', '==', projectId),
      orderBy('phaseId', 'asc'),
      orderBy('orderNo', 'asc'),
    );

    return (collectionData(q, { idField: 'id' }) as Observable<Task[]>).pipe(
      switchMap((tasks) => {
        if (tasks.length === 0) return of([]);

        // Get unique user IDs for assigned tasks
        const userIds = [...new Set(tasks.filter((t) => t.assignedTo).map((t) => t.assignedTo!))];

        if (userIds.length === 0) return of(tasks);

        // Fetch user details
        return from(
          Promise.all(userIds.map((id) => firstValueFrom(this.staffService.getStaffById(id)))),
        ).pipe(
          map((staffMembers) => {
            const staffMap = new Map(staffMembers.filter((s) => s).map((s) => [s!.id!, s!]));

            return tasks.map((task) => ({
              ...task,
              assignedToName: task.assignedTo ? staffMap.get(task.assignedTo)?.name : undefined,
            }));
          }),
        );
      }),
    );
  }

  getTasksByPhase(phaseId: string): Observable<Task[]> {
    const q = query(
      this.tasksCollection,
      where('phaseId', '==', phaseId),
      orderBy('orderNo', 'asc'),
    );

    return collectionData(q, { idField: 'id' }) as Observable<Task[]>;
  }

  // Alias for getTasksByPhase for consistency with other services
  getByPhase(phaseId: string): Observable<Task[]> {
    return this.getTasksByPhase(phaseId);
  }

  getTasksByAssignee(userId: string): Observable<Task[]> {
    const q = query(
      this.tasksCollection,
      where('assignedTo', '==', userId),
      orderBy('dueDate', 'asc'),
    );

    return (collectionData(q, { idField: 'id' }) as Observable<Task[]>).pipe(
      switchMap((tasks: Task[]) => {
        if (tasks.length === 0) return of([]);

        // Get unique project IDs
        const projectIds = [...new Set(tasks.map((t) => t.projectId))];

        // Fetch project details
        return from(
          Promise.all(
            projectIds.map((id) => firstValueFrom(this.projectService.getProjectById(id))),
          ),
        ).pipe(
          map((projects) => {
            const projectMap = new Map(projects.filter((p) => p).map((p) => [p!.id!, p!]));

            // Enhance tasks with project information
            return tasks.map((task) => ({
              ...task,
              projectName: projectMap.get(task.projectId)?.name,
              projectCode: projectMap.get(task.projectId)?.projectCode,
              clientName: projectMap.get(task.projectId)?.clientName,
            }));
          }),
        );
      }),
    ) as Observable<Task[]>;
  }

  getTask(taskId: string): Observable<Task | undefined> {
    const taskDoc = doc(this.firestore, 'tasks', taskId);
    return docData(taskDoc, { idField: 'id' }) as Observable<Task>;
  }

  async createTask(task: Omit<Task, 'id'>): Promise<string> {
    const currentUser = await this.authService.getCurrentUser();
    const newTask = {
      ...task,
      status: task.status || TaskStatus.PENDING,
      priority: task.priority || TaskPriority.MEDIUM,
      completionPercentage: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: currentUser?.uid,
    };

    const docRef = await addDoc(this.tasksCollection, newTask);
    return docRef.id;
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const currentUser = await this.authService.getCurrentUser();
    const taskDoc = doc(this.firestore, 'tasks', taskId);

    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser?.uid,
    };

    // If status is changing to completed, set completion date
    if (updates.status === TaskStatus.COMPLETED && !updates.completedDate) {
      updateData.completedDate = serverTimestamp() as any;
      updateData.completionPercentage = 100;
    }

    await updateDoc(taskDoc, updateData);
  }

  async deleteTask(taskId: string): Promise<void> {
    const taskDoc = doc(this.firestore, 'tasks', taskId);
    await deleteDoc(taskDoc);
  }

  async updateTaskOrder(tasks: { id: string; orderNo: number }[]): Promise<void> {
    const batch = writeBatch(this.firestore);

    tasks.forEach(({ id, orderNo }) => {
      const taskDoc = doc(this.firestore, 'tasks', id);
      batch.update(taskDoc, { orderNo, updatedAt: serverTimestamp() });
    });

    await batch.commit();
  }

  async assignTask(taskId: string, userId: string, notes?: string): Promise<void> {
    const currentUser = await this.authService.getCurrentUser();
    await this.updateTask(taskId, {
      assignedTo: userId,
      status: TaskStatus.IN_PROGRESS,
    });

    // Log the assignment
    const assignmentLog = {
      taskId,
      userId,
      assignedDate: serverTimestamp(),
      assignedBy: currentUser?.uid,
      notes,
    };

    await addDoc(collection(this.firestore, 'taskAssignments'), assignmentLog);
  }

  async updateTaskProgress(
    taskId: string,
    percentage: number,
    actualHours?: number,
  ): Promise<void> {
    const updates: Partial<Task> = {
      completionPercentage: percentage,
    };

    if (actualHours !== undefined) {
      updates.actualHours = actualHours;
    }

    if (percentage === 100) {
      updates.status = TaskStatus.COMPLETED;
    } else if (percentage > 0) {
      updates.status = TaskStatus.IN_PROGRESS;
    }

    await this.updateTask(taskId, updates);
  }

  // Create tasks for a specific phase based on templates
  async createTasksForPhase(projectId: string, phase: Phase): Promise<void> {
    const currentUser = await this.authService.getCurrentUser();
    const batch = writeBatch(this.firestore);

    // Find matching template for this phase
    const phaseName = PHASE_NAME_MAPPING[phase.name] || phase.name;
    const template = DEFAULT_TASK_TEMPLATES.find((t) => t.phaseName === phaseName);

    if (!template) {
      console.warn(`No task template found for phase: ${phase.name}`);
      return;
    }

    // Create tasks from template
    const taskIds: string[] = [];
    template.tasks.forEach((taskTemplate, _index) => {
      const taskRef = doc(collection(this.firestore, 'tasks'));
      taskIds.push(taskRef.id);

      const newTask = {
        name: taskTemplate.name,
        description: taskTemplate.description || '',
        phaseId: phase.id,
        projectId,
        orderNo: taskTemplate.orderNo,
        status: TaskStatus.PENDING,
        priority: taskTemplate.priority,
        estimatedHours: taskTemplate.estimatedHours,
        completionPercentage: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser?.uid,
      };

      batch.set(taskRef, newTask);
    });

    await batch.commit();

    // Handle dependencies in a second pass
    const depBatch = writeBatch(this.firestore);
    let hasUpdates = false;

    template.tasks.forEach((taskTemplate, index) => {
      if (taskTemplate.dependencies && taskTemplate.dependencies.length > 0) {
        const taskRef = doc(this.firestore, 'tasks', taskIds[index]);
        const dependencies = taskTemplate.dependencies
          .filter((depIndex) => depIndex < taskIds.length)
          .map((depIndex) => taskIds[depIndex]);

        if (dependencies.length > 0) {
          depBatch.update(taskRef, { dependencies });
          hasUpdates = true;
        }
      }
    });

    if (hasUpdates) {
      await depBatch.commit();
    }
  }

  // Create tasks for all phases in a project
  async createTasksForProject(projectId: string, phases: Phase[]): Promise<void> {
    console.log(`Creating tasks for project ${projectId} with ${phases.length} phases`);

    // Create tasks for each phase
    for (const phase of phases) {
      await this.createTasksForPhase(projectId, phase);
    }

    console.log('All tasks created successfully');
  }

  // Initialize tasks for a project if they don't exist
  async initializeProjectTasks(projectId: string): Promise<void> {
    // Check if tasks already exist
    const existingTasks = await firstValueFrom(this.getTasksByProject(projectId));

    if (existingTasks.length > 0) {
      console.log(`Project ${projectId} already has ${existingTasks.length} tasks`);
      return;
    }

    // Get project phases
    const phases = await firstValueFrom(
      collectionData(
        query(
          collection(this.firestore, `projects/${projectId}/phases`) as Query<Phase>,
          orderBy('orderNo'),
        ),
        { idField: 'id' },
      ) as Observable<Phase[]>,
    );

    if (phases.length === 0) {
      console.log(`Project ${projectId} has no phases`);
      return;
    }

    // Create tasks for all phases
    await this.createTasksForProject(projectId, phases);
  }

  // Get task statistics for a user
  getTaskStatsByUser(userId: string): Observable<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    todayDue: number;
  }> {
    return this.getTasksByAssignee(userId).pipe(
      map((tasks) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return {
          total: tasks.length,
          pending: tasks.filter((t) => t.status === TaskStatus.PENDING).length,
          inProgress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
          completed: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
          overdue: tasks.filter((t) => {
            if (!t.dueDate || t.status === TaskStatus.COMPLETED) return false;
            const dueDate = t.dueDate instanceof Date ? t.dueDate : (t.dueDate as any).toDate();
            return dueDate < now;
          }).length,
          todayDue: tasks.filter((t) => {
            if (!t.dueDate || t.status === TaskStatus.COMPLETED) return false;
            const dueDate = t.dueDate instanceof Date ? t.dueDate : (t.dueDate as any).toDate();
            return dueDate >= today && dueDate < tomorrow;
          }).length,
        };
      }),
    );
  }

  // Add a note to a task
  async addTaskNote(taskId: string, note: string): Promise<void> {
    const currentUser = await this.authService.getCurrentUser();
    const noteData = {
      taskId,
      note,
      createdAt: serverTimestamp(),
      createdBy: currentUser?.uid,
      userName: currentUser?.displayName || 'Unknown User',
    };

    await addDoc(collection(this.firestore, 'taskNotes'), noteData);
  }

  // Get notes for a task
  getTaskNotes(taskId: string): Observable<any[]> {
    const q = query(
      collection(this.firestore, 'taskNotes'),
      where('taskId', '==', taskId),
      orderBy('createdAt', 'desc'),
    );

    return collectionData(q, { idField: 'id' });
  }

  // Reassign a task
  async reassignTask(taskId: string, newUserId: string, reason: string): Promise<void> {
    const currentUser = await this.authService.getCurrentUser();
    const task = await firstValueFrom(this.getTask(taskId));

    if (!task) throw new Error('Task not found');

    const previousAssignee = task.assignedTo;

    // Update the task
    await this.updateTask(taskId, {
      assignedTo: newUserId,
    });

    // Log the reassignment
    const reassignmentLog = {
      taskId,
      fromUserId: previousAssignee,
      toUserId: newUserId,
      reason,
      reassignedAt: serverTimestamp(),
      reassignedBy: currentUser?.uid,
    };

    await addDoc(collection(this.firestore, 'taskReassignments'), reassignmentLog);

    // Add a note about the reassignment
    await this.addTaskNote(
      taskId,
      `Task reassigned from user ${previousAssignee} to user ${newUserId}. Reason: ${reason}`,
    );
  }
}
