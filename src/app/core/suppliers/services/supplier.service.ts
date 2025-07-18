import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  CollectionReference,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  // limit,
  QueryConstraint,
  serverTimestamp,
  // Timestamp,
  collectionData,
  docData,
  DocumentReference,
} from '@angular/fire/firestore';
import { Observable, /* from, */ map, catchError, throwError } from 'rxjs';
import {
  Supplier,
  SupplierFilter,
  SupplierStatus,
  SupplierCategory,
  ServiceArea,
  SupplierContact,
  VerificationStatus,
} from '../models';
import { BaseFirestoreService } from '../../services/base-firestore.service';
import { EntityType } from '../../models/audit-log.model';

@Injectable({ providedIn: 'root' })
export class SupplierService extends BaseFirestoreService<Supplier> {
  protected override firestore = inject(Firestore); // Needed for subcollections
  protected collectionName = 'suppliers';

  protected getEntityType(): EntityType {
    return 'supplier';
  }

  getSuppliers(filter?: SupplierFilter): Observable<Supplier[]> {
    console.log('SupplierService.getSuppliers called with filter:', filter);
    const constraints: QueryConstraint[] = [];

    if (filter?.status) {
      constraints.push(where('status', '==', filter.status));
    }

    if (filter?.verificationStatus) {
      constraints.push(where('verificationStatus', '==', filter.verificationStatus));
    }

    if (filter?.categories && filter.categories.length > 0) {
      constraints.push(where('categories', 'array-contains-any', filter.categories));
    }

    constraints.push(orderBy('companyName', 'asc'));

    return this.getWithQuery(constraints).pipe(
      map((suppliers) => {
        console.log('Raw suppliers from Firestore:', suppliers);
        if (filter?.searchQuery) {
          const search = filter.searchQuery.toLowerCase();
          const filtered = suppliers.filter(
            (supplier) =>
              supplier.companyName.toLowerCase().includes(search) ||
              supplier.primaryEmail.toLowerCase().includes(search) ||
              supplier.primaryPhone.includes(search),
          );
          console.log('Filtered suppliers:', filtered);
          return filtered;
        }
        return suppliers;
      }),
      catchError((error) => {
        console.error('Error fetching suppliers:', error);
        return throwError(() => new Error('Failed to fetch suppliers'));
      }),
    );
  }

  getSupplierById(id: string): Observable<Supplier | undefined> {
    return this.getById(id).pipe(
      catchError((error) => {
        console.error('Error fetching supplier:', error);
        return throwError(() => new Error('Failed to fetch supplier'));
      }),
    );
  }

  // Alias for getSupplierById for compatibility
  getSupplier(id: string): Observable<Supplier | undefined> {
    return this.getSupplierById(id);
  }

  async createSupplier(
    supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    try {
      return await this.create(supplier);
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw new Error('Failed to create supplier');
    }
  }

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<void> {
    try {
      await this.update(id, updates);
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw new Error('Failed to update supplier');
    }
  }

  async deleteSupplier(id: string): Promise<void> {
    try {
      await this.delete(id);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw new Error('Failed to delete supplier');
    }
  }

  getSupplierContacts(supplierId: string): Observable<SupplierContact[]> {
    const contactsCollection = collection(
      this.firestore,
      `suppliers/${supplierId}/contacts`,
    ) as CollectionReference<SupplierContact>;

    const q = query(contactsCollection, orderBy('name', 'asc'));

    return collectionData(q, { idField: 'id' }).pipe(
      catchError((error) => {
        console.error('Error fetching contacts:', error);
        return throwError(() => new Error('Failed to fetch contacts'));
      }),
    );
  }

  async addContact(
    supplierId: string,
    contact: Omit<SupplierContact, 'id' | 'createdAt'>,
  ): Promise<string> {
    try {
      const contactsCollection = collection(
        this.firestore,
        `suppliers/${supplierId}/contacts`,
      ) as CollectionReference<SupplierContact>;

      const newContact = {
        ...contact,
        supplierId,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(contactsCollection, newContact);
      return docRef.id;
    } catch (error) {
      console.error('Error adding contact:', error);
      throw new Error('Failed to add contact');
    }
  }

  async updateContact(
    supplierId: string,
    contactId: string,
    updates: Partial<SupplierContact>,
  ): Promise<void> {
    try {
      const contactDoc = doc(this.firestore, `suppliers/${supplierId}/contacts/${contactId}`);
      await updateDoc(contactDoc, updates);
    } catch (error) {
      console.error('Error updating contact:', error);
      throw new Error('Failed to update contact');
    }
  }

  async deleteContact(supplierId: string, contactId: string): Promise<void> {
    try {
      const contactDoc = doc(this.firestore, `suppliers/${supplierId}/contacts/${contactId}`);
      await deleteDoc(contactDoc);
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw new Error('Failed to delete contact');
    }
  }

  searchSuppliers(searchQuery: string): Observable<Supplier[]> {
    return this.getSuppliers({ searchQuery });
  }

  getSuppliersByCategory(categories: SupplierCategory[]): Observable<Supplier[]> {
    return this.getWithQuery([
      where('categories', 'array-contains-any', categories),
      where('status', '==', SupplierStatus.ACTIVE),
      orderBy('companyName', 'asc'),
    ]).pipe(
      catchError((error) => {
        console.error('Error fetching suppliers by category:', error);
        return throwError(() => new Error('Failed to fetch suppliers by category'));
      }),
    );
  }

  getSuppliersByServiceArea(area: ServiceArea): Observable<Supplier[]> {
    return this.getWithQuery([
      where('status', '==', SupplierStatus.ACTIVE),
      orderBy('companyName', 'asc'),
    ]).pipe(
      map((suppliers) => {
        return suppliers.filter((supplier) => {
          return supplier.serviceAreas.some(
            (serviceArea) =>
              serviceArea.city.toLowerCase() === area.city.toLowerCase() &&
              serviceArea.state.toLowerCase() === area.state.toLowerCase(),
          );
        });
      }),
      catchError((error) => {
        console.error('Error fetching suppliers by service area:', error);
        return throwError(() => new Error('Failed to fetch suppliers by service area'));
      }),
    );
  }

  async updateCreditLimit(supplierId: string, limit: number): Promise<void> {
    try {
      await this.update(supplierId, { creditLimit: limit });
    } catch (error) {
      console.error('Error updating credit limit:', error);
      throw new Error('Failed to update credit limit');
    }
  }

  getSupplierBalance(supplierId: string): Observable<number> {
    return this.getSupplierById(supplierId).pipe(map((supplier) => supplier?.currentBalance || 0));
  }

  async updateVerificationStatus(
    supplierId: string,
    verificationStatus: VerificationStatus,
  ): Promise<void> {
    try {
      await this.update(supplierId, { verificationStatus });
    } catch (error) {
      console.error('Error updating verification status:', error);
      throw new Error('Failed to update verification status');
    }
  }
}
