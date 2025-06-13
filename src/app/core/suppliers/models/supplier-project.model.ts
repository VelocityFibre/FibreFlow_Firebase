import { Timestamp } from '@angular/fire/firestore';

export interface SupplierProjectAssignment {
  id?: string;
  supplierId: string;
  supplierName: string;
  projectId: string;
  projectName: string;

  assignedBy: string;
  assignedAt: Timestamp | Date;

  status: AssignmentStatus;
  role: string;

  performanceRating?: number;
  notesOnPerformance?: string;
}

export enum AssignmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
}
