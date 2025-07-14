import { Timestamp } from '@angular/fire/firestore';

export interface Supplier {
  id?: string;
  companyName: string;
  registrationNumber?: string;
  taxNumber?: string;

  primaryEmail: string;
  primaryPhone: string;
  website?: string;

  address: Address;

  categories: SupplierCategory[];
  products: string[];

  serviceAreas: ServiceArea[];

  paymentTerms: PaymentTerms;
  creditLimit?: number;
  currentBalance?: number;

  status: SupplierStatus;
  verificationStatus: VerificationStatus;

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy: string;

  portalEnabled: boolean;
  lastLogin?: Timestamp | Date;

  // Performance metrics
  performanceMetrics?: PerformanceMetrics;

  // Related counts
  activePurchaseOrders?: number;
  productCount?: number;
  activeProjects?: number;
  totalSpend?: number;
  outstandingInvoices?: number;
  totalPurchaseOrders?: number;
}

export interface PerformanceMetrics {
  onTimeDeliveryRate: number;
  qualityScore: number;
  averageResponseTime?: number;
  completedOrders?: number;
  averageRating?: number;
  averageLeadTime?: number;
  defectRate?: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ServiceArea {
  city: string;
  state: string;
  radius?: number;
}

export interface PaymentTerms {
  termDays: number;
  termType: 'NET' | 'COD' | 'PREPAID' | 'CUSTOM';
  customTerms?: string;
  earlyPaymentDiscount?: {
    percentage: number;
    withinDays: number;
  };
}

export enum SupplierCategory {
  ELECTRICAL = 'electrical',
  PLUMBING = 'plumbing',
  CIVIL = 'civil',
  MECHANICAL = 'mechanical',
  HVAC = 'hvac',
  NETWORKING = 'networking',
  FIBRE_OPTIC = 'fibre_optic',
  GENERAL_CONTRACTOR = 'general_contractor',
}

export enum SupplierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
}

export interface SupplierFilter {
  status?: SupplierStatus;
  categories?: SupplierCategory[];
  searchQuery?: string;
  verificationStatus?: VerificationStatus;
}
