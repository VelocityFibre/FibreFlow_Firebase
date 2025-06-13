import { Timestamp } from '@angular/fire/firestore';

export type ClientType = 'Enterprise' | 'SMB' | 'Residential';
export type ClientStatus = 'Active' | 'Inactive' | 'Pending';

export interface ClientContact {
  name: string;
  role: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface ClientProject {
  projectId: string;
  projectName: string;
  status: string;
  value: number;
  startDate: Timestamp;
  endDate?: Timestamp;
}

export interface Client {
  id: string;
  name: string;
  clientType: ClientType;
  status: ClientStatus;

  // Primary Contact
  contactPerson: string;
  email: string;
  phone: string;

  // Additional Info
  address: string;
  industry?: string;
  website?: string;
  registrationNumber?: string;
  vatNumber?: string;

  // Business Metrics
  projectsCount: number;
  activeProjectsCount: number;
  totalValue: number;
  lastProjectDate?: Timestamp;

  // Additional Contacts
  additionalContacts?: ClientContact[];

  // Notes & Tags
  notes?: string;
  tags?: string[];

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastModifiedBy?: string;
}

export interface ClientFilter {
  clientTypes?: ClientType[];
  statuses?: ClientStatus[];
  industries?: string[];
  searchTerm?: string;
  minValue?: number;
  maxValue?: number;
}

export interface ClientSortOptions {
  field: 'name' | 'totalValue' | 'projectsCount' | 'lastProjectDate' | 'createdAt';
  direction: 'asc' | 'desc';
}
