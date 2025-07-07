import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

export const poleTrackerRoutes: Routes = [
  // Default route - goes to desktop list view
  {
    path: '',
    loadComponent: () =>
      import('./pages/pole-tracker-list/pole-tracker-list.component').then(
        (m) => m.PoleTrackerListComponent,
      ),
    title: 'Pole Tracker - FibreFlow',
    canActivate: [authGuard],
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/pole-tracker-form/pole-tracker-form.component').then(
        (m) => m.PoleTrackerFormComponent,
      ),
    title: 'New Pole Entry - FibreFlow',
    canActivate: [authGuard],
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/pole-tracker-form/pole-tracker-form.component').then(
        (m) => m.PoleTrackerFormComponent,
      ),
    title: 'Edit Pole Entry - FibreFlow',
    canActivate: [authGuard],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/pole-tracker-detail/pole-tracker-detail.component').then(
        (m) => m.PoleTrackerDetailComponent,
      ),
    title: 'Pole Details - FibreFlow',
    canActivate: [authGuard],
  },

  // Mobile routes
  {
    path: 'mobile',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./mobile/map-view/mobile-map-view.component').then(
            (m) => m.MobileMapViewComponent,
          ),
        title: 'Pole Map - FibreFlow Mobile',
      },
      {
        path: 'capture',
        loadComponent: () =>
          import('./mobile/quick-capture/quick-capture.component').then(
            (m) => m.QuickCaptureComponent,
          ),
        title: 'Quick Capture - FibreFlow Mobile',
      },
      {
        path: 'capture/:plannedPoleId',
        loadComponent: () =>
          import('./mobile/quick-capture/quick-capture.component').then(
            (m) => m.QuickCaptureComponent,
          ),
        title: 'Quick Capture - FibreFlow Mobile',
      },
      {
        path: 'assignments',
        loadComponent: () =>
          import('./mobile/my-assignments/my-assignments.component').then(
            (m) => m.MyAssignmentsComponent,
          ),
        title: 'My Assignments - FibreFlow Mobile',
      },
      {
        path: 'nearby',
        loadComponent: () =>
          import('./mobile/nearby-poles/nearby-poles.component').then(
            (m) => m.NearbyPolesComponent,
          ),
        title: 'Nearby Poles - FibreFlow Mobile',
      },
    ],
  },
  // Shared/Admin routes
  {
    path: 'import',
    loadComponent: () =>
      import('./pages/pole-tracker-list/pole-tracker-list.component').then(
        (m) => m.PoleTrackerListComponent,
      ),
    title: 'Import Poles - FibreFlow',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Admin', 'Project Manager'] },
  },
];
