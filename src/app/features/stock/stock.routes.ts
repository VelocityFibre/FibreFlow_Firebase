import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const stockRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/stock-list/stock-list.component').then((m) => m.StockListComponent),
        title: 'Stock Items',
      },
      {
        path: 'movements',
        loadComponent: () =>
          import('./components/stock-movements/stock-movements.component').then(
            (m) => m.StockMovementsComponent,
          ),
        title: 'Stock Movements',
      },
      {
        path: 'allocations',
        loadComponent: () =>
          import('../../shared/components/placeholder-page/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: { title: 'Stock Allocations' },
      },
      // {
      //   path: ':id',
      //   loadComponent: () => import('./components/stock-detail/stock-detail.component').then(m => m.StockDetailComponent),
      //   title: 'Stock Item Details'
      // }
    ],
  },
];
