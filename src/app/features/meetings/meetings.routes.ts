import { Routes } from '@angular/router';

export const meetingsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./meetings.component').then((m) => m.MeetingsComponent),
  },
];