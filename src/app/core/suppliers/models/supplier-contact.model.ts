import { Timestamp } from '@angular/fire/firestore';

export interface SupplierContact {
  id?: string;
  supplierId: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  canAccessPortal: boolean;
  createdAt: Timestamp | Date;
}
