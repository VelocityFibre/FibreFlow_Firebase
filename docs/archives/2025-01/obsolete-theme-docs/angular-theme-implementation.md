# Angular Theme Implementation Guide

## How Angular Themes Work: Function + Form

### **Architecture Overview**

```
┌─────────────────────────────────────────┐
│         Angular Components              │
│  (TypeScript logic + HTML templates)    │
└────────────────┬────────────────────────┘
                 │ uses
┌────────────────▼────────────────────────┐
│         Theme Service                   │
│  (Runtime theme switching logic)        │
└────────────────┬────────────────────────┘
                 │ applies
┌────────────────▼────────────────────────┐
│      SCSS Variables & Utilities         │
│  (CSS custom properties + classes)      │
└─────────────────────────────────────────┘
```

## Step 1: Create the Foundation (SCSS Variables)

**File:** `src/styles/_variables.scss`
```scss
// CSS Custom Properties that change with theme
:root {
  // Default light theme
  --ff-background: 255 255 255;
  --ff-foreground: 31 41 55;
  --ff-primary: 55 65 81;
  --ff-border: 229 231 235;
  
  // Spacing constants (don't change with theme)
  --ff-spacing-unit: 8px;
  --ff-radius: 0.75rem;
}

// Dark theme override
[data-theme="dark"] {
  --ff-background: 17 24 39;
  --ff-foreground: 243 244 246;
  --ff-primary: 59 130 246;
  --ff-border: 55 65 81;
}

// SCSS variables for compile-time calculations
$spacing-unit: 8px;
$spacing: (
  xs: $spacing-unit * 0.5,    // 4px
  sm: $spacing-unit,           // 8px
  md: $spacing-unit * 2,      // 16px
  lg: $spacing-unit * 3,      // 24px
  xl: $spacing-unit * 4,      // 32px
  2xl: $spacing-unit * 6,     // 48px
  3xl: $spacing-unit * 8,     // 64px
  4xl: $spacing-unit * 10     // 80px
);
```

## Step 2: Create Utility Functions

**File:** `src/styles/_functions.scss`
```scss
// Convert CSS variable to RGB
@function ff-rgb($color) {
  @return rgb(var(--ff-#{$color}));
}

// Get spacing value
@function spacing($size) {
  @return map-get($spacing, $size);
}

// Usage examples:
// background: ff-rgb(background);
// padding: spacing(xl);
```

## Step 3: Build the Theme Service

**File:** `src/app/core/services/theme.service.ts`
```typescript
import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'vf' | 'fibreflow';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Using Angular signals for reactive theme management
  private theme = signal<Theme>('light');
  
  constructor() {
    // Load saved theme
    const saved = localStorage.getItem('ff-theme') as Theme;
    if (saved) {
      this.setTheme(saved, false);
    }
    
    // React to theme changes
    effect(() => {
      const currentTheme = this.theme();
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('ff-theme', currentTheme);
    });
  }
  
  getTheme() {
    return this.theme();
  }
  
  setTheme(theme: Theme, save = true) {
    this.theme.set(theme);
  }
  
  // Computed signal for theme-aware classes
  readonly isDark = computed(() => this.theme() === 'dark');
  readonly themeClass = computed(() => `theme-${this.theme()}`);
}
```

## Step 4: Create Smart Components

**File:** `src/app/shared/components/card/card.component.ts`
```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ff-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="ff-card"
      [class.ff-card--elevated]="elevated"
      [class.ff-card--interactive]="interactive">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    @import '../../../styles/functions';
    
    .ff-card {
      padding: spacing(xl);
      border-radius: var(--ff-radius);
      background: ff-rgb(background);
      border: 1px solid ff-rgb(border);
      transition: all 0.3s ease;
      
      &--elevated {
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      }
      
      &--interactive {
        cursor: pointer;
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        }
      }
    }
  `]
})
export class CardComponent {
  @Input() elevated = false;
  @Input() interactive = false;
}
```

## Step 5: Theme-Aware Page Component

**File:** `src/app/features/dashboard/dashboard.component.ts`
```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../core/services/theme.service';
import { CardComponent } from '../../shared/components/card/card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CardComponent],
  template: `
    <div class="dashboard" [class.dashboard--dark]="themeService.isDark()">
      <header class="dashboard__header">
        <h1 class="dashboard__title">Dashboard</h1>
        <button 
          class="theme-toggle"
          (click)="toggleTheme()"
          [attr.aria-label]="'Switch to ' + (themeService.isDark() ? 'light' : 'dark') + ' theme'">
          @if (themeService.isDark()) {
            <svg><!-- Sun icon --></svg>
          } @else {
            <svg><!-- Moon icon --></svg>
          }
        </button>
      </header>
      
      <main class="dashboard__content">
        <ff-card elevated="true" class="stat-card">
          <h2 class="stat-card__value">1,234</h2>
          <p class="stat-card__label">Total Projects</p>
        </ff-card>
        
        <ff-card interactive="true" (click)="viewDetails()">
          <p>Click me for details</p>
        </ff-card>
      </main>
    </div>
  `,
  styles: [`
    @import '../../../styles/functions';
    
    .dashboard {
      min-height: 100vh;
      background: ff-rgb(background);
      color: ff-rgb(foreground);
      padding: spacing(xl);
      
      &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: spacing(3xl);
      }
      
      &__title {
        font-size: 3rem;
        font-weight: 300;
        color: ff-rgb(foreground);
      }
      
      &__content {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: spacing(lg);
      }
    }
    
    .theme-toggle {
      padding: spacing(sm);
      border-radius: var(--ff-radius);
      background: ff-rgb(primary);
      color: ff-rgb(background);
      border: none;
      cursor: pointer;
      transition: transform 0.2s;
      
      &:hover {
        transform: scale(1.1);
      }
      
      svg {
        width: 24px;
        height: 24px;
      }
    }
    
    .stat-card {
      &__value {
        font-size: 2.5rem;
        font-weight: 300;
        margin-bottom: spacing(sm);
      }
      
      &__label {
        color: ff-rgb(muted-foreground);
      }
    }
  `]
})
export class DashboardComponent {
  protected themeService = inject(ThemeService);
  
  toggleTheme() {
    const current = this.themeService.getTheme();
    const next = current === 'light' ? 'dark' : 'light';
    this.themeService.setTheme(next);
  }
  
  viewDetails() {
    console.log('View details clicked');
  }
}
```

## The Magic: How It All Works Together

### 1. **SCSS Variables provide the design tokens**
```scss
// Compile-time: Used for calculations and mixins
$spacing-unit: 8px;

// Runtime: Changed by theme switching
--ff-background: 255 255 255;
```

### 2. **Theme Service manages state**
```typescript
// Angular signals make theme reactive
setTheme('dark') → Updates DOM → CSS variables change → Components re-render
```

### 3. **Components stay clean and functional**
```typescript
// Component doesn't care about theme specifics
<ff-card elevated="true">
  // Just works in any theme
</ff-card>
```

### 4. **Styles use functions for consistency**
```scss
// Instead of hardcoding
padding: 32px;
background: #ffffff;

// Use system values
padding: spacing(xl);
background: ff-rgb(background);
```

## Performance Benefits

1. **CSS Variables = Native Performance**
   - Browser handles theme switching
   - No JavaScript re-renders needed
   - Instant theme changes

2. **Angular Signals = Smart Updates**
   - Only re-render when needed
   - Computed values cached
   - TypeScript type safety

3. **SCSS Functions = Build-time Optimization**
   - Calculations done at compile time
   - Smaller CSS output
   - Consistent spacing/sizing

## Quick Start Implementation

```bash
# 1. Create the structure
mkdir -p src/styles
mkdir -p src/app/core/services
mkdir -p src/app/shared/components

# 2. Add the files
touch src/styles/_variables.scss
touch src/styles/_functions.scss
touch src/app/core/services/theme.service.ts

# 3. Import in main styles
echo '@import "./styles/variables";' >> src/styles.scss
echo '@import "./styles/functions";' >> src/styles.scss

# 4. Use in components
# Just import and use the functions/variables!
```

## Testing Your Theme Implementation

```typescript
// theme-test.component.ts
@Component({
  template: `
    <div class="theme-test">
      <!-- Test all theme colors -->
      <div class="color-grid">
        @for (color of colors; track color) {
          <div class="color-swatch" [style.background]="'rgb(var(--ff-' + color + '))'">
            {{ color }}
          </div>
        }
      </div>
      
      <!-- Test spacing -->
      <div class="spacing-test">
        @for (size of spacingSizes; track size) {
          <div class="spacing-box" [style.padding.px]="getSpacing(size)">
            {{ size }}: {{ getSpacing(size) }}px
          </div>
        }
      </div>
    </div>
  `
})
export class ThemeTestComponent {
  colors = ['background', 'foreground', 'primary', 'border'];
  spacingSizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
  
  getSpacing(size: string): number {
    const map = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64, '4xl': 80 };
    return map[size];
  }
}
```

## Best Practices Summary

1. **Function First**: Components handle logic, themes handle looks
2. **Use the System**: Always use spacing() and ff-rgb() functions
3. **Stay Reactive**: Use Angular signals for theme state
4. **Test Everything**: Every component should work in all themes
5. **Performance Matters**: Let CSS do the work, not JavaScript

This approach gives you:
- ✅ Clean, maintainable code
- ✅ Beautiful, consistent UI
- ✅ Fast theme switching
- ✅ Type-safe theming
- ✅ Easy to extend