# FibreFlow Tech Stack

*Last Updated: 2025-01-10*

## Frontend
- **Framework**: Angular 20.0.6
- **UI Library**: Angular Material 20.0.5
- **State Management**: Signals + RxJS
- **Styling**: SCSS with CSS Custom Properties
- **Forms**: Reactive Forms

## Backend
- **Database**: Firebase Firestore
- **Functions**: Firebase Functions (Node.js)
- **Hosting**: Firebase Hosting
- **Authentication**: Firebase Auth
- **Email**: Firebase Extensions (Mail)

## Development Tools
- **Version Control**: jj (Jujutsu) with Git coexistence
- **Build Tool**: Angular CLI
- **Package Manager**: npm
- **Testing**: Deploy-first approach (no local dev server)
- **Hallucination Prevention**: antiHall validation system

## Architecture
- **Components**: Standalone (no NgModules)
- **Services**: Firebase wrapper pattern with BaseFirestoreService
- **Routing**: Lazy-loaded feature modules
- **Theming**: 4 themes (light, dark, vf, fibreflow)
- **Error Handling**: Global + Sentry integration

## Integrations
- **Fireflies.ai**: Meeting transcription and notes
- **Google Maps**: Pole tracker integration
- **Sentry**: Error tracking

## Key Patterns
- **Deployment**: Direct to Firebase (no local dev server)
- **Security**: Secrets in `.env.local` and Firebase config
- **Audit Trail**: Automatic tracking via Firestore triggers
- **Responsive**: Mobile-first design with Material breakpoints