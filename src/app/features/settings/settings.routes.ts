import { Routes } from '@angular/router';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';
import { CompanySettingsComponent } from './components/company-settings/company-settings.component';
import { EmailTemplatesComponent } from './components/email-templates/email-templates.component';

export const settingsRoutes: Routes = [
  {
    path: '',
    component: SettingsPageComponent,
    children: [
      {
        path: '',
        redirectTo: 'company',
        pathMatch: 'full',
      },
      {
        path: 'company',
        component: CompanySettingsComponent,
        title: 'Company Settings - FibreFlow',
      },
      {
        path: 'email-templates',
        component: EmailTemplatesComponent,
        title: 'Email Templates - FibreFlow',
      },
      {
        path: 'users',
        loadComponent: () =>
          import('../../shared/components/placeholder-page/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: { title: 'User Management' },
      },
      {
        path: 'email',
        loadComponent: () =>
          import('../../shared/components/placeholder-page/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: { title: 'Email Settings' },
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('../../shared/components/placeholder-page/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: { title: 'Notification Settings' },
      },
      {
        path: 'system',
        loadComponent: () =>
          import('../../shared/components/placeholder-page/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: { title: 'System Settings' },
      },
    ],
  },
];
