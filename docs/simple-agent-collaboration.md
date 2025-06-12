# Simple Two-Agent Collaboration Plan - FibreFlow

## Quick Overview
Two agents working in parallel:
1. **Backend Agent** - Firebase/Data/Services
2. **Frontend Agent** - UI/Components/Views

Goal: Get project data CRUD working ASAP.

---

## Backend Agent (Agent 1)

### Focus: Data & Services Only
**Working Directory**: `/src/app/core/`

### Immediate Tasks:
1. **Project Service** (`/src/app/core/services/project.service.ts`)
   - Create project
   - Read project (single/list)
   - Update project
   - Delete project
   - Search/filter projects

2. **Data Models** (`/src/app/core/models/`)
   ```typescript
   // project.model.ts
   interface Project {
     id: string;
     name: string;
     clientId: string;
     status: 'planning' | 'active' | 'completed';
     startDate: Date;
     endDate: Date;
     budget: number;
     // Add more fields as needed
   }
   ```

3. **Firebase Integration**
   - Firestore collections setup
   - Real-time data sync
   - Error handling
   - Data validation

### Backend Agent Commands:
```bash
# Generate services
ng g service core/services/project
ng g service core/services/client
ng g service core/services/supplier

# Test services
ng test src/app/core/services/project.service.spec.ts
```

---

## Frontend Agent (Agent 2)

### Focus: UI Components Only
**Working Directory**: `/src/app/features/` and `/src/app/shared/`

### Immediate Tasks:
1. **Project List Component**
   - Display all projects in a table/grid
   - Search/filter UI
   - Sort functionality
   - Click to view details

2. **Project Form Component**
   - Create new project form
   - Edit project form
   - Form validation
   - Save/Cancel actions

3. **Project Detail Component**
   - Show full project information
   - Edit/Delete buttons
   - Navigation back to list

### Frontend Agent Commands:
```bash
# Generate components
ng g component features/projects/components/project-list
ng g component features/projects/components/project-form
ng g component features/projects/components/project-detail

# Run dev server
ng serve
```

---

## Simple Rules

### 1. Don't Touch Each Other's Files
- **Backend**: Only edit files in `/src/app/core/`
- **Frontend**: Only edit files in `/src/app/features/` and `/src/app/shared/`

### 2. Interface Contract
Backend provides these methods, Frontend uses them:

```typescript
// Backend provides:
class ProjectService {
  getProjects(): Observable<Project[]>
  getProject(id: string): Observable<Project>
  createProject(project: Project): Observable<Project>
  updateProject(id: string, project: Project): Observable<Project>
  deleteProject(id: string): Observable<void>
}

// Frontend uses:
constructor(private projectService: ProjectService) {}
```

### 3. Communication
- Backend Agent finishes a service method → Tell Frontend Agent
- Frontend Agent needs new data field → Tell Backend Agent
- Both commit with clear messages

---

## Day 1 Sprint Plan

### Backend Agent (4 hours):
1. Create Project model ✓
2. Create ProjectService with CRUD ✓
3. Test with Firebase emulator ✓
4. Document service methods ✓

### Frontend Agent (4 hours):
1. Create project-list component ✓
2. Create project-form component ✓
3. Wire up to ProjectService ✓
4. Basic styling with Angular Material ✓

### End of Day 1:
- Users can see list of projects
- Users can create new project
- Users can view project details
- Users can edit/delete projects

---

## Quick Start

### Backend Agent First Steps:
```bash
cd /home/ldp/VF/Apps/FibreFlow
ng serve  # Keep running
# Open new terminal
ng g interface core/models/project
ng g service core/services/project
# Start coding ProjectService
```

### Frontend Agent First Steps:
```bash
cd /home/ldp/VF/Apps/FibreFlow
# Wait for Backend to create ProjectService
ng g module features/projects
ng g component features/projects/components/project-list
# Start coding UI components
```

---

## Avoiding Conflicts

1. **File Ownership**:
   - `project.service.ts` → Backend ONLY
   - `project-list.component.ts` → Frontend ONLY
   - `app.routes.ts` → Coordinate changes

2. **Testing**:
   - Backend: Test services with mock data
   - Frontend: Test components with mock service

3. **Commits**:
   - Backend: `feat(core): add project CRUD service`
   - Frontend: `feat(projects): add project list component`

---

## Priority Order

### Week 1: Projects
- Project CRUD ✓
- Project list/detail views ✓
- Basic search/filter ✓

### Week 2: Clients & Suppliers  
- Client CRUD
- Supplier CRUD
- Link to projects

### Week 3: Advanced Features
- BOQ management
- Stock tracking
- RFQ processing

---

## Success Checklist

By end of Day 1:
- [ ] Can create a project
- [ ] Can see all projects
- [ ] Can edit a project
- [ ] Can delete a project
- [ ] Data persists in Firebase

By end of Week 1:
- [ ] Full project management working
- [ ] Search and filters working
- [ ] Basic validation in place
- [ ] Error handling implemented

That's it! Keep it simple, get the basics working first.