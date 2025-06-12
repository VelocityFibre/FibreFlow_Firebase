# AI Theme Collaboration Guide for FibreFlow

## 🤖 How to Prompt AI/Claude for Theme Work

This guide helps collaborators effectively prompt AI assistants to work on the FibreFlow theme while maintaining technical compatibility.

---

## 📋 Essential Context to Always Include

When prompting AI about theme work, **ALWAYS** start with this context:

```
I'm working on FibreFlow, an Angular 18+ project with:
- Standalone components (no modules)
- SCSS with CSS custom properties for theming
- Theme system based on CSS variables with runtime switching
- Apple-inspired design philosophy
- Function-first approach (logic before aesthetics)

Key files:
- Theme variables: src/styles/_variables.scss
- Theme functions: src/styles/_functions.scss  
- Utility classes: src/styles/_utilities.scss
- Theme service: src/app/core/services/theme.service.ts

Current themes: light (default), dark, vf, fibreflow
```

---

## 🎯 Prompt Templates

### 1. **Adding New Theme Colors**

```
I need to add a new color [color-name] to the FibreFlow theme system.

Requirements:
- Add to all 4 themes (light, dark, vf, fibreflow) in _variables.scss
- Use RGB format without # (e.g., "59 130 246" not "#3B82F6")
- Suggest appropriate colors for each theme variant
- Create a utility function in _functions.scss if needed

The color will be used for: [describe usage]
```

### 2. **Creating New Components**

```
Create a new [component-name] component for FibreFlow.

Requirements:
- Use Angular standalone component (no NgModule)
- Style with SCSS using ff-rgb() and ff-spacing() functions
- Must work across all themes (light, dark, vf, fibreflow)
- Follow Apple-inspired design with generous spacing
- Use existing utility classes where possible

Component purpose: [describe what it does]
Design reference: [if any]
```

### 3. **Modifying Existing Styles**

```
I need to update the styling of [component/section name] in FibreFlow.

Current issue: [describe problem]
Desired outcome: [describe goal]

Constraints:
- Must maintain theme compatibility (test in all 4 themes)
- Use CSS variables, not hardcoded colors
- Follow existing spacing system (ff-spacing function)
- Maintain Apple-inspired minimalism
- Don't break existing functionality
```

### 4. **Improving Theme Aesthetics**

```
I want to improve the [specific aspect] of the FibreFlow theme to be more [desired quality].

Current themes to update: [list which themes]
Design inspiration: [reference/description]

Requirements:
- Update _variables.scss with new values
- Maintain color contrast for accessibility
- Keep consistent with Apple-inspired design
- Ensure smooth transitions between themes
- Test with theme-test component
```

### 5. **Adding Theme Variants**

```
Add a new theme variant called "[theme-name]" to FibreFlow.

Brand colors:
- Primary: [hex color]
- Secondary: [hex color]
- Background: [hex color]

Requirements:
1. Convert hex to RGB format for _variables.scss
2. Add theme to all CSS variable definitions
3. Update ThemeService to include new theme
4. Add theme option to theme switcher
5. Ensure all components work with new theme
```

---

## 🚫 What NOT to Ask

Avoid these anti-patterns when prompting:

❌ "Make it look modern" (too vague)
✅ "Update button styles to have subtle shadows and 8px rounded corners"

❌ "Use Tailwind classes" (wrong framework)
✅ "Use FibreFlow utility classes (ff-*) or create new ones"

❌ "Add dark mode" (already exists)
✅ "Adjust dark theme colors for better contrast"

❌ "Use CSS modules" (not our approach)
✅ "Use SCSS with CSS custom properties"

---

## 📐 Technical Constraints to Mention

Always remind AI about these constraints:

### **Color Format**
```scss
// ❌ WRONG
--ff-primary: #3B82F6;

// ✅ CORRECT  
--ff-primary: 59 130 246;
```

### **Spacing System**
```scss
// ❌ WRONG
padding: 32px;

// ✅ CORRECT
padding: ff-spacing(xl);  // 32px
```

### **Color Usage**
```scss
// ❌ WRONG
color: #1F2937;
background: white;

// ✅ CORRECT
color: ff-rgb(foreground);
background: ff-rgb(background);
```

### **Component Structure**
```typescript
// ❌ WRONG - Module-based
@NgModule({...})

// ✅ CORRECT - Standalone
@Component({
  standalone: true,
  imports: [CommonModule]
})
```

---

## 🎨 Design Guidelines to Communicate

### **Apple-Inspired Principles**
- Clean white backgrounds (light theme)
- Generous white space (use ff-spacing(3xl) or ff-spacing(4xl) between sections)
- Subtle interactions (300ms transitions)
- Light font weights for headings (font-weight: 300)
- Minimal color usage (mostly grays)

### **Spacing Scale Reference**
```
xs: 4px    (tight spacing)
sm: 8px    (small elements)
md: 16px   (default spacing)
lg: 24px   (comfortable spacing)
xl: 32px   (card padding)
2xl: 48px  (section spacing)
3xl: 64px  (large sections)
4xl: 80px  (page sections)
```

### **Typography Scale**
```
Display: 48px, weight 300
H1: 36px, weight 300  
H2: 24px, weight 400
H3: 20px, weight 500
Body: 16px, weight 400
Small: 14px, weight 400
```

---

## 💡 Example: Complete Theme Enhancement Prompt

Here's a full example of a well-structured prompt:

```
I'm working on FibreFlow (Angular 18, SCSS, standalone components) and need to enhance the card component styling to be more visually appealing while maintaining our Apple-inspired design.

Current setup:
- Cards use .ff-card class from _utilities.scss
- Must work across all themes (light, dark, vf, fibreflow)
- Currently has simple border and padding

Desired improvements:
1. Add subtle shadow on hover (more pronounced than current)
2. Slight background color variation from page background
3. Smooth scale animation on interaction
4. Better visual hierarchy for card titles

Constraints:
- Use existing CSS variables (--ff-card, --ff-card-foreground)
- Maintain ff-spacing() system
- Keep transitions at 300ms for consistency
- Ensure accessibility contrast ratios
- Test across all 4 themes

Please update the .ff-card styles in _utilities.scss and suggest any new CSS variables needed in _variables.scss.
```

---

## 🔄 Iteration Process

When working with AI:

1. **Start with function** - Get it working first
2. **Then enhance aesthetics** - Make it beautiful
3. **Test across themes** - Verify in all 4 themes
4. **Refine details** - Polish transitions, spacing
5. **Document changes** - Update relevant docs

---

## 📝 Quick Reference Card

Copy this for every theme-related prompt:

```
Tech: Angular 18+, Standalone, SCSS, CSS Variables
Themes: light (default), dark, vf, fibreflow  
Functions: ff-rgb(), ff-spacing(), ff-font-size()
Classes: ff-card, ff-button, ff-section, etc.
Philosophy: Apple-inspired, Function-first
```

---

Remember: **Clear constraints = Better results!**