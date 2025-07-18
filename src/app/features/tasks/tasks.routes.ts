import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const tasksRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/tasks-page/tasks-page.component').then((m) => m.TasksPageComponent),
    canActivate: [authGuard],
  },
  {
    path: 'my-tasks',
    loadComponent: () => import('./my-tasks/my-tasks.component').then((m) => m.MyTasksComponent),
    canActivate: [authGuard],
  },
  {
    path: 'management',
    loadComponent: () =>
      import('./pages/task-management/task-management.component').then(
        (m) => m.TaskManagementComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'management/grid',
    loadComponent: () =>
      import('./pages/task-management-grid/task-management-grid.component').then(
        (m) => m.TaskManagementGridComponent,
      ),
    canActivate: [authGuard],
  },
];
