/* eslint-disable @typescript-eslint/no-unused-vars */
// import { inject } from '@angular/core';
// import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
// import { map, take } from 'rxjs/operators';
// import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, _state) => {
  // const authService = inject(AuthService);
  // const router = inject(Router);

  // DEV MODE: Always allow access
  console.log('🔓 Auth Guard - DEV MODE: Access granted (always logged in)');
  return true;

  /* PRODUCTION CODE - Enable when ready:
  return authService.user$.pipe(
    take(1),
    map(user => {
      if (user) {
        return true;
      } else {
        // Store the attempted URL for redirecting after login
        const returnUrl = state.url;
        router.navigate(['/login'], { queryParams: { returnUrl } });
        return false;
      }
    })
  );
  */
};
