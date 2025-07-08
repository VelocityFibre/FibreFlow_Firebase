# Product Requirements Prompt (PRP) Template - FibreFlow

*Use this template when implementing new features with Claude Code*

## Feature Overview

**Feature Name**: [Feature Name]  
**Priority**: [High/Medium/Low]  
**Target Completion**: [Date]  
**Type**: [CRUD Feature / Integration / Enhancement / Bug Fix]

### Quick Summary
[1-2 sentences describing what this feature does]

### Business Value
- **Problem it solves**: [Current pain point]
- **Who benefits**: [User personas - verified from PRD]
- **Success metric**: [How we measure success]

---

## Technical Specification

### Data Model
```typescript
// Location: /src/app/core/models/[feature].model.ts
export interface [Feature] {
  id: string;
  // Required fields based on FibreFlow patterns
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Feature-specific fields
  [field]: [type];
}
```

### Service Requirements
```typescript
// Location: /src/app/core/services/[feature].service.ts
// Must extend BaseFirestoreService (verified pattern)
export class [Feature]Service extends BaseFirestoreService<[Feature]> {
  constructor() {
    super('[collection-name]'); // plural form
  }
  
  // Required CRUD methods (inherited):
  // - getAll()
  // - getById(id)
  // - create(item)
  // - update(id, item)
  // - delete(id)
  
  // Additional methods if needed:
  // - getByProject(projectId)
  // - getActive()
}
```

### Component Structure

#### List Component
- **Location**: `/src/app/features/[feature]/components/[feature]-list`
- **Requirements**:
  - Table view with Material Table
  - Search/filter functionality
  - Add button → opens form
  - Row click → detail view
  - Actions: Edit, Delete (with confirmation)
  - Loading skeleton while fetching

#### Form Component
- **Location**: `/src/app/features/[feature]/components/[feature]-form`
- **Requirements**:
  - Reactive form with validation
  - Works for both create and edit
  - Material form fields
  - Save/Cancel buttons
  - Error handling with user-friendly messages

#### Routes
```typescript
// Location: /src/app/features/[feature]/[feature].routes.ts
export const [FEATURE]_ROUTES: Routes = [
  { path: '', component: [Feature]ListComponent },
  { path: 'new', component: [Feature]FormComponent },
  { path: ':id', component: [Feature]DetailComponent },
  { path: ':id/edit', component: [Feature]FormComponent }
];
```

---

## Implementation Checklist

### Phase 1: Data Layer (Backend)
- [ ] Create model interface in `/core/models/`
- [ ] Create service extending BaseFirestoreService
- [ ] Add to Firestore rules if needed
- [ ] Test with antiHall: `npm run check "[service code]"`

### Phase 2: Components (Frontend)
- [ ] Generate list component
- [ ] Generate form component
- [ ] Create routes file
- [ ] Add to app.routes.ts

### Phase 3: Integration
- [ ] Wire list to service (async pipe)
- [ ] Implement form with validation
- [ ] Add to navigation menu
- [ ] Theme compliance (ff-rgb functions)

### Phase 4: Testing & Deploy
- [ ] Test CRUD operations
- [ ] Check audit trail creation
- [ ] Verify on all 4 themes
- [ ] Deploy: `deploy "Added [feature] management"`

---

## Validation Requirements

### antiHall Checks
```bash
# Before implementing, validate patterns:
cd antiHall
npm run check "extends BaseFirestoreService"
npm run check "standalone: true"
```

### Theme Compliance
- Use `ff-rgb()` for colors
- Use `ff-rem()` for spacing
- Import theme utilities: `@use '.../component-theming' as theme;`

### Security
- No hardcoded credentials
- API calls through Firebase Functions if needed
- Check Firestore rules for collection

---

## Example Implementation Order

Following simplicity principle (CRUD first):

1. **Day 1**: 
   - Model + Service
   - Basic list view
   - Deploy and test

2. **Day 2**:
   - Add form
   - Create functionality
   - Deploy and test

3. **Day 3**:
   - Edit/Delete
   - Validation
   - Final deployment

---

## Common Patterns to Follow

### Service Pattern (Verified)
```typescript
@Injectable({ providedIn: 'root' })
export class ExampleService extends BaseFirestoreService<Example> {
  constructor() {
    super('examples');
  }
}
```

### Component Pattern (Verified)
```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### Observable Pattern (Verified)
```typescript
// In component
items$ = this.service.getAll();

// In template
<div *ngFor="let item of items$ | async">
```

---

## Notes

- Always check existing implementations for patterns
- Use `/create-feature` command for scaffolding
- Validate with antiHall before implementing
- Deploy frequently to test
- Keep it simple - CRUD first, enhancements later