# Phase 1 Implementation Guide: Master Materials & Enhanced Stock

## Week 1: Master Material Registry Implementation

### Day 1-2: Create Material Models and Services

#### Step 1: Create Material Model
```typescript
// src/app/features/materials/models/material.model.ts
export interface MasterMaterial {
  id?: string;
  itemCode: string; // Unique identifier (e.g., "DP-A-1-LB-86/73-2-10")
  description: string;
  category: MaterialCategory;
  subcategory?: string;
  unitOfMeasure: UnitOfMeasure;
  unitCost: number;
  specifications?: string;
  defaultSpoolLength?: number; // For cable materials
  supplierId?: string;
  supplierName?: string;
  minimumStockLevel?: number;
  maximumStockLevel?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

export type UnitOfMeasure = 'each' | 'meters' | 'feet' | 'units' | 'rolls' | 'boxes';

export type MaterialCategory = 
  | 'Drop Cable'
  | 'Feeder Cable - ADSS'
  | 'Distribution Cable - Mini ADSS'
  | 'Underground Cable - Micro Blown'
  | 'Pole - Creosote'
  | 'Pole - Steel'
  | 'Connector'
  | 'Duct'
  | 'Closure'
  | 'Accessories';

export interface MaterialFilter {
  category?: MaterialCategory;
  searchTerm?: string;
  isActive?: boolean;
  supplierId?: string;
}
```

#### Step 2: Create Material Service
```typescript
// src/app/features/materials/services/material.service.ts
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, deleteDoc, updateDoc, query, where, orderBy, CollectionReference } from '@angular/fire/firestore';
import { collectionData, docData } from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { MasterMaterial, MaterialFilter } from '../models/material.model';

@Injectable({
  providedIn: 'root'
})
export class MaterialService {
  private firestore = inject(Firestore);
  private materialsCollection: CollectionReference<MasterMaterial>;

  constructor() {
    this.materialsCollection = collection(this.firestore, 'materials') as CollectionReference<MasterMaterial>;
  }

  // Get all materials
  getMaterials(filter?: MaterialFilter): Observable<MasterMaterial[]> {
    let q = query(this.materialsCollection, orderBy('itemCode'));
    
    if (filter?.category) {
      q = query(q, where('category', '==', filter.category));
    }
    
    if (filter?.isActive !== undefined) {
      q = query(q, where('isActive', '==', filter.isActive));
    }
    
    return collectionData(q, { idField: 'id' });
  }

  // Get material by item code
  getMaterialByCode(itemCode: string): Observable<MasterMaterial | undefined> {
    const q = query(this.materialsCollection, where('itemCode', '==', itemCode));
    return collectionData(q, { idField: 'id' }).pipe(
      map(materials => materials[0])
    );
  }

  // Add new material
  addMaterial(material: Omit<MasterMaterial, 'id'>): Observable<void> {
    const docRef = doc(this.materialsCollection);
    const newMaterial = {
      ...material,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
    return from(setDoc(docRef, newMaterial));
  }

  // Update material
  updateMaterial(id: string, material: Partial<MasterMaterial>): Observable<void> {
    const docRef = doc(this.materialsCollection, id);
    const update = {
      ...material,
      updatedAt: new Date()
    };
    return from(updateDoc(docRef, update));
  }

  // Delete material (soft delete)
  deleteMaterial(id: string): Observable<void> {
    return this.updateMaterial(id, { isActive: false });
  }

  // Import materials from CSV
  importMaterials(materials: Omit<MasterMaterial, 'id'>[]): Observable<void> {
    const batch = materials.map(material => {
      const docRef = doc(this.materialsCollection);
      return setDoc(docRef, {
        ...material,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      });
    });
    return from(Promise.all(batch)).pipe(map(() => void 0));
  }
}
```

### Day 3-4: Create Material Management UI Components

#### Step 3: Material List Component
```typescript
// src/app/features/materials/components/material-list/material-list.component.ts
@Component({
  selector: 'app-material-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, SharedModule],
  template: `
    <div class="materials-container">
      <!-- Header -->
      <mat-card class="header-card">
        <div class="header-content">
          <h1>Master Materials</h1>
          <div class="header-actions">
            <button mat-button (click)="exportMaterials()">
              <mat-icon>download</mat-icon>
              Export
            </button>
            <button mat-button (click)="openImportDialog()">
              <mat-icon>upload</mat-icon>
              Import
            </button>
            <button mat-raised-button color="primary" (click)="openMaterialDialog()">
              <mat-icon>add</mat-icon>
              Add Material
            </button>
          </div>
        </div>
      </mat-card>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-form-field appearance="outline">
          <mat-label>Search</mat-label>
          <input matInput [(ngModel)]="searchTerm" (ngModelChange)="applyFilter()">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        
        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select [(ngModel)]="selectedCategory" (ngModelChange)="applyFilter()">
            <mat-option value="">All Categories</mat-option>
            <mat-option *ngFor="let cat of categories" [value]="cat">{{cat}}</mat-option>
          </mat-select>
        </mat-form-field>
      </mat-card>

      <!-- Materials Table -->
      <mat-card>
        <table mat-table [dataSource]="materials$ | async" class="materials-table">
          <!-- Item Code Column -->
          <ng-container matColumnDef="itemCode">
            <th mat-header-cell *matHeaderCellDef>Item Code</th>
            <td mat-cell *matCellDef="let material">{{material.itemCode}}</td>
          </ng-container>

          <!-- Description Column -->
          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Description</th>
            <td mat-cell *matCellDef="let material">
              <div class="description-cell">
                <span class="description">{{material.description}}</span>
                <span class="specifications" *ngIf="material.specifications">
                  {{material.specifications}}
                </span>
              </div>
            </td>
          </ng-container>

          <!-- Category Column -->
          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>Category</th>
            <td mat-cell *matCellDef="let material">
              <mat-chip>{{material.category}}</mat-chip>
            </td>
          </ng-container>

          <!-- UoM Column -->
          <ng-container matColumnDef="unitOfMeasure">
            <th mat-header-cell *matHeaderCellDef>UoM</th>
            <td mat-cell *matCellDef="let material">{{material.unitOfMeasure}}</td>
          </ng-container>

          <!-- Unit Cost Column -->
          <ng-container matColumnDef="unitCost">
            <th mat-header-cell *matHeaderCellDef>Unit Cost</th>
            <td mat-cell *matCellDef="let material">
              R{{material.unitCost | number:'1.2-2'}}
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let material">
              <button mat-icon-button [matMenuTriggerFor]="menu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="editMaterial(material)">
                  <mat-icon>edit</mat-icon>
                  <span>Edit</span>
                </button>
                <button mat-menu-item (click)="viewStock(material)">
                  <mat-icon>inventory</mat-icon>
                  <span>View Stock</span>
                </button>
                <button mat-menu-item (click)="deleteMaterial(material)" class="delete-option">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </mat-card>
    </div>
  `
})
export class MaterialListComponent implements OnInit {
  materials$!: Observable<MasterMaterial[]>;
  displayedColumns = ['itemCode', 'description', 'category', 'unitOfMeasure', 'unitCost', 'actions'];
  categories = Object.values(MaterialCategory);
  
  searchTerm = '';
  selectedCategory = '';
  
  constructor(
    private materialService: MaterialService,
    private dialog: MatDialog,
    private router: Router
  ) {}
  
  ngOnInit() {
    this.loadMaterials();
  }
  
  loadMaterials() {
    const filter: MaterialFilter = {
      category: this.selectedCategory as MaterialCategory || undefined,
      searchTerm: this.searchTerm || undefined,
      isActive: true
    };
    this.materials$ = this.materialService.getMaterials(filter);
  }
  
  // Additional methods...
}
```

### Day 5: Import/Export Functionality

#### Step 4: Material Import Component
```typescript
// src/app/features/materials/components/material-import/material-import.component.ts
interface CSVRow {
  'Item Code': string;
  'Description': string;
  'Category': string;
  'Unit': string;
  'Unit Cost': string;
  'Specifications'?: string;
  'Supplier'?: string;
  'Min Stock'?: string;
}

@Component({
  selector: 'app-material-import',
  template: `
    <h2 mat-dialog-title>Import Materials from CSV</h2>
    
    <mat-dialog-content>
      <div class="import-instructions">
        <p>Upload a CSV file with the following columns:</p>
        <ul>
          <li>Item Code (required)</li>
          <li>Description (required)</li>
          <li>Category (required)</li>
          <li>Unit (required): each, meters, feet, units, rolls, boxes</li>
          <li>Unit Cost (required)</li>
          <li>Specifications (optional)</li>
          <li>Supplier (optional)</li>
          <li>Min Stock (optional)</li>
        </ul>
      </div>
      
      <div class="file-upload" (click)="fileInput.click()">
        <input #fileInput type="file" accept=".csv" (change)="onFileSelected($event)" hidden>
        <mat-icon>cloud_upload</mat-icon>
        <p>Click to upload CSV file</p>
      </div>
      
      <div *ngIf="preview.length > 0" class="preview-section">
        <h3>Preview (first 5 rows)</h3>
        <table mat-table [dataSource]="preview">
          <!-- Dynamic columns based on CSV -->
        </table>
      </div>
      
      <mat-progress-bar *ngIf="importing" mode="indeterminate"></mat-progress-bar>
    </mat-dialog-content>
    
    <mat-dialog-actions>
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              [disabled]="!materials.length || importing"
              (click)="import()">
        Import {{materials.length}} Materials
      </button>
    </mat-dialog-actions>
  `
})
export class MaterialImportComponent {
  materials: MasterMaterial[] = [];
  preview: any[] = [];
  importing = false;
  
  parseCSV(csvText: string) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    this.materials = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length > 1) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });
        
        // Map CSV row to MasterMaterial
        const material: MasterMaterial = {
          itemCode: row['Item Code'],
          description: row['Description'],
          category: this.mapCategory(row['Category']),
          unitOfMeasure: this.mapUoM(row['Unit']),
          unitCost: parseFloat(row['Unit Cost']) || 0,
          specifications: row['Specifications'],
          minimumStockLevel: parseInt(row['Min Stock']) || 0,
          isActive: true
        };
        
        this.materials.push(material);
      }
    }
    
    this.preview = this.materials.slice(0, 5);
  }
  
  mapCategory(csvCategory: string): MaterialCategory {
    // Map CSV categories to our enum
    const categoryMap: Record<string, MaterialCategory> = {
      'Drop Cable': 'Drop Cable',
      'Feeder Cable': 'Feeder Cable - ADSS',
      'ADSS Cable': 'Feeder Cable - ADSS',
      'Distribution Cable': 'Distribution Cable - Mini ADSS',
      'Underground Cable': 'Underground Cable - Micro Blown',
      'Micro Blown': 'Underground Cable - Micro Blown',
      'Pole': 'Pole - Creosote',
      'Creosote Pole': 'Pole - Creosote',
      'Steel Pole': 'Pole - Steel',
      'Connector': 'Connector',
      'Duct': 'Duct',
      'Closure': 'Closure'
    };
    
    return categoryMap[csvCategory] || 'Accessories';
  }
  
  mapUoM(csvUnit: string): UnitOfMeasure {
    const unitMap: Record<string, UnitOfMeasure> = {
      'each': 'each',
      'EA': 'each',
      'meters': 'meters',
      'M': 'meters',
      'feet': 'feet',
      'FT': 'feet',
      'units': 'units',
      'rolls': 'rolls',
      'boxes': 'boxes'
    };
    
    return unitMap[csvUnit] || 'each';
  }
}
```

## Week 2: Enhanced Stock Module

### Day 1-2: Update Stock Models and Integration

#### Step 5: Enhanced Stock Model
```typescript
// src/app/features/stock/models/stock-item.model.ts
export interface StockItem {
  id?: string;
  itemCode: string; // FK to MasterMaterial
  materialDescription?: string; // Denormalized for performance
  currentQuantity: number;
  allocatedQuantity: number;
  availableQuantity: number; // currentQuantity - allocatedQuantity
  unitOfMeasure: UnitOfMeasure;
  location?: string;
  warehouse?: string;
  batchNumber?: string;
  expiryDate?: Date;
  lastStockTake?: Date;
  lastMovement?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StockMovement {
  id?: string;
  itemCode: string;
  movementType: StockMovementType;
  quantity: number;
  unitOfMeasure: UnitOfMeasure;
  fromLocation?: string;
  toLocation?: string;
  reference?: string; // PO number, project ID, etc.
  projectId?: string;
  notes?: string;
  performedBy: string;
  performedAt: Date;
}

export type StockMovementType = 
  | 'receipt'      // Goods received
  | 'issue'        // Issued to project
  | 'return'       // Returned from project
  | 'adjustment'   // Stock adjustment
  | 'transfer'     // Transfer between locations
  | 'allocation'   // Allocated to project (reserved)
  | 'deallocation' // Deallocated from project;

export interface StockAllocation {
  id?: string;
  itemCode: string;
  projectId: string;
  projectName?: string;
  boqItemId?: string;
  allocatedQuantity: number;
  usedQuantity: number;
  returnedQuantity: number;
  status: 'allocated' | 'partial' | 'complete' | 'cancelled';
  allocatedDate: Date;
  allocatedBy: string;
  notes?: string;
}
```

### Day 3-4: Stock Service Enhancement

#### Step 6: Enhanced Stock Service
```typescript
// src/app/features/stock/services/stock.service.ts
@Injectable({
  providedIn: 'root'
})
export class StockService {
  private firestore = inject(Firestore);
  private materialService = inject(MaterialService);
  
  // Get stock level for a material
  getStockLevel(itemCode: string): Observable<StockItem | undefined> {
    const q = query(
      collection(this.firestore, 'stock_items'),
      where('itemCode', '==', itemCode)
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map(items => items[0])
    );
  }
  
  // Get stock levels with material details
  getStockWithMaterials(): Observable<StockItemWithMaterial[]> {
    return combineLatest([
      this.getAllStock(),
      this.materialService.getMaterials()
    ]).pipe(
      map(([stockItems, materials]) => {
        const materialMap = new Map(materials.map(m => [m.itemCode, m]));
        
        return stockItems.map(stock => ({
          ...stock,
          material: materialMap.get(stock.itemCode),
          unitOfMeasure: materialMap.get(stock.itemCode)?.unitOfMeasure || 'each'
        }));
      })
    );
  }
  
  // Receive stock
  async receiveStock(
    itemCode: string, 
    quantity: number, 
    reference?: string,
    batchNumber?: string
  ): Promise<void> {
    const stockRef = await this.getOrCreateStock(itemCode);
    const material = await this.materialService.getMaterialByCode(itemCode).pipe(take(1)).toPromise();
    
    // Update stock quantity
    await updateDoc(stockRef, {
      currentQuantity: increment(quantity),
      availableQuantity: increment(quantity),
      lastMovement: new Date(),
      updatedAt: new Date()
    });
    
    // Record movement
    await this.recordMovement({
      itemCode,
      movementType: 'receipt',
      quantity,
      unitOfMeasure: material?.unitOfMeasure || 'each',
      reference,
      notes: `Batch: ${batchNumber}`,
      performedBy: this.getCurrentUser(),
      performedAt: new Date()
    });
  }
  
  // Allocate stock to project
  async allocateStock(
    itemCode: string,
    projectId: string,
    quantity: number,
    boqItemId?: string
  ): Promise<void> {
    const stock = await this.getStockLevel(itemCode).pipe(take(1)).toPromise();
    
    if (!stock || stock.availableQuantity < quantity) {
      throw new Error('Insufficient stock available');
    }
    
    // Create allocation record
    const allocation: StockAllocation = {
      itemCode,
      projectId,
      boqItemId,
      allocatedQuantity: quantity,
      usedQuantity: 0,
      returnedQuantity: 0,
      status: 'allocated',
      allocatedDate: new Date(),
      allocatedBy: this.getCurrentUser()
    };
    
    await addDoc(collection(this.firestore, 'stock_allocations'), allocation);
    
    // Update stock quantities
    await updateDoc(doc(this.firestore, 'stock_items', stock.id!), {
      allocatedQuantity: increment(quantity),
      availableQuantity: increment(-quantity),
      updatedAt: new Date()
    });
    
    // Record movement
    await this.recordMovement({
      itemCode,
      movementType: 'allocation',
      quantity,
      unitOfMeasure: stock.unitOfMeasure,
      projectId,
      performedBy: this.getCurrentUser(),
      performedAt: new Date()
    });
  }
  
  // Check stock availability for BOQ
  async checkBOQAvailability(boqItems: BOQItem[]): Promise<StockAvailability[]> {
    const availability: StockAvailability[] = [];
    
    for (const item of boqItems) {
      const stock = await this.getStockLevel(item.itemCode).pipe(take(1)).toPromise();
      
      availability.push({
        itemCode: item.itemCode,
        description: item.description,
        requiredQuantity: item.requiredQuantity,
        availableQuantity: stock?.availableQuantity || 0,
        shortage: Math.max(0, item.requiredQuantity - (stock?.availableQuantity || 0)),
        unitOfMeasure: item.unit,
        status: this.getAvailabilityStatus(item.requiredQuantity, stock?.availableQuantity || 0)
      });
    }
    
    return availability;
  }
  
  private getAvailabilityStatus(required: number, available: number): AvailabilityStatus {
    if (available >= required) return 'in-stock';
    if (available > 0) return 'partial';
    return 'out-of-stock';
  }
}
```

### Day 5: Stock UI Components

#### Step 7: Enhanced Stock Components
```typescript
// src/app/features/stock/components/stock-receive/stock-receive.component.ts
@Component({
  selector: 'app-stock-receive',
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Receive Stock</mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        <form [formGroup]="receiveForm" (ngSubmit)="onSubmit()">
          <!-- Material Selection -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Material</mat-label>
            <input matInput
                   [matAutocomplete]="auto"
                   formControlName="itemCode"
                   (input)="filterMaterials($event)">
            <mat-autocomplete #auto="matAutocomplete" 
                              [displayWith]="displayMaterial"
                              (optionSelected)="onMaterialSelected($event)">
              <mat-option *ngFor="let material of filteredMaterials$ | async" 
                          [value]="material.itemCode">
                <div class="material-option">
                  <span class="item-code">{{material.itemCode}}</span>
                  <span class="description">{{material.description}}</span>
                  <span class="uom">{{material.unitOfMeasure}}</span>
                </div>
              </mat-option>
            </mat-autocomplete>
          </mat-form-field>
          
          <!-- Quantity -->
          <mat-form-field appearance="outline">
            <mat-label>Quantity</mat-label>
            <input matInput type="number" formControlName="quantity">
            <span matSuffix>{{selectedMaterial?.unitOfMeasure}}</span>
          </mat-form-field>
          
          <!-- Reference -->
          <mat-form-field appearance="outline">
            <mat-label>PO Number / Reference</mat-label>
            <input matInput formControlName="reference">
          </mat-form-field>
          
          <!-- Batch Number -->
          <mat-form-field appearance="outline">
            <mat-label>Batch Number</mat-label>
            <input matInput formControlName="batchNumber">
          </mat-form-field>
          
          <!-- Current Stock Display -->
          <div class="stock-info" *ngIf="currentStock$ | async as stock">
            <p>Current Stock: {{stock.currentQuantity}} {{stock.unitOfMeasure}}</p>
            <p>Available: {{stock.availableQuantity}} {{stock.unitOfMeasure}}</p>
          </div>
          
          <div class="actions">
            <button mat-button type="button" (click)="cancel()">Cancel</button>
            <button mat-raised-button color="primary" type="submit" 
                    [disabled]="!receiveForm.valid || receiving">
              <mat-icon>add_circle</mat-icon>
              Receive Stock
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `
})
export class StockReceiveComponent {
  receiveForm: FormGroup;
  filteredMaterials$!: Observable<MasterMaterial[]>;
  selectedMaterial?: MasterMaterial;
  currentStock$?: Observable<StockItem>;
  receiving = false;
  
  constructor(
    private fb: FormBuilder,
    private materialService: MaterialService,
    private stockService: StockService,
    private snackBar: MatSnackBar
  ) {
    this.receiveForm = this.fb.group({
      itemCode: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(1)]],
      reference: [''],
      batchNumber: ['']
    });
  }
  
  onMaterialSelected(event: MatAutocompleteSelectedEvent) {
    const itemCode = event.option.value;
    this.currentStock$ = this.stockService.getStockLevel(itemCode);
    this.materialService.getMaterialByCode(itemCode).subscribe(material => {
      this.selectedMaterial = material;
    });
  }
  
  async onSubmit() {
    if (this.receiveForm.valid) {
      this.receiving = true;
      const { itemCode, quantity, reference, batchNumber } = this.receiveForm.value;
      
      try {
        await this.stockService.receiveStock(itemCode, quantity, reference, batchNumber);
        this.snackBar.open('Stock received successfully', 'Close', { duration: 3000 });
        this.receiveForm.reset();
      } catch (error) {
        this.snackBar.open('Error receiving stock', 'Close', { duration: 3000 });
      } finally {
        this.receiving = false;
      }
    }
  }
}
```

## Implementation Checklist

### Week 1 Deliverables
- [ ] Master Material model created
- [ ] Material service with CRUD operations
- [ ] Material list component with filters
- [ ] Material form component for add/edit
- [ ] Import functionality for CSV
- [ ] Export functionality to CSV
- [ ] Material categories management
- [ ] Unit of Measure support

### Week 2 Deliverables
- [ ] Enhanced stock model with UoM
- [ ] Stock-Material integration
- [ ] Stock receive functionality
- [ ] Stock allocation to projects
- [ ] Stock availability checking
- [ ] Stock movement tracking
- [ ] Stock reports by UoM
- [ ] Low stock alerts setup

### Testing Requirements
1. **Unit Tests**
   - Material service methods
   - Stock service methods
   - UoM conversions

2. **Integration Tests**
   - Material-Stock linking
   - BOQ-Stock availability
   - Import/Export functionality

3. **E2E Tests**
   - Complete material creation flow
   - Stock receive and allocate flow
   - Import materials from CSV

### Data Migration Plan
1. **Prepare CSV templates** for:
   - Drop cables
   - ADSS cables
   - Micro-blown cables
   - Poles
   - Accessories

2. **Migration sequence**:
   - Import master materials first
   - Create initial stock records
   - Link existing BOQ items to materials
   - Update stock quantities

3. **Validation steps**:
   - Verify all item codes are unique
   - Check UoM assignments
   - Validate cost calculations
   - Confirm category mappings

This completes Phase 1 implementation guide. The foundation is now set for the MPMS with proper material management and UoM-aware stock tracking.