# Angular Component Context Template

## 🎯 **COMPONENT PATTERNS**

### Standalone Component Structure
```typescript
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-[feature-name]',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    PageHeaderComponent,
    // Other imports
  ],
  templateUrl: './[feature-name].component.html',
  styleUrls: ['./[feature-name].component.scss']
})
export class [FeatureName]Component {
  // Service injection
  private [service] = inject([Service]);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  
  // Signals for state
  loading = signal(false);
  items = signal<[Model][]>([]);
  selectedItem = signal<[Model] | null>(null);
  
  // Computed values
  itemCount = computed(() => this.items().length);
  hasItems = computed(() => this.items().length > 0);
  
  // Lifecycle
  ngOnInit() {
    this.loadData();
  }
  
  // Methods
  loadData() {
    this.loading.set(true);
    this.[service].getAll().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading items:', error);
        this.loading.set(false);
        this.showError('Failed to load items');
      }
    });
  }
}
```

### List Component Pattern
```typescript
// Table columns configuration
displayedColumns = ['name', 'status', 'date', 'actions'];

// Header actions
headerActions = [
  {
    label: 'Add New',
    icon: 'add',
    color: 'primary',
    action: () => this.router.navigate(['/feature/new'])
  }
];

// Table actions
editItem(item: [Model]) {
  this.router.navigate(['/feature', item.id, 'edit']);
}

deleteItem(item: [Model]) {
  // Implement delete with confirmation
}
```

### Form Component Pattern
```typescript
// Form setup
form = this.fb.group({
  name: ['', [Validators.required, Validators.minLength(3)]],
  email: ['', [Validators.required, Validators.email]],
  status: ['active', Validators.required],
  // Add more fields
});

// Form submission
onSubmit() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }
  
  this.loading.set(true);
  const formData = this.form.getRawValue();
  
  this.[service].create(formData).subscribe({
    next: (result) => {
      this.showSuccess('Item created successfully');
      this.router.navigate(['/feature']);
    },
    error: (error) => {
      this.loading.set(false);
      this.showError('Failed to create item');
    }
  });
}
```

### Template Patterns
```html
<!-- Page Header -->
<app-page-header
  [title]="'Feature Title'"
  [subtitle]="'Feature description'"
  [actions]="headerActions">
</app-page-header>

<!-- Loading State -->
<app-loading-skeleton *ngIf="loading()" type="table"></app-loading-skeleton>

<!-- Content -->
<div class="content-container" *ngIf="!loading()">
  <!-- Your content here -->
</div>

<!-- Empty State -->
<div class="empty-state" *ngIf="!loading() && !hasItems()">
  <mat-icon>inbox</mat-icon>
  <h3>No items found</h3>
  <p>Get started by creating your first item</p>
  <button mat-raised-button color="primary" (click)="createNew()">
    Create Item
  </button>
</div>
```

### Styling Patterns
```scss
@use '../../../styles/utils/component-theming' as theme;

:host {
  display: block;
  height: 100%;
}

.content-container {
  padding: theme.spacing(lg);
  
  @media #{theme.breakpoint(md)} {
    padding: theme.spacing(md);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  
  mat-icon {
    font-size: 64px;
    width: 64px;
    height: 64px;
    color: theme.text(secondary);
  }
  
  h3 {
    margin: theme.spacing(md) 0 theme.spacing(sm);
    color: theme.text(primary);
  }
  
  p {
    color: theme.text(secondary);
    margin-bottom: theme.spacing(lg);
  }
}
```

## 🏗️ **COMPONENT TYPES**

### 1. List Components
- Display data in tables or cards
- Include filtering and sorting
- Handle pagination
- Provide actions (edit, delete, view)

### 2. Form Components
- Reactive forms with validation
- Error handling and display
- Loading states during submission
- Success/error feedback

### 3. Detail Components
- Display single item details
- Include related data
- Provide edit/delete actions
- Handle loading/error states

### 4. Dialog Components
- Extend common dialog patterns
- Handle data passing
- Implement proper actions
- Return results to parent

## 🚨 **BEST PRACTICES**

1. **Use Signals** for local component state
2. **Use inject()** for dependency injection
3. **Implement OnPush** change detection for performance
4. **Handle all states**: loading, error, empty, success
5. **Make components responsive** with proper breakpoints
6. **Follow theme system** for consistent styling
7. **Implement proper cleanup** in ngOnDestroy
8. **Use trackBy** for *ngFor performance

## 📚 **REFERENCES**

- Component Examples: ProjectListComponent, StaffFormComponent
- Shared Components: `src/app/shared/components/`
- Theme Utils: `src/styles/utils/`
- Angular Style Guide: https://angular.io/guide/styleguide