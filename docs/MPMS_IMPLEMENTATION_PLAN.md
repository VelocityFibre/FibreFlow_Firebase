# Material & Project Management System (MPMS) Implementation Plan

## Executive Summary
This document outlines the implementation plan for transforming FibreFlow into a comprehensive Material & Project Management System (MPMS) that handles both unit-based items (drop cables, poles) and length-based materials (ADSS cables, micro-blown cables).

## Current State Analysis

### What We Already Have in FibreFlow:

1. **Client Management** ✅
   - Client CRUD operations
   - Client-Project associations
   - Contact information management

2. **Project Management** ✅
   - Project creation and management
   - Project status tracking
   - Client associations
   - Project phases and tasks

3. **BOQ Management Module** ✅ (Partially)
   - Basic BOQ structure
   - Import/Export functionality
   - Project-specific BOQs
   - Item management

4. **Stock Management** ✅ (Basic)
   - Stock items tracking
   - Stock movements
   - Basic inventory operations

5. **User Authentication & Roles** ✅
   - User management
   - Role-based access control
   - Staff management

6. **Suppliers Module** ✅ (Basic)
   - Supplier management
   - Supplier contacts

### What Needs to Be Built/Enhanced:

1. **Master Material Registry** 🔴
   - Comprehensive material database
   - Unit of Measure support (each, meters, feet)
   - Material categorization
   - Item codes and descriptions
   - Cost tracking per UoM

2. **Enhanced BOQ Module** 🟡
   - Link to Master Materials
   - Quantity calculations based on UoM
   - Business rule applications
   - SOW integration

3. **Advanced Inventory Management** 🟡
   - Stock tracking per UoM
   - Low stock alerts
   - Material allocation to projects
   - Stock reconciliation

4. **Procurement & Ordering** 🔴
   - Shortage identification
   - Purchase order generation
   - Order tracking
   - Supplier integration

5. **SOW Management** 🔴
   - Document upload/storage
   - KPI extraction
   - Deliverable definition

6. **Reporting & Analytics** 🟡
   - Material status dashboards
   - Stock level reports
   - Procurement reports

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Establish core data structures and enhance existing modules

#### Week 1: Master Material Registry
1. **Create Material Model**
   ```typescript
   interface MasterMaterial {
     itemCode: string; // Primary Key
     description: string;
     category: string;
     subcategory?: string;
     unitOfMeasure: 'each' | 'meters' | 'feet' | 'units';
     unitCost: number;
     defaultSpoolLength?: number; // For cables
     supplierId?: string;
     specifications?: string;
     minimumStock?: number;
     createdAt: Date;
     updatedAt: Date;
   }
   ```

2. **Create Material Categories**
   - Drop Cables
   - Feeder Cables (ADSS)
   - Distribution Cables
   - Underground Cables
   - Poles
   - Connectors
   - Ducts

3. **Build Material Management UI**
   - Material list with filters
   - Add/Edit material forms
   - Import/Export functionality
   - Category management

#### Week 2: Enhance Stock Module
1. **Update Stock Model**
   ```typescript
   interface StockItem {
     id?: string;
     itemCode: string; // FK to MasterMaterial
     currentQuantity: number;
     allocatedQuantity: number;
     availableQuantity: number;
     lastUpdated: Date;
     location?: string;
     batchNumber?: string;
   }
   ```

2. **Stock Operations**
   - Receive stock (increase quantity)
   - Issue stock (decrease quantity)
   - Transfer stock between locations
   - Stock adjustments

### Phase 2: SOW & Enhanced BOQ (Weeks 3-4)

#### Week 3: SOW Management
1. **Create SOW Module**
   ```typescript
   interface ScopeOfWork {
     id?: string;
     projectId: string;
     documentUrl?: string;
     deliverables: Deliverable[];
     kpis: KPI[];
     createdAt: Date;
     status: 'draft' | 'approved' | 'revised';
   }

   interface Deliverable {
     id?: string;
     description: string;
     quantity: number;
     unitOfMeasure: string;
     relatedMaterialCode?: string;
   }
   ```

2. **SOW Features**
   - Document upload to Firebase Storage
   - Deliverable definition UI
   - KPI management
   - Link deliverables to materials

#### Week 4: Enhanced BOQ Module
1. **Update BOQ Model**
   ```typescript
   interface BOQItem {
     id?: string;
     boqId: string;
     itemCode: string; // FK to MasterMaterial
     description: string;
     specification?: string;
     unit: string;
     requiredQuantity: number;
     allocatedQuantity: number;
     unitPrice: number;
     totalPrice: number;
     sowDeliverableId?: string; // Link to SOW
   }
   ```

2. **BOQ Enhancements**
   - Auto-populate from SOW deliverables
   - Material selection from Master list
   - Quantity calculations based on business rules
   - Stock availability checking

### Phase 3: Procurement & Advanced Features (Weeks 5-6)

#### Week 5: Procurement Module
1. **Create Procurement Models**
   ```typescript
   interface PurchaseOrder {
     id?: string;
     poNumber: string;
     supplierId: string;
     projectId?: string;
     items: PurchaseOrderItem[];
     status: 'draft' | 'sent' | 'partial' | 'complete';
     totalAmount: number;
     createdAt: Date;
   }

   interface PurchaseOrderItem {
     itemCode: string;
     orderedQuantity: number;
     receivedQuantity: number;
     unitPrice: number;
     totalPrice: number;
   }
   ```

2. **Procurement Features**
   - Shortage analysis (BOQ vs Stock)
   - Auto-generate POs from shortages
   - PO approval workflow
   - Receive goods functionality

#### Week 6: Reporting & Analytics
1. **Dashboard Components**
   - Project material status
   - Stock levels by category
   - Pending orders
   - Low stock alerts

2. **Reports**
   - Material requirement report
   - Stock movement report
   - Procurement status report
   - Project cost analysis

### Phase 4: Integration & Optimization (Weeks 7-8)

#### Week 7: Business Rules & Automation
1. **Implement Business Rules**
   - Drop cable calculations (houses × cables per house)
   - Pole requirements from SOW
   - Cable length calculations
   - Wastage factors

2. **Automation Features**
   - Auto-create BOQ from SOW
   - Stock allocation on project start
   - Reorder point notifications

#### Week 8: Testing & Refinement
1. **Data Migration**
   - Import existing material lists
   - Migrate current stock data
   - Historical data import

2. **User Training & Documentation**
   - User guides
   - Video tutorials
   - System documentation

## Implementation Steps by Module

### Step 1: Master Material Module
```bash
# 1.1 Create material models and service
src/app/features/materials/
├── models/
│   └── material.model.ts
├── services/
│   └── material.service.ts
├── components/
│   ├── material-list/
│   ├── material-form/
│   └── material-import/
└── materials.routes.ts

# 1.2 Add to navigation
# Update app-shell.component.ts to include Materials menu item

# 1.3 Create Firebase collections
# materials (for master list)
# material_categories
```

### Step 2: Enhanced Stock Module
```bash
# 2.1 Update existing stock models
src/app/features/stock/
├── models/
│   └── stock-item.model.ts (update)
├── components/
│   ├── stock-allocation/
│   └── stock-receive/

# 2.2 Link to Master Materials
# Update stock service to reference material master data
```

### Step 3: SOW Module
```bash
# 3.1 Create new SOW module
src/app/features/sow/
├── models/
│   ├── sow.model.ts
│   └── deliverable.model.ts
├── services/
│   └── sow.service.ts
├── components/
│   ├── sow-upload/
│   ├── deliverable-form/
│   └── kpi-management/
└── sow.routes.ts

# 3.2 Add to project detail page
# New tab for SOW management
```

### Step 4: Enhanced BOQ Module
```bash
# 4.1 Update BOQ models
src/app/features/boq-management/
├── models/
│   └── boq.model.ts (enhance)
├── components/
│   ├── boq-from-sow/
│   └── material-selector/

# 4.2 Add business rules engine
src/app/core/services/
└── business-rules.service.ts
```

### Step 5: Procurement Module
```bash
# 5.1 Create procurement module
src/app/features/procurement/
├── models/
│   ├── purchase-order.model.ts
│   └── shortage.model.ts
├── services/
│   └── procurement.service.ts
├── components/
│   ├── shortage-analysis/
│   ├── po-generator/
│   └── goods-receipt/
└── procurement.routes.ts
```

## Key Integration Points

1. **BOQ ↔ Master Materials**
   - BOQ items reference material itemCode
   - Auto-populate description, unit, price

2. **BOQ ↔ Stock**
   - Check availability when creating BOQ
   - Allocate stock to project
   - Update available quantity

3. **SOW ↔ BOQ**
   - Generate BOQ items from deliverables
   - Link quantities to requirements

4. **BOQ ↔ Procurement**
   - Identify shortages
   - Generate purchase requirements
   - Track order fulfillment

## Database Schema Updates

```typescript
// Firestore Collections
collections:
  - materials (master materials)
  - material_categories
  - stock_items (enhanced)
  - scope_of_works
  - deliverables
  - purchase_orders
  - purchase_order_items
  - stock_movements (enhanced)
  - material_allocations
```

## UI/UX Considerations

1. **Material Selection**
   - Searchable dropdown with categories
   - Show item code, description, UoM
   - Display current stock level

2. **Quantity Entry**
   - Clear UoM display
   - Validation based on UoM
   - Conversion helpers (if needed)

3. **Stock Status Indicators**
   - Green: In stock
   - Yellow: Low stock
   - Red: Out of stock
   - Blue: On order

## Business Rules Implementation

```typescript
// Example: Drop Cable Calculation
calculateDropCables(houses: number, cablesPerHouse: number = 1): number {
  return houses * cablesPerHouse;
}

// Example: Cable Wastage
calculateCableWithWastage(requiredLength: number, wastageFactor: number = 1.05): number {
  return Math.ceil(requiredLength * wastageFactor);
}

// Example: Pole Spacing
calculatePoles(distance: number, spacing: number = 50): number {
  return Math.ceil(distance / spacing) + 1;
}
```

## Success Metrics

1. **Efficiency Gains**
   - Time to create BOQ: -50%
   - Stock accuracy: >95%
   - Order processing time: -40%

2. **Data Quality**
   - Material code standardization: 100%
   - Stock reconciliation accuracy: >98%
   - BOQ-to-actual variance: <5%

3. **User Adoption**
   - Active users: 100% of project managers
   - BOQs created in system: 100%
   - Stock updates via system: 100%

## Risk Mitigation

1. **Data Migration**
   - Validate all imported data
   - Maintain backup of original files
   - Phased migration approach

2. **User Training**
   - Role-specific training sessions
   - Documentation and video guides
   - Sandbox environment for practice

3. **System Integration**
   - API versioning
   - Backward compatibility
   - Gradual feature rollout

## Next Steps

1. **Immediate Actions**
   - Review and approve implementation plan
   - Allocate development resources
   - Set up project timeline

2. **Week 1 Deliverables**
   - Master Material model implementation
   - Basic CRUD operations
   - Import functionality for existing data

3. **Communication Plan**
   - Weekly progress updates
   - Stakeholder demos every 2 weeks
   - User feedback sessions

This implementation plan provides a structured approach to building the MPMS while leveraging existing FibreFlow functionality. The phased approach ensures continuous delivery of value while minimizing disruption to current operations.