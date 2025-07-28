# Angular Service Patterns in FibreFlow

## Standard Service Structure
- All services extend `BaseFirestoreService<T>`
- Use dependency injection with `inject()` pattern
- Services are singletons with `providedIn: 'root'`

## ProjectService API
- **Main Methods**: `getProjects()`, `createProject()`, `updateProject()`, `deleteProject()`
- **Hierarchy Support**: `getProjectHierarchy()` includes phases, steps, tasks  
- **Progress Calculations**: `calculateProjectProgress()`, `calculatePhaseProgress()`
- **Used By**: 27 components across dashboard, pole-tracker, daily-progress, tasks, stock, BOQ modules

## Key Patterns
- Use `toSignal()` to convert Observables to Angular signals
- Always include error handling with `catchError(() => of([]))`
- Real-time updates via Firestore listeners
- Subcollections: phases/{id}, steps/{id}, tasks/{id}

## Critical Dependencies
- ClientService for project-client relationships
- PhaseService for project phases
- ProjectInitService for default setup