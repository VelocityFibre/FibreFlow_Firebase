# FibreFlow Project Context

## Project Overview
FibreFlow is a comprehensive fiber optic project management system built with Angular 20 and Firebase. It manages the complete lifecycle of fiber optic installations from planning through execution.

## Technology Stack
- **Frontend**: Angular 20 with TypeScript
- **UI Components**: Angular Material
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions)
- **Styling**: SCSS with custom design tokens
- **State Management**: RxJS and Angular Signals
- **Testing**: Jasmine/Karma for unit tests, Cypress for E2E

## Project Structure
```
src/app/
├── features/         # Feature modules (lazy loaded)
│   ├── contractors/  # Contractor management
│   ├── projects/     # Project & phase management
│   ├── tasks/        # Task management system
│   ├── stock/        # Inventory management
│   ├── dashboard/    # Analytics & metrics
│   └── reports/      # Reporting module (new)
├── shared/          # Shared components & models
├── core/            # Core services & guards
└── layout/          # App shell & navigation
```

## Key Patterns & Conventions

### Component Structure
- Feature modules use lazy loading
- Components follow `feature-name.component.ts` naming
- Services are provided in root or module level
- Use OnPush change detection where possible

### Form Handling
- Reactive forms with strong typing
- Custom validators in `shared/validators/`
- Form state management with RxJS

### Firebase Integration
- Services abstract Firestore operations
- Real-time subscriptions with proper cleanup
- Optimistic updates for better UX
- Security rules enforce role-based access

### Styling Guidelines
- SCSS modules per component
- CSS custom properties for theming
- Mobile-first responsive design
- Material Design principles

## Current Development Focus

### Active Features
1. **Contractor Project Management** - Linking contractors to projects with performance tracking
2. **Steps Management** - Intermediate workflow layer between phases and tasks
3. **Daily Progress Tracking** - KPI entry and monitoring system
4. **Reports Module** - New module for generating various reports

### Testing Requirements
- Unit tests for all services
- Component tests for complex logic
- Integration tests for Firebase operations
- E2E tests for critical user journeys

## Common Tasks

### Generate Components
Look for existing patterns in the target feature module before creating new components.

### Firebase Queries
Check indexes.json for compound query requirements. Optimize for real-time performance.

### State Management
Use Angular Signals for simple state, RxJS for complex async flows.

## Development Workflow
1. Create feature branch from master
2. Implement with tests
3. Run linting and build checks
4. Create PR with conventional commits

## Important Services
- `AuthService` - Authentication and user management
- `ProjectService` - Project CRUD and relationships  
- `ContractorService` - Contractor operations
- `NotificationService` - User notifications
- `FirestoreService` - Base Firestore operations

## Performance Considerations
- Lazy load feature modules
- Use track by functions in *ngFor
- Implement virtual scrolling for large lists
- Optimize Firestore queries with proper indexes
- Cache frequently accessed data

## Security Notes
- Never expose API keys in code
- Role-based access control implemented
- Firebase security rules enforce permissions
- Sanitize all user inputs
- Use environment files for configuration