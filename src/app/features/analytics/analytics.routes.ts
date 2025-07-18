import { Routes } from '@angular/router';

export const ANALYTICS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'pole-permissions',
    pathMatch: 'full',
  },
  {
    path: 'pole-permissions',
    loadChildren: () =>
      import('./pole-permissions/pole-permissions.routes').then((m) => m.POLE_PERMISSIONS_ROUTES),
  },
];
