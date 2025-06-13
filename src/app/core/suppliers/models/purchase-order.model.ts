import { Timestamp } from '@angular/fire/firestore';
import { Address, PaymentTerms } from './supplier.model';

export interface PurchaseOrder {
  id?: string;
  poNumber: string;

  supplierId: string;
  supplierName: string;
  supplierContact: {
    name: string;
    email: string;
    phone: string;
  };

  projectId?: string;
  boqItemId?: string;

  items: PurchaseOrderItem[];

  subtotal: number;
  tax: number;
  shipping: number;
  totalAmount: number;
  paymentTerms: PaymentTerms;

  status: POStatus;

  createdAt: Timestamp | Date;
  requiredBy: Timestamp | Date;
  approvedAt?: Timestamp | Date;
  approvedBy?: string;

  deliveryAddress: Address;
  deliveryInstructions?: string;

  trackingNumber?: string;
  expectedDelivery?: Timestamp | Date;
  actualDelivery?: Timestamp | Date;

  internalNotes?: string;
  supplierNotes?: string;

  attachments?: string[];
}

export interface PurchaseOrderItem {
  itemId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  boqItemId?: string;
}

export enum POStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  PARTIAL_DELIVERY = 'partial_delivery',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface POFilter {
  status?: POStatus;
  supplierId?: string;
  projectId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}
