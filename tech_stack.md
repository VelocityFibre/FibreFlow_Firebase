# FibreFlow - Tech Stack 📋

## 🌍 Localization (South Africa)
- **Timezone**: Africa/Johannesburg (UTC+2)
- **Currency**: ZAR (R symbol)
- **Date Format**: DD/MM/YYYY
- **Number Format**: Space separator (1 000 000)
- **Locale Code**: en-ZA

## Core Stack

### Frontend
- **Angular 19.2** (standalone components, signals)
- **Angular Material 19.2** (UI components)
- **AngularFire 19.2** (Firebase integration)
- **RxJS 7.8** (Reactive programming)
- **TypeScript 5.7**
- **SCSS** (Custom theme system - 4 themes)

### Backend
- **Firebase 11.9.1**
  - Firestore (NoSQL database)
  - Auth (Authentication)
  - Storage (File uploads)
  - Hosting (https://fibreflow-73daf.web.app)
- **Firebase Functions** (Node.js - when needed)

### DevOps
- **Angular CLI 19.2**
- **ESLint + Prettier** (code quality)
- **Karma + Jasmine** (testing)
- **Firebase CLI** (deployment)

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

## Project Structure
```
src/app/
├── core/          # Services, guards, models
├── features/      # Feature modules
├── shared/        # Shared components
├── layout/        # App shell
└── styles/        # Theme system
```

## Future Additions
- ng2-charts (data visualization)
- xlsx (Excel export)
- jsPDF (PDF generation)
- PWA service worker
- Offline capabilities