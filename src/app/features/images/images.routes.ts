import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const imagesRoutes: Routes = [
  {
    path: '',
    redirectTo: 'upload',
    pathMatch: 'full'
  },
  {
    path: 'upload',
    loadComponent: () => 
      import('./components/bulk-image-upload/bulk-image-upload.component')
        .then(m => m.BulkImageUploadComponent),
    canActivate: [authGuard],
    data: { 
      title: 'Bulk Image Upload',
      description: 'Upload pole photos with GPS metadata for processing'
    }
  }
];