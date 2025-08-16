import { Timestamp } from '@angular/fire/firestore';
import { BaseEntity } from '../../../core/services/base-firestore.service';

export interface SOWData extends BaseEntity {
  projectId: string;
  version: number;
  status?: string;
  createdBy?: string;
  createdByEmail?: string;
  createdByName?: string;
  
  // Data arrays
  poles?: any[];
  drops?: any[];
  fibre?: any[];
  
  // Calculations
  calculations?: any;
  estimatedDays?: number;
  totalCost?: number;
}