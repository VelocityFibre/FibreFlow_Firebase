# FibreFlow Theme Standards

*Last Updated: 2025-06-20*

Based on the stock-movements page design, this document defines the standardized theme, layout, and styling patterns to be applied across all pages in the FibreFlow application.

## Page Layout Structure

### Container
```scss
.ff-page-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 40px 24px;
  
  @media (max-width: 768px) {
    padding: 24px 16px;
  }
}
```

### Page Header Pattern
```html
<div class="ff-page-header">
  <div class="header-content">
    <h1 class="page-title">Page Title</h1>
    <p class="page-subtitle">Brief description of the page functionality</p>
  </div>
  <div class="header-actions">
    <button mat-raised-button color="primary">
      <mat-icon>add</mat-icon>
      Primary Action
    </button>
  </div>
</div>
```

#### Header Styles
```scss
.ff-page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 48px;
  
  .header-content {
    flex: 1;
  }
  
  .page-title {
    font-size: 32px;
    font-weight: 300;
    color: rgb(var(--ff-foreground));
    margin: 0 0 8px 0;
    letter-spacing: -0.02em;
  }
  
  .page-subtitle {
    font-size: 18px;
    color: rgb(var(--ff-muted-foreground));
    font-weight: 400;
    margin: 0;
  }
  
  .header-actions {
    display: flex;
    gap: 8px;
  }
}
```

## Typography Scale

### Font Family
```scss
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
```

### Font Sizes & Weights
- **Page Title**: 32px, font-weight: 300 (light)
- **Page Subtitle**: 18px, font-weight: 400 (normal)
- **Section Title**: 24px, font-weight: 400
- **Card Title**: 18px, font-weight: 500
- **Body Text**: 14px, font-weight: 400
- **Small Text**: 12px, font-weight: 400
- **Large Values**: 28px, font-weight: 600

## Color System

### CSS Variables
```scss
// Primary colors
--ff-primary: Primary action color
--ff-primary-foreground: Text on primary backgrounds

// Status colors
--ff-success: Success/incoming indicators
--ff-destructive: Error/outgoing indicators
--ff-warning: Warning states
--ff-info: Information/neutral states

// UI colors
--ff-background: Page background
--ff-foreground: Primary text color
--ff-card: Card background
--ff-card-foreground: Text on cards
--ff-muted: Muted backgrounds
--ff-muted-foreground: Secondary text
--ff-border: Border color
--ff-ring: Focus ring color
```

### Color Usage
- **Success/Incoming**: `rgb(var(--ff-success))`
- **Error/Outgoing**: `rgb(var(--ff-destructive))`
- **Info/Neutral**: `rgb(var(--ff-info))`
- **Muted Text**: `rgb(var(--ff-muted-foreground))`

## Component Patterns

### Summary Cards Grid
```scss
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}
```

### Card with Icon Pattern
```scss
.summary-card {
  mat-card-content {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px !important;
  }
  
  .card-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
  }
  
  .card-value {
    font-size: 28px;
    font-weight: 600;
    line-height: 1;
  }
  
  .card-label {
    font-size: 14px;
    color: rgb(var(--ff-muted-foreground));
    margin-top: 4px;
  }
}
```

### Filter Form Pattern
```scss
.filter-form {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-start;
  
  mat-form-field {
    flex: 1;
    min-width: 200px;
    max-width: 250px;
  }
}
```

### Table Styling
```scss
table {
  width: 100%;
  
  th {
    font-weight: 600;
    color: rgb(var(--ff-foreground));
    background-color: rgb(var(--ff-muted) / 0.3);
  }
  
  td {
    color: rgb(var(--ff-foreground));
  }
}
```

### Empty State Pattern
```scss
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  
  mat-icon {
    font-size: 64px;
    width: 64px;
    height: 64px;
    color: rgb(var(--ff-border));
    margin-bottom: 16px;
  }
  
  p {
    margin: 0;
    color: rgb(var(--ff-muted-foreground));
    font-size: 16px;
  }
}
```

## Material Component Overrides

### Mat-Card
```scss
.mat-mdc-card {
  border-radius: var(--ff-radius) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
  border: 1px solid rgb(var(--ff-border)) !important;
  background-color: rgb(var(--ff-card)) !important;
  margin-bottom: 24px;
}
```

### Mat-Button
```scss
.mat-mdc-raised-button {
  border-radius: 6px !important;
  text-transform: none !important;
  font-weight: 500 !important;
  letter-spacing: 0 !important;
  padding: 0 16px !important;
  height: 40px !important;
}
```

### Mat-Form-Field
```scss
mat-form-field {
  appearance: outline;
  
  // Consistent sizing
  flex: 1;
  min-width: 200px;
  max-width: 250px;
}
```

### Mat-Chip
```scss
mat-chip {
  font-size: 12px;
  height: 24px;
  padding: 0 8px;
  border-radius: 12px;
}
```

## Spacing System

### Standard Spacing Values
- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 24px
- **2xl**: 32px
- **3xl**: 40px
- **4xl**: 48px

### Common Margins
- **Page header bottom**: 48px
- **Card bottom**: 24px
- **Section bottom**: 24px
- **Form field gap**: 16px

### Common Padding
- **Page container**: 40px 24px (mobile: 24px 16px)
- **Card content**: 24px
- **Table cells**: 12px 16px

## Icon Standards

### Icon Sizes
- **Default**: 20px
- **Small**: 16px
- **Large**: 24px
- **Extra Large**: 28px (for card icons)
- **Empty State**: 64px

### Icon Colors
- Match the context (success, error, info, muted)
- Use CSS variables for consistency

## Responsive Design

### Breakpoints
- **Mobile**: max-width: 768px
- **Tablet**: max-width: 1024px
- **Desktop**: min-width: 1025px

### Mobile Adjustments
- Reduce padding: 40px → 24px
- Stack header content/actions vertically
- Adjust grid columns to single column
- Reduce font sizes proportionally

## Implementation Checklist

When updating a page to match these standards:

1. [ ] Replace container with `.ff-page-container`
2. [ ] Update header to use `.ff-page-header` pattern
3. [ ] Set page title to 32px, weight 300
4. [ ] Set subtitle to 18px, weight 400
5. [ ] Use CSS color variables (--ff-*)
6. [ ] Apply consistent spacing (24px margins between cards)
7. [ ] Update Material component styles
8. [ ] Ensure responsive behavior
9. [ ] Use standard icon sizes
10. [ ] Apply empty state pattern where needed

## Example Page Structure

```html
<div class="ff-page-container">
  <!-- Page Header -->
  <div class="ff-page-header">
    <div class="header-content">
      <h1 class="page-title">Page Title</h1>
      <p class="page-subtitle">Description of page functionality</p>
    </div>
    <div class="header-actions">
      <button mat-raised-button color="primary">
        <mat-icon>add</mat-icon>
        New Item
      </button>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="summary-cards">
    <mat-card class="summary-card">
      <!-- Card content -->
    </mat-card>
  </div>

  <!-- Main Content -->
  <mat-card>
    <!-- Table or form content -->
  </mat-card>
</div>
```

## Theme Standards Compliance Status (2025-06-20)

### ✅ Fully Compliant Pages
The following pages have been updated to match these theme standards:

1. **Stock Movements** (`/stock-movements`) - Original reference page
2. **Dashboard** (`/dashboard`)
3. **Projects** (`/projects`)
4. **Daily Progress** (`/daily-progress`)

### 🔄 Pages Pending Update
- Staff Management
- Suppliers Detail Pages
- BOQ Management
- Contractors
- Tasks/My Tasks
- Roles Management
- Client Management

### Implementation Notes
- All compliant pages use the `.ff-page-container` with 1280px max-width
- Page headers follow the standard pattern with 32px/300 weight titles
- All colors reference theme variables through `theme.ff-rgb()` functions
- Consistent spacing: 48px header margin, 24px between sections
- Responsive breakpoints properly implemented