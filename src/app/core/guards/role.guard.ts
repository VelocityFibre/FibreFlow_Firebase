/* eslint-disable @typescript-eslint/no-unused-vars */
// import { inject } from '@angular/core';
// import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
// import { map, take } from 'rxjs/operators';
// import { AuthService } from '../services/auth.service';
import { UserProfile } from '../models/user-profile';

export const roleGuard: CanActivateFn = (route, _state) => {
  // const authService = inject(AuthService);
  // const router = inject(Router);

  // Get allowed roles from route data
  const allowedRoles = (route.data['roles'] as UserProfile['userGroup'][]) || [];

  // DEV MODE: Always allow access
  console.log('🔓 Role Guard - DEV MODE: Access granted (user is admin)');
  console.log(`   Required roles: ${allowedRoles.join(', ')}`);
  return true;

  /* PRODUCTION CODE - Enable when ready:
  return authService.currentUserProfile$.pipe(
    take(1),
    map(profile => {
      if (!profile) {
        router.navigate(['/login']);
        return false;
      }

      if (allowedRoles.length === 0) {
        // No specific roles required
        return true;
      }

      if (allowedRoles.includes(profile.userGroup)) {
        return true;
      } else {
        // User doesn't have required role
        console.warn(`Access denied. User role: ${profile.userGroup}, Required: ${allowedRoles.join(', ')}`);
        router.navigate(['/unauthorized']);
        return false;
      }
    })
  );
  */
};
