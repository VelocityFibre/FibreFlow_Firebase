import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.dashboardRoutes),
    data: { preload: true },
  },
  {
    path: 'projects',
    loadChildren: () => import('./features/projects/projects.routes').then((m) => m.projectRoutes),
    data: { preload: true },
  },
  {
    path: 'suppliers',
    loadChildren: () =>
      import('./features/suppliers/suppliers.routes').then((m) => m.suppliersRoutes),
  },
  {
    path: 'staff',
    loadChildren: () => import('./features/staff/staff.routes').then((m) => m.staffRoutes),
  },
  {
    path: 'contractors',
    loadChildren: () =>
      import('./features/contractors/contractors.routes').then((m) => m.contractorsRoutes),
  },
  {
    path: 'clients',
    loadChildren: () => import('./features/clients/clients.routes').then((m) => m.clientsRoutes),
  },
  {
    path: 'phases',
    loadChildren: () => import('./features/phases/phases.routes').then((m) => m.phasesRoutes),
  },
  {
    path: 'steps',
    loadChildren: () => import('./features/steps/steps.routes').then((m) => m.STEPS_ROUTES),
    title: 'All Steps - FibreFlow'
  },
  // Dashboard-linked routes
  {
    path: 'materials',
    loadChildren: () =>
      import('./features/materials/materials.routes').then((m) => m.materialRoutes),
    data: { preload: true },
  },
  {
    path: 'issues',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    data: { title: 'Flagged Issues' },
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    data: { title: 'Analytics' },
  },
  {
    path: 'daily-progress',
    loadChildren: () =>
      import('./features/daily-progress/daily-progress.routes').then(
        (m) => m.DAILY_PROGRESS_ROUTES,
      ),
  },
  // Placeholder routes for pages to be implemented
  {
    path: 'roles',
    loadChildren: () => import('./features/roles/roles.routes').then((m) => m.ROLES_ROUTES),
  },
  {
    path: 'attendance',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    data: { title: 'Attendance' },
  },
  {
    path: 'performance',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    data: { title: 'Performance' },
  },
  {
    path: 'tasks',
    loadChildren: () => import('./features/tasks/tasks.routes').then((m) => m.tasksRoutes),
  },
  {
    path: 'stock',
    loadChildren: () => import('./features/stock/stock.routes').then((m) => m.stockRoutes),
    data: { preload: true },
  },
  {
    path: 'boq',
    loadChildren: () => import('./features/boq/boq.routes').then((m) => m.boqRoutes),
  },
  {
    path: 'rfq',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    data: { title: 'RFQ Management' },
  },
  {
    path: 'stock-movements',
    loadChildren: () =>
      import('./features/stock/stock-movements.routes').then((m) => m.stockMovementsRoutes),
  },
  {
    path: 'stock-analysis',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    data: { title: 'Stock Analysis' },
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    data: { title: 'Category Management' },
  },
  {
    path: 'supplier-portal',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    data: { title: 'Supplier Portal' },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    data: { title: 'Settings' },
  },
  {
    path: 'audit-trail',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    data: { title: 'Audit Trail' },
  },
  // Auth routes - temporary for testing
  {
    path: 'test-auth',
    loadComponent: () =>
      import('./features/auth/test-auth/test-auth.component').then((m) => m.TestAuthComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  // Debug route for accessing logs
  {
    path: 'debug-logs',
    loadComponent: () =>
      import('./features/debug/debug-logs.component').then((m) => m.DebugLogsComponent),
  },
  // Sentry test route
  {
    path: 'debug/sentry-test',
    loadComponent: () =>
      import('./features/debug/sentry-test.component').then((m) => m.SentryTestComponent),
  },
];
