import { Routes } from '@angular/router';

export const STEPS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/all-steps-page/all-steps-page.component').then(
        (m) => m.AllStepsPageComponent,
      ),
    title: 'All Steps - FibreFlow',
  },
];
