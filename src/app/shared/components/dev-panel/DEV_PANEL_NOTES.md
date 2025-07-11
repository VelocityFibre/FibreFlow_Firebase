# Dev Panel - Development Notes

## Overview
Admin-only development panel for tracking tasks, errors, and notes per page/route within FibreFlow.

## Current Status (2025-01-11)

### Completed ✅
- Full implementation of collapsible right sidebar
- Route tracking service with dynamic segment normalization
- DevNote service for Firebase persistence
- Task management (add, update status, complete)
- Page-specific notes editing
- Admin role checking
- Theme-aware styling with proper spacing functions
- Floating toggle button with task count badge
- Responsive design for mobile

### In Progress 🚧
- Error tracking functionality (model exists but not implemented)

### TODO 📋

#### High Priority
- [ ] Implement error logging and display
- [ ] Add export functionality for dev notes
- [ ] Create import feature for bulk task creation
- [ ] Add task filtering by status/priority
- [ ] Implement task search functionality

#### Medium Priority
- [ ] Add task assignment to specific developers
- [ ] Create task templates for common issues
- [ ] Add task categories/tags
- [ ] Implement task dependencies
- [ ] Add time tracking for tasks

#### Low Priority
- [ ] Create analytics dashboard for dev tasks
- [ ] Add integration with external task managers
- [ ] Implement task notifications
- [ ] Add keyboard shortcuts
- [ ] Create browser extension version

## Technical Architecture

### Route Normalization
Routes are normalized to handle dynamic segments:
- `/projects/123/edit` → `/projects/[id]/edit`
- `/staff/abc-def` → `/staff/[id]`

### Services
1. **DevNoteService** - CRUD operations for dev notes
2. **RouteTrackerService** - Tracks current route and title

### Data Model
```typescript
interface DevNote {
  id?: string;
  route: string;
  pageTitle: string;
  notes: string;
  tasks: DevTask[];
  errors: PageError[];
  lastUpdated: Date;
  updatedBy: string;
  createdAt: Date;
  createdBy: string;
}

interface DevTask {
  id: string;
  text: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  createdAt: Date;
  completedAt?: Date;
}
```

## UI Components
- **Toggle Button**: Fixed position, shows task count
- **Sidebar**: 400px wide (300px minimized)
- **Expansion Panels**: Tasks, Notes, Errors sections
- **Material Components**: Cards, chips, buttons, forms

## Styling Notes
- Uses theme functions throughout (no hardcoded colors)
- Spacing via `ff-spacing()` functions
- Responsive breakpoint at 768px
- Shadow effects via `ff-shadow()`

## Security
- Admin-only access via `isAdmin` computed signal
- Checks for `userRole === 'admin'`
- No super_admin role exists in system

## Known Issues
- Error tracking not yet implemented
- No keyboard navigation support
- No offline capability

## Future Enhancements
1. **AI Integration**: Auto-generate tasks from console errors
2. **Screenshot Capture**: Attach screenshots to tasks
3. **Code Snippets**: Link tasks to specific code files
4. **Collaboration**: Real-time updates for multiple admins
5. **Mobile App**: Standalone mobile dev panel app

## Related Files
- Model: `dev-note.model.ts`
- Service: `dev-note.service.ts`
- Route Tracker: `route-tracker.service.ts`
- Component: `dev-panel.ts`
- Template: `dev-panel.html`
- Styles: `dev-panel.scss`
- Plan: `docs/DEV_PANEL_PLAN.md`