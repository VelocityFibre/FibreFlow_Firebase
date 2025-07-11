# Fix Common Errors Command

Quickly diagnose and fix common FibreFlow development errors.

## Usage
```
/fix-common-errors [error-type]
```

## Common Errors and Fixes

### 1. Firebase Permission Denied
**Error**: `Missing or insufficient permissions`

**Fix**:
1. Check if user is authenticated
2. Review Firestore rules in `firestore.rules`
3. For dev, temporarily use:
   ```
   allow read, write: if request.auth != null;
   ```

### 2. Module Not Found
**Error**: `Cannot find module '@core/services/...'`

**Fix**:
1. Check tsconfig.json paths:
   ```json
   "@core/*": ["src/app/core/*"]
   ```
2. Restart TypeScript service
3. Run `npm install` if new dependencies

### 3. NullInjectorError
**Error**: `No provider for <Service>!`

**Fix**:
1. Ensure service has `@Injectable({ providedIn: 'root' })`
2. For standalone components, import required modules:
   ```typescript
   imports: [CommonModule, MaterialModule]
   ```

### 4. Theme Function Not Found
**Error**: `Undefined function ff-rgb`

**Fix**:
1. Import theme utilities:
   ```scss
   @use '../../../styles/utils/component-theming' as theme;
   ```
2. Use with namespace:
   ```scss
   color: theme.ff-rgb(foreground);
   ```

### 5. Firebase Deploy Fails
**Error**: Various deployment errors

**Fix Sequence**:
1. Check Firebase login:
   ```bash
   firebase login
   ```
2. Verify project:
   ```bash
   firebase use --add
   ```
3. Check functions config:
   ```bash
   firebase functions:config:get
   ```
4. Try targeted deploy:
   ```bash
   firebase deploy --only hosting
   ```

### 6. Build Memory Error
**Error**: `JavaScript heap out of memory`

**Fix**:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### 7. Observable Subscribe Deprecated
**Error**: `Subscribe is deprecated`

**Fix**:
Use async pipe in template instead:
```typescript
// Component
items$ = this.service.getAll();

// Template
<div *ngFor="let item of items$ | async">
```

### 8. NG0200 Error (Expression Changed)
**Error**: `Expression has changed after it was checked`

**Fix**:
1. Move logic out of ngAfterViewInit
2. Use ChangeDetectorRef.detectChanges()
3. Use setTimeout or Promise.resolve()

## Diagnostic Commands

Run these to gather more info:

```bash
# Check TypeScript errors
npx tsc --noEmit

# Check lint errors
npm run lint

# Check bundle size
npm run build -- --stats-json

# Check Firebase status
firebase projects:list
```

## If All Else Fails

1. Clear caches:
   ```bash
   rm -rf node_modules/.cache
   rm -rf dist
   ```

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm install
   ```

3. Restart everything:
   ```bash
   npm run build
   deploy "Fixed build issues"
   ```

<arguments>
error-type: Optional specific error to focus on
</arguments>