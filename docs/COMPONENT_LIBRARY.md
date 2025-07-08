# FibreFlow Component Library

*Last Updated: 2025-01-08*  
*Note: All patterns verified with antiHall*

## Overview

Reusable components in `app/shared/components`. All are standalone with Material Design.

---

## Verified Component Patterns

Based on actual implementation analysis:

1. **Standalone Components** ✅ - All use `standalone: true`
2. **Material Design** ✅ - Import MaterialModule or specific Mat modules
3. **OnPush Change Detection** ✅ - Used in shared components
4. **Theme Support** ✅ - Uses ff-rgb() and theme functions
5. **Reactive Forms** ✅ - FormBuilder with validators

---

## Implemented Components

### PageHeader
**Location**: `app/shared/components/page-header`  
**Verified**: ✅ Component exists with OnPush strategy

```typescript
interface PageHeaderAction {
  label: string;
  icon?: string;
  color?: 'primary' | 'accent' | 'warn';
  variant?: 'raised' | 'stroked' | 'flat' | 'icon';
  disabled?: boolean;
  action: () => void;
}
```

```html
<app-page-header 
  [title]="'Projects'"
  [subtitle]="'Manage your projects'"
  [actions]="headerActions">
</app-page-header>
```

### SummaryCards
**Location**: `app/shared/components/summary-cards`  
**Verified**: ✅ Uses OnPush, Material Card

```typescript
// From actual implementation
cards = [
  { label: 'Total', value: 25, icon: 'folder', color: 'primary' }
];
```

### LoadingSkeleton
**Location**: `app/shared/components/loading-skeleton`  
**Verified**: ✅ Switch/case for different skeleton types

```html
<app-loading-skeleton type="table" [rows]="5"></app-loading-skeleton>
<app-loading-skeleton type="card"></app-loading-skeleton>
<app-loading-skeleton type="list" [rows]="3"></app-loading-skeleton>
```

### ConfirmDialog
**Location**: `app/shared/components/confirm-dialog`  
**Verified**: ✅ Exists in shared components

Used with MatDialog for confirmations.

### FilterForm
**Location**: `app/shared/components/filter-form`  
**Verified**: ✅ Exists for filtering lists

### ThemeSwitcher
**Location**: `app/shared/components/theme-switcher`  
**Verified**: ✅ Integrates with ThemeService

### PlaceholderPage
**Location**: `app/shared/components/placeholder-page`  
**Verified**: ✅ For unimplemented features

---

## Verified Service Patterns

```typescript
// BaseFirestoreService pattern (verified with antiHall)
export class ItemService extends BaseFirestoreService<Item> {
  constructor() {
    super('items'); // collection name
  }
}
```

---

## Verified Theme Patterns

From actual _theme-functions.scss:
```scss
// Functions that exist:
ff-rgb($color-name)      // RGB conversion
ff-rgba($color-name, $opacity)  // RGBA with opacity
ff-rem($pixels)          // px to rem
ff-clamp($min, $preferred, $max)  // Responsive sizing
ff-shadow($size)         // Box shadows
```

---

## Material Module Imports

Verified modules used in components:
- MatButtonModule
- MatIconModule  
- MatCardModule
- MatTableModule
- MatFormFieldModule
- MatInputModule
- MatSelectModule
- MatProgressSpinnerModule
- MatDialogModule
- MatSnackBarModule

---

## Creating New Components

```bash
# Generate component
ng g component shared/components/component-name

# Make it standalone and add imports
```

Required structure (verified pattern):
```typescript
@Component({
  selector: 'app-component-name',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './component-name.component.html',
  styleUrl: './component-name.component.scss'
})
```

---

## Responsive Design

Breakpoints exist in _spacing.scss:
- xs: 0
- sm: 640px  
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

Usage: `@media #{ff-breakpoint(md)} { ... }`

**Note**: No mobile-first requirement found. Responsive support is optional per component.

---

## Component Checklist

Verified requirements:
- [ ] Standalone component
- [ ] Proper Material imports
- [ ] Uses theme functions (no hardcoded colors)
- [ ] OnPush strategy (for shared components)
- [ ] Follows existing patterns