# Suppliers Module Implementation Plan

## Overview
The Suppliers Module is a comprehensive system for managing supplier relationships, capabilities, and interactions within the FibreFlow application. It integrates with Projects, BOQ, and RFQ modules while providing suppliers with their own portal access.

## 1. Data Models

### 1.1 Core Supplier Model
```typescript
interface Supplier {
  id?: string;
  // Basic Information
  companyName: string;
  registrationNumber?: string;
  taxNumber?: string;
  
  // Contact Information
  primaryEmail: string;
  primaryPhone: string;
  website?: string;
  
  // Address
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  
  // Categories & Services
  categories: SupplierCategory[]; // ['electrical', 'plumbing', 'civil', etc.]
  products: string[]; // List of products/services they provide
  
  // Coverage
  serviceAreas: ServiceArea[];
  
  // Financial Information
  paymentTerms: PaymentTerms;
  creditLimit?: number;
  currentBalance?: number;
  
  // Status
  status: SupplierStatus; // 'active', 'inactive', 'suspended', 'pending'
  verificationStatus: VerificationStatus; // 'unverified', 'pending', 'verified'
  
  // Metadata
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string; // userId
  
  // Portal Access
  portalEnabled: boolean;
  lastLogin?: Timestamp | Date;
}

interface SupplierContact {
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

interface ServiceArea {
  city: string;
  state: string;
  radius?: number; // in km
}

interface PaymentTerms {
  termDays: number; // e.g., 30 for NET30
  termType: 'NET' | 'COD' | 'PREPAID' | 'CUSTOM';
  customTerms?: string;
  earlyPaymentDiscount?: {
    percentage: number;
    withinDays: number;
  };
}

enum SupplierCategory {
  ELECTRICAL = 'electrical',
  PLUMBING = 'plumbing',
  CIVIL = 'civil',
  MECHANICAL = 'mechanical',
  HVAC = 'hvac',
  NETWORKING = 'networking',
  FIBRE_OPTIC = 'fibre_optic',
  GENERAL_CONTRACTOR = 'general_contractor'
}

enum SupplierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}
```

### 1.2 Supplier-Project Relationship
```typescript
interface SupplierProjectAssignment {
  id?: string;
  supplierId: string;
  supplierName: string; // Denormalized
  projectId: string;
  projectName: string; // Denormalized
  
  assignedBy: string; // userId
  assignedAt: Timestamp | Date;
  
  status: AssignmentStatus; // 'active', 'completed', 'terminated'
  role: string; // 'primary', 'secondary', 'subcontractor'
  
  // Performance tracking (for future)
  performanceRating?: number;
  notesOnPerformance?: string;
}
```

### 1.3 Supplier-BOQ Integration
```typescript
interface SupplierBOQCapability {
  id?: string;
  supplierId: string;
  boqItemId: string;
  boqCategoryId: string;
  
  canSupply: boolean;
  leadTimeDays: number;
  minimumOrderQuantity?: number;
  
  // Pricing - Product Catalog approach
  pricing: SupplierPricing;
  
  lastUpdated: Timestamp | Date;
}

interface SupplierPricing {
  basePrice: number;
  currency: string;
  priceUnit: string; // 'per piece', 'per meter', etc.
  
  // Bulk pricing tiers
  bulkPricing?: BulkPricingTier[];
  
  // Time-based pricing
  validFrom: Timestamp | Date;
  validUntil?: Timestamp | Date;
  
  // Special conditions
  specialConditions?: string;
}

interface BulkPricingTier {
  minQuantity: number;
  maxQuantity?: number;
  pricePerUnit: number;
  discountPercentage?: number;
}
```

### 1.4 Purchase Order Management
```typescript
interface PurchaseOrder {
  id?: string;
  poNumber: string; // Auto-generated
  
  // Supplier Information
  supplierId: string;
  supplierName: string; // Denormalized
  supplierContact: {
    name: string;
    email: string;
    phone: string;
  };
  
  // Order Details
  projectId?: string; // Optional - for project-specific POs
  boqItemId?: string; // When ordering based on BOQ
  
  items: PurchaseOrderItem[];
  
  // Financial
  subtotal: number;
  tax: number;
  shipping: number;
  totalAmount: number;
  paymentTerms: PaymentTerms;
  
  // Status
  status: POStatus;
  
  // Dates
  createdAt: Timestamp | Date;
  requiredBy: Timestamp | Date;
  approvedAt?: Timestamp | Date;
  approvedBy?: string;
  
  // Delivery
  deliveryAddress: Address;
  deliveryInstructions?: string;
  
  // Tracking
  trackingNumber?: string;
  expectedDelivery?: Timestamp | Date;
  actualDelivery?: Timestamp | Date;
  
  // Notes
  internalNotes?: string;
  supplierNotes?: string;
  
  // Attachments
  attachments?: string[]; // URLs
}

interface PurchaseOrderItem {
  itemId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  boqItemId?: string; // Reference to BOQ if applicable
}

enum POStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  PARTIAL_DELIVERY = 'partial_delivery',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}
```

### 1.5 Communication Tracking
```typescript
interface SupplierCommunication {
  id?: string;
  supplierId: string;
  supplierName: string; // Denormalized
  
  type: CommunicationType; // 'email', 'phone', 'meeting', 'portal_message'
  direction: 'inbound' | 'outbound';
  
  subject: string;
  content: string;
  
  // Related entities
  relatedTo?: {
    type: 'project' | 'po' | 'rfq' | 'quote' | 'general';
    id?: string;
    name?: string;
  };
  
  // Participants
  from: {
    userId?: string;
    email: string;
    name: string;
  };
  to: {
    contactId?: string;
    email: string;
    name: string;
  }[];
  cc?: string[];
  
  // Metadata
  sentAt: Timestamp | Date;
  readAt?: Timestamp | Date;
  
  // Attachments
  attachments?: {
    name: string;
    url: string;
    size: number;
  }[];
  
  // Follow-up
  requiresFollowUp: boolean;
  followUpDate?: Timestamp | Date;
  followUpCompleted?: boolean;
}

enum CommunicationType {
  EMAIL = 'email',
  PHONE = 'phone',
  MEETING = 'meeting',
  PORTAL_MESSAGE = 'portal_message'
}
```

### 1.6 Payment History
```typescript
interface SupplierPayment {
  id?: string;
  supplierId: string;
  supplierName: string; // Denormalized
  
  // Related PO
  purchaseOrderId: string;
  poNumber: string;
  
  // Payment Details
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  
  // Dates
  invoiceDate: Timestamp | Date;
  dueDate: Timestamp | Date;
  paymentDate: Timestamp | Date;
  
  // Status
  status: PaymentStatus;
  
  // Reference Numbers
  invoiceNumber: string;
  paymentReference?: string;
  bankReference?: string;
  
  // Notes
  notes?: string;
  
  // Metadata
  processedBy: string; // userId
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  OTHER = 'other'
}

enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
```

### 1.7 Automated Ordering (Stock Management Integration)
```typescript
interface AutoOrderRule {
  id?: string;
  name: string;
  isActive: boolean;
  
  // Trigger Conditions
  stockItemId: string;
  stockItemName: string; // Denormalized
  minimumStockLevel: number;
  reorderPoint: number;
  reorderQuantity: number;
  
  // Supplier Selection
  supplierSelectionMethod: 'best_price' | 'preferred' | 'fastest_delivery';
  preferredSuppliers?: string[]; // supplierIds in order of preference
  
  // BOQ Integration
  boqItemId?: string; // Link to BOQ for pricing
  
  // Constraints
  maxOrderValue?: number;
  requiresApproval: boolean;
  approvalThreshold?: number;
  
  // History
  lastTriggered?: Timestamp | Date;
  lastOrderId?: string;
  
  createdAt: Timestamp | Date;
  createdBy: string;
  updatedAt: Timestamp | Date;
}

interface AutoOrderRequest {
  id?: string;
  ruleId: string;
  ruleName: string;
  
  // Trigger Info
  triggerReason: string;
  currentStockLevel: number;
  requestedQuantity: number;
  
  // Supplier Quotes
  quotes: AutoOrderQuote[];
  selectedQuoteId?: string;
  
  // Status
  status: AutoOrderStatus;
  
  // Approval
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: Timestamp | Date;
  rejectionReason?: string;
  
  // Result
  purchaseOrderId?: string;
  
  createdAt: Timestamp | Date;
  processedAt?: Timestamp | Date;
}

interface AutoOrderQuote {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  totalPrice: number;
  deliveryDays: number;
  validUntil: Timestamp | Date;
}

enum AutoOrderStatus {
  PENDING = 'pending',
  GETTING_QUOTES = 'getting_quotes',
  AWAITING_APPROVAL = 'awaiting_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ORDER_PLACED = 'order_placed',
  CANCELLED = 'cancelled'
}
```

### 1.8 Supplier Portal Models
```typescript
interface SupplierPortalUser {
  id?: string;
  supplierId: string;
  contactId: string;
  
  email: string;
  hashedPassword: string; // Firebase Auth will handle this
  
  role: PortalUserRole; // 'admin', 'user'
  permissions: string[];
  
  isActive: boolean;
  lastLogin?: Timestamp | Date;
  createdAt: Timestamp | Date;
}

interface SupplierQuote {
  id?: string;
  supplierId: string;
  rfqId: string;
  projectId: string;
  
  items: QuoteItem[];
  totalAmount: number;
  validUntil: Timestamp | Date;
  
  status: QuoteStatus; // 'draft', 'submitted', 'accepted', 'rejected'
  
  submittedAt?: Timestamp | Date;
  submittedBy: string; // portalUserId
  
  notes?: string;
  attachments?: string[]; // URLs to uploaded documents
}
```

## 2. Firebase Collections Structure

```
suppliers/ (Collection)
  └── {supplierId}/ (Document)
      ├── contacts/ (Subcollection)
      │   └── {contactId}
      ├── boqCapabilities/ (Subcollection)
      │   └── {capabilityId}
      ├── documents/ (Subcollection)
      │   └── {documentId}
      ├── communications/ (Subcollection)
      │   └── {communicationId}
      ├── payments/ (Subcollection)
      │   └── {paymentId}
      └── quotes/ (Subcollection)
          └── {quoteId}

supplierProjectAssignments/ (Collection)
  └── {assignmentId}

supplierPortalUsers/ (Collection)
  └── {userId}

purchaseOrders/ (Collection)
  └── {poId}

autoOrderRules/ (Collection)
  └── {ruleId}

autoOrderRequests/ (Collection)
  └── {requestId}
```

## 3. Service Architecture

### 3.1 Core Supplier Service
```typescript
@Injectable({ providedIn: 'root' })
export class SupplierService {
  private firestore = inject(Firestore);
  private suppliersCollection = collection(this.firestore, 'suppliers') as CollectionReference<Supplier>;
  
  // CRUD Operations
  getSuppliers(filter?: SupplierFilter): Observable<Supplier[]>
  getSupplierById(id: string): Observable<Supplier | undefined>
  createSupplier(supplier: Omit<Supplier, 'id'>): Promise<string>
  updateSupplier(id: string, updates: Partial<Supplier>): Promise<void>
  deleteSupplier(id: string): Promise<void>
  
  // Contact Management
  getSupplierContacts(supplierId: string): Observable<SupplierContact[]>
  addContact(supplierId: string, contact: Omit<SupplierContact, 'id'>): Promise<string>
  updateContact(supplierId: string, contactId: string, updates: Partial<SupplierContact>): Promise<void>
  deleteContact(supplierId: string, contactId: string): Promise<void>
  
  // Search & Filter
  searchSuppliers(query: string): Observable<Supplier[]>
  getSuppliersByCategory(categories: SupplierCategory[]): Observable<Supplier[]>
  getSuppliersByServiceArea(area: ServiceArea): Observable<Supplier[]>
  
  // Financial
  updateCreditLimit(supplierId: string, limit: number): Promise<void>
  getSupplierBalance(supplierId: string): Observable<number>
}
```

### 3.2 Purchase Order Service
```typescript
@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private firestore = inject(Firestore);
  private poCollection = collection(this.firestore, 'purchaseOrders') as CollectionReference<PurchaseOrder>;
  
  // CRUD Operations
  createPurchaseOrder(po: Omit<PurchaseOrder, 'id'>): Promise<string>
  updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<void>
  getPurchaseOrder(id: string): Observable<PurchaseOrder | undefined>
  getPurchaseOrders(filter?: POFilter): Observable<PurchaseOrder[]>
  
  // Workflow
  submitForApproval(poId: string): Promise<void>
  approvePurchaseOrder(poId: string, userId: string): Promise<void>
  rejectPurchaseOrder(poId: string, reason: string): Promise<void>
  sendToSupplier(poId: string): Promise<void>
  
  // Status Updates
  updateDeliveryStatus(poId: string, status: POStatus, trackingInfo?: any): Promise<void>
  markAsDelivered(poId: string, deliveryDate: Date): Promise<void>
  
  // Supplier specific
  getSupplierPurchaseOrders(supplierId: string): Observable<PurchaseOrder[]>
  
  // Auto-generation
  generatePONumber(): string
}
```

### 3.3 Communication Service
```typescript
@Injectable({ providedIn: 'root' })
export class SupplierCommunicationService {
  private firestore = inject(Firestore);
  
  // Communication Management
  logCommunication(supplierId: string, comm: Omit<SupplierCommunication, 'id'>): Promise<string>
  getCommunications(supplierId: string, filter?: CommunicationFilter): Observable<SupplierCommunication[]>
  markAsRead(supplierId: string, commId: string): Promise<void>
  
  // Email Integration
  sendEmail(to: string[], subject: string, content: string, attachments?: File[]): Promise<void>
  
  // Follow-ups
  getFollowUps(dueByDate?: Date): Observable<SupplierCommunication[]>
  markFollowUpComplete(supplierId: string, commId: string): Promise<void>
  
  // Search
  searchCommunications(query: string): Observable<SupplierCommunication[]>
}
```

### 3.4 Payment Service
```typescript
@Injectable({ providedIn: 'root' })
export class SupplierPaymentService {
  private firestore = inject(Firestore);
  
  // Payment Management
  recordPayment(supplierId: string, payment: Omit<SupplierPayment, 'id'>): Promise<string>
  getPayments(supplierId: string, filter?: PaymentFilter): Observable<SupplierPayment[]>
  updatePaymentStatus(supplierId: string, paymentId: string, status: PaymentStatus): Promise<void>
  
  // Payment History
  getPaymentHistory(supplierId: string, dateRange?: DateRange): Observable<SupplierPayment[]>
  getOutstandingPayments(supplierId: string): Observable<SupplierPayment[]>
  
  // Analytics
  getPaymentSummary(supplierId: string): Observable<PaymentSummary>
  getAgedPayables(): Observable<AgedPayables[]>
}
```

### 3.5 Auto Order Service
```typescript
@Injectable({ providedIn: 'root' })
export class AutoOrderService {
  private firestore = inject(Firestore);
  
  // Rule Management
  createAutoOrderRule(rule: Omit<AutoOrderRule, 'id'>): Promise<string>
  updateAutoOrderRule(id: string, updates: Partial<AutoOrderRule>): Promise<void>
  getAutoOrderRules(): Observable<AutoOrderRule[]>
  toggleRuleStatus(ruleId: string, isActive: boolean): Promise<void>
  
  // Order Processing
  checkStockLevels(): Promise<void> // Called by scheduler
  createAutoOrderRequest(rule: AutoOrderRule, currentStock: number): Promise<string>
  getQuotesForAutoOrder(request: AutoOrderRequest): Promise<AutoOrderQuote[]>
  selectBestQuote(quotes: AutoOrderQuote[], method: string): AutoOrderQuote
  
  // Approval Workflow
  getRequestsAwaitingApproval(): Observable<AutoOrderRequest[]>
  approveAutoOrder(requestId: string, userId: string): Promise<void>
  rejectAutoOrder(requestId: string, reason: string): Promise<void>
  
  // Execution
  convertToPurchaseOrder(requestId: string): Promise<string>
}
```

### 3.6 Supplier-BOQ Integration Service
```typescript
@Injectable({ providedIn: 'root' })
export class SupplierBOQService {
  // Capability Management
  updateSupplierCapability(capability: SupplierBOQCapability): Promise<void>
  getSupplierCapabilities(supplierId: string): Observable<SupplierBOQCapability[]>
  getSuppliersForBOQItem(boqItemId: string): Observable<SupplierWithCapability[]>
  
  // Pricing Management
  updateSupplierPricing(supplierId: string, boqItemId: string, pricing: SupplierPricing): Promise<void>
  getSupplierPricing(supplierId: string, boqItemId: string): Observable<SupplierPricing>
  getBestPriceForItem(boqItemId: string, quantity: number): Observable<BestPriceResult>
  
  // RFQ Automation
  getEligibleSuppliersForRFQ(rfqCriteria: RFQCriteria): Observable<Supplier[]>
}
```

### 3.7 Supplier Portal Service
```typescript
@Injectable({ providedIn: 'root' })
export class SupplierPortalService {
  // Authentication
  authenticateSupplierUser(email: string, password: string): Promise<SupplierPortalUser>
  
  // Quote Management
  submitQuote(quote: Omit<SupplierQuote, 'id'>): Promise<string>
  getSupplierQuotes(supplierId: string): Observable<SupplierQuote[]>
  updateQuoteStatus(quoteId: string, status: QuoteStatus): Promise<void>
  
  // Order History
  getSupplierOrders(supplierId: string): Observable<PurchaseOrder[]>
  
  // Profile Management
  updateSupplierProfile(supplierId: string, updates: Partial<Supplier>): Promise<void>
  updateProductCatalog(supplierId: string, products: string[]): Promise<void>
}
```

## 4. API Endpoints / Firebase Functions

### 4.1 Supplier Management
- `GET /suppliers` - List all suppliers with filters
- `GET /suppliers/:id` - Get supplier details
- `POST /suppliers` - Create new supplier
- `PUT /suppliers/:id` - Update supplier
- `DELETE /suppliers/:id` - Delete supplier

### 4.2 Contact Management
- `GET /suppliers/:id/contacts` - List supplier contacts
- `POST /suppliers/:id/contacts` - Add contact
- `PUT /suppliers/:id/contacts/:contactId` - Update contact
- `DELETE /suppliers/:id/contacts/:contactId` - Delete contact

### 4.3 Purchase Orders
- `GET /purchase-orders` - List POs with filters
- `GET /purchase-orders/:id` - Get PO details
- `POST /purchase-orders` - Create PO
- `PUT /purchase-orders/:id` - Update PO
- `POST /purchase-orders/:id/approve` - Approve PO
- `POST /purchase-orders/:id/send` - Send to supplier

### 4.4 Communications
- `GET /suppliers/:id/communications` - Get communication history
- `POST /suppliers/:id/communications` - Log new communication
- `POST /communications/send-email` - Send email to supplier

### 4.5 Payments
- `GET /suppliers/:id/payments` - Get payment history
- `POST /suppliers/:id/payments` - Record payment
- `GET /payments/outstanding` - Get all outstanding payments
- `GET /payments/aged-payables` - Get aged payables report

### 4.6 Auto Ordering
- `GET /auto-order-rules` - List all rules
- `POST /auto-order-rules` - Create rule
- `PUT /auto-order-rules/:id` - Update rule
- `POST /auto-order-rules/:id/toggle` - Enable/disable rule
- `GET /auto-order-requests` - List requests
- `POST /auto-order-requests/:id/approve` - Approve request

### 4.7 Project Integration
- `POST /projects/:projectId/suppliers` - Assign supplier to project
- `GET /projects/:projectId/suppliers` - Get project suppliers
- `DELETE /projects/:projectId/suppliers/:assignmentId` - Remove supplier

### 4.8 BOQ Integration
- `GET /boq-items/:itemId/suppliers` - Get suppliers for BOQ item
- `PUT /suppliers/:id/boq-capabilities` - Update supplier capabilities
- `GET /boq-items/:itemId/best-price` - Get best price for quantity

### 4.9 RFQ Integration
- `POST /rfqs/:rfqId/send-to-suppliers` - Send RFQ to eligible suppliers
- `GET /rfqs/:rfqId/supplier-quotes` - Get quotes for RFQ

### 4.10 Portal Endpoints
- `POST /supplier-portal/login` - Supplier login
- `GET /supplier-portal/profile` - Get supplier profile
- `PUT /supplier-portal/profile` - Update profile
- `POST /supplier-portal/quotes` - Submit quote
- `GET /supplier-portal/orders` - Get order history
- `GET /supplier-portal/payments` - Get payment history

## 5. Security Rules

```javascript
// Firestore Security Rules
match /suppliers/{supplierId} {
  // Staff can read all suppliers
  allow read: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager', 'staff'];
  
  // Only admins can create/update/delete
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

match /suppliers/{supplierId}/contacts/{contactId} {
  // Same as parent
  allow read: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager', 'staff'];
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

match /purchaseOrders/{poId} {
  // Staff can read
  allow read: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager', 'staff'];
  
  // Managers and admins can write
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager'];
}

match /suppliers/{supplierId}/communications/{commId} {
  // Staff can read and create
  allow read, create: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager', 'staff'];
  
  // Only admins can update/delete
  allow update, delete: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

match /supplierPortalUsers/{userId} {
  // Suppliers can read their own data
  allow read: if request.auth != null && 
    (request.auth.uid == userId || 
     get(/databases/$(database)/documents/supplierPortalUsers/$(request.auth.uid)).data.supplierId == resource.data.supplierId);
  
  // Only admins can write
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

## 6. Integration Points

### 6.1 Project Module Integration
- When creating a project, allow selection of suppliers
- Display assigned suppliers in project details
- Track supplier performance per project
- Link POs to specific projects

### 6.2 BOQ Module Integration
- When creating BOQ items, link to supplier capabilities
- Show available suppliers for each BOQ item
- Calculate costs based on supplier pricing
- Auto-generate POs from BOQ requirements

### 6.3 RFQ Module Integration
- Auto-select suppliers based on BOQ items in RFQ
- Send RFQ notifications to eligible suppliers
- Collect and compare quotes from suppliers
- Convert accepted quotes to POs

### 6.4 Stock/Inventory Integration
- Monitor stock levels for auto-ordering
- Create POs when stock is low
- Update stock on PO delivery
- Track stock costs by supplier

## 7. UI Components

### 7.1 Admin/Staff Components
- `SupplierListComponent` - Table view of all suppliers
- `SupplierDetailComponent` - Detailed supplier information
- `SupplierFormComponent` - Create/edit supplier
- `SupplierContactsComponent` - Manage supplier contacts
- `SupplierSelectionComponent` - For project/RFQ assignment
- `PurchaseOrderListComponent` - View all POs
- `PurchaseOrderFormComponent` - Create/edit POs
- `PurchaseOrderApprovalComponent` - Approve/reject POs
- `CommunicationLogComponent` - View/add communications
- `PaymentHistoryComponent` - View payment records
- `AutoOrderRulesComponent` - Manage auto-order rules
- `AutoOrderRequestsComponent` - Review/approve requests

### 7.2 Supplier Portal Components
- `SupplierLoginComponent` - Portal authentication
- `SupplierDashboardComponent` - Overview of RFQs, quotes, orders
- `QuoteFormComponent` - Submit quotes for RFQs
- `OrderHistoryComponent` - View past orders
- `PaymentStatusComponent` - View payment status
- `SupplierProfileComponent` - Update company information
- `ProductCatalogComponent` - Manage products/pricing
- `DocumentUploadComponent` - Upload compliance docs

## 8. Email Templates

### 8.1 Supplier Notifications
- New RFQ notification
- PO sent notification
- Payment processed notification
- Document expiry reminder
- Portal access credentials

### 8.2 Internal Notifications
- New supplier registered
- PO approval required
- Auto-order approval required
- Payment overdue alert
- Low stock alert (triggers auto-order)

## 9. Implementation Phases

### Phase 1: Core Supplier Management (Week 1-2) ✅ COMPLETED
- [x] Create data models and interfaces
  - Created supplier.model.ts with comprehensive Supplier interface
  - Created supplier-contact.model.ts for contact management
  - Created supplier-project.model.ts for project assignments
  - Created purchase-order.model.ts for PO management
- [x] Implement SupplierService with CRUD operations
  - Full CRUD operations for suppliers
  - Contact management methods
  - Search and filtering capabilities
  - Category and service area queries
- [x] Create basic UI components for supplier management
  - SupplierListComponent with search, filters, and table view
  - SupplierFormComponent with multi-step form for create/edit
  - SupplierDetailComponent with tabs for overview, financial, contacts
  - SupplierContactsComponent (placeholder for Phase 2)
- [x] Set up Firebase collections and indexes
  - Added indexes for status, categories, and verification queries
  - Integrated routes into main app
  - Added Suppliers to navigation menu

### Phase 2: Contact Management (Week 2-3)
- [ ] Implement contact subcollection
- [ ] Create contact management UI
- [ ] Add contact search and filtering

### Phase 3: Purchase Order System (Week 3-4)
- [ ] Create PO data models
- [ ] Implement PurchaseOrderService
- [ ] Build PO creation and approval workflow
- [ ] Create PO UI components

### Phase 4: Communication Tracking (Week 4-5)
- [ ] Implement communication logging
- [ ] Create email integration
- [ ] Build communication history UI
- [ ] Add follow-up management

### Phase 5: Payment Management (Week 5-6)
- [ ] Create payment tracking models
- [ ] Implement PaymentService
- [ ] Build payment history UI
- [ ] Add payment analytics

### Phase 6: BOQ Integration (Week 6-7)
- [ ] Create SupplierBOQService
- [ ] Link suppliers to BOQ items
- [ ] Implement pricing management
- [ ] Build supplier capability UI

### Phase 7: Auto-Ordering System (Week 7-8)
- [ ] Create auto-order rules engine
- [ ] Implement stock monitoring
- [ ] Build approval workflow
- [ ] Create auto-order management UI

### Phase 8: Project & RFQ Integration (Week 8-9)
- [ ] Integrate with Project module
- [ ] Implement supplier assignment
- [ ] Connect with RFQ module
- [ ] Build quote comparison tools

### Phase 9: Supplier Portal (Week 9-11)
- [ ] Set up supplier authentication
- [ ] Create portal UI components
- [ ] Implement quote submission
- [ ] Add order/payment history views
- [ ] Build profile management

### Phase 10: Testing & Optimization (Week 11-12)
- [ ] Write unit tests for all services
- [ ] Perform integration testing
- [ ] Optimize queries and indexes
- [ ] Security testing
- [ ] Performance testing
- [ ] User acceptance testing

## 10. Future Enhancements
- Supplier performance ratings and reviews
- Automated supplier onboarding workflow
- Document management system with expiry tracking
- Advanced analytics and reporting dashboards
- Mobile app for suppliers
- API for third-party integrations
- Supplier scorecards
- Contract management
- Quality control tracking
- Delivery performance metrics
- Automated payment processing
- Multi-currency support
- Supplier collaboration tools
- Predictive ordering based on historical data

## 11. Dependencies
- Angular 18+
- Angular Material for UI components
- Firebase/Firestore for backend
- Firebase Auth for supplier portal authentication
- RxJS for reactive programming
- Angular Forms for data entry
- Chart.js for analytics visualizations
- Email service (SendGrid/Firebase Extensions)
- PDF generation for POs and reports

## 12. Testing Strategy
- Unit tests for all services
- Integration tests for Firebase operations
- E2E tests for critical workflows
- Mock data for development
- Load testing for large supplier databases
- Security penetration testing
- Portal user experience testing
- Email delivery testing
- Auto-order simulation testing