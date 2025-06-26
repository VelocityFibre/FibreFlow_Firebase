import { Routes } from '@angular/router';

export const poleTrackerRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/pole-tracker-list/pole-tracker-list.component').then(
        (m) => m.PoleTrackerListComponent,
      ),
    title: 'Pole Tracker - FibreFlow',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/pole-tracker-form/pole-tracker-form.component').then(
        (m) => m.PoleTrackerFormComponent,
      ),
    title: 'New Pole Entry - FibreFlow',
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/pole-tracker-form/pole-tracker-form.component').then(
        (m) => m.PoleTrackerFormComponent,
      ),
    title: 'Edit Pole Entry - FibreFlow',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/pole-tracker-detail/pole-tracker-detail.component').then(
        (m) => m.PoleTrackerDetailComponent,
      ),
    title: 'Pole Details - FibreFlow',
  },
];
