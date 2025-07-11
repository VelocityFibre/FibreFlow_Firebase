# Quick Reference Command

Shows commonly needed code patterns and commands for FibreFlow development.

## Usage
```
/quick-reference [topic]
```

## Topics

### firebase
```typescript
// Query with conditions
this.db.collection<Item>('items', ref => 
  ref.where('status', '==', 'active')
     .orderBy('createdAt', 'desc')
     .limit(10)
);

// Batch operations
const batch = this.firestore.batch();
items.forEach(item => {
  batch.update(doc(this.db, 'items', item.id), { status: 'archived' });
});
await batch.commit();

// Real-time updates
this.itemsCollection.valueChanges({ idField: 'id' })
  .pipe(takeUntil(this.destroy$));
```

### forms
```typescript
// Form with validation
form = this.fb.group({
  name: ['', [Validators.required, Validators.minLength(3)]],
  email: ['', [Validators.required, Validators.email]],
  status: ['active', Validators.required],
  description: ['']
});

// Custom validator
phoneValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  const valid = /^\d{10}$/.test(value);
  return valid ? null : { invalidPhone: true };
}

// Form submission
onSubmit() {
  if (this.form.valid) {
    const data = this.form.value;
    this.service.create(data).subscribe({
      next: () => this.router.navigate(['../']),
      error: (err) => this.snackBar.open('Error: ' + err.message)
    });
  }
}
```

### theme
```scss
@use '../../../styles/utils/component-theming' as theme;

.component {
  // Colors
  color: theme.ff-rgb(foreground);
  background: theme.ff-rgb(background);
  border-color: theme.ff-rgb(border);
  
  // Spacing
  padding: theme.ff-rem(16);
  margin-bottom: theme.ff-rem(24);
  
  // Shadows
  box-shadow: theme.ff-shadow(lg);
  
  // Responsive
  font-size: theme.ff-clamp(14, 2.5, 18);
}
```

### routing
```typescript
// Lazy loaded routes
export const routes: Routes = [
  {
    path: 'feature',
    loadChildren: () => import('./features/feature/feature.routes')
      .then(m => m.FEATURE_ROUTES),
    canActivate: [AuthGuard]
  }
];

// Route with resolver
{
  path: ':id',
  component: DetailComponent,
  resolve: {
    item: () => inject(ItemService).getById(route.params['id'])
  }
}

// Navigation
constructor(private router: Router) {}

navigateToDetail(id: string) {
  this.router.navigate(['/items', id]);
}
```

### signals
```typescript
// Signal state management
export class ItemsComponent {
  items = signal<Item[]>([]);
  loading = signal(true);
  selectedId = signal<string | null>(null);
  
  selectedItem = computed(() => 
    this.items().find(i => i.id === this.selectedId())
  );
  
  loadItems() {
    this.loading.set(true);
    this.service.getAll().subscribe(items => {
      this.items.set(items);
      this.loading.set(false);
    });
  }
}
```

### material
```typescript
// Table with sorting and pagination
@Component({
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule
  ]
})

// Snackbar messages
constructor(private snackBar: MatSnackBar) {}

showSuccess(message: string) {
  this.snackBar.open(message, 'Close', {
    duration: 3000,
    horizontalPosition: 'end',
    verticalPosition: 'top',
    panelClass: ['success-snackbar']
  });
}

// Dialog
const dialogRef = this.dialog.open(ConfirmDialogComponent, {
  width: '400px',
  data: { message: 'Are you sure you want to delete this item?' }
});

dialogRef.afterClosed().subscribe(result => {
  if (result) {
    this.deleteItem();
  }
});
```

### deploy
```bash
# Full deployment
deploy "Feature complete message"

# Check what changed
jj st
jj diff

# Functions only
firebase deploy --only functions

# Specific function
firebase deploy --only functions:sendEmail

# Hosting only
firebase deploy --only hosting
```

### testing
```bash
# Update antiHall
npm run parse

# Check for TS errors
npx tsc --noEmit

# Lint and fix
npm run lint:fix

# Format code
npm run format

# Full check
npm run check
```

<arguments>
topic: Optional topic to show (firebase, forms, theme, routing, signals, material, deploy, testing)
</arguments>