# FibreFlow React v2

A modern React rewrite of the FibreFlow fiber optic project management system.

## 🚀 Tech Stack

- **React 18.3+** with TypeScript 5.5+
- **Vite 5+** for blazing fast builds
- **Tailwind CSS 3.4+** for styling
- **Firebase 10.13+** for backend
- **TanStack Query v5** for server state
- **Zustand 4.5+** for client state
- **React Hook Form 7.52+** with Zod validation

## 📁 Project Structure

```
FF_React/
├── src/
│   ├── app/              # App-level components & providers
│   ├── features/         # Feature modules (projects, pole-tracker, etc.)
│   ├── shared/           # Shared components, hooks, utilities
│   ├── services/         # Firebase & API services
│   ├── styles/           # Global styles & themes
│   └── main.tsx          # Entry point
├── docs/                 # Documentation
└── public/              # Static assets
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🔥 Features

### Phase 1: Foundation
- [x] Project structure
- [x] Git repository setup
- [x] Vite + React + TypeScript setup
- [ ] Firebase configuration
- [ ] Authentication
- [ ] Routing
- [ ] Theme system

### Phase 2: Core Features (Planned)
- [ ] Dashboard
- [ ] Projects
- [ ] Pole Tracker
- [ ] Staff Management
- [ ] Stock Management
- [ ] BOQ
- [ ] Contractors
- [ ] Analytics

## 🎯 Migration Status

This is a complete rewrite of the Angular version of FibreFlow, maintaining the same:
- Firebase backend
- Data structures
- Security permissions
- Business logic

But with modern React patterns and improved UX.

## 📚 Documentation

- [Migration Plan](MIGRATION_PLAN.md)
- [Development Guide](CLAUDE.md)
- [Moving Directory](MOVING_DIRECTORY_NOTES.md)

## 🚀 Deployment

The React app will be deployed to a separate URL from the Angular version:
- **Angular**: https://fibreflow-73daf.web.app
- **React**: https://fibreflow-react.web.app (or similar)

## 🤝 Contributing

This is the React v2 rewrite of FibreFlow. Contributions should follow modern React patterns and TypeScript best practices.

---

Built with ❤️ using modern React and TypeScript