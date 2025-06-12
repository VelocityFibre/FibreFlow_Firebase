import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'projects',
    pathMatch: 'full'
  },
  {
    path: 'projects',
    loadChildren: () => import('./features/projects/projects.routes').then(m => m.projectRoutes)
  },
  {
    path: 'staff',
    loadChildren: () => import('./features/staff/staff.routes').then(m => m.staffRoutes)
  },
  // Auth routes - temporary for testing
  {
    path: 'test-auth',
    loadComponent: () => import('./features/auth/test-auth/test-auth.component').then(m => m.TestAuthComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  }
];
