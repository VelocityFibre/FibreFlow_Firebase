# FibreFlow Database Structure & Project Isolation

## Overview
FibreFlow uses **ONE Firestore database** with a hierarchical structure. Each project's data is completely isolated using unique IDs, ensuring data separation and security.

## Core Concept: Project-Based Data Isolation

Every project in FibreFlow gets:
- A unique **project ID** (e.g., `kSFwvjb24zn1MgxS3VUU`)
- Its own set of phases, steps, and tasks
- Isolated data that cannot be accessed by other projects

## Database Hierarchy

```
firestore-database/
├── projects/ (collection)
│   ├── {projectId}/ (document)
│   │   ├── Basic Info:
│   │   │   ├── id: "kSFwvjb24zn1MgxS3VUU"
│   │   │   ├── title: "Fiber Installation - Shopping Mall"
│   │   │   ├── client: { id: "clientId", name: "Client Name" }
│   │   │   ├── status: "active" | "completed" | "pending" | "on-hold"
│   │   │   ├── priority: "high" | "medium" | "low"
│   │   │   ├── location: "123 Main St, City"
│   │   │   ├── startDate: Timestamp
│   │   │   └── type: "FTTH" | "FTTB" | "FTTC" | "P2P"
│   │   │
│   │   ├── phases/ (subcollection)
│   │   │   ├── {phaseId}/ (document)
│   │   │   │   ├── id: "phase123"
│   │   │   │   ├── name: "Planning Phase"
│   │   │   │   ├── projectId: "kSFwvjb24zn1MgxS3VUU"
│   │   │   │   ├── orderNo: 1
│   │   │   │   ├── status: "pending" | "active" | "completed"
│   │   │   │   └── ...other phase data
│   │   │   └── {phaseId}/
│   │   │
│   │   └── steps/ (subcollection)
│   │       ├── {stepId}/ (document)
│   │       │   ├── id: "step456"
│   │       │   ├── name: "Site Survey"
│   │       │   ├── projectId: "kSFwvjb24zn1MgxS3VUU"
│   │       │   ├── phaseId: "phase123"
│   │       │   ├── orderNo: 1
│   │       │   └── ...other step data
│   │       └── {stepId}/
│   │
│   └── {anotherProjectId}/ (completely separate project)
│
├── tasks/ (collection - flat for efficient querying)
│   ├── {taskId}/ (document)
│   │   ├── id: "task789"
│   │   ├── name: "Conduct site survey and feasibility study"
│   │   ├── projectId: "kSFwvjb24zn1MgxS3VUU"  ← Links to project
│   │   ├── phaseId: "phase123"                 ← Links to phase
│   │   ├── stepId: "step456"                   ← Links to step (optional)
│   │   ├── status: "pending" | "in_progress" | "completed" | "blocked"
│   │   ├── assignedTo: "userId"
│   │   ├── assignedToName: "John Doe"
│   │   ├── completionPercentage: 75
│   │   ├── priority: "high" | "medium" | "low" | "critical"
│   │   └── ...other task data
│   └── {taskId}/
│
├── staff/ (collection - global, not project-specific)
├── stock-items/ (collection - global inventory)
├── suppliers/ (collection - global supplier list)
└── clients/ (collection - global client list)
```

## Key Models & Relationships

### Project Model
```typescript
interface Project {
  id: string;              // Unique project identifier
  title: string;
  client: { 
    id: string; 
    name: string; 
  };
  status: 'active' | 'completed' | 'pending' | 'on-hold';
  priority?: 'high' | 'medium' | 'low';
  location: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  type: 'FTTH' | 'FTTB' | 'FTTC' | 'P2P';
  budget?: number;
  budgetUsed?: number;
  // ... other fields
}
```

### Task Model (Project-Specific)
```typescript
interface Task {
  id?: string;             // Unique task ID
  projectId: string;       // REQUIRED: Links to specific project
  phaseId: string;         // REQUIRED: Links to phase
  stepId?: string;         // OPTIONAL: Links to step
  name: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: string;     // User ID
  assignedToName?: string; // Denormalized for display
  completionPercentage: number;
  // ... other fields
}
```

## Querying Patterns

### 1. Get All Tasks for a Project
```typescript
// Service method
getTasksByProject(projectId: string): Observable<Task[]> {
  return collectionData(
    query(
      collection(this.firestore, 'tasks'),
      where('projectId', '==', projectId),
      orderBy('orderNo')
    ),
    { idField: 'id' }
  );
}
```

### 2. Get Phases for a Project (Subcollection)
```typescript
getPhasesByProject(projectId: string): Observable<Phase[]> {
  const phasesRef = collection(
    this.firestore, 
    `projects/${projectId}/phases`
  );
  return collectionData(
    query(phasesRef, orderBy('orderNo')),
    { idField: 'id' }
  );
}
```

### 3. Update Task (Only Affects One Project)
```typescript
async updateTask(taskId: string, updates: Partial<Task>) {
  const taskRef = doc(this.firestore, 'tasks', taskId);
  await updateDoc(taskRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  // Only the specific task is updated, no other projects affected
}
```

## Template System vs Database Data

### Templates (Code-Based)
- Located in `src/app/features/tasks/models/task-template.model.ts`
- Define standard phases, steps, and tasks
- Used as blueprints when creating new projects
- Static data, same for all projects

### Database Data (Project-Specific)
- Created when a project is initialized
- Each task/phase/step gets a unique ID
- Can be modified independently per project
- Tracks actual progress, assignments, and status

### Initialization Flow
```typescript
// 1. Create new project
const project = await projectService.createProject(projectData);

// 2. Initialize phases from templates
await phaseService.createProjectPhases(project.id);

// 3. Initialize tasks from templates
await taskService.initializeProjectTasks(project.id);
// This creates actual task documents with:
// - Unique IDs
// - projectId = project.id
// - Initial status = 'pending'
// - No assignments yet

// 4. Tasks are now ready for project-specific tracking
```

## Best Practices

### 1. Always Include projectId in Queries
```typescript
// ✅ CORRECT - Project-specific query
where('projectId', '==', projectId)

// ❌ WRONG - Returns data from all projects
collection(firestore, 'tasks') // No filter!
```

### 2. Use Subcollections for Natural Hierarchy
```typescript
// ✅ CORRECT - Phases under project
`projects/${projectId}/phases`

// ❌ AVOID - Flat structure loses hierarchy
'phases' // Top-level collection
```

### 3. Initialize with Proper Links
```typescript
// When creating a task, always include:
const newTask: Task = {
  name: template.name,
  projectId: projectId,      // REQUIRED
  phaseId: phaseId,          // REQUIRED
  stepId: stepId,            // Optional
  status: TaskStatus.PENDING,
  // ... other fields
};
```

### 4. Security Rules Enforce Isolation
```javascript
// Firestore Security Rules
match /tasks/{taskId} {
  allow read: if request.auth != null && 
    resource.data.projectId in getUserProjects(request.auth.uid);
  
  allow write: if request.auth != null && 
    request.resource.data.projectId in getUserProjects(request.auth.uid);
}
```

## Common Patterns

### Loading Project Data
```typescript
// In a component
ngOnInit() {
  const projectId = this.route.snapshot.params['id'];
  
  // Load project details
  this.project$ = this.projectService.getProject(projectId);
  
  // Load project-specific data
  this.phases$ = this.phaseService.getPhasesByProject(projectId);
  this.tasks$ = this.taskService.getTasksByProject(projectId);
  
  // All data is automatically filtered by projectId
}
```

### Creating Project-Specific Data
```typescript
// When user adds a custom task to a project
async addCustomTask(projectId: string, phaseId: string, taskData: any) {
  const task: Partial<Task> = {
    ...taskData,
    projectId,  // Always set the project link
    phaseId,    // Always set the phase link
    status: TaskStatus.PENDING,
    createdAt: serverTimestamp()
  };
  
  await this.taskService.createTask(task);
}
```

## Summary

- **One Database**: Single Firestore instance for all projects
- **Project Isolation**: Each project's data is linked via `projectId`
- **Hierarchical Structure**: Projects → Phases → Steps → Tasks
- **Templates**: Standard structure applied to each new project
- **Independence**: Each project's tasks/phases/steps are completely independent
- **Security**: Firestore rules ensure users only see their authorized projects