# Playwright Visual Development - Quick Reference

## 🚀 Quick Start

### Install Playwright MCP
```bash
npm install -g @playwright/test playwright
npx @claude-ai/create-mcp-server@latest playwright
```

Then add to Claude config and restart Claude Desktop.

## 🎯 Essential Commands

### For Quick Visual Check
```
/screenshot-mobile
```
Takes a mobile screenshot and analyzes for issues.

### For Comprehensive Review
```
@agent poleplanting-mobile-reviewer
Review the [page/feature name]
```

### For Workflow Testing
```
@agent field-workflow-tester
Test the [specific workflow]
```

### For Offline Validation
```
@agent offline-capability-validator
Test offline capabilities
```

## 📱 Key Design Requirements

### Touch Targets
- Minimum: 48x48px
- Preferred: 56x56px
- Spacing: 8px between

### Text Sizes
- Body: 16-18px
- Headers: 20-24px
- Buttons: 16px minimum

### Performance
- Load: < 3s on 3G
- Capture: < 2 min/pole
- Offline: 100% core features

### Colors
```css
--primary: #1976d2;
--success: #4caf50;
--warning: #ff9800;
--error: #f44336;
```

## 🔄 The Iterative Loop

1. **Make Change** → 2. **Screenshot** → 3. **Analyze** → 4. **Fix Issues** → 5. **Repeat**

## 🎨 Visual Development Workflow

### Before Coding
```
/screenshot-mobile
# See current state before making changes
```

### After Changes
```
npm run build && firebase deploy --only hosting
/screenshot-mobile
# Verify changes look correct
```

### For Major Features
```
@agent poleplanting-mobile-reviewer
Review the new [feature name] implementation
```

## 🧪 Testing Scenarios

### Basic Mobile Check
- Touch target sizes
- Text readability  
- Layout issues
- Console errors

### Field Worker Test
- Complete capture workflow
- Offline mode
- Interrupted workflow
- Bulk capture session

### Offline Validation
- Pure offline mode
- Connection transitions
- Data persistence
- Sync reliability

## 📊 What Gets Checked

### Design Review Covers
✓ Touch targets (≥48px)  
✓ Contrast ratios (WCAG AA)  
✓ Text sizes (≥16px)  
✓ Mobile responsiveness  
✓ Performance metrics  
✓ Offline capabilities  
✓ Console errors  
✓ Accessibility  

### Workflow Testing Covers
✓ Morning startup  
✓ Standard capture  
✓ Interrupted recovery  
✓ Bulk operations  
✓ Poor connectivity  
✓ End of day sync  

## 🛠 Common Fixes

### Small Buttons
```css
.button {
  min-width: 48px;
  min-height: 48px;
  padding: 12px;
}
```

### Low Contrast
```css
.text {
  color: #212121; /* Not #666 */
  background: #ffffff;
}
```

### Offline Issues
```javascript
// Check service worker
// Verify IndexedDB usage
// Test queue persistence
```

## 📋 Pre-Deployment Checklist

Before deploying always run:
```
@agent poleplanting-mobile-reviewer
Run pre-deployment validation
```

This ensures:
- No visual regressions
- Performance maintained
- Offline still works
- Accessibility compliance

## 💡 Pro Tips

1. **Screenshot Often** - Visual feedback prevents assumptions
2. **Test Offline First** - If it works offline, it works online
3. **Check Touch Targets** - #1 field worker complaint
4. **Validate on Deploy** - Catch issues before users
5. **Use Agents** - Automated testing saves time

## 🚨 Remember

- Field workers use gloves
- Bright sunlight is common
- Connectivity is rare
- Time is precious
- Data loss is unacceptable

**The app must work flawlessly in these conditions!**