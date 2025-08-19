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
    path: 'grid',
    loadComponent: () =>
      import('./pages/contractor-grid/contractor-grid.component').then(
        (m) => m.ContractorGridComponent,
      ),
  },
  {
    path: ':contractorId/projects/:projectId',
    loadComponent: () =>
      import(
        './pages/contractor-project-detail-page/contractor-project-detail-page.component'
      ).then((m) => m.ContractorProjectDetailPageComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/contractor-detail-page/contractor-detail-page.component').then(
        (m) => m.ContractorDetailPageComponent,
      ),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./components/contractor-form/contractor-form.component').then(
        (m) => m.ContractorFormComponent,
      ),
  },
];
