import { Routes } from '@angular/router';

export const boqRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/boq-list/boq-list.component').then((m) => m.BOQListComponent),
    title: 'BOQ Management',
  },
];
