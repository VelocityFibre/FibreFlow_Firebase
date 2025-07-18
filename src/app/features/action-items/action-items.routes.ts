import { Routes } from '@angular/router';

export const ACTION_ITEMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => 
      import('./pages/action-items-list/action-items-list.component').then(
        m => m.ActionItemsListComponent
      ),
    data: { title: 'Action Items Management' }
  }
];