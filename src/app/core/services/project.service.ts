import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  orderBy,
  CollectionReference,
  Timestamp,
  getDoc,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  limit,
} from '@angular/fire/firestore';
import { Observable, map, combineLatest, switchMap } from 'rxjs';
import {
  Project,
  Phase,
  Step,
  Task,
  ProjectStatus,
  ProjectHierarchy,
  PhaseHierarchy,
  StepHierarchy,
} from '../models/project.model';
import { ProjectInitializationService } from './project-initialization.service';
import { PhaseService } from './phase.service';
import { ClientService } from '../../features/clients/services/client.service';
import { BaseFirestoreService } from './base-firestore.service';
import { EntityType } from '../models/audit-log.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectService extends BaseFirestoreService<Project> {
  protected override firestore = inject(Firestore);
  private projectInitService = inject(ProjectInitializationService);
  private phaseService = inject(PhaseService);
  private clientService = inject(ClientService);
  protected collectionName = 'projects';

  protected getEntityType(): EntityType {
    return 'project';
  }

  // Collection references for subcollections
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
    return this.getOrderedByDate('desc');
  }

  getActiveProjects(): Observable<Project[]> {
    return this.getWithFilter('status', '==', ProjectStatus.ACTIVE);
  }

  getProjectById(id: string): Observable<Project | undefined> {
    return this.getById(id);
  }

  // Alias for getProjectById for compatibility
  getProject(id: string): Observable<Project | undefined> {
    return this.getById(id);
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
    console.log('🏗️ ProjectService.createProject called with:', project);

    // Check for duplicate project code
    if (project.projectCode) {
      const existingProjectQuery = query(
        this.projectsCollection,
        where('projectCode', '==', project.projectCode),
        limit(1),
      );
      const existingSnapshot = await getDocs(existingProjectQuery);

      if (!existingSnapshot.empty) {
        throw new Error(`Project with code ${project.projectCode} already exists`);
      }
    }

    const newProject = {
      ...project,
      overallProgress: 0,
      activeTasksCount: 0,
      completedTasksCount: 0,
      currentPhaseProgress: 0,
    };

    console.log('📦 Prepared project data:', newProject);

    const projectId = await this.create(newProject);

    // Create default phases and tasks from template
    try {
      // Initialize phases and tasks for the project
      console.log(`Initializing phases and tasks for project ${projectId}...`);
      await this.projectInitService.initializeProjectPhasesAndTasks(projectId);
      console.log(`Successfully initialized phases and tasks for project ${projectId}`);
    } catch (error) {
      console.error('Error creating phases and tasks:', error);
      // Don't throw - project is already created
    }

    // Update client metrics
    if (newProject.clientId) {
      try {
        await this.updateClientMetricsForProject(newProject.clientId);
      } catch (error) {
        console.error('Error updating client metrics after project creation:', error);
      }
    }

    return projectId;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    // Get current project data for client metrics
    const currentProject = await this.getProjectOnce(id);

    await this.update(id, updates);

    // Update client metrics if clientId exists
    const clientId = updates.clientId || currentProject?.clientId;
    if (clientId) {
      try {
        await this.updateClientMetricsForProject(clientId);
      } catch (error) {
        console.error('Error updating client metrics after project update:', error);
      }
    }
  }

  async deleteProject(id: string): Promise<void> {
    // Get project data for client metrics before deletion
    const projectData = await this.getProjectOnce(id);

    // Note: In production, you'd want to delete all subcollections too
    await this.delete(id);

    // Update client metrics if clientId exists
    if (projectData?.clientId) {
      try {
        await this.updateClientMetricsForProject(projectData.clientId);
      } catch (error) {
        console.error('Error updating client metrics after project deletion:', error);
      }
    }
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

  // Client-Project Relationships
  getProjectsByClient(clientId: string): Observable<Project[]> {
    const q = query(
      this.projectsCollection,
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Project[]>;
  }

  async updateClientMetricsForProject(clientId: string): Promise<void> {
    try {
      // Get all projects for this client
      const q = query(this.projectsCollection, where('clientId', '==', clientId));
      const snapshot = await getDocs(q);

      const projects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Project[];

      // Calculate metrics
      const projectsCount = projects.length;
      const activeProjectsCount = projects.filter((p) => p.status === ProjectStatus.ACTIVE).length;
      const totalValue = projects.reduce((sum, project) => sum + (project.budget || 0), 0);
      const lastProjectDate =
        projects.length > 0
          ? projects.reduce((latest, project) => {
              const projectDate =
                project.createdAt instanceof Timestamp
                  ? project.createdAt
                  : Timestamp.fromDate(project.createdAt as Date);
              const latestDate =
                latest instanceof Timestamp ? latest : Timestamp.fromDate(latest as Date);
              return projectDate.toMillis() > latestDate.toMillis() ? projectDate : latestDate;
            }, projects[0].createdAt)
          : undefined;

      // Update client metrics
      await this.clientService.updateClientMetrics(clientId, {
        projectsCount,
        activeProjectsCount,
        totalValue,
        lastProjectDate: lastProjectDate as Timestamp,
      });
    } catch (error) {
      console.error('Error updating client metrics:', error);
    }
  }
}
