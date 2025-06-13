# Staff Management Module - Complete Implementation Plan

## Overview
Comprehensive staff management system with availability tracking, activity monitoring, role-based access control, and seamless integration with project management. Built as a self-contained "lego block" module with clear API boundaries and error isolation.

## Progress Tracker

### Phase 1: Core Structure ✅
- [x] Create module structure and directories
- [x] Define data models (Staff, Availability, Activity)
- [x] Set up Firebase collections and security rules
- [x] Create base service architecture
- [x] Define shared interfaces for module integration
- [x] Create bridge service for cross-module operations
- [x] Implement event bus for module communication
- [x] Add module to app routes and navigation (changed from 'Staff' to 'Admin' in sidebar)
- [x] Implement module isolation architecture:
  - [x] Create Facade service for public API
  - [x] Define public-api.ts exports
  - [x] Add module-specific error handler
  - [x] Create module configuration system

### Phase 2: Staff CRUD Operations ✅
- [x] Staff Service with Firebase integration (now internal, accessed via Facade)
- [x] Staff List Component with search/filter/sort
- [x] Role-based access guard
- [x] Staff Form Component placeholder (ready for implementation)
- [x] Staff Detail/Profile Component placeholder (with tabs structure)
- [x] Fixed type safety issues in facade service
- [x] Added to app routes and navigation menu

### Phase 3: Availability Management 📅
- [ ] Availability data model and service
- [ ] Availability calendar component
- [ ] Working hours configuration
- [ ] Vacation/leave management
- [ ] Real-time status updates

### Phase 4: Activity Tracking 📊
- [ ] Activity tracking service
- [ ] Activity dashboard component
- [ ] Login/logout tracking
- [ ] Task completion metrics
- [ ] Performance analytics

### Phase 5: Integration Features 🔗
- [ ] Staff-Project assignment UI
- [ ] Task assignment interface
- [ ] Workload visualization
- [ ] Cross-module notifications
- [ ] Shared components (staff selector, availability widget)

### Phase 6: Testing & Documentation 📝
- [ ] Unit tests for services
- [ ] Integration tests for cross-module features
- [ ] E2E tests for user workflows
- [ ] API documentation
- [ ] User guide

## Module Architecture (Updated with Isolation)

```
src/app/
├── features/
│   └── staff/
│       ├── models/
│       │   ├── staff.model.ts (internal)
│       │   └── index.ts
│       ├── services/
│       │   ├── staff.service.ts (internal - not exported)
│       │   ├── staff-facade.service.ts (PUBLIC API)
│       │   ├── staff-error-handler.service.ts
│       │   ├── staff-availability.service.ts (internal)
│       │   └── staff-activity.service.ts (internal)
│       ├── components/
│       │   ├── staff-list/
│       │   ├── staff-form/
│       │   ├── staff-detail/
│       │   ├── staff-availability-calendar/
│       │   └── staff-activity-dashboard/
│       ├── guards/
│       │   └── staff-role.guard.ts
│       ├── pipes/
│       │   └── availability-status.pipe.ts
│       ├── public-api.ts (ONLY public exports)
│       ├── staff.config.ts
│       └── staff.routes.ts
├── core/
│   ├── services/
│   │   ├── staff-project-bridge.service.ts (uses StaffFacadeService)
│   │   ├── event-bus.service.ts
│   │   └── task-assignment.service.ts
│   └── staff/
│       └── docs/
│           └── staff-module-complete-plan.md
└── shared/
    ├── interfaces/
    │   └── staff-project.interface.ts
    └── components/
        ├── staff-selector/
        └── staff-availability-widget/
```

## Data Models

### Core Staff Model
```typescript
interface StaffMember {
  // Basic Information
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
  
  // Role & Permissions
  primaryGroup: StaffGroup;
  additionalPermissions?: string[];
  
  // Availability
  availability: StaffAvailability;
  
  // Activity Tracking
  activity: StaffActivity;
  
  // Skills & Certifications
  skills?: string[];
  certifications?: string[];
  
  // Emergency Contact
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  
  // Metadata
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastModifiedBy?: string;
}

type StaffGroup = 'Admin' | 'ProjectManager' | 'Technician' | 'Supplier' | 'Client';

interface StaffAvailability {
  status: 'available' | 'busy' | 'offline' | 'vacation';
  workingHours: WorkingHours;
  vacationDates?: VacationPeriod[];
  currentTaskCount: number;
  maxConcurrentTasks: number;
  nextAvailableSlot?: Timestamp;
}

interface StaffActivity {
  lastLogin: Timestamp | null;
  lastActive: Timestamp | null;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksFlagged: number;
  totalProjectsWorked: number;
  averageTaskCompletionTime: number;
  performanceRating?: number;
}
```

### Integration Models
```typescript
// Staff assignment to projects
interface StaffAssignment {
  id?: string;
  staffId: string;
  staffName?: string;
  projectId: string;
  projectName?: string;
  role: 'Lead' | 'Member' | 'Support' | 'Observer';
  assignedDate: Timestamp;
  assignedBy: string;
  estimatedHours?: number;
  actualHours?: number;
  status: 'active' | 'completed' | 'removed';
}

// Task assignment to staff
interface TaskAssignment {
  id?: string;
  taskId: string;
  taskName?: string;
  projectId: string;
  staffId: string;
  staffName?: string;
  assignedDate: Timestamp;
  assignedBy: string;
  dueDate?: Timestamp;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'started' | 'completed' | 'flagged';
  estimatedHours?: number;
  actualHours?: number;
}

// Staff workload and recommendations
interface StaffWorkload {
  staffId: string;
  totalTasks: number;
  tasksByStatus: { [key: string]: number };
  totalEstimatedHours: number;
  totalActualHours: number;
  utilizationPercentage: number;
  availableHours: number;
}

interface StaffRecommendation {
  staff: StaffBasicInfo;
  matchScore: number;
  availability: AvailabilityInfo;
  matchingSkills: string[];
  missingSkills: string[];
  recommendation: 'highly-recommended' | 'recommended' | 'available';
  reasons: string[];
}
```

## Firebase Structure

```
firestore:
  # Staff Management
  staff/
    {staffId}/                    # Core staff data
      
  staff_availability/
    {staffId}/
      schedules/
        {year-month}/             # Monthly schedules
          
  staff_activities/
    {staffId}/
      logs/
        {year-month}/
          {day}/                  # Daily activity logs
            
  # Integration Collections
  project_staff/
    {projectId}/
      assignments/
        {staffId}/                # Project's view of staff
        
  staff_projects/
    {staffId}/
      projects/
        {projectId}/              # Staff's view of projects
        
  task_assignments/
    {taskId}/                     # Task assignments
    
  staff_tasks/
    {staffId}/
      tasks/
        {taskId}/                 # Staff's view of tasks

firebase-auth:
  - User accounts linked to staff records
  - Custom claims for role-based access
```

## Component Specifications

### 1. Staff List Component ✅
- Material table with virtual scrolling
- Real-time search across name, email, ID
- Multi-select filters for group, status, availability
- Column sorting and custom column visibility
- Bulk actions (activate/deactivate)
- Quick view popover on hover
- Export to CSV/PDF

### 2. Staff Form Component 📝
- Multi-step wizard interface:
  - **Step 1**: Basic Information
    - Name, email, phone validation
    - Employee ID auto-generation
    - Photo upload with crop/resize
  - **Step 2**: Role & Permissions
    - Primary group selection
    - Additional permissions checklist
    - Skill tags with autocomplete
  - **Step 3**: Availability Settings
    - Working hours template
    - Max concurrent tasks
    - Default availability status
  - **Step 4**: Review & Confirm
- Real-time validation with error messages
- Auto-save draft functionality
- Duplicate detection

### 3. Staff Detail Component 👤
- Comprehensive profile layout:
  - **Header**: Photo, name, status badge, quick actions
  - **Tabs**:
    - **Overview**: Contact info, skills, emergency contact
    - **Availability**: Calendar view, schedule management
    - **Projects**: Active/completed projects list
    - **Tasks**: Task board with filters
    - **Activity**: Login history, performance metrics
    - **Documents**: Certificates, contracts upload
- Edit mode with inline editing
- Activity timeline
- Print-friendly view

### 4. Availability Calendar 📅
- Views: Month, Week, Day, Agenda
- Features:
  - Drag-drop schedule editing
  - Vacation request workflow
  - Task load visualization
  - Conflict detection
  - Recurring schedules
  - iCal export/sync
- Visual indicators:
  - Color-coded availability status
  - Task count badges
  - Vacation/leave markers

### 5. Activity Dashboard 📊
- Key metrics cards:
  - Tasks completed this week/month
  - Average response time
  - Utilization percentage
  - Performance rating
- Charts:
  - Task completion trend
  - Project distribution pie chart
  - Login frequency heatmap
  - Workload over time
- Exportable reports with date range

## Module Isolation Architecture

### Public API Design
The Staff module exposes ONLY these items through `public-api.ts`:

```typescript
// public-api.ts
export { StaffFacadeService } from './services/staff-facade.service';
export { StaffMember, StaffGroup, AvailabilityStatus } from './models/staff.model';
```

### Facade Service Pattern
All external interactions go through the facade:

```typescript
class StaffFacadeService {
  // Public methods for other modules
  getStaffList(filter?: StaffFilter): Observable<StaffMember[]>
  getStaffById(id: string): Observable<StaffMember | undefined>
  getAvailableStaff(requiredSkills?: string[]): Observable<StaffMember[]>
  updateAvailability(staffId: string, status: string): Observable<void>
  getStaffByGroup(group: StaffGroup): Observable<StaffMember[]>
  
  // Note: Create/Update/Delete are NOT exposed
  // These operations are only available through the Staff module UI
}
```

### Error Isolation
Module-specific error handler prevents crashes from affecting other modules:

```typescript
@Injectable()
export class StaffErrorHandler implements ErrorHandler {
  handleError(error: Error): void {
    // Log error internally
    console.error('Staff Module Error:', error);
    
    // Emit error event for monitoring
    this.eventBus.emit({
      type: 'staff.error',
      payload: { error: error.message },
      source: 'StaffModule'
    });
    
    // Module continues functioning with degraded features
  }
}
```

## Service Architecture

### 1. Staff Service (Internal - NOT Exported)
```typescript
class StaffService {
  // Internal CRUD operations
  getStaff(filter?: StaffFilter): Observable<StaffMember[]>
  getStaffById(id: string): Observable<StaffMember>
  getStaffByGroup(group: StaffGroup): Observable<StaffMember[]>
  getAvailableStaff(skills?: string[]): Observable<StaffMember[]>
  
  createStaff(data: StaffCreateDto): Observable<string>
  updateStaff(id: string, updates: Partial<StaffMember>): Observable<void>
  deleteStaff(id: string): Observable<void>
  
  bulkUpdateStatus(ids: string[], isActive: boolean): Observable<void>
  importStaff(data: StaffImportDto[]): Observable<ImportResult>
}
```

### 2. Staff-Project Bridge Service
```typescript
class StaffProjectBridgeService {
  // Assignment operations
  assignStaffToProject(assignment: StaffAssignment): Observable<void>
  removeStaffFromProject(projectId: string, staffId: string): Observable<void>
  
  // Query operations
  getProjectStaff(projectId: string): Observable<StaffAssignment[]>
  getStaffProjects(staffId: string): Observable<StaffAssignment[]>
  getRecommendedStaff(requirement: ProjectStaffRequirement): Observable<StaffRecommendation[]>
  
  // Task operations
  assignTask(assignment: TaskAssignment): Observable<void>
  getStaffTasks(staffId: string, filter?: TaskFilter): Observable<TaskAssignment[]>
  updateTaskStatus(taskId: string, status: TaskStatus): Observable<void>
  
  // Analytics
  getStaffWorkload(staffId: string): Observable<StaffWorkload>
  getTeamUtilization(teamId: string): Observable<TeamUtilization>
}
```

### 3. Event Bus Service
```typescript
class EventBusService {
  // Event emission
  emit(event: AppEvent): void
  
  // Event subscription
  on<T extends AppEvent>(eventType?: string): Observable<T>
  
  // Typed event helpers
  emitStaffEvent(type: StaffEventType, payload: any): void
  emitProjectEvent(type: ProjectEventType, payload: any): void
  emitTaskEvent(type: TaskEventType, payload: any): void
}
```

## Module Configuration

The Staff module can be configured independently:

```typescript
interface StaffModuleConfig {
  enableOfflineMode?: boolean;          // Enable offline capability
  maxConcurrentTasks?: number;           // Default max tasks per staff
  defaultAvailabilityStatus?: string;    // Default status for new staff
  enableActivityTracking?: boolean;      // Track login/activity
}

// Usage in routes
{
  path: 'staff',
  providers: [
    { provide: STAFF_MODULE_CONFIG, useValue: {
      enableOfflineMode: true,
      maxConcurrentTasks: 5,
      defaultAvailabilityStatus: 'available',
      enableActivityTracking: true
    }}
  ]
}
```

## Integration Points (Via Facade & Bridge Services)

### 1. With Project Module
**Via Bridge Service** (`StaffProjectBridgeService`):
- `assignStaffToProject()` - Assign/remove staff from projects
- `checkStaffAvailability()` - Verify availability for project dates
- `getRecommendedStaff()` - Get staff recommendations based on skills
- `getProjectStaff()` - Get all staff assigned to a project

### 2. With Task Module
**Via Bridge Service**:
- `assignTask()` - Assign tasks to available staff
- `updateTaskStatus()` - Staff update their task status
- `getStaffTasks()` - Get all tasks for a staff member
- `getStaffWorkload()` - Check current workload

### 3. With Auth Module
**Via Event Bus**:
- Listen for `auth.user.created` to create staff record
- Emit `staff.created` to sync permissions
- Handle `auth.role.changed` to update staff group
- Track `auth.login/logout` for activity

### 4. With Other Modules
**Via Event Bus Only**:
```typescript
// Other modules subscribe to staff events
eventBus.onStaffEvent().subscribe(event => {
  switch(event.type) {
    case 'staff.availability.changed':
      // React to availability changes
      break;
    case 'staff.error':
      // Handle staff module errors gracefully
      break;
  }
});
```

## Security & Permissions

### Firebase Security Rules
```javascript
// Staff collection - Role-based access
match /staff/{staffId} {
  allow read: if isAuthenticated() && 
    (isAdmin() || isSameUser(staffId) || isTeamMember(staffId));
  
  allow create: if isAuthenticated() && 
    (isAdmin() || isProjectManager());
  
  allow update: if isAuthenticated() && 
    (isAdmin() || (isSameUser(staffId) && onlyUpdatingAllowedFields()));
  
  allow delete: if isAuthenticated() && isAdmin();
}

// Task assignments - Staff can update their own
match /task_assignments/{taskId} {
  allow read: if isAuthenticated() && 
    (isAdmin() || resource.data.staffId == request.auth.uid);
  
  allow update: if isAuthenticated() && 
    resource.data.staffId == request.auth.uid &&
    onlyUpdatingStatus();
}
```

### Permission Matrix
| Action | Admin | PM | Technician | Supplier | Client |
|--------|-------|-----|------------|----------|--------|
| View all staff | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create staff | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit any staff | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit own profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assign to project | ✅ | ✅ | ❌ | ❌ | ❌ |
| View availability | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update task status | ✅ | ✅ | ✅ | ✅ | ❌ |

## API Design (Future Backend)

### RESTful Endpoints
```
# Staff Management
GET    /api/staff                    # List with filters
GET    /api/staff/:id                # Get details
POST   /api/staff                    # Create
PUT    /api/staff/:id                # Update
DELETE /api/staff/:id                # Soft delete
POST   /api/staff/bulk               # Bulk operations

# Availability
GET    /api/staff/:id/availability   # Get schedule
PUT    /api/staff/:id/availability   # Update schedule
POST   /api/staff/:id/vacation       # Request vacation

# Assignments
GET    /api/staff/:id/projects       # Get projects
GET    /api/staff/:id/tasks          # Get tasks
POST   /api/staff/:id/tasks/:taskId/status  # Update task

# Analytics
GET    /api/staff/:id/workload       # Get workload
GET    /api/staff/:id/activity       # Get activity
GET    /api/staff/recommendations    # Get recommendations
```

### GraphQL Schema
```graphql
type Staff {
  id: ID!
  employeeId: String!
  name: String!
  email: String!
  primaryGroup: StaffGroup!
  availability: Availability!
  activity: Activity!
  projects: [ProjectAssignment!]!
  tasks(status: TaskStatus): [TaskAssignment!]!
  workload: Workload!
}

type Query {
  staff(id: ID!): Staff
  staffList(filter: StaffFilter): [Staff!]!
  availableStaff(skills: [String!], date: Date): [Staff!]!
  recommendStaff(projectId: ID!): [StaffRecommendation!]!
}

type Mutation {
  createStaff(input: CreateStaffInput!): Staff!
  updateStaff(id: ID!, input: UpdateStaffInput!): Staff!
  assignToProject(staffId: ID!, projectId: ID!, role: ProjectRole!): ProjectAssignment!
  updateTaskStatus(taskId: ID!, status: TaskStatus!): Task!
}

type Subscription {
  staffAvailabilityChanged(staffId: ID!): Availability!
  taskAssigned(staffId: ID!): Task!
}
```

## Testing Strategy

### Unit Tests
- Service method coverage (>90%)
- Component logic testing
- Guard permission testing
- Pipe transformation testing

### Integration Tests
- Cross-module communication
- Firebase rule validation
- Event bus message flow
- State synchronization

### E2E Tests
- Staff creation workflow
- Project assignment flow
- Task management cycle
- Availability update process

## Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Security rules deployed
- [ ] Indexes created in Firestore
- [ ] Environment variables set
- [ ] Feature flags configured

### Post-deployment
- [ ] Smoke tests on production
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify integrations
- [ ] Update documentation

## Future Enhancements

### Phase 1 (Next Sprint)
- Mobile app support
- Offline capability
- Advanced search with ElasticSearch
- Bulk import from HR systems

### Phase 2 (Q2)
- AI-powered staff recommendations
- Predictive availability
- Skill gap analysis
- Performance predictions

### Phase 3 (Q3)
- Third-party calendar sync
- Video call integration
- Document signing
- Automated onboarding

## Module Isolation Benefits

### 1. **Independent Development**
- Staff module can be developed and tested in isolation
- No dependencies on other feature modules
- Can be versioned and deployed independently

### 2. **Error Containment**
- Staff module errors don't crash the app
- Other modules continue functioning
- Errors are logged and emitted as events

### 3. **Clear Contracts**
- Public API via `StaffFacadeService`
- Shared interfaces in `/shared/interfaces`
- No direct cross-module imports

### 4. **Flexible Integration**
- Event-driven communication
- Bridge services for complex operations
- Can easily switch to microservices later

### 5. **Easy Testing**
```typescript
// Other modules can mock the facade
const mockStaffFacade = {
  getAvailableStaff: () => of([mockStaff1, mockStaff2]),
  updateAvailability: () => of(void 0)
};
```

## Module Usage Example

### From Project Module:
```typescript
// Import ONLY from public API
import { StaffFacadeService } from '@features/staff/public-api';

export class ProjectComponent {
  constructor(
    private staffFacade: StaffFacadeService,
    private bridgeService: StaffProjectBridgeService
  ) {}
  
  assignStaff() {
    // Use facade for queries
    this.staffFacade.getAvailableStaff(['Angular', 'TypeScript'])
      .subscribe(availableStaff => {
        // Use bridge for operations
        this.bridgeService.assignStaffToProject({
          staffId: availableStaff[0].id,
          projectId: this.projectId,
          role: 'Member'
        }).subscribe();
      });
  }
}
```

## Summary

The Staff module is built as a true "lego block":
- ✅ **Self-contained** with its own models, services, and components
- ✅ **Clear API boundaries** via Facade pattern
- ✅ **Error isolation** with module-specific error handler
- ✅ **Configurable** without affecting other modules
- ✅ **Loosely coupled** via events and bridge services
- ✅ **Ready for microservices** architecture in the future

## Current Status

### Deployment Ready ✅
The Staff module is now ready for deployment with:
- Full module structure implemented
- Staff list component functional
- Navigation integrated (appears as "Staff" in sidebar)
- Routes configured at `/staff`
- Error isolation in place
- Public API defined

### Documentation
- **Implementation Plan**: This document
- **Module README**: `/src/app/features/staff/README.md` - User guide and API reference

### Next Development Phase
1. Implement full staff form with validation
2. Complete staff detail/profile view
3. Add availability calendar component
4. Implement activity tracking dashboard

## References
- [Angular Material Components](https://material.angular.io)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [RxJS Operators](https://rxjs.dev/guide/operators)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Facade Pattern](https://refactoring.guru/design-patterns/facade)
- [Module Federation](https://webpack.js.org/concepts/module-federation/)