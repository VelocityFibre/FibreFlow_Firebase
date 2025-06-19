import { Injectable, signal, computed } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { UserProfile } from '../models/user-profile';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Mock user for development - always logged in as admin
  private mockUser = {
    uid: 'dev-user',
    email: 'dev@test.com',
    displayName: 'Dev User',
  };

  private mockUserProfile: UserProfile = {
    uid: 'dev-user',
    email: 'dev@test.com',
    displayName: 'Dev User',
    userGroup: 'admin' as const,
    isActive: true,
    createdAt: new Date(),
    lastLogin: new Date(),
  };

  // Signal-based state management
  private userSignal = signal<{
    uid: string;
    email: string;
    displayName: string;
  } | null>(this.mockUser);

  private userProfileSignal = signal<UserProfile | null>(this.mockUserProfile);

  // Public signals for components
  readonly currentUser = this.userSignal.asReadonly();
  readonly currentUserProfile = this.userProfileSignal.asReadonly();

  // Computed signals
  readonly isAuthenticated = computed(() => !!this.userSignal());
  readonly userRole = computed(() => this.userProfileSignal()?.userGroup || null);
  readonly isAdmin = computed(() => this.userProfileSignal()?.userGroup === 'admin');

  // Legacy observable support for gradual migration
  readonly user$ = toObservable(this.userSignal);
  readonly currentUserProfile$ = toObservable(this.userProfileSignal);

  constructor() {
    console.log('🔐 Auth Service initialized in MOCK MODE - Always logged in as admin');
  }

  // Mock login - always succeeds
  async loginWithGoogle(): Promise<{ uid: string; email: string; displayName: string }> {
    console.log('🔐 Mock Google login - would open Google popup in production');
    // In production, this would use:
    // const provider = new GoogleAuthProvider();
    // return signInWithPopup(this.auth, provider);

    // For now, just return the mock user
    this.userSignal.set(this.mockUser);
    this.userProfileSignal.set(this.mockUserProfile);
    return this.mockUser;
  }

  // Mock logout
  async logout(): Promise<void> {
    console.log('🔐 Mock logout - would clear session in production');
    // In production: return this.auth.signOut();

    // For development, we stay logged in
    console.log('⚠️ Dev mode: User remains logged in');
  }

  // Get current user synchronously
  getCurrentUser(): { uid: string; email: string; displayName: string } | null {
    return this.userSignal();
  }

  // Get current user profile synchronously
  getCurrentUserProfile(): UserProfile | null {
    return this.userProfileSignal();
  }

  // Check if user has specific role
  hasRole(role: UserProfile['userGroup']): boolean {
    const profile = this.userProfileSignal();
    return profile ? profile.userGroup === role : false;
  }

  // Check if user has any of the specified roles
  hasAnyRole(roles: UserProfile['userGroup'][]): boolean {
    const profile = this.userProfileSignal();
    return profile ? roles.includes(profile.userGroup) : false;
  }

  // Update user profile (mock)
  async updateUserProfile(updates: Partial<UserProfile>): Promise<void> {
    console.log('🔐 Mock update user profile:', updates);
    this.userProfileSignal.update((current) => (current ? { ...current, ...updates } : null));
  }

  // TODO: Remove mock implementation when ready for production
  // TODO: Add Firebase imports and real implementation
  // TODO: Add error handling for auth failures
}
