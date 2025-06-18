# Project Steps Implementation Guide

## Overview

The Project Steps feature adds an intermediate management layer between Phases and Tasks in FibreFlow's project hierarchy. This allows for more granular project organization and better workflow management.

## Project Hierarchy

```
Project
├── Phases (e.g., Planning, Execution, Testing)
│   ├── Steps (e.g., Site Survey, Design Review, Installation)
│   │   ├── Tasks (e.g., Specific work items)
│   │   └── ...
│   └── ...
└── ...
```

## Features

### Core Functionality
- **CRUD Operations**: Create, read, update, and delete steps
- **Phase Association**: Each step belongs to a specific phase
- **Progress Tracking**: 0-100% completion tracking with visual indicators
- **Status Management**: Pending, In Progress, Completed, Blocked, On Hold
- **Team Assignment**: Assign team members to specific steps
- **Deliverables**: Define what should be delivered for each step

### UI Components

#### 1. Project Steps Component (`ProjectStepsComponent`)
- **Location**: `src/app/features/projects/components/steps/project-steps.component.ts`
- **Features**:
  - Accordion view grouped by phases
  - Phase progress aggregation
  - Step cards with detailed information
  - Quick progress updates
  - Add/Edit/Delete operations

#### 2. Step Form Dialog (`StepFormDialogComponent`)
- **Location**: `src/app/features/projects/components/steps/step-form-dialog/step-form-dialog.component.ts`
- **Features**:
  - Phase selection dropdown
  - Date range pickers (start/end dates)
  - Progress slider (0-100%)
  - Deliverables management with chips
  - Status selection

### Data Models

#### Step Model
```typescript
interface Step {
  id?: string;
  projectId: string;
  phaseId: string;
  name: string;
  description?: string;
  orderNo: number;
  status: StepStatus;
  startDate?: Date;
  endDate?: Date;
  estimatedDuration?: number; // in days
  progress: number; // 0-100
  assignedTo?: string[]; // User IDs
  deliverables?: string[];
  // ... metadata fields
}
```

#### Step Status Enum
```typescript
enum StepStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  ON_HOLD = 'ON_HOLD'
}
```

### Services

#### Step Service (`StepService`)
- **Location**: `src/app/core/services/step.service.ts`
- **Key Methods**:
  - `getStepsByProject(projectId)`: Get all steps for a project
  - `getStepsByPhase(projectId, phaseId)`: Get steps for a specific phase
  - `createStep(step)`: Create a new step
  - `updateStep(stepId, updates)`: Update step information
  - `updateStepProgress(stepId, progress)`: Update progress and auto-update status
  - `getStepProgressByPhase(projectId)`: Calculate phase completion percentages

### Integration Points

#### Project Detail Page
- **New Tab**: "Steps" tab added between "Phases" and "Tasks"
- **Location**: Added to `src/app/features/projects/pages/project-detail/project-detail.component.html`
- **Navigation**: Accessible via project detail page tabs

#### Database Structure

#### Firestore Collection: `steps`
```json
{
  "id": "auto-generated",
  "projectId": "project_123",
  "phaseId": "phase_456",
  "name": "Site Survey",
  "description": "Conduct comprehensive site survey",
  "orderNo": 1,
  "status": "IN_PROGRESS",
  "progress": 75,
  "startDate": "2025-01-15T00:00:00Z",
  "endDate": "2025-01-20T00:00:00Z",
  "estimatedDuration": 5,
  "assignedTo": ["user_123", "user_456"],
  "deliverables": ["Survey Report", "Site Photos", "Measurements"],
  "createdAt": "2025-01-13T10:00:00Z",
  "updatedAt": "2025-01-13T15:30:00Z"
}
```

## Usage Workflow

### 1. Accessing Steps
1. Navigate to a project detail page
2. Click on the "Steps" tab (3rd tab)
3. View steps organized by phase in accordion format

### 2. Creating Steps
1. Click "Add Step" button in the header
2. Fill out the step form:
   - Select target phase
   - Enter step name and description
   - Set dates and estimated duration
   - Add deliverables
3. Save to create the step

### 3. Managing Steps
- **Edit**: Click "Edit" button on any step card
- **Progress Update**: Click "Update Progress" for quick progress changes
- **Delete**: Click "Delete" to remove a step (with confirmation)

### 4. Progress Tracking
- Individual step progress is tracked 0-100%
- Phase progress is automatically calculated as average of step progress
- Visual progress bars show completion status
- Status automatically updates based on progress:
  - 0% = Pending
  - 1-99% = In Progress  
  - 100% = Completed

## Technical Implementation

### Component Architecture
```
ProjectStepsComponent
├── Uses StepService for data operations
├── Uses PhaseService for phase information
├── Integrates with StepFormDialogComponent for CRUD
└── Implements real-time progress aggregation
```

### State Management
- Uses RxJS observables for reactive data flow
- Combines phase and step data using `combineLatest`
- Real-time updates when steps are modified

### Styling
- Follows FibreFlow theme system
- Responsive design for mobile/desktop
- Material Design components
- Consistent with existing project UI

## Future Enhancements

### Planned Features
- **Step Dependencies**: Link steps with prerequisite relationships
- **Time Tracking**: Actual vs estimated duration tracking
- **Step Templates**: Pre-defined step templates for common workflows
- **Bulk Operations**: Move/copy steps between phases
- **Calendar Integration**: Step timeline visualization
- **Notifications**: Alerts for overdue or upcoming steps

### Performance Considerations
- Implement virtual scrolling for projects with many steps
- Consider pagination for large step lists
- Cache phase progress calculations
- Optimize Firestore queries with composite indexes

## Testing

### Unit Tests
- Step service methods
- Component logic
- Form validation
- Progress calculation algorithms

### Integration Tests
- End-to-end step creation workflow
- Phase-step relationship integrity
- Progress aggregation accuracy

## Troubleshooting

### Common Issues
1. **Steps not appearing**: Check phase association and Firestore security rules
2. **Progress not updating**: Verify step service update methods
3. **Performance issues**: Consider implementing virtual scrolling for large datasets

### Debug Tools
- Use browser dev tools to inspect Firestore queries
- Check console for service error messages
- Verify component state with Angular DevTools

## Related Documentation
- [Project Workflow Guide](PROJECT_MATERIAL_WORKFLOW.md)
- [Phase Management](../src/app/core/services/phase.service.ts)
- [Task Management](../src/app/core/services/task.service.ts)