import { Routes } from '@angular/router';

export const contractorsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/contractors-page/contractors-page.component').then(
        (m) => m.ContractorsPageComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/contractor-detail-page/contractor-detail-page.component').then(
        (m) => m.ContractorDetailPageComponent,
      ),
  },
];
