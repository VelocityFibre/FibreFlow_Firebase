import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { nonFieldWorkerGuard } from '../../core/guards/field-worker.guard';

export const onemapRoutes: Routes = [
  {
    path: 'pages/data-grid',
    loadComponent: () =>
      import('./pages/data-grid/onemap-data-grid.component').then(
        (m) => m.OneMapDataGridComponent,
      ),
    canActivate: [authGuard, nonFieldWorkerGuard],
    data: { title: 'OneMap Data Grid' },
  },
];