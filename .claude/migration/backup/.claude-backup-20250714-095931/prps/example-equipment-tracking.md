# Product Requirements Prompt - Equipment Tracking

*Example PRP showing how to use the template*

## Feature Overview

**Feature Name**: Equipment Tracking  
**Priority**: High  
**Target Completion**: 2 days  
**Type**: CRUD Feature

### Quick Summary
Track company equipment (tools, vehicles, devices) with assignment to staff/projects and maintenance schedules.

### Business Value
- **Problem it solves**: Lost equipment, unclear assignments, missed maintenance
- **Who benefits**: Project Managers, Field Technicians, Admin Staff
- **Success metric**: 90% equipment utilization visibility

---

## Technical Specification

### Data Model
```typescript
// Location: /src/app/core/models/equipment.model.ts
export interface Equipment {
  id: string;
  // Required fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Equipment-specific fields
  name: string;
  type: 'tool' | 'vehicle' | 'device' | 'other';
  serialNumber?: string;
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  assignedTo?: string;  // staffId
  assignedToProject?: string;  // projectId
  purchaseDate: Date;
  purchasePrice: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  notes?: string;
}
```

### Service Requirements
```typescript
// Location: /src/app/core/services/equipment.service.ts
@Injectable({ providedIn: 'root' })
export class EquipmentService extends BaseFirestoreService<Equipment> {
  constructor() {
    super('equipment');
  }
  
  // Additional methods
  getAvailable(): Observable<Equipment[]> {
    return this.getWithQuery([
      where('status', '==', 'available')
    ]);
  }
  
  getByProject(projectId: string): Observable<Equipment[]> {
    return this.getWithQuery([
      where('assignedToProject', '==', projectId)
    ]);
  }
  
  getMaintenanceDue(): Observable<Equipment[]> {
    const today = new Date();
    return this.getWithQuery([
      where('nextMaintenanceDate', '<=', today),
      where('status', '!=', 'retired')
    ]);
  }
}
```

### Component Structure

#### List Component
- Material table with columns: Name, Type, Status, Assigned To, Next Maintenance
- Status chips with colors (available=green, assigned=blue, maintenance=orange)
- Quick filters: All, Available, Assigned, Maintenance Due
- Search by name or serial number

#### Form Component
- Fields:
  - Name (required)
  - Type (select dropdown)
  - Serial Number (optional)
  - Status (select)
  - Assigned To (autocomplete staff selector)
  - Purchase Date/Price
  - Maintenance Schedule
- Validation:
  - Name required, min 3 chars
  - If assigned, assignedTo required
  - Next maintenance date must be future

---

## Implementation Checklist

### Phase 1: Data Layer (2 hours)
- [x] Create equipment.model.ts
- [x] Create equipment.service.ts with custom queries
- [x] Update Firestore rules for equipment collection
- [x] Test service methods

### Phase 2: Components (3 hours)
- [x] Generate components with CLI
- [x] Implement list with table and filters
- [x] Create form with validation
- [x] Add status badge component

### Phase 3: Integration (2 hours)
- [x] Add to navigation under "Resources"
- [x] Link from project detail page
- [x] Add equipment count to dashboard

### Phase 4: Testing & Deploy (1 hour)
- [x] Test all CRUD operations
- [x] Verify audit trail logs equipment changes
- [x] Check responsive on mobile
- [x] Deploy: `deploy "Added equipment tracking feature"`

---

## Actual Implementation Code

### Service Implementation
```typescript
@Injectable({ providedIn: 'root' })
export class EquipmentService extends BaseFirestoreService<Equipment> {
  constructor() {
    super('equipment');
  }
  
  override async create(equipment: Partial<Equipment>): Observable<Equipment> {
    const data = {
      ...equipment,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.auth.currentUser?.uid || 'system'
    };
    return super.create(data);
  }
}
```

### List Component Key Parts
```typescript
export class EquipmentListComponent {
  equipment$ = this.equipmentService.getAll();
  displayedColumns = ['name', 'type', 'status', 'assignedTo', 'actions'];
  
  constructor(
    private equipmentService: EquipmentService,
    private router: Router
  ) {}
  
  onAdd() {
    this.router.navigate(['/equipment/new']);
  }
}
```

---

## Lessons Learned
1. Started with basic CRUD, added filters later
2. Used existing patterns (BaseFirestoreService)
3. Deployed after each phase to test
4. Added to audit trail automatically via triggers