# FibreFlow Theme System Guide

## Overview

FibreFlow uses a centralized theme system that supports 4 themes with instant switching. All components automatically adapt to theme changes without page reloads.

## 🎨 Available Themes

1. **Light** - Clean, professional appearance with high contrast
2. **Dark** - Modern dark mode with appropriate contrast ratios  
3. **VF** - VelocityFibre brand colors (blue background with white text)
4. **FibreFlow** - Modern indigo accent with excellent readability

## 🏗️ Architecture

### Core Files

- **`src/styles/_variables.scss`** - Theme color definitions (CSS custom properties)
- **`src/styles/_theme-functions.scss`** - Color utility functions
- **`src/styles/_theme-mixins.scss`** - Component patterns and typography mixins
- **`src/styles/_component-theming.scss`** - Single import for all theme utilities
- **`src/app/core/services/theme.service.ts`** - Runtime theme switching

### Theme Variables Structure

Each theme defines these CSS custom properties:
```scss
:root, [data-theme='light'] {
  --ff-background: 255 255 255;
  --ff-foreground: 31 41 55;
  --ff-card: 255 255 255;
  --ff-primary: 55 65 81;
  --ff-success: 16 185 129;
  --ff-warning: 245 158 11;
  --ff-destructive: 239 68 68;
  --ff-border: 229 231 235;
  // ... more variables
}
```

## 🔧 How to Use in Components

### Method 1: Single Import (Recommended)

```scss
@use '../../../styles/component-theming' as theme;

.my-component {
  // Use mixins for common patterns
  @include theme.card-theme();
  
  // Direct access to theme functions
  background: theme.ff-rgb(card);
  color: theme.ff-rgb(foreground);
  padding: theme.ff-spacing(xl);
  
  // Typography mixins
  &__title {
    @include theme.heading-3();
  }
}
```

### Method 2: Individual Imports

```scss
@use '../../../styles/theme-functions' as theme-fn;
@use '../../../styles/spacing' as spacing;

.my-component {
  background: theme-fn.ff-rgb(card);
  padding: spacing.ff-spacing(lg);
}
```

## 🎯 Available Functions

### Color Functions
- `ff-rgb(color-name)` - Get RGB color
- `ff-rgba(color-name, opacity)` - Get RGBA color with opacity
- `ff-var(property)` - Get CSS variable value

### Spacing & Typography
- `ff-spacing(size)` - Get spacing value (xs, sm, md, lg, xl, 2xl, 3xl)
- `ff-font-size(size)` - Get font size (xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl)
- `ff-font-weight(weight)` - Get font weight (light, normal, medium, semibold, bold)

### Component Mixins
- `card-theme()` - Standard card styling
- `card-theme(interactive)` - Interactive card with hover effects
- `button-theme()` - Button styling
- `form-theme()` - Form field styling
- `heading-1()` through `heading-4()` - Typography presets

## 🎨 Semantic Colors

Use semantic color names for consistent theming:

### UI Colors
- `background` - Page background
- `foreground` - Primary text color
- `card` - Card backgrounds
- `border` - Border colors
- `muted` - Subtle backgrounds
- `muted-foreground` - Secondary text

### Brand Colors
- `primary` - Main brand color
- `secondary` - Secondary brand color

### Status Colors
- `success` - Success states (green)
- `warning` - Warning states (amber)
- `destructive` - Error/danger states (red)
- `info` - Information states (blue)

## 🔄 Theme Switching

### Programmatic Switching
```typescript
import { inject } from '@angular/core';
import { ThemeService } from './core/services/theme.service';

export class MyComponent {
  private themeService = inject(ThemeService);
  
  switchToVFTheme() {
    this.themeService.setTheme('vf');
  }
  
  toggleTheme() {
    this.themeService.toggleTheme(); // Cycles through all 4 themes
  }
}
```

### Theme Detection
```typescript
export class MyComponent {
  private themeService = inject(ThemeService);
  
  ngOnInit() {
    // Get current theme
    const currentTheme = this.themeService.getTheme();
    
    // Check if dark theme
    const isDark = this.themeService.isDark();
    
    // Get theme class for CSS
    const themeClass = this.themeService.themeClass(); // Returns 'theme-light', etc.
  }
}
```

## ✅ Best Practices

### Do's
- ✅ Always use theme variables instead of hard-coded colors
- ✅ Use semantic color names (`success`, `warning`, `destructive`)
- ✅ Import theme utilities with `@use` and namespaces
- ✅ Use component mixins for common patterns
- ✅ Test components in all 4 themes

### Don'ts
- ❌ Never use hard-coded hex colors (`#ffffff`, `#333333`)
- ❌ Don't use old `@import` syntax
- ❌ Don't call functions without namespaces (`ff-rgb()` instead of `theme.ff-rgb()`)
- ❌ Don't skip theme testing - components must work in all themes

## 🧪 Testing Themes

### Manual Testing
1. Use the theme switcher component in the app
2. Test all 4 themes for each new component
3. Verify text contrast and readability
4. Check hover states and interactions

### Automated Testing
```typescript
// Example component test
it('should adapt to theme changes', () => {
  // Set theme to dark
  themeService.setTheme('dark');
  fixture.detectChanges();
  
  // Verify component adapts
  const element = fixture.debugElement.nativeElement;
  expect(element.classList).toContain('theme-dark');
});
```

## 🎯 Migration from Hard-coded Colors

If you find components with hard-coded colors:

### Before (❌ Wrong)
```scss
.component {
  background: #ffffff;
  color: #333333;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

### After (✅ Correct)
```scss
@use '../../../styles/component-theming' as theme;

.component {
  background: theme.ff-rgb(card);
  color: theme.ff-rgb(foreground);
  border: 1px solid theme.ff-rgb(border);
  box-shadow: theme.ff-shadow(md);
}
```

## 🚀 Status: Complete

**✅ All components have been updated to use the centralized theme system:**
- Authentication (login, test-auth)
- Dashboard (main dashboard, admin dashboard)
- Projects (project detail, project list)
- Suppliers (list, detail, form)
- Stock (movements, form dialogs)
- Staff, Tasks, Roles, and other components

The theme system is now fully centralized and consistent across the entire application.