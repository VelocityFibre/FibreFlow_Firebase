import { Injectable, signal, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { UserProfile } from '../models/user-profile';
import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc, serverTimestamp } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  // Toggle this to enable real authentication
  // 
  // 🚨 AUTHENTICATION TEMPORARILY DISABLED FOR DEVELOPMENT
  // 
  // Current state: Mock authentication mode (auto-login as admin)
  // Users will NOT need to sign in with Google while this is false
  // 
  // To re-enable Google authentication for production:
  // 1. Change USE_REAL_AUTH to true
  // 2. Redeploy the application
  // 3. Users will be required to sign in with their Gmail accounts
  //
  private USE_REAL_AUTH = false; // Set to true for production Google auth

  // 🚨 DEV MODE: Change this to test different user roles
  // Options: 'admin' | 'project-manager' | 'technician' | 'supplier' | 'client'
  // Set to 'technician' to test field worker restrictions
  public DEV_USER_ROLE: UserProfile['userGroup'] = 'admin'; // Made public for access

  // Mock user for development - role determined by DEV_USER_ROLE
  public mockUser = {
    uid: 'dev-user',
    email: 'dev@test.com',
    displayName: 'Dev User',
  };

  public mockUserProfile: UserProfile = {
    uid: 'dev-user',
    email: 'dev@test.com',
    displayName: 'Dev User',
    userGroup: this.DEV_USER_ROLE,
    isActive: true,
    createdAt: new Date(),
    lastLogin: new Date(),
  };
  
  public userProfileSignal = signal<UserProfile | null>(
    this.USE_REAL_AUTH ? null : this.mockUserProfile,
  );

  // Signal-based state management
  // Initialize as null when using real auth, mock user only in dev mode
  private userSignal = signal<{
    uid: string;
    email: string;
    displayName: string;
  } | null>(this.USE_REAL_AUTH ? null : this.mockUser);

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
    if (this.USE_REAL_AUTH) {
      console.log('🔐 Auth Service initialized with REAL Firebase Authentication');
      this.initializeRealAuth();
    } else {
      console.log(`🔐 Auth Service initialized in MOCK MODE - Logged in as ${this.DEV_USER_ROLE}`);
      console.log(`🚨 To test field worker restrictions, change DEV_USER_ROLE to 'technician' in auth.service.ts`);
      // Force clear any cached Firebase auth state
      this.auth.signOut().catch(() => {
        // Ignore errors - might not be signed in
      });
      // Set mock user immediately for development
      this.userSignal.set(this.mockUser);
      this.userProfileSignal.set(this.mockUserProfile);
    }
  }

  private initializeRealAuth() {
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        // User is signed in
        const userData = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email || 'User',
        };
        this.userSignal.set(userData);

        // Load or create user profile
        const profile = await this.loadUserProfile(user.uid);
        this.userProfileSignal.set(profile);
      } else {
        // User is signed out
        this.userSignal.set(null);
        this.userProfileSignal.set(null);
      }
    });
  }

  private async loadUserProfile(uid: string): Promise<UserProfile> {
    const userDoc = doc(this.firestore, 'users', uid);
    const docSnap = await getDoc(userDoc);

    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    } else {
      // Create default profile for new users
      const newProfile: UserProfile = {
        uid,
        email: this.auth.currentUser?.email || '',
        displayName: this.auth.currentUser?.displayName || 'User',
        userGroup: 'client', // Default role
        isActive: true,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      await setDoc(userDoc, {
        ...newProfile,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });

      return newProfile;
    }
  }

  // Real Google login
  async loginWithGoogle(): Promise<{ uid: string; email: string; displayName: string }> {
    if (!this.USE_REAL_AUTH) {
      console.log('🔐 Mock Google login - would open Google popup in production');
      this.userSignal.set(this.mockUser);
      this.userProfileSignal.set(this.mockUserProfile);
      return this.mockUser;
    }

    try {
      console.log('🔐 Initiating Google login...');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);

      const userData = {
        uid: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || result.user.email || 'User',
      };

      console.log('✅ Google login successful:', userData.email);

      // User profile will be loaded by onAuthStateChanged listener
      return userData;
    } catch (error: any) {
      console.error('❌ Google login failed:', error);
      throw new Error(error.message || 'Google login failed');
    }
  }

  // Real logout
  async logout(): Promise<void> {
    if (!this.USE_REAL_AUTH) {
      console.log('🔐 Mock logout - would clear session in production');
      console.log('⚠️ Dev mode: User remains logged in');
      return;
    }

    try {
      console.log('🔐 Logging out user...');
      await signOut(this.auth);
      console.log('✅ User logged out successfully');
    } catch (error: any) {
      console.error('❌ Logout failed:', error);
      throw new Error(error.message || 'Logout failed');
    }
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

  // 🚨 DEVELOPMENT ONLY: Method to switch user roles for testing
  // Usage: In browser console: authService.switchDevRole('technician')
  switchDevRole(role: UserProfile['userGroup']): void {
    if (!this.USE_REAL_AUTH) {
      console.log(`🔄 Switching dev user role from ${this.DEV_USER_ROLE} to ${role}`);
      this.DEV_USER_ROLE = role;
      this.mockUserProfile.userGroup = role;
      this.userProfileSignal.set(this.mockUserProfile);
      
      // Show appropriate message based on role
      if (role === 'technician') {
        console.log('✅ Now testing as FIELD WORKER - you should be restricted to offline-pole-capture only');
        console.log('🔒 Navigation should be locked down');
      } else {
        console.log(`✅ Now testing as ${role.toUpperCase()} - full navigation available`);
      }
      
      // Force a navigation update
      window.location.reload();
    } else {
      console.warn('⚠️ Cannot switch roles in production mode');
    }
  }

  // TODO: Remove mock implementation when ready for production
  // TODO: Add Firebase imports and real implementation
  // TODO: Add error handling for auth failures
}
