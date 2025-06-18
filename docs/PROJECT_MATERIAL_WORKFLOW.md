# Project-Based Material Management Workflow

## Overview
Materials are managed per project, not in a central warehouse. Each project has its own BOQ, quotes, orders, and stock tracking.

## Workflow Stages

### 1. BOQ Import & Planning
```
Client BOQ (CSV/Excel) 
    ↓
Import to Project BOQ
    ↓
Review & Flag Items for Quotes
```

**Current Status**: ✅ Implemented
- BOQ import exists
- Items can be flagged with `needsQuote`

### 2. Quote Management
```
BOQ Items (needsQuote=true)
    ↓
Generate RFQ → Send to Suppliers
    ↓
Receive & Compare Quotes
    ↓
Select Best Quote → Create PO
```

**Current Status**: ❌ Needs Implementation
**Components Needed**:
- Quote request form
- Quote comparison view
- Quote to PO conversion

### 3. Material Ordering & Delivery
```
Purchase Order Created
    ↓
Track Order Status
    ↓
Materials Delivered to Site
    ↓
Add to Project Stock
```

**Current Status**: ⚠️ Partial
- Stock module exists but needs project-specific tracking
- Need delivery tracking

### 4. Project Stock Management
```
Materials in Project Stock
    ↓
Allocate to BOQ Items
    ↓
Track Usage
    ↓
Monitor Levels → Reorder if Low
```

**Current Status**: ⚠️ Needs Modification
- Stock should be project-specific
- Link stock to BOQ items

## Data Model Changes Needed

### 1. Quote Model
```typescript
interface Quote {
  id: string;
  projectId: string;
  boqItemId: string;
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  totalPrice: number;
  deliveryDays: number;
  validUntil: Date;
  status: 'draft' | 'sent' | 'received' | 'accepted' | 'rejected';
  notes?: string;
}
```

### 2. Purchase Order Model
```typescript
interface PurchaseOrder {
  id: string;
  projectId: string;
  boqItemId: string;
  quoteId?: string;
  supplierId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  orderDate: Date;
  expectedDelivery: Date;
  status: 'draft' | 'sent' | 'confirmed' | 'delivered' | 'cancelled';
}
```

### 3. Stock Item Changes
```typescript
interface StockItem {
  // ... existing fields
  projectId: string; // Make stock project-specific
  boqItemId?: string; // Link to BOQ item
  purchaseOrderId?: string; // Track source
  deliveryDate?: Date;
  location?: string; // Site location
}
```

## Implementation Priority

1. **Phase 1: Quote Management**
   - Add quote request functionality to BOQ items
   - Create quote comparison view
   - Link quotes to suppliers

2. **Phase 2: Project Stock**
   - Modify stock to be project-specific
   - Add delivery tracking
   - Link stock to BOQ items

3. **Phase 3: Usage Tracking**
   - Track material consumption
   - Update BOQ allocated quantities
   - Monitor stock levels

4. **Phase 4: Reporting**
   - Project material status dashboard
   - Cost vs budget analysis
   - Stock level alerts

## Benefits

1. **Clear Traceability**: BOQ → Quote → PO → Stock → Usage
2. **Project Isolation**: Each project manages its own materials
3. **Cost Control**: Track actual vs budgeted costs
4. **Inventory Accuracy**: Real-time stock levels per project
5. **Automated Reordering**: Alerts when stock is low

## Next Steps

1. Implement Quote management for BOQ items
2. Modify Stock module to be project-specific
3. Add material delivery tracking
4. Create usage tracking against BOQ