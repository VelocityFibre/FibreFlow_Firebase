import { Routes } from '@angular/router';
import { demoConfig } from './config/demo.config';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { fieldWorkerGuard, nonFieldWorkerGuard } from './core/guards/field-worker.guard';

const allRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
    canActivate: [fieldWorkerGuard],
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.dashboardRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { preload: true },
  },
  {
    path: 'projects',
    loadChildren: () => import('./features/projects/projects.routes').then((m) => m.projectRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { preload: true },
  },
  {
    path: 'sow-data',
    loadComponent: () =>
      import('./features/sow/pages/sow-grid/sow-grid.component').then(
        (m) => m.SOWGridComponent,
      ),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'SOW Data Management' },
  },
  {
    path: 'suppliers',
    loadChildren: () =>
      import('./features/suppliers/suppliers.routes').then((m) => m.suppliersRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
  },
  {
    path: 'staff',
    loadChildren: () => import('./features/staff/staff.routes').then((m) => m.staffRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
  },
  {
    path: 'contractors',
    loadChildren: () =>
      import('./features/contractors/contractors.routes').then((m) => m.contractorsRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
  },
  {
    path: 'clients',
    loadChildren: () => import('./features/clients/clients.routes').then((m) => m.clientsRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
  },
  {
    path: 'phases',
    loadChildren: () => import('./features/phases/phases.routes').then((m) => m.phasesRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
  },
  {
    path: 'steps',
    loadChildren: () => import('./features/steps/steps.routes').then((m) => m.STEPS_ROUTES),
    canActivate: [authGuard, nonFieldWorkerGuard],
    title: 'All Steps - FibreFlow',
  },
  {
    path: 'pole-tracker',
    loadChildren: () =>
      import('./features/pole-tracker/pole-tracker.routes').then((m) => m.poleTrackerRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { preload: true },
  },
  // Dashboard-linked routes
  {
    path: 'materials',
    loadChildren: () =>
      import('./features/materials/materials.routes').then((m) => m.materialRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { preload: true },
  },
  {
    path: 'issues',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Flagged Issues' },
  },
  {
    path: 'analytics',
    loadChildren: () =>
      import('./features/analytics/analytics.routes').then((m) => m.ANALYTICS_ROUTES),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Analytics', preload: true },
  },
  {
    path: 'daily-progress',
    loadChildren: () =>
      import('./features/daily-progress/daily-progress.routes').then(
        (m) => m.DAILY_PROGRESS_ROUTES,
      ),
    canActivate: [authGuard, nonFieldWorkerGuard],
  },
  {
    path: 'dev-tasks',
    loadChildren: () =>
      import('./features/dev-tasks/dev-tasks.routes').then((m) => m.DEV_TASKS_ROUTES),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Development Tasks' },
  },
  // Placeholder routes for pages to be implemented
  {
    path: 'roles',
    loadChildren: () => import('./features/roles/roles.routes').then((m) => m.ROLES_ROUTES),
    canActivate: [authGuard, nonFieldWorkerGuard],
  },
  {
    path: 'attendance',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Attendance' },
  },
  {
    path: 'performance',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    canActivate: [authGuard, nonFieldWorkerGuard],
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
    canActivate: [authGuard, nonFieldWorkerGuard],
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
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Personal Todos' },
  },
  {
    path: 'meetings',
    loadChildren: () => import('./features/meetings/meetings.routes').then((m) => m.meetingsRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Meetings' },
  },
  {
    path: 'action-items',
    loadChildren: () =>
      import('./features/action-items/action-items.routes').then((m) => m.ACTION_ITEMS_ROUTES),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Action Items Management' },
  },
  {
    path: 'tasks',
    loadChildren: () => import('./features/tasks/tasks.routes').then((m) => m.tasksRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
  },
  {
    path: 'task-grid',
    loadComponent: () =>
      import('./features/tasks/pages/task-management-grid/task-management-grid.component').then(
        (m) => m.TaskManagementGridComponent,
      ),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Task Management Grid' },
  },
  {
    path: 'stock',
    loadChildren: () => import('./features/stock/stock.routes').then((m) => m.stockRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { preload: true },
  },
  {
    path: 'boq',
    loadChildren: () => import('./features/boq/boq.routes').then((m) => m.boqRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
  },
  {
    path: 'quotes',
    loadChildren: () => import('./features/quotes/quotes.routes').then((m) => m.quotesRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Quotes Management' },
  },
  {
    path: 'emails',
    loadChildren: () => import('./features/emails/emails.routes').then((m) => m.emailsRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Email Management' },
  },
  {
    path: 'stock-movements',
    loadChildren: () =>
      import('./features/stock/stock-movements.routes').then((m) => m.stockMovementsRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
  },
  {
    path: 'stock-analysis',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Stock Analysis' },
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Category Management' },
  },
  {
    path: 'supplier-portal',
    loadComponent: () =>
      import('./shared/components/placeholder-page/placeholder-page.component').then(
        (m) => m.PlaceholderPageComponent,
      ),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Supplier Portal' },
  },
  {
    path: 'settings',
    loadChildren: () => import('./features/settings/settings.routes').then((m) => m.settingsRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Settings' },
  },
  {
    path: 'audit-trail',
    loadChildren: () =>
      import('./features/audit-trail/audit-trail.routes').then((m) => m.auditTrailRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Audit Trail' },
  },
  {
    path: 'images',
    loadChildren: () => import('./features/images/images.routes').then((m) => m.imagesRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Image Upload', preload: true },
  },
  {
    path: 'reports',
    loadChildren: () => import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Reports', preload: true },
  },
  {
    path: 'sow',
    loadChildren: () => import('./features/sow/sow.routes').then(m => m.sowRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: {
      title: 'Scope of Work',
      description: 'Create and manage project SOW documents'
    }
  },
  {
    path: 'onemap',
    loadChildren: () => import('./features/onemap/onemap.routes').then(m => m.onemapRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: {
      title: 'OneMap Data',
      description: 'OneMap data analysis and grid views'
    }
  },
  {
    path: 'nokia-data',
    loadComponent: () =>
      import('./features/nokia/pages/nokia-grid/nokia-grid.component').then(
        (m) => m.NokiaGridComponent,
      ),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'Nokia Equipment Data' },
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
  {
    path: 'field-worker-login',
    loadComponent: () =>
      import('./features/auth/field-worker-login/field-worker-login.component').then((m) => m.FieldWorkerLoginComponent),
  },
  // Debug route for accessing logs
  {
    path: 'debug-logs',
    loadComponent: () =>
      import('./features/debug/debug-logs.component').then((m) => m.DebugLogsComponent),
    canActivate: [authGuard, nonFieldWorkerGuard],
  },
  // Sentry test route
  {
    path: 'debug/sentry-test',
    loadComponent: () =>
      import('./features/debug/sentry-test.component').then((m) => m.SentryTestComponent),
    canActivate: [authGuard, nonFieldWorkerGuard],
  },
  // ✅ ACTIVE: Argon AI Assistant Dashboard (connected to real Neon data)
  {
    path: 'argon',
    loadComponent: () => import('../../agents/argon/components/argon-dashboard.component')
      .then(m => m.ArgonDashboardComponent),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { 
      title: 'Argon AI Assistant',
      description: 'AI coding assistant with multi-database analytics'
    }
  },
  // ✅ DIRECT: Offline Pole Capture (workaround for nested route issues)
  {
    path: 'offline-pole-capture',
    loadComponent: () => 
      import('./features/pole-tracker/mobile/pages/offline-capture/offline-capture.component')
        .then(m => m.OfflineCaptureComponent),
    canActivate: [authGuard],
    data: { 
      title: 'Offline Pole Capture',
      description: 'Capture pole data offline with GPS and photos',
      restrictedToFieldWorkers: true
    }
  },
  // ✅ NEW: Pole Planting Verification (Admin approval of field captures)
  {
    path: 'pole-planting',
    loadChildren: () => 
      import('./features/pole-planting/pole-planting.routes')
        .then(m => m.POLE_PLANTING_ROUTES),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { 
      title: 'Pole Planting Verification',
      description: 'Verify and approve field-captured pole data',
      adminOnly: true
    }
  },
  // ✅ ACTIVE: Neon AI Agent (AI-powered database assistant)
  {
    path: 'neon-agent',
    loadChildren: () => 
      import('./features/neon-agent/neon-agent.routes')
        .then(m => m.neonAgentRoutes),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { 
      title: 'Neon AI Agent',
      description: 'AI-powered database assistant for Neon PostgreSQL'
    }
  },
];

// Filter routes based on demo configuration
export const routes: Routes = demoConfig.isDemo
  ? allRoutes.filter((route) => !demoConfig.hiddenRoutes.includes('/' + route.path))
  : allRoutes;
