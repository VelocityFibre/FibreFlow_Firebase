import { Routes } from '@angular/router';

export const quotesRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'rfq',
        loadComponent: () =>
          import('./pages/rfq-page/rfq-page.component').then((m) => m.RFQPageComponent),
      },
      {
        path: 'rfq/:id',
        loadComponent: () =>
          import('./pages/rfq-detail-page/rfq-detail-page.component').then(
            (m) => m.RFQDetailPageComponent,
          ),
      },
      {
        path: 'test-email',
        loadComponent: () =>
          import('./components/test-email/test-email.component').then((m) => m.TestEmailComponent),
      },
      {
        path: '',
        redirectTo: 'rfq',
        pathMatch: 'full',
      },
    ],
  },
];
