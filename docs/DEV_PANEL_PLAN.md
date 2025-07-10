# Dev Panel Implementation Plan

*Created: 2025-01-11*  
*Feature: Admin Development Panel*

## Overview
Create an admin-only sidebar panel for tracking development tasks, errors, and notes per page in FibreFlow.

## Implementation Checklist

### Phase 1: Data Layer
- [x] Create DevNote model (`src/app/core/models/dev-note.model.ts`)
- [x] Create DevNoteService extending BaseFirestoreService
- [ ] Add Firestore security rules for admin-only access

### Phase 2: Core Components
- [x] Create dev-panel component (collapsible sidebar)
- [x] Add route detection service
- [x] Implement note creation/editing UI

### Phase 3: Task Management
- [ ] Add task list component
- [ ] Implement task CRUD operations
- [ ] Add priority and status indicators

### Phase 4: Error Tracking
- [ ] Create error interceptor service
- [ ] Display errors per page
- [ ] Add error resolution tracking

### Phase 5: Integration
- [ ] Add to main layout (admin only)
- [ ] Add keyboard shortcuts (toggle panel)
- [ ] Test with all 4 themes

## Design Decisions
- **Position**: Right sidebar (like VS Code)
- **Width**: 300-400px when expanded
- **Storage**: Firestore collection 'devNotes'
- **Visibility**: Admin role only
- **Styling**: Follow existing theme system

## Key Files to Create
1. `src/app/core/models/dev-note.model.ts`
2. `src/app/core/services/dev-note.service.ts`
3. `src/app/shared/components/dev-panel/`
4. `src/app/core/services/route-tracker.service.ts`

## Development Guidelines
- Keep it simple - basic CRUD first
- Use existing BaseFirestoreService pattern
- Follow theme functions (ff-rgb, ff-spacing)
- Test with deploy command
- No over-engineering

## Success Criteria
- [ ] Admin can see panel on any page
- [ ] Notes persist per route
- [ ] Tasks can be created/completed
- [ ] Works in all 4 themes
- [ ] Non-admins cannot see panel