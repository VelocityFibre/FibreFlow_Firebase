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
