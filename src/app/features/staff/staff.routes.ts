import { Routes } from '@angular/router';
import { ErrorHandler } from '@angular/core';
import { StaffErrorHandler } from './services/staff-error-handler.service';
import { STAFF_MODULE_CONFIG, defaultStaffConfig } from './staff.config';

export const staffRoutes: Routes = [
  {
    path: '',
    providers: [
      // Module-specific error handler
      { provide: ErrorHandler, useClass: StaffErrorHandler },
      // Module configuration
      { provide: STAFF_MODULE_CONFIG, useValue: defaultStaffConfig },
    ],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/staff-list/staff-list.component').then((m) => m.StaffListComponent),
        title: 'Staff Management',
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./components/staff-form/staff-form.component').then((m) => m.StaffFormComponent),
        title: 'Add Staff Member',
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./components/staff-detail/staff-detail.component').then(
            (m) => m.StaffDetailComponent,
          ),
        title: 'Staff Profile',
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./components/staff-form/staff-form.component').then((m) => m.StaffFormComponent),
        title: 'Edit Staff Member',
      },
    ],
  },
];
