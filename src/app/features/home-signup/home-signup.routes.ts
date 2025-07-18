import { Routes } from '@angular/router';

export const homeSignupRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home-signup-list/home-signup-list.component').then(
        (m) => m.HomeSignupListComponent,
      ),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/home-signup-form/home-signup-form.component').then(
        (m) => m.HomeSignupFormComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/home-signup-detail/home-signup-detail.component').then(
        (m) => m.HomeSignupDetailComponent,
      ),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/home-signup-form/home-signup-form.component').then(
        (m) => m.HomeSignupFormComponent,
      ),
  },
];
