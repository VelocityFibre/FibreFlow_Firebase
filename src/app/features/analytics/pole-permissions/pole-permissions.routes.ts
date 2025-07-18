import { Routes } from '@angular/router';

export const POLE_PERMISSIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/pole-analytics/pole-analytics.component').then(
        (m) => m.PoleAnalyticsComponent,
      ),
    title: 'Pole Permission Analytics',
  },
  {
    path: 'upload',
    loadComponent: () =>
      import('./components/wizard/pole-analytics-wizard.component').then(
        (m) => m.PoleAnalyticsWizardComponent,
      ),
    title: 'Upload Data - Pole Analytics',
  },
  {
    path: 'process',
    loadComponent: () =>
      import('./components/processing/data-processor.component').then(
        (m) => m.DataProcessorComponent,
      ),
    title: 'Process Data - Pole Analytics',
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./components/reports/report-generator.component').then(
        (m) => m.ReportGeneratorComponent,
      ),
    title: 'Generate Reports - Pole Analytics',
  },
];
