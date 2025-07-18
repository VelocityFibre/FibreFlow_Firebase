import { Injectable, inject } from '@angular/core';
import { Firestore, where, orderBy, QueryConstraint, Timestamp } from '@angular/fire/firestore';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { Client, ClientFilter, ClientSortOptions } from '../models/client.model';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { EntityType } from '../../../core/models/audit-log.model';

@Injectable({
  providedIn: 'root',
})
export class ClientService extends BaseFirestoreService<Client> {
  protected override firestore = inject(Firestore);
  private authService = inject(AuthService);
  protected collectionName = 'clients';

  protected getEntityType(): EntityType {
    return 'client';
  }

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

    return this.getWithQuery(constraints);
  }

  getClient(id: string): Observable<Client | undefined> {
    return this.getById(id);
  }

  async getClientById(id: string): Promise<Client | undefined> {
    return this.getById(id).pipe(take(1)).toPromise();
  }

  async createClient(clientData: Partial<Client>): Promise<string> {
    const currentUser = await this.authService.getCurrentUserProfile();
    if (!currentUser) throw new Error('User not authenticated');

    const newClient = {
      ...clientData,
      projectsCount: 0,
      activeProjectsCount: 0,
      totalValue: 0,
      createdBy: currentUser.uid,
    };

    return this.create(newClient as any);
  }

  async updateClient(id: string, clientData: Partial<Client>): Promise<void> {
    const currentUser = await this.authService.getCurrentUserProfile();
    if (!currentUser) throw new Error('User not authenticated');

    return this.update(id, {
      ...clientData,
      lastModifiedBy: currentUser.uid,
    });
  }

  async deleteClient(id: string): Promise<void> {
    return this.delete(id);
  }

  searchClients(searchTerm: string): Observable<Client[]> {
    // For now, we'll do client-side filtering
    // In production, consider using a search service like Algolia
    return this.getAll().pipe(
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
    return this.getWithFilter('clientType', '==', clientType);
  }

  // Helper method to get active clients
  getActiveClients(): Observable<Client[]> {
    return this.getWithFilter('status', '==', 'Active');
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
    return this.update(clientId, metrics);
  }
}
