# Angular Material v20 Best Practices

**Generated**: 2025-06-18  
**Material Version**: 20.0.3  
**Purpose**: Material Design implementation guide for codebase review

## 1. Module Imports (Standalone)

### 1.1 Component-Level Imports
```typescript
// ✅ BEST PRACTICE: Import only what you need
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    // Only import used modules
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule
  ]
})

// ❌ AVOID: Importing all Material modules
```

## 2. Theming System

### 2.1 Modern Theme Configuration
```scss
// ✅ BEST PRACTICE: Use CSS custom properties
@use '@angular/material' as mat;

// Define theme with CSS variables
@mixin define-theme($theme) {
  body {
    --primary-color: #{mat.get-theme-color($theme, primary)};
    --accent-color: #{mat.get-theme-color($theme, accent)};
    --warn-color: #{mat.get-theme-color($theme, warn)};
    
    // Surface colors
    --surface-color: #{mat.get-theme-color($theme, surface)};
    --surface-variant: #{mat.get-theme-color($theme, surface-variant)};
  }
}

// Component theming
@mixin component-theme($theme) {
  .my-component {
    background-color: var(--surface-color);
    color: var(--on-surface);
  }
}
```

### 2.2 Dynamic Theme Switching
```typescript
// ✅ BEST PRACTICE: Theme service with signals
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeSignal = signal<Theme>('light');
  theme = this.themeSignal.asReadonly();
  
  setTheme(theme: Theme) {
    this.themeSignal.set(theme);
    document.body.setAttribute('data-theme', theme);
  }
}
```

## 3. Component Patterns

### 3.1 Table Implementation
```typescript
// ✅ BEST PRACTICE: Virtual scrolling for large datasets
@Component({
  template: `
    <cdk-virtual-scroll-viewport itemSize="48" class="table-viewport">
      <table mat-table [dataSource]="dataSource">
        @for (column of displayedColumns(); track column) {
          <ng-container [matColumnDef]="column">
            <th mat-header-cell *matHeaderCellDef>{{ column }}</th>
            <td mat-cell *matCellDef="let element">{{ element[column] }}</td>
          </ng-container>
        }
        
        <tr mat-header-row *matHeaderRowDef="displayedColumns()"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns();"></tr>
      </table>
    </cdk-virtual-scroll-viewport>
  `
})
export class DataTableComponent {
  displayedColumns = signal(['id', 'name', 'status']);
  dataSource = signal<MatTableDataSource<any>>(new MatTableDataSource());
}
```

### 3.2 Form Controls
```typescript
// ✅ BEST PRACTICE: Form field with proper validation UI
@Component({
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Email</mat-label>
      <input matInput 
             [formControl]="emailControl" 
             type="email"
             placeholder="user@example.com">
      @if (emailControl.hasError('required')) {
        <mat-error>Email is required</mat-error>
      }
      @if (emailControl.hasError('email')) {
        <mat-error>Please enter a valid email</mat-error>
      }
      <mat-hint>We'll never share your email</mat-hint>
    </mat-form-field>
  `
})
```

### 3.3 Dialog Patterns
```typescript
// ✅ BEST PRACTICE: Typed dialog with signals
export interface DialogData {
  title: string;
  message: string;
}

@Component({
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button 
              color="primary" 
              [mat-dialog-close]="true">
        Confirm
      </button>
    </mat-dialog-actions>
  `
})
export class ConfirmDialogComponent {
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);
}

// Usage
export class SomeComponent {
  private dialog = inject(MatDialog);
  
  openDialog() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Confirm', message: 'Are you sure?' },
      width: '400px',
      disableClose: true
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Handle confirmation
      }
    });
  }
}
```

## 4. CDK Utilities

### 4.1 Layout with BreakpointObserver
```typescript
// ✅ BEST PRACTICE: Responsive layouts
export class ResponsiveComponent {
  private breakpointObserver = inject(BreakpointObserver);
  
  isMobile = toSignal(
    this.breakpointObserver.observe([
      Breakpoints.XSmall,
      Breakpoints.Small
    ]).pipe(map(result => result.matches))
  );
  
  gridCols = computed(() => this.isMobile() ? 1 : 3);
}
```

### 4.2 Overlay for Custom Tooltips
```typescript
// ✅ BEST PRACTICE: Custom overlay positioning
export class TooltipDirective {
  private overlay = inject(Overlay);
  private overlayRef?: OverlayRef;
  
  @HostListener('mouseenter')
  show() {
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions([
        {
          originX: 'center',
          originY: 'top',
          overlayX: 'center',
          overlayY: 'bottom'
        }
      ]);
      
    this.overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: false
    });
    
    // Attach component
  }
}
```

## 5. Performance Optimizations

### 5.1 Tree Shaking
```typescript
// ✅ BEST PRACTICE: Import deep paths
import { MatButton } from '@angular/material/button';

// ❌ AVOID: Barrel imports
import { MatButton } from '@angular/material';
```

### 5.2 Lazy Loading Heavy Components
```typescript
// ✅ BEST PRACTICE: Defer heavy components
@Component({
  template: `
    @defer (on viewport) {
      <mat-table [dataSource]="largeDataSet">
        <!-- Table content -->
      </mat-table>
    } @placeholder {
      <mat-progress-spinner mode="indeterminate" />
    }
  `
})
```

## 6. Accessibility

### 6.1 ARIA Labels
```typescript
// ✅ BEST PRACTICE: Proper ARIA attributes
@Component({
  template: `
    <button mat-icon-button
            [attr.aria-label]="'Delete ' + item.name"
            [attr.aria-pressed]="item.selected">
      <mat-icon>delete</mat-icon>
    </button>
  `
})
```

### 6.2 Focus Management
```typescript
// ✅ BEST PRACTICE: Focus trap in dialogs
export class DialogComponent implements AfterViewInit {
  private focusTrap = inject(ConfigurableFocusTrapFactory);
  
  ngAfterViewInit() {
    const trap = this.focusTrap.create(this.elementRef.nativeElement);
    trap.focusInitialElementWhenReady();
  }
}
```

## 7. Custom Components

### 7.1 Extending Material Components
```typescript
// ✅ BEST PRACTICE: Composition over inheritance
@Component({
  selector: 'app-status-chip',
  template: `
    <mat-chip [color]="chipColor()" [disabled]="disabled()">
      <mat-icon>{{ icon() }}</mat-icon>
      {{ label() }}
    </mat-chip>
  `
})
export class StatusChipComponent {
  status = input.required<'active' | 'inactive' | 'pending'>();
  disabled = input(false);
  
  chipColor = computed(() => {
    switch (this.status()) {
      case 'active': return 'primary';
      case 'inactive': return 'warn';
      default: return undefined;
    }
  });
  
  icon = computed(() => {
    switch (this.status()) {
      case 'active': return 'check_circle';
      case 'inactive': return 'cancel';
      default: return 'schedule';
    }
  });
  
  label = computed(() => this.status().toUpperCase());
}
```

## 8. Testing Material Components

### 8.1 Harness Testing
```typescript
// ✅ BEST PRACTICE: Use Material test harnesses
it('should display user data in table', async () => {
  const fixture = TestBed.createComponent(UserTableComponent);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  
  const table = await loader.getHarness(MatTableHarness);
  const rows = await table.getRows();
  
  expect(rows.length).toBe(3);
  
  const firstRowCells = await rows[0].getCells();
  const cellTexts = await parallel(() => 
    firstRowCells.map(cell => cell.getText())
  );
  
  expect(cellTexts).toEqual(['1', 'John Doe', 'Active']);
});
```

## 9. Common Patterns

### 9.1 Loading States
```typescript
// ✅ BEST PRACTICE: Consistent loading UI
@Component({
  template: `
    @if (loading()) {
      <div class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="content">
        <!-- Actual content -->
      </div>
    }
  `,
  styles: [`
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }
  `]
})
```

### 9.2 Empty States
```typescript
// ✅ BEST PRACTICE: User-friendly empty states
@Component({
  template: `
    @if (items().length === 0) {
      <div class="empty-state">
        <mat-icon>inbox</mat-icon>
        <h3>No items found</h3>
        <p>Try adjusting your filters or add a new item</p>
        <button mat-raised-button color="primary">
          Add Item
        </button>
      </div>
    }
  `
})
```

## 10. Migration Checklist

- [ ] Update all Material imports to standalone
- [ ] Implement proper theming with CSS variables
- [ ] Add virtual scrolling to large lists
- [ ] Use Material test harnesses
- [ ] Implement proper ARIA labels
- [ ] Add loading and empty states
- [ ] Use typed dialogs with inject()
- [ ] Implement responsive layouts with CDK
- [ ] Add focus management
- [ ] Optimize bundle with deep imports

## Common Issues to Fix

1. **Missing ARIA labels on icon buttons**
2. **Tables without virtual scrolling**
3. **Forms without proper error states**
4. **Dialogs without proper typing**
5. **Missing loading indicators**
6. **Hard-coded breakpoints instead of CDK**
7. **Theme colors not using CSS variables**
8. **Missing focus trap in custom overlays**