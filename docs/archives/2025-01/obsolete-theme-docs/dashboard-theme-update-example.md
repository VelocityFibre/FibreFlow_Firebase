# Dashboard Theme Update Example

This example shows how to update the dashboard page to match the standardized theme.

## Updated HTML Structure

```html
<div class="ff-page-container">
  <!-- Page Header -->
  <div class="ff-page-header">
    <div class="header-content">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-subtitle">Welcome to FibreFlow. Quick access to all your project management tools.</p>
    </div>
    <div class="header-actions">
      <button mat-raised-button color="primary" routerLink="/projects/new">
        <mat-icon>add</mat-icon>
        New Project
      </button>
    </div>
  </div>

  <!-- Summary Statistics -->
  <div class="summary-cards">
    <mat-card class="summary-card">
      <mat-card-content>
        <div class="card-icon success">
          <mat-icon>check_circle</mat-icon>
        </div>
        <div class="card-info">
          <div class="card-value">12</div>
          <div class="card-label">Active Projects</div>
        </div>
      </mat-card-content>
    </mat-card>

    <mat-card class="summary-card">
      <mat-card-content>
        <div class="card-icon info">
          <mat-icon>people</mat-icon>
        </div>
        <div class="card-info">
          <div class="card-value">45</div>
          <div class="card-label">Total Staff</div>
        </div>
      </mat-card-content>
    </mat-card>

    <mat-card class="summary-card">
      <mat-card-content>
        <div class="card-icon primary">
          <mat-icon>business</mat-icon>
        </div>
        <div class="card-info">
          <div class="card-value">24</div>
          <div class="card-label">Active Suppliers</div>
        </div>
      </mat-card-content>
    </mat-card>

    <mat-card class="summary-card">
      <mat-card-content>
        <div class="card-icon value">
          <mat-icon>inventory_2</mat-icon>
        </div>
        <div class="card-info">
          <div class="card-value">156</div>
          <div class="card-label">Stock Items</div>
        </div>
      </mat-card-content>
    </mat-card>
  </div>

  <!-- Quick Access Cards -->
  <div class="dashboard-section">
    <h2 class="section-title">Quick Access</h2>
    <div class="quick-access-grid">
      <!-- Projects Card -->
      <mat-card class="action-card ff-card-projects" routerLink="/projects">
        <mat-card-content>
          <div class="action-card-header">
            <div class="action-icon projects">
              <mat-icon>folder</mat-icon>
            </div>
            <mat-icon class="arrow-icon">arrow_forward</mat-icon>
          </div>
          <h3 class="action-title">Projects</h3>
          <p class="action-description">Manage and track all projects</p>
        </mat-card-content>
      </mat-card>

      <!-- Similar cards for other sections... -->
    </div>
  </div>

  <!-- Recent Activity -->
  <mat-card class="activity-card">
    <mat-card-header>
      <mat-card-title>Recent Activity</mat-card-title>
    </mat-card-header>
    <mat-card-content>
      <!-- Activity list -->
    </mat-card-content>
  </mat-card>
</div>
```

## Updated SCSS

```scss
// Remove all custom styles and use standardized patterns
// The component should have minimal custom styles

.dashboard-section {
  margin-bottom: 48px;

  .section-title {
    font-size: 24px;
    font-weight: 400;
    color: rgb(var(--ff-foreground));
    margin-bottom: 24px;
  }
}

.quick-access-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.action-card {
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  .action-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .action-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;

    mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    &.projects {
      background-color: rgb(var(--ff-primary) / 0.15);
      color: rgb(var(--ff-primary));
    }

    &.suppliers {
      background-color: rgb(var(--ff-info) / 0.15);
      color: rgb(var(--ff-info));
    }

    &.staff {
      background-color: rgb(var(--ff-success) / 0.15);
      color: rgb(var(--ff-success));
    }
  }

  .arrow-icon {
    color: rgb(var(--ff-muted-foreground));
  }

  .action-title {
    font-size: 20px;
    font-weight: 500;
    color: rgb(var(--ff-foreground));
    margin: 0 0 8px 0;
  }

  .action-description {
    font-size: 14px;
    color: rgb(var(--ff-muted-foreground));
    margin: 0;
  }
}

.activity-card {
  margin-top: 48px;
}
```

## Key Changes Made

1. **Container**: Changed from `.dashboard-container` to `.ff-page-container`
2. **Header**: Implemented standard `.ff-page-header` pattern with title/subtitle
3. **Title**: Updated to 32px, weight 300
4. **Subtitle**: Updated to 18px, weight 400
5. **Summary Cards**: Used standard `.summary-cards` grid with icon pattern
6. **Colors**: All colors now use CSS variables
7. **Spacing**: Consistent 24px margins between sections
8. **Icons**: Standard sizes (28px for summary cards, 24px for action cards)

## Benefits

- Consistent with stock-movements page
- Better responsive behavior
- Cleaner, more maintainable code
- Follows Apple-inspired design principles
- Easy to update theme globally