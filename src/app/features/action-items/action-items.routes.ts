import { Routes } from '@angular/router';

export const ACTION_ITEMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => 
      import('./pages/action-items-grid/action-items-grid.component').then(
        m => m.ActionItemsGridComponent
      ),
    data: { title: 'Action Items Management' }
  },
  {
    path: 'list',
    loadComponent: () => 
      import('./pages/action-items-list/action-items-list.component').then(
        m => m.ActionItemsListComponent
      ),
    data: { title: 'Action Items List View' }
  }
];