import { Routes } from '@angular/router';

export const auditTrailRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/audit-trail-page/audit-trail-page.component').then(
        (m) => m.AuditTrailPageComponent,
      ),
    data: { title: 'Audit Trail' },
  },
];
