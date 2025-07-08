# FibreFlow Testing Guide

*Last Updated: 2025-01-08*

## Testing Philosophy

**"Deploy to test, test in production-like environment"**

We don't use local dev servers. Every test is a real deployment to Firebase.

---

## Testing Workflow

### 1. Quick Test Cycle
```bash
# Make changes
# Deploy immediately
deploy "Testing new feature X"

# Check live site
# https://fibreflow.web.app
```

### 2. Pre-Deployment Checks

#### TypeScript Compilation
```bash
# Check for TypeScript errors without building
npx tsc --noEmit

# Fix type errors before deploying
```

#### Linting
```bash
# Check lint issues
npm run lint

# Auto-fix what's possible
npm run lint:fix
```

#### Build Test
```bash
# Full build (what deploy does)
npm run build

# If it builds, it deploys
```

---

## Testing Strategies by Feature Type

### CRUD Features

1. **Create Test**
   - Add new item via form
   - Check it appears in list
   - Refresh page - still there?
   - Check Firestore console

2. **Read Test**
   - List view shows all items
   - Pagination works
   - Search/filter functions
   - Click item → detail view

3. **Update Test**
   - Edit existing item
   - Changes show immediately
   - Other users see changes
   - Check audit trail

4. **Delete Test**
   - Delete with confirmation
   - Item removed from list
   - Can't access via direct URL
   - Audit log created

### Form Validation

```typescript
// Test these scenarios:
- Submit empty form → validation errors
- Invalid email → specific error
- Required fields → highlighted
- Success → navigate away
- Error → stay on form with message
```

### Authentication

```bash
# Test logged out state
# Use incognito window

# Test different roles
# Create test users with specific roles

# Test permission denied
# Try accessing admin features as regular user
```

---

## antiHall Integration

### Keep Knowledge Graph Updated
```bash
# After adding new services/components
cd antiHall
npm run parse

# This updates the knowledge graph
# Prevents hallucinations in future coding
```

### Validate Code Patterns
```bash
# Check if code follows patterns
npm run check "your code snippet here"
```

---

## Firebase-Specific Testing

### Firestore Rules
```bash
# Test security rules
# Try operations that should fail
# Use Firebase Console > Firestore > Rules Playground
```

### Functions Testing
```bash
# Check function logs
firebase functions:log

# Follow specific function
firebase functions:log --only getFirefliesMeetings

# Test callable function from browser console
const testFunc = httpsCallable(functions, 'functionName');
const result = await testFunc({ test: true });
console.log(result);
```

### Performance Testing
```bash
# Check bundle size
npm run build -- --stats-json

# Monitor in Chrome DevTools
# - Network tab: Load time
# - Performance tab: Runtime
# - Lighthouse: Overall score
```

---

## Common Test Scenarios

### 1. New Feature Checklist
- [ ] Feature accessible from menu
- [ ] CRUD operations work
- [ ] Form validation present
- [ ] Error messages helpful
- [ ] Loading states show
- [ ] Mobile responsive
- [ ] Theme compliance (test all 4)
- [ ] Audit trail entries created

### 2. Bug Fix Checklist
- [ ] Original issue resolved
- [ ] No regression in related features
- [ ] Works in all themes
- [ ] No console errors
- [ ] Build succeeds
- [ ] Deployment clean

### 3. Integration Test
- [ ] Data flows between modules
- [ ] Permissions enforced
- [ ] Real-time updates work
- [ ] Offline behavior acceptable

---

## Debug Techniques

### Browser Console
```javascript
// Check Firebase auth state
firebase.auth().currentUser

// Test Firestore queries
const db = firebase.firestore();
const snapshot = await db.collection('projects').get();
console.log(snapshot.docs.map(d => d.data()));

// Check service worker
navigator.serviceWorker.getRegistrations()
```

### Firebase Console
1. **Firestore**: Check data structure
2. **Authentication**: Verify users
3. **Functions**: Read logs
4. **Hosting**: Deployment history

### Chrome DevTools
1. **Network**: API calls, bundle sizes
2. **Application**: Local storage, service workers
3. **Console**: Errors and logs
4. **Elements**: Theme variables

---

## Testing Commands Reference

### Build & Deploy
```bash
deploy "message"     # Build, test, deploy
jj st               # What changed
jj diff             # See changes
```

### Code Quality
```bash
npm run lint        # Check style
npm run format      # Fix formatting
npm run check       # All checks
npx tsc --noEmit    # Type check only
```

### Firebase
```bash
firebase deploy --only hosting     # Just frontend
firebase deploy --only functions   # Just functions
firebase functions:log            # View logs
firebase firestore:indexes        # Manage indexes
```

### antiHall
```bash
npm run parse       # Update knowledge
npm run check       # Validate code
```

---

## Production Testing

### Smoke Tests After Deploy
1. Load homepage
2. Login works
3. Main features accessible
4. No console errors
5. Theme switcher works

### User Acceptance
1. Real user can complete task
2. Performance acceptable
3. Error messages clear
4. Mobile experience good

---

## Troubleshooting

### Build Fails
```bash
# Clear caches
rm -rf node_modules/.cache
rm -rf .angular

# Reinstall
rm -rf node_modules
npm install
```

### Deploy Fails
```bash
# Check auth
firebase login

# Check project
firebase use --add

# Check quota
# Firebase Console > Quotas
```

### Runtime Errors
1. Check browser console
2. Check Firebase Functions logs
3. Check network tab for failed requests
4. Verify Firestore rules

---

## Best Practices

### ✅ DO
- Deploy frequently (multiple times per hour)
- Test on live site immediately
- Check multiple browsers
- Test all user roles
- Verify mobile experience

### ❌ DON'T
- Rely on local dev server
- Skip deployment to "save time"
- Test only happy path
- Ignore console warnings
- Assume it works without checking

---

## Quick Test Recipe

```bash
# 1. Make change
# 2. Deploy
deploy "Added awesome feature"

# 3. Open site
# https://fibreflow.web.app

# 4. Test feature
# - Does it work?
# - Any errors?
# - Looks good?

# 5. If issues, fix and repeat
# If good, move to next task
```

Remember: **The fastest way to test is to deploy!**