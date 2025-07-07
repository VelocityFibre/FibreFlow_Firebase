import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const DAILY_PROGRESS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/daily-progress-page/daily-progress-page.component').then(
            (m) => m.DailyProgressPageComponent,
          ),
        data: { title: 'Daily Progress' },
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./pages/daily-progress-page/daily-progress-page.component').then(
            (m) => m.DailyProgressPageComponent,
          ),
        data: { title: 'New Progress Report' },
      },
      // {
      //   path: 'kpis',
      //   loadComponent: () =>
      //     import('./components/daily-kpis-form/daily-kpis-form.component').then(
      //       (m) => m.DailyKpisFormComponent,
      //     ),
      //   data: { title: 'Daily KPIs' },
      // },
      {
        path: 'kpis-enhanced',
        loadComponent: () =>
          import('./components/daily-kpis-enhanced-form/daily-kpis-enhanced-form.component').then(
            (m) => m.DailyKpisEnhancedFormComponent,
          ),
        data: { title: 'Enhanced Daily KPIs' },
      },
      {
        path: 'kpis-test',
        loadComponent: () =>
          import('./components/test-kpis.component').then((m) => m.TestKpisComponent),
        data: { title: 'Daily KPIs Test' },
      },
      {
        path: 'kpis-summary',
        loadComponent: () =>
          import('./components/daily-kpis-summary/daily-kpis-summary.component').then(
            (m) => m.DailyKpisSummaryComponent,
          ),
        data: { title: 'Daily KPIs Summary' },
      },
      {
        path: 'test-display',
        loadComponent: () =>
          import('./components/test-kpis-display.component').then(
            (m) => m.TestKpisDisplayComponent,
          ),
        data: { title: 'Test KPIs Display' },
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./pages/daily-progress-page/daily-progress-page.component').then(
            (m) => m.DailyProgressPageComponent,
          ),
        data: { title: 'Progress Report Details' },
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./pages/daily-progress-page/daily-progress-page.component').then(
            (m) => m.DailyProgressPageComponent,
          ),
        data: { title: 'Edit Progress Report' },
      },
    ],
  },
];
