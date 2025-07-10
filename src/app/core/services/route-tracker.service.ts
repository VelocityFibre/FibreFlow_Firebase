import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

export interface RouteInfo {
  path: string;
  title: string;
  segments: string[];
}

@Injectable({
  providedIn: 'root',
})
export class RouteTrackerService {
  private router = inject(Router);

  // Observable of current route info
  currentRoute$: Observable<RouteInfo> = this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    map((event: NavigationEnd) => this.parseRoute(event.urlAfterRedirects)),
  );

  // Signal version for easy access
  currentRoute = toSignal(this.currentRoute$, {
    initialValue: this.parseRoute(this.router.url),
  });

  private parseRoute(url: string): RouteInfo {
    // Remove query params and hash
    const cleanUrl = url.split('?')[0].split('#')[0];

    // Split into segments
    const segments = cleanUrl.split('/').filter((s) => s.length > 0);

    // Generate title from segments
    const title = this.generateTitle(segments);

    return {
      path: cleanUrl || '/',
      title,
      segments,
    };
  }

  private generateTitle(segments: string[]): string {
    if (segments.length === 0) {
      return 'Dashboard';
    }

    // Map common routes to friendly names
    const routeMap: Record<string, string> = {
      'daily-progress': 'Daily Progress',
      projects: 'Projects',
      staff: 'Staff Management',
      contractors: 'Contractors',
      stock: 'Stock Management',
      boq: 'Bill of Quantities',
      suppliers: 'Suppliers',
      reports: 'Reports',
      meetings: 'Meetings',
      quotes: 'Quotes',
      rfq: 'RFQ',
      tasks: 'Tasks',
      'pole-tracker': 'Pole Tracker',
      'audit-trail': 'Audit Trail',
      settings: 'Settings',
    };

    // Get the main route (first segment)
    const mainRoute = segments[0];
    let title = routeMap[mainRoute] || this.titleCase(mainRoute);

    // Add detail suffix if viewing/editing specific item
    if (segments.length > 1) {
      const action = segments[segments.length - 1];
      if (action === 'new') {
        title = `New ${title}`;
      } else if (action === 'edit') {
        title = `Edit ${title}`;
      } else if (segments[1] && segments[1] !== 'list') {
        title = `${title} Details`;
      }
    }

    return title;
  }

  private titleCase(str: string): string {
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get a simplified route key for storage
   * This normalizes routes like /projects/123/edit to /projects/[id]/edit
   */
  getRouteKey(path: string): string {
    const segments = path.split('/').filter((s) => s.length > 0);

    // Replace UUIDs and numeric IDs with [id]
    const normalized = segments.map((segment, index) => {
      // Check if segment looks like an ID (UUID or numeric)
      if (
        index > 0 &&
        (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
          /^\d+$/.test(segment) ||
          /^[a-zA-Z0-9]{20,}$/.test(segment)) // Firestore IDs
      ) {
        return '[id]';
      }
      return segment;
    });

    return '/' + normalized.join('/');
  }
}
