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
];
