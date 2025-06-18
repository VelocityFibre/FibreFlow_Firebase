# Firebase v11.9.1 Best Practices

**Generated**: 2025-06-18  
**Firebase Version**: 11.9.1  
**Angular Fire Version**: 20.0.1  
**Purpose**: Firebase integration best practices for codebase review

## 1. Security Rules

### 1.1 Firestore Security Rules
```javascript
// ✅ BEST PRACTICE: Comprehensive security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile rules
    match /users/{userId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
      
      // Allow users to read their own profile data
      allow read: if request.auth != null 
        && resource.data.keys().hasAny(['publicName', 'avatar']);
    }
    
    // Project rules with role-based access
    match /projects/{projectId} {
      allow read: if request.auth != null
        && (request.auth.uid in resource.data.teamMembers
            || hasRole('admin') 
            || hasRole('manager'));
      
      allow write: if request.auth != null
        && (request.auth.uid == resource.data.createdBy
            || hasRole('admin')
            || hasRole('manager'));
            
      // Validate data structure
      allow create: if request.auth != null
        && validateProject(request.resource.data);
    }
    
    // Helper functions
    function hasRole(role) {
      return request.auth.token.role == role;
    }
    
    function validateProject(data) {
      return data.keys().hasAll(['name', 'createdBy', 'createdAt'])
        && data.name is string
        && data.name.size() > 0
        && data.createdBy == request.auth.uid;
    }
  }
}
```

### 1.2 Storage Security Rules
```javascript
// ✅ BEST PRACTICE: File upload security
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /projects/{projectId}/documents/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.size < 10 * 1024 * 1024  // 10MB limit
        && request.resource.contentType.matches('image/.*|application/pdf');
    }
    
    match /user-uploads/{userId}/{fileName} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024;  // 5MB limit
    }
  }
}
```

## 2. Angular Fire Integration

### 2.1 Service Configuration
```typescript
// ✅ BEST PRACTICE: Type-safe Firebase service
@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private storage = inject(Storage);
  
  // Type-safe collection references
  private usersCollection = collection(this.firestore, 'users');
  private projectsCollection = collection(this.firestore, 'projects');
  
  // Current user signal
  user = toSignal(authState(this.auth), { initialValue: null });
  
  // Get user profile
  getUserProfile(uid: string) {
    const userDoc = doc(this.usersCollection, uid);
    return docData(userDoc) as Observable<UserProfile>;
  }
  
  // Create with optimistic updates
  async createProject(project: CreateProjectData): Promise<ProjectId> {
    const projectRef = doc(this.projectsCollection);
    
    const projectData: Project = {
      ...project,
      id: projectRef.id,
      createdAt: serverTimestamp(),
      createdBy: this.auth.currentUser!.uid,
      updatedAt: serverTimestamp()
    };
    
    await setDoc(projectRef, projectData);
    return projectRef.id as ProjectId;
  }
}
```

### 2.2 Real-time Data with Signals
```typescript
// ✅ BEST PRACTICE: Reactive data with signals
export class ProjectListService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  
  // Query with user filtering
  private projectsQuery = computed(() => {
    const user = this.auth.currentUser;
    if (!user) return null;
    
    return query(
      collection(this.firestore, 'projects'),
      where('teamMembers', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );
  });
  
  // Real-time projects signal
  projects = toSignal(
    toObservable(this.projectsQuery).pipe(
      switchMap(q => q ? collectionData(q, { idField: 'id' }) : of([])),
      catchError(error => {
        console.error('Failed to load projects:', error);
        return of([]);
      })
    ),
    { initialValue: [] }
  );
}
```

## 3. Performance Optimization

### 3.1 Pagination
```typescript
// ✅ BEST PRACTICE: Infinite scroll with pagination
export class PaginatedListService<T> {
  private firestore = inject(Firestore);
  private pageSize = 20;
  
  private lastDocSubject = new BehaviorSubject<DocumentSnapshot | null>(null);
  private loadingSubject = new BehaviorSubject(false);
  
  loading = toSignal(this.loadingSubject, { initialValue: false });
  
  loadNextPage(collectionRef: CollectionReference, constraints: QueryConstraint[] = []) {
    this.loadingSubject.next(true);
    
    const lastDoc = this.lastDocSubject.value;
    const baseQuery = query(collectionRef, ...constraints, limit(this.pageSize));
    
    const paginatedQuery = lastDoc 
      ? query(baseQuery, startAfter(lastDoc))
      : baseQuery;
    
    return getDocs(paginatedQuery).then(snapshot => {
      if (!snapshot.empty) {
        this.lastDocSubject.next(snapshot.docs[snapshot.docs.length - 1]);
      }
      
      this.loadingSubject.next(false);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    });
  }
}
```

### 3.2 Offline Support
```typescript
// ✅ BEST PRACTICE: Offline-first approach
export class OfflineDataService {
  private firestore = inject(Firestore);
  
  constructor() {
    // Enable offline persistence
    enableNetwork(this.firestore).then(() => {
      console.log('Firebase back online');
    });
  }
  
  // Cache-first read
  getDocumentWithCache<T>(docRef: DocumentReference): Observable<T | null> {
    return from(getDocFromCache(docRef)).pipe(
      map(doc => doc.exists() ? doc.data() as T : null),
      catchError(() => 
        // Fallback to server
        from(getDoc(docRef)).pipe(
          map(doc => doc.exists() ? doc.data() as T : null)
        )
      )
    );
  }
  
  // Optimistic writes
  async updateWithOptimism<T>(docRef: DocumentReference, data: Partial<T>) {
    try {
      // Update local cache immediately
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      // Handle conflicts
      if (error.code === 'failed-precondition') {
        // Reload and try again
        const fresh = await getDoc(docRef);
        return updateDoc(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
      }
      throw error;
    }
  }
}
```

## 4. Authentication Patterns

### 4.1 Auth Service
```typescript
// ✅ BEST PRACTICE: Comprehensive auth service
@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  
  // Auth state as signal
  user = toSignal(authState(this.auth), { initialValue: null });
  
  // User profile with additional data
  userProfile = toSignal(
    toObservable(this.user).pipe(
      switchMap(user => 
        user 
          ? docData(doc(this.firestore, 'users', user.uid))
          : of(null)
      )
    ),
    { initialValue: null }
  );
  
  // Role-based access
  hasRole = computed(() => (role: UserRole) => 
    this.userProfile()?.role === role
  );
  
  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    try {
      const result = await signInWithPopup(this.auth, provider);
      
      // Create/update user profile
      await this.ensureUserProfile(result.user);
      
      return result.user;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    }
  }
  
  private async ensureUserProfile(user: User) {
    const userDoc = doc(this.firestore, 'users', user.uid);
    const userSnap = await getDoc(userDoc);
    
    if (!userSnap.exists()) {
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName!,
        photoURL: user.photoURL,
        role: 'user',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      };
      
      await setDoc(userDoc, profile);
    } else {
      // Update last login
      await updateDoc(userDoc, {
        lastLoginAt: serverTimestamp()
      });
    }
  }
}
```

### 4.2 Guards with Auth
```typescript
// ✅ BEST PRACTICE: Auth guards with role checking
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  return toObservable(auth.user).pipe(
    map(user => {
      if (user) {
        return true;
      } else {
        router.navigate(['/login']);
        return false;
      }
    }),
    take(1)
  );
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  return toObservable(auth.userProfile).pipe(
    map(profile => {
      if (profile?.role === 'admin') {
        return true;
      } else {
        router.navigate(['/unauthorized']);
        return false;
      }
    }),
    take(1)
  );
};
```

## 5. Error Handling

### 5.1 Firebase Error Handler
```typescript
// ✅ BEST PRACTICE: Specific error handling
export class FirebaseErrorHandler {
  static handleFirestoreError(error: FirestoreError): string {
    switch (error.code) {
      case 'permission-denied':
        return 'You do not have permission to perform this action.';
      case 'not-found':
        return 'The requested document was not found.';
      case 'already-exists':
        return 'This item already exists.';
      case 'resource-exhausted':
        return 'Too many requests. Please try again later.';
      case 'unavailable':
        return 'Service temporarily unavailable. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
  
  static handleAuthError(error: AuthError): string {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'Authentication failed. Please try again.';
    }
  }
}
```

## 6. Testing Firebase

### 6.1 Firestore Testing
```typescript
// ✅ BEST PRACTICE: Mock Firebase for testing
describe('ProjectService', () => {
  let service: ProjectService;
  let mockFirestore: jasmine.SpyObj<Firestore>;
  
  beforeEach(() => {
    const spy = jasmine.createSpyObj('Firestore', ['collection', 'doc']);
    
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: spy }
      ]
    });
    
    service = TestBed.inject(ProjectService);
    mockFirestore = TestBed.inject(Firestore) as jasmine.SpyObj<Firestore>;
  });
  
  it('should create project', async () => {
    const mockDoc = { id: 'test-id' };
    mockFirestore.doc.and.returnValue(mockDoc as any);
    
    const result = await service.createProject({
      name: 'Test Project',
      description: 'Test Description'
    });
    
    expect(result).toBe('test-id');
  });
});
```

## 7. Deployment Best Practices

### 7.1 Environment Configuration
```typescript
// ✅ BEST PRACTICE: Environment-specific config
export const environment = {
  production: true,
  firebase: {
    apiKey: process.env['NG_APP_FIREBASE_API_KEY'],
    authDomain: 'fibreflow-prod.firebaseapp.com',
    projectId: 'fibreflow-prod',
    storageBucket: 'fibreflow-prod.appspot.com',
    messagingSenderId: process.env['NG_APP_FIREBASE_SENDER_ID'],
    appId: process.env['NG_APP_FIREBASE_APP_ID']
  }
};

// Never commit secrets to git
```

### 7.2 Functions Deployment
```typescript
// ✅ BEST PRACTICE: Cloud Functions with proper types
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';

export const onProjectCreated = onDocumentCreated(
  'projects/{projectId}',
  async (event) => {
    const projectData = event.data?.data();
    if (!projectData) return;
    
    // Send notification to team members
    const firestore = getFirestore();
    
    const notifications = projectData.teamMembers.map((userId: string) => ({
      userId,
      type: 'project_created',
      projectId: event.params.projectId,
      message: `New project "${projectData.name}" created`,
      createdAt: new Date(),
      read: false
    }));
    
    const batch = firestore.batch();
    notifications.forEach(notification => {
      const ref = firestore.collection('notifications').doc();
      batch.set(ref, notification);
    });
    
    await batch.commit();
  }
);
```

## 8. Performance Monitoring

### 8.1 Performance Tracking
```typescript
// ✅ BEST PRACTICE: Monitor Firebase performance
import { getPerformance, trace } from 'firebase/performance';

export class PerformanceService {
  private performance = getPerformance();
  
  async trackDataLoad<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const traceInstance = trace(this.performance, operation);
    traceInstance.start();
    
    try {
      const result = await fn();
      traceInstance.putAttribute('success', 'true');
      return result;
    } catch (error) {
      traceInstance.putAttribute('success', 'false');
      traceInstance.putAttribute('error', error.message);
      throw error;
    } finally {
      traceInstance.stop();
    }
  }
}
```

## 9. Migration Checklist

- [ ] Update to Firebase v11.9.1
- [ ] Use modular Firebase SDK
- [ ] Implement proper security rules
- [ ] Add offline support
- [ ] Use signals for reactive data
- [ ] Implement pagination
- [ ] Add error handling
- [ ] Set up performance monitoring
- [ ] Configure environment variables
- [ ] Write comprehensive tests
- [ ] Document security rules
- [ ] Monitor quota usage

## Common Issues to Fix

1. **Missing security rules validation**
2. **Not using offline persistence**
3. **Large queries without pagination**
4. **Unhandled Firebase errors**
5. **Missing performance monitoring**
6. **Hardcoded configuration**
7. **No quota monitoring**
8. **Inefficient query patterns**
9. **Missing data validation**
10. **No backup strategy**