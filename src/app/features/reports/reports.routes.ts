import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/reports-dashboard/reports-dashboard.component').then(
            (m) => m.ReportsDashboardComponent,
          ),
        data: { title: 'Reports Dashboard' },
      },
      {
        path: 'generate',
        loadComponent: () =>
          import('./pages/report-generator/report-generator.component').then(
            (m) => m.ReportGeneratorComponent,
          ),
        data: { title: 'Generate Report' },
      },
      {
        path: 'daily/:id',
        loadComponent: () =>
          import('./pages/report-viewer/report-viewer.component').then(
            (m) => m.ReportViewerComponent,
          ),
        data: { title: 'Daily Report', reportType: 'daily' },
      },
      {
        path: 'weekly/:id',
        loadComponent: () =>
          import('./pages/report-viewer/report-viewer.component').then(
            (m) => m.ReportViewerComponent,
          ),
        data: { title: 'Weekly Report', reportType: 'weekly' },
      },
      {
        path: 'monthly/:id',
        loadComponent: () =>
          import('./pages/report-viewer/report-viewer.component').then(
            (m) => m.ReportViewerComponent,
          ),
        data: { title: 'Monthly Report', reportType: 'monthly' },
      },
    ],
  },
];
