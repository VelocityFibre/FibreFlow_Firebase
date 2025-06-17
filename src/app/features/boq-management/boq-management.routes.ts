import { Routes } from '@angular/router';

export const boqManagementRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/project-boq-page/project-boq-page.component').then(
        (m) => m.ProjectBOQPageComponent,
      ),
  },
];
