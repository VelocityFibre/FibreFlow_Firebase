import { TestBed } from '@angular/core/testing';
import { SupplierService } from './supplier.service';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  // setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
} from '@angular/fire/firestore';
import { of /* , throwError */ } from 'rxjs';
import { Supplier, SupplierStatus, SupplierType } from '../models/supplier.model';
import { SupplierContact } from '../models/supplier-contact.model';
import { PurchaseOrder, PurchaseOrderStatus } from '../models/purchase-order.model';

describe('SupplierService', () => {
  let service: SupplierService;
  let mockFirestore: jasmine.SpyObj<Firestore>;

  const mockSupplier: Supplier = {
    id: '1',
    name: 'Test Supplier',
    code: 'SUP001',
    type: SupplierType.EQUIPMENT,
    status: SupplierStatus.ACTIVE,
    email: 'contact@testsupplier.com',
    phone: '+1234567890',
    website: 'https://testsupplier.com',
    address: '123 Supplier St',
    city: 'Supply City',
    state: 'SC',
    country: 'USA',
    postalCode: '12345',
    taxId: 'TAX123',
    registrationNumber: 'REG123',
    bankName: 'Test Bank',
    bankAccount: '1234567890',
    bankBranch: 'Main Branch',
    swiftCode: 'TESTSWFT',
    paymentTerms: '30 days',
    creditLimit: 50000,
    currentBalance: 10000,
    rating: 4.5,
    categories: ['fiber', 'cables'],
    preferredCurrency: 'USD',
    notes: 'Reliable supplier',
    isVerified: true,
    verifiedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockContact: SupplierContact = {
    id: 'contact1',
    supplierId: '1',
    name: 'John Contact',
    position: 'Sales Manager',
    email: 'john@testsupplier.com',
    phone: '+1234567891',
    mobile: '+1234567892',
    isPrimary: true,
    department: 'Sales',
    notes: 'Primary contact',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPurchaseOrder: PurchaseOrder = {
    id: 'po1',
    orderNumber: 'PO2024001',
    supplierId: '1',
    supplierName: 'Test Supplier',
    projectId: 'project1',
    projectName: 'Test Project',
    status: PurchaseOrderStatus.PENDING,
    orderDate: new Date('2024-01-15'),
    expectedDeliveryDate: new Date('2024-02-15'),
    items: [
      {
        id: 'item1',
        stockItemId: 'stock1',
        description: 'Fiber Cable',
        quantity: 100,
        unit: 'meters',
        unitPrice: 10,
        totalPrice: 1000,
        notes: '',
      },
    ],
    subtotal: 1000,
    tax: 150,
    shipping: 50,
    discount: 0,
    total: 1200,
    currency: 'USD',
    paymentTerms: '30 days',
    shippingAddress: '123 Project St',
    billingAddress: '123 Company St',
    notes: 'Urgent order',
    createdBy: 'user1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(() => {
    mockFirestore = jasmine.createSpyObj('Firestore', ['collection']);

    TestBed.configureTestingModule({
      providers: [SupplierService, { provide: Firestore, useValue: mockFirestore }],
    });

    service = TestBed.inject(SupplierService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Supplier CRUD Operations', () => {
    describe('getSuppliers', () => {
      it('should return all suppliers', (done) => {
        const mockSuppliers = [mockSupplier];
        const mockCollection = jasmine.createSpyObj('collection', ['']);

        (collection as jasmine.Spy).and.returnValue(mockCollection);
        (collectionData as jasmine.Spy).and.returnValue(of(mockSuppliers));

        service.getSuppliers().subscribe((suppliers) => {
          expect(suppliers).toEqual(mockSuppliers);
          expect(collection).toHaveBeenCalledWith(mockFirestore, 'suppliers');
          done();
        });
      });
    });

    describe('getSupplierById', () => {
      it('should return supplier by id', (done) => {
        const mockDoc = jasmine.createSpyObj('doc', ['']);

        (doc as jasmine.Spy).and.returnValue(mockDoc);
        (docData as jasmine.Spy).and.returnValue(of(mockSupplier));

        service.getSupplierById('1').subscribe((supplier) => {
          expect(supplier).toEqual(mockSupplier);
          expect(doc).toHaveBeenCalledWith(mockFirestore, 'suppliers', '1');
          done();
        });
      });
    });

    describe('createSupplier', () => {
      it('should create a new supplier', async () => {
        const newSupplier = { ...mockSupplier };
        delete newSupplier.id;

        const mockCollection = jasmine.createSpyObj('collection', ['']);
        const mockDocRef = { id: 'new-id' };

        (collection as jasmine.Spy).and.returnValue(mockCollection);
        (addDoc as jasmine.Spy).and.returnValue(Promise.resolve(mockDocRef));

        const result = await service.createSupplier(newSupplier);

        expect(addDoc).toHaveBeenCalledWith(
          mockCollection,
          jasmine.objectContaining({
            ...newSupplier,
            createdAt: jasmine.any(Date),
            updatedAt: jasmine.any(Date),
          }),
        );
        expect(result).toBe('new-id');
      });
    });

    describe('updateSupplier', () => {
      it('should update an existing supplier', async () => {
        const updates = { name: 'Updated Supplier', phone: '+9876543210' };
        const mockDoc = jasmine.createSpyObj('doc', ['']);

        (doc as jasmine.Spy).and.returnValue(mockDoc);
        (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

        await service.updateSupplier('1', updates);

        expect(updateDoc).toHaveBeenCalledWith(
          mockDoc,
          jasmine.objectContaining({
            ...updates,
            updatedAt: jasmine.any(Date),
          }),
        );
      });
    });

    describe('deleteSupplier', () => {
      it('should delete a supplier', async () => {
        const mockDoc = jasmine.createSpyObj('doc', ['']);

        (doc as jasmine.Spy).and.returnValue(mockDoc);
        (deleteDoc as jasmine.Spy).and.returnValue(Promise.resolve());

        await service.deleteSupplier('1');

        expect(deleteDoc).toHaveBeenCalledWith(mockDoc);
      });
    });

    describe('getActiveSuppliers', () => {
      it('should return only active suppliers', (done) => {
        const activeSupplier = { ...mockSupplier, status: SupplierStatus.ACTIVE };
        const inactiveSupplier = { ...mockSupplier, id: '2', status: SupplierStatus.INACTIVE };
        const _allSuppliers = [activeSupplier, inactiveSupplier];

        const mockCollection = jasmine.createSpyObj('collection', ['']);

        (collection as jasmine.Spy).and.returnValue(mockCollection);
        (query as jasmine.Spy).and.returnValue('mockQuery');
        (where as jasmine.Spy).and.returnValue('mockWhere');
        (collectionData as jasmine.Spy).and.returnValue(of([activeSupplier]));

        service.getActiveSuppliers().subscribe((suppliers) => {
          expect(suppliers.length).toBe(1);
          expect(suppliers[0].status).toBe(SupplierStatus.ACTIVE);
          expect(where).toHaveBeenCalledWith('status', '==', SupplierStatus.ACTIVE);
          done();
        });
      });
    });
  });

  describe('Supplier Contacts', () => {
    describe('getSupplierContacts', () => {
      it('should return contacts for a supplier', (done) => {
        const mockContacts = [mockContact];
        const mockCollection = jasmine.createSpyObj('collection', ['']);

        (collection as jasmine.Spy).and.returnValue(mockCollection);
        (query as jasmine.Spy).and.returnValue('mockQuery');
        (where as jasmine.Spy).and.returnValue('mockWhere');
        (collectionData as jasmine.Spy).and.returnValue(of(mockContacts));

        service.getSupplierContacts('1').subscribe((contacts) => {
          expect(contacts).toEqual(mockContacts);
          expect(where).toHaveBeenCalledWith('supplierId', '==', '1');
          done();
        });
      });
    });

    describe('createSupplierContact', () => {
      it('should create a new contact', async () => {
        const newContact = { ...mockContact };
        delete newContact.id;

        const mockCollection = jasmine.createSpyObj('collection', ['']);
        const mockDocRef = { id: 'new-contact-id' };

        (collection as jasmine.Spy).and.returnValue(mockCollection);
        (addDoc as jasmine.Spy).and.returnValue(Promise.resolve(mockDocRef));

        const result = await service.createSupplierContact(newContact);

        expect(addDoc).toHaveBeenCalledWith(
          mockCollection,
          jasmine.objectContaining({
            ...newContact,
            createdAt: jasmine.any(Date),
            updatedAt: jasmine.any(Date),
          }),
        );
        expect(result).toBe('new-contact-id');
      });
    });

    describe('updateSupplierContact', () => {
      it('should update an existing contact', async () => {
        const updates = { email: 'newemail@testsupplier.com' };
        const mockDoc = jasmine.createSpyObj('doc', ['']);

        (doc as jasmine.Spy).and.returnValue(mockDoc);
        (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

        await service.updateSupplierContact('contact1', updates);

        expect(updateDoc).toHaveBeenCalledWith(
          mockDoc,
          jasmine.objectContaining({
            ...updates,
            updatedAt: jasmine.any(Date),
          }),
        );
      });
    });
  });

  describe('Purchase Orders', () => {
    describe('getSupplierPurchaseOrders', () => {
      it('should return purchase orders for a supplier', (done) => {
        const mockOrders = [mockPurchaseOrder];
        const mockCollection = jasmine.createSpyObj('collection', ['']);

        (collection as jasmine.Spy).and.returnValue(mockCollection);
        (query as jasmine.Spy).and.returnValue('mockQuery');
        (where as jasmine.Spy).and.returnValue('mockWhere');
        (collectionData as jasmine.Spy).and.returnValue(of(mockOrders));

        service.getSupplierPurchaseOrders('1').subscribe((orders) => {
          expect(orders).toEqual(mockOrders);
          expect(where).toHaveBeenCalledWith('supplierId', '==', '1');
          done();
        });
      });
    });

    describe('createPurchaseOrder', () => {
      it('should create a new purchase order', async () => {
        const newOrder = { ...mockPurchaseOrder };
        delete newOrder.id;

        const mockCollection = jasmine.createSpyObj('collection', ['']);
        const mockDocRef = { id: 'new-po-id' };

        (collection as jasmine.Spy).and.returnValue(mockCollection);
        (addDoc as jasmine.Spy).and.returnValue(Promise.resolve(mockDocRef));

        const result = await service.createPurchaseOrder(newOrder);

        expect(addDoc).toHaveBeenCalledWith(
          mockCollection,
          jasmine.objectContaining({
            ...newOrder,
            createdAt: jasmine.any(Date),
            updatedAt: jasmine.any(Date),
          }),
        );
        expect(result).toBe('new-po-id');
      });

      it('should generate order number if not provided', async () => {
        const newOrder = { ...mockPurchaseOrder };
        delete newOrder.id;
        delete newOrder.orderNumber;

        const mockCollection = jasmine.createSpyObj('collection', ['']);
        const mockDocRef = { id: 'new-po-id' };

        (collection as jasmine.Spy).and.returnValue(mockCollection);
        (addDoc as jasmine.Spy).and.returnValue(Promise.resolve(mockDocRef));

        await service.createPurchaseOrder(newOrder);

        expect(addDoc).toHaveBeenCalledWith(
          mockCollection,
          jasmine.objectContaining({
            orderNumber: jasmine.stringMatching(/^PO\d{10}$/),
          }),
        );
      });
    });

    describe('updatePurchaseOrderStatus', () => {
      it('should update purchase order status', async () => {
        const mockDoc = jasmine.createSpyObj('doc', ['']);

        (doc as jasmine.Spy).and.returnValue(mockDoc);
        (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

        await service.updatePurchaseOrderStatus('po1', PurchaseOrderStatus.APPROVED);

        expect(updateDoc).toHaveBeenCalledWith(
          mockDoc,
          jasmine.objectContaining({
            status: PurchaseOrderStatus.APPROVED,
            updatedAt: jasmine.any(Date),
          }),
        );
      });

      it('should update received date when marking as received', async () => {
        const mockDoc = jasmine.createSpyObj('doc', ['']);

        (doc as jasmine.Spy).and.returnValue(mockDoc);
        (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

        await service.updatePurchaseOrderStatus('po1', PurchaseOrderStatus.RECEIVED);

        expect(updateDoc).toHaveBeenCalledWith(
          mockDoc,
          jasmine.objectContaining({
            status: PurchaseOrderStatus.RECEIVED,
            receivedDate: jasmine.any(Date),
            updatedAt: jasmine.any(Date),
          }),
        );
      });
    });
  });

  describe('Supplier Rating', () => {
    it('should update supplier rating', async () => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      await service.updateSupplierRating('1', 4.8);

      expect(updateDoc).toHaveBeenCalledWith(
        mockDoc,
        jasmine.objectContaining({
          rating: 4.8,
          updatedAt: jasmine.any(Date),
        }),
      );
    });
  });

  describe('Supplier Verification', () => {
    it('should verify a supplier', async () => {
      const mockDoc = jasmine.createSpyObj('doc', ['']);

      (doc as jasmine.Spy).and.returnValue(mockDoc);
      (updateDoc as jasmine.Spy).and.returnValue(Promise.resolve());

      await service.verifySupplier('1');

      expect(updateDoc).toHaveBeenCalledWith(
        mockDoc,
        jasmine.objectContaining({
          isVerified: true,
          verifiedAt: jasmine.any(Date),
          updatedAt: jasmine.any(Date),
        }),
      );
    });
  });
});
