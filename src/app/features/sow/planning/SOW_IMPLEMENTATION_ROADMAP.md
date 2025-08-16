# SOW Module - Implementation Roadmap & Sprint Plan

## Overview
This roadmap provides a day-by-day implementation guide with clear milestones, dependencies, and deliverables. Follow this sequence for optimal development flow.

## Pre-Development Checklist

### Environment Setup (Day 0)
- [ ] Verify Angular 20.0.6 and all dependencies
- [ ] Confirm Firebase project access
- [ ] Test Neon database connection
- [ ] Set up feature branch: `feature/sow-module`
- [ ] Install XLSX library: `npm install xlsx@^0.20.3`
- [ ] Review existing patterns in BOQ module

### Knowledge Gathering
- [ ] Review `BaseFirestoreService` implementation
- [ ] Study theme system usage in components
- [ ] Understand project creation flow
- [ ] Analyze daily progress validation logic

## 5-Day Sprint Plan

### Day 1: Foundation & Core Services
**Goal**: Set up module structure and core services

#### Morning (4 hours)
```bash
# 1. Create module structure
mkdir -p src/app/features/sow/{components,services,models,pages,planning}
mkdir -p src/app/features/sow/components/{sow-import,sow-validation,sow-calculations,sow-summary}

# 2. Create core files
touch src/app/features/sow/sow.routes.ts
touch src/app/features/sow/models/sow.model.ts
touch src/app/features/sow/services/sow.service.ts
```

#### Tasks:
1. **Models (1 hour)**
   - Create all interfaces in `sow.model.ts`
   - Create `sow-import.model.ts`
   - Create `sow-calculation.model.ts`

2. **Core Service (2 hours)**
   - Implement `SowService extends BaseFirestoreService`
   - Add CRUD operations
   - Implement calculation methods

3. **Excel Service (1 hour)**
   - Create `sow-excel.service.ts`
   - Implement file reading logic
   - Add column mapping

#### Afternoon (4 hours)
4. **Validation Service (2 hours)**
   - Create `sow-validation.service.ts`
   - Implement all validation rules
   - Add error message formatting

5. **Routing Setup (1 hour)**
   - Configure `sow.routes.ts`
   - Update `app.routes.ts`
   - Add to navigation menu

6. **Unit Tests (1 hour)**
   - Test service methods
   - Test validation logic
   - Test calculations

**Day 1 Deliverables:**
- ✅ Complete service layer
- ✅ All models defined
- ✅ Basic routing configured
- ✅ 90% service test coverage

### Day 2: File Upload & Processing Components
**Goal**: Build file upload UI and processing logic

#### Morning (4 hours)
1. **File Upload Component (2 hours)**
   ```bash
   ng g c features/sow/components/sow-import --standalone
   ```
   - Implement drag-and-drop
   - Add file validation
   - Create upload UI with Material

2. **State Management (1 hour)**
   - Set up signals for file state
   - Implement upload progress
   - Add error handling

3. **Excel Processing (1 hour)**
   - Connect to Excel service
   - Parse uploaded files
   - Display preview data

#### Afternoon (4 hours)
4. **Validation Component (2 hours)**
   ```bash
   ng g c features/sow/components/sow-validation --standalone
   ```
   - Create validation results table
   - Add error/warning display
   - Implement quick fixes

5. **Theme Integration (1 hour)**
   - Apply FibreFlow theme system
   - Test all 4 themes
   - Add responsive styles

6. **Integration Testing (1 hour)**
   - Test file upload flow
   - Verify Excel parsing
   - Check validation display

**Day 2 Deliverables:**
- ✅ Working file upload
- ✅ Excel parsing functional
- ✅ Validation results display
- ✅ Theme compliance

### Day 3: Calculations & Preview
**Goal**: Implement calculations and preview UI

#### Morning (4 hours)
1. **Calculations Component (2 hours)**
   ```bash
   ng g c features/sow/components/sow-calculations --standalone
   ```
   - Display calculated totals
   - Show daily targets
   - Add duration adjustment

2. **Geographic Breakdown (1 hour)**
   - Zone/PON analysis
   - Visual charts
   - Data tables

3. **Preview Formatting (1 hour)**
   - Currency formatting (ZAR)
   - Number formatting
   - Responsive tables

#### Afternoon (4 hours)
4. **Summary Component (2 hours)**
   ```bash
   ng g c features/sow/components/sow-summary --standalone
   ```
   - Final review screen
   - Editable fields
   - Confirmation dialog

5. **Firebase Integration (1 hour)**
   - Save to Firestore
   - Upload files to Storage
   - Error handling

6. **Progress Persistence (1 hour)**
   - IndexedDB for recovery
   - Auto-save implementation
   - Resume functionality

**Day 3 Deliverables:**
- ✅ Calculations working
- ✅ Preview screens complete
- ✅ Firebase integration
- ✅ Auto-save functional

### Day 4: Integration & Polish
**Goal**: Connect to existing modules and polish UI

#### Morning (4 hours)
1. **Project Integration (2 hours)**
   - Add to project creation flow
   - Update project model
   - Test KPI population

2. **Daily Progress Integration (1 hour)**
   - Load SOW targets
   - Validation against targets
   - Warning messages

3. **Wizard Flow (1 hour)**
   ```bash
   ng g c features/sow/pages/sow-wizard --standalone
   ```
   - Implement stepper
   - Navigation logic
   - Progress tracking

#### Afternoon (4 hours)
4. **Error Handling (1 hour)**
   - User-friendly messages
   - Recovery options
   - Sentry integration

5. **Performance Optimization (1 hour)**
   - Large file handling
   - Virtual scrolling
   - Loading states

6. **Mobile Responsiveness (1 hour)**
   - Test on mobile
   - Touch interactions
   - Responsive layouts

7. **Accessibility (1 hour)**
   - Keyboard navigation
   - Screen reader labels
   - ARIA attributes

**Day 4 Deliverables:**
- ✅ Full integration working
- ✅ Polished UI/UX
- ✅ Mobile responsive
- ✅ Accessible

### Day 5: Testing & Documentation
**Goal**: Comprehensive testing and deployment prep

#### Morning (4 hours)
1. **E2E Testing (2 hours)**
   - Complete workflow test
   - Edge cases
   - Error scenarios

2. **Integration Tests (1 hour)**
   - With projects module
   - With daily progress
   - With Firebase/Neon

3. **Performance Testing (1 hour)**
   - Large file benchmarks
   - Memory profiling
   - UI responsiveness

#### Afternoon (4 hours)
4. **Bug Fixes (2 hours)**
   - Address test findings
   - Polish interactions
   - Final adjustments

5. **Documentation (1 hour)**
   - User guide
   - Code comments
   - API documentation

6. **Deployment Prep (1 hour)**
   - Build verification
   - Firestore rules update
   - Function deployment

**Day 5 Deliverables:**
- ✅ All tests passing
- ✅ Documentation complete
- ✅ Ready for deployment
- ✅ PR created

## Code Organization Strategy

### File Naming Convention
```
sow-import.component.ts       # Components
sow.service.ts               # Services  
sow.model.ts                 # Models
sow-import.component.spec.ts # Tests
```

### Import Organization
```typescript
// 1. Angular core
import { Component, inject, signal } from '@angular/core';

// 2. Angular common
import { CommonModule } from '@angular/common';

// 3. Angular Material
import { MatButtonModule } from '@angular/material/button';

// 4. Third party
import * as XLSX from 'xlsx';

// 5. Core services
import { BaseFirestoreService } from '@core/services';

// 6. Feature specific
import { SowService } from '../../services/sow.service';

// 7. Models
import { SOWData } from '../../models/sow.model';
```

### Component Structure
```typescript
@Component({
  selector: 'app-sow-import',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './sow-import.component.html',
  styleUrl: './sow-import.component.scss'
})
export class SowImportComponent {
  // 1. Service injection
  private sowService = inject(SowService);
  
  // 2. Input/Output
  projectId = input.required<string>();
  onComplete = output<string>();
  
  // 3. State signals
  files = signal<FileState>({});
  isLoading = signal(false);
  
  // 4. Computed signals
  canProceed = computed(() => ...);
  
  // 5. Methods
  async onFileSelect(event: Event) { }
}
```

## Quality Gates

### Before Moving to Next Day
- [ ] All unit tests pass
- [ ] No TypeScript errors
- [ ] ESLint clean
- [ ] Code follows patterns
- [ ] Commit with meaningful message

### Definition of Done
- [ ] Feature works end-to-end
- [ ] All tests pass (unit, integration, e2e)
- [ ] Responsive on mobile
- [ ] Works in all 4 themes
- [ ] No console errors
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Code reviewed

## Risk Mitigation

### Common Pitfalls to Avoid
1. **Don't skip validation setup** - It's complex but critical
2. **Test with real Excel files** - Mock data isn't enough
3. **Handle offline scenarios** - Users work in poor connectivity
4. **Consider concurrent edits** - Multiple users, same project
5. **Plan for large files** - Some excels have 50k+ rows

### Backup Plans
- **If XLSX library issues** → Use ExcelJS as fallback
- **If performance problems** → Implement server-side processing
- **If Firebase quota** → Batch operations
- **If Neon sync fails** → Queue for retry

## Dependencies

### External Libraries
```json
{
  "xlsx": "^0.20.3",        // Excel parsing
  "file-saver": "^2.0.5",   // File downloads (already installed)
  "@angular/cdk": "^20.0.5" // Virtual scrolling (already installed)
}
```

### Existing Services to Use
- `BaseFirestoreService` - For data operations
- `AuthService` - For user context
- `ThemeService` - For theme integration
- `ProjectService` - For project updates
- `NotificationService` - For user feedback

## Success Metrics

### Performance
- Import 1000 records: < 5 seconds
- Validate 5000 records: < 10 seconds
- Save to Firebase: < 2 seconds
- UI remains responsive throughout

### Quality
- Zero runtime errors
- 90% code coverage
- All integration tests pass
- Lighthouse score > 90

### User Experience
- Clear progress indication
- Helpful error messages
- Intuitive navigation
- Fast response times

## Post-Implementation

### Phase 2 Enhancements (Future)
1. Bulk import multiple projects
2. Template library
3. Historical comparisons
4. API integration
5. Advanced analytics

### Maintenance Tasks
- Monitor error rates
- Track usage analytics
- Gather user feedback
- Performance optimization

## Quick Commands Reference

```bash
# Start development
cd src/app/features/sow
code .

# Run tests
ng test --include='**/sow/**/*.spec.ts'

# Check types
npx tsc --noEmit -p tsconfig.json

# Build module
ng build --configuration development

# Deploy
firebase deploy --only hosting,functions
```

## Daily Standup Questions

1. What did I complete yesterday?
2. What will I complete today?
3. Are there any blockers?
4. Do I need to adjust the timeline?

## Contact for Help

- **Architecture Questions**: Review BOQ module
- **Firebase Issues**: Check functions logs
- **Theme Problems**: See THEME_SYSTEM.md
- **Integration Help**: Review antiHall patterns

This roadmap ensures smooth, efficient development with clear daily goals and quality checkpoints.