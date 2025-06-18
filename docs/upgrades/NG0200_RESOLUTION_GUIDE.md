# NG0200 Error Resolution Guide for Angular 20

## Understanding NG0200 (ExpressionChangedAfterItHasBeenCheckedError)

The NG0200 error occurs when Angular detects that an expression has changed after change detection has completed. This is a development-mode check that helps identify potential issues with data flow in your application.

## Current Status

### Enhanced Error Logging Deployed
- Detailed error capture added to `sentry-error-handler.service.ts`
- Development build with source maps deployed
- Error details will be sent to debug logs at https://fibreflow-73daf.web.app/debug-logs

### What to Look For in Debug Logs
1. **Component Name**: Which component is causing the error
2. **Expression Details**: Previous vs current values
3. **Stack Trace**: Full call stack with line numbers
4. **Context**: URL, timestamp, Angular version

## Common Causes and Solutions

### 1. Lifecycle Hook Issues
**Problem**: Changing component state in `ngAfterViewInit` or `ngAfterViewChecked`
```typescript
// ❌ Bad
ngAfterViewInit() {
  this.loading = false; // Changes binding after view is checked
}

// ✅ Good
ngAfterViewInit() {
  setTimeout(() => this.loading = false); // Defers to next tick
}
```

### 2. Observable Subscriptions
**Problem**: Synchronous observable emissions changing state
```typescript
// ❌ Bad
ngOnInit() {
  this.service.getData().subscribe(data => {
    this.data = data;
    this.loading = false; // Might trigger NG0200
  });
}

// ✅ Good - Use async pipe
template: `
  @if (data$ | async; as data) {
    <!-- content -->
  } @else {
    <mat-spinner />
  }
`
```

### 3. Parent-Child Communication
**Problem**: Child component modifying parent state during initialization
```typescript
// ❌ Bad - Child component
@Output() stateChange = new EventEmitter();
ngOnInit() {
  this.stateChange.emit(true); // Modifies parent during init
}

// ✅ Good - Defer emission
ngOnInit() {
  setTimeout(() => this.stateChange.emit(true));
}
```

### 4. Change Detection Strategy
**Problem**: OnPush strategy with mutable state changes
```typescript
// ✅ Solution 1: Remove OnPush temporarily
@Component({
  // changeDetection: ChangeDetectionStrategy.OnPush // Comment out
})

// ✅ Solution 2: Use ChangeDetectorRef
constructor(private cdr: ChangeDetectorRef) {}
updateData() {
  this.data = newData;
  this.cdr.markForCheck();
}
```

## Immediate Actions

### 1. Check the Debug Logs
Navigate to https://fibreflow-73daf.web.app/debug-logs to see detailed NG0200 error information.

### 2. Identify the Problematic Component
Look for the component name in the error details. The error mentioned `/stock-movements/` route.

### 3. Review Stock Movements Component
Check `stock-movements.component.ts` for:
- Loading state changes
- Observable subscriptions
- Parent-child communications
- Lifecycle hook implementations

### 4. Common Quick Fixes
```typescript
// Add to problematic component
constructor(private cdr: ChangeDetectorRef) {}

// Option 1: Defer state changes
setTimeout(() => {
  this.someProperty = newValue;
});

// Option 2: Use async scheduling
Promise.resolve().then(() => {
  this.someProperty = newValue;
});

// Option 3: Manual change detection
this.someProperty = newValue;
this.cdr.detectChanges();
```

## Angular 20 Specific Considerations

### 1. Standalone Components
Ensure proper imports in standalone components:
```typescript
@Component({
  standalone: true,
  imports: [CommonModule, AsyncPipe], // Include AsyncPipe
})
```

### 2. New Control Flow Syntax
Use the new @if/@for syntax properly:
```typescript
// Ensure loading states are handled
@if (loading) {
  <mat-spinner />
} @else if (data) {
  <!-- content -->
}
```

### 3. Signals (if adopted)
Consider migrating to signals for reactive state:
```typescript
loading = signal(true);
data = signal<any[]>([]);

// No NG0200 with signals
loadData() {
  this.loading.set(true);
  this.service.getData().subscribe(data => {
    this.data.set(data);
    this.loading.set(false);
  });
}
```

## Debugging Strategy

1. **Enable Detailed Logging**: ✅ Already deployed
2. **Check Specific Route**: Focus on `/stock-movements/` components
3. **Review Recent Changes**: Check git history for recent modifications
4. **Isolate the Issue**: Comment out sections to identify the problematic code
5. **Apply Fix**: Use one of the solutions above
6. **Test Thoroughly**: Ensure the fix doesn't break other functionality

## Next Steps

1. Monitor debug logs for detailed error information
2. Once the specific component and expression are identified, apply targeted fix
3. Consider a broader refactoring to use Angular 20 best practices:
   - Migrate to signals for reactive state
   - Use async pipe consistently
   - Review all OnPush components
   - Ensure proper lifecycle hook usage

## Prevention

1. **Code Review**: Check for state mutations in lifecycle hooks
2. **Testing**: Add unit tests that check for NG0200 errors
3. **Linting**: Configure ESLint rules to catch common patterns
4. **Training**: Ensure team understands Angular's change detection cycle

## Resources

- [Angular Error Reference](https://angular.io/errors/NG0200)
- [Change Detection in Angular](https://angular.io/guide/change-detection)
- [Angular 20 Migration Guide](https://angular.io/guide/update-to-version-20)