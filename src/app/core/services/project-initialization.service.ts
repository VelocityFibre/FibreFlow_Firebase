import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  writeBatch,
  doc,
  serverTimestamp,
  Timestamp,
} from '@angular/fire/firestore';
import { PhaseService } from './phase.service';
import { TaskService } from './task.service';
import { Phase, PhaseStatus } from '../models/phase.model';
import { Task, TaskStatus, TaskPriority } from '../models/task.model';

/**
 * Service to handle project initialization tasks
 * Breaks circular dependency between ProjectService and TaskService
 */
@Injectable({
  providedIn: 'root',
})
export class ProjectInitializationService {
  private firestore = inject(Firestore);
  private phaseService = inject(PhaseService);
  private taskService = inject(TaskService);

  /**
   * Initialize phases and tasks for a new project
   * This method was previously in ProjectService causing circular dependency
   */
  async initializeProjectPhasesAndTasks(projectId: string): Promise<void> {
    try {
      // Initialize phases first
      await this.phaseService.ensureProjectHasPhases(projectId);

      // Then initialize tasks
      await this.taskService.initializeProjectTasks(projectId);
    } catch (error) {
      console.error('Error initializing project phases and tasks:', error);
      throw error;
    }
  }

  /**
   * Create default phases for a project
   * Helper method to avoid duplication
   */
  async createDefaultPhases(_projectId: string): Promise<Phase[]> {
    const defaultPhases = [
      { name: 'Planning', description: 'Initial planning and requirements gathering', order: 1 },
      { name: 'Design', description: 'Technical design and architecture', order: 2 },
      { name: 'Implementation', description: 'Development and construction', order: 3 },
      { name: 'Testing', description: 'Quality assurance and testing', order: 4 },
      { name: 'Deployment', description: 'Final deployment and handover', order: 5 },
    ];

    const batch = writeBatch(this.firestore);
    const phases: Phase[] = [];
    const phasesCollection = collection(this.firestore, 'phases');

    defaultPhases.forEach((phaseData, index) => {
      const phaseRef = doc(phasesCollection);
      const phase: Phase = {
        id: phaseRef.id,
        name: phaseData.name,
        description: phaseData.description,
        orderNo: phaseData.order,
        startDate: Timestamp.now(),
        endDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 * (index + 1))), // 30 days per phase
        status: PhaseStatus.PENDING,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      batch.set(phaseRef, phase);
      phases.push(phase);
    });

    await batch.commit();
    return phases;
  }

  /**
   * Create default tasks for project phases
   * Helper method to avoid duplication
   */
  async createDefaultTasks(projectId: string, phases: Phase[]): Promise<void> {
    const taskTemplates = [
      {
        phase: 'Planning',
        tasks: ['Define requirements', 'Create project plan', 'Resource allocation'],
      },
      { phase: 'Design', tasks: ['Technical architecture', 'UI/UX design', 'Database design'] },
      { phase: 'Implementation', tasks: ['Core functionality', 'Integration', 'Unit tests'] },
      {
        phase: 'Testing',
        tasks: ['Integration testing', 'User acceptance testing', 'Performance testing'],
      },
      { phase: 'Deployment', tasks: ['Production setup', 'Data migration', 'Go-live'] },
    ];

    const batch = writeBatch(this.firestore);
    const tasksCollection = collection(this.firestore, 'tasks');

    phases.forEach((phase) => {
      const templates = taskTemplates.find((t) => t.phase === phase.name);
      if (templates) {
        templates.tasks.forEach((taskName, index) => {
          const taskRef = doc(tasksCollection);
          const task: Task = {
            id: taskRef.id,
            projectId,
            phaseId: phase.id!,
            name: taskName,
            description: `${taskName} for ${phase.name} phase`,
            orderNo: index + 1,
            status: TaskStatus.PENDING,
            priority: TaskPriority.MEDIUM,
            estimatedHours: 40,
            actualHours: 0,
            completionPercentage: 0,
            startDate: Timestamp.fromDate((phase.startDate as Timestamp).toDate()),
            dueDate: Timestamp.fromDate(
              new Date((phase.startDate as Timestamp).toDate().getTime() + 7 * 24 * 60 * 60 * 1000),
            ), // 7 days
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          batch.set(taskRef, task);
        });
      }
    });

    await batch.commit();
  }
}
