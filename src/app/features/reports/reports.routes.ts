import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const reportsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/report-generator/report-generator.component').then(
        (m) => m.ReportGeneratorComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'list',
    loadComponent: () =>
      import('./pages/report-list/report-list.component').then((m) => m.ReportListComponent),
    canActivate: [authGuard],
  },
];
