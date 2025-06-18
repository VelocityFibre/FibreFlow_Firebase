import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import {
  UserProfile,
  USER_GROUP_PERMISSIONS,
  UserPermissions,
} from '../../../core/models/user-profile';
// import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-test-auth',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
  ],
  templateUrl: './test-auth.component.html',
  styleUrl: './test-auth.component.scss',
})
export class TestAuthComponent implements OnInit {
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  currentUser: { uid: string; email: string; displayName: string } | null = null;
  currentProfile: UserProfile | null = null;
  permissions: UserPermissions | null = null;
  isAuthenticated = false;

  ngOnInit() {
    // Subscribe to auth state
    this.authService.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
    });

    // Subscribe to user profile
    this.authService.currentUserProfile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => {
        this.currentProfile = profile;
        if (profile) {
          this.permissions = USER_GROUP_PERMISSIONS[profile.userGroup];
        }
      });
  }

  async testLogin() {
    console.log('Testing login...');
    await this.authService.loginWithGoogle();
  }

  async testLogout() {
    console.log('Testing logout...');
    await this.authService.logout();
  }

  async changeUserGroup(group: UserProfile['userGroup']) {
    console.log(`Changing user group to: ${group}`);
    await this.authService.updateUserProfile({ userGroup: group });
  }

  checkRole(role: UserProfile['userGroup']): boolean {
    return this.authService.hasRole(role);
  }

  checkAnyRole(roles: UserProfile['userGroup'][]): boolean {
    return this.authService.hasAnyRole(roles);
  }
}
