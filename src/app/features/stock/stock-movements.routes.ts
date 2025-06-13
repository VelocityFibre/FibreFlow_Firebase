import { Routes } from '@angular/router';

export const stockMovementsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/stock-movements/stock-movements.component').then(m => m.StockMovementsComponent),
    data: { title: 'Stock Movements' }
  }
];