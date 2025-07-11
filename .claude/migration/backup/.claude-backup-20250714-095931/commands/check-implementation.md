# Check Implementation Command

Verifies that a feature is completely implemented according to FibreFlow standards.

## Usage
```
/check-implementation <feature-name>
```

## What it Checks

### 1. Model Definition
- [ ] Interface exists in `core/models/<feature>.model.ts`
- [ ] Has required fields: id, createdAt, updatedAt, createdBy
- [ ] Uses proper TypeScript types (no `any`)

### 2. Service Implementation
- [ ] Service exists in `core/services/<feature>.service.ts`
- [ ] Extends BaseFirestoreService
- [ ] Has `@Injectable({ providedIn: 'root' })`
- [ ] Implements basic CRUD methods

### 3. Components Structure
- [ ] List component with table/cards view
- [ ] Form component with validation
- [ ] Both are standalone components
- [ ] Proper imports (CommonModule, MaterialModule)

### 4. Routing Setup
- [ ] Routes file exists
- [ ] Lazy loaded in app.routes.ts
- [ ] All paths defined (list, new, detail, edit)

### 5. Theme Compliance
- [ ] Uses theme functions (ff-rgb, ff-spacing)
- [ ] No hardcoded colors or sizes
- [ ] Proper SCSS imports

### 6. Firebase Integration
- [ ] Collection name follows convention (plural)
- [ ] Proper error handling
- [ ] Uses observables (no callbacks)

### 7. User Experience
- [ ] Loading states implemented
- [ ] Error messages user-friendly
- [ ] Form validation with helpful messages
- [ ] Confirmation before delete

### 8. Code Quality
- [ ] No TypeScript errors
- [ ] Passes lint checks
- [ ] No console.logs in production code
- [ ] Follows naming conventions

## Verification Steps

1. **Check file structure**:
   ```bash
   find src -name "*<feature>*" -type f | sort
   ```

2. **Verify service methods**:
   - getAll()
   - getById(id)
   - create(item)
   - update(id, item)
   - delete(id)

3. **Test user flows**:
   - Can create new item
   - Can view list
   - Can edit existing
   - Can delete with confirmation
   - Changes persist on refresh

4. **Check build**:
   ```bash
   npm run build
   ```

5. **Deploy and verify**:
   ```bash
   deploy "Completed <feature> implementation"
   ```

## Report Format

After checking, provides report:

```
✅ Model Definition - Complete
✅ Service Implementation - Complete  
⚠️ Form Validation - Missing email validation
❌ Theme Compliance - Hardcoded colors found
✅ Routing - Complete
⚠️ Error Handling - Generic messages

Overall: 70% Complete
Next steps:
1. Add email validation to form
2. Replace hardcoded colors with theme functions
3. Add specific error messages
```

## Auto-Fix Options

For common issues, offers to:
1. Generate missing files
2. Add required imports
3. Fix theme function usage
4. Add basic validation

<arguments>
feature-name: The feature to check (singular)
</arguments>