import { Routes } from '@angular/router';
import { demoConfig } from './config/demo.config';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

const allRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.dashboardRoutes),
    canActivate: [authGuard],
    data: { preload: true },
  },
  {
    path: 'projects',
    loadChildren: () => import('./features/projects/projects.routes').then((m) => m.projectRoutes),
    canActivate: [authGuard],
    data: { preload: true },
  },
  {
    path: 'suppliers',
    loadChildren: () =>
      import('./features/suppliers/suppliers.routes').then((m) => m.suppliersRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'staff',
    loadChildren: () => import('./features/staff/staff.routes').then((m) => m.staffRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'contractors',
    loadChildren: () =>
      import('./features/contractors/contractors.routes').then((m) => m.contractorsRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'clients',
    loadChildren: () => import('./features/clients/clients.routes').then((m) => m.clientsRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'phases',
    loadChildren: () => import('./features/phases/phases.routes').then((m) => m.phasesRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'steps',
    loadChildren: () => import('./features/steps/steps.routes').then((m) => m.STEPS_ROUTES),
    canActivate: [authGuard],
    title: 'All Steps - FibreFlow',
  },
  {
    path: 'pole-tracker',
    loadChildren: () =>
      import('./features/pole-tracker/pole-tracker.routes').then((m) => m.poleTrackerRoutes),
    canActivate: [authGuard],
    data: { preload: true },
  },
  // Dashboard-linked routes
  {
    path: 'materials',
    loadChildren: () =>
      import('./features/materials/materials.routes').then((m) => m.materialRoutes),
    canActivate: [authGuard],
    data: { preload: true },
  },
  {
    path: 'issues',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    canActivate: [authGuard],
    data: { title: 'Flagged Issues' },
  },
  {
    path: 'analytics',
    loadChildren: () =>
      import('./features/analytics/analytics.routes').then((m) => m.ANALYTICS_ROUTES),
    canActivate: [authGuard],
    data: { title: 'Analytics', preload: true },
  },
  {
    path: 'daily-progress',
    loadChildren: () =>
      import('./features/daily-progress/daily-progress.routes').then(
        (m) => m.DAILY_PROGRESS_ROUTES,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'dev-tasks',
    loadChildren: () =>
      import('./features/dev-tasks/dev-tasks.routes').then((m) => m.DEV_TASKS_ROUTES),
    canActivate: [authGuard],
    data: { title: 'Development Tasks' },
  },
  // Placeholder routes for pages to be implemented
  {
    path: 'roles',
    loadChildren: () => import('./features/roles/roles.routes').then((m) => m.ROLES_ROUTES),
    canActivate: [authGuard],
  },
  {
    path: 'attendance',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    canActivate: [authGuard],
    data: { title: 'Attendance' },
  },
  {
    path: 'performance',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    canActivate: [authGuard],
    data: { title: 'Performance' },
  },
  {
    path: 'task-management-test',
    loadComponent: () => {
      console.log('FibreFlow: Loading TaskManagementTestComponent...');
      return import('./features/tasks/pages/task-management/task-management-test.component').then(
        (m) => {
          console.log('FibreFlow: TaskManagementTestComponent module loaded:', m);
          return m.TaskManagementTestComponent;
        },
      );
    },
    canActivate: [authGuard],
    data: { title: 'Task Management Test' },
  },
  {
    path: 'task-management',
    loadComponent: () => {
      console.log('FibreFlow: Loading TaskManagementComponent...');
      return import('./features/tasks/pages/task-management/task-management.component')
        .then((m) => {
          console.log('FibreFlow: TaskManagementComponent module loaded:', m);
          return m.TaskManagementComponent;
        })
        .catch((error) => {
          console.error('FibreFlow: Error loading TaskManagementComponent:', error);
          throw error;
        });
    },
    canActivate: [
      authGuard,
      () => {
        console.log('FibreFlow: Checking access to /task-management route');
        const router = inject(Router);
        console.log('FibreFlow: Current URL:', router.url);
        return true;
      },
    ],
    data: { title: 'Task Management' },
  },
  {
    path: 'personal-todos',
    loadComponent: () =>
      import('./features/personal-todos/pages/todo-management/todo-management.component').then(
        (m) => m.TodoManagementComponent,
      ),
    canActivate: [authGuard],
    data: { title: 'Personal Todos' },
  },
  {
    path: 'meetings',
    loadChildren: () => import('./features/meetings/meetings.routes').then((m) => m.meetingsRoutes),
    canActivate: [authGuard],
    data: { title: 'Meetings' },
  },
  {
    path: 'action-items',
    loadChildren: () =>
      import('./features/action-items/action-items.routes').then((m) => m.ACTION_ITEMS_ROUTES),
    canActivate: [authGuard],
    data: { title: 'Action Items Management' },
  },
  {
    path: 'tasks',
    loadChildren: () => import('./features/tasks/tasks.routes').then((m) => m.tasksRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'task-grid',
    loadComponent: () =>
      import('./features/tasks/pages/task-management-grid/task-management-grid.component').then(
        (m) => m.TaskManagementGridComponent,
      ),
    canActivate: [authGuard],
    data: { title: 'Task Management Grid' },
  },
  {
    path: 'stock',
    loadChildren: () => import('./features/stock/stock.routes').then((m) => m.stockRoutes),
    canActivate: [authGuard],
    data: { preload: true },
  },
  {
    path: 'boq',
    loadChildren: () => import('./features/boq/boq.routes').then((m) => m.boqRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'quotes',
    loadChildren: () => import('./features/quotes/quotes.routes').then((m) => m.quotesRoutes),
    canActivate: [authGuard],
    data: { title: 'Quotes Management' },
  },
  {
    path: 'emails',
    loadChildren: () => import('./features/emails/emails.routes').then((m) => m.emailsRoutes),
    canActivate: [authGuard],
    data: { title: 'Email Management' },
  },
  {
    path: 'stock-movements',
    loadChildren: () =>
      import('./features/stock/stock-movements.routes').then((m) => m.stockMovementsRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'stock-analysis',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    canActivate: [authGuard],
    data: { title: 'Stock Analysis' },
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    canActivate: [authGuard],
    data: { title: 'Category Management' },
  },
  {
    path: 'supplier-portal',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    canActivate: [authGuard],
    data: { title: 'Supplier Portal' },
  },
  {
    path: 'settings',
    loadChildren: () => import('./features/settings/settings.routes').then((m) => m.settingsRoutes),
    canActivate: [authGuard],
    data: { title: 'Settings' },
  },
  {
    path: 'audit-trail',
    loadChildren: () =>
      import('./features/audit-trail/audit-trail.routes').then((m) => m.auditTrailRoutes),
    canActivate: [authGuard],
    data: { title: 'Audit Trail' },
  },
  {
    path: 'images',
    loadChildren: () => import('./features/images/images.routes').then((m) => m.imagesRoutes),
    canActivate: [authGuard],
    data: { title: 'Image Upload', preload: true },
  },
  {
    path: 'reports',
    loadChildren: () => import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
    canActivate: [authGuard],
    data: { title: 'Reports', preload: true },
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
    canActivate: [authGuard],
  },
  // Sentry test route
  {
    path: 'debug/sentry-test',
    loadComponent: () =>
      import('./features/debug/sentry-test.component').then((m) => m.SentryTestComponent),
    canActivate: [authGuard],
  },
];

// Filter routes based on demo configuration
export const routes: Routes = demoConfig.isDemo
  ? allRoutes.filter((route) => !demoConfig.hiddenRoutes.includes('/' + route.path))
  : allRoutes;
