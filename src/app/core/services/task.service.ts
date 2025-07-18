import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  getDoc,
  Query,
  Timestamp,
  addDoc,
} from '@angular/fire/firestore';
import { Observable, from, map, of, switchMap, firstValueFrom } from 'rxjs';
import { Task, TaskStatus, TaskPriority } from '../models/task.model';
import { AuthService } from './auth.service';
import { StaffService } from '../../features/staff/services/staff.service';
import { DEFAULT_TASK_TEMPLATES, PHASE_NAME_MAPPING } from '../models/task-templates.model';
import { Phase } from '../models/phase.model';
import { BaseFirestoreService } from './base-firestore.service';
import { EntityType } from '../models/audit-log.model';

@Injectable({
  providedIn: 'root',
})
export class TaskService extends BaseFirestoreService<Task> {
  protected override firestore = inject(Firestore);
  private authService = inject(AuthService);
  private projectsCollection = collection(this.firestore, 'projects');
  private staffService = inject(StaffService);
  protected collectionName = 'tasks';

  protected getEntityType(): EntityType {
    return 'task';
  }

  getAllTasks(): Observable<Task[]> {
    return this.getAll().pipe(
      switchMap((tasks: Task[]) => {
        if (tasks.length === 0) return of([]);

        // Get unique project IDs
        const projectIds = [...new Set(tasks.map((t) => t.projectId))];

        // Fetch project details directly from Firestore
        return from(Promise.all(projectIds.map((id) => this.getProjectBasicInfo(id)))).pipe(
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
    return this.getWithQuery([
      where('projectId', '==', projectId),
      orderBy('phaseId', 'asc'),
      orderBy('orderNo', 'asc'),
    ]).pipe(
      switchMap((tasks) => {
        console.log(`TaskService: Loaded ${tasks.length} tasks for project ${projectId}`);
        console.log('Tasks with ID:', tasks.filter((t) => t.id).length);
        console.log('Tasks without ID:', tasks.filter((t) => !t.id).length);

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
    const q = query(this.collection, where('phaseId', '==', phaseId), orderBy('orderNo', 'asc'));

    return collectionData(q, { idField: 'id' }) as Observable<Task[]>;
  }

  // Alias for getTasksByPhase for consistency with other services
  getByPhase(phaseId: string): Observable<Task[]> {
    return this.getTasksByPhase(phaseId);
  }

  getTasksByAssignee(userId: string): Observable<Task[]> {
    return this.getWithQuery([where('assignedTo', '==', userId), orderBy('dueDate', 'asc')]).pipe(
      switchMap((tasks: Task[]) => {
        if (tasks.length === 0) return of([]);

        // Get unique project IDs
        const projectIds = [...new Set(tasks.map((t) => t.projectId))];

        // Fetch project details directly from Firestore
        return from(Promise.all(projectIds.map((id) => this.getProjectBasicInfo(id)))).pipe(
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
    return this.getById(taskId);
  }

  async createTask(task: Omit<Task, 'id'>): Promise<string> {
    const currentUser = await this.authService.getCurrentUser();
    const newTask = {
      ...task,
      status: task.status || TaskStatus.PENDING,
      priority: task.priority || TaskPriority.MEDIUM,
      completionPercentage: 0,
      createdBy: currentUser?.uid,
    };

    return this.create(newTask);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const currentUser = await this.authService.getCurrentUser();
    const updateData: any = {
      ...updates,
      updatedBy: currentUser?.uid,
    };

    // If status is changing to completed, set completion date
    if (updates.status === TaskStatus.COMPLETED && !updates.completedDate) {
      updateData.completedDate = serverTimestamp();
      updateData.completionPercentage = 100;
    }

    return this.update(taskId, updateData);
  }

  async deleteTask(taskId: string): Promise<void> {
    return this.delete(taskId);
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
    console.log('Assigning task:', taskId, 'to user:', userId);
    const currentUser = await this.authService.getCurrentUser();

    // Get the staff member details to include the name
    console.log('Looking up staff member:', userId);
    const staffMember = await firstValueFrom(this.staffService.getStaffById(userId));
    console.log(
      'Staff member found:',
      staffMember
        ? { id: staffMember.id, name: staffMember.name, employeeId: staffMember.employeeId }
        : 'Not found',
    );
    const assignedToName = staffMember?.name;

    const updateData = {
      assignedTo: userId,
      assignedToName: assignedToName,
      status: TaskStatus.IN_PROGRESS,
    };
    console.log('Updating task with data:', updateData);

    await this.updateTask(taskId, updateData);

    // Log the assignment
    const assignmentLog: any = {
      taskId,
      userId,
      assignedDate: serverTimestamp(),
      assignedBy: currentUser?.uid,
    };

    // Only add notes if it's provided
    if (notes) {
      assignmentLog.notes = notes;
    }

    console.log('Creating assignment log:', assignmentLog);
    await addDoc(collection(this.firestore, 'taskAssignments'), assignmentLog);
    console.log('Task assignment completed successfully');
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
    // Always use the new method that supports steps with proper templates
    await this.initializeProjectTasksWithSteps(projectId);
  }

  // Initialize tasks with step support using the new template structure
  async initializeProjectTasksWithSteps(projectId: string): Promise<void> {
    const currentUser = await this.authService.getCurrentUser();

    // Import the templates from the features module
    const { TASK_TEMPLATES } = await import('../../features/tasks/models/task-template.model');

    // Check if tasks already exist
    const existingTasks = await firstValueFrom(this.getTasksByProject(projectId));
    console.log(`Project ${projectId} currently has ${existingTasks.length} tasks`);

    // Count total expected tasks from templates
    let totalExpectedTasks = 0;
    TASK_TEMPLATES.forEach((phase) => {
      phase.steps.forEach((step) => {
        totalExpectedTasks += step.tasks.length;
      });
    });

    console.log(`Expected total tasks from templates: ${totalExpectedTasks}`);

    if (existingTasks.length >= totalExpectedTasks) {
      console.log(
        `Project ${projectId} already has all expected tasks (${existingTasks.length}/${totalExpectedTasks})`,
      );
      return;
    }

    console.log(`Need to create ${totalExpectedTasks - existingTasks.length} missing tasks`);

    // Create map of existing task names to avoid duplicates
    const existingTaskNames = new Set(existingTasks.map((t) => t.name));

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
      console.log(`Project ${projectId} has no phases - initializing default phases`);
      // Optionally initialize phases here
      return;
    }

    // Create a mapping of phase names to phase IDs
    const phaseMap = new Map<string, string>();
    phases.forEach((phase) => {
      // Map template phase names to actual phase names
      const normalizedPhaseName = phase.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[()]/g, '');
      phaseMap.set(normalizedPhaseName, phase.id!);

      // Also try exact template ID mapping
      if (phase.name === 'Planning' || phase.name === 'Planning Phase') {
        phaseMap.set('planning', phase.id!);
      } else if (phase.name === 'Initiate Project (IP)' || phase.name === 'IP') {
        phaseMap.set('initiate-project-ip', phase.id!);
        phaseMap.set('ip', phase.id!);
      } else if (phase.name === 'Work in Progress (WIP)' || phase.name === 'WIP') {
        phaseMap.set('work-in-progress-wip', phase.id!);
        phaseMap.set('wip', phase.id!);
      } else if (phase.name === 'Handover') {
        phaseMap.set('handover', phase.id!);
      } else if (phase.name === 'Completed') {
        phaseMap.set('completed', phase.id!);
      }
    });

    console.log('Phase mapping:', Array.from(phaseMap.entries()));

    // Create all tasks in a batch
    const batch = writeBatch(this.firestore);
    let taskCount = 0;

    // Process each phase template
    for (const phaseTemplate of TASK_TEMPLATES) {
      // Try multiple mappings to find the phase
      let phaseId = phaseMap.get(phaseTemplate.id);

      // If not found, try alternative mappings based on template ID
      if (!phaseId) {
        switch (phaseTemplate.id) {
          case 'initiate-project':
            phaseId = phaseMap.get('initiate-project-ip') || phaseMap.get('ip');
            break;
          case 'work-in-progress':
            phaseId = phaseMap.get('work-in-progress-wip') || phaseMap.get('wip');
            break;
          case 'full-acceptance':
            phaseId = phaseMap.get('completed') || phaseMap.get('full-acceptance');
            break;
        }
      }

      if (!phaseId) {
        console.warn(
          `No matching phase found for template: ${phaseTemplate.name} (id: ${phaseTemplate.id})`,
        );
        continue;
      }

      console.log(`Processing phase: ${phaseTemplate.name} -> ${phaseId}`);

      // Process each step in the phase
      for (const stepTemplate of phaseTemplate.steps) {
        // Process each task in the step
        for (const taskTemplate of stepTemplate.tasks) {
          // Skip if task already exists
          if (existingTaskNames.has(taskTemplate.name)) {
            console.log(`Skipping existing task: ${taskTemplate.name}`);
            continue;
          }

          const taskRef = doc(collection(this.firestore, 'tasks'));

          const newTask = {
            name: taskTemplate.name,
            description: taskTemplate.description || '',
            phaseId: phaseId,
            projectId: projectId,
            stepId: stepTemplate.id, // Include stepId
            orderNo: taskTemplate.orderNo,
            status: TaskStatus.PENDING,
            priority: TaskPriority.MEDIUM,
            estimatedHours: 8, // Default estimate
            completionPercentage: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: currentUser?.uid,
          };

          batch.set(taskRef, newTask);
          taskCount++;
          console.log(`Creating missing task: ${taskTemplate.name}`);
        }
      }
    }

    if (taskCount > 0) {
      await batch.commit();
      console.log(`Created ${taskCount} tasks for project ${projectId}`);
    } else {
      console.log('No tasks were created');
    }
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
            const dueDate =
              t.dueDate instanceof Date ? t.dueDate : (t.dueDate as Timestamp).toDate();
            return dueDate < now;
          }).length,
          todayDue: tasks.filter((t) => {
            if (!t.dueDate || t.status === TaskStatus.COMPLETED) return false;
            const dueDate =
              t.dueDate instanceof Date ? t.dueDate : (t.dueDate as Timestamp).toDate();
            return dueDate >= today && dueDate < tomorrow;
          }).length,
        };
      }),
    );
  }

  // Helper method to get basic project info without circular dependency
  private async getProjectBasicInfo(
    projectId: string,
  ): Promise<{ id?: string; name?: string; projectCode?: string; clientName?: string } | null> {
    try {
      const projectDoc = doc(this.projectsCollection, projectId);
      const projectSnap = await getDoc(projectDoc);
      if (projectSnap.exists()) {
        const data = projectSnap.data();
        return {
          id: projectSnap.id,
          name: data['name'],
          projectCode: data['projectCode'],
          clientName: data['clientName'],
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching project ${projectId}:`, error);
      return null;
    }
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
  getTaskNotes(taskId: string): Observable<
    Array<{
      id?: string;
      taskId: string;
      note: string;
      createdAt: Timestamp;
      createdBy: string;
      userName: string;
    }>
  > {
    const q = query(
      collection(this.firestore, 'taskNotes'),
      where('taskId', '==', taskId),
      orderBy('createdAt', 'desc'),
    );

    return collectionData(q, { idField: 'id' }) as Observable<
      Array<{
        id?: string;
        taskId: string;
        note: string;
        createdAt: Timestamp;
        createdBy: string;
        userName: string;
      }>
    >;
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

  // Migrate existing tasks to include stepId based on task templates
  async migrateTasksWithStepIds(projectId: string): Promise<void> {
    const { TASK_TEMPLATES } = await import('../../features/tasks/models/task-template.model');

    // Get all tasks for the project
    const tasks = await firstValueFrom(this.getTasksByProject(projectId));

    // Create a mapping of task names to stepIds from templates
    const taskNameToStepId = new Map<string, string>();
    TASK_TEMPLATES.forEach((phase) => {
      phase.steps.forEach((step) => {
        step.tasks.forEach((task) => {
          taskNameToStepId.set(task.name, step.id);
        });
      });
    });

    // Update tasks that don't have stepId
    const batch = writeBatch(this.firestore);
    let updateCount = 0;

    tasks.forEach((task) => {
      if (!task.stepId && task.id) {
        const stepId = taskNameToStepId.get(task.name);
        if (stepId) {
          const taskDoc = doc(this.firestore, 'tasks', task.id);
          batch.update(taskDoc, {
            stepId: stepId,
            updatedAt: serverTimestamp(),
          });
          updateCount++;
        }
      }
    });

    if (updateCount > 0) {
      await batch.commit();
      console.log(`Updated ${updateCount} tasks with stepIds for project ${projectId}`);
    }
  }
}
