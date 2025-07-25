import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const ANALYTICS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  // Temporarily disabled due to TypeScript errors
  // {
  //   path: 'dashboard',
  //   loadComponent: () => import('./pages/analytics-dashboard/analytics-dashboard.component')
  //     .then(m => m.AnalyticsDashboardComponent),
  //   canActivate: [authGuard],
  //   data: { title: 'Analytics Dashboard' }
  // },
  // {
  //   path: 'pole-report/:poleNumber',
  //   loadComponent: () => import('./pages/pole-detail-report/pole-detail-report.component')
  //     .then(m => m.PoleDetailReportComponent),
  //   canActivate: [authGuard],
  //   data: { title: 'Pole Report' }
  // },
  {
    path: 'pole-permissions',
    loadChildren: () =>
      import('./pole-permissions/pole-permissions.routes').then((m) => m.POLE_PERMISSIONS_ROUTES),
  },
];
