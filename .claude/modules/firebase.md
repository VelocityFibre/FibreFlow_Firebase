# Firebase & Firestore Guidelines

<module-metadata>
  <name>firebase</name>
  <version>1.0</version>
  <priority>high</priority>
  <last-updated>2025-07-18</last-updated>
  <trigger-keywords>firebase, firestore, auth, storage, functions</trigger-keywords>
</module-metadata>

## 🔥 Firebase Project Info

```yaml
Project: fibreflow-73daf
URL: https://fibreflow-73daf.web.app
Console: https://console.firebase.google.com/project/fibreflow-73daf
Account: louis@velocityfibreapp.com
```

## 🎯 Firestore Best Practices

### Collection Structure
```typescript
// FLAT for queries (with projectId field)
/projects/{projectId}
/tasks/{taskId}              // has projectId field
/invoices/{invoiceId}        // has projectId field  
/staff/{staffId}             // global resource
/stockItems/{itemId}         // global resource

// NESTED for true hierarchy
/projects/{projectId}/phases/{phaseId}
/projects/{projectId}/phases/{phaseId}/steps/{stepId}
```

### Always Use Real-time Listeners
```typescript
// ✅ PREFERRED - Real-time updates
export class ProjectService {
  projects$ = collectionData(
    collection(this.firestore, 'projects'),
    { idField: 'id' }
  );
  
  getByStatus(status: string) {
    return collectionData(
      query(
        collection(this.firestore, 'projects'),
        where('status', '==', status)
      ),
      { idField: 'id' }
    );
  }
}

// ❌ AVOID - One-time reads (unless necessary)
async getProjects() {
  const snapshot = await getDocs(collection(this.firestore, 'projects'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

### Project Isolation Pattern
```typescript
// CRITICAL: Always filter by projectId
interface ProjectScoped {
  projectId: string;
}

// Service method
getProjectTasks(projectId: string): Observable<Task[]> {
  return collectionData(
    query(
      collection(this.firestore, 'tasks'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    ),
    { idField: 'id' }
  );
}

// NEVER return all tasks across projects
// ❌ WRONG
getAllTasks() {
  return collectionData(collection(this.firestore, 'tasks'));
}
```

## 📝 CRUD Operations

### Create with Type Safety
```typescript
async createDocument<T extends { projectId?: string }>(
  collectionName: string,
  data: T
): Promise<string> {
  // Type the collection
  const collectionRef = collection(this.firestore, collectionName) as CollectionReference<T>;
  
  // Add timestamps
  const docData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: this.auth.currentUser?.uid || 'system'
  };
  
  const docRef = await addDoc(collectionRef, docData);
  return docRef.id;
}
```

### Update with Validation
```typescript
async updateDocument<T>(
  collectionName: string,
  docId: string,
  updates: Partial<T>
): Promise<void> {
  // Remove undefined values
  const cleanUpdates = Object.entries(updates)
    .filter(([_, value]) => value !== undefined)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  
  // Add metadata
  const docData = {
    ...cleanUpdates,
    updatedAt: serverTimestamp(),
    updatedBy: this.auth.currentUser?.uid
  };
  
  await updateDoc(
    doc(this.firestore, collectionName, docId),
    docData
  );
}
```

### Delete (Soft Delete Preferred)
```typescript
async softDelete(collectionName: string, docId: string): Promise<void> {
  await updateDoc(
    doc(this.firestore, collectionName, docId),
    {
      deleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: this.auth.currentUser?.uid
    }
  );
}

// Query non-deleted
getNonDeleted<T>(): Observable<T[]> {
  return collectionData(
    query(
      collection(this.firestore, this.collectionName),
      where('deleted', '!=', true)
    ),
    { idField: 'id' }
  );
}
```

## 🔍 Query Patterns

### Common Queries
```typescript
// Compound queries
getActiveProjectTasks(projectId: string) {
  return collectionData(
    query(
      collection(this.firestore, 'tasks'),
      where('projectId', '==', projectId),
      where('status', '==', 'active'),
      orderBy('priority', 'desc'),
      limit(50)
    ),
    { idField: 'id' }
  );
}

// Array contains
getProjectsByTeamMember(userId: string) {
  return collectionData(
    query(
      collection(this.firestore, 'projects'),
      where('teamMembers', 'array-contains', userId)
    ),
    { idField: 'id' }
  );
}

// Range queries
getTasksDueThisWeek() {
  const startOfWeek = new Date();
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  
  return collectionData(
    query(
      collection(this.firestore, 'tasks'),
      where('dueDate', '>=', startOfWeek),
      where('dueDate', '<=', endOfWeek),
      orderBy('dueDate')
    ),
    { idField: 'id' }
  );
}
```

### Pagination
```typescript
private lastDoc?: QueryDocumentSnapshot;

getPagedResults(pageSize: number = 20) {
  let q = query(
    collection(this.firestore, 'items'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  
  if (this.lastDoc) {
    q = query(q, startAfter(this.lastDoc));
  }
  
  return getDocs(q).then(snapshot => {
    this.lastDoc = snapshot.docs[snapshot.docs.length - 1];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}
```

## 🔐 Security Rules

### Basic Pattern
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authenticated users only
    match /{document=**} {
      allow read: if request.auth != null;
    }
    
    // Project-based access
    match /projects/{projectId} {
      allow read: if request.auth != null && 
        isProjectMember(projectId);
      allow create: if request.auth != null && 
        hasRole('admin');
      allow update: if request.auth != null && 
        isProjectMember(projectId) && 
        validProjectUpdate();
      allow delete: if false; // Soft delete only
    }
  }
}

// Helper functions
function isProjectMember(projectId) {
  return request.auth.uid in 
    get(/databases/$(database)/documents/projects/$(projectId)).data.teamMembers;
}

function hasRole(role) {
  return request.auth.token.role == role;
}

function validProjectUpdate() {
  return request.resource.data.keys().hasAll(['title', 'status']) &&
         request.resource.data.status in ['active', 'completed', 'on-hold'];
}
```

### Data Validation Rules
```javascript
match /invoices/{invoiceId} {
  allow create: if request.auth != null &&
    request.resource.data.keys().hasAll(['projectId', 'amount', 'status']) &&
    request.resource.data.amount is number &&
    request.resource.data.amount > 0 &&
    request.resource.data.status == 'draft';
}
```

## 🚀 Firebase Functions

### Callable Functions
```typescript
// In functions/index.js
exports.processInvoice = functions.https.onCall(async (data, context) => {
  // Check auth
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }
  
  // Validate input
  if (!data.invoiceId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invoice ID is required'
    );
  }
  
  try {
    // Process...
    return { success: true, processed: data.invoiceId };
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      'Processing failed',
      error
    );
  }
});

// In Angular
const processInvoice = httpsCallable(this.functions, 'processInvoice');
const result = await processInvoice({ invoiceId: '123' });
```

### Firestore Triggers
```typescript
// Aggregate counts
exports.updateProjectTaskCount = functions.firestore
  .document('tasks/{taskId}')
  .onWrite(async (change, context) => {
    const projectId = change.after.exists 
      ? change.after.data().projectId 
      : change.before.data().projectId;
    
    // Count tasks
    const tasksSnapshot = await admin.firestore()
      .collection('tasks')
      .where('projectId', '==', projectId)
      .count()
      .get();
    
    // Update project
    await admin.firestore()
      .collection('projects')
      .doc(projectId)
      .update({
        taskCount: tasksSnapshot.data().count,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
  });
```

## 📦 Firebase Storage

### Upload Pattern
```typescript
async uploadFile(file: File, path: string): Promise<string> {
  const storage = getStorage();
  const storageRef = ref(storage, path);
  
  // Upload with metadata
  const metadata = {
    contentType: file.type,
    customMetadata: {
      uploadedBy: this.auth.currentUser?.uid || '',
      originalName: file.name
    }
  };
  
  const snapshot = await uploadBytes(storageRef, file, metadata);
  return getDownloadURL(snapshot.ref);
}

// Usage
const url = await this.uploadFile(
  file,
  `projects/${projectId}/documents/${file.name}`
);
```

### Image Optimization
```typescript
async uploadImage(file: File, projectId: string): Promise<string> {
  // Validate
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  
  if (file.size > 5 * 1024 * 1024) { // 5MB
    throw new Error('Image must be less than 5MB');
  }
  
  // Resize client-side first (use a library)
  const resized = await resizeImage(file, 1200, 1200);
  
  // Upload
  const path = `projects/${projectId}/images/${Date.now()}_${file.name}`;
  return this.uploadFile(resized, path);
}
```

## 🔄 Offline Support

### Enable Offline
```typescript
// In app.config.ts
import { enableMultiTabIndexedDbPersistence } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFirebaseApp(() => {
      const app = initializeApp(environment.firebase);
      const firestore = getFirestore(app);
      enableMultiTabIndexedDbPersistence(firestore).catch(() => {
        console.warn('Offline persistence failed to enable');
      });
      return app;
    })
  ]
};
```

### Handle Offline State
```typescript
export class OfflineService {
  isOnline$ = new Observable<boolean>(observer => {
    observer.next(navigator.onLine);
    
    const handleOnline = () => observer.next(true);
    const handleOffline = () => observer.next(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });
}
```

## 🎯 Performance Tips

### 1. Use Indexes
```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "projectId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 2. Limit Real-time Listeners
```typescript
// Unsubscribe when done
ngOnDestroy() {
  this.subscriptions.forEach(sub => sub.unsubscribe());
}
```

### 3. Batch Operations
```typescript
async batchUpdate(updates: Array<{id: string, data: any}>) {
  const batch = writeBatch(this.firestore);
  
  updates.forEach(({ id, data }) => {
    const docRef = doc(this.firestore, 'collection', id);
    batch.update(docRef, data);
  });
  
  await batch.commit();
}
```

---

Remember: Firebase is powerful but proper patterns prevent problems!