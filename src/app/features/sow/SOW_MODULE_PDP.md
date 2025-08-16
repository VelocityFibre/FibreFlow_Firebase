# SOW (Scope of Work) Module - Product Development Plan

## Executive Summary

The SOW module is a comprehensive Excel-based import system for FibreFlow that automates project scope calculation and daily target setting from engineering data files. This module will be integrated into the project creation workflow to provide accurate, data-driven project planning capabilities.

## Tech Stack Integration

### Core Technology Stack
- **Frontend**: Angular 20.0.6 with standalone components and signals
- **UI Framework**: Angular Material 20.0.5 + CDK
- **Database**: 
  - **Primary**: Firebase Firestore (operational data, real-time sync)
  - **Analytics**: Neon PostgreSQL (PowerBI reporting, analytics views)
- **File Processing**: XLSX library (client-side Excel parsing)
- **State Management**: Angular Signals + RxJS
- **Styling**: SCSS with FibreFlow theme system (4 themes)
- **Authentication**: Firebase Auth with role-based access
- **Storage**: Firebase Storage for Excel file backups

### Hybrid Database Architecture
The SOW module will follow FibreFlow's hybrid architecture:
1. **Firebase Firestore**: Primary storage for SOW documents
2. **Neon PostgreSQL**: Analytics views for PowerBI reporting
3. **Auto-sync**: Firebase Functions stream changes to Neon

```
SOW Module Flow:
Excel Upload → Client Processing → Firebase Storage → Neon Sync → PowerBI Views
```

## Module Overview

### Purpose
Enable project managers to:
- Import engineering data from Excel files (Poles, Drops, Fibre)
- Automatically calculate project scope and KPI targets
- Validate data integrity and pole-drop relationships
- Generate daily achievement targets based on project duration
- Store SOW data for project tracking and reporting

### Key Features
1. **Multi-file Excel Import** - Process Poles, Drops, and Fibre data
2. **Automated Calculations** - Generate totals and daily targets
3. **Data Validation** - Ensure integrity and capacity constraints
4. **KPI Integration** - Auto-populate project targets
5. **Visual Feedback** - Real-time import progress and validation

## Architecture

### Module Structure
```
src/app/features/sow/
├── components/
│   ├── sow-import/              # Main import wizard
│   ├── sow-validation/          # Validation results display
│   ├── sow-calculations/        # Calculations preview
│   └── sow-summary/             # Import summary view
├── services/
│   ├── sow.service.ts           # Main SOW service
│   ├── sow-excel.service.ts     # Excel processing
│   └── sow-validation.service.ts # Data validation
├── models/
│   ├── sow.model.ts             # Core SOW interfaces
│   ├── sow-import.model.ts      # Import data structures
│   └── sow-calculation.model.ts # Calculation models
├── pages/
│   └── sow-wizard/              # SOW creation wizard
└── sow.routes.ts                # Module routing

```

## Integration with Existing Systems

### 1. FibreFlow Patterns to Follow
- **BaseFirestoreService**: Extend for data operations
- **Standalone Components**: No NgModules
- **Signal-based State**: Use signals for reactive state
- **Theme Functions**: Use ff-rgb(), ff-spacing() for styling
- **Error Handling**: Integrate with Sentry error tracking
- **Audit Trail**: All operations logged automatically

### 2. Database Strategy

#### Firebase Firestore (Primary)
```typescript
// Collection structure
sows/
  {sowId}/
    - projectId
    - importData
    - calculations
    - validation
    
// Real-time sync for live updates
sowService.getByProject(projectId).subscribe(sow => {
  // Updates automatically when data changes
});
```

#### Neon PostgreSQL (Analytics)
```sql
-- Auto-synced via Firebase Functions
CREATE TABLE sow_analytics (
  id UUID PRIMARY KEY,
  project_id VARCHAR(255),
  pole_permissions_total INTEGER,
  home_signups_total INTEGER,
  fibre_length_total DECIMAL,
  created_at TIMESTAMP,
  -- JSONB for flexible schema
  import_metadata JSONB,
  calculations JSONB
);

-- PowerBI views
CREATE VIEW vw_sow_summary AS
SELECT 
  s.project_id,
  p.project_name,
  s.pole_permissions_total,
  s.home_signups_total,
  s.fibre_length_total,
  s.calculations->>'estimatedDays' as estimated_days
FROM sow_analytics s
JOIN projects p ON s.project_id = p.id;
```

### 3. File Storage Strategy
- **Excel Files**: Store in Firebase Storage
- **Path**: `sow-imports/{projectId}/{timestamp}_{filename}`
- **Metadata**: Link storage URL in Firestore document
- **Retention**: Keep for audit trail

## Data Models

### Core Models (Updated for Integration)

```typescript
// sow.model.ts
import { Timestamp } from '@angular/fire/firestore';

export interface SOWData {
  id?: string;
  projectId: string;
  createdAt: Timestamp;
  createdBy: string;
  
  // User who created
  createdByEmail?: string;
  createdByName?: string;
  
  // Import metadata
  importFiles: {
    poles?: ImportFileMetadata;
    drops?: ImportFileMetadata;
    fibre?: ImportFileMetadata;
  };
  
  // Calculated totals
  totals: SOWTotals;
  
  // Daily targets
  dailyTargets: DailyTargets;
  
  // Geographic breakdown
  geographic: GeographicBreakdown;
  
  // Validation results
  validation: ValidationResults;
}

export interface SOWTotals {
  polePermissionsTotal: number;
  homeSignupsTotal: number;
  fibreStringingTotal: number;
  totalDrops: number;
  spareDrops: number;
  polesPlanted: number;
  homesConnected: number;
}

export interface DailyTargets {
  polePermissionsDaily: number;
  polesPlantedDaily: number;
  homeSignupsDaily: number;
  homesConnectedDaily: number;
  fibreStringingDaily: number;
  estimatedDays: number;
}

export interface GeographicBreakdown {
  zones: ZoneData[];
  pons: PONData[];
  poleDropMapping: Map<string, string[]>;
}

// sow-import.model.ts
export interface PoleImportData {
  label_1: string;        // Pole number
  status: string;         // Permission status
  latitude: number;
  longitude: number;
  pon_no: string;
  zone_no: string;
}

export interface DropImportData {
  label: string;          // Drop number
  strtfeat: string;       // Connected pole
  endfeat: string;        // ONT reference
  pon: string;
  zone: string;
}

export interface FibreImportData {
  length_m: number;       // Cable length in meters
  route_id: string;
  type: string;
}
```

## Component Design

### 1. SOW Import Wizard Component

```typescript
@Component({
  selector: 'app-sow-import',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    FileUploadComponent
  ],
  templateUrl: './sow-import.component.html',
  styleUrl: './sow-import.component.scss'
})
export class SowImportComponent {
  private sowService = inject(SowService);
  private excelService = inject(SowExcelService);
  
  // Signals for state management
  importState = signal<'idle' | 'processing' | 'validating' | 'complete'>('idle');
  polesData = signal<PoleImportData[]>([]);
  dropsData = signal<DropImportData[]>([]);
  fibreData = signal<FibreImportData[]>([]);
  
  validationErrors = signal<ValidationError[]>([]);
  calculations = signal<SOWCalculations | null>(null);
  
  // Stepper form
  sowForm = this.fb.group({
    projectId: ['', Validators.required],
    polesFile: [null],
    dropsFile: [null],
    fibreFile: [null],
    estimatedDays: [50, [Validators.required, Validators.min(1)]]
  });
}
```

### 2. SOW Validation Component

```typescript
@Component({
  selector: 'app-sow-validation',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <div class="validation-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Data Validation Results</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (validationResults()) {
            <div class="validation-summary">
              <app-summary-cards [stats]="validationStats()"></app-summary-cards>
            </div>
            
            @if (validationResults().errors.length > 0) {
              <div class="validation-errors">
                <h3>Validation Errors</h3>
                <mat-list>
                  @for (error of validationResults().errors; track error.id) {
                    <mat-list-item>
                      <mat-icon color="warn">error</mat-icon>
                      <span>{{ error.message }}</span>
                    </mat-list-item>
                  }
                </mat-list>
              </div>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class SowValidationComponent {
  validationResults = input.required<ValidationResults>();
  
  validationStats = computed(() => {
    const results = this.validationResults();
    return [
      { label: 'Total Records', value: results.totalRecords, icon: 'inventory_2' },
      { label: 'Valid Records', value: results.validRecords, icon: 'check_circle' },
      { label: 'Errors', value: results.errors.length, icon: 'error', color: 'warn' },
      { label: 'Warnings', value: results.warnings.length, icon: 'warning', color: 'accent' }
    ];
  });
}
```

## Service Implementation

### SOW Service (Following FibreFlow Patterns)

```typescript
import { Injectable, inject } from '@angular/core';
import { BaseFirestoreService } from '@core/services/base-firestore.service';
import { AuthService } from '@core/services/auth.service';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SowService extends BaseFirestoreService<SOWData> {
  private auth = inject(AuthService);
  private functions = inject(Functions);
  private storage = inject(Storage);
  
  constructor() {
    super('sows');
  }
  
  async createSOW(projectId: string, importData: SOWImportData): Promise<string> {
    const calculations = this.calculateSOW(importData);
    const validation = await this.validateSOW(importData);
    
    const sowData: SOWData = {
      projectId,
      createdAt: serverTimestamp(),
      createdBy: this.auth.currentUser?.uid || '',
      importFiles: {
        poles: importData.polesFile,
        drops: importData.dropsFile,
        fibre: importData.fibreFile
      },
      totals: calculations.totals,
      dailyTargets: calculations.dailyTargets,
      geographic: calculations.geographic,
      validation
    };
    
    return this.create(sowData);
  }
  
  private calculateSOW(data: SOWImportData): SOWCalculations {
    // Calculate totals
    const polePermissionsTotal = data.poles.length;
    const homeSignupsTotal = data.drops.filter(d => d.endfeat).length;
    const fibreStringingTotal = data.fibre.reduce((sum, f) => sum + f.length_m, 0);
    const totalDrops = data.drops.length;
    const spareDrops = data.drops.filter(d => !d.endfeat).length;
    
    // Calculate daily targets
    const estimatedDays = data.estimatedDays || 50;
    const dailyTargets = {
      polePermissionsDaily: Math.ceil(polePermissionsTotal / estimatedDays),
      polesPlantedDaily: Math.ceil(polePermissionsTotal / estimatedDays),
      homeSignupsDaily: Math.ceil(homeSignupsTotal / estimatedDays),
      homesConnectedDaily: Math.ceil(homeSignupsTotal / estimatedDays),
      fibreStringingDaily: Math.ceil(fibreStringingTotal / estimatedDays),
      estimatedDays
    };
    
    // Geographic breakdown
    const zones = [...new Set(data.poles.map(p => p.zone_no))];
    const pons = [...new Set(data.poles.map(p => p.pon_no))];
    
    // Pole-drop mapping
    const poleDropMapping = new Map<string, string[]>();
    data.drops.forEach(drop => {
      const drops = poleDropMapping.get(drop.strtfeat) || [];
      drops.push(drop.label);
      poleDropMapping.set(drop.strtfeat, drops);
    });
    
    return {
      totals: {
        polePermissionsTotal,
        homeSignupsTotal,
        fibreStringingTotal,
        totalDrops,
        spareDrops,
        polesPlanted: polePermissionsTotal,
        homesConnected: homeSignupsTotal
      },
      dailyTargets,
      geographic: {
        zones: zones.map(z => ({ zone: z, count: data.poles.filter(p => p.zone_no === z).length })),
        pons: pons.map(p => ({ pon: p, count: data.poles.filter(pole => pole.pon_no === p).length })),
        poleDropMapping
      }
    };
  }
}
```

### Excel Processing Service

```typescript
@Injectable({ providedIn: 'root' })
export class SowExcelService {
  async processPoleFile(file: File): Promise<PoleImportData[]> {
    const data = await this.readExcelFile(file);
    return data.map(row => ({
      label_1: row['label_1'] || row['Pole Number'] || '',
      status: row['status'] || row['Status'] || '',
      latitude: parseFloat(row['latitude'] || row['lat'] || 0),
      longitude: parseFloat(row['longitude'] || row['lon'] || 0),
      pon_no: row['pon_no'] || row['PON'] || '',
      zone_no: row['zone_no'] || row['Zone'] || ''
    }));
  }
  
  async processDropFile(file: File): Promise<DropImportData[]> {
    const data = await this.readExcelFile(file);
    return data.map(row => ({
      label: row['label'] || row['Drop Number'] || '',
      strtfeat: row['strtfeat'] || row['Pole'] || '',
      endfeat: row['endfeat'] || row['ONT'] || '',
      pon: row['pon'] || '',
      zone: row['zone'] || ''
    }));
  }
  
  async processFibreFile(file: File): Promise<FibreImportData[]> {
    const data = await this.readExcelFile(file);
    return data.map(row => ({
      length_m: parseFloat(row['length_m'] || row['Length'] || 0),
      route_id: row['route_id'] || row['Route'] || '',
      type: row['type'] || row['Cable Type'] || ''
    }));
  }
  
  private async readExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        resolve(jsonData);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
}
```

### Validation Service

```typescript
@Injectable({ providedIn: 'root' })
export class SowValidationService {
  validateImportData(data: SOWImportData): ValidationResults {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Validate pole capacity (max 12 drops per pole)
    data.poles.forEach(pole => {
      const drops = data.drops.filter(d => d.strtfeat === pole.label_1);
      if (drops.length > 12) {
        errors.push({
          id: `pole-capacity-${pole.label_1}`,
          type: 'capacity',
          message: `Pole ${pole.label_1} has ${drops.length} drops (max 12)`,
          data: { pole: pole.label_1, dropCount: drops.length }
        });
      }
    });
    
    // Validate drop references
    data.drops.forEach(drop => {
      if (!data.poles.find(p => p.label_1 === drop.strtfeat)) {
        errors.push({
          id: `drop-ref-${drop.label}`,
          type: 'reference',
          message: `Drop ${drop.label} references non-existent pole ${drop.strtfeat}`,
          data: { drop: drop.label, pole: drop.strtfeat }
        });
      }
    });
    
    // Validate PON/Zone consistency
    data.drops.forEach(drop => {
      const pole = data.poles.find(p => p.label_1 === drop.strtfeat);
      if (pole && drop.pon && pole.pon_no !== drop.pon) {
        warnings.push({
          id: `pon-mismatch-${drop.label}`,
          type: 'consistency',
          message: `Drop ${drop.label} PON (${drop.pon}) doesn't match pole PON (${pole.pon_no})`,
          data: { drop: drop.label, dropPON: drop.pon, polePON: pole.pon_no }
        });
      }
    });
    
    // Check for missing critical fields
    data.poles.forEach(pole => {
      if (!pole.label_1) {
        errors.push({
          id: `missing-pole-number-${Math.random()}`,
          type: 'missing-data',
          message: 'Pole record missing pole number',
          data: { pole }
        });
      }
    });
    
    return {
      totalRecords: data.poles.length + data.drops.length + data.fibre.length,
      validRecords: data.poles.length + data.drops.length + data.fibre.length - errors.length,
      errors,
      warnings,
      timestamp: new Date()
    };
  }
}
```

## Integration Points

### 1. Project Creation Workflow

```typescript
// In project-form.component.ts
export class ProjectFormComponent {
  // Add SOW import step to project creation
  hasSowData = signal(false);
  sowCalculations = signal<SOWCalculations | null>(null);
  
  onSowImportComplete(calculations: SOWCalculations) {
    this.hasSowData.set(true);
    this.sowCalculations.set(calculations);
    
    // Auto-populate KPI targets
    this.projectForm.patchValue({
      metadata: {
        kpiTargets: {
          polePermissions: { 
            total: calculations.totals.polePermissionsTotal, 
            daily: calculations.dailyTargets.polePermissionsDaily 
          },
          homeSignups: { 
            total: calculations.totals.homeSignupsTotal, 
            daily: calculations.dailyTargets.homeSignupsDaily 
          },
          polesPlanted: { 
            total: calculations.totals.polesPlanted, 
            daily: calculations.dailyTargets.polesPlantedDaily 
          },
          fibreStringing: { 
            total: calculations.totals.fibreStringingTotal, 
            daily: calculations.dailyTargets.fibreStringingDaily 
          },
          homesConnected: { 
            total: calculations.totals.homesConnected, 
            daily: calculations.dailyTargets.homesConnectedDaily 
          }
        },
        milestoneScopes: {
          opticalTestsScope: Math.ceil(calculations.totals.homeSignupsTotal * 0.2),
          totalFiberLength: calculations.totals.fibreStringingTotal,
          totalPolePermissions: calculations.totals.polePermissionsTotal
        }
      }
    });
  }
}
```

### 2. Daily Progress Integration

```typescript
// SOW data flows into daily progress tracking
export class DailyProgressFormComponent {
  sowData = signal<SOWData | null>(null);
  
  ngOnInit() {
    // Load SOW data for the project
    this.route.params.pipe(
      switchMap(params => this.sowService.getByProject(params['projectId']))
    ).subscribe(sow => {
      this.sowData.set(sow);
      this.setupTargetValidation(sow);
    });
  }
  
  setupTargetValidation(sow: SOWData) {
    // Use SOW daily targets as baseline for validation
    this.kpiForm.setValidators([
      this.createTargetValidator('polePermissions', sow.dailyTargets.polePermissionsDaily),
      this.createTargetValidator('homeSignups', sow.dailyTargets.homeSignupsDaily),
      // ... other targets
    ]);
  }
}
```

## Routing Configuration

```typescript
// sow.routes.ts
export const SOW_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'import',
    pathMatch: 'full'
  },
  {
    path: 'import',
    loadComponent: () => import('./pages/sow-wizard/sow-wizard.component')
      .then(m => m.SowWizardComponent),
    data: { title: 'Import SOW Data' }
  },
  {
    path: 'view/:id',
    loadComponent: () => import('./components/sow-summary/sow-summary.component')
      .then(m => m.SowSummaryComponent),
    data: { title: 'SOW Summary' }
  }
];

// Add to app.routes.ts
{
  path: 'sow',
  loadChildren: () => import('./features/sow/sow.routes').then(m => m.SOW_ROUTES),
  canActivate: [authGuard],
  data: { roles: ['admin', 'project-manager'] }
}
```

## Theme & Styling (Following FibreFlow Theme System)

```scss
// sow-import.component.scss
@use '../../../../styles/component-theming' as theme;

.sow-import-container {
  // Use standard page container mixin
  padding: theme.ff-spacing(lg);
  max-width: 1400px;
  margin: 0 auto;
  
  .import-wizard {
    @include theme.surface-card;
    padding: theme.ff-spacing(xl);
    
    .file-upload-section {
      margin-bottom: theme.ff-spacing(lg);
      
      .upload-card {
        @include theme.card-interactive;
        padding: theme.ff-spacing(md);
        
        &.has-file {
          border-color: theme.ff-rgb(success);
        }
        
        &.has-error {
          border-color: theme.ff-rgb(destructive);
        }
      }
    }
  }
  
  .validation-results {
    margin-top: theme.ff-spacing(xl);
    
    .error-item {
      color: theme.ff-rgb(destructive);
      padding: theme.ff-spacing(sm);
      border-left: 3px solid theme.ff-rgb(destructive);
    }
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// sow.service.spec.ts
describe('SowService', () => {
  let service: SowService;
  let mockFirestore: jasmine.SpyObj<Firestore>;
  
  beforeEach(() => {
    const spy = jasmine.createSpyObj('Firestore', ['collection', 'doc']);
    
    TestBed.configureTestingModule({
      providers: [
        SowService,
        { provide: Firestore, useValue: spy }
      ]
    });
    
    service = TestBed.inject(SowService);
    mockFirestore = TestBed.inject(Firestore) as jasmine.SpyObj<Firestore>;
  });
  
  it('should calculate daily targets correctly', () => {
    const importData = {
      poles: Array(500).fill({ label_1: 'P1', status: 'Approved' }),
      drops: Array(300).fill({ label: 'D1', strtfeat: 'P1', endfeat: 'ONT1' }),
      fibre: [{ length_m: 25000 }],
      estimatedDays: 50
    };
    
    const calculations = service['calculateSOW'](importData);
    
    expect(calculations.dailyTargets.polePermissionsDaily).toBe(10);
    expect(calculations.dailyTargets.homeSignupsDaily).toBe(6);
    expect(calculations.totals.fibreStringingTotal).toBe(25000);
  });
  
  it('should validate pole capacity constraints', () => {
    const validation = service['validateSOW']({
      poles: [{ label_1: 'P1' }],
      drops: Array(13).fill({ strtfeat: 'P1' }) // 13 drops > 12 max
    });
    
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors[0].type).toBe('capacity');
  });
});
```

### Integration Tests

```typescript
// sow-import.component.spec.ts
describe('SowImportComponent Integration', () => {
  it('should process Excel files and display calculations', async () => {
    const fixture = TestBed.createComponent(SowImportComponent);
    const component = fixture.componentInstance;
    
    // Simulate file uploads
    const polesFile = new File([''], 'poles.xlsx');
    const dropsFile = new File([''], 'drops.xlsx');
    const fibreFile = new File([''], 'fibre.xlsx');
    
    await component.onPolesFileSelected(polesFile);
    await component.onDropsFileSelected(dropsFile);
    await component.onFibreFileSelected(fibreFile);
    
    fixture.detectChanges();
    
    expect(component.calculations()).toBeTruthy();
    expect(component.validationErrors().length).toBe(0);
  });
});
```

## Navigation Integration

### Add to App Shell Menu
```typescript
// In app-shell.component.ts navigation items
{
  label: 'SOW',
  icon: 'description',
  route: '/sow',
  roles: ['admin', 'project-manager']
}
```

### Add to Project Detail Page
```html
<!-- In project-detail.component.html -->
<button mat-raised-button color="primary" 
        [routerLink]="['/sow/import']" 
        [queryParams]="{projectId: project.id}">
  <mat-icon>upload_file</mat-icon>
  Import SOW Data
</button>
```

## Deployment Considerations

### 1. Performance
- Large Excel files processed client-side
- Consider Web Workers for processing > 10MB files
- Implement progress indicators for long operations
- Use Virtual Scrolling for large data tables

### 2. Security
- Validate all imported data server-side via Firebase Functions
- Sanitize file inputs
- Limit file sizes (max 50MB recommended)
- Check user permissions before allowing SOW creation
- File virus scanning via Firebase Extensions

### 3. Browser Compatibility
- XLSX library requires modern browsers
- Test file upload on mobile devices
- Provide fallback for older browsers
- Progressive enhancement for file drag-and-drop

### 4. Error Handling
- Clear error messages for validation failures
- Recovery options for partial imports
- Audit trail for all imports (automatic via FibreFlow)
- Integration with Sentry for error tracking

### 5. Firebase Deployment
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Functions for Neon sync
firebase deploy --only functions:syncSowToNeon

# Deploy hosting
firebase deploy --only hosting
```

### 6. Neon Database Setup
```sql
-- Run these in Neon console
CREATE TABLE IF NOT EXISTS sow_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  import_data JSONB,
  calculations JSONB,
  validation_results JSONB
);

-- Create indexes
CREATE INDEX idx_sow_project_id ON sow_imports(project_id);
CREATE INDEX idx_sow_created_at ON sow_imports(created_at);
```

## Future Enhancements

### Phase 2: API Integration
- Direct integration with engineering systems
- Real-time data updates
- Automated daily recalculation

### Phase 3: Advanced Analytics
- Historical SOW comparison
- Predictive modeling for timelines
- Resource optimization suggestions

### Phase 4: Invoice Generation
- Leverage SOW data for billing
- Integration with financial systems
- Automated invoice creation based on progress

## Implementation Timeline

### Week 1: Foundation
- [ ] Create module structure
- [ ] Implement core models
- [ ] Set up routing
- [ ] Create base services

### Week 2: Excel Processing
- [ ] Implement file upload components
- [ ] Create Excel parsing service
- [ ] Add validation logic
- [ ] Test with sample files

### Week 3: Calculations & Integration
- [ ] Implement calculation engine
- [ ] Create summary components
- [ ] Integrate with project creation
- [ ] Add to navigation

### Week 4: UI/UX Polish
- [ ] Implement Material stepper wizard
- [ ] Add progress indicators
- [ ] Create validation feedback
- [ ] Theme styling

### Week 5: Testing & Documentation
- [ ] Write unit tests
- [ ] Integration testing
- [ ] User documentation
- [ ] Deployment preparation

## Success Metrics

1. **Accuracy**: 100% correct calculation of totals and targets
2. **Performance**: Process 10,000 records in < 5 seconds
3. **Validation**: Catch 100% of data integrity issues
4. **User Experience**: < 3 minutes to complete SOW import
5. **Integration**: Seamless flow with project creation

## Conclusion

The SOW module will provide FibreFlow with robust project planning capabilities, ensuring accurate scope definition and realistic daily targets based on actual engineering data. By following established patterns and leveraging existing components, we can deliver this feature efficiently while maintaining consistency with the rest of the application.