import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    take(1),
    map((user) => {
      if (user) {
        console.log('🔓 Auth Guard - User authenticated:', user.email);
        return true;
      } else {
        console.log('🔒 Auth Guard - User not authenticated, redirecting to login');
        // Store the attempted URL for redirecting after login
        const returnUrl = state.url;
        router.navigate(['/login'], { queryParams: { returnUrl } });
        return false;
      }
    }),
  );
};
