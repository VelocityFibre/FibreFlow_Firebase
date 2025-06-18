# FibreFlow - Tech Stack 📋

## 🌍 Localization (South Africa)
- **Timezone**: Africa/Johannesburg (UTC+2)
- **Currency**: ZAR (R symbol)
- **Date Format**: DD/MM/YYYY
- **Number Format**: Space separator (1 000 000)
- **Locale Code**: en-ZA

## Core Stack

### Frontend
- **Angular 20.0.3** (standalone components, signals)
- **Angular Material 20.0.3** (UI components)
- **Angular CDK 20.0.3** (Component development kit)
- **@angular/fire 19.2.0** (Firebase integration)
- **RxJS 7.8.0** (Reactive programming)
- **TypeScript 5.8.3**
- **Zone.js 0.15.0** (Change detection)
- **SCSS** (Custom theme system - 4 themes)

### Backend
- **Firebase 11.9.1**
  - Firestore (NoSQL database)
  - Auth (Authentication)
  - Storage (File uploads)
  - Hosting (https://fibreflow-73daf.web.app)
- **Firebase Functions** (Node.js - when needed)

### DevOps
- **Angular CLI 20.0.3**
- **Node.js 20.19.2** (minimum required)
- **npm 10.8.2**
- **ESLint 8.57.1 + Angular ESLint 20.0.0**
- **Prettier 3.5.3** (code formatting)
- **Karma 6.4.0 + Jasmine 5.6.0** (testing)
- **Firebase CLI** (deployment)
- **Sentry 9.30.0** (error tracking & monitoring)
- **Husky 9.1.7** (Git hooks)
- **Lint-staged 15.5.2** (Pre-commit checks)

## Key Features Implemented

✅ **Architecture**
- Standalone components (no NgModules)
- Inject pattern (no constructor DI)
- Lazy-loaded routes
- Role-based access control

✅ **Theme System**
- 4 themes: light, dark, vf, fibreflow
- All components use theme variables
- Real-time theme switching
- Component mixins for consistency

✅ **Modules**
- Dashboard, Projects, Staff, Tasks
- Stock (Items & Movements), Roles
- Suppliers, Clients, Contractors (basic)
- BOQ, RFQ (planned)

✅ **UI/UX**
- Material Design components
- Responsive mobile-first
- List/Card view toggles
- Loading states & error handling

✅ **Error Tracking & Monitoring**
- Sentry integration for production errors
- Session replay for debugging
- Performance monitoring
- Custom error context
- Source maps for readable stack traces

## Project Structure
```
src/app/
├── core/          # Services, guards, models
├── features/      # Feature modules
├── shared/        # Shared components
├── layout/        # App shell
└── styles/        # Theme system
```

## Additional Libraries
- **xlsx 0.18.5** (Excel import/export for BOQ)
- **tslib 2.3.0** (TypeScript runtime library)

## Future Additions
- ng2-charts (data visualization)
- jsPDF (PDF generation)
- PWA service worker
- Offline capabilities