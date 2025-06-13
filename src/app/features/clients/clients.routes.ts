import { Routes } from '@angular/router';

export const clientsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/client-list/client-list.component').then(
            (m) => m.ClientListComponent,
          ),
        title: 'Clients',
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./components/client-form/client-form.component').then(
            (m) => m.ClientFormComponent,
          ),
        title: 'Add Client',
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./components/client-detail/client-detail.component').then(
            (m) => m.ClientDetailComponent,
          ),
        title: 'Client Details',
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./components/client-form/client-form.component').then(
            (m) => m.ClientFormComponent,
          ),
        title: 'Edit Client',
      },
    ],
  },
];
