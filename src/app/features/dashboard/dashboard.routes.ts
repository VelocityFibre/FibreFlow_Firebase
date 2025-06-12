import { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/main-dashboard/main-dashboard.component').then(m => m.MainDashboardComponent),
    title: 'Dashboard'
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    title: 'Admin Dashboard',
    // TODO: Add AdminGuard when auth is implemented
    // canActivate: [AdminGuard]
  }
];