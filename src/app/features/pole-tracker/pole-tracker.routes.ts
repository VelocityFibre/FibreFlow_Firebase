import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

export const poleTrackerRoutes: Routes = [
  // Default route - goes to list view (reliable)
  {
    path: '',
    loadComponent: () =>
      import('./pages/pole-tracker-list/pole-tracker-list.component').then(
        (m) => m.PoleTrackerListComponent,
      ),
    title: 'Pole Tracker - FibreFlow',
    canActivate: [authGuard],
  },

  // List view route
  {
    path: 'list',
    loadComponent: () =>
      import('./pages/pole-tracker-list/pole-tracker-list.component').then(
        (m) => m.PoleTrackerListComponent,
      ),
    title: 'Pole Tracker List - FibreFlow',
    canActivate: [authGuard],
  },

  // Grid view route
  {
    path: 'grid',
    loadComponent: () =>
      import('./pages/pole-tracker-grid/pole-tracker-grid.component').then(
        (m) => m.PoleTrackerGridComponent,
      ),
    title: 'Pole Tracker Grid - FibreFlow',
    canActivate: [authGuard],
  },

  // Mobile routes - MUST come before :id routes
  {
    path: 'mobile',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./mobile/pole-list-mobile/pole-list-mobile.component').then(
            (m) => m.PoleListMobileComponent,
          ),
        title: 'Pole Tracker Mobile - FibreFlow',
      },
      {
        path: 'map',
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

  // Static routes
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

  // Dynamic routes - MUST come last
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/pole-tracker-detail/pole-tracker-detail.component').then(
        (m) => m.PoleTrackerDetailComponent,
      ),
    title: 'Pole Details - FibreFlow',
    canActivate: [authGuard],
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
