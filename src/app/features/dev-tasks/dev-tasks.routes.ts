import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const DEV_TASKS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dev-task-management/dev-task-management.component').then(
            (m) => m.DevTaskManagementComponent,
          ),
        data: { title: 'Development Tasks' },
      },
    ],
  },
];