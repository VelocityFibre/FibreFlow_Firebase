# Staff Management Module

## Overview
A comprehensive staff management system built as a self-contained "lego block" module with clear API boundaries and error isolation.

## Features
- 👥 **Staff Management**: Create, view, edit, and manage staff members
- 🔍 **Advanced Search & Filters**: Search by name, email, ID; filter by group, availability, and status
- 📊 **Activity Tracking**: Monitor login times, task completion, and performance metrics
- 📅 **Availability Management**: Track working hours, vacation schedules, and task capacity
- 🔐 **Role-Based Access**: Control who can view and manage staff based on user roles
- 🧩 **Modular Architecture**: Self-contained module with facade pattern for external access

## Module Structure
```
staff/
├── models/              # Data models (internal)
├── services/            # Services
│   ├── staff.service.ts           # Internal CRUD operations
│   ├── staff-facade.service.ts    # Public API for external modules
│   └── staff-error-handler.ts     # Module-specific error handling
├── components/          # UI Components
│   ├── staff-list/      # Main list view with filters
│   ├── staff-form/      # Create/Edit form (placeholder)
│   └── staff-detail/    # Profile view (placeholder)
├── guards/              # Route guards
├── pipes/               # Custom pipes
├── public-api.ts        # Public exports
├── staff.config.ts      # Module configuration
└── staff.routes.ts      # Routing configuration
```

## Usage

### For External Modules
Only import from the public API:

```typescript
import { StaffFacadeService, StaffMember } from '@features/staff/public-api';

constructor(private staffFacade: StaffFacadeService) {}

// Get available staff
this.staffFacade.getAvailableStaff(['Angular', 'TypeScript'])
  .subscribe(staff => {
    // Use staff data
  });
```

### Navigation
The module is accessible via:
- **Route**: `/staff`
- **Menu**: "Staff" in the left sidebar (with badge icon)

## Data Model

### StaffMember
```typescript
interface StaffMember {
  // Basic Info
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
  
  // Role
  primaryGroup: 'Admin' | 'ProjectManager' | 'Technician' | 'Supplier' | 'Client';
  additionalPermissions?: string[];
  
  // Availability
  availability: {
    status: 'available' | 'busy' | 'offline' | 'vacation';
    workingHours: WorkingHours;
    currentTaskCount: number;
    maxConcurrentTasks: number;
  };
  
  // Activity
  activity: {
    lastLogin: Timestamp;
    tasksCompleted: number;
    // ... more metrics
  };
  
  // Status
  isActive: boolean;
}
```

## Public API (Facade Service)

The `StaffFacadeService` provides these methods for external modules:

- `getStaffList(filter?)` - Get filtered list of staff
- `getStaffById(id)` - Get specific staff member
- `getAvailableStaff(skills?)` - Get staff available for assignment
- `updateAvailability(id, status)` - Update staff availability
- `getStaffByGroup(group)` - Get staff by role/group

Note: Create, Update, and Delete operations are NOT exposed. These are only available through the Staff module UI.

## Integration Points

### With Project Module
Via `StaffProjectBridgeService`:
- Assign staff to projects
- Check availability for project dates
- Get staff recommendations based on skills

### With Task Module
Via `StaffProjectBridgeService`:
- Assign tasks to staff
- Update task status
- Track workload

### Event Bus
The module emits events for:
- `staff.created`
- `staff.updated`
- `staff.availability.changed`
- `staff.error`

## Security

### Permissions Matrix
| Action | Admin | PM | Technician | Supplier | Client |
|--------|-------|-----|------------|----------|--------|
| View all staff | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create staff | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit any staff | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit own profile | ✅ | ✅ | ✅ | ✅ | ✅ |

## Configuration

The module can be configured in routes:

```typescript
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

## Development Status

### ✅ Completed
- Core module structure
- Data models with availability/activity tracking
- Firebase integration service
- Staff list component with search/filter/sort
- Role-based access guard
- Module isolation architecture
- Public API via facade pattern
- Error handling

### 🚧 In Progress
- Staff form component (full implementation)
- Staff detail/profile view (full implementation)

### 📋 Planned
- Availability calendar
- Activity dashboard
- Bulk operations
- Export functionality

## Error Handling

The module includes isolated error handling:
- Errors are caught and logged internally
- Events are emitted for monitoring
- Module continues functioning with degraded features
- Other modules are not affected by staff module errors

## Testing

```bash
# Unit tests
npm test -- --include="**/staff/**/*.spec.ts"

# Integration tests
npm run test:integration -- --grep="Staff"
```

## Contributing

When adding features:
1. Keep all internal services private
2. Only expose necessary items through `public-api.ts`
3. Use the facade service for external access
4. Emit events for cross-module communication
5. Follow the existing code style and patterns