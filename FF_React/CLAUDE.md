# Claude Development Notes - FibreFlow React v2

## 🚀 Project Overview

This is FibreFlow v2 - a complete rewrite of the FibreFlow Angular application using modern React, TypeScript, and Vite. It maintains the same Firebase backend, data structures, and business logic while leveraging the latest React patterns and best practices.

## 🎯 CORE PRINCIPLE: Modern Simplicity
**"Use the platform, minimize dependencies, maximize developer experience"**

## ⚡ CRITICAL INSTRUCTIONS FOR CLAUDE

### 🛠️ Tech Stack
- **React 18.3+** with Concurrent Features
- **TypeScript 5.5+** in Strict Mode
- **Vite 5+** for blazing fast builds
- **Tailwind CSS 3.4+** for styling
- **Firebase 10.13+** for backend
- **TanStack Query v5** for server state
- **Zustand 4.5+** for client state
- **React Hook Form 7.52+** with Zod validation

### 📁 Project Structure
```
FF_React/
├── src/
│   ├── app/              # App-level components & providers
│   ├── features/         # Feature modules (projects, pole-tracker, etc.)
│   ├── shared/           # Shared components, hooks, utilities
│   ├── services/         # Firebase & API services
│   ├── styles/           # Global styles & themes
│   └── main.tsx          # Entry point
```

### 🔥 Key Patterns

#### 1. Service Pattern (Firebase)
```typescript
// services/projects.service.ts
export const projectService = {
  getAll: () => getDocs(collection(db, 'projects')),
  getById: (id: string) => getDoc(doc(db, 'projects', id)),
  create: (data: Project) => addDoc(collection(db, 'projects'), data),
  update: (id: string, data: Partial<Project>) => 
    updateDoc(doc(db, 'projects', id), data),
  delete: (id: string) => deleteDoc(doc(db, 'projects', id))
};
```

#### 2. Hook Pattern (Data Fetching)
```typescript
// hooks/useProjects.ts
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getAll,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}
```

#### 3. Component Pattern
```typescript
// Always use function components
export function ProjectList() {
  const { data: projects, isLoading } = useProjects();
  
  if (isLoading) return <LoadingSkeleton />;
  
  return (
    <PageLayout title="Projects">
      {/* Component content */}
    </PageLayout>
  );
}
```

### 🚨 CRITICAL DIFFERENCES FROM ANGULAR VERSION

1. **State Management**
   - Angular: Services with RxJS Observables
   - React: TanStack Query + Zustand + Local State

2. **Routing**
   - Angular: Angular Router with guards
   - React: React Router v6 with protected components

3. **Forms**
   - Angular: Reactive Forms with validators
   - React: React Hook Form with Zod schemas

4. **Components**
   - Angular: Classes with decorators
   - React: Functions with hooks

5. **Styling**
   - Angular: SCSS with view encapsulation
   - React: Tailwind CSS with component classes

### 📋 Development Workflow

1. **Feature Development**
   ```bash
   # Create feature structure
   mkdir -p src/features/projects/{components,hooks,pages,types}
   
   # Start with types
   # Then services
   # Then hooks
   # Finally components
   ```

2. **Component Creation**
   - Start with TypeScript interfaces
   - Create service methods
   - Build custom hooks
   - Implement UI components
   - Add loading/error states
   - Include accessibility

3. **Testing Approach**
   - Unit test hooks and utilities
   - Component testing with React Testing Library
   - E2E testing for critical flows
   - Always test loading and error states

### 🎨 UI/UX Guidelines

1. **Design System**
   - Use Tailwind CSS utilities
   - Follow 8px spacing grid
   - Consistent color palette with CSS variables
   - Responsive by default (mobile-first)

2. **Component Library**
   - Prefer Radix UI for headless components
   - Style with Tailwind
   - Create compound components for flexibility
   - Document with Storybook (if added)

3. **Accessibility**
   - ARIA labels on all interactive elements
   - Keyboard navigation support
   - Focus management in modals
   - Semantic HTML structure

### 🔐 Firebase Integration

1. **Authentication**
   ```typescript
   // Context-based auth
   export function AuthProvider({ children }) {
     const [user, setUser] = useState(null);
     // ... auth logic
   }
   ```

2. **Real-time Data**
   ```typescript
   // Use effects for subscriptions
   useEffect(() => {
     const unsubscribe = onSnapshot(query, (snapshot) => {
       // Handle updates
     });
     return unsubscribe;
   }, []);
   ```

3. **Offline Support**
   - Enable Firestore offline persistence
   - Show sync status to users
   - Handle offline/online transitions

### 🚀 Performance Guidelines

1. **Code Splitting**
   - Route-based splitting by default
   - Lazy load heavy components
   - Prefetch critical routes

2. **Optimization**
   - Use React.memo sparingly
   - Virtualize long lists
   - Optimize images with next-gen formats
   - Minimize bundle size

3. **Monitoring**
   - Set up Web Vitals tracking
   - Monitor bundle size
   - Use React DevTools Profiler

### 📝 Migration Notes

## Current Status
- **Location**: `/home/ldp/VF/Apps/FibreFlow/FF_React`
- **Future Location**: `/home/ldp/VF/Apps/FF_React` (same level as FibreFlow)
- **Can Move**: Yes, anytime without breaking anything (see MOVING_DIRECTORY_NOTES.md)

## Migration Strategy
1. **Phase 1**: Foundation (Auth, Routing, Theme)
2. **Phase 2**: Shared Components
3. **Phase 3**: Feature Migration (incrementally)
4. **Phase 4**: Polish & Optimization

## Feature Parity Checklist
- [ ] Authentication (Google Sign-in)
- [ ] Dashboard (Role-based)
- [ ] Projects (CRUD + Hierarchy)
- [ ] Pole Tracker (Desktop + Mobile)
- [ ] Staff Management
- [ ] Stock Management
- [ ] BOQ
- [ ] Contractors
- [ ] Daily Progress
- [ ] Meetings
- [ ] Analytics & Reports

### 🛡️ Security & Best Practices

1. **TypeScript**
   - Strict mode always on
   - No `any` types
   - Proper error handling
   - Exhaustive switch cases

2. **Security**
   - Validate all inputs
   - Sanitize user content
   - Use environment variables
   - Implement proper CORS

3. **Git Workflow**
   - Conventional commits
   - Feature branches
   - PR reviews
   - Automated testing

### 🐛 Common Pitfalls to Avoid

1. **Don't use `useEffect` for derived state** - Use computed values
2. **Don't fetch in components** - Use custom hooks
3. **Don't store sensitive data in state** - Use secure methods
4. **Don't ignore error boundaries** - Handle errors gracefully
5. **Don't skip loading states** - Always show feedback

### 📚 Resources

- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev
- **TanStack Query**: https://tanstack.com/query
- **React Router**: https://reactrouter.com
- **Tailwind CSS**: https://tailwindcss.com
- **Firebase React**: https://github.com/FirebaseExtended/reactfire

### 🔄 Continuous Improvement

When you:
- Find a better pattern → Update this file
- Solve a tricky problem → Document the solution
- Discover a pitfall → Add to the list
- Improve performance → Share the technique

### 💡 Quick Commands

```bash
# Development
npm run dev          # Start dev server

# Building
npm run build        # Production build
npm run preview      # Preview production build

# Testing
npm test            # Run tests
npm run test:e2e    # Run E2E tests

# Code Quality
npm run lint        # ESLint
npm run format      # Prettier
npm run typecheck   # TypeScript check
```

## 🎯 Current Focus

**Immediate Priority**: Set up foundation
1. Initialize Vite project
2. Configure TypeScript
3. Set up Firebase
4. Create routing structure
5. Implement authentication

**Remember**: This is a reference implementation. We're building it right from the start with modern patterns, proper TypeScript, and excellent developer experience.

---

*Last updated: 2025-01-30*