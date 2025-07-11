# Create Feature Command

Scaffolds a new feature following FibreFlow patterns and simplicity principles.

## Usage
```
/create-feature <feature-name>
```

## What it Creates

Following the simplicity principle of "CRUD first, features later":

### 1. Model
```typescript
// core/models/<feature>.model.ts
export interface <Feature> {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Add specific fields
}
```

### 2. Service
```typescript
// core/services/<feature>.service.ts
@Injectable({ providedIn: 'root' })
export class <Feature>Service extends BaseFirestoreService<<Feature>> {
  constructor() {
    super('<feature>s'); // collection name
  }
  
  // Any custom methods beyond CRUD
}
```

### 3. List Component
```typescript
// features/<feature>s/components/<feature>-list/<feature>-list.component.ts
- Table/card view of all items
- Add button → form
- Click row → detail view
- Actions: edit, delete
```

### 4. Form Component
```typescript
// features/<feature>s/components/<feature>-form/<feature>-form.component.ts
- Reactive form with validation
- Save/Cancel buttons
- Works for both create and edit
```

### 5. Routes
```typescript
// features/<feature>s/<feature>s.routes.ts
export const <FEATURE>_ROUTES: Routes = [
  { path: '', component: <Feature>ListComponent },
  { path: 'new', component: <Feature>FormComponent },
  { path: ':id', component: <Feature>DetailComponent },
  { path: ':id/edit', component: <Feature>FormComponent }
];
```

## Execution Steps

1. Generate model:
   ```bash
   ng g interface core/models/<feature>
   ```

2. Generate service:
   ```bash
   ng g service core/services/<feature>
   ```

3. Generate components:
   ```bash
   ng g component features/<feature>s/components/<feature>-list
   ng g component features/<feature>s/components/<feature>-form
   ```

4. Create routes file

5. Update app.routes.ts:
   ```typescript
   {
     path: '<feature>s',
     loadChildren: () => import('./features/<feature>s/<feature>s.routes').then(m => m.<FEATURE>_ROUTES)
   }
   ```

6. Implement basic CRUD in service

7. Wire up list component with:
   - Observable from service
   - Async pipe in template
   - Router navigation

8. Deploy to test:
   ```bash
   deploy "Added <feature> management feature"
   ```

## Success Checklist

After running this command, verify:
- [ ] Can see list of items (even if empty)
- [ ] Can click "Add" button
- [ ] Can fill and submit form
- [ ] Can see new item in list
- [ ] Can click item to see details
- [ ] Can edit existing item
- [ ] Can delete item
- [ ] All changes persist after refresh

<arguments>
feature-name: The name of the feature (singular, lowercase)
</arguments>