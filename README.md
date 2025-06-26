# FibreFlow - Fiber Optic Project Management System

A comprehensive project management system for fiber optic installations, built with Angular 20 and Firebase.

## Prerequisites

- Node.js v20.19+ or v22.12+ (required by Angular 20)
- npm 10.8.2+
- Firebase CLI

### ⚠️ Important: Node.js Version Management
See [Node.js Version Management Guide](./docs/NODEJS_VERSION_MANAGEMENT.md) for:
- Setting up correct Node version
- Avoiding hardcoded path issues
- Managing multiple Node versions
- Troubleshooting version conflicts

## Features

### Core Modules
- **Projects** - Hierarchical project management with phases, steps, and tasks
  - **NEW: Steps Management** - Intermediate layer between phases and tasks for better workflow organization
- **Contractors** - Contractor management with onboarding, assignments, and performance tracking
- **Suppliers** - Supplier relationship management with contact tracking and financial information
- **Staff** - Employee management and role-based access control
- **Stock Management** - Project-based inventory tracking and material management
- **Dashboard** - Real-time project metrics and analytics
- **Task Management** - Centralized task management system with filtering and completion tracking

### Contractors Module (Phase 2 Complete - 2025/06/18) ✨
#### Phase 1 (Completed December 2024)
- ✅ Contractor CRUD operations
- ✅ Multi-step onboarding form
- ✅ Service capabilities tracking
- ✅ Financial and banking details
- ✅ Status management (pending, active, suspended)
- ✅ Advanced search and filtering
- ✅ South African localization (provinces, banks)

#### Phase 2 (Completed June 18, 2025)
- ✅ **Contractor Project Management System**
  - Card-based contractor overview with project summaries
  - Active/completed project tracking per contractor
  - Financial progress visualization
  - Performance rating display
- ✅ **Contractor-Project Detail Management**
  - Dedicated management page for contractor-project relationships
  - 6 comprehensive management tabs:
    - **Team Allocation**: Assign and manage teams per project
    - **Work Progress**: Track phase completion and task metrics
    - **Materials Needed**: Plan material requirements
    - **Materials Used**: Monitor usage and wastage
    - **Payment Requested**: Manage payment requests and approvals
    - **Payment Made**: Track payment history
- ✅ **Project Integration**
  - Replaced Documents tab with Contractors tab in project details
  - Contractor summary cards in project view
  - Direct navigation to contractor-project management
- ✅ **Data Models & Services**
  - Comprehensive ContractorProject relationship model
  - ContractorProjectService for relationship management
  - Team, material, and payment tracking structures

### Suppliers Module (Phase 2 Complete - June 18, 2025) 🆕
Phase 1 (Completed December 2024):
- ✅ Supplier CRUD operations
- ✅ Multiple contacts per supplier
- ✅ Service area management
- ✅ Category-based organization
- ✅ Financial tracking (payment terms, credit limits)
- ✅ Multi-step form interface
- ✅ Advanced search and filtering

Phase 2 (Completed June 18, 2025):
- ✅ **Card-based supplier list view** with toggle between card/table views
- ✅ **Enhanced supplier detail page** with 8 comprehensive tabs:
  - Overview with summary metrics
  - Contacts management
  - Materials catalog (UI ready)
  - Quotes management (UI ready)
  - Purchase Orders (UI ready)
  - Performance tracking with visualizations
  - Document management (UI ready)
  - Financial information
- ✅ **Performance metrics visualization** with progress bars
- ✅ **Quick actions** including "Request Quote" integration points
- ✅ **Responsive design** optimized for all screen sizes

Phase 3 (Planned):
- 📋 RFQ (Request for Quote) system integrated with BOQ
- 📋 Supplier material catalog management
- 📋 Purchase order workflow
- 📋 Supplier self-service portal
- 📋 Automated performance tracking

### Stock Management Module (June 18, 2025) 🆕
- ✅ **Project-Based Stock Management** - Filter and manage stock by project
- ✅ **Global vs Project Stock** - Support for both organization-wide and project-specific inventory
- ✅ **Material Integration** - Auto-populate stock details from Master Materials catalog
- ✅ **Stock Movements** - Track all stock allocations, transfers, and consumption
- ✅ **Real-time Updates** - Live stock levels with allocation tracking
- ✅ **Import/Export** - Bulk operations for stock items
- ✅ **Advanced Filtering** - Search by code, name, category, and status
- 📋 **Planned Features**:
  - Stock allocation workflows
  - Low stock alerts
  - Reorder automation
  - Stock valuation reports

### Task Management System (Complete - 2025/06/25) ✅
- ✅ **Centralized Task Management**: Single interface to view and manage all tasks across projects
- ✅ **Advanced Filtering**: Filter tasks by project, assignee, and completion status
- ✅ **Task Overview**: View 910+ tasks from all projects in one unified interface
- ✅ **Quick Actions**: Mark tasks as complete/incomplete directly from the management view
- ✅ **Project Integration**: Seamless integration with existing project structures
- ✅ **Real-time Updates**: Live task counts and status updates on dashboard
- ✅ **Staff Assignment Tracking**: See assigned staff members for each task
- ✅ **Fallback Handling**: Graceful handling of missing project/staff data
- ✅ **Responsive Design**: Optimized for desktop and mobile interfaces

### 🎨 Theme System (Complete - Updated 2025-06-20)
- **4 Themes Available**: Light, Dark, VelocityFibre (VF), FibreFlow
- **Instant Theme Switching**: No page reloads required
- **Fully Centralized**: All components use theme variables
- **Consistent Design**: Apple-inspired minimalism across all themes
- **Accessibility**: Proper contrast ratios maintained in all themes
- **Theme Standards Compliance** (2025-06-20):
  - ✅ Dashboard, Projects, Daily Progress pages fully compliant
  - Standard page layout: 1280px max-width container
  - Typography: 32px/300 titles, 18px/400 subtitles
  - All colors use theme functions (ff-rgb, ff-rgba)
  - Consistent spacing: 48px header margins, 24px sections
- **Documentation**: See `/docs/theme-system-guide.md` and `/docs/theme-standards.md`

### Tech Stack
- Angular 20.0.3
- Firebase 11.9.1 / Firestore
- Angular Material 20.0.3
- RxJS 7.8.0 for reactive programming
- **TypeScript 5.8.3** with advanced type safety features:
  - Zero `any` types policy (enforced by ESLint)
  - Branded types for entity IDs
  - Discriminated unions for state management
  - Template literal types for routing
  - Modern features: `satisfies`, const type parameters
- Standalone components architecture
- Centralized SCSS theme system
- Sentry 9.30.0 for error tracking and performance monitoring

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Project Structure

```
src/app/
├── core/
│   ├── models/          # Core data models
│   ├── services/        # Core services
│   └── suppliers/       # Suppliers module core
│       ├── models/      # Supplier-specific models
│       ├── services/    # Supplier services
│       └── docs/        # Module documentation
├── features/
│   ├── dashboard/       # Dashboard module
│   ├── projects/        # Projects module  
│   ├── staff/          # Staff module
│   ├── stock/          # Stock management module
│   │   ├── components/ # Stock UI components
│   │   ├── models/     # Stock data models
│   │   └── services/   # Stock services
│   └── suppliers/      # Suppliers module UI
│       └── components/ # Supplier components
└── layout/
    └── app-shell/      # Main navigation shell

```

## Module Documentation

- [Suppliers Module Plan](/src/app/core/suppliers/docs/suppliers-module-plan.md) - Comprehensive implementation plan

## Firebase Configuration

The app uses Firestore with the following collections:
- `projects` - Project data with subcollections for phases/steps/tasks
- `suppliers` - Supplier information with contacts subcollection
- `staff` - Employee records
- `users` - User authentication data
- `stockItems` - Inventory items (both global and project-specific)
- `stockMovements` - Stock transaction history
- `stockAllocations` - Project stock allocations
- `masterMaterials` - Material catalog and specifications
- `contractor-projects` - Contractor-project relationships with team and payment tracking
- `steps` - Project steps linked to phases with progress tracking

### Firebase Deployment (Updated June 25, 2025)

**IMPORTANT**: Firebase CLI doesn't automatically read the `FIREBASE_TOKEN` from `.env.local`. Use the npm scripts instead of direct Firebase commands:

```bash
# Deploy everything
npm run deploy

# Deploy only hosting
npm run deploy:hosting

# Deploy only functions
npm run deploy:functions

# Deploy only Firestore rules
npm run deploy:rules
```

The deployment scripts automatically export the Firebase token from `.env.local` before running Firebase commands. This prevents authentication issues during deployment.

**DO NOT USE** `firebase deploy` directly - it will prompt for re-authentication even with a valid token in `.env.local`.

## Recent Updates

### Meetings Module Implementation (June 26, 2025) 📅

**Successfully implemented a complete meetings synchronization and management system!**

**Implementation Details**:
- ✅ **Fireflies API Integration**: Successfully integrated with Fireflies.ai GraphQL API for meeting data retrieval
- ✅ **Local Sync Scripts**: Created Node.js scripts for syncing meetings from Fireflies to Firebase Firestore
- ✅ **Meetings List Page**: Card-based view showing all synced meetings with title, date, duration, and action items count
- ✅ **Meeting Detail Page**: Comprehensive detail view with sections for summary, participants, action items, and transcript links
- ✅ **FibreFlow Theme Compliance**: All components follow established theme system with proper CSS custom properties
- ✅ **Responsive Design**: Optimized for all screen sizes with mobile-first approach

**Key Features**:
- **Automatic Data Sync**: Local scripts fetch meetings from Fireflies API and store in Firestore
- **Modern UI**: Clean, card-based interface with hover effects and smooth transitions
- **Hierarchical Navigation**: Easy navigation from list to detail views with back button
- **Action Items Tracking**: Visual count and detailed list of action items per meeting
- **Participant Management**: Avatar-based participant display with names and emails
- **Performance Optimized**: Direct Firestore queries for fast data loading

**Technical Architecture**:
- **Sync Script**: `/scripts/sync-and-save.js` - Fetches from Fireflies GraphQL API and saves to Firestore
- **Components**: Simple standalone components with direct Firestore integration
- **Routing**: Lazy-loaded routes for optimal performance
- **Data Model**: Meetings stored in Firestore with full metadata including summaries and action items

**Deployment**: Live at https://fibreflow-73daf.web.app/meetings

### Claude Code GitHub Actions Integration (June 25, 2025) 🤖

**Successfully integrated Claude Code with GitHub Actions for automated development workflows!**

**Implementation Details**:
- ✅ **GitHub Actions Workflow**: Created `.github/workflows/claude-code.yml` with proper permissions and authentication
- ✅ **Anthropic API Integration**: Configured `ANTHROPIC_API_KEY` in repository secrets
- ✅ **Claude GitHub App**: Installed and configured for repository access
- ✅ **Trigger Configuration**: Responds to `@claude` mentions in issues, PRs, and comments
- ✅ **Git Authentication**: Fixed OIDC token issues with `id-token: write` permission
- ✅ **Local PR Creation**: Set up GitHub CLI with personal access token in `.env.local`

**Key Features**:
- **Automated Code Generation**: Claude responds to development requests in GitHub issues
- **Branch Management**: Creates feature branches automatically (e.g., `claude/issue-2-20250625_154240`)
- **Pull Request Creation**: Generates comprehensive PRs with detailed descriptions
- **FibreFlow Standards Compliance**: Follows established coding standards and theme system
- **Email Integration**: Full workflow can be managed via email notifications

**Testing Results**:
- ✅ **Integration Test**: Successfully created HelloWorld component via `@claude` mention
- ✅ **Component Generation**: Created complete Angular component with TypeScript, HTML, SCSS, and tests
- ✅ **Theme Compliance**: Used FibreFlow theme variables and Material Design patterns
- ✅ **PR Generation**: [Pull Request #3](https://github.com/VelocityFibre/FibreFlow_Firebase/pull/3) created successfully

**Usage**: Simply mention `@claude` in any GitHub issue or PR comment with your development request, and Claude will analyze the codebase and implement the solution following FibreFlow standards.

**CodeRabbit Integration**: Works seamlessly with existing CodeRabbit AI code review workflows for comprehensive automated development pipeline.

**Configuration Fix (June 25, 2025)**:
- ✅ **Resolved YAML Parsing Errors**: Fixed deprecated settings in `.coderabbit.yaml`
- ✅ **Maintained FibreFlow Standards**: Preserved all module-specific review instructions
- ✅ **Clean Reviews**: CodeRabbit now provides error-free automated code reviews
- ✅ **24/7 Operation**: Both Claude Code and CodeRabbit work continuously without configuration warnings

### Enhanced Daily KPIs Route Fix (June 25, 2025) 🔧

**Issue Resolved**: Fixed missing route `/daily-progress/kpis-enhanced` that was causing 404 errors.

**Changes Made**:
- ✅ Added missing route configuration in `daily-progress.routes.ts`
- ✅ Fixed service imports from `KPIsService` to `DailyKpisService`
- ✅ Corrected service method calls to include required `projectId` parameter
- ✅ Removed missing service dependencies not present in main project
- ✅ Fixed KPI data structure to match `DailyKPIs` model

**Result**: Enhanced Daily KPIs form now loads successfully at `/daily-progress/kpis-enhanced`

### Claude Code Theme System Compliance Enhancement (June 25, 2025) 🔧

**Issue**: Claude Code was not consistently following the established FibreFlow theme system guidelines, resulting in pattern violations such as:
- Using direct CSS variables (`var(--mat-sys-primary)`) instead of theme functions (`theme.ff-rgb(primary)`)
- Removing theme imports to "simplify" SCSS files
- Not using required namespace prefixes (`theme.ff-rgb()` vs `ff-rgb()`)

**Solution Implemented**: Enhanced `claude.md` with emphatic, Claude Code-specific guidance:
- ✅ **Mandatory Pre-SCSS Checklist**: Forces verification before any SCSS changes
- ✅ **Forbidden Patterns Section**: Explicit examples of what NOT to do with direct mappings
- ✅ **Required Pattern Examples**: Complete, copyable code examples with "NO EXCEPTIONS" language
- ✅ **Critical Rules**: 5 key rules using emphatic language ("ALWAYS", "NEVER", "FORBIDDEN")
- ✅ **Anti-Simplification Directive**: Explicitly forbids "simplifying" the theme system

**Tracking**: This update addresses documented Claude Code pattern adherence limitations. Monitor future theme-related changes to measure effectiveness of these enhancements.

**Documentation**: See updated theme compliance section in `claude.md` lines 323-376.

### Task Management System Implementation (June 25, 2025) 🆕

Implemented a comprehensive task management system for centralized task oversight:

- **Unified Task Interface**: New `/tasks/management` route providing centralized access to all 910+ tasks across projects
- **Smart Filtering System**: 
  - Filter by project (with fallback for missing project data)
  - Filter by assigned staff member
  - Toggle between showing all tasks or hiding completed tasks
- **Dashboard Integration**: Added "Tasks" card showing outstanding task count with navigation to management interface
- **Data Enhancement**: 
  - Robust handling of missing project/staff data with fallback display names
  - Enhanced observables with proper error handling and debugging
  - Real-time task status updates
- **Technical Implementation**:
  - New TaskManagementComponent with Angular Material table
  - Enhanced TaskService with debugging capabilities
  - Proper observable chain handling with combineLatest
  - Route configuration and demo mode integration
- **User Experience**:
  - Loading states with spinner
  - Empty state handling
  - Responsive design for all screen sizes
  - Intuitive checkbox interface for task completion

### Angular v20 Modernization (June 18, 2025) ⚡

Upgraded key components to leverage Angular v20 signals and new control flow syntax:

- **Dashboard Component Migration**: 
  - Migrated from observables to signals for reactive state management
  - Added computed signals for real-time dashboard stats (active projects, completion rates, low stock alerts)
  - Implemented `toSignal()` with error handling for data streams
  - Improved loading states and error resilience
- **Project List Component Migration**:
  - Converted to signal-based architecture for better performance
  - Extracted 600+ line inline template to separate HTML file for maintainability
  - Extracted styles to separate SCSS file
  - Updated control flow from `*ngIf/*ngFor` to new `@if/@for/@empty` syntax
- **Auth Service Enhancement**:
  - Implemented signal-based user state management
  - Added computed signals for authentication status and role checking
  - Maintained backward compatibility with observable support
- **Theme Service Modernization**:
  - Converted to signal-based theme state with computed properties
  - Added proper initialization to prevent NG0200 errors
  - Improved browser storage integration

**Technical Improvements**:
- Zero `any` types maintained throughout refactoring
- OnPush change detection strategy for optimal performance
- Enhanced error handling with user-friendly fallbacks
- Modern dependency injection using `inject()` function

### Project Steps Management (January 2025) 🆕

Added a new Steps management layer between Phases and Tasks for improved project workflow organization:

- **Steps Tab in Project Details**: New dedicated tab for managing steps within project phases
- **Hierarchical Structure**: Projects → Phases → Steps → Tasks
- **Step Features**:
  - Create, edit, and delete steps within each phase
  - Track progress (0-100%) with visual progress bars
  - Set start/end dates and estimated duration
  - Assign team members to steps
  - Define deliverables for each step
  - Manage step dependencies and status (Pending, In Progress, Completed, Blocked, On Hold)
- **Phase Overview**: Accordion view showing all steps grouped by phase with aggregate progress
- **Real-time Updates**: Progress changes automatically update phase completion percentages

### Contractor Project Management System (June 18, 2025)

Completed Phase 2 of the Contractors module with comprehensive project management features:

- **Project-Based Contractor Management**: New system for managing contractors per project with dedicated tracking pages
- **Detailed Tracking Tabs**: 
  - Team allocation and management
  - Work progress monitoring by phase
  - Material requirements and usage tracking
  - Payment request and completion management
- **Improved UI/UX**: Card-based layouts showing contractor performance across projects
- **Integration**: Seamless integration with project details page - replaced Documents tab with Contractors tab
- **Data Architecture**: New ContractorProject model linking contractors to projects with comprehensive tracking

For implementation details, see contractor models and services in `/src/app/features/contractors/`

### Stock Management - Project Integration (June 18, 2025)

Implemented project-based stock management capabilities:

- **Project Stock Filtering**: Added project dropdown selector to filter stock by specific projects
- **Stock Item Model Updates**: Extended with `projectId`, `projectName`, `isProjectSpecific`, and `globalStockItemId` fields
- **Service Enhancements**: 
  - `getStockItems()` now accepts optional projectId parameter
  - New `getStockItemsByProject()` method for project-specific queries
  - `createProjectStockItem()` for allocating global stock to projects
- **UI Improvements**:
  - Project selector integrated into stock list view
  - Auto-association of new stock items with selected project
  - Project context preserved when creating new items

### Performance Improvements (January 13, 2025)

Major performance enhancements have been implemented to address critical issues:

- **Memory Leak Prevention**: Fixed all subscription memory leaks using Angular 18's `takeUntilDestroyed()` pattern
- **Template Extraction**: Extracted large inline templates (1000+ lines) to separate files for better performance
- **Pagination**: Implemented efficient pagination using `MatTableDataSource` and `MatPaginator`
- **Virtual Scrolling**: Added CDK virtual scrolling for large datasets, reducing memory usage by 75%
- **Unit Tests**: Created comprehensive test suites for core services (Auth, Project, Staff, Client, Supplier)

For detailed information, see [Performance Improvements Report](./docs/performance-improvements-report.md)

### Error Tracking and Monitoring (January 2025)

- **Sentry Integration**: Professional error tracking and performance monitoring
  - Automatic error capture with source maps
  - Session replay for debugging (100% on errors)
  - Performance monitoring (10% prod, 100% dev)
  - Custom error context and breadcrumbs
  - Real-time error alerts
- **Error Handling**: Centralized error handler with user-friendly messages
- **Debug Tools**: Test page at `/debug/sentry-test` for error simulation

For setup details, see [Sentry Setup Guide](./SENTRY_SETUP.md)

### TypeScript Best Practices (January 2025) 🆕

The codebase follows strict TypeScript 5.8 best practices:

- **Zero `any` Types**: ESLint configured to error on any usage
- **Type Safety Utilities**: 
  - Type guards in `/src/app/core/utils/type-guards.ts`
  - Advanced type utilities in `/src/app/core/utils/type-utils.ts`
  - Branded types for all entity IDs
  - Discriminated unions for state management
- **Modern TypeScript Features**:
  - `satisfies` operator for better type inference
  - `const` type parameters for literal preservation
  - Template literal types for type-safe routing
- **Strict Configuration**: All TypeScript strict flags enabled

For implementation details, see:
- [TypeScript Improvement Plan](./docs/typescript/TYPESCRIPT_IMPROVEMENT_PLAN.md)
- [TypeScript Improvements Summary](./docs/typescript/TYPESCRIPT_IMPROVEMENTS_SUMMARY.md)
- Type definitions in `/src/app/core/types/`

## 📚 Documentation & Organization

All technical documentation and assets are organized in structured folders:

### Documentation
- **[📘 TypeScript](./docs/typescript/)** - Type safety improvements and best practices
- **[🚀 Deployment](./docs/deployment/)** - Deployment guides and DevOps documentation
- **[⚡ Performance](./docs/performance/)** - Performance optimization guides
- **[🔧 Technical](./docs/technical/)** - Setup guides and technical documentation
- **[🔄 Upgrades](./docs/upgrades/)** - Angular v20 upgrade documentation
- **[📋 Reviews](./docs/reviews/)** - Code reviews and quality assessments

### Utilities & Assets
- **[🛠️ Scripts](./scripts/)** - Utility scripts for data processing and maintenance
- **[📁 Archives](./docs/archives/)** - Archived documentation and backup files
- **[🎨 Assets](./docs/assets/)** - Development images and design resources

See [docs/README.md](./docs/README.md) for complete documentation index.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
