# Theme Migration Guide

This guide helps you update existing pages to match the standardized theme from the stock-movements page.

## Quick Start

1. Import the page layout styles in your component if needed:
```scss
@use '../../../styles/page-layout' as *;
```

2. Update your HTML structure to follow the standard pattern.

## Page-by-Page Migration Examples

### Dashboard Page

**Current Structure:**
```html
<div class="dashboard-container">
  <h1>Dashboard</h1>
  <!-- content -->
</div>
```

**Updated Structure:**
```html
<div class="ff-page-container">
  <div class="ff-page-header">
    <div class="header-content">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-subtitle">Overview of your FibreFlow operations</p>
    </div>
  </div>
  <!-- content -->
</div>
```

### Projects List Page

**Update Required:**
```scss
// Remove custom styles
.projects-container { /* delete */ }
.projects-header { /* delete */ }

// HTML changes:
// - Change container class to ff-page-container
// - Update header to use ff-page-header pattern
// - Ensure title is 32px, weight 300
// - Add subtitle with description
```

### Clients Page

**Key Changes:**
1. Replace `.clients-container` with `.ff-page-container`
2. Update header structure
3. Use summary-cards grid for statistics
4. Apply standard table styling

### Suppliers Page

**Already follows pattern but needs:**
1. Update font sizes to match standards
2. Ensure consistent spacing
3. Use CSS variables for colors

## Component-Specific Updates

### Summary Statistics
Convert custom stat cards to use the standard pattern:

```html
<div class="summary-cards">
  <mat-card class="summary-card">
    <mat-card-content>
      <div class="card-icon success">
        <mat-icon>check_circle</mat-icon>
      </div>
      <div class="card-info">
        <div class="card-value">125</div>
        <div class="card-label">Active Projects</div>
      </div>
    </mat-card-content>
  </mat-card>
</div>
```

### Filter Forms
Update filter sections to use the standard pattern:

```html
<mat-card class="filters-card">
  <mat-card-content>
    <form [formGroup]="filterForm" class="filter-form">
      <!-- form fields -->
    </form>
  </mat-card-content>
</mat-card>
```

### Tables
Ensure tables follow the standard styling:

```html
<mat-card class="table-card">
  <mat-card-content>
    <div class="table-container">
      <table mat-table [dataSource]="data">
        <!-- columns -->
      </table>
    </div>
  </mat-card-content>
</mat-card>
```

### Empty States
Use the standard empty state pattern:

```html
<div class="empty-state">
  <mat-icon>inbox</mat-icon>
  <p>No items found</p>
  <p class="empty-hint">Create your first item to get started</p>
</div>
```

## CSS Variable Updates

Replace hardcoded colors with CSS variables:

```scss
// Before
color: #666;
background-color: #4CAF50;

// After
color: rgb(var(--ff-muted-foreground));
background-color: rgb(var(--ff-success));
```

## Material Component Consistency

Ensure all Material components use consistent styling:

1. **Buttons**: Use `mat-raised-button` with `color="primary"` for main actions
2. **Form Fields**: Use `appearance="outline"`
3. **Cards**: Remove custom card styling, rely on global styles
4. **Icons**: Use standard sizes (20px default, 28px for card icons)

## Testing Your Updates

After updating a page:

1. Check header alignment and spacing
2. Verify font sizes match standards
3. Test responsive behavior
4. Ensure color consistency
5. Validate empty states
6. Check table styling
7. Test dark mode (if implemented)

## Common Issues

### Issue: Custom spacing conflicts
**Solution**: Remove custom margin/padding and use utility classes or standard spacing

### Issue: Font size overrides
**Solution**: Remove font-size declarations and use standard classes

### Issue: Color inconsistency
**Solution**: Replace hex/rgb colors with CSS variables

### Issue: Header layout breaks on mobile
**Solution**: Ensure using the responsive header pattern with media queries

## Priority Pages for Migration

1. **High Priority** (Most visible):
   - Dashboard
   - Projects List
   - Clients List
   - Staff List

2. **Medium Priority**:
   - Project Details
   - Client Details
   - BOQ Management
   - Tasks

3. **Low Priority** (Already close to standard):
   - Stock Movements (reference)
   - Suppliers
   - Contractors

## Verification Checklist

- [ ] Page uses `.ff-page-container`
- [ ] Header follows `.ff-page-header` pattern
- [ ] Title is 32px, weight 300
- [ ] Subtitle is 18px, weight 400
- [ ] Colors use CSS variables
- [ ] Spacing is consistent (24px between cards)
- [ ] Empty states use standard pattern
- [ ] Tables have proper styling
- [ ] Responsive behavior works
- [ ] Material components are consistent