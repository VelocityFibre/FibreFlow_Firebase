import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = false;
  error: string | null = null;

  constructor() {
    // Check if already logged in (in dev mode, always true)
    if (this.authService.isAuthenticated()) {
      // Already authenticated, redirecting...
      this.router.navigate(['/']);
    }
  }

  async loginWithGoogle() {
    this.isLoading = true;
    this.error = null;

    try {
      await this.authService.loginWithGoogle();
      console.log('Login successful, redirecting...');
      // Redirect to home or return URL
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Login failed:', error);
      this.error = 'Login failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}
