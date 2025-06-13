# FibreFlow Centralized Theme System Usage Guide

This guide explains how to use the new centralized theme system in FibreFlow components.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Import Patterns](#import-patterns)
3. [Typography](#typography)
4. [Components](#components)
5. [Colors](#colors)
6. [Layout](#layout)
7. [Helper Utilities](#helper-utilities)
8. [Theme Compatibility](#theme-compatibility)
9. [Migration Guide](#migration-guide)

## Quick Start

### Single Import (Recommended)

```scss
// Import everything you need in one line
@use 'src/styles/component-theming' as theme;

.my-component {
  // Use colors
  background: theme.color(card);
  color: theme.color(card-foreground);
  
  // Use typography
  @include theme.h2();
  
  // Use component patterns
  @include theme.card(interactive);
}
```

### Specific Imports

```scss
// Import only what you need
@use 'src/styles/theme-mixins' as mixins;
@use 'src/styles/theme-functions' as functions;

.my-component {
  background: functions.ff-rgb(card);
  @include mixins.heading-2();
}
```

## Import Patterns

### Pattern 1: Everything (Easiest)
```scss
@use 'src/styles/component-theming' as theme;
```
**Use when:** You need multiple theme utilities in one component.

### Pattern 2: Specific Utilities
```scss
@use 'src/styles/theme-mixins' as mixins;
@use 'src/styles/theme-functions' as functions;
```
**Use when:** You only need specific functionality.

### Pattern 3: Direct Access
```scss
@use 'src/styles/component-theming' as *;
```
**Use when:** You want all functions/mixins available without prefixes (not recommended for large components).

## Typography

### Basic Typography Mixins

```scss
@use 'src/styles/component-theming' as theme;

.hero-title {
  @include theme.display(); // Largest heading
}

.page-title {
  @include theme.h1(); // H1 style
}

.section-title {
  @include theme.h2(); // H2 style
}

.card-title {
  @include theme.h3(); // H3 style
}

.label {
  @include theme.label(); // Form labels
}

.body-text {
  @include theme.body(); // Body text
}

.small-text {
  @include theme.small(); // Small text
}
```

### Direct Typography Functions

```scss
@use 'src/styles/component-theming' as theme;

.custom-text {
  font-size: theme.font-size(xl);
  font-weight: theme.font-weight(medium);
  line-height: 1.4;
  color: theme.color(foreground);
}
```

## Components

### Card Components

```scss
@use 'src/styles/component-theming' as theme;

// Basic card
.info-card {
  @include theme.card(); // default variant
}

// Interactive card (hover effects)
.clickable-card {
  @include theme.card(interactive);
}

// Compact card (less padding)
.summary-card {
  @include theme.card(compact);
}
```

### Button Components

```scss
@use 'src/styles/component-theming' as theme;

// Primary button
.submit-btn {
  @include theme.button(primary); // default size
}

// Secondary large button
.cancel-btn {
  @include theme.button(secondary, lg);
}

// Small outline button
.edit-btn {
  @include theme.button(outline, sm);
}

// Ghost button
.link-btn {
  @include theme.button(ghost);
}

// Destructive button
.delete-btn {
  @include theme.button(destructive);
}

// Icon button
.icon-btn {
  @include theme.button(primary, icon);
}
```

### Form Components

```scss
@use 'src/styles/component-theming' as theme;

// Standard input
.form-input {
  @include theme.input(); // default variant
}

// Error state input
.error-input {
  @include theme.input(error);
}

// Success state input
.success-input {
  @include theme.input(success);
}
```

### Status Indicators

```scss
@use 'src/styles/component-theming' as theme;

.status-success {
  @include theme.status(success);
}

.status-warning {
  @include theme.status(warning);
}

.status-error {
  @include theme.status(error);
}

.status-info {
  @include theme.status(info);
}
```

## Colors

### Using Color Functions

```scss
@use 'src/styles/component-theming' as theme;

.my-component {
  // Solid colors
  background: theme.color(background);
  color: theme.color(foreground);
  border: 1px solid theme.color(border);
  
  // Colors with transparency
  backdrop-filter: blur(8px);
  background: theme.color-alpha(background, 0.8);
  
  // CSS custom property reference
  box-shadow: 0 4px 12px theme.color-var(border);
}
```

### Available Color Tokens

```scss
// Layout colors
theme.color(background)          // Page background
theme.color(foreground)          // Primary text
theme.color(card)               // Card background
theme.color(card-foreground)    // Card text

// Interactive colors
theme.color(primary)            // Primary buttons, links
theme.color(primary-foreground) // Text on primary
theme.color(secondary)          // Secondary elements
theme.color(secondary-foreground)

// UI colors
theme.color(muted)              // Muted backgrounds
theme.color(muted-foreground)   // Muted text
theme.color(accent)             // Accent backgrounds
theme.color(accent-foreground)  // Text on accent

// Semantic colors
theme.color(destructive)        // Error, delete actions
theme.color(success)            // Success states
theme.color(warning)            // Warning states
theme.color(info)              // Info states

// Input colors
theme.color(border)             // Default borders
theme.color(input)              // Input borders
theme.color(ring)              // Focus rings
```

## Layout

### Container and Sections

```scss
@use 'src/styles/component-theming' as theme;

.page-wrapper {
  @include theme.container(); // Page container with responsive padding
}

.content-section {
  @include theme.section(); // Section spacing
}
```

### Grid Layouts

```scss
@use 'src/styles/component-theming' as theme;

.card-grid {
  @include theme.grid(3, lg); // 3 columns, large gap
}

.responsive-grid {
  @include theme.grid(4, md); // 4 columns on desktop, responsive
}
```

### Spacing

```scss
@use 'src/styles/component-theming' as theme;

.spaced-content {
  padding: theme.space(xl);
  margin-bottom: theme.space(lg);
  gap: theme.space(md);
}
```

## Helper Utilities

### Focus and Hover States

```scss
@use 'src/styles/component-theming' as theme;

.interactive-element {
  @include theme.focus(); // Focus ring
  @include theme.hover(); // Hover animation
}
```

### Elevation and Shadows

```scss
@use 'src/styles/component-theming' as theme;

.elevated-card {
  @include theme.elevation(lg); // Large shadow
  box-shadow: theme.shadow(sm); // Or use shadow function
}
```

### Loading States

```scss
@use 'src/styles/component-theming' as theme;

.loading-placeholder {
  @include theme.skeleton(); // Animated skeleton
}
```

### Scrollbars

```scss
@use 'src/styles/component-theming' as theme;

.scrollable-content {
  @include theme.scrollbar(); // Themed scrollbars
}
```

### Tables

```scss
@use 'src/styles/component-theming' as theme;

.data-table {
  @include theme.table(); // Complete table theming
}
```

## Theme Compatibility

The system works with all 4 themes:

- **light** - Default light theme
- **dark** - Dark theme  
- **vf** - VelocityFibre brand theme
- **fibreflow** - FibreFlow brand theme

Themes are controlled by the `data-theme` attribute and managed by the Angular `ThemeService`.

```typescript
// In your component
constructor(private themeService: ThemeService) {}

switchTheme() {
  this.themeService.setTheme('dark');
}
```

## Migration Guide

### From Old Pattern
```scss
// OLD WAY
@use './styles/theme-functions' as theme;
@use './styles/spacing' as spacing;

.my-component {
  background: theme.ff-rgb(card);
  font-size: spacing.ff-font-size(xl);
  padding: spacing.ff-spacing(lg);
}
```

### To New Pattern
```scss
// NEW WAY (Recommended)
@use 'src/styles/component-theming' as theme;

.my-component {
  background: theme.color(card);
  @include theme.h3(); // Includes font-size, weight, line-height, color
  padding: theme.space(lg);
}
```

### Benefits of Migration

1. **Fewer imports** - One import instead of multiple
2. **Shorter function names** - `theme.color()` vs `theme.ff-rgb()`
3. **Consistent patterns** - Mixins handle complex styling
4. **Better maintainability** - Centralized theming logic
5. **Type safety** - Better SCSS compilation checking

## Best Practices

1. **Use the single import pattern** for most components
2. **Prefer mixins over manual styling** for common patterns
3. **Use semantic color names** (success, warning) over specific colors
4. **Test with all 4 themes** during development
5. **Use responsive mixins** for mobile-friendly designs

## Examples in Real Components

### Angular Component SCSS
```scss
// src/app/features/projects/components/project-card/project-card.component.scss
@use 'src/styles/component-theming' as theme;

.project-card {
  @include theme.card(interactive);
  
  &__header {
    margin-bottom: theme.space(lg);
  }
  
  &__title {
    @include theme.h3();
    margin-bottom: theme.space(sm);
  }
  
  &__status {
    @include theme.status(success);
  }
  
  &__actions {
    display: flex;
    gap: theme.space(md);
    margin-top: theme.space(lg);
  }
  
  &__primary-action {
    @include theme.button(primary);
  }
  
  &__secondary-action {
    @include theme.button(outline, sm);
  }
}
```

This centralized theme system ensures consistency across all components while making development faster and more maintainable.