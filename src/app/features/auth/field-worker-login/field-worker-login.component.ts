import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-field-worker-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  template: `
    <div class="field-worker-login-page">
      <mat-card class="login-card">
        <mat-card-header>
          <div class="logo-container">
            <img src="velocity-fibre-logo.jpeg" alt="Velocity Fibre" class="logo">
          </div>
          <mat-card-title>
            <mat-icon>engineering</mat-icon>
            Field Worker Login
          </mat-card-title>
          <mat-card-subtitle>
            Offline Pole Capture System
          </mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <!-- Development Mode Notice -->
          <div class="dev-notice">
            <mat-icon>info</mat-icon>
            <span>Development Mode - Enter any Employee ID to test</span>
          </div>
          
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Employee ID</mat-label>
              <input matInput formControlName="employeeId" 
                     placeholder="e.g., EMP001"
                     autocomplete="username">
              <mat-icon matSuffix>badge</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>PIN (Optional in Dev Mode)</mat-label>
              <input matInput formControlName="pin" 
                     [type]="hidePassword ? 'password' : 'text'"
                     placeholder="4-digit PIN"
                     maxlength="4"
                     autocomplete="current-password">
              <button mat-icon-button matSuffix 
                      (click)="hidePassword = !hidePassword"
                      type="button">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <div class="form-actions">
              <button mat-raised-button color="primary" 
                      type="submit"
                      [disabled]="!loginForm.get('employeeId')?.value || isLoading">
                @if (isLoading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <mat-icon>login</mat-icon>
                  Login as Field Worker
                }
              </button>
            </div>
          </form>
        </mat-card-content>

        <mat-card-footer>
          <div class="login-info">
            <mat-icon>warning</mat-icon>
            <p>Field workers can only access the Offline Pole Capture feature.</p>
          </div>
          
          <div class="divider">
            <span>OR</span>
          </div>
          
          <div class="admin-login-section">
            <button mat-stroked-button (click)="loginAsAdmin()" class="admin-button">
              <mat-icon>admin_panel_settings</mat-icon>
              Login as Admin (Dev Mode)
            </button>
          </div>
          
          <div class="regular-login-link">
            <a mat-button [routerLink]="['/login']">
              <mat-icon>arrow_back</mat-icon>
              Regular User Login
            </a>
          </div>
        </mat-card-footer>
      </mat-card>
    </div>
  `,
  styles: [`
    .field-worker-login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 16px;
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      
      mat-card-header {
        margin-bottom: 24px;
        text-align: center;
        
        .logo-container {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
          
          .logo {
            height: 60px;
            width: auto;
            background: white;
            padding: 10px;
            border-radius: 8px;
          }
        }
        
        mat-card-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 24px;
          
          mat-icon {
            font-size: 28px;
            width: 28px;
            height: 28px;
            color: var(--mat-sys-primary);
          }
        }
        
        mat-card-subtitle {
          margin-top: 8px;
        }
      }
    }
    
    .dev-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 24px;
      
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-actions {
      display: flex;
      justify-content: center;
      margin-top: 24px;
      
      button {
        min-width: 200px;
        height: 48px;
        font-size: 16px;
        
        mat-spinner {
          display: inline-block;
          margin-right: 8px;
        }
      }
    }

    .login-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      margin: 16px -16px 0;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      
      p {
        margin: 0;
        font-size: 14px;
      }
    }
    
    .divider {
      text-align: center;
      margin: 20px 0;
      position: relative;
      
      span {
        background: var(--mat-sys-surface);
        padding: 0 16px;
        color: var(--mat-sys-outline);
        position: relative;
        z-index: 1;
      }
      
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: var(--mat-sys-outline-variant);
      }
    }
    
    .admin-login-section {
      text-align: center;
      margin-bottom: 16px;
      
      .admin-button {
        width: 100%;
        height: 48px;
      }
    }

    .regular-login-link {
      text-align: center;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }

    mat-card-footer {
      padding: 0;
    }
  `]
})
export class FieldWorkerLoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  authService = inject(AuthService); // Make public for direct access

  loginForm = this.fb.group({
    employeeId: ['', [Validators.required]],
    pin: ['']
  });

  hidePassword = true;
  isLoading = false;


  onSubmit(): void {
    if (!this.loginForm.get('employeeId')?.value) {
      return;
    }

    this.isLoading = true;
    const { employeeId } = this.loginForm.value;

    // For field workers, just navigate directly to offline capture
    // The auth service is already in mock mode with 'admin' role
    // But we'll update the mock profile to technician
    this.authService.DEV_USER_ROLE = 'technician';
    (this.authService as any).mockUserProfile.userGroup = 'technician';
    (this.authService as any).userProfileSignal.set((this.authService as any).mockUserProfile);
    
    this.snackBar.open(`Logged in as Field Worker: ${employeeId}`, 'OK', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
    
    // Navigate directly to offline capture
    setTimeout(() => {
      this.router.navigate(['/offline-pole-capture']);
    }, 500);
  }
  
  loginAsAdmin(): void {
    this.isLoading = true;
    
    // Switch back to admin role
    this.authService.DEV_USER_ROLE = 'admin';
    (this.authService as any).mockUserProfile.userGroup = 'admin';
    (this.authService as any).userProfileSignal.set((this.authService as any).mockUserProfile);
    
    this.snackBar.open('Logged in as Admin', 'OK', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
    
    // Navigate to dashboard
    setTimeout(() => {
      this.router.navigate(['/dashboard']);
    }, 500);
  }
}