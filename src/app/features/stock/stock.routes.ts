import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const stockRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/stock-list/stock-list.component').then(m => m.StockListComponent),
        title: 'Stock Items'
      },
      {
        path: 'movements',
        loadComponent: () => import('./components/stock-movements/stock-movements.component').then(m => m.StockMovementsComponent),
        title: 'Stock Movements'
      },
      // {
      //   path: 'allocations',
      //   loadComponent: () => import('./components/stock-allocations/stock-allocations.component').then(m => m.StockAllocationsComponent),
      //   title: 'Stock Allocations'
      // },
      // {
      //   path: ':id',
      //   loadComponent: () => import('./components/stock-detail/stock-detail.component').then(m => m.StockDetailComponent),
      //   title: 'Stock Item Details'
      // }
    ]
  }
];