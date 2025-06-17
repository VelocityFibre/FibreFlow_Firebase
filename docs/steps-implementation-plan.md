# Steps Module Implementation Plan

## Overview
Implement a comprehensive Steps management system that fits into the project hierarchy:
**Projects → Phases → Steps → Tasks**

## Current Status
- ✅ Step model updated with required fields
- ✅ Build and deploy successful
- 🔄 Steps module creation in progress

## Requirements (Based on Screenshot)
The Steps page should display and manage:
1. **Step Name** - Name of the step (e.g., Planning, Kick-off, Civils, etc.)
2. **Project** - Which project the step belongs to
3. **Order** - Sequence number for the step
4. **Start Date** - When the step begins
5. **End Date** - When the step should complete
6. **Status** - Current status (Not Started, In Progress, Completed, etc.)
7. **Progress** - Percentage completion (0-100)
8. **Feedback** - Comments or notes about the step

## Implementation Tasks

### Phase 1: Model & Service Layer ✅
- [x] Update Step model with missing fields (startDate, endDate, progress, feedback)
- [ ] Create dedicated StepService for CRUD operations
- [ ] Add step-specific Firebase queries

### Phase 2: UI Components
- [ ] Create Steps module structure
- [ ] Create StepListComponent with Angular Material table
- [ ] Create StepFormDialogComponent for add/edit operations
- [ ] Create StepDetailDialogComponent for viewing step details
- [ ] Implement filtering by project/phase
- [ ] Add bulk operations (mark complete, update progress)

### Phase 3: Integration
- [ ] Add Steps routing (/steps)
- [ ] Link from Project Detail page
- [ ] Add Steps tab in Project Detail view
- [ ] Update navigation menu
- [ ] Integrate with existing phase management

### Phase 4: Task Integration
- [ ] Update Task model to properly link to Steps
- [ ] Modify task creation to select step instead of direct phase
- [ ] Update task queries to filter by step
- [ ] Add step progress calculation based on task completion

### Phase 5: Testing & Refinement
- [ ] Test CRUD operations
- [ ] Verify step ordering and dependencies
- [ ] Test progress calculations
- [ ] Add validation for date ranges
- [ ] Performance optimization for large datasets

## Technical Implementation Details

### Step Service Methods
```typescript
interface StepService {
  // CRUD Operations
  createStep(step: Step): Promise<string>
  updateStep(stepId: string, updates: Partial<Step>): Promise<void>
  deleteStep(stepId: string): Promise<void>
  getStep(stepId: string): Observable<Step>
  
  // Queries
  getStepsByProject(projectId: string): Observable<Step[]>
  getStepsByPhase(phaseId: string): Observable<Step[]>
  getStepsWithTasks(stepId: string): Observable<StepWithTasks>
  
  // Bulk Operations
  updateStepProgress(stepId: string, progress: number): Promise<void>
  updateStepStatus(stepId: string, status: StepStatus): Promise<void>
  reorderSteps(phaseId: string, stepOrders: {id: string, order: number}[]): Promise<void>
}
```

### UI Features
1. **List View**
   - Sortable table with all fields
   - Inline editing for progress
   - Quick status updates
   - Filter by project/phase
   - Search functionality

2. **Form Dialog**
   - Project selection (dropdown)
   - Phase selection (filtered by project)
   - Date pickers with validation
   - Progress slider
   - Rich text editor for feedback

3. **Integrations**
   - Link to view/manage tasks under each step
   - Progress auto-calculation from tasks
   - Gantt chart view (future enhancement)

## Deployment Checkpoints
- [ ] After Step Service implementation
- [ ] After List Component completion
- [ ] After Form Dialog completion
- [ ] After Project integration
- [ ] Final deployment with all features

## Success Criteria
1. Users can perform full CRUD operations on steps
2. Steps properly integrate with the project hierarchy
3. Tasks can be assigned to steps
4. Progress tracking works across steps and rolls up to phases
5. Performance remains smooth with 100+ steps per project

## Next Steps
1. Continue with Step Service implementation
2. Create the UI components
3. Test with sample data
4. Gather user feedback
5. Iterate based on usage patterns