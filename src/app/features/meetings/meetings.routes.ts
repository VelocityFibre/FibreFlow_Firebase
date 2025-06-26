import { Routes } from '@angular/router';

export const meetingsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/meetings-simple/meetings-simple.component').then((m) => m.MeetingsSimpleComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/meeting-detail-simple/meeting-detail-simple.component').then(
        (m) => m.MeetingDetailSimpleComponent,
      ),
  },
];
