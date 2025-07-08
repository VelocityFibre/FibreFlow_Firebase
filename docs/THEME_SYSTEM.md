# FibreFlow Theme System

*Last Updated: 2025-01-08*  
*Status: Implemented and Active*

## Overview

FibreFlow uses a comprehensive theme system built on CSS custom properties (CSS variables) with SCSS utilities and Angular services for runtime theme switching. The system supports 4 themes and provides consistent styling across the entire application.

## Active Themes

1. **Light** (Default) - Clean, Apple-inspired white theme
2. **Dark** - Modern dark mode with reduced eye strain
3. **VF** - VelocityFibre branded blue theme
4. **FibreFlow** - Custom indigo accent theme

## Architecture

### 1. Core Files
- **Styles**: `src/styles/themes/` - Theme definitions
- **Service**: `src/app/core/services/theme.service.ts` - Runtime switching
- **Utils**: `src/styles/utils/theme-functions.scss` - SCSS utilities
- **Components**: `src/styles/components/` - Component mixins

### 2. CSS Custom Properties Structure
```scss
:root {
  // Colors (stored as RGB triplets)
  --ff-primary: 55 65 81;           // Sophisticated charcoal
  --ff-primary-foreground: 255 255 255;
  --ff-secondary: 243 244 246;      // Light gray
  --ff-background: 255 255 255;     // Pure white
  --ff-card: 255 255 255;           // Card backgrounds
  --ff-foreground: 31 41 55;        // Dark gray text
  
  // Semantic Colors
  --ff-destructive: 239 68 68;      // Error red
  --ff-success: 16 185 129;         // Success green
  --ff-warning: 245 158 11;         // Warning amber
  --ff-info: 59 130 246;            // Info blue
  
  // Layout
  --ff-radius: 0.75rem;             // 12px border radius
  --ff-border: 229 231 235;         // Light border
}
```

## Theme Functions

### Color Functions
```scss
// Convert CSS variable to RGB
.element {
  color: ff-rgb(foreground);
  background: ff-rgba(primary, 0.1);
  border-color: ff-var(border);
}
```

### Utility Functions
```scss
// Rem conversion
.text {
  font-size: ff-rem(24);  // 24px → 1.5rem
}

// Responsive clamp
.heading {
  font-size: ff-clamp(16, 2.5, 24);  // Min 16px, preferred 2.5vw, max 24px
}

// Box shadows
.card {
  box-shadow: ff-shadow(lg);  // Uses --ff-shadow-lg
}
```

## Component Implementation

### 1. Using Theme Service (Angular)
```typescript
import { ThemeService } from '@core/services/theme.service';

export class AppComponent {
  theme = inject(ThemeService);
  
  toggleTheme() {
    const current = this.theme.currentTheme();
    const next = current === 'light' ? 'dark' : 'light';
    this.theme.setTheme(next);
  }
}
```

### 2. Component Styling (SCSS)
```scss
@use '../../../styles/utils/component-theming' as theme;

.card {
  @include theme.surface-card;
  padding: theme.spacing(lg);
  
  .title {
    @include theme.typography-heading;
    color: theme.text(primary);
  }
}
```

### 3. Material Design Integration
```typescript
// Current implementation uses Azure/Blue palettes
// TODO: Update to use custom FibreFlow colors

const MATERIAL_THEME = {
  color: {
    primary: matPalettes.$azure-palette,
    tertiary: matPalettes.$blue-palette,
  }
};
```

## Design Tokens

### Color Palette
| Token | Light | Dark | VF | FibreFlow |
|-------|-------|------|----|-----------| 
| Primary | Charcoal #374151 | Blue #3B82F6 | White #FFFFFF | Indigo #6366F1 |
| Secondary | Light Gray #F3F4F6 | Gray #374151 | Dark Blue #00297A | Purple #8B5CF6 |
| Background | White #FFFFFF | Dark #111827 | VF Blue #003399 | Off-white #F9FAFB |
| Card | White #FFFFFF | Dark #1F2937 | Blue #003DB2 | White #FFFFFF |
| Foreground | Dark #1F2937 | Light #F3F4F6 | White #FFFFFF | Dark #111827 |

### Spacing Scale
- `xs`: 4px (0.25rem)
- `sm`: 8px (0.5rem)
- `md`: 16px (1rem)
- `lg`: 24px (1.5rem)
- `xl`: 32px (2rem)
- `2xl`: 48px (3rem)
- `3xl`: 64px (4rem)

### Typography Scale
- `xs`: 12px
- `sm`: 14px
- `base`: 16px
- `lg`: 18px
- `xl`: 20px
- `2xl`: 24px
- `3xl`: 30px
- `4xl`: 36px
- `5xl`: 48px
- `6xl`: 60px
- `7xl`: 72px

## Reusable Components

### 1. Page Header
```html
<app-page-header
  title="Projects"
  subtitle="Manage your projects"
  [showBackButton]="true">
</app-page-header>
```

### 2. Summary Cards
```html
<app-summary-cards [stats]="[
  { label: 'Total', value: 10, icon: 'inventory_2' },
  { label: 'Active', value: 5, icon: 'check_circle' }
]"></app-summary-cards>
```

### 3. Theme Switcher
```html
<app-theme-switcher></app-theme-switcher>
```

## SCSS Mixins

### Card Styles
```scss
.custom-card {
  @include surface-card;
  @include card-interactive; // Adds hover effects
}
```

### Button Styles
```scss
.action-button {
  @include button-primary;
  // or
  @include button-secondary;
  // or  
  @include button-text;
}
```

### Form Styles
```scss
.form-field {
  @include form-field;
  
  input {
    @include input-base;
  }
}
```

## Best Practices

### ✅ DO
- Use theme functions for all colors: `ff-rgb(primary)`
- Use spacing functions: `ff-spacing(md)`
- Test components in all 4 themes
- Use semantic color names (primary, error, success)
- Import theming utilities via `component-theming`

### ❌ DON'T
- Hardcode colors: `color: #2196F3`
- Use pixel values directly: `padding: 16px`
- Mix Material colors with theme colors
- Access CSS variables directly
- Create component-specific colors

## Migration Guide

### From Hardcoded Values
```scss
// Before
.element {
  color: #333333;
  background: #f5f5f5;
  padding: 16px;
}

// After
.element {
  color: ff-rgb(text-primary);
  background: ff-rgb(surface-secondary);
  padding: ff-spacing(md);
}
```

### From Material Theme
```scss
// Before
.mat-button {
  background: mat.get-color($theme, primary);
}

// After
.custom-button {
  @include button-primary;
}
```

## Theme Service API

### Methods
- `currentTheme()`: Get current theme signal
- `setTheme(theme: Theme)`: Change theme
- `availableThemes`: List of available themes

### Usage Example
```typescript
// In component
currentTheme = this.themeService.currentTheme;

// In template
<button (click)="themeService.setTheme('dark')">
  Dark Mode
</button>
```

## Known Issues & TODOs

1. **Material Palette**: Still using default Azure/Blue - needs custom colors
2. **Print Styles**: Not yet implemented
3. **High Contrast**: Accessibility mode not implemented
4. **Theme Previews**: No preview functionality

## References

- Theme definitions: `src/styles/themes/`
- Component library: `src/app/shared/components/`
- Material config: `src/styles/material/`
- Utils: `src/styles/utils/`