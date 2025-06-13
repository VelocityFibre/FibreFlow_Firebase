import { Routes } from '@angular/router';

export const suppliersRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/supplier-list/supplier-list.component').then(m => m.SupplierListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./components/supplier-form/supplier-form.component').then(m => m.SupplierFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./components/supplier-detail/supplier-detail.component').then(m => m.SupplierDetailComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./components/supplier-form/supplier-form.component').then(m => m.SupplierFormComponent)
  },
  {
    path: ':id/contacts',
    loadComponent: () => import('./components/supplier-contacts/supplier-contacts.component').then(m => m.SupplierContactsComponent)
  }
];