import { Routes } from '@angular/router';

export const meetingsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/meeting-list/meeting-list.component').then((m) => m.MeetingListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/meeting-detail/meeting-detail.component').then(
        (m) => m.MeetingDetailComponent,
      ),
  },
];
