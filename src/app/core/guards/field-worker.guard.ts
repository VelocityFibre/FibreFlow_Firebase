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
 * Offline Pole Capture Guard - Allows both technicians and admins
 * 
 * This guard allows access to the offline-pole-capture page for:
 * - Technicians (field workers) - their primary interface
 * - Admins - for testing and oversight
 */
export const offlinePoleGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const userProfile = authService.getCurrentUserProfile();
  
  if (!userProfile) {
    console.log('🔒 Offline Pole Guard - User not authenticated');
    return router.createUrlTree(['/login'], { 
      queryParams: { returnUrl: '/offline-pole-capture' } 
    });
  }
  
  // Allow technicians and admins
  const allowedRoles = ['technician', 'admin'];
  if (allowedRoles.includes(userProfile.userGroup)) {
    console.log(`✅ Offline Pole Guard - Access granted for ${userProfile.userGroup}`);
    return true;
  }
  
  // Redirect other roles to dashboard
  console.log(`🚫 Offline Pole Guard - Access denied for ${userProfile.userGroup}, redirecting to dashboard`);
  return router.createUrlTree(['/dashboard']);
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
  
  // Special case: Allow admins to access offline-pole-capture for testing
  if (isFieldWorker && !state.url.includes('offline-pole-capture')) {
    console.log('🚫 Field worker trying to access restricted area - redirecting to offline capture');
    return router.createUrlTree(['/offline-pole-capture']);
  }
  
  // Prevent field workers from accessing non-offline routes
  if (isFieldWorker) {
    console.log('🚫 Field worker trying to access restricted area - redirecting to offline capture');
    return router.createUrlTree(['/offline-pole-capture']);
  }
  
  return true;
};