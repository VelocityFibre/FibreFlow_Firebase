import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const sowRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: 'wizard/:projectId',
        loadComponent: () => import('./pages/sow-wizard/sow-wizard.component').then(m => m.SOWWizardComponent),
        data: { 
          title: 'SOW Wizard',
          description: 'Create Scope of Work for project'
        }
      },
      {
        path: 'create',
        loadComponent: () => import('./pages/sow-create/sow-create.component').then(m => m.SOWCreateComponent),
        data: { 
          title: 'Create SOW',
          description: 'Import Excel data for Scope of Work'
        }
      },
      {
        path: '',
        redirectTo: '/projects',
        pathMatch: 'full'
      }
    ]
  }
];