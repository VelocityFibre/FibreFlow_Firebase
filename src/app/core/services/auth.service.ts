import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { UserProfile } from '../models/user-profile';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Mock user for development - always logged in as admin
  private mockUser = {
    uid: 'dev-user',
    email: 'dev@test.com',
    displayName: 'Dev User'
  };

  private mockUserProfile: UserProfile = {
    uid: 'dev-user',
    email: 'dev@test.com',
    displayName: 'Dev User',
    userGroup: 'admin' as const,
    isActive: true,
    createdAt: new Date(),
    lastLogin: new Date()
  };

  // Observable streams for user state
  private userSubject = new BehaviorSubject<any>(this.mockUser);
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(this.mockUserProfile);

  user$ = this.userSubject.asObservable();
  currentUserProfile$ = this.userProfileSubject.asObservable();

  constructor() {
    console.log('🔐 Auth Service initialized in MOCK MODE - Always logged in as admin');
  }

  // Mock login - always succeeds
  async loginWithGoogle(): Promise<any> {
    console.log('🔐 Mock Google login - would open Google popup in production');
    // In production, this would use:
    // const provider = new GoogleAuthProvider();
    // return signInWithPopup(this.auth, provider);
    
    // For now, just return the mock user
    this.userSubject.next(this.mockUser);
    this.userProfileSubject.next(this.mockUserProfile);
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
  getCurrentUser(): any {
    return this.userSubject.value;
  }

  // Get current user profile synchronously
  getCurrentUserProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.userSubject.value;
  }

  // Check if user has specific role
  hasRole(role: UserProfile['userGroup']): boolean {
    const profile = this.userProfileSubject.value;
    return profile ? profile.userGroup === role : false;
  }

  // Check if user has any of the specified roles
  hasAnyRole(roles: UserProfile['userGroup'][]): boolean {
    const profile = this.userProfileSubject.value;
    return profile ? roles.includes(profile.userGroup) : false;
  }

  // Update user profile (mock)
  async updateUserProfile(updates: Partial<UserProfile>): Promise<void> {
    console.log('🔐 Mock update user profile:', updates);
    const current = this.userProfileSubject.value;
    if (current) {
      this.userProfileSubject.next({ ...current, ...updates });
    }
  }

  // TODO: Remove mock implementation when ready for production
  // TODO: Add Firebase imports and real implementation
  // TODO: Add error handling for auth failures
}