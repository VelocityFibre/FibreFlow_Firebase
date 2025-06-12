# Project Card Component Architecture

## 🎯 Modular Design Strategy

Based on the project card design, here's a recommended component breakdown for better maintainability, database efficiency, and AI considerations.

## 📦 Component Structure

```
project-card/
├── project-card.component.ts (Container)
├── components/
│   ├── card-header/
│   │   ├── card-header.component.ts
│   │   └── card-header.component.scss
│   ├── project-status-badge/
│   │   ├── project-status-badge.component.ts
│   │   └── project-status-badge.component.scss
│   ├── project-metadata/
│   │   ├── project-metadata.component.ts
│   │   └── project-metadata.component.scss
│   ├── phase-progress/
│   │   ├── phase-progress.component.ts
│   │   └── phase-progress.component.scss
│   ├── overall-progress/
│   │   ├── overall-progress.component.ts
│   │   └── overall-progress.component.scss
│   └── project-stats/
│       ├── project-stats.component.ts
│       └── project-stats.component.scss
```

## 🔧 Component Breakdown

### 1. **ProjectCard (Container Component)**
```typescript
@Component({
  selector: 'ff-project-card',
  standalone: true,
  imports: [
    CardHeaderComponent,
    ProjectStatusBadgeComponent,
    ProjectMetadataComponent,
    PhaseProgressComponent,
    OverallProgressComponent,
    ProjectStatsComponent
  ],
  template: `
    <div class="ff-card ff-card--interactive" (click)="onCardClick()">
      <ff-card-header 
        [title]="project.title"
        [subtitle]="project.client.name">
        <ff-project-status-badge 
          [status]="project.status"
          [priority]="project.priority" />
      </ff-card-header>
      
      <ff-project-metadata 
        [location]="project.location"
        [startDate]="project.startDate"
        [manager]="project.manager"
        [projectType]="project.type" />
      
      <ff-phase-progress 
        [currentPhase]="project.currentPhase"
        [phaseProgress]="project.phaseProgress" />
      
      <ff-overall-progress 
        [progress]="project.overallProgress" />
      
      <ff-project-stats 
        [stats]="projectStats" />
    </div>
  `
})
export class ProjectCardComponent {
  @Input() project!: Project;
  @Input() projectStats!: ProjectStats;
  @Output() cardClick = new EventEmitter<Project>();
}
```

### 2. **CardHeader Component**
```typescript
@Component({
  selector: 'ff-card-header',
  standalone: true,
  template: `
    <div class="card-header">
      <div class="card-header__content">
        <h3 class="card-header__title">{{ title }}</h3>
        <p class="card-header__subtitle">{{ subtitle }}</p>
      </div>
      <ng-content></ng-content> <!-- For status badge -->
    </div>
  `,
  styles: [`
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: ff-spacing(lg);
    }
  `]
})
export class CardHeaderComponent {
  @Input() title!: string;
  @Input() subtitle!: string;
}
```

### 3. **ProjectStatusBadge Component**
```typescript
@Component({
  selector: 'ff-project-status-badge',
  standalone: true,
  template: `
    <div class="status-badge" 
         [class.status-badge--active]="status === 'active'"
         [class.status-badge--completed]="status === 'completed'"
         [class.status-badge--pending]="status === 'pending'"
         [class.status-badge--high-priority]="priority === 'high'">
      <span class="status-badge__text">{{ statusText }}</span>
      @if (priority === 'high') {
        <svg class="status-badge__icon"><!-- Flag icon --></svg>
      }
    </div>
  `
})
export class ProjectStatusBadgeComponent {
  @Input() status!: ProjectStatus;
  @Input() priority?: ProjectPriority;
  
  get statusText(): string {
    return this.status.charAt(0).toUpperCase() + this.status.slice(1);
  }
}
```

### 4. **ProjectMetadata Component**
```typescript
@Component({
  selector: 'ff-project-metadata',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="metadata-grid">
      <div class="metadata-item">
        <svg class="metadata-item__icon"><!-- Location icon --></svg>
        <span class="metadata-item__text">{{ location }}</span>
      </div>
      <div class="metadata-item">
        <svg class="metadata-item__icon"><!-- Calendar icon --></svg>
        <span class="metadata-item__text">{{ startDate | date:'MMM d, y' }}</span>
      </div>
      <div class="metadata-item">
        <svg class="metadata-item__icon"><!-- User icon --></svg>
        <span class="metadata-item__text">{{ manager }}</span>
      </div>
      <div class="metadata-item">
        <svg class="metadata-item__icon"><!-- Network icon --></svg>
        <span class="metadata-item__text">{{ projectType }}</span>
      </div>
    </div>
  `
})
export class ProjectMetadataComponent {
  @Input() location!: string;
  @Input() startDate!: Date;
  @Input() manager!: string;
  @Input() projectType!: string;
}
```

### 5. **PhaseProgress Component**
```typescript
@Component({
  selector: 'ff-phase-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="phase-progress">
      <div class="phase-progress__header">
        <span class="phase-progress__label">CURRENT PHASE</span>
        <span class="phase-progress__percentage">{{ progress }}%</span>
      </div>
      <h4 class="phase-progress__name">{{ phaseName }}</h4>
      <div class="phase-progress__bar">
        <div class="phase-progress__fill" 
             [style.width.%]="progress"></div>
      </div>
    </div>
  `
})
export class PhaseProgressComponent {
  @Input() currentPhase!: ProjectPhase;
  @Input() phaseProgress!: number;
  
  get phaseName(): string {
    return this.currentPhase.name;
  }
  
  get progress(): number {
    return this.phaseProgress;
  }
}
```

### 6. **ProjectStats Component**
```typescript
@Component({
  selector: 'ff-project-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-grid">
      <div class="stat-item">
        <svg class="stat-item__icon stat-item__icon--tasks">
          <!-- Tasks icon -->
        </svg>
        <div class="stat-item__content">
          <span class="stat-item__value">{{ stats.activeTasks }}</span>
          <span class="stat-item__label">Active Tasks</span>
        </div>
      </div>
      
      <div class="stat-item">
        <svg class="stat-item__icon stat-item__icon--completed">
          <!-- Checkmark icon -->
        </svg>
        <div class="stat-item__content">
          <span class="stat-item__value">{{ stats.completedTasks }}</span>
          <span class="stat-item__label">Completed</span>
        </div>
      </div>
      
      <div class="stat-item">
        <svg class="stat-item__icon stat-item__icon--budget">
          <!-- Dollar icon -->
        </svg>
        <div class="stat-item__content">
          <span class="stat-item__value">{{ stats.budgetUsed }}%</span>
          <span class="stat-item__label">Budget Used</span>
        </div>
      </div>
    </div>
  `
})
export class ProjectStatsComponent {
  @Input() stats!: ProjectStats;
}
```

## 📊 Data Models

### Project Interface
```typescript
interface Project {
  id: string;
  title: string;
  client: {
    id: string;
    name: string;
  };
  status: ProjectStatus;
  priority?: ProjectPriority;
  location: string;
  startDate: Date;
  manager: string;
  type: ProjectType;
  currentPhase: ProjectPhase;
  phaseProgress: number;
  overallProgress: number;
}

interface ProjectStats {
  activeTasks: number;
  completedTasks: number;
  budgetUsed: number;
}

interface ProjectPhase {
  id: string;
  name: string;
  order: number;
}

type ProjectStatus = 'active' | 'completed' | 'pending' | 'on-hold';
type ProjectPriority = 'high' | 'medium' | 'low';
type ProjectType = 'FTTH' | 'FTTB' | 'FTTC' | 'P2P';
```

## 🎯 Benefits of This Approach

### 1. **Database Efficiency**
- Each component can fetch only the data it needs
- Stats can be calculated separately and cached
- Phase progress can be updated independently
- Reduces unnecessary data fetching

### 2. **AI Considerations**
- Clear component boundaries make it easier for AI to understand
- Each component has a single responsibility
- Easier to generate/modify individual components
- Better context isolation for AI prompts

### 3. **Long-term Maintainability**
- Components can be reused in different contexts
- Easy to add/remove features
- Testing is simplified (unit test each component)
- Updates to one section don't affect others

### 4. **Performance Benefits**
- Lazy loading possibilities
- OnPush change detection strategy per component
- Smaller bundle sizes with tree shaking
- Better memoization opportunities

## 🔄 Migration Strategy

1. **Phase 1**: Create individual components
2. **Phase 2**: Wire up data flow with inputs/outputs
3. **Phase 3**: Add loading states per component
4. **Phase 4**: Implement error boundaries
5. **Phase 5**: Add animations/transitions

## 📡 Smart Data Loading

```typescript
@Component({
  selector: 'ff-project-card-smart',
  template: `
    <ff-project-card 
      [project]="project$ | async"
      [projectStats]="stats$ | async"
      (cardClick)="navigateToProject($event)" />
  `
})
export class ProjectCardSmartComponent {
  @Input() projectId!: string;
  
  project$ = this.projectService.getProject(this.projectId);
  stats$ = this.projectService.getProjectStats(this.projectId);
  
  constructor(
    private projectService: ProjectService,
    private router: Router
  ) {}
  
  navigateToProject(project: Project) {
    this.router.navigate(['/projects', project.id]);
  }
}
```

## 🎨 Theming Considerations

Each component should:
- Use CSS variables for colors
- Use ff-spacing() for consistent spacing
- Support all 4 themes
- Have proper hover/focus states

## 📱 Responsive Design

Components should adapt:
- **Mobile**: Stack metadata vertically
- **Tablet**: 2-column grid for stats
- **Desktop**: Full horizontal layout

This modular approach makes your project cards:
- ✅ Easier to maintain
- ✅ More performant
- ✅ Better for AI collaboration
- ✅ More testable
- ✅ Reusable across the app