import { Routes } from '@angular/router';

export const nokiaRoutes: Routes = [
  {
    path: '',
    redirectTo: 'data',
    pathMatch: 'full'
  },
  {
    path: 'data',
    loadComponent: () => 
      import('./pages/nokia-grid/nokia-grid.component').then(m => m.NokiaGridComponent),
    data: { 
      title: 'Nokia Equipment Data',
      description: 'Nokia network equipment monitoring and signal quality tracking'
    }
  }
];