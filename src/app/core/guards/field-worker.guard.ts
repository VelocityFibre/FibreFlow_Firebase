import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Field Worker Guard - Restricts field workers (technicians) to offline-pole-capture only
 * 
 * This guard ensures that users with the 'technician' role can ONLY access
 * the offline-pole-capture page and cannot navigate to any other part of the app.
 */
export const fieldWorkerGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const userProfile = authService.getCurrentUserProfile();
  
  if (!userProfile) {
    console.log('🔒 Field Worker Guard - User not authenticated');
    return router.createUrlTree(['/login'], { 
      queryParams: { returnUrl: '/offline-pole-capture' } 
    });
  }
  
  // Check if user has technician role (field worker)
  const isFieldWorker = userProfile.userGroup === 'technician';
  
  // If field worker trying to access anything other than offline-pole-capture
  if (isFieldWorker && !state.url.includes('offline-pole-capture')) {
    console.log('🚫 Field Worker Guard - Redirecting to offline capture');
    return router.createUrlTree(['/offline-pole-capture']);
  }
  
  return true;
};

/**
 * Non-Field Worker Guard - Prevents non-field workers from accessing restricted pages
 * 
 * This guard can be used to protect pages that should only be accessible by
 * admin, project managers, etc. and not by field workers.
 */
export const nonFieldWorkerGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const userProfile = authService.getCurrentUserProfile();
  
  if (!userProfile) {
    console.log('🔒 Non-Field Worker Guard - User not authenticated');
    return router.createUrlTree(['/login']);
  }
  
  // Check if user has technician role (field worker)
  const isFieldWorker = userProfile.userGroup === 'technician';
  
  // Prevent field workers from accessing this route
  if (isFieldWorker) {
    console.log('🚫 Field worker trying to access restricted area - redirecting to offline capture');
    return router.createUrlTree(['/offline-pole-capture']);
  }
  
  return true;
};