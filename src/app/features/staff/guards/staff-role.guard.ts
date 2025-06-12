import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { Observable, map, take, switchMap, of } from 'rxjs';
import { StaffService } from '../services/staff.service';
import { StaffGroup } from '../models';

@Injectable({
  providedIn: 'root'
})
export class StaffRoleGuard implements CanActivate {
  private auth = inject(Auth);
  private router = inject(Router);
  private staffService = inject(StaffService);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const allowedRoles = route.data['allowedRoles'] as StaffGroup[] || [];
    
    return user(this.auth).pipe(
      take(1),
      switchMap(currentUser => {
        if (!currentUser) {
          this.router.navigate(['/login']);
          return of(false);
        }

        // Get staff member details
        return this.staffService.getStaffById(currentUser.uid).pipe(
          map(staff => {
            if (!staff || !staff.isActive) {
              this.router.navigate(['/']);
              return false;
            }

            // Check if user's role is in allowed roles
            if (allowedRoles.length === 0 || allowedRoles.includes(staff.primaryGroup)) {
              return true;
            }

            // Check additional permissions
            if (staff.additionalPermissions) {
              const hasPermission = staff.additionalPermissions.some(perm => 
                allowedRoles.some(role => perm.includes(role.toLowerCase()))
              );
              if (hasPermission) return true;
            }

            this.router.navigate(['/unauthorized']);
            return false;
          })
        );
      })
    );
  }
}