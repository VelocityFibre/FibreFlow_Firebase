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
    // Don't check authentication in constructor to avoid race conditions
    // The auth guard will handle redirecting authenticated users
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
