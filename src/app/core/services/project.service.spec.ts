import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { ProjectService } from './project.service';
import { Project, ProjectStatus } from '../models/project.model';
// import { of } from 'rxjs';

describe('ProjectService', () => {
  let service: ProjectService;
  let firestoreMock: jasmine.SpyObj<Firestore>;

  const mockProject: Project = {
    id: '1',
    name: 'Test Project',
    projectCode: 'TP001',
    description: 'Test Description',
    location: 'Test Location',
    projectType: 'ftth',
    status: ProjectStatus.ACTIVE,
    priorityLevel: 'medium',
    startDate: new Date(),
    expectedEndDate: new Date(),
    budget: 100000,
    budgetUsed: 50000,
    overallProgress: 50,
    currentPhase: 'execution',
    currentPhaseName: 'Execution',
    currentPhaseProgress: 60,
    activeTasksCount: 5,
    projectManagerId: 'pm1',
    projectManagerName: 'John Doe',
    clientId: 'client1',
    clientName: 'Test Client',
    clientOrganization: 'Test Org',
    clientContact: 'Jane Doe',
    clientEmail: 'client@test.com',
    clientPhone: '1234567890',
    allowWeekendWork: false,
    workingHours: '8am-5pm',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    const firestoreSpy = jasmine.createSpyObj('Firestore', ['collection', 'doc']);

    TestBed.configureTestingModule({
      providers: [ProjectService, { provide: Firestore, useValue: firestoreSpy }],
    });

    service = TestBed.inject(ProjectService);
    firestoreMock = TestBed.inject(Firestore) as jasmine.SpyObj<Firestore>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a new project', async () => {
    const mockDocRef = { id: 'newId' };
    const mockCollection = jasmine.createSpyObj('collection', ['add']);
    mockCollection.add.and.returnValue(Promise.resolve(mockDocRef));

    firestoreMock.collection.and.returnValue(
      mockCollection as unknown as ReturnType<typeof collection>,
    );

    const newProject = { ...mockProject };
    delete newProject.id;

    const result = await service.createProject(newProject);
    expect(result).toBe('newId');
    expect(mockCollection.add).toHaveBeenCalled();
  });

  it('should update project progress', async () => {
    const mockDoc = jasmine.createSpyObj('doc', ['update']);
    mockDoc.update.and.returnValue(Promise.resolve());

    firestoreMock.doc.and.returnValue(mockDoc as unknown as ReturnType<typeof doc>);

    await service.updateProjectProgress('1', 75);

    expect(mockDoc.update).toHaveBeenCalledWith({
      overallProgress: 75,
      updatedAt: jasmine.any(Object),
    });
  });

  it('should calculate budget percentage correctly', () => {
    expect(service.calculateBudgetPercentage(mockProject)).toBe(50);

    const noBudgetProject = { ...mockProject, budget: 0 };
    expect(service.calculateBudgetPercentage(noBudgetProject)).toBe(0);
  });

  it('should determine if project is overdue', () => {
    const overdueProject = {
      ...mockProject,
      expectedEndDate: new Date('2020-01-01'),
      status: ProjectStatus.ACTIVE,
    };
    expect(service.isProjectOverdue(overdueProject)).toBe(true);

    const completedProject = {
      ...mockProject,
      expectedEndDate: new Date('2020-01-01'),
      status: ProjectStatus.COMPLETED,
    };
    expect(service.isProjectOverdue(completedProject)).toBe(false);
  });
});
