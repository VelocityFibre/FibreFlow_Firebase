export type QuoteStatus = 'draft' | 'submitted' | 'accepted' | 'rejected' | 'expired';

export interface Quote {
  id?: string;
  rfqId: string;
  supplierId: string;
  supplierName: string; // For display
  quoteNumber: string; // Supplier's quote reference
  status: QuoteStatus;
  validUntil: Date;
  deliveryDate: Date;
  paymentTerms: string;
  notes?: string;
  quotedItems: QuotedItem[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
}

export interface QuotedItem {
  boqItemId: string;
  itemCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  leadTime?: number; // in days
  notes?: string;
}
