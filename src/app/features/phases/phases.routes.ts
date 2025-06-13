import { Routes } from '@angular/router';

export const phasesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/phases-page/phases-page.component').then(m => m.PhasesPageComponent)
  }
];