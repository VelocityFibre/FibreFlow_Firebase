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
  // limit,
  CollectionReference,
  // DocumentReference,
  Timestamp,
  getDoc,
} from '@angular/fire/firestore';
import { Observable, /* from, */ map, combineLatest, switchMap } from 'rxjs';
import {
  Project,
  Phase,
  Step,
  Task,
  ProjectStatus,
  // PhaseStatus,
  // StepStatus,
  // TaskStatus,
  // PhaseType,
  // FIBER_PROJECT_PHASES,
  ProjectHierarchy,
  PhaseHierarchy,
  StepHierarchy,
} from '../models/project.model';
import { PhaseService } from './phase.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private firestore = inject(Firestore);
  private phaseService = inject(PhaseService);

  // Collection references
  private projectsCollection = collection(
    this.firestore,
    'projects',
  ) as CollectionReference<Project>;

  // Get collection references for hierarchical data
  private phasesCollection(projectId: string) {
    return collection(this.firestore, `projects/${projectId}/phases`) as CollectionReference<Phase>;
  }

  private stepsCollection(projectId: string, phaseId: string) {
    return collection(
      this.firestore,
      `projects/${projectId}/phases/${phaseId}/steps`,
    ) as CollectionReference<Step>;
  }

  private tasksCollection(projectId: string, phaseId: string, stepId: string) {
    return collection(
      this.firestore,
      `projects/${projectId}/phases/${phaseId}/steps/${stepId}/tasks`,
    ) as CollectionReference<Task>;
  }

  // Project CRUD Operations

  getProjects(): Observable<Project[]> {
    const q = query(this.projectsCollection, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' });
  }

  getActiveProjects(): Observable<Project[]> {
    const q = query(
      this.projectsCollection,
      where('status', '==', ProjectStatus.ACTIVE),
      orderBy('createdAt', 'desc'),
    );
    return collectionData(q, { idField: 'id' });
  }

  getProjectById(id: string): Observable<Project | undefined> {
    const projectDoc = doc(this.projectsCollection, id);
    return docData(projectDoc, { idField: 'id' });
  }

  // Get a single project (for non-observable use)
  async getProjectOnce(id: string): Promise<Project | undefined> {
    const projectDoc = doc(this.projectsCollection, id);
    const snapshot = await getDoc(projectDoc);
    if (snapshot.exists()) {
      return { ...snapshot.data(), id: snapshot.id } as Project;
    }
    return undefined;
  }

  getProjectHierarchy(projectId: string): Observable<ProjectHierarchy | undefined> {
    return this.getProjectById(projectId).pipe(
      switchMap((project) => {
        if (!project) return [undefined];

        return this.getPhases(projectId).pipe(
          switchMap((phases) => {
            const phaseObservables = phases.map((phase) =>
              this.getSteps(projectId, phase.id!).pipe(
                switchMap((steps) => {
                  const stepObservables = steps.map((step) =>
                    this.getTasks(projectId, phase.id!, step.id!).pipe(
                      map((tasks) => ({ ...step, tasks }) as StepHierarchy),
                    ),
                  );
                  return combineLatest(stepObservables.length ? stepObservables : [[]]).pipe(
                    map(
                      (stepsWithTasks) => ({ ...phase, steps: stepsWithTasks }) as PhaseHierarchy,
                    ),
                  );
                }),
              ),
            );

            return combineLatest(phaseObservables.length ? phaseObservables : [[]]).pipe(
              map(
                (phasesWithSteps) => ({ ...project, phases: phasesWithSteps }) as ProjectHierarchy,
              ),
            );
          }),
        );
      }),
    );
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Timestamp.now();
    const newProject: Omit<Project, 'id'> = {
      ...project,
      overallProgress: 0,
      activeTasksCount: 0,
      completedTasksCount: 0,
      currentPhaseProgress: 0,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(this.projectsCollection, newProject);

    // Create default phases and tasks from template
    try {
      await this.phaseService.createProjectPhases(docRef.id, true);
      console.log(`Created phases and tasks for project ${docRef.id}`);
    } catch (error) {
      console.error('Error creating phases and tasks:', error);
      // Don't throw - project is already created
    }

    return docRef.id;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    const projectDoc = doc(this.projectsCollection, id);
    await updateDoc(projectDoc, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  }

  async deleteProject(id: string): Promise<void> {
    // Note: In production, you'd want to delete all subcollections too
    const projectDoc = doc(this.projectsCollection, id);
    await deleteDoc(projectDoc);
  }

  // Phase CRUD Operations

  getPhases(projectId: string): Observable<Phase[]> {
    const q = query(this.phasesCollection(projectId), orderBy('order', 'asc'));
    return collectionData(q, { idField: 'id' });
  }

  async createPhase(
    projectId: string,
    phase: Omit<Phase, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const now = Timestamp.now();
    const newPhase: Omit<Phase, 'id'> = {
      ...phase,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(this.phasesCollection(projectId), newPhase);
    return docRef.id;
  }

  async updatePhase(projectId: string, phaseId: string, updates: Partial<Phase>): Promise<void> {
    const phaseDoc = doc(this.phasesCollection(projectId), phaseId);
    await updateDoc(phaseDoc, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  }

  // Step CRUD Operations

  getSteps(projectId: string, phaseId: string): Observable<Step[]> {
    const q = query(this.stepsCollection(projectId, phaseId), orderBy('order', 'asc'));
    return collectionData(q, { idField: 'id' });
  }

  async createStep(
    projectId: string,
    phaseId: string,
    step: Omit<Step, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const now = Timestamp.now();
    const newStep: Omit<Step, 'id'> = {
      ...step,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(this.stepsCollection(projectId, phaseId), newStep);
    return docRef.id;
  }

  // Task CRUD Operations

  getTasks(projectId: string, phaseId: string, stepId: string): Observable<Task[]> {
    const q = query(this.tasksCollection(projectId, phaseId, stepId), orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' });
  }

  async createTask(
    projectId: string,
    phaseId: string,
    stepId: string,
    task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const now = Timestamp.now();
    const newTask: Omit<Task, 'id'> = {
      ...task,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(this.tasksCollection(projectId, phaseId, stepId), newTask);

    // Update project task counts
    await this.updateProjectTaskCounts(projectId);

    return docRef.id;
  }

  async updateTask(
    projectId: string,
    phaseId: string,
    stepId: string,
    taskId: string,
    updates: Partial<Task>,
  ): Promise<void> {
    const taskDoc = doc(this.tasksCollection(projectId, phaseId, stepId), taskId);
    await updateDoc(taskDoc, {
      ...updates,
      updatedAt: Timestamp.now(),
    });

    // Update project task counts if status changed
    if (updates.status) {
      await this.updateProjectTaskCounts(projectId);
    }
  }

  // Helper Methods

  private async createDefaultPhases(projectId: string): Promise<void> {
    // Use the new PhaseService to create phases with proper dependencies
    await this.phaseService.createProjectPhases(projectId);
  }

  private async updateProjectTaskCounts(_projectId: string): Promise<void> {
    // In a real app, you'd aggregate this data from all tasks
    // For now, we'll just increment counters
    // This would be better handled with Cloud Functions
  }

  // Progress Calculation Methods

  async calculateProjectProgress(_projectId: string): Promise<number> {
    // This would calculate based on completed tasks vs total tasks
    // For now, returning a placeholder
    return 0;
  }

  async calculatePhaseProgress(_projectId: string, _phaseId: string): Promise<number> {
    // This would calculate based on completed tasks in phase
    // For now, returning a placeholder
    return 0;
  }
}
