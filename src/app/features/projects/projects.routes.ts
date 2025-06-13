import { Routes } from '@angular/router';
import { ProjectListComponent } from './components/project-list/project-list.component';

export const projectRoutes: Routes = [
  {
    path: '',
    component: ProjectListComponent,
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/project-create/project-create.component').then(
        (m) => m.ProjectCreateComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/project-detail/project-detail.component').then(
        (m) => m.ProjectDetailComponent,
      ),
  },
];
