import { Routes } from '@angular/router';

export const materialRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/material-list/material-list.component').then(
        (m) => m.MaterialListComponent,
      ),
    title: 'Master Materials',
  },
];
