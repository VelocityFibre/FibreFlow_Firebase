# FibreFlow Theme Strategy & Design System

## 🎨 Design Philosophy

**Apple-Inspired Minimalism:**
- Clean, white backgrounds
- Generous white space
- Subtle, sophisticated interactions
- Professional, modern typography

## 🎯 Current Theme System

### **Active Themes:**
1. **Light** (Default) - Clean white Apple-style
2. **Dark** - Standard dark theme
3. **VF** - VelocityFibre blue theme
4. **FibreFlow** - Custom brand theme

### **Default Theme:**
- **Light theme** is the default
- Configured in `src/app/app.component.ts`

## 🎨 Design Standards

### **Color Palette:**
```scss
// Primary Colors
$primary-background: #FFFFFF; // Pure white
$primary-text: #1F2937; // Dark gray
$accent-color: #374151; // Sophisticated charcoal
$subtle-background: #F3F4F6; // Light gray
$border-color: #E5E7EB; // Very light gray

// Status Colors
$status-success: #10B981;
$status-warning: #F59E0B;
$status-error: #EF4444;
$status-info: #3B82F6;
```

### **Typography:**
```scss
// Font System
$font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

// Font Sizes
$font-size-display: 48px; // font-weight: 300 (Light)
$font-size-h1: 32px; // font-weight: 300 (Light)
$font-size-h2: 24px; // font-weight: 400 (Regular)
$font-size-h3: 20px; // font-weight: 500 (Medium)
$font-size-body: 16px; // font-weight: 400 (Regular)
$font-size-small: 14px; // font-weight: 400 (Regular)
```

### **Spacing System:**
```scss
// Spacing Scale
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;
$spacing-2xl: 48px;
$spacing-3xl: 64px;
$spacing-4xl: 80px;

// Common Patterns
$section-spacing: $spacing-4xl; // 80px
$element-spacing: $spacing-2xl; // 48px
$card-padding: $spacing-xl; // 32px
$component-spacing: $spacing-md; // 16px
```

## 📋 Theme Implementation in Angular

### **1. Theme Structure:**

#### **SCSS Variables File** (`src/styles/_variables.scss`):
```scss
// Theme CSS Custom Properties
:root {
  // Light Theme (Default)
  --background: 255 255 255;
  --foreground: 31 41 55;
  --card: 255 255 255;
  --card-foreground: 31 41 55;
  --primary: 55 65 81;
  --primary-foreground: 255 255 255;
  --secondary: 243 244 246;
  --secondary-foreground: 31 41 55;
  --muted: 243 244 246;
  --muted-foreground: 107 114 128;
  --accent: 243 244 246;
  --accent-foreground: 31 41 55;
  --destructive: 239 68 68;
  --destructive-foreground: 255 255 255;
  --border: 229 231 235;
  --input: 229 231 235;
  --ring: 55 65 81;
  --radius: 0.75rem;
}

[data-theme="dark"] {
  --background: 17 24 39;
  --foreground: 243 244 246;
  --card: 31 41 55;
  --card-foreground: 243 244 246;
  --primary: 59 130 246;
  --primary-foreground: 255 255 255;
  --secondary: 55 65 81;
  --secondary-foreground: 243 244 246;
  --muted: 55 65 81;
  --muted-foreground: 156 163 175;
  --accent: 55 65 81;
  --accent-foreground: 243 244 246;
  --destructive: 220 38 38;
  --destructive-foreground: 255 255 255;
  --border: 55 65 81;
  --input: 55 65 81;
  --ring: 59 130 246;
}

[data-theme="vf"] {
  --background: 0 51 153;
  --foreground: 255 255 255;
  --card: 0 61 178;
  --card-foreground: 255 255 255;
  --primary: 255 255 255;
  --primary-foreground: 0 51 153;
  --secondary: 0 41 122;
  --secondary-foreground: 255 255 255;
  --muted: 0 41 122;
  --muted-foreground: 179 198 235;
  --accent: 0 41 122;
  --accent-foreground: 255 255 255;
  --destructive: 239 68 68;
  --destructive-foreground: 255 255 255;
  --border: 0 41 122;
  --input: 0 41 122;
  --ring: 255 255 255;
}

[data-theme="fibreflow"] {
  --background: 249 250 251;
  --foreground: 17 24 39;
  --card: 255 255 255;
  --card-foreground: 17 24 39;
  --primary: 79 70 229;
  --primary-foreground: 255 255 255;
  --secondary: 243 244 246;
  --secondary-foreground: 17 24 39;
  --muted: 243 244 246;
  --muted-foreground: 107 114 128;
  --accent: 243 244 246;
  --accent-foreground: 17 24 39;
  --destructive: 239 68 68;
  --destructive-foreground: 255 255 255;
  --border: 229 231 235;
  --input: 229 231 235;
  --ring: 79 70 229;
}
```

#### **Theme Service** (`src/app/core/services/theme.service.ts`):
```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark' | 'vf' | 'fibreflow';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentTheme = new BehaviorSubject<Theme>('light');
  theme$ = this.currentTheme.asObservable();

  constructor() {
    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      this.setTheme(savedTheme);
    }
  }

  setTheme(theme: Theme) {
    this.currentTheme.next(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  getTheme(): Theme {
    return this.currentTheme.value;
  }
}
```

### **2. Theme Testing Page:**

Create a dedicated theme testing page to verify all components render correctly across themes.

#### **Theme Test Component** (`src/app/features/theme-test/theme-test.component.ts`):
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-theme-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ff-page-container">
      <div class="ff-page-header">
        <h1 class="ff-page-title">Theme Test Page</h1>
        <p class="ff-page-subtitle">Test all UI components across different themes</p>
      </div>

      <!-- Theme Switcher -->
      <section class="ff-section">
        <h2 class="ff-section-title">Theme Switcher</h2>
        <div class="flex gap-4">
          <button 
            *ngFor="let theme of themes" 
            (click)="setTheme(theme)"
            class="ff-button"
            [class.ff-button-primary]="currentTheme === theme">
            {{ theme | titlecase }}
          </button>
        </div>
      </section>

      <!-- Typography Samples -->
      <section class="ff-section">
        <h2 class="ff-section-title">Typography</h2>
        <div class="space-y-4">
          <h1 class="ff-display">Display Text (48px Light)</h1>
          <h1 class="ff-h1">Heading 1 (32px Light)</h1>
          <h2 class="ff-h2">Heading 2 (24px Regular)</h2>
          <h3 class="ff-h3">Heading 3 (20px Medium)</h3>
          <p class="ff-body">Body text (16px Regular)</p>
          <p class="ff-small">Small text (14px Regular)</p>
        </div>
      </section>

      <!-- Color Palette -->
      <section class="ff-section">
        <h2 class="ff-section-title">Color Palette</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="ff-card">
            <div class="w-full h-20 bg-background border rounded"></div>
            <p class="ff-small mt-2">Background</p>
          </div>
          <div class="ff-card">
            <div class="w-full h-20 bg-primary rounded"></div>
            <p class="ff-small mt-2">Primary</p>
          </div>
          <div class="ff-card">
            <div class="w-full h-20 bg-secondary rounded"></div>
            <p class="ff-small mt-2">Secondary</p>
          </div>
          <div class="ff-card">
            <div class="w-full h-20 bg-accent rounded"></div>
            <p class="ff-small mt-2">Accent</p>
          </div>
        </div>
      </section>

      <!-- Components -->
      <section class="ff-section">
        <h2 class="ff-section-title">Components</h2>
        
        <!-- Cards -->
        <div class="mb-8">
          <h3 class="ff-h3 mb-4">Cards</h3>
          <div class="ff-card">
            <h4 class="ff-card-title">Card Title</h4>
            <p class="ff-card-description">This is a card description with some sample text.</p>
            <button class="ff-button ff-button-primary mt-4">Action Button</button>
          </div>
        </div>

        <!-- Buttons -->
        <div class="mb-8">
          <h3 class="ff-h3 mb-4">Buttons</h3>
          <div class="flex gap-4 flex-wrap">
            <button class="ff-button ff-button-primary">Primary</button>
            <button class="ff-button ff-button-secondary">Secondary</button>
            <button class="ff-button ff-button-outline">Outline</button>
            <button class="ff-button ff-button-ghost">Ghost</button>
            <button class="ff-button ff-button-destructive">Destructive</button>
          </div>
        </div>

        <!-- Form Elements -->
        <div class="mb-8">
          <h3 class="ff-h3 mb-4">Form Elements</h3>
          <div class="space-y-4 max-w-md">
            <div>
              <label class="ff-label">Input Label</label>
              <input type="text" class="ff-input" placeholder="Enter text...">
            </div>
            <div>
              <label class="ff-label">Select</label>
              <select class="ff-select">
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>
            <div>
              <label class="ff-label">Textarea</label>
              <textarea class="ff-textarea" rows="3" placeholder="Enter description..."></textarea>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background-color: rgb(var(--background));
      color: rgb(var(--foreground));
    }
  `]
})
export class ThemeTestComponent {
  themes: Theme[] = ['light', 'dark', 'vf', 'fibreflow'];
  currentTheme: Theme;

  constructor(private themeService: ThemeService) {
    this.currentTheme = this.themeService.getTheme();
  }

  setTheme(theme: Theme) {
    this.themeService.setTheme(theme);
    this.currentTheme = theme;
  }
}
```

### **3. Utility Classes** (`src/styles/_utilities.scss`):
```scss
// Layout Classes
.ff-page-container {
  @apply min-h-screen p-8 max-w-7xl mx-auto;
}

.ff-page-header {
  @apply mb-20;
}

.ff-page-title {
  @apply text-5xl font-light mb-4;
  color: rgb(var(--foreground));
}

.ff-page-subtitle {
  @apply text-xl text-muted-foreground;
}

.ff-section {
  @apply mb-20;
}

.ff-section-title {
  @apply text-3xl font-light mb-8;
  color: rgb(var(--foreground));
}

// Typography Classes
.ff-display {
  @apply text-5xl font-light;
  color: rgb(var(--foreground));
}

.ff-h1 {
  @apply text-4xl font-light;
  color: rgb(var(--foreground));
}

.ff-h2 {
  @apply text-2xl font-normal;
  color: rgb(var(--foreground));
}

.ff-h3 {
  @apply text-xl font-medium;
  color: rgb(var(--foreground));
}

.ff-body {
  @apply text-base font-normal;
  color: rgb(var(--foreground));
}

.ff-small {
  @apply text-sm font-normal;
  color: rgb(var(--muted-foreground));
}

// Component Classes
.ff-card {
  @apply p-8 rounded-xl border transition-shadow duration-300;
  background-color: rgb(var(--card));
  border-color: rgb(var(--border));
  color: rgb(var(--card-foreground));
  
  &:hover {
    @apply shadow-lg;
  }
}

.ff-card-title {
  @apply text-xl font-medium mb-2;
}

.ff-card-description {
  @apply text-muted-foreground;
}

// Button Classes
.ff-button {
  @apply px-6 py-2 rounded-lg font-medium transition-all duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
  
  &-primary {
    background-color: rgb(var(--primary));
    color: rgb(var(--primary-foreground));
    
    &:hover {
      opacity: 0.9;
    }
  }
  
  &-secondary {
    background-color: rgb(var(--secondary));
    color: rgb(var(--secondary-foreground));
    
    &:hover {
      opacity: 0.9;
    }
  }
  
  &-outline {
    @apply border-2;
    background-color: transparent;
    border-color: rgb(var(--border));
    color: rgb(var(--foreground));
    
    &:hover {
      background-color: rgb(var(--accent));
    }
  }
  
  &-ghost {
    background-color: transparent;
    color: rgb(var(--foreground));
    
    &:hover {
      background-color: rgb(var(--accent));
    }
  }
  
  &-destructive {
    background-color: rgb(var(--destructive));
    color: rgb(var(--destructive-foreground));
    
    &:hover {
      opacity: 0.9;
    }
  }
}

// Form Classes
.ff-label {
  @apply block text-sm font-medium mb-2;
  color: rgb(var(--foreground));
}

.ff-input,
.ff-select,
.ff-textarea {
  @apply w-full px-4 py-2 rounded-lg border transition-colors duration-200;
  background-color: rgb(var(--background));
  border-color: rgb(var(--border));
  color: rgb(var(--foreground));
  
  &:focus {
    @apply outline-none ring-2;
    border-color: rgb(var(--ring));
    ring-color: rgb(var(--ring) / 0.2);
  }
  
  &::placeholder {
    color: rgb(var(--muted-foreground));
  }
}

// Status Colors
.ff-status {
  &-success {
    color: rgb(var(--status-success));
  }
  
  &-warning {
    color: rgb(var(--status-warning));
  }
  
  &-error {
    color: rgb(var(--status-error));
  }
  
  &-info {
    color: rgb(var(--status-info));
  }
}

// Selection Section Pattern
.ff-selection-section {
  @apply ff-section;
  
  .ff-selection-card {
    @apply w-full ff-card text-left flex items-center justify-between p-8;
    @apply hover:shadow-lg transition-all duration-300 cursor-pointer;
    
    .ff-selection-content {
      @apply flex items-center gap-6;
      
      .ff-selection-indicator {
        @apply w-4 h-4 rounded-full;
      }
      
      .ff-selection-info {
        @apply flex-1;
        
        .ff-selection-title {
          @apply text-2xl font-light mb-2;
          color: rgb(var(--foreground));
        }
        
        .ff-selection-details {
          @apply flex items-center gap-4 text-lg;
          color: rgb(var(--muted-foreground));
        }
      }
    }
    
    .ff-selection-action {
      @apply text-muted-foreground;
    }
  }
}
```

### **4. Main Styles Import** (`src/styles.scss`):
```scss
// Import Tailwind
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

// Import theme variables
@import './styles/variables';

// Import utility classes
@import './styles/utilities';

// Base styles
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: rgb(var(--background));
  color: rgb(var(--foreground));
  transition: background-color 0.3s ease, color 0.3s ease;
}

// Smooth theme transitions
* {
  transition: background-color 0.3s ease, border-color 0.3s ease;
}
```

## 🛠️ Implementation Guidelines

### **Component Best Practices:**

1. **Always use theme variables:**
```scss
// Good
.my-component {
  background-color: rgb(var(--background));
  color: rgb(var(--foreground));
}

// Bad
.my-component {
  background-color: #FFFFFF;
  color: #1F2937;
}
```

2. **Use utility classes for consistency:**
```html
<!-- Good -->
<div class="ff-card">
  <h3 class="ff-card-title">Title</h3>
  <p class="ff-card-description">Description</p>
</div>

<!-- Bad -->
<div class="bg-white p-4 rounded border">
  <h3 class="text-xl mb-2">Title</h3>
  <p class="text-gray-600">Description</p>
</div>
```

3. **Test all themes:**
- Navigate to `/theme-test`
- Switch between all themes
- Verify contrast and readability
- Check hover/focus states

### **Adding New Themes:**

1. Add theme variables to `_variables.scss`
2. Update `ThemeService` with new theme option
3. Add theme button to theme test page
4. Test thoroughly across all components

## 📊 Angular Material Integration

If using Angular Material, configure themes properly:

```scss
// angular-material-theme.scss
@use '@angular/material' as mat;

// Define custom palettes based on CSS variables
$custom-primary: mat.define-palette((
  50: rgb(var(--primary)),
  100: rgb(var(--primary)),
  // ... define all shades
));

$custom-theme: mat.define-light-theme((
  color: (
    primary: $custom-primary,
    accent: $custom-accent,
  )
));

@include mat.all-component-themes($custom-theme);

// Dark theme support
[data-theme="dark"] {
  @include mat.all-component-colors($custom-dark-theme);
}
```

## 🎯 Selection Section Implementation

### **Pattern Structure:**
```html
<section class="ff-selection-section">
  <label class="ff-label mb-4 block">Select Project</label>
  <button class="ff-selection-card">
    <div class="ff-selection-content">
      <div class="ff-selection-indicator bg-status-success"></div>
      <div class="ff-selection-info">
        <div class="ff-selection-title">Project Name</div>
        <div class="ff-selection-details">
          <span>Status: Active</span>
          <span>•</span>
          <span>Due: Dec 31, 2024</span>
        </div>
      </div>
    </div>
    <svg class="ff-selection-action w-5 h-5" fill="none" stroke="currentColor">
      <!-- Chevron icon -->
    </svg>
  </button>
</section>
```

## 🚫 Theme Anti-Patterns

### **Don't:**
- Use hardcoded colors
- Mix design systems
- Skip theme testing
- Use inline styles
- Ignore accessibility

### **Do:**
- Use CSS variables consistently
- Test all components
- Follow spacing system
- Maintain typography scale
- Ensure proper contrast

## 📱 Responsive Design

All themes must be tested on:
- **Desktop** (1920px+)
- **Tablet** (768px - 1919px)  
- **Mobile** (< 768px)

Use responsive utility classes:
```scss
.ff-page-container {
  @apply p-4 md:p-6 lg:p-8;
}
```

## 🔄 Migration from Existing Code

When migrating existing components:

1. Replace hardcoded colors with variables
2. Update spacing to use system values
3. Apply utility classes
4. Test across all themes
5. Update component documentation

---

**Remember: Consistency is key! Always refer to this guide and test on the theme-test page.**