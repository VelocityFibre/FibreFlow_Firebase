import { TestBed } from '@angular/core/testing';
import { StaffService } from './staff.service';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
} from '@angular/fire/firestore';
import { of } from 'rxjs';
import { StaffMember, StaffGroup, AvailabilityStatus, StaffFilter } from '../models';

describe('StaffService', () => {
  let service: StaffService;
  let mockFirestore: jasmine.SpyObj<Firestore>;

  const mockStaffMember: StaffMember = {
    id: '1',
    employeeId: 'EMP001',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    group: StaffGroup.Technician,
    availabilityStatus: AvailabilityStatus.available,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastActiveAt: new Date('2024-01-15'),
    skills: ['fiber', 'splicing'],
    certifications: ['FTTH Certified'],
    photoUrl: null,
    address: '123 Main St',
    emergencyContact: {
      name: 'Jane Doe',
      phone: '+0987654321',
      relationship: 'Spouse',
    },
    currentProjects: ['project1', 'project2'],
    totalProjectsCompleted: 10,
    averageRating: 4.5,
    onVacationUntil: null,
    notes: 'Experienced technician',
  };

  beforeEach(() => {
    mockFirestore = jasmine.createSpyObj('Firestore', ['collection']);

    TestBed.configureTestingModule({
      providers: [StaffService, { provide: Firestore, useValue: mockFirestore }],
    });

    service = TestBed.inject(StaffService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getStaff', () => {
    it('should return all staff when no filter is provided', (done) => {
      const mockStaff = [mockStaffMember];
      const mockCollection = jasmine.createSpyObj('collection', ['']);

      (collection as jasmine.Spy).and.returnValue(mockCollection);
      (collectionData as jasmine.Spy).and.returnValue(of(mockStaff));

      service.getStaff().subscribe((staff) => {
        expect(staff).toEqual(mockStaff);
        expect(collection).toHaveBeenCalledWith(mockFirestore, 'staff');
        done();
      });
    });

    it('should apply filters when provided', (done) => {
      const mockStaff = [mockStaffMember];
      const filter: StaffFilter = {
        searchTerm: 'John',
        groups: [StaffGroup.Technician],
        availabilityStatus: [AvailabilityStatus.available],
        isActive: true,
      };

      const mockCollection = jasmine.createSpyObj('collection', ['']);
      (collection as jasmine.Spy).and.returnValue(mockCollection);
      (collectionData as jasmine.Spy).and.returnValue(of(mockStaff));

      service.getStaff(filter).subscribe((staff) => {
        expect(staff.length).toBe(1);
        expect(staff[0].name).toContain('John');
        done();
      });
    });
  });

  describe('getStaffById', () => {
    it('should return staff member by id', (done) => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (docData as jasmine.Spy).and.returnValue(of(mockStaffMember));

      service.getStaffById('1').subscribe((staff) => {
        expect(staff).toEqual(mockStaffMember);
        expect(doc).toHaveBeenCalledWith(mockFirestore, 'staff', '1');
        done();
      });
    });
  });

  describe('createStaff', () => {
    it('should create a new staff member', async () => {
      const newStaff = { ...mockStaffMember };
      delete newStaff.id;

      const mockCollection = jasmine.createSpyObj('collection', ['']);
      const mockDocRef = { id: 'new-id' };

      (collection as jasmine.Spy).and.returnValue(mockCollection);
      (addDoc as jasmine.Spy).and.returnValue(Promise.resolve(mockDocRef));

      const result = await service.createStaff(newStaff);

      expect(addDoc).toHaveBeenCalledWith(
        mockCollection,
        jasmine.objectContaining({
          ...newStaff,
          createdAt: jasmine.any(Date),
          updatedAt: jasmine.any(Date),
        }),
      );
      expect(result).toBe('new-id');
    });
  });

  describe('updateStaff', () => {
    it('should update an existing staff member', async () => {
      const updates = { name: 'John Updated' };
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      await service.updateStaff('1', updates);

      expect(updateDoc).toHaveBeenCalledWith(
        mockDoc,
        jasmine.objectContaining({
          ...updates,
          updatedAt: jasmine.any(Date),
        }),
      );
    });
  });

  describe('deleteStaff', () => {
    it('should delete a staff member', async () => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (deleteDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      await service.deleteStaff('1');

      expect(deleteDoc).toHaveBeenCalledWith(mockDoc);
    });
  });

  describe('updateAvailability', () => {
    it('should update staff availability status', async () => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      await service.updateAvailability('1', AvailabilityStatus.busy);

      expect(updateDoc).toHaveBeenCalledWith(
        mockDoc,
        jasmine.objectContaining({
          availabilityStatus: AvailabilityStatus.busy,
          lastActiveAt: jasmine.any(Date),
          updatedAt: jasmine.any(Date),
        }),
      );
    });
  });

  describe('assignToProject', () => {
    it('should add project to staff member', async () => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (docData as jasmine.Spy).and.returnValue(of(mockStaffMember));
      (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      await service.assignToProject('1', 'project3');

      expect(updateDoc).toHaveBeenCalledWith(
        mockDoc,
        jasmine.objectContaining({
          currentProjects: jasmine.arrayContaining(['project1', 'project2', 'project3']),
          updatedAt: jasmine.any(Date),
        }),
      );
    });
  });

  describe('removeFromProject', () => {
    it('should remove project from staff member', async () => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (docData as jasmine.Spy).and.returnValue(of(mockStaffMember));
      (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      await service.removeFromProject('1', 'project1');

      expect(updateDoc).toHaveBeenCalledWith(
        mockDoc,
        jasmine.objectContaining({
          currentProjects: ['project2'],
          updatedAt: jasmine.any(Date),
        }),
      );
    });
  });

  describe('deactivateStaff', () => {
    it('should deactivate a staff member', (done) => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      service.deactivateStaff('1').subscribe(() => {
        expect(updateDoc).toHaveBeenCalledWith(
          mockDoc,
          jasmine.objectContaining({
            isActive: false,
            updatedAt: jasmine.any(Date),
          }),
        );
        done();
      });
    });
  });

  describe('reactivateStaff', () => {
    it('should reactivate a staff member', (done) => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      service.reactivateStaff('1').subscribe(() => {
        expect(updateDoc).toHaveBeenCalledWith(
          mockDoc,
          jasmine.objectContaining({
            isActive: true,
            updatedAt: jasmine.any(Date),
          }),
        );
        done();
      });
    });
  });

  describe('getStaffByProject', () => {
    it('should return staff members assigned to a project', (done) => {
      const mockStaff = [mockStaffMember];
      const mockCollection = jasmine.createSpyObj('collection', ['']);

      (collection as jasmine.Spy).and.returnValue(mockCollection);
      (query as jasmine.Spy).and.returnValue('mockQuery');
      (where as jasmine.Spy).and.returnValue('mockWhere');
      (collectionData as jasmine.Spy).and.returnValue(of(mockStaff));

      service.getStaffByProject('project1').subscribe((staff) => {
        expect(staff).toEqual(mockStaff);
        expect(where).toHaveBeenCalledWith('currentProjects', 'array-contains', 'project1');
        done();
      });
    });
  });

  describe('getAvailableStaff', () => {
    it('should return available staff members', (done) => {
      const mockStaff = [mockStaffMember];
      const mockCollection = jasmine.createSpyObj('collection', ['']);

      (collection as jasmine.Spy).and.returnValue(mockCollection);
      (query as jasmine.Spy).and.returnValue('mockQuery');
      (where as jasmine.Spy).and.returnValue('mockWhere');
      (collectionData as jasmine.Spy).and.returnValue(of(mockStaff));

      service.getAvailableStaff().subscribe((staff) => {
        expect(staff).toEqual(mockStaff);
        expect(where).toHaveBeenCalledWith(
          'availabilityStatus',
          '==',
          AvailabilityStatus.available,
        );
        done();
      });
    });
  });
});
