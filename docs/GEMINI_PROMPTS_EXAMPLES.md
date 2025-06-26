# Gemini CLI Prompts for FibreFlow Development

## 🏗️ Component Generation

### Contractor Payment Component
```
Create an Angular component in src/app/features/contractors/components/contractor-payments/ with:
- Table showing payment history with columns: date, amount, status, invoice number, project
- Payment status badges (pending, approved, paid, rejected)
- Quick actions: approve, reject, view invoice
- Filters for date range and status
- Integration with ContractorService
- Material table with sorting and pagination
- Follow our component patterns from contractor-list.component.ts
```

### Dashboard Widget
```
Create a KPI widget component in src/app/features/dashboard/components/widgets/installation-progress-widget/ that:
- Shows daily fiber installation meters
- Compares actual vs target
- Uses our existing chart configuration
- Updates in real-time from Firestore
- Responsive grid layout
- Loading and error states
```

### Report Generation Form
```
Generate a report configuration form in src/app/features/reports/components/report-builder/ with:
- Report type selection (contractor performance, project status, financial)
- Date range picker
- Multi-select for projects/contractors
- Export format options (PDF, Excel, CSV)
- Preview button
- Reactive form with validation
- Save report template feature
```

## 🔥 Firebase Operations

### Query Optimization
```
Analyze src/app/features/contractors/services/contractor.service.ts and:
1. Identify N+1 query problems
2. Suggest composite indexes for common queries
3. Implement pagination for getActiveContractors()
4. Add caching strategy for frequently accessed data
5. Show the updated indexes.json entries needed
```

### Security Rules
```
Create Firestore security rules for the new 'payments' collection:
- Only authenticated users can read
- Only users with role 'admin' or 'finance' can create/update
- Payments can only be deleted by role 'admin'
- Users can only see payments for projects they're assigned to
- Add validation rules for required fields
```

### Cloud Function
```
Create a Cloud Function that:
- Triggers when a task status changes to 'completed'
- Updates the parent phase progress percentage
- Notifies assigned contractor via FCM
- Logs the completion in audit trail
- Handles errors gracefully
```

## 🔄 Refactoring Tasks

### Service Optimization
```
Refactor ProjectService to:
1. Split into ProjectService and ProjectStatsService
2. Implement proper caching with RxJS shareReplay
3. Add retry logic for failed requests
4. Convert callbacks to observables
5. Add comprehensive error handling
```

### Component Performance
```
Optimize the task-list.component.ts for better performance:
1. Implement virtual scrolling for large task lists
2. Add OnPush change detection
3. Memoize computed properties
4. Debounce search input
5. Lazy load task details
```

## 🧪 Testing

### Unit Tests
```
Create comprehensive unit tests for daily-kpis-enhanced-form.component.ts:
- Test form validation rules
- Mock FormBuilder and services
- Test error handling scenarios
- Verify form submission with different data
- Test accessibility features
- Cover edge cases
```

### Integration Tests
```
Write integration tests for the contractor-project assignment flow:
1. Test adding contractor to project
2. Verify role permissions
3. Test concurrent user updates
4. Validate Firestore rules
5. Test offline scenarios
```

## 📊 Data Analysis

### Performance Metrics
```
Analyze the contractors module and provide:
1. Bundle size breakdown
2. Initial load time metrics
3. Lazy loading effectiveness
4. Render performance bottlenecks
5. Suggestions for code splitting
```

### Database Optimization
```
Review all Firestore collections and suggest:
1. Denormalization opportunities
2. Better data structure for real-time updates
3. Collection group queries possibilities
4. Subcollection vs root collection trade-offs
5. Index optimization recommendations
```

## 🛠️ Bulk Operations

### Import Cleanup
```
Update all files in src/app/features/contractors/:
1. Remove unused imports
2. Organize imports (Angular, RxJS, Material, Custom)
3. Convert relative to absolute paths using @app alias
4. Remove duplicate imports
5. Add missing type imports
```

### Style Standardization
```
Convert all SCSS files in contractors module to:
1. Use CSS custom properties for colors
2. Replace hardcoded spacing with design tokens
3. Add proper mobile breakpoints
4. Ensure dark mode compatibility
5. Follow BEM naming convention
```

## 🔍 Code Analysis

### Architecture Review
```
Analyze the entire FibreFlow codebase and provide:
1. Module dependency graph
2. Circular dependency detection
3. Service coupling analysis
4. Component complexity metrics
5. Suggestions for better module boundaries
```

### Security Audit
```
Perform security analysis on the codebase:
1. Check for exposed sensitive data
2. Review authentication implementation
3. Validate input sanitization
4. Check for XSS vulnerabilities
5. Review API endpoint security
```

## 💡 Feature Implementation

### Complete Feature Request
```
Implement GitHub issue #45 "Add contractor availability calendar":
1. First analyze the issue requirements
2. Create necessary models and services
3. Build calendar component with Material
4. Add CRUD operations
5. Write tests
6. Update documentation
```

### API Integration
```
Integrate with external SMS API for notifications:
1. Create SMS service with proper abstraction
2. Add configuration in environments
3. Implement notification templates
4. Add error handling and retry logic
5. Create admin UI for template management
```

## Usage Tips

1. **Be Specific**: Include file paths and component names
2. **Reference Patterns**: Mention existing components to follow
3. **Include Requirements**: List all features needed
4. **Specify Integration**: Mention services and models to use
5. **Request Tests**: Ask for tests in the same prompt

## Advanced Patterns

### Multi-Step Implementation
```
Step 1: "Analyze the current payment tracking in the contractors module"
Step 2: "Design a payment approval workflow with state machine"
Step 3: "Implement the payment service with the designed workflow"
Step 4: "Create UI components for the payment approval process"
Step 5: "Add comprehensive tests and documentation"
```

### Context Building
```
"First, analyze our authentication and role system in core/services/auth.service.ts"
"Now, implement role-based navigation guards for the reports module"
```