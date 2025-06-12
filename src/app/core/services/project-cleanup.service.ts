import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  getDocs,
  deleteDoc,
  doc,
  writeBatch
} from '@angular/fire/firestore';
import { ProjectService } from './project.service';
import { ProjectType, ProjectStatus, Priority, PhaseType } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectCleanupService {
  private firestore = inject(Firestore);
  private projectService = inject(ProjectService);

  async cleanupAndCreateLouisTest() {
    console.log('Starting cleanup...');
    
    try {
      // Get all projects
      const projectsRef = collection(this.firestore, 'projects');
      const snapshot = await getDocs(projectsRef);
      
      // Delete all existing projects
      const batch = writeBatch(this.firestore);
      let deleteCount = 0;
      
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
        deleteCount++;
        console.log('Marking for deletion:', doc.id, doc.data()['name']);
      });
      
      // Commit the batch delete
      if (deleteCount > 0) {
        await batch.commit();
        console.log(`Deleted ${deleteCount} projects`);
      }
      
      // Wait a moment for deletion to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create LouisTest project
      const louisTestProject = {
        projectCode: 'PRJ-LT001',
        name: 'LouisTest',
        description: 'Test project for FibreFlow development',
        
        // Client Information
        clientId: 'client-louis',
        clientName: 'Louis Duplessis',
        clientOrganization: 'VelocityFibre',
        clientContact: 'Louis Duplessis',
        clientEmail: 'louis@velocityfibre.co.za',
        clientPhone: '+27 82 123 4567',
        
        // Project Details
        location: 'Johannesburg, Gauteng',
        projectType: ProjectType.FTTH,
        priorityLevel: Priority.MEDIUM,
        status: ProjectStatus.PLANNING,
        currentPhase: PhaseType.PLANNING,
        currentPhaseName: 'Planning Phase',
        
        // Dates
        startDate: new Date(),
        expectedEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        
        // People
        projectManagerId: 'pm-louis',
        projectManagerName: 'Louis Duplessis',
        
        // Financial (in ZAR)
        budget: 1500000,
        budgetUsed: 0,
        
        // Progress
        overallProgress: 0,
        activeTasksCount: 0,
        completedTasksCount: 0,
        currentPhaseProgress: 0,
        
        // Work Constraints
        workingHours: '8:00 AM - 5:00 PM SAST',
        allowWeekendWork: false,
        allowNightWork: false,
        
        // Metadata
        createdBy: 'louis',
        lastModifiedBy: 'louis'
      };
      
      const projectId = await this.projectService.createProject(louisTestProject);
      console.log('Created LouisTest project with ID:', projectId);
      
      return { deleted: deleteCount, created: 1 };
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }
}