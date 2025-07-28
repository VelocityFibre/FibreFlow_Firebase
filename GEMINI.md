# Gemini Configuration: FibreFlow

This document serves as the master configuration and system prompt for all interactions with the Gemini agent regarding the FibreFlow project. It defines the project's technical standards, conventions, and architectural patterns to ensure all generated code and modifications are consistent and idiomatic.

## 1. Core Principles

- **Adherence to Existing Patterns**: All code modifications must strictly follow the established patterns and conventions found within the existing codebase. Analyze surrounding files to ensure consistency.
- **Systematic Approach**: Follow a systematic, top-down approach when analyzing or modifying the codebase.
- **Convention over Configuration**: Leverage established conventions and configurations before introducing new ones.
- **Do the Work**: When asked to perform a task, do it. Don't provide instructions on how to do it.
- **Issue-Driven Development**: All work should be tied to a GitHub issue. Reference the issue number in commits.

## 2. Global Tech Stack & Standards

### 2.1. Frontend

- **Framework**: Angular (v20.0.6 or higher).
- **UI Library**: Angular Material (v20.0.5 or higher).
- **Styling**: SCSS with CSS Custom Properties. Adhere to the existing theming structure (light, dark, vf, fibreflow).
- **State Management**: Primarily use Angular Signals for reactive state management. RxJS is used for complex asynchronous operations.
- **Forms**: Use Angular's Reactive Forms for all form implementations.
- **Components**: All new components must be `standalone`. NgModules are not used.

### 2.2. Backend

- **Platform**: Firebase.
- **Database**: Firestore. All database interactions must go through the `BaseFirestoreService` wrapper.
- **Serverless Functions**: Firebase Functions (Node.js).
- **Authentication**: Firebase Authentication.
- **Storage**: Firebase Storage.
- **Hosting**: Firebase Hosting.

### 2.3. Development Tools & Workflows

- **Version Control**: `jj` (Jujutsu) with a Git backend. See `docs/JJ_WORKFLOW.md` for the simplified workflow.
- **Worktrees**: Use worktrees for managing different branches. See `WORKTREES.md` for the directory structure and module mapping.
- **Package Manager**: `npm`.
- **Build System**: Angular CLI.
- **Local Development**: There is **no local dev server**. All testing is done via direct deployment to a preview environment.
- **Code Formatting**: Prettier is used for code formatting. Adhere to the rules in `.editorconfig` and `.prettierignore`.
- **Testing**: A "deploy-first" testing protocol is in place, as described in `TESTING_PROTOCOL.md`.
- **Code Reviews**: CodeRabbit is used for automated code reviews. See `CODERABBIT_SETUP.md` for configuration and commands.
- **Deployment**: Use the `deploy.sh` or `deploy-worktree.sh` scripts for deploying to Firebase.

## 3. Module-Specific Guidelines

### 3.1. OneMap Module (`/OneMap`)

- **Purpose**: Data processing hub for CSV to Firebase imports, pole conflict resolution, and data quality management.
- **Primary Workflow**: CSV-first processing. Use the scripts in the `CSV Import Scripts` directory for importing data. See `OneMap/CSV_TO_FIREBASE_WORKFLOW.md` for the full workflow.
- **Key Scripts**:
    - `split-csv-by-pole.js`
    - `compare-split-csvs.js`
    - `process-split-chronologically.js`
    - `fix-csv-parsing.js`
- **Conflict Resolution**: Use `analyze_and_export_complete.py` for pole conflict analysis.
- **antiHall Integration**: This module uses `antiHall` for data validation.

### 3.2. Sync Module (`/sync`)

- **Purpose**: One-way data synchronization from `vf-onemap-data` (staging) to `fibreflow-73daf` (production).
- **Sync Agent**: Use the `sync-agent` for all sync operations.
- **Critical Rules**:
    - **NEVER** sync without running conflict detection first.
    - **NEVER** auto-resolve conflicts; human approval is required.
    - **One-way sync only**.
- **Key Scripts**:
    - `full-sync.js`
    - `incremental-sync.js`
    - `detect-conflicts.js`

### 3.3. antiHall Module (`/antiHall`)

- **Purpose**: Hallucination prevention and validation system.
- **Usage**:
    - `npm run check "code snippet"` for pattern validation.
    - `npm run parse` to update the knowledge graph.
- **Integration**: The agent does **not** currently use `antiHall` for validation, but it is an option for the future.

### 3.4. Agent & Memory System (`/.claude`)

- **Purpose**: AI-powered chat agent for project interaction, with a local memory system.
- **Architecture**: Modular and separate from the frontend.
- **Backend**: Firebase Functions (`/functions/src/agent/`).
- **Frontend**: Angular Service (`/src/app/core/services/agent-chat.service.ts`).
- **Context**: The agent uses database queries and basic system prompts for context. It does **not** currently use the YAML context from `.claude/shared/fibreflow-page-contexts.yml`.
- **Agents**: A variety of specialized agents are defined in `.claude/agents.yaml`. See `.claude/AGENTS_COMPLETE_GUIDE.md` for details.
- **Memory**: The local memory system is defined in `.claude/MEMORY_SYSTEM_GUIDE.md`.

### 3.5. QGIS Module (`/Qgis`)

- **Purpose**: Handles the import of QGIS data.
- **Documentation**: See `Qgis/PROJECT_DOCUMENTATION.md` for a full overview.

### 3.6. Lemmy Tools (`/tools/lemmy`)

- **Purpose**: A TypeScript ecosystem for building AI applications.
- **Documentation**: See `tools/lemmy/README.md`.

## 4. Major Implementation Plans

### 4.1. Pole Tracker Grid (`/docs/POLE_TRACKER_GRID_IMPLEMENTATION_PLAN.md`)

- **Objective**: Implement advanced Excel-like features for the Pole Tracker Grid view.
- **Dependencies**: `chart.js`, `ng2-charts`, `exceljs`, `file-saver`.
- **Phases**:
    1. Chart.js Integration
    2. ExcelJS Integration
    3. Bulk Operations
    4. Pivot Table
    5. Power BI Integration

### 4.2. MPMS (Material & Project Management System) (`/docs/MPMS_IMPLEMENTATION_PLAN.md`)

- **Objective**: Replace the manual, spreadsheet-based system for tracking project materials, stock, and BOQs.
- **Components**:
    1. Supplier & Stock Management
    2. Project BOQ Management
    3. Reporting & Analytics
- **Database Schema**: New Firestore collections for `suppliers`, `stockItems`, `purchaseOrders`, and `stockTransactions`. A `boq` subcollection will be added to `projects`.

## 5. Architectural Patterns & Core Services

- **`BaseFirestoreService`**: All services that interact with Firestore must extend `BaseFirestoreService` to ensure automatic audit trailing.
- **Standalone Components**: All new Angular components must be `standalone`.
- **Lazy Loading**: Feature modules should be lazy-loaded to improve performance.
- **Error Handling**: A global error handler (`SentryErrorHandlerService`) is used for error tracking.
- **Theming**: A 4-theme structure (light, dark, vf, fibreflow) is implemented using SCSS and CSS Custom Properties.

## 6. Security

- **Firestore Rules**: Defined in `firestore.rules`. All operations require authentication, except for read access to `uploaded-images`.
- **Storage Rules**: Defined in `storage.rules`. Read access is generally public, while write access is restricted.
- **Secrets**: Managed in `.env.local` and Firebase configuration.

## 7. Feature Modules

The application is divided into the following feature modules, each with its own routing configuration:

- **Action Items** (`/src/app/features/action-items`)
- **Analytics** (`/src/app/features/analytics`)
- **Audit Trail** (`/src/app/features/audit-trail`)
- **Auth** (`/src/app/features/auth`)
- **BOQ Management** (`/src/app/features/boq-management`)
- **Clients** (`/src/app/features/clients`)
- **Contractors** (`/src/app/features/contractors`)
- **CSV Analysis** (`/src/app/features/csv-analysis`)
- **Daily Progress** (`/src/app/features/daily-progress`)
- **Dashboard** (`/src/app/features/dashboard`)
- **Debug** (`/src/app/features/debug`)
- **Dev Tasks** (`/src/app/features/dev-tasks`)
- **Emails** (`/src/app/features/emails`)
- **Home Signup** (`/src/app/features/home-signup`)
- **Images** (`/src/app/features/images`)
- **KPI Analytics** (`/src/app/features/kpi-analytics`)
- **Materials** (`/src/app/features/materials`)
- **Meetings** (`/src/app/features/meetings`)
- **Personal Todos** (`/src/app/features/personal-todos`)
- **Phases** (`/src/app/features/phases`)
- **Pole Tracker** (`/src/app/features/pole-tracker`)
- **Projects** (`/src/app/features/projects`)
- **Quotes** (`/src/app/features/quotes`)
- **Reports** (`/src/app/features/reports`)
- **Roles** (`/src/app/features/roles`)
- **Settings** (`/src/app/features/settings`)
- **Staff** (`/src/app/features/staff`)
- **Steps** (`/src/app/features/steps`)
- **Stock** (`/src/app/features/stock`)
- **Suppliers** (`/src/app/features/suppliers`)
- **Tasks** (`/src/app/features/tasks`)
- **VF Onemap Import** (`/src/app/features/vf-onemap-import`)