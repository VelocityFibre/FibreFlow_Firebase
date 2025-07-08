# Simple Authentication & User Groups Plan - FibreFlow

## Quick Overview
Using **Firebase Auth** with Google Sign-in (easiest approach)
- Users login with Gmail
- Assign users to groups
- Groups control what users can see/do

---

## User Groups & Permissions

### 1. Admin
**Can Access**: Everything
**Permissions**: 
- Create/edit/delete all data
- Manage users and groups
- View all reports
- System settings

### 2. Project Manager
**Can Access**: Projects, Clients, Suppliers, Reports
**Permissions**:
- Create/edit projects
- Manage BOQ and RFQ
- View financial reports
- Cannot delete data

### 3. Field Technician
**Can Access**: Projects (read-only), Tasks, Stock movements
**Permissions**:
- View assigned projects
- Update task status
- Record stock usage
- Cannot create projects

### 4. Supplier
**Can Access**: Supplier portal only
**Permissions**:
- View RFQs sent to them
- Submit quotes
- View their orders
- No internal data access

### 5. Client
**Can Access**: Client portal only
**Permissions**:
- View their projects
- View project progress
- Download reports
- No edit capabilities

---

## Implementation Steps

### Step 1: Enable Firebase Auth (30 mins)
```bash
# In Firebase Console:
1. Go to Authentication
2. Click "Get Started"
3. Enable "Google" provider
4. Add your domain to authorized domains
```

### Step 2: Create Auth Service (1 hour)
```typescript
// /src/app/core/services/auth.service.ts
import { Auth, signInWithPopup, GoogleAuthProvider } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user$ = user(this.auth);
  
  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }
  
  async logout() {
    return this.auth.signOut();
  }
}
```

### Step 3: User Profile with Groups (1 hour)
```typescript
// /src/app/core/models/user-profile.model.ts
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  userGroup: 'admin' | 'project-manager' | 'technician' | 'supplier' | 'client';
  createdAt: Date;
  isActive: boolean;
}
```

Firestore Structure:
```
users/
  {userId}/
    - email
    - displayName
    - userGroup
    - isActive
    - createdAt
```

### Step 4: Route Guards (1 hour)
```typescript
// /src/app/core/guards/auth.guard.ts
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  return auth.user$.pipe(
    map(user => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }
      return true;
    })
  );
};

// /src/app/core/guards/role.guard.ts
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const allowedRoles = route.data['roles'] as string[];
  
  return auth.currentUserProfile$.pipe(
    map(profile => {
      if (!profile || !allowedRoles.includes(profile.userGroup)) {
        router.navigate(['/unauthorized']);
        return false;
      }
      return true;
    })
  );
};
```

### Step 5: Login Component (30 mins)
```typescript
// /src/app/features/auth/login/login.component.ts
@Component({
  template: `
    <mat-card class="login-card">
      <mat-card-header>
        <mat-card-title>Login to FibreFlow</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <button mat-raised-button color="primary" (click)="loginWithGoogle()">
          <mat-icon>login</mat-icon>
          Sign in with Google
        </button>
      </mat-card-content>
    </mat-card>
  `
})
export class LoginComponent {
  constructor(private auth: AuthService) {}
  
  async loginWithGoogle() {
    try {
      await this.auth.loginWithGoogle();
      // Auth service handles redirect
    } catch (error) {
      console.error('Login failed', error);
    }
  }
}
```

### Step 6: Protect Routes (30 mins)
```typescript
// app.routes.ts
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: 'projects',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'project-manager', 'technician'] },
        loadChildren: () => import('./features/projects/projects.routes')
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadChildren: () => import('./features/admin/admin.routes')
      },
      {
        path: 'supplier-portal',
        canActivate: [roleGuard],
        data: { roles: ['supplier'] },
        loadChildren: () => import('./features/supplier-portal/supplier.routes')
      }
    ]
  }
];
```

### Step 7: User Management UI (2 hours)
```typescript
// /src/app/features/admin/user-management/user-management.component.ts
// Admin can:
// - View all users
// - Change user groups
// - Activate/deactivate users
// - Invite new users
```

---

## Quick Implementation Order

### Day 1 Morning (2 hours):
1. Enable Firebase Auth ✓
2. Create AuthService ✓
3. Create Login component ✓
4. Test Google login works ✓

### Day 1 Afternoon (2 hours):
1. Add user profiles to Firestore ✓
2. Create auth guards ✓
3. Protect routes ✓
4. Test role-based access ✓

### Day 2 (4 hours):
1. Create user management UI ✓
2. Add user invitation flow ✓
3. Create permission service ✓
4. Add UI elements based on permissions ✓

---

## Permission Implementation

### 1. Permission Service
```typescript
// /src/app/core/services/permission.service.ts
@Injectable({ providedIn: 'root' })
export class PermissionService {
  constructor(private auth: AuthService) {}
  
  canCreateProject(): Observable<boolean> {
    return this.auth.currentUserProfile$.pipe(
      map(profile => ['admin', 'project-manager'].includes(profile?.userGroup))
    );
  }
  
  canDeleteData(): Observable<boolean> {
    return this.auth.currentUserProfile$.pipe(
      map(profile => profile?.userGroup === 'admin')
    );
  }
  
  canViewFinancials(): Observable<boolean> {
    return this.auth.currentUserProfile$.pipe(
      map(profile => ['admin', 'project-manager'].includes(profile?.userGroup))
    );
  }
}
```

### 2. Hide UI Elements
```html
<!-- In components -->
<button mat-button 
        *ngIf="permissionService.canCreateProject() | async"
        (click)="createProject()">
  New Project
</button>

<button mat-icon-button 
        *ngIf="permissionService.canDeleteData() | async"
        (click)="deleteItem()">
  <mat-icon>delete</mat-icon>
</button>
```

---

## Security Rules

### Firestore Rules
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read their own profile
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId && 
                      request.auth.token.admin == true;
    }
    
    // Projects - based on user group
    match /projects/{projectId} {
      allow read: if request.auth != null && 
                     getUserGroup() in ['admin', 'project-manager', 'technician'];
      allow create, update: if getUserGroup() in ['admin', 'project-manager'];
      allow delete: if getUserGroup() == 'admin';
    }
    
    function getUserGroup() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userGroup;
    }
  }
}
```

---

## Testing Plan

### Test Users Setup
1. **admin@test.com** → Admin group
2. **pm@test.com** → Project Manager group  
3. **tech@test.com** → Technician group
4. **supplier@test.com** → Supplier group
5. **client@test.com** → Client group

### Test Scenarios
1. Admin can access all pages ✓
2. PM cannot access admin pages ✓
3. Technician cannot create projects ✓
4. Supplier only sees supplier portal ✓
5. Logged out users redirect to login ✓

---

## Common Issues & Solutions

### Issue: User has no group after first login
**Solution**: Default new users to 'client' group, admin upgrades later
```typescript
// In auth service after login
if (!userProfile) {
  await this.createUserProfile(user, 'client');
}
```

### Issue: Permission changes don't reflect immediately  
**Solution**: Use observables for real-time updates
```typescript
// Don't cache permissions, always use observables
this.canEdit$ = this.permissionService.canEditProject();
```

---

## Next Steps After Auth

1. Add audit logging (who did what when)
2. Add session timeout
3. Add "Remember me" option
4. Add email invitations for new users
5. Add two-factor authentication (optional)

---

That's it! Start with Step 1 and you'll have basic auth working in a few hours.