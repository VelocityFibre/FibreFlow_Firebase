import { Routes } from '@angular/router';
import { authGuard } from '@app/core/guards/auth.guard';

export const POLE_PLANTING_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'verification',
    pathMatch: 'full'
  },
  {
    path: 'verification',
    loadComponent: () => 
      import('./pages/pole-planting-verification/pole-planting-verification.component')
        .then(c => c.PolePlantingVerificationComponent),
    canActivate: [authGuard],
    data: { 
      title: 'Pole Planting Verification',
      adminOnly: true 
    }
  }
];
