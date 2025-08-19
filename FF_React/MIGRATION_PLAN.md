# FibreFlow React v2 - Migration Plan

## Overview

This is a complete rewrite of FibreFlow from Angular 20 to React 18+, maintaining the same Firebase backend, data structures, and security model. The app will be built with modern React patterns and best practices.

## Technology Stack

### Core
- **React 18.3+** - Latest React with concurrent features
- **TypeScript 5.5+** - Strict mode for type safety
- **Vite 5+** - Lightning-fast build tool
- **React Router 6.26+** - Client-side routing

### State Management
- **TanStack Query v5** - Server state management (formerly React Query)
- **Zustand 4.5+** - Client state (lightweight, TypeScript-first)
- **React Hook Form 7.52+** - Form state with Zod validation

### UI Framework
- **Tailwind CSS 3.4+** - Utility-first styling
- **Shadcn/ui** - Copy-paste components (not a dependency)
- **Radix UI** - Headless components for accessibility
- **Framer Motion** - Animations

### Firebase Integration
- **Firebase SDK 10.13+** - Direct usage
- **ReactFire 4.2+** - Official Firebase React bindings
- **Custom hooks** - For business logic

### Development Tools
- **ESLint 9+** - With React & TypeScript plugins
- **Prettier 3.3+** - Code formatting
- **Vitest** - Unit testing (Vite-native)
- **Playwright** - E2E testing
- **MSW 2.0** - API mocking

## Project Structure

```
FF_React/
├── src/
│   ├── app/              # App-level components
│   │   ├── layouts/      # Layout components
│   │   └── providers/    # Context providers
│   ├── features/         # Feature modules
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── pole-tracker/
│   │   └── ...
│   ├── shared/          # Shared resources
│   │   ├── components/  # Reusable UI components
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # Utilities & helpers
│   │   └── types/       # TypeScript types
│   ├── services/        # Firebase & API services
│   ├── styles/          # Global styles & themes
│   └── main.tsx         # Entry point
├── public/              # Static assets
├── tests/               # Test files
└── ...config files
```

## Migration Phases

### Phase 1: Foundation (Current)
- [x] Create project structure
- [x] Set up Vite + React + TypeScript
- [ ] Configure development environment
- [ ] Set up Firebase
- [ ] Implement authentication
- [ ] Create routing structure
- [ ] Set up theme system

### Phase 2: Core Infrastructure (Week 1)
- [ ] Layout components (AppShell, Sidebar)
- [ ] Authentication flow
- [ ] Protected routes
- [ ] Error boundaries
- [ ] Loading states
- [ ] Toast notifications

### Phase 3: Shared Components (Week 2)
- [ ] Design system setup
- [ ] Common UI components
- [ ] Form components
- [ ] Data table component
- [ ] Modals & dialogs
- [ ] Theme switcher

### Phase 4: Feature Migration (Weeks 3-12)

**Order of Implementation:**
1. **Dashboard** - Overview and navigation
2. **Auth & Profile** - User management
3. **Staff** - Simple CRUD operations
4. **Daily Progress** - Forms and data entry
5. **Stock** - Inventory management
6. **Contractors** - Multi-step forms
7. **Projects** - Complex hierarchical data
8. **BOQ** - Calculations and Excel
9. **Pole Tracker** - Mobile features, offline
10. **Analytics** - Reports and charts

### Phase 5: Optimization (Week 13-14)
- Performance optimization
- PWA features
- Testing
- Documentation
- Deployment

## Key Design Decisions

### 1. State Management Architecture
```typescript
// Server State - TanStack Query
const { data: projects } = useQuery({
  queryKey: ['projects'],
  queryFn: () => getProjects()
});

// Client State - Zustand
const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  sidebarOpen: true,
  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  }))
}));

// Form State - React Hook Form
const form = useForm<ProjectForm>({
  resolver: zodResolver(projectSchema)
});
```

### 2. Firebase Integration Pattern
```typescript
// Service Layer
export const projectService = {
  getAll: () => getDocs(collection(db, 'projects')),
  getById: (id: string) => getDoc(doc(db, 'projects', id)),
  create: (data: Project) => addDoc(collection(db, 'projects'), data),
  update: (id: string, data: Partial<Project>) => 
    updateDoc(doc(db, 'projects', id), data),
  delete: (id: string) => deleteDoc(doc(db, 'projects', id))
};

// React Hook
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const snapshot = await projectService.getAll();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Project));
    }
  });
}

// Real-time Hook
export function useProjectRealtime(id: string) {
  const [project, setProject] = useState<Project | null>(null);
  
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'projects', id),
      (doc) => setProject({ id: doc.id, ...doc.data() } as Project)
    );
    return unsubscribe;
  }, [id]);
  
  return project;
}
```

### 3. Routing Structure
```typescript
// App.tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" />
      },
      {
        path: 'dashboard',
        element: <Dashboard />
      },
      {
        path: 'projects',
        element: <ProtectedRoute role="user">
          <Outlet />
        </ProtectedRoute>,
        children: [
          { index: true, element: <ProjectList /> },
          { path: 'new', element: <ProjectForm /> },
          { path: ':id', element: <ProjectDetail /> },
          { path: ':id/edit', element: <ProjectForm /> }
        ]
      }
    ]
  },
  {
    path: '/login',
    element: <Login />
  }
]);
```

### 4. Component Patterns
```typescript
// Feature Component
export function ProjectList() {
  const { data: projects, isLoading } = useProjects();
  const navigate = useNavigate();
  
  if (isLoading) return <LoadingSkeleton />;
  
  return (
    <PageLayout
      title="Projects"
      actions={
        <Button onClick={() => navigate('new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      }
    >
      <DataTable
        columns={projectColumns}
        data={projects}
        onRowClick={(project) => navigate(project.id)}
      />
    </PageLayout>
  );
}
```

### 5. Theme System
```typescript
// Tailwind + CSS Variables
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)'
      }
    }
  }
}

// Theme Provider
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

## Best Practices

### 1. TypeScript
- Strict mode always on
- No `any` types
- Use discriminated unions
- Brand types for IDs
- Zod for runtime validation

### 2. Performance
- Lazy load routes
- Virtualize long lists
- Memoize expensive computations
- Use React.memo sparingly
- Optimize bundle size

### 3. Testing
- Unit test hooks and utilities
- Integration test features
- E2E test critical paths
- Mock Firebase in tests
- Aim for 80% coverage

### 4. Code Quality
- ESLint with strict rules
- Prettier for formatting
- Husky for pre-commit
- Conventional commits
- PR reviews required

## Success Metrics

1. **Performance**: Lighthouse score > 90
2. **Bundle Size**: < 300KB initial
3. **Type Safety**: 100% typed
4. **Test Coverage**: > 80%
5. **Accessibility**: WCAG 2.1 AA

## Next Steps

1. Initialize Vite project
2. Set up TypeScript config
3. Install core dependencies
4. Configure Firebase
5. Create first components

Ready to build! 🚀