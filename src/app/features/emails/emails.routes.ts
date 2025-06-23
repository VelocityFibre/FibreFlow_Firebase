import { Routes } from '@angular/router';

export const emailsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'history',
        loadComponent: () =>
          import('./components/email-history/email-history.component').then(
            (m) => m.EmailHistoryComponent
          ),
      },
      {
        path: '',
        redirectTo: 'history',
        pathMatch: 'full',
      },
    ],
  },
];