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

### 🎨 Theme System (Complete)
- **4 Themes Available**: Light, Dark, VelocityFibre (VF), FibreFlow
- **Instant Theme Switching**: No page reloads required
- **Fully Centralized**: All components use theme variables
- **Consistent Design**: Apple-inspired minimalism across all themes
- **Accessibility**: Proper contrast ratios maintained in all themes

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

## Recent Updates

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
