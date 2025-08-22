# Iterative Design Workflow Example

This workflow demonstrates how to use Playwright MCP for autonomous UI refinement of the PolePlantingApp.

## Workflow: Improve Pole Capture Form

### Goal
Ensure the pole capture form meets all field worker usability requirements through iterative visual refinement.

### Step 1: Initial Assessment
```javascript
// Take baseline screenshot
await playwright.screenshot('pole-capture-initial.png', {
  viewport: { width: 360, height: 640 }
});

// Run mobile reviewer
const review = await runAgent('poleplanting-mobile-reviewer', {
  page: 'pole-capture',
  focus: ['touch-targets', 'visibility', 'form-layout']
});
```

### Step 2: Identify Issues
Common issues found:
- Button too small (40px instead of 48px minimum)
- Low contrast text (#999 on white)
- Form labels too small (14px)
- No offline indicator

### Step 3: Make Improvements
```typescript
// Fix 1: Increase button size
.capture-button {
  min-height: 48px;
  min-width: 48px;
  padding: 12px 24px;
  font-size: 18px;
}

// Fix 2: Improve contrast
.form-label {
  color: #212121; // Near black
  font-size: 16px;
  font-weight: 500;
}

// Fix 3: Add offline indicator
.sync-status {
  position: fixed;
  top: 0;
  width: 100%;
  padding: 8px;
  background: var(--status-color);
  font-weight: bold;
}
```

### Step 4: Validate Changes
```javascript
// Take new screenshot
await playwright.screenshot('pole-capture-improved.png');

// Compare against principles
const validation = await validateAgainst('poleplanting-design-principles.md');

// Check specific metrics
const metrics = await checkMetrics({
  touchTargets: '>= 48px',
  textSize: '>= 16px',
  contrast: '>= 4.5:1',
  loadTime: '< 3s'
});
```

### Step 5: Field Workflow Test
```javascript
// Run realistic workflow test
await runAgent('field-workflow-tester', {
  scenario: 'quick-capture',
  conditions: {
    network: '3G',
    touch: 'imprecise', // Simulates gloves
    interruptions: true
  }
});
```

### Step 6: Iterate Until Perfect
```javascript
while (!allTestsPass) {
  // 1. Screenshot current state
  const screenshot = await playwright.screenshot();
  
  // 2. Analyze against principles
  const issues = await analyzeDesign(screenshot);
  
  // 3. Generate fixes
  const fixes = await generateFixes(issues);
  
  // 4. Apply fixes
  await applyFixes(fixes);
  
  // 5. Re-test
  allTestsPass = await runAllTests();
}
```

## Complete Workflow Script

```javascript
async function improvePoleCaptureUI() {
  const iterations = [];
  let passRate = 0;
  
  while (passRate < 100) {
    // Capture current state
    const iteration = {
      number: iterations.length + 1,
      screenshot: await playwright.screenshot(),
      timestamp: new Date()
    };
    
    // Run comprehensive review
    const review = await runAgent('poleplanting-mobile-reviewer');
    iteration.issues = review.issues;
    
    // Apply fixes for critical issues
    for (const issue of review.criticalIssues) {
      await fixIssue(issue);
    }
    
    // Test with field workflow
    const fieldTest = await runAgent('field-workflow-tester');
    iteration.fieldTestResults = fieldTest;
    
    // Calculate pass rate
    passRate = calculatePassRate(review, fieldTest);
    iteration.passRate = passRate;
    
    iterations.push(iteration);
    
    // Prevent infinite loops
    if (iterations.length > 10) {
      console.warn('Max iterations reached');
      break;
    }
  }
  
  // Generate report
  return generateIterationReport(iterations);
}
```

## Expected Outcomes

### Before Iteration
- Small buttons (hard to tap)
- Low contrast text
- Dense layout
- No offline feedback
- 4+ taps to capture

### After Iteration
- Large, tappable buttons (48px+)
- High contrast (WCAG AA)
- Spacious, thumb-friendly layout
- Clear offline/online status
- 2 taps to capture
- Works with gloves
- Readable in sunlight

## Key Success Metrics

1. **Touch Success Rate**: > 95% on first tap
2. **Time to Capture**: < 2 minutes per pole
3. **Offline Reliability**: 100% data retention
4. **Visibility Score**: WCAG AA compliant
5. **Field Worker Satisfaction**: > 4.5/5

## Tips for Effective Iteration

1. **Focus on One Issue at a Time** - Don't try to fix everything at once
2. **Test After Each Change** - Validate improvements immediately
3. **Use Real Device Sizes** - Test on actual phone dimensions
4. **Consider Edge Cases** - Gloves, rain, bright sun, one-handed use
5. **Measure Everything** - Use concrete metrics, not opinions

## Common Pitfalls to Avoid

1. **Over-designing** - Field workers need function, not beauty
2. **Desktop-first thinking** - This is mobile-only
3. **Assuming good conditions** - Plan for the worst
4. **Complex interactions** - Keep it dead simple
5. **Ignoring offline** - It's not optional

Remember: Every iteration should make the app easier for a tired field worker to use at the end of a long day.