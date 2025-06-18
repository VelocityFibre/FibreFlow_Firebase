# TypeScript 5.8 Best Practices

**Generated**: 2025-06-18  
**TypeScript Version**: 5.8.3  
**Purpose**: Modern TypeScript patterns for codebase review

## 1. Strict Configuration

### 1.1 tsconfig.json Setup
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "skipLibCheck": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 2. Branded Types for Type Safety

### 2.1 Entity ID Types
```typescript
// ✅ BEST PRACTICE: Branded types prevent ID mixing
export type UserId = string & { readonly __brand: 'UserId' };
export type ProjectId = string & { readonly __brand: 'ProjectId' };
export type TaskId = string & { readonly __brand: 'TaskId' };

// Brand creation functions
export const createUserId = (id: string): UserId => id as UserId;
export const createProjectId = (id: string): ProjectId => id as ProjectId;

// Usage prevents mixing
function getUser(id: UserId): User { }
function getProject(id: ProjectId): Project { }

// This would cause a TypeScript error:
// getUser(createProjectId('123')); // ❌ Error!
```

### 2.2 Measurement Units
```typescript
// ✅ BEST PRACTICE: Type-safe measurements
type Meters = number & { readonly __unit: 'meters' };
type Feet = number & { readonly __unit: 'feet' };
type Currency = number & { readonly __currency: 'ZAR' };

const meters = (value: number): Meters => value as Meters;
const feet = (value: number): Feet => value as Feet;
const zar = (value: number): Currency => value as Currency;

// Type-safe conversions
function convertFeetToMeters(distance: Feet): Meters {
  return meters(distance * 0.3048);
}
```

## 3. Advanced Type Patterns

### 3.1 Discriminated Unions for State
```typescript
// ✅ BEST PRACTICE: Type-safe state management
type LoadingState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

// Type guards for state checking
function isSuccess<T>(state: LoadingState<T>): state is { status: 'success'; data: T } {
  return state.status === 'success';
}

function isError<T>(state: LoadingState<T>): state is { status: 'error'; error: string } {
  return state.status === 'error';
}

// Usage with exhaustive checking
function handleState<T>(state: LoadingState<T>) {
  switch (state.status) {
    case 'idle':
      return 'Ready to load';
    case 'loading':
      return 'Loading...';
    case 'success':
      return `Loaded ${state.data}`;
    case 'error':
      return `Error: ${state.error}`;
    default:
      // TypeScript ensures this is never reached
      const _exhaustive: never = state;
      return _exhaustive;
  }
}
```

### 3.2 Template Literal Types for Routes
```typescript
// ✅ BEST PRACTICE: Type-safe routing
type Route = 
  | '/'
  | '/login'
  | `/projects/${string}`
  | `/projects/${string}/edit`
  | `/users/${string}`
  | `/admin/settings`;

// Build route with validation
function buildProjectRoute(id: ProjectId): `/projects/${string}` {
  return `/projects/${id}`;
}

// Router with type safety
class TypedRouter {
  navigate(route: Route) {
    // Implementation
  }
}
```

### 3.3 Conditional Types for API
```typescript
// ✅ BEST PRACTICE: Conditional types for flexible APIs
type ApiResponse<T, E extends boolean = false> = E extends true
  ? { success: false; error: string }
  : { success: true; data: T };

// Overloaded function signatures
function apiCall<T>(url: string): Promise<ApiResponse<T, false>>;
function apiCall<T>(url: string, expectError: true): Promise<ApiResponse<T, true>>;
function apiCall<T>(url: string, expectError?: boolean): Promise<ApiResponse<T, boolean>> {
  // Implementation
}

// Usage
const successResponse = await apiCall('/api/users'); // Type: { success: true; data: User[] }
const errorResponse = await apiCall('/api/users', true); // Type: { success: false; error: string }
```

## 4. Utility Types

### 4.1 Deep Readonly
```typescript
// ✅ BEST PRACTICE: Deep immutability
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type ImmutableUser = DeepReadonly<User>;
// All properties and nested objects are readonly
```

### 4.2 Optional to Required
```typescript
// ✅ BEST PRACTICE: Transform optional properties
type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

interface CreateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
}

// Require specific fields
type ValidatedUserRequest = RequireFields<CreateUserRequest, 'name' | 'email'>;
```

### 4.3 Extract Function Parameters
```typescript
// ✅ BEST PRACTICE: Extract types from existing functions
type EventHandler<T> = (event: T) => void;

type ButtonClickHandler = EventHandler<MouseEvent>;
type InputChangeHandler = EventHandler<{ target: { value: string } }>;

// Extract return type
type AsyncFunction = () => Promise<User>;
type UserType = Awaited<ReturnType<AsyncFunction>>; // User
```

## 5. Class and Interface Patterns

### 5.1 Abstract Base Classes
```typescript
// ✅ BEST PRACTICE: Abstract classes for shared behavior
abstract class BaseService<T, ID> {
  abstract find(id: ID): Promise<T | null>;
  abstract create(data: Omit<T, 'id' | 'createdAt'>): Promise<T>;
  abstract update(id: ID, data: Partial<T>): Promise<T>;
  abstract delete(id: ID): Promise<void>;
  
  // Shared implementation
  async findOrThrow(id: ID): Promise<T> {
    const entity = await this.find(id);
    if (!entity) {
      throw new Error(`Entity with id ${id} not found`);
    }
    return entity;
  }
}

// Concrete implementation
class UserService extends BaseService<User, UserId> {
  async find(id: UserId): Promise<User | null> {
    // Implementation
  }
  
  // ... other methods
}
```

### 5.2 Mixins for Composition
```typescript
// ✅ BEST PRACTICE: Mixins for shared functionality
type Constructor<T = {}> = new (...args: any[]) => T;

// Timestamp mixin
function WithTimestamps<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt!: Date;
    updatedAt!: Date;
    
    touch() {
      this.updatedAt = new Date();
    }
  };
}

// Validation mixin
function WithValidation<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    errors: string[] = [];
    
    isValid(): boolean {
      return this.errors.length === 0;
    }
    
    addError(error: string) {
      this.errors.push(error);
    }
  };
}

// Combined usage
class BaseEntity {}
class User extends WithValidation(WithTimestamps(BaseEntity)) {
  name!: string;
  email!: string;
}
```

## 6. Generics and Constraints

### 6.1 Generic Constraints
```typescript
// ✅ BEST PRACTICE: Constrained generics
interface Identifiable {
  id: string;
}

function updateEntity<T extends Identifiable>(
  entity: T, 
  updates: Partial<Omit<T, 'id'>>
): T {
  return { ...entity, ...updates };
}

// Key constraints
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    result[key] = obj[key];
  });
  return result;
}
```

### 6.2 Conditional Generic Types
```typescript
// ✅ BEST PRACTICE: Conditional generics
type NonNullable<T> = T extends null | undefined ? never : T;

type ApiResult<T, TError = never> = T extends never 
  ? { error: TError }
  : { data: T };

// Mapped type with conditions
type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};
```

## 7. Module and Namespace Patterns

### 7.1 Module Augmentation
```typescript
// ✅ BEST PRACTICE: Extend existing modules
declare module '@angular/material/core' {
  interface MatOptionSelectionChange<T = any> {
    customProperty?: string;
  }
}

// Extend global objects safely
declare global {
  interface Window {
    customAnalytics?: {
      track(event: string, data?: Record<string, any>): void;
    };
  }
}
```

### 7.2 Namespace Organization
```typescript
// ✅ BEST PRACTICE: Organize related types
export namespace Project {
  export interface Base {
    id: ProjectId;
    name: string;
    description: string;
  }
  
  export interface WithDates extends Base {
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Full extends WithDates {
    teamMembers: UserId[];
    status: 'active' | 'completed' | 'archived';
  }
  
  export type CreateRequest = Omit<Base, 'id'>;
  export type UpdateRequest = Partial<Omit<Full, 'id' | 'createdAt'>>;
}
```

## 8. Error Handling Types

### 8.1 Result Type Pattern
```typescript
// ✅ BEST PRACTICE: Functional error handling
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Helper functions
function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

// Usage in async operations
async function fetchUser(id: UserId): Promise<Result<User, string>> {
  try {
    const user = await userRepository.find(id);
    return user ? success(user) : failure('User not found');
  } catch (error) {
    return failure(`Database error: ${error.message}`);
  }
}

// Pattern matching
function handleUserResult(result: Result<User, string>) {
  if (result.success) {
    console.log(`User: ${result.data.name}`);
  } else {
    console.error(`Error: ${result.error}`);
  }
}
```

## 9. Performance Optimizations

### 9.1 Type-Only Imports
```typescript
// ✅ BEST PRACTICE: Import types separately
import type { User, Project } from './models';
import { createUser } from './user-service';

// Const assertions for better inference
const themes = ['light', 'dark', 'auto'] as const;
type Theme = typeof themes[number]; // 'light' | 'dark' | 'auto'
```

### 9.2 Lazy Type Loading
```typescript
// ✅ BEST PRACTICE: Lazy type imports for large types
type LazyUserDetails = import('./user-details').UserDetails;

async function getUserDetails(id: UserId): Promise<LazyUserDetails> {
  const { UserDetailsService } = await import('./user-details');
  return new UserDetailsService().getDetails(id);
}
```

## 10. Testing Types

### 10.1 Type Testing Utilities
```typescript
// ✅ BEST PRACTICE: Test your types
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;

// Test type transformations
type TestRequireFields = Expect<Equal<
  RequireFields<{ a?: string; b?: number }, 'a'>,
  { a: string; b?: number }
>>;

// Runtime type checking
function assertType<T>(value: unknown): asserts value is T {
  // Runtime validation logic
}

// Usage in tests
it('should have correct type', () => {
  const user = createUser({ name: 'John', email: 'john@example.com' });
  assertType<User>(user);
  expect(user.name).toBe('John');
});
```

## 11. Configuration and Environment

### 11.1 Environment Types
```typescript
// ✅ BEST PRACTICE: Type-safe environment config
interface Environment {
  readonly production: boolean;
  readonly apiUrl: string;
  readonly firebase: {
    readonly apiKey: string;
    readonly authDomain: string;
    readonly projectId: string;
  };
}

// Validate environment at runtime
function validateEnvironment(env: unknown): Environment {
  if (!env || typeof env !== 'object') {
    throw new Error('Invalid environment configuration');
  }
  
  // Runtime validation logic
  return env as Environment;
}
```

## 12. Migration Checklist

- [ ] Enable all strict TypeScript flags
- [ ] Replace `any` with proper types
- [ ] Implement branded types for IDs
- [ ] Use discriminated unions for state
- [ ] Add template literal types for routes
- [ ] Implement proper error handling types
- [ ] Use const assertions where appropriate
- [ ] Add type-only imports
- [ ] Create utility types for common patterns
- [ ] Add type testing for complex types
- [ ] Document type usage patterns
- [ ] Set up type coverage monitoring

## Common Anti-Patterns to Avoid

1. **Using `any` type** - Always find specific types
2. **Ignoring strict flags** - Enable all strict options
3. **Not using branded types** - Prevent ID mixing
4. **Missing error types** - Handle all error cases
5. **Overusing union types** - Use discriminated unions
6. **Not constraining generics** - Add proper constraints
7. **Ignoring null/undefined** - Handle nullable types
8. **Missing readonly modifiers** - Ensure immutability
9. **Not using type guards** - Validate runtime types
10. **Importing everything** - Use type-only imports