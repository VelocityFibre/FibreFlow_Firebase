# FibreFlow Theme Component Library

## Overview
This document outlines the mandatory reusable components that ensure theme consistency across all pages in FibreFlow. All new pages MUST use these components instead of creating custom layouts.

## 🚨 CRITICAL RULE
**NEVER create manual page headers, summary cards, or filter forms. Always use the reusable components.**

## Component Library

### 1. PageHeaderComponent
**Location:** `src/app/shared/components/page-header/page-header.component.ts`

**Purpose:** Standardized page headers with title, subtitle, and action buttons.

**Usage:**
```typescript
import { PageHeaderComponent, PageHeaderAction } from '@/shared/components/page-header/page-header.component';

@Component({
  imports: [PageHeaderComponent],
  template: `
    <app-page-header
      title="Your Page Title"
      subtitle="Optional description of what this page does"
      [actions]="headerActions"
    ></app-page-header>
  `
})
export class YourPageComponent {
  headerActions: PageHeaderAction[] = [
    {
      label: 'Add Item',
      icon: 'add',
      color: 'primary',
      action: () => this.openAddDialog()
    },
    {
      label: 'Export',
      icon: 'download',
      color: 'accent',
      action: () => this.exportData()
    }
  ];
}
```

**Features:**
- ✅ Automatic 32px title with font-weight 300
- ✅ 18px subtitle with muted color
- ✅ Responsive action buttons
- ✅ Consistent spacing and alignment

### 2. SummaryCardsComponent
**Location:** `src/app/shared/components/summary-cards/summary-cards.component.ts`

**Purpose:** Standardized summary statistics cards with icons and values.

**Usage:**
```typescript
import { SummaryCardsComponent, SummaryCard } from '@/shared/components/summary-cards/summary-cards.component';

@Component({
  imports: [SummaryCardsComponent],
  template: `
    <app-summary-cards [cards]="summaryCards"></app-summary-cards>
  `
})
export class YourPageComponent {
  get summaryCards(): SummaryCard[] {
    return [
      {
        value: this.data.length,
        label: 'Total Items',
        icon: 'inventory',
        color: 'primary'
      },
      {
        value: this.getActiveCount(),
        label: 'Active',
        icon: 'check_circle',
        color: 'success'
      },
      {
        value: this.getPendingCount(),
        label: 'Pending',
        icon: 'schedule',
        color: 'warning'
      },
      {
        value: this.getIssuesCount(),
        label: 'Issues',
        icon: 'error',
        color: 'danger'
      }
    ];
  }
}
```

**SummaryCard Interface:**
```typescript
interface SummaryCard {
  value: string | number;
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'info' | 'danger';
  progress?: number; // Optional progress bar (0-100)
  subtitle?: string; // Optional subtitle text
}
```

**Features:**
- ✅ Automatic 4-card responsive grid
- ✅ Standardized icons and colors
- ✅ Optional progress bars
- ✅ Hover effects and transitions

### 3. FilterFormComponent
**Location:** `src/app/shared/components/filter-form/filter-form.component.ts`

**Purpose:** Standardized filter forms with various input types.

**Usage:**
```typescript
import { FilterFormComponent, FilterField } from '@/shared/components/filter-form/filter-form.component';

@Component({
  imports: [FilterFormComponent, ReactiveFormsModule],
  template: `
    <app-filter-form
      [formGroup]="filterForm"
      [fields]="filterFields"
      [showActions]="true"
      [showReset]="true"
      (apply)="onFiltersApply($event)"
      (reset)="onFiltersReset()"
    ></app-filter-form>
  `
})
export class YourPageComponent {
  filterForm = new FormGroup({
    search: new FormControl(''),
    status: new FormControl('all'),
    dateFrom: new FormControl(''),
    active: new FormControl(false)
  });

  filterFields: FilterField[] = [
    {
      type: 'text',
      key: 'search',
      label: 'Search',
      placeholder: 'Search by name...',
      icon: 'search',
      width: '300px'
    },
    {
      type: 'select',
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'active', label: 'Active' },
        { value: 'pending', label: 'Pending' }
      ]
    },
    {
      type: 'date',
      key: 'dateFrom',
      label: 'From Date'
    },
    {
      type: 'checkbox',
      key: 'active',
      label: 'Show only active items'
    }
  ];

  onFiltersApply(filters: any) {
    // Apply filters to your data
    this.applyFilters(filters);
  }

  onFiltersReset() {
    // Reset any additional state
    this.loadData();
  }
}
```

**FilterField Interface:**
```typescript
interface FilterField {
  type: 'text' | 'select' | 'date' | 'daterange' | 'checkbox';
  key: string;
  label: string;
  placeholder?: string;
  options?: { value: any; label: string }[];
  multiple?: boolean;
  appearance?: 'fill' | 'outline';
  width?: string;
  icon?: string;
}
```

**Features:**
- ✅ Multiple input types (text, select, date, checkbox)
- ✅ Responsive layout (stacks on mobile)
- ✅ Built-in Apply/Reset buttons
- ✅ Consistent styling and spacing

## Standard Page Template

### Complete Page Structure
```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PageHeaderComponent, PageHeaderAction } from '@/shared/components/page-header/page-header.component';
import { SummaryCardsComponent, SummaryCard } from '@/shared/components/summary-cards/summary-cards.component';
import { FilterFormComponent, FilterField } from '@/shared/components/filter-form/filter-form.component';

@Component({
  selector: 'app-your-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    SummaryCardsComponent,
    FilterFormComponent,
  ],
  template: `
    <div class="ff-page-container">
      <!-- Page Header -->
      <app-page-header
        title="Your Page Title"
        subtitle="Description of what this page manages"
        [actions]="headerActions"
      ></app-page-header>

      <!-- Summary Cards -->
      <app-summary-cards [cards]="summaryCards"></app-summary-cards>

      <!-- Filters -->
      <app-filter-form
        [formGroup]="filterForm"
        [fields]="filterFields"
        (apply)="onFiltersApply($event)"
        (reset)="onFiltersReset()"
      ></app-filter-form>

      <!-- Data Table -->
      <mat-card class="table-card">
        <mat-card-header>
          <mat-card-title>Your Data</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="table-container">
            <table mat-table [dataSource]="filteredData">
              <!-- Define your columns here -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let item">{{ item.name }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>

            <!-- Standard Empty State -->
            <div *ngIf="filteredData.length === 0" class="empty-state">
              <mat-icon>folder_open</mat-icon>
              <h3>No items found</h3>
              <p>Create your first item to get started</p>
              <button mat-raised-button color="primary" (click)="addItem()">
                <mat-icon>add</mat-icon>
                Add Item
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      min-width: 600px;
    }

    // Empty state - standard pattern
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: rgb(var(--ff-border));
      margin-bottom: 24px;
    }

    .empty-state h3 {
      font-size: 24px;
      font-weight: 400;
      color: rgb(var(--ff-foreground));
      margin: 0 0 8px 0;
    }

    .empty-state p {
      font-size: 16px;
      color: rgb(var(--ff-muted-foreground));
      margin: 0 0 24px 0;
    }
  `]
})
export class YourPageComponent implements OnInit {
  data: any[] = [];
  filteredData: any[] = [];
  displayedColumns = ['name', 'status', 'actions'];

  // Filter form
  filterForm = new FormGroup({
    search: new FormControl(''),
    status: new FormControl('all')
  });

  // Header actions
  headerActions: PageHeaderAction[] = [
    {
      label: 'Add Item',
      icon: 'add',
      color: 'primary',
      action: () => this.addItem()
    }
  ];

  // Filter fields
  filterFields: FilterField[] = [
    {
      type: 'text',
      key: 'search',
      label: 'Search',
      icon: 'search',
      width: '300px'
    },
    {
      type: 'select',
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    }
  ];

  // Summary cards
  get summaryCards(): SummaryCard[] {
    return [
      {
        value: this.data.length,
        label: 'Total Items',
        icon: 'inventory',
        color: 'primary'
      },
      {
        value: this.data.filter(item => item.status === 'active').length,
        label: 'Active',
        icon: 'check_circle',
        color: 'success'
      }
      // Add more cards as needed
    ];
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // Load your data here
  }

  onFiltersApply(filters: any) {
    // Apply filters to data
    this.applyFilters(filters);
  }

  onFiltersReset() {
    // Reset filters
    this.filteredData = [...this.data];
  }

  addItem() {
    // Add new item logic
  }

  private applyFilters(filters: any) {
    // Filter logic implementation
  }
}
```

## CSS Classes to Use

### Required Container Classes
- `ff-page-container` - Main page wrapper (max-width, padding)
- `table-card` - Standard table card styling
- `table-container` - Table wrapper with scroll
- `empty-state` - Standard empty state styling

### Standard CSS Variables
Always use these CSS variables for colors:
- `rgb(var(--ff-primary))` - Primary color
- `rgb(var(--ff-success))` - Success/green color
- `rgb(var(--ff-warning))` - Warning/orange color
- `rgb(var(--ff-info))` - Info/blue color
- `rgb(var(--ff-destructive))` - Error/red color
- `rgb(var(--ff-foreground))` - Text color
- `rgb(var(--ff-muted-foreground))` - Muted text color
- `rgb(var(--ff-border))` - Border color

## Benefits of This System

### ✅ Automatic Consistency
- All pages look identical in layout and spacing
- Fonts, colors, and spacing are automatically consistent
- No manual CSS needed for basic layouts

### ✅ Maintenance
- Update one component to update all pages
- Theme changes propagate automatically
- Less code duplication

### ✅ Developer Experience
- Faster page creation
- Type-safe interfaces
- Predictable component behavior

### ✅ Future-Proof
- New pages automatically follow standards
- Easy to add new features to all pages
- Consistent user experience

## Examples in the Codebase

### ✅ Good Examples (Updated)
- `/phases` - Uses all three components correctly
- More pages to be updated...

### ❌ Bad Examples (DO NOT COPY)
- Old manual implementations in existing pages

## Migration Guide

When updating an existing page:

1. **Replace manual header** with `<app-page-header>`
2. **Replace manual summary sections** with `<app-summary-cards>`
3. **Replace manual filter forms** with `<app-filter-form>`
4. **Use standard CSS classes** for remaining elements
5. **Remove custom CSS** that duplicates component functionality

Remember: The goal is consistency and maintainability. These components ensure that every page looks and behaves the same way, making the application feel cohesive and professional.