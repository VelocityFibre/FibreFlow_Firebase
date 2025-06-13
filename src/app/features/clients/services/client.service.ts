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
  QueryConstraint,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { Client, ClientFilter, ClientSortOptions } from '../models/client.model';

@Injectable({
  providedIn: 'root',
})
export class ClientService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private clientsCollection = collection(this.firestore, 'clients');

  getClients(filter?: ClientFilter, sort?: ClientSortOptions): Observable<Client[]> {
    const constraints: QueryConstraint[] = [];

    // Apply filters
    if (filter) {
      if (filter.clientTypes && filter.clientTypes.length > 0) {
        constraints.push(where('clientType', 'in', filter.clientTypes));
      }
      if (filter.statuses && filter.statuses.length > 0) {
        constraints.push(where('status', 'in', filter.statuses));
      }
      if (filter.minValue !== undefined) {
        constraints.push(where('totalValue', '>=', filter.minValue));
      }
      if (filter.maxValue !== undefined) {
        constraints.push(where('totalValue', '<=', filter.maxValue));
      }
    }

    // Apply sorting
    if (sort) {
      constraints.push(orderBy(sort.field, sort.direction));
    } else {
      constraints.push(orderBy('name', 'asc'));
    }

    const q = query(this.clientsCollection, ...constraints);

    return collectionData(q, { idField: 'id' }) as Observable<Client[]>;
  }

  getClient(id: string): Observable<Client | undefined> {
    const clientDoc = doc(this.firestore, 'clients', id);
    return docData(clientDoc, { idField: 'id' }) as Observable<Client | undefined>;
  }

  async getClientById(id: string): Promise<Client | undefined> {
    return new Promise((resolve) => {
      this.getClient(id).subscribe({
        next: (client) => resolve(client),
        error: () => resolve(undefined),
      });
    });
  }

  async createClient(clientData: Partial<Client>): Promise<string> {
    const currentUser = await this.authService.getCurrentUserProfile();
    if (!currentUser) throw new Error('User not authenticated');

    const newClient = {
      ...clientData,
      projectsCount: 0,
      activeProjectsCount: 0,
      totalValue: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: currentUser.uid,
    };

    const docRef = await addDoc(this.clientsCollection, newClient);
    return docRef.id;
  }

  async updateClient(id: string, clientData: Partial<Client>): Promise<void> {
    const currentUser = await this.authService.getCurrentUserProfile();
    if (!currentUser) throw new Error('User not authenticated');

    const clientDoc = doc(this.firestore, 'clients', id);
    await updateDoc(clientDoc, {
      ...clientData,
      updatedAt: Timestamp.now(),
      lastModifiedBy: currentUser.uid,
    });
  }

  async deleteClient(id: string): Promise<void> {
    const clientDoc = doc(this.firestore, 'clients', id);
    await deleteDoc(clientDoc);
  }

  searchClients(searchTerm: string): Observable<Client[]> {
    // For now, we'll do client-side filtering
    // In production, consider using a search service like Algolia
    return this.getClients().pipe(
      map((clients) =>
        clients.filter(
          (client) =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.industry && client.industry.toLowerCase().includes(searchTerm.toLowerCase())),
        ),
      ),
    );
  }

  // Helper method to get clients by type
  getClientsByType(clientType: string): Observable<Client[]> {
    const q = query(this.clientsCollection, where('clientType', '==', clientType));
    return collectionData(q, { idField: 'id' }) as Observable<Client[]>;
  }

  // Helper method to get active clients
  getActiveClients(): Observable<Client[]> {
    const q = query(this.clientsCollection, where('status', '==', 'Active'));
    return collectionData(q, { idField: 'id' }) as Observable<Client[]>;
  }

  // Update client metrics (called when projects are updated)
  async updateClientMetrics(
    clientId: string,
    metrics: {
      projectsCount?: number;
      activeProjectsCount?: number;
      totalValue?: number;
      lastProjectDate?: Timestamp;
    },
  ): Promise<void> {
    const clientDoc = doc(this.firestore, 'clients', clientId);
    await updateDoc(clientDoc, {
      ...metrics,
      updatedAt: Timestamp.now(),
    });
  }
}
