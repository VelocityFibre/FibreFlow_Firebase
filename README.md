# FibreFlow - Fiber Optic Project Management System

A comprehensive project management system for fiber optic installations, built with Angular 19 and Firebase.

## Features

### Core Modules
- **Projects** - Hierarchical project management with phases, steps, and tasks
- **Contractors** - Contractor management with onboarding, assignments, and performance tracking
- **Suppliers** - Supplier relationship management with contact tracking and financial information
- **Staff** - Employee management and role-based access control
- **Dashboard** - Real-time project metrics and analytics

### Contractors Module (Phase 1.1 Complete) 🆕
- ✅ Contractor CRUD operations
- ✅ Multi-step onboarding form
- ✅ Service capabilities tracking
- ✅ Financial and banking details
- ✅ Status management (pending, active, suspended)
- ✅ Advanced search and filtering
- ✅ South African localization (provinces, banks)
- 🚧 Contractor details page (in progress)
- 📋 Project assignments (planned)
- 📋 Work targets and KPIs (planned)
- 📋 Payment milestones (planned)

### Suppliers Module (Phase 1 Complete)
- ✅ Supplier CRUD operations
- ✅ Multiple contacts per supplier
- ✅ Service area management
- ✅ Category-based organization
- ✅ Financial tracking (payment terms, credit limits)
- ✅ Multi-step form interface
- ✅ Advanced search and filtering

### Tech Stack
- Angular 19.2.15
- Firebase/Firestore
- Angular Material UI
- RxJS for reactive programming
- Standalone components architecture

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

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
