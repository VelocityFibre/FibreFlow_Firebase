# TypeScript 5.8 Guidelines

<module-metadata>
  <name>typescript</name>
  <version>1.0</version>
  <priority>high</priority>
  <last-updated>2025-07-18</last-updated>
  <trigger-keywords>typescript, type, interface, enum, generic</trigger-keywords>
</module-metadata>

## 🚨 TypeScript 5.8 - Latest Features

### Your Training Data is Outdated!
**Always check**: https://www.typescriptlang.org/docs/ for latest features

## ⚡ Quick Rules

### Zero Tolerance
```typescript
// ESLint configured to ERROR on these:
- NO any types
- NO implicit any
- NO unused variables
- NO missing return types
```

## 🎯 Type Safety Patterns

### Branded Types (Prevent ID Mixing)
```typescript
// Define branded types
type ProjectId = string & { __brand: 'ProjectId' };
type UserId = string & { __brand: 'UserId' };
type TaskId = string & { __brand: 'TaskId' };

// Helper functions
function toProjectId(id: string): ProjectId {
  return id as ProjectId;
}

// Usage prevents mistakes
function assignTask(taskId: TaskId, userId: UserId) {
  // Type-safe - can't mix IDs
}

// ❌ This won't compile
assignTask(userId, taskId); // Error: Type mismatch
```

### Discriminated Unions (State Management)
```typescript
// Loading states
type AsyncState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Usage with type narrowing
function handleState<T>(state: AsyncState<T>) {
  switch (state.status) {
    case 'idle':
      return 'Ready to load';
    case 'loading':
      return 'Loading...';
    case 'success':
      return state.data; // TypeScript knows data exists
    case 'error':
      return state.error.message; // TypeScript knows error exists
  }
}
```

### Template Literal Types (Type-Safe Strings)
```typescript
// Route types
type AppRoute = 
  | '/dashboard'
  | '/projects'
  | `/projects/${string}`
  | `/users/${string}`
  | `/tasks/${string}/edit`;

// CSS units
type CSSUnit = `${number}${'px' | 'rem' | 'em' | '%'}`;

// Event names
type EventName = `on${Capitalize<string>}`;

// Usage
const route: AppRoute = '/projects/123'; // ✅
const invalid: AppRoute = '/random';     // ❌ Error
```

## 🔧 Modern TypeScript Features

### satisfies Operator (Better Inference)
```typescript
// ❌ OLD - Type annotation loses literal types
const config: Config = {
  mode: 'production',
  port: 3000
};

// ✅ NEW - satisfies preserves literals
const config = {
  mode: 'production',
  port: 3000
} satisfies Config;

// Now config.mode is 'production', not string
```

### const Type Parameters (Preserve Literals)
```typescript
// Without const - loses literal types
function tuple<T extends readonly unknown[]>(arr: T): T {
  return arr;
}
const nums = tuple([1, 2, 3]); // number[]

// With const - preserves exact types
function constTuple<const T extends readonly unknown[]>(arr: T): T {
  return arr;
}
const exact = constTuple([1, 2, 3]); // readonly [1, 2, 3]
```

### using Declarations (Resource Management)
```typescript
// Automatic cleanup
function processFile(path: string) {
  using file = openFile(path); // Auto-disposed
  using connection = createDBConnection();
  
  // Both cleaned up automatically when scope ends
  return file.read();
}

// Custom disposable
class TempDirectory implements Disposable {
  [Symbol.dispose]() {
    // Cleanup code
    fs.rmSync(this.path, { recursive: true });
  }
}
```

## 📊 Firestore Type Safety

### Typed Collections
```typescript
// ❌ WRONG - Loose typing
const projectsRef = collection(firestore, 'projects');
const doc = await addDoc(projectsRef, data as any);

// ✅ RIGHT - Full type safety
import { CollectionReference } from '@angular/fire/firestore';

// Type the collection
const projectsRef = collection(firestore, 'projects') as CollectionReference<Project>;

// Now addDoc is type-safe
const doc = await addDoc(projectsRef, {
  title: 'New Project',
  status: 'active',
  // TypeScript enforces Project interface
});

// Service pattern
export class ProjectService {
  private projectsRef: CollectionReference<Project>;
  
  constructor() {
    this.projectsRef = collection(this.firestore, 'projects') as CollectionReference<Project>;
  }
}
```

### Query Type Safety
```typescript
// Type-safe queries
function getActiveProjects(): Observable<Project[]> {
  const q = query(
    this.projectsRef,
    where('status', '==', 'active' as Project['status']),
    orderBy('createdAt', 'desc')
  );
  
  return collectionData(q, { idField: 'id' });
}
```

## 🛡️ Type Guards

### Basic Type Guards
```typescript
// Check types at runtime
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  );
}

// Date validation
function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}
```

### Advanced Type Guards
```typescript
// Array type guard
function isArrayOf<T>(
  arr: unknown,
  guard: (x: unknown) => x is T
): arr is T[] {
  return Array.isArray(arr) && arr.every(guard);
}

// Usage
if (isArrayOf(data, isUser)) {
  // data is User[]
  data.forEach(user => console.log(user.email));
}

// Nested object validation
function isProjectWithTasks(obj: unknown): obj is Project & { tasks: Task[] } {
  return isProject(obj) && 
         'tasks' in obj && 
         isArrayOf(obj.tasks, isTask);
}
```

## 🎨 Utility Types

### Custom Utility Types
```typescript
// Make specific fields required
type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Usage
type DraftProject = Partial<Project>;
type SavedProject = RequireFields<DraftProject, 'id' | 'title'>;

// Deep partial
type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

// Mutable (remove readonly)
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

// Function types
type AsyncFunction<T = void> = () => Promise<T>;
type Callback<T> = (error: Error | null, data?: T) => void;
```

### Built-in Utility Types
```typescript
// Pick - Select properties
type ProjectSummary = Pick<Project, 'id' | 'title' | 'status'>;

// Omit - Exclude properties
type ProjectWithoutDates = Omit<Project, 'createdAt' | 'updatedAt'>;

// Parameters - Get function params
type CreateProjectParams = Parameters<typeof createProject>;

// ReturnType - Get function return
type ProjectResult = ReturnType<typeof getProject>;

// Awaited - Unwrap promises
type Data = Awaited<ReturnType<typeof fetchData>>;
```

## 🚫 Common TypeScript Mistakes

### 1. Using 'as any' Cast
```typescript
// ❌ NEVER DO THIS
addDoc(collection, data as any);

// ✅ Fix the types properly
const typedCollection = collection as CollectionReference<Type>;
addDoc(typedCollection, data);
```

### 2. Missing Return Types
```typescript
// ❌ Implicit any return
function calculate(a: number, b: number) {
  return a + b;
}

// ✅ Explicit return type
function calculate(a: number, b: number): number {
  return a + b;
}
```

### 3. Loose Object Types
```typescript
// ❌ Too loose
const config: object = { ... };

// ✅ Specific interface
interface Config {
  apiUrl: string;
  timeout: number;
}
const config: Config = { ... };
```

### 4. Enum Misuse
```typescript
// ❌ Numeric enums (problematic)
enum Status {
  Active,   // 0
  Inactive  // 1
}

// ✅ String enums or union types
enum Status {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE'
}

// ✅ Even better - const assertion
const STATUS = {
  Active: 'ACTIVE',
  Inactive: 'INACTIVE'
} as const;
type Status = typeof STATUS[keyof typeof STATUS];
```

## 📋 Type Patterns for FibreFlow

### Model Types
```typescript
// Base entity
interface BaseEntity {
  id?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: UserId;
}

// Domain model
interface Project extends BaseEntity {
  title: string;
  projectId: ProjectId;  // Branded type
  status: 'active' | 'completed' | 'on-hold';
  client: {
    id: ClientId;
    name: string;
  };
}

// Form types
type ProjectForm = Omit<Project, keyof BaseEntity>;
type ProjectUpdate = Partial<ProjectForm>;
```

### Service Method Types
```typescript
interface CrudService<T extends BaseEntity> {
  create(data: Omit<T, keyof BaseEntity>): Promise<T>;
  get(id: string): Observable<T | undefined>;
  list(query?: QueryConstraint[]): Observable<T[]>;
  update(id: string, data: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### Component State Types
```typescript
interface ComponentState<T> {
  data: Signal<T[]>;
  loading: Signal<boolean>;
  error: Signal<Error | null>;
  selected: Signal<T | null>;
}
```

---

Remember: TypeScript is your safety net. The stricter the types, the fewer runtime errors!