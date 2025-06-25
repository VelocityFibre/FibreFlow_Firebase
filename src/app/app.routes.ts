import { Routes } from '@angular/router';
import { demoConfig } from './config/demo.config';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

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
    title: 'All Steps - FibreFlow',
  },
  {
    path: 'pole-tracker',
    loadChildren: () => import('./features/pole-tracker/pole-tracker.routes').then((m) => m.poleTrackerRoutes),
    data: { preload: true },
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
    data: { title: 'Task Management Test' },
  },
  {
    path: 'task-management',
    loadComponent: () => {
      console.log('FibreFlow: Loading TaskManagementComponent...');
      return import('./features/tasks/pages/task-management/task-management.component').then(
        (m) => {
          console.log('FibreFlow: TaskManagementComponent module loaded:', m);
          return m.TaskManagementComponent;
        },
      ).catch((error) => {
        console.error('FibreFlow: Error loading TaskManagementComponent:', error);
        throw error;
      });
    },
    canActivate: [() => {
      console.log('FibreFlow: Checking access to /task-management route');
      const router = inject(Router);
      console.log('FibreFlow: Current URL:', router.url);
      return true;
    }],
    data: { title: 'Task Management' },
  },
  {
    path: 'personal-todos',
    loadComponent: () =>
      import('./features/personal-todos/pages/todo-management/todo-management.component').then(
        (m) => m.TodoManagementComponent
      ),
    data: { title: 'Personal Todos' },
  },
  {
    path: 'meetings',
    loadChildren: () =>
      import('./features/meetings/meetings.routes').then((m) => m.meetingsRoutes),
    data: { title: 'Meetings' },
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
    path: 'quotes',
    loadChildren: () => import('./features/quotes/quotes.routes').then((m) => m.quotesRoutes),
    data: { title: 'Quotes Management' },
  },
  {
    path: 'emails',
    loadChildren: () => import('./features/emails/emails.routes').then((m) => m.emailsRoutes),
    data: { title: 'Email Management' },
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
    loadChildren: () => import('./features/settings/settings.routes').then((m) => m.settingsRoutes),
    data: { title: 'Settings' },
  },
  {
    path: 'audit-trail',
    loadChildren: () =>
      import('./features/audit-trail/audit-trail.routes').then((m) => m.auditTrailRoutes),
    data: { title: 'Audit Trail' },
  },
  {
    path: 'reports',
    loadChildren: () =>
      import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
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
  },
  // Sentry test route
  {
    path: 'debug/sentry-test',
    loadComponent: () =>
      import('./features/debug/sentry-test.component').then((m) => m.SentryTestComponent),
  },
];

// Filter routes based on demo configuration
export const routes: Routes = demoConfig.isDemo 
  ? allRoutes.filter(route => !demoConfig.hiddenRoutes.includes('/' + route.path))
  : allRoutes;
