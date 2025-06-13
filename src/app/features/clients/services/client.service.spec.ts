import { TestBed } from '@angular/core/testing';
import { ClientService } from './client.service';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  updateDoc,
  deleteDoc,
  addDoc,
} from '@angular/fire/firestore';
import { of, throwError } from 'rxjs';
import { Client, ClientType, ClientStatus } from '../models/client.model';

describe('ClientService', () => {
  let service: ClientService;
  let mockFirestore: jasmine.SpyObj<Firestore>;

  const mockClient: Client = {
    id: '1',
    name: 'Test Company',
    type: ClientType.ENTERPRISE,
    status: ClientStatus.ACTIVE,
    contactPerson: 'John Doe',
    email: 'john@testcompany.com',
    phone: '+1234567890',
    address: '123 Business St',
    city: 'Tech City',
    country: 'USA',
    website: 'https://testcompany.com',
    registrationNumber: 'REG123456',
    taxNumber: 'TAX123456',
    industry: 'Technology',
    notes: 'Important client',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    totalProjects: 5,
    activeProjects: 2,
    completedProjects: 3,
    totalRevenue: 150000,
    outstandingBalance: 25000,
    preferredCurrency: 'USD',
    paymentTerms: '30 days',
    creditLimit: 100000,
    tags: ['premium', 'technology'],
    documents: [],
  };

  beforeEach(() => {
    mockFirestore = jasmine.createSpyObj('Firestore', ['collection']);

    TestBed.configureTestingModule({
      providers: [ClientService, { provide: Firestore, useValue: mockFirestore }],
    });

    service = TestBed.inject(ClientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getClients', () => {
    it('should return all clients', (done) => {
      const mockClients = [mockClient];
      const mockCollection = jasmine.createSpyObj('collection', ['']);

      (collection as jasmine.Spy).and.returnValue(mockCollection);
      (collectionData as jasmine.Spy).and.returnValue(of(mockClients));

      service.getClients().subscribe((clients) => {
        expect(clients).toEqual(mockClients);
        expect(collection).toHaveBeenCalledWith(mockFirestore, 'clients');
        done();
      });
    });

    it('should handle errors', (done) => {
      const mockCollection = jasmine.createSpyObj('collection', ['']);
      const error = new Error('Failed to load clients');

      (collection as jasmine.Spy).and.returnValue(mockCollection);
      (collectionData as jasmine.Spy).and.returnValue(throwError(() => error));

      service.getClients().subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('getClientById', () => {
    it('should return client by id', (done) => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (docData as jasmine.Spy).and.returnValue(of(mockClient));

      service.getClientById('1').subscribe((client) => {
        expect(client).toEqual(mockClient);
        expect(doc).toHaveBeenCalledWith(mockFirestore, 'clients', '1');
        done();
      });
    });

    it('should return undefined for non-existent client', (done) => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (docData as jasmine.Spy).and.returnValue(of(undefined));

      service.getClientById('non-existent').subscribe((client) => {
        expect(client).toBeUndefined();
        done();
      });
    });
  });

  describe('createClient', () => {
    it('should create a new client', async () => {
      const newClient = { ...mockClient };
      delete newClient.id;

      const mockCollection = jasmine.createSpyObj('collection', ['']);
      const mockDocRef = { id: 'new-id' };

      (collection as jasmine.Spy).and.returnValue(mockCollection);
      (addDoc as jasmine.Spy).and.returnValue(Promise.resolve(mockDocRef));

      const result = await service.createClient(newClient);

      expect(addDoc).toHaveBeenCalledWith(
        mockCollection,
        jasmine.objectContaining({
          ...newClient,
          createdAt: jasmine.any(Date),
          updatedAt: jasmine.any(Date),
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          totalRevenue: 0,
          outstandingBalance: 0,
        }),
      );
      expect(result).toBe('new-id');
    });

    it('should handle creation errors', async () => {
      const newClient = { ...mockClient };
      delete newClient.id;

      const mockCollection = jasmine.createSpyObj('collection', ['']);
      const error = new Error('Creation failed');

      (collection as jasmine.Spy).and.returnValue(mockCollection);
      (addDoc as jasmine.Spy).and.returnValue(Promise.reject(error));

      await expectAsync(service.createClient(newClient)).toBeRejectedWith(error);
    });
  });

  describe('updateClient', () => {
    it('should update an existing client', async () => {
      const updates = { name: 'Updated Company', phone: '+9876543210' };
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      await service.updateClient('1', updates);

      expect(updateDoc).toHaveBeenCalledWith(
        mockDoc,
        jasmine.objectContaining({
          ...updates,
          updatedAt: jasmine.any(Date),
        }),
      );
    });

    it('should handle update errors', async () => {
      const updates = { name: 'Updated Company' };
      const mockDoc = jasmine.createSpyObj('doc', ['']);
      const error = new Error('Update failed');

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (updateDoc as jasmine.Spy).and.returnValue(Promise.reject(error));

      await expectAsync(service.updateClient('1', updates)).toBeRejectedWith(error);
    });
  });

  describe('deleteClient', () => {
    it('should delete a client', async () => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (deleteDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      await service.deleteClient('1');

      expect(deleteDoc).toHaveBeenCalledWith(mockDoc);
    });

    it('should handle deletion errors', async () => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);
      const error = new Error('Deletion failed');

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (deleteDoc as jasmine.Spy).and.returnValue(Promise.reject(error));

      await expectAsync(service.deleteClient('1')).toBeRejectedWith(error);
    });
  });

  describe('updateClientStatus', () => {
    it('should update client status', async () => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      await service.updateClientStatus('1', ClientStatus.INACTIVE);

      expect(updateDoc).toHaveBeenCalledWith(
        mockDoc,
        jasmine.objectContaining({
          status: ClientStatus.INACTIVE,
          updatedAt: jasmine.any(Date),
        }),
      );
    });
  });

  describe('updateClientFinancials', () => {
    it('should update client financial information', async () => {
      const financialUpdate = {
        totalRevenue: 200000,
        outstandingBalance: 50000,
      };
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      await service.updateClientFinancials('1', financialUpdate);

      expect(updateDoc).toHaveBeenCalledWith(
        mockDoc,
        jasmine.objectContaining({
          ...financialUpdate,
          updatedAt: jasmine.any(Date),
        }),
      );
    });
  });

  describe('incrementProjectCount', () => {
    it('should increment active projects', async () => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (docData as jasmine.Spy).and.returnValue(of(mockClient));
      (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      await service.incrementProjectCount('1', 'active');

      expect(updateDoc).toHaveBeenCalledWith(
        mockDoc,
        jasmine.objectContaining({
          totalProjects: mockClient.totalProjects + 1,
          activeProjects: mockClient.activeProjects + 1,
          updatedAt: jasmine.any(Date),
        }),
      );
    });

    it('should handle completed project transition', async () => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (docData as jasmine.Spy).and.returnValue(of(mockClient));
      (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      await service.incrementProjectCount('1', 'completed');

      expect(updateDoc).toHaveBeenCalledWith(
        mockDoc,
        jasmine.objectContaining({
          activeProjects: Math.max(0, mockClient.activeProjects - 1),
          completedProjects: mockClient.completedProjects + 1,
          updatedAt: jasmine.any(Date),
        }),
      );
    });
  });

  describe('getActiveClients', () => {
    it('should return only active clients', (done) => {
      const activeClient = { ...mockClient, status: ClientStatus.ACTIVE };
      const inactiveClient = { ...mockClient, id: '2', status: ClientStatus.INACTIVE };
      const allClients = [activeClient, inactiveClient];

      const mockCollection = jasmine.createSpyObj('collection', ['']);

      (collection as jasmine.Spy).and.returnValue(mockCollection);
      (collectionData as jasmine.Spy).and.returnValue(of(allClients));

      service.getActiveClients().subscribe((clients) => {
        expect(clients.length).toBe(1);
        expect(clients[0].status).toBe(ClientStatus.ACTIVE);
        done();
      });
    });
  });

  describe('searchClients', () => {
    it('should search clients by name', (done) => {
      const clients = [mockClient, { ...mockClient, id: '2', name: 'Another Company' }];

      const mockCollection = jasmine.createSpyObj('collection', ['']);

      (collection as jasmine.Spy).and.returnValue(mockCollection);
      (collectionData as jasmine.Spy).and.returnValue(of(clients));

      service.searchClients('Test').subscribe((results) => {
        expect(results.length).toBe(1);
        expect(results[0].name).toContain('Test');
        done();
      });
    });

    it('should search clients by email', (done) => {
      const clients = [mockClient, { ...mockClient, id: '2', email: 'contact@another.com' }];

      const mockCollection = jasmine.createSpyObj('collection', ['']);

      (collection as jasmine.Spy).and.returnValue(mockCollection);
      (collectionData as jasmine.Spy).and.returnValue(of(clients));

      service.searchClients('testcompany').subscribe((results) => {
        expect(results.length).toBe(1);
        expect(results[0].email).toContain('testcompany');
        done();
      });
    });
  });
});
