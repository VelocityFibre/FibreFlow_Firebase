import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean {
    const user = this.authService.currentUser();

    // TODO: Replace with your actual admin email
    const isAdmin = user?.email === 'admin@fibreflow.com';

    if (!isAdmin) {
      // Redirect to dashboard if not admin
      this.router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }
}
